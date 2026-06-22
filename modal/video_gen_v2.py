# ============================================================
# FILE: modal/video_gen_v2.py
# APP:  ghaafeedi-video-gen-v2
# VERSION: 2.0 — Full quality upgrade
#
# IMPROVEMENTS OVER v1:
#   1. Wan2.1-14B  — replaces CogVideoX-5B (better motion, color, prompt adherence)
#   2. I2V workflow — FLUX.1-schnell generates key frame → Wan2.1 I2V animates it
#   3. RIFE interp  — 8fps → 24fps via ffmpeg minterpolate (smooth cinematic motion)
#   4. Real-ESRGAN  — 4x upscale: 480p → 1920p (true HD output)
#   5. Cinematic post — Kodak Vision3 LUT + film grain + letterbox
#   6. Steps 50 + per-shot guidance tuning (wide=7.5, CU=6.0, action=5.5)
#
# Endpoints:
#   POST /generate      — async job (returns job_id, poll status_url)
#   GET  /status        — poll ?job_id=xxx
#   GET  /health        — liveness
#   POST /generate/sync — blocking test mode
# ============================================================

import modal
import os
import io
import uuid
import time
import json
import tempfile
import subprocess
from pathlib import Path
from typing import Optional

# ─── Modal App ────────────────────────────────────────────────────────────────

app = modal.App("ghaafeedi-video-gen-v2")

# Persistent volumes — weights downloaded once, reused forever
wan_volume   = modal.Volume.from_name("ghaafeedi-wan21-models",   create_if_missing=True)
flux_volume  = modal.Volume.from_name("ghaafeedi-flux-models",    create_if_missing=True)
esrgan_volume = modal.Volume.from_name("ghaafeedi-esrgan-models", create_if_missing=True)

WAN_DIR    = Path("/models/wan21")
FLUX_DIR   = Path("/models/flux")
ESRGAN_DIR = Path("/models/esrgan")

# Job state dict
job_dict = modal.Dict.from_name("ghaafeedi-videogen-v2-jobs", create_if_missing=True)

# ─── Docker Image ─────────────────────────────────────────────────────────────

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install([
        "ffmpeg",
        "git",
        "wget",
        "curl",
        "libgl1-mesa-glx",
        "libglib2.0-0",
        "libsm6",
        "libxext6",
        "libxrender-dev",
    ])
    # Torch CUDA 12.1
    .pip_install(
        "torch==2.3.1",
        "torchvision==0.18.1",
        "torchaudio==2.3.1",
        extra_options="--index-url https://download.pytorch.org/whl/cu121",
    )
    .pip_install([
        # Diffusers ecosystem — pinned stable
        "diffusers==0.33.1",
        "transformers==4.44.2",
        "accelerate==0.34.2",
        "sentencepiece",
        "protobuf",
        # Video export
        "imageio[ffmpeg]",
        "imageio-ffmpeg",
        "opencv-python-headless",
        # Image processing
        "numpy",
        "Pillow",
        "einops",
        # Real-ESRGAN upscaler
        "realesrgan",
        "basicsr",
        # Storage + API
        "boto3",
        "requests",
        "fastapi[standard]",
        "pydantic",
        "huggingface_hub",
        # Wan2.1 specific
        "easydict",
        "ftfy",
        "regex",
        "tqdm",
        "safetensors",
        "omegaconf",
        "timm",
    ])
)

# ─── Model Download Functions ─────────────────────────────────────────────────

@app.function(
    image=image,
    volumes={
        str(WAN_DIR):    wan_volume,
        str(FLUX_DIR):   flux_volume,
        str(ESRGAN_DIR): esrgan_volume,
    },
    timeout=3600,   # 60 min — Wan2.1-14B is ~30GB
    memory=32768,
)
def download_all_models():
    """Download Wan2.1-14B T2V + I2V, FLUX.1-schnell, Real-ESRGAN. Run once."""
    from huggingface_hub import snapshot_download, hf_hub_download

    # ── 1. Wan2.1-14B Text-to-Video ──
    wan_t2v_dir = WAN_DIR / "t2v-14B"
    if not (wan_t2v_dir / ".downloaded").exists():
        print("⬇️  Downloading Wan2.1-14B T2V (~30GB) ...")
        wan_t2v_dir.mkdir(parents=True, exist_ok=True)
        snapshot_download(
            repo_id="Wan-AI/Wan2.1-T2V-14B",
            local_dir=str(wan_t2v_dir),
            ignore_patterns=["*.msgpack", "*.h5"],
        )
        (wan_t2v_dir / ".downloaded").touch()
        wan_volume.commit()
        print("✅ Wan2.1-14B T2V downloaded")
    else:
        print("✅ Wan2.1-14B T2V already cached")

    # ── 2. Wan2.1-14B Image-to-Video ──
    wan_i2v_dir = WAN_DIR / "i2v-14B"
    if not (wan_i2v_dir / ".downloaded").exists():
        print("⬇️  Downloading Wan2.1-14B I2V (~30GB) ...")
        wan_i2v_dir.mkdir(parents=True, exist_ok=True)
        snapshot_download(
            repo_id="Wan-AI/Wan2.1-I2V-14B-480P",
            local_dir=str(wan_i2v_dir),
            ignore_patterns=["*.msgpack", "*.h5"],
        )
        (wan_i2v_dir / ".downloaded").touch()
        wan_volume.commit()
        print("✅ Wan2.1-14B I2V downloaded")
    else:
        print("✅ Wan2.1-14B I2V already cached")

    # ── 3. FLUX.1-schnell (key frame generation) ──
    flux_dir = FLUX_DIR / "flux-schnell"
    if not (flux_dir / ".downloaded").exists():
        print("⬇️  Downloading FLUX.1-schnell (~24GB) ...")
        flux_dir.mkdir(parents=True, exist_ok=True)
        snapshot_download(
            repo_id="black-forest-labs/FLUX.1-schnell",
            local_dir=str(flux_dir),
            ignore_patterns=["*.msgpack", "*.h5"],
        )
        (flux_dir / ".downloaded").touch()
        flux_volume.commit()
        print("✅ FLUX.1-schnell downloaded")
    else:
        print("✅ FLUX.1-schnell already cached")

    # ── 4. Real-ESRGAN x4plus ──
    esrgan_weights = ESRGAN_DIR / "RealESRGAN_x4plus.pth"
    if not esrgan_weights.exists():
        print("⬇️  Downloading Real-ESRGAN weights (~67MB) ...")
        ESRGAN_DIR.mkdir(parents=True, exist_ok=True)
        import urllib.request
        urllib.request.urlretrieve(
            "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
            str(esrgan_weights)
        )
        esrgan_volume.commit()
        print("✅ Real-ESRGAN weights downloaded")
    else:
        print("✅ Real-ESRGAN already cached")

    print("\n✅ All models ready.")


# ─── Cinematic LUT (Kodak Vision3 500T approximation) ────────────────────────
# Inline base64 or generated via colour-science — here we generate it procedurally
# Applied as ffmpeg -vf "lut3d=file.cube" in post

def _generate_kodak_lut(output_path: Path):
    """
    Generate a Kodak Vision3 500T–inspired .cube LUT file.
    Characteristics: warm shadows, slightly desaturated mids, lifted blacks,
    gentle roll-off in highlights, slight green/teal in shadows.
    """
    lut_size = 33
    lines = []
    lines.append("TITLE \"GhaafeediMusic_KodakVision3_500T\"")
    lines.append("LUT_3D_SIZE 33")
    lines.append("")

    for b in range(lut_size):
        for g in range(lut_size):
            for r in range(lut_size):
                # Normalize 0-1
                rn = r / (lut_size - 1)
                gn = g / (lut_size - 1)
                bn = b / (lut_size - 1)

                # ── Kodak Vision3 500T characteristics ──

                # 1. Lift blacks (film base fog)
                lift = 0.035
                rn = rn * (1 - lift) + lift
                gn = gn * (1 - lift) + lift
                bn = bn * (1 - lift) + lift

                # 2. Highlight roll-off (S-curve top)
                def soft_clip(v, knee=0.78, softness=0.15):
                    if v < knee:
                        return v
                    excess = v - knee
                    return knee + excess / (1 + excess / softness)

                rn = soft_clip(rn)
                gn = soft_clip(gn)
                bn = soft_clip(bn)

                # 3. Shadow warmth — lift reds slightly, push blues down in shadows
                shadow_mask = max(0.0, 1.0 - (rn + gn + bn) / 3.0 / 0.4)
                rn = rn + shadow_mask * 0.018  # warm reds in shadows
                gn = gn + shadow_mask * 0.006  # slight green push (Kodak 500T)
                bn = bn - shadow_mask * 0.012  # pull blues in shadows

                # 4. Slight midtone desaturation (luma-preserving)
                luma = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn
                mid_mask = 1.0 - abs((luma - 0.45) / 0.45)
                mid_mask = max(0.0, mid_mask) * 0.08
                rn = rn * (1 - mid_mask) + luma * mid_mask
                gn = gn * (1 - mid_mask) + luma * mid_mask
                bn = bn * (1 - mid_mask) + luma * mid_mask

                # 5. Clamp 0-1
                rn = max(0.0, min(1.0, rn))
                gn = max(0.0, min(1.0, gn))
                bn = max(0.0, min(1.0, bn))

                lines.append(f"{rn:.6f} {gn:.6f} {bn:.6f}")

    output_path.write_text("\n".join(lines))


# ─── Post-Processing Pipeline ─────────────────────────────────────────────────

def _post_process(
    input_path: Path,
    output_path: Path,
    input_fps: int = 8,
    target_fps: int = 24,
    target_width: int = 1920,
    target_height: int = 1080,
    apply_lut: bool = True,
    apply_grain: bool = True,
    grain_strength: float = 0.08,
    apply_letterbox: bool = True,
    tmp_dir: Path = None,
) -> dict:
    """
    Full cinematic post-processing chain:
    1. Real-ESRGAN 4x upscale (480p → 1920p)
    2. RIFE frame interpolation via ffmpeg minterpolate (8fps → 24fps)
    3. Kodak Vision3 LUT
    4. Film grain overlay
    5. Anamorphic letterbox (2.39:1)

    Returns dict with processing metadata.
    """
    import cv2
    import numpy as np

    tmp = tmp_dir or input_path.parent
    steps_log = []

    print(f"🎨 Post-processing: {input_path.name}")

    # ── Step 1: Real-ESRGAN 4x Upscale ──────────────────────────────────────
    print("  [1/5] Real-ESRGAN 4x upscale...")
    try:
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer

        esrgan_model = RRDBNet(
            num_in_ch=3, num_out_ch=3,
            num_feat=64, num_block=23, num_grow_ch=32, scale=4
        )
        upsampler = RealESRGANer(
            scale=4,
            model_path=str(ESRGAN_DIR / "RealESRGAN_x4plus.pth"),
            model=esrgan_model,
            tile=512,
            tile_pad=10,
            pre_pad=0,
            half=True,
        )

        # Extract frames from input
        cap = cv2.VideoCapture(str(input_path))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        upscaled_frames_dir = tmp / "upscaled_frames"
        upscaled_frames_dir.mkdir(exist_ok=True)

        for i in range(frame_count):
            ret, frame = cap.read()
            if not ret:
                break
            # Real-ESRGAN expects RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            upscaled, _ = upsampler.enhance(frame_rgb, outscale=4)
            upscaled_bgr = cv2.cvtColor(upscaled, cv2.COLOR_RGB2BGR)
            cv2.imwrite(str(upscaled_frames_dir / f"frame_{i:05d}.png"), upscaled_bgr)
        cap.release()

        # Reassemble upscaled frames to video
        upscaled_path = tmp / "upscaled.mp4"
        subprocess.run([
            "ffmpeg", "-y",
            "-framerate", str(input_fps),
            "-i", str(upscaled_frames_dir / "frame_%05d.png"),
            "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
            str(upscaled_path)
        ], check=True, capture_output=True)

        steps_log.append("esrgan_4x: ok")
        print(f"  ✅ Upscaled to {target_width}x{target_height}")

    except Exception as e:
        print(f"  ⚠️  ESRGAN failed ({e}), falling back to ffmpeg scale")
        upscaled_path = tmp / "upscaled.mp4"
        subprocess.run([
            "ffmpeg", "-y", "-i", str(input_path),
            "-vf", f"scale={target_width}:{target_height}:flags=lanczos",
            "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
            str(upscaled_path)
        ], check=True, capture_output=True)
        steps_log.append("esrgan_4x: fallback_to_ffmpeg_scale")

    # ── Step 2: RIFE Frame Interpolation (8fps → 24fps) ─────────────────────
    print(f"  [2/5] Frame interpolation {input_fps}fps → {target_fps}fps...")
    rife_path = tmp / "rife.mp4"
    mi_factor = target_fps // input_fps  # e.g. 3x for 8→24
    subprocess.run([
        "ffmpeg", "-y", "-i", str(upscaled_path),
        "-vf", (
            f"minterpolate=fps={target_fps}:mi_mode=mci:"
            f"mc_mode=aobmc:me_mode=bidir:vsbmc=1"
        ),
        "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
        str(rife_path)
    ], check=True, capture_output=True)
    steps_log.append(f"frame_interp: {input_fps}fps→{target_fps}fps")
    print(f"  ✅ Interpolated to {target_fps}fps")

    # ── Step 3: Cinematic LUT (Kodak Vision3 500T) ──────────────────────────
    lut_path = tmp / "kodak_vision3.cube"
    lut_applied_path = tmp / "lut_applied.mp4"
    if apply_lut:
        print("  [3/5] Applying Kodak Vision3 500T LUT...")
        _generate_kodak_lut(lut_path)
        subprocess.run([
            "ffmpeg", "-y", "-i", str(rife_path),
            "-vf", f"lut3d={lut_path}",
            "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
            str(lut_applied_path)
        ], check=True, capture_output=True)
        steps_log.append("lut: kodak_vision3_500T")
        print("  ✅ LUT applied")
    else:
        lut_applied_path = rife_path
        steps_log.append("lut: skipped")

    # ── Step 4: Film Grain ───────────────────────────────────────────────────
    grain_path = tmp / "grain.mp4"
    if apply_grain:
        print(f"  [4/5] Adding film grain (strength={grain_strength})...")
        # geq-based grain: add gaussian noise per frame, different seed each frame
        grain_amount = int(grain_strength * 255 * 0.4)  # scale to pixel range
        subprocess.run([
            "ffmpeg", "-y", "-i", str(lut_applied_path),
            "-vf", (
                f"noise=alls={grain_amount}:allf=t+u"
            ),
            "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
            str(grain_path)
        ], check=True, capture_output=True)
        steps_log.append(f"grain: strength={grain_strength}")
        print("  ✅ Film grain applied")
    else:
        grain_path = lut_applied_path
        steps_log.append("grain: skipped")

    # ── Step 5: Letterbox + Final Encode ────────────────────────────────────
    print("  [5/5] Final encode + letterbox 2.39:1...")

    # Get actual video dimensions from grain step
    probe = subprocess.run([
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_streams", str(grain_path)
    ], capture_output=True, text=True)
    probe_data = json.loads(probe.stdout)
    vid_streams = [s for s in probe_data["streams"] if s["codec_type"] == "video"]
    actual_w = vid_streams[0]["width"] if vid_streams else target_width
    actual_h = vid_streams[0]["height"] if vid_streams else target_height

    # 2.39:1 letterbox bars
    if apply_letterbox:
        bar_h = int(actual_h * (1 - 1 / 2.39) / 2)
        vf_final = (
            f"pad={actual_w}:{actual_h}:(ow-iw)/2:(oh-ih)/2:black,"
            f"drawbox=x=0:y=0:w={actual_w}:h={bar_h}:color=black:t=fill,"
            f"drawbox=x=0:y={actual_h - bar_h}:w={actual_w}:h={bar_h}:color=black:t=fill"
        )
    else:
        vf_final = f"scale={actual_w}:{actual_h}"

    subprocess.run([
        "ffmpeg", "-y", "-i", str(grain_path),
        "-vf", vf_final,
        "-c:v", "libx264", "-crf", "15", "-preset", "slow",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(output_path)
    ], check=True, capture_output=True)

    file_size = output_path.stat().st_size
    steps_log.append(f"letterbox: 2.39:1 | final: {file_size:,} bytes")
    print(f"  ✅ Final: {file_size/1024/1024:.1f}MB → {output_path.name}")

    return {
        "steps": steps_log,
        "file_size_bytes": file_size,
        "output_fps": target_fps,
        "output_resolution": f"{actual_w}x{actual_h}",
    }


# ─── FLUX Key Frame Generator ─────────────────────────────────────────────────

def _generate_key_frame(
    prompt: str,
    seed: int,
    output_path: Path,
    width: int = 832,
    height: int = 480,
) -> Path:
    """
    Generate a single cinematic key frame using FLUX.1-schnell.
    Used as the anchor frame for Wan2.1 I2V pipeline.
    """
    import torch
    from diffusers import FluxPipeline

    print(f"🖼️  FLUX key frame generation...")
    print(f"   Prompt: {prompt[:100]}")

    pipe = FluxPipeline.from_pretrained(
        str(FLUX_DIR / "flux-schnell"),
        torch_dtype=torch.bfloat16,
    )
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()

    generator = torch.Generator("cuda").manual_seed(seed)

    image = pipe(
        prompt=prompt,
        width=width,
        height=height,
        num_inference_steps=4,   # schnell is 4-step
        guidance_scale=0.0,      # schnell is guidance-free
        generator=generator,
    ).images[0]

    image.save(str(output_path))
    print(f"  ✅ Key frame saved: {output_path.name}")
    return output_path


# ─── Wan2.1 I2V Generator ─────────────────────────────────────────────────────

def _run_wan21_i2v(
    prompt: str,
    negative_prompt: str,
    image_path: Path,
    num_frames: int,
    fps: int,
    guidance_scale: float,
    num_inference_steps: int,
    seed: int,
    output_path: Path,
) -> dict:
    """
    Wan2.1-14B Image-to-Video pipeline.
    Takes FLUX key frame → animates it with motion.
    """
    import torch
    from diffusers import WanImageToVideoPipeline
    from diffusers.utils import export_to_video, load_image

    print(f"🎬 Wan2.1-14B I2V pipeline...")
    print(f"   Frames: {num_frames} @ {fps}fps | Steps: {num_inference_steps} | CFG: {guidance_scale}")

    pipe = WanImageToVideoPipeline.from_pretrained(
        str(WAN_DIR / "i2v-14B"),
        torch_dtype=torch.bfloat16,
    )
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()
    pipe.vae.enable_slicing()

    image = load_image(str(image_path))
    generator = torch.Generator("cuda").manual_seed(seed)

    video_frames = pipe(
        image=image,
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_frames=num_frames,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        generator=generator,
    ).frames[0]

    export_to_video(video_frames, str(output_path), fps=fps)
    file_size = output_path.stat().st_size
    duration = num_frames / fps
    print(f"  ✅ {len(video_frames)} frames → {duration:.1f}s clip")

    return {"duration_seconds": duration, "file_size_bytes": file_size}


def _run_wan21_t2v(
    prompt: str,
    negative_prompt: str,
    num_frames: int,
    fps: int,
    guidance_scale: float,
    num_inference_steps: int,
    seed: int,
    output_path: Path,
) -> dict:
    """
    Wan2.1-14B Text-to-Video pipeline (fallback when no key frame).
    """
    import torch
    from diffusers import WanPipeline
    from diffusers.utils import export_to_video

    print(f"🎬 Wan2.1-14B T2V pipeline...")
    print(f"   Frames: {num_frames} @ {fps}fps | Steps: {num_inference_steps} | CFG: {guidance_scale}")

    pipe = WanPipeline.from_pretrained(
        str(WAN_DIR / "t2v-14B"),
        torch_dtype=torch.bfloat16,
    )
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()
    pipe.vae.enable_slicing()

    generator = torch.Generator("cuda").manual_seed(seed)

    video_frames = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_frames=num_frames,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        generator=generator,
    ).frames[0]

    export_to_video(video_frames, str(output_path), fps=fps)
    file_size = output_path.stat().st_size
    duration = num_frames / fps
    print(f"  ✅ {len(video_frames)} frames → {duration:.1f}s clip")

    return {"duration_seconds": duration, "file_size_bytes": file_size}


# ─── Shot Type Guidance Tuning ────────────────────────────────────────────────

SHOT_GUIDANCE = {
    "wide":          7.5,   # Wide establishing — needs strong prompt adherence
    "medium":        6.5,   # Medium shots — balanced
    "close_up":      6.0,   # Close-ups / macro — less guidance, more detail
    "extreme_close": 5.5,   # ECU — most detail, softest guidance
    "action":        5.5,   # Action/motion — let the model move freely
}

CINEMATIC_NEGATIVE = (
    "low quality, blurry, cartoon, anime, text, watermark, logo, "
    "motion blur, temporal inconsistency, flickering, color banding, "
    "overexposed highlights, crushed blacks, plastic skin, CGI look, "
    "multiple people, duplicate faces, deformed hands, extra limbs, "
    "disfigured, ugly, bad anatomy, grainy noise, pixelated, "
    "washed out, oversaturated, neon colors, amateur photography"
)


# ─── R2 Upload ────────────────────────────────────────────────────────────────

def _upload_to_r2(video_bytes: bytes, job_id: str, r2_env: dict, suffix: str = "") -> str:
    import boto3
    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{r2_env['account_id']}.r2.cloudflarestorage.com",
        aws_access_key_id=r2_env["access_key"],
        aws_secret_access_key=r2_env["secret_key"],
        region_name="auto",
    )
    r2_key = f"cinematic/{job_id}{suffix}.mp4"
    s3.put_object(
        Bucket=r2_env["bucket"],
        Key=r2_key,
        Body=video_bytes,
        ContentType="video/mp4",
        CacheControl="public, max-age=31536000, immutable",
    )
    public_url = f"{r2_env['public_url']}/{r2_key}"
    print(f"⬆️  R2: {public_url}")
    return public_url


# ─── Core Job Runner ──────────────────────────────────────────────────────────

@app.function(
    image=image,
    gpu="A100",
    volumes={
        str(WAN_DIR):    wan_volume,
        str(FLUX_DIR):   flux_volume,
        str(ESRGAN_DIR): esrgan_volume,
    },
    timeout=1200,   # 20 min — Wan2.1-14B + FLUX + post = ~10-15 min
    retries=1,
    secrets=[modal.Secret.from_name("ghaafeedi-sophia-secrets")],
)
def generate_video_task_v2(job_id: str, params: dict):
    """
    Full production pipeline per clip:
    1. FLUX.1-schnell → key frame (if use_i2v=True)
    2. Wan2.1-14B I2V or T2V → raw clip
    3. Post: ESRGAN 4x + RIFE interp + LUT + grain + letterbox
    4. Upload to R2
    """
    start_ms = int(time.time() * 1000)

    job_dict[job_id] = {
        "job_id":  job_id,
        "status":  "running",
        "started_at": start_ms,
        "params":  params,
    }

    r2_env = {
        "account_id": os.environ["CLOUDFLARE_ACCOUNT_ID"],
        "access_key":  os.environ["R2_ACCESS_KEY_ID"],
        "secret_key":  os.environ["R2_SECRET_ACCESS_KEY"],
        "bucket":      os.environ.get("R2_BUCKET_NAME", "ghaafeedi-media"),
        "public_url":  os.environ["R2_PUBLIC_URL"],
    }

    try:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)

            # ── Extract params ────────────────────────────────────────────
            prompt          = params["prompt"]
            neg_prompt      = params.get("negative_prompt", CINEMATIC_NEGATIVE)
            num_frames      = int(params.get("num_frames", 49))
            fps             = int(params.get("fps", 8))
            seed            = int(params.get("seed", 42))
            num_steps       = int(params.get("num_inference_steps", 50))
            shot_type       = params.get("shot_type", "medium")
            use_i2v         = params.get("use_i2v", True)

            # Per-shot guidance tuning
            guidance_scale = params.get(
                "guidance_scale",
                SHOT_GUIDANCE.get(shot_type, 6.5)
            )

            raw_clip = tmp_path / "raw_clip.mp4"
            final_clip = tmp_path / "final_clip.mp4"
            keyframe_path = tmp_path / "keyframe.png"

            # ── Stage 1: Key frame (FLUX) ─────────────────────────────────
            if use_i2v:
                try:
                    # FLUX prompt = first 2 sentences of video prompt (image-optimized)
                    flux_prompt = " ".join(prompt.split(".")[:2]).strip() + "."
                    _generate_key_frame(
                        prompt=flux_prompt,
                        seed=seed,
                        output_path=keyframe_path,
                        width=832,
                        height=480,
                    )
                    use_i2v_actual = True
                except Exception as e:
                    print(f"  ⚠️  FLUX failed ({e}), falling back to T2V")
                    use_i2v_actual = False
            else:
                use_i2v_actual = False

            # ── Stage 2: Video generation ─────────────────────────────────
            if use_i2v_actual:
                meta = _run_wan21_i2v(
                    prompt=prompt,
                    negative_prompt=neg_prompt,
                    image_path=keyframe_path,
                    num_frames=num_frames,
                    fps=fps,
                    guidance_scale=guidance_scale,
                    num_inference_steps=num_steps,
                    seed=seed,
                    output_path=raw_clip,
                )
            else:
                meta = _run_wan21_t2v(
                    prompt=prompt,
                    negative_prompt=neg_prompt,
                    num_frames=num_frames,
                    fps=fps,
                    guidance_scale=guidance_scale,
                    num_inference_steps=num_steps,
                    seed=seed,
                    output_path=raw_clip,
                )

            # ── Stage 3: Post-processing ──────────────────────────────────
            post_meta = _post_process(
                input_path=raw_clip,
                output_path=final_clip,
                input_fps=fps,
                target_fps=24,
                target_width=1920,
                target_height=1080,
                apply_lut=True,
                apply_grain=True,
                grain_strength=0.07,
                apply_letterbox=True,
                tmp_dir=tmp_path,
            )

            # ── Stage 4: Upload ───────────────────────────────────────────
            video_bytes = final_clip.read_bytes()
            output_url  = _upload_to_r2(video_bytes, job_id, r2_env, suffix="_final")

            # Also upload keyframe if I2V
            keyframe_url = None
            if use_i2v_actual and keyframe_path.exists():
                import boto3
                s3 = boto3.client(
                    "s3",
                    endpoint_url=f"https://{r2_env['account_id']}.r2.cloudflarestorage.com",
                    aws_access_key_id=r2_env["access_key"],
                    aws_secret_access_key=r2_env["secret_key"],
                    region_name="auto",
                )
                kf_key = f"cinematic/{job_id}_keyframe.png"
                s3.put_object(
                    Bucket=r2_env["bucket"],
                    Key=kf_key,
                    Body=keyframe_path.read_bytes(),
                    ContentType="image/png",
                )
                keyframe_url = f"{r2_env['public_url']}/{kf_key}"

        elapsed_ms = int(time.time() * 1000) - start_ms

        job_dict[job_id] = {
            "job_id":           job_id,
            "status":           "complete",
            "output_url":       output_url,
            "keyframe_url":     keyframe_url,
            "duration_seconds": meta["duration_seconds"],
            "file_size_bytes":  post_meta["file_size_bytes"],
            "output_fps":       post_meta["output_fps"],
            "output_resolution": post_meta["output_resolution"],
            "post_steps":       post_meta["steps"],
            "elapsed_ms":       elapsed_ms,
            "pipeline":         "wan21_i2v" if use_i2v_actual else "wan21_t2v",
            "params":           params,
            "completed_at":     int(time.time() * 1000),
        }

        print(f"✅ Job {job_id} COMPLETE in {elapsed_ms}ms → {output_url}")

    except Exception as e:
        import traceback
        elapsed_ms = int(time.time() * 1000) - start_ms
        error_msg = str(e)
        tb = traceback.format_exc()
        print(f"❌ Job {job_id} FAILED: {error_msg}\n{tb}")

        job_dict[job_id] = {
            "job_id":     job_id,
            "status":     "failed",
            "error":      error_msg,
            "traceback":  tb[-2000:],
            "elapsed_ms": elapsed_ms,
            "params":     params,
            "failed_at":  int(time.time() * 1000),
        }


# ─── Web Endpoints ────────────────────────────────────────────────────────────

@app.cls(
    image=image,
    secrets=[modal.Secret.from_name("ghaafeedi-sophia-secrets")],
    timeout=30,
)
class VideoGenAPIv2:

    @modal.fastapi_endpoint(method="GET", label="videogen-v2-health")
    def health(self) -> dict:
        return {
            "status":  "ok",
            "app":     "ghaafeedi-video-gen-v2",
            "version": "2.0",
            "models":  ["Wan2.1-14B-I2V", "Wan2.1-14B-T2V", "FLUX.1-schnell", "RealESRGAN-4x"],
            "post":    ["RIFE-24fps", "Kodak-LUT", "FilmGrain", "Letterbox-2.39:1"],
            "gpu":     "A100-40GB",
            "timestamp": int(time.time() * 1000),
        }

    @modal.fastapi_endpoint(method="POST", label="videogen-v2-generate")
    def generate(self, item: dict) -> dict:
        """
        Submit async video generation job (v2 full quality pipeline).

        Body:
          {
            "prompt":               str,     # required
            "negative_prompt":      str,     # optional — uses CINEMATIC_NEGATIVE default
            "num_frames":           int,     # default 49 (~6s @8fps → 18s @24fps after interp)
            "fps":                  int,     # default 8 (source fps, output = 24 after RIFE)
            "guidance_scale":       float,   # auto-set per shot_type if not specified
            "num_inference_steps":  int,     # default 50
            "seed":                 int,     # default 42
            "shot_type":            str,     # wide|medium|close_up|extreme_close|action
            "use_i2v":              bool,    # default true — FLUX key frame + I2V
            "ghaafeedi_job_id":     str,     # optional
            "shot_id":              str,     # optional
          }
        """
        prompt = item.get("prompt", "").strip()
        if not prompt:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="prompt is required")

        job_id = item.get("ghaafeedi_job_id") or f"v2_{uuid.uuid4().hex[:12]}"
        shot_type = item.get("shot_type", "medium")

        params = {
            "prompt":               prompt,
            "negative_prompt":      item.get("negative_prompt", CINEMATIC_NEGATIVE),
            "num_frames":           int(item.get("num_frames", 49)),
            "fps":                  int(item.get("fps", 8)),
            "guidance_scale":       float(item.get("guidance_scale", SHOT_GUIDANCE.get(shot_type, 6.5))),
            "num_inference_steps":  int(item.get("num_inference_steps", 50)),
            "seed":                 int(item.get("seed", 42)),
            "shot_type":            shot_type,
            "use_i2v":              bool(item.get("use_i2v", True)),
            "shot_id":              item.get("shot_id", ""),
        }

        job_dict[job_id] = {
            "job_id":    job_id,
            "status":    "queued",
            "params":    params,
            "queued_at": int(time.time() * 1000),
        }

        generate_video_task_v2.spawn(job_id, params)

        return {
            "job_id":             job_id,
            "status":             "queued",
            "status_url":         f"https://daviscivilrights777--videogen-v2-status.modal.run?job_id={job_id}",
            "estimated_seconds":  900,
            "pipeline":           "wan21_i2v" if params["use_i2v"] else "wan21_t2v",
            "message":            "Job queued. Poll status_url for completion.",
        }

    @modal.fastapi_endpoint(method="GET", label="videogen-v2-status")
    def status(self, job_id: str) -> dict:
        try:
            return job_dict[job_id]
        except KeyError:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


# ─── Local Entrypoint ─────────────────────────────────────────────────────────

@app.local_entrypoint()
def main():
    print("🚀 Ghaafeedi Video Gen v2 — model download")
    print("   This downloads Wan2.1-14B (~30GB), FLUX.1-schnell (~24GB),")
    print("   and Real-ESRGAN (~67MB) to persistent volumes.")
    print("   Run ONCE before first job dispatch.")
    print()
    download_all_models.remote()
    print("✅ All models cached. Ready for production.")
