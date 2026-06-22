# ============================================================
# FILE: modal/video_gen.py
# APP:  ghaafeedi-video-gen
# PURPOSE: GPU video generation for Ghaafeedi Music cinematic pipeline
#
# Model: CogVideoX-5B (open-source, Apache 2.0)
#   - 5B param diffusion transformer for text-to-video
#   - 49 frames @ 8fps → ~6s clips
#   - A100-40GB (preferred) / A10G fallback
#
# Endpoints:
#   POST /generate   — submit text-to-video job, returns {job_id, status_url}
#   GET  /status/:id — poll job status + output URL
#   POST /generate/sync — blocking single-clip gen (for testing)
#   GET  /health     — liveness check
#
# Wav2Lip (ghaafeedi-sophia-wav2lip) is a SEPARATE app — untouched.
# FFmpeg assembly (ghaafeedi) is a SEPARATE app — untouched.
# ============================================================

import modal
import os
import io
import uuid
import time
import json
import tempfile
import hashlib
from pathlib import Path
from typing import Optional

# ─── Modal App ────────────────────────────────────────────────────────────────

app = modal.App("ghaafeedi-video-gen")

# Persistent volume — model weights downloaded once (~15GB), reused forever
model_volume = modal.Volume.from_name(
    "ghaafeedi-cogvideox-models",
    create_if_missing=True,
)

MODEL_DIR = Path("/models/cogvideox")

# Job state dict — tracks async job status
job_dict = modal.Dict.from_name(
    "ghaafeedi-videogen-jobs",
    create_if_missing=True,
)

# ─── Docker Image ─────────────────────────────────────────────────────────────
# CogVideoX requires: torch 2.3+, diffusers ≥0.30, transformers, accelerate

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install([
        "ffmpeg",
        "git",
        "wget",
        "libgl1-mesa-glx",
        "libglib2.0-0",
    ])
    # Torch with CUDA 12.1
    .pip_install(
        "torch==2.3.1",
        "torchvision==0.18.1",
        "torchaudio==2.3.1",
        extra_options="--index-url https://download.pytorch.org/whl/cu121",
    )
    .pip_install([
        "diffusers==0.31.0",
        "transformers==4.44.2",
        "accelerate==0.34.2",
        "sentencepiece",
        "imageio[ffmpeg]",
        "imageio-ffmpeg",
        "numpy",
        "Pillow",
        "boto3",
        "requests",
        "fastapi[standard]",
        "pydantic",
        "huggingface_hub",
        "protobuf",
    ])
)

# ─── Model Download (run once) ────────────────────────────────────────────────

@app.function(
    image=image,
    volumes={str(MODEL_DIR): model_volume},
    timeout=1800,   # 30 min — first download ~15GB
    memory=16384,
)
def download_model():
    """Download CogVideoX-5B weights to persistent volume. Run once."""
    from huggingface_hub import snapshot_download

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    marker = MODEL_DIR / ".downloaded"
    if marker.exists():
        print("✅ CogVideoX-5B already downloaded")
        return

    print("⬇️  Downloading CogVideoX-5B (~15GB) ...")
    snapshot_download(
        repo_id="THUDM/CogVideoX-5b",
        local_dir=str(MODEL_DIR),
        ignore_patterns=["*.msgpack", "*.h5", "flax_model*"],
    )

    marker.touch()
    model_volume.commit()
    print("✅ CogVideoX-5B download complete")


# ─── Core Generation Function ─────────────────────────────────────────────────

def _run_cogvideox(
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
    Internal: run CogVideoX-5B pipeline.
    Returns {"duration_seconds": float, "file_size_bytes": int}
    """
    import torch
    from diffusers import CogVideoXPipeline
    from diffusers.utils import export_to_video

    print(f"🎬 Loading CogVideoX-5B from {MODEL_DIR} ...")

    pipe = CogVideoXPipeline.from_pretrained(
        str(MODEL_DIR),
        torch_dtype=torch.bfloat16,
    )
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()
    pipe.vae.enable_slicing()

    print(f"✅ Model loaded. Generating {num_frames} frames @ {fps}fps ...")
    print(f"   Prompt: {prompt[:100]}")

    generator = torch.Generator("cuda").manual_seed(seed)

    video_frames = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt or "blurry, low quality, distorted, watermark, text, logo",
        num_frames=num_frames,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        generator=generator,
    ).frames[0]

    print(f"✅ {len(video_frames)} frames generated. Exporting video ...")

    export_to_video(video_frames, str(output_path), fps=fps)

    file_size = output_path.stat().st_size
    duration = num_frames / fps
    print(f"✅ Video exported: {file_size:,} bytes, {duration:.1f}s")

    return {"duration_seconds": duration, "file_size_bytes": file_size}


def _upload_to_r2(video_bytes: bytes, job_id: str, r2_env: dict) -> str:
    """Upload MP4 to Cloudflare R2, return public CDN URL."""
    import boto3

    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{r2_env['account_id']}.r2.cloudflarestorage.com",
        aws_access_key_id=r2_env["access_key"],
        aws_secret_access_key=r2_env["secret_key"],
        region_name="auto",
    )

    r2_key = f"cinematic/{job_id}.mp4"
    s3.put_object(
        Bucket=r2_env["bucket"],
        Key=r2_key,
        Body=video_bytes,
        ContentType="video/mp4",
        CacheControl="public, max-age=31536000, immutable",
    )

    public_url = f"{r2_env['public_url']}/{r2_key}"
    print(f"⬆️  Uploaded to R2: {public_url}")
    return public_url


# ─── Async Background Task ────────────────────────────────────────────────────

@app.function(
    image=image,
    gpu="A100",          # 40GB — CogVideoX-5B needs ~20GB VRAM
    volumes={str(MODEL_DIR): model_volume},
    timeout=600,         # 10 min max per clip
    retries=1,
    secrets=[modal.Secret.from_name("ghaafeedi-sophia-secrets")],
)
def generate_video_task(job_id: str, params: dict):
    """
    Background task: generate one video clip and write result to job_dict.
    Called by the /generate endpoint; polled via /status/:id.
    """
    start_ms = int(time.time() * 1000)

    # Mark running
    job_dict[job_id] = {
        "job_id": job_id,
        "status": "running",
        "started_at": start_ms,
        "params": params,
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
            output_path = Path(tmp) / f"{job_id}.mp4"

            meta = _run_cogvideox(
                prompt=params["prompt"],
                negative_prompt=params.get("negative_prompt", ""),
                num_frames=params.get("num_frames", 49),
                fps=params.get("fps", 8),
                guidance_scale=params.get("guidance_scale", 6.0),
                num_inference_steps=params.get("num_inference_steps", 50),
                seed=params.get("seed", 42),
                output_path=output_path,
            )

            video_bytes = output_path.read_bytes()
            output_url = _upload_to_r2(video_bytes, job_id, r2_env)

        elapsed_ms = int(time.time() * 1000) - start_ms

        job_dict[job_id] = {
            "job_id":           job_id,
            "status":           "complete",
            "output_url":       output_url,
            "duration_seconds": meta["duration_seconds"],
            "file_size_bytes":  meta["file_size_bytes"],
            "elapsed_ms":       elapsed_ms,
            "params":           params,
            "completed_at":     int(time.time() * 1000),
        }

        print(f"✅ Job {job_id} COMPLETE in {elapsed_ms}ms → {output_url}")

    except Exception as e:
        elapsed_ms = int(time.time() * 1000) - start_ms
        error_msg = str(e)
        print(f"❌ Job {job_id} FAILED: {error_msg}")

        job_dict[job_id] = {
            "job_id":     job_id,
            "status":     "failed",
            "error":      error_msg,
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
class VideoGenAPI:

    @modal.fastapi_endpoint(method="GET", label="videogen-health")
    def health(self) -> dict:
        return {
            "status": "ok",
            "app": "ghaafeedi-video-gen",
            "model": "CogVideoX-5B",
            "gpu": "A100-40GB",
            "timestamp": int(time.time() * 1000),
        }

    @modal.fastapi_endpoint(method="POST", label="videogen-generate")
    def generate(self, item: dict) -> dict:
        """
        Submit async video generation job.

        Body:
          {
            "prompt": str,                   # required
            "negative_prompt": str,          # optional
            "num_frames": int,               # default 49 (~6s @8fps)
            "fps": int,                      # default 8
            "guidance_scale": float,         # default 6.0
            "num_inference_steps": int,      # default 50
            "seed": int,                     # default 42
            "ghaafeedi_job_id": str,         # optional — link to orchestration job
            "shot_id": str,                  # optional — shot plan reference
          }

        Returns:
          {
            "job_id": str,
            "status": "queued",
            "status_url": str,
            "estimated_seconds": int,
          }
        """
        prompt = item.get("prompt", "").strip()
        if not prompt:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="prompt is required")

        job_id = item.get("ghaafeedi_job_id") or f"vgen_{uuid.uuid4().hex[:12]}"

        params = {
            "prompt":               prompt,
            "negative_prompt":      item.get("negative_prompt", "blurry, low quality, distorted, watermark, text, logo, ugly"),
            "num_frames":           int(item.get("num_frames", 49)),
            "fps":                  int(item.get("fps", 8)),
            "guidance_scale":       float(item.get("guidance_scale", 6.0)),
            "num_inference_steps":  int(item.get("num_inference_steps", 50)),
            "seed":                 int(item.get("seed", 42)),
            "shot_id":              item.get("shot_id", ""),
        }

        # Mark as queued immediately
        job_dict[job_id] = {
            "job_id":    job_id,
            "status":    "queued",
            "params":    params,
            "queued_at": int(time.time() * 1000),
        }

        # Spawn background task (non-blocking)
        generate_video_task.spawn(job_id, params)

        status_url = f"https://daviscivilrights777--videogen-status.modal.run/{job_id}"

        return {
            "job_id":             job_id,
            "status":             "queued",
            "status_url":         status_url,
            "estimated_seconds":  90,
            "message":            "Job queued. Poll status_url for completion.",
        }

    @modal.fastapi_endpoint(method="GET", label="videogen-status")
    def status(self, job_id: str) -> dict:
        """
        Poll job status.
        GET /status?job_id=vgen_abc123

        Returns job dict with status: queued | running | complete | failed
        """
        try:
            result = job_dict[job_id]
            return result
        except KeyError:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    @modal.fastapi_endpoint(method="POST", label="videogen-sync")
    def generate_sync(self, item: dict) -> dict:
        """
        Blocking video generation — for testing only.
        Same body as /generate but waits and returns output_url directly.
        Max 8 min timeout on client side.

        NOTE: Uses A100 GPU on the same container — cold start ~60s first time.
        """
        import torch
        from diffusers import CogVideoXPipeline
        from diffusers.utils import export_to_video

        prompt = item.get("prompt", "").strip()
        if not prompt:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="prompt is required")

        job_id = f"sync_{uuid.uuid4().hex[:12]}"
        start_ms = int(time.time() * 1000)

        r2_env = {
            "account_id": os.environ["CLOUDFLARE_ACCOUNT_ID"],
            "access_key":  os.environ["R2_ACCESS_KEY_ID"],
            "secret_key":  os.environ["R2_SECRET_ACCESS_KEY"],
            "bucket":      os.environ.get("R2_BUCKET_NAME", "ghaafeedi-media"),
            "public_url":  os.environ["R2_PUBLIC_URL"],
        }

        params = {
            "prompt":               prompt,
            "negative_prompt":      item.get("negative_prompt", "blurry, low quality, distorted, watermark"),
            "num_frames":           int(item.get("num_frames", 49)),
            "fps":                  int(item.get("fps", 8)),
            "guidance_scale":       float(item.get("guidance_scale", 6.0)),
            "num_inference_steps":  int(item.get("num_inference_steps", 50)),
            "seed":                 int(item.get("seed", 42)),
        }

        with tempfile.TemporaryDirectory() as tmp:
            output_path = Path(tmp) / f"{job_id}.mp4"
            meta = _run_cogvideox(output_path=output_path, **params)
            video_bytes = output_path.read_bytes()
            output_url = _upload_to_r2(video_bytes, job_id, r2_env)

        elapsed_ms = int(time.time() * 1000) - start_ms

        return {
            "job_id":           job_id,
            "status":           "complete",
            "output_url":       output_url,
            "duration_seconds": meta["duration_seconds"],
            "file_size_bytes":  meta["file_size_bytes"],
            "elapsed_ms":       elapsed_ms,
            "prompt":           prompt,
        }


# ─── Local Test Entrypoint ────────────────────────────────────────────────────

@app.local_entrypoint()
def main():
    """
    Run locally: modal run modal/video_gen.py

    This triggers a full async job + status poll cycle.
    """
    print("🚀 Ghaafeedi Video Gen — local test")
    print("   First run will download CogVideoX-5B (~15GB) — allow 15-20 min")
    print()

    # Step 1: ensure model is downloaded
    print("Step 1: Check / download model weights...")
    download_model.remote()
    print()

    # Step 2: Submit a test job
    api = VideoGenAPI()

    test_prompt = (
        "A cinematic close-up of a woman's hands holding a worn photograph, "
        "golden morning light streaming through dusty curtains, "
        "shallow depth of field, film grain, emotional and tender atmosphere, "
        "soft bokeh background, 4K cinematic"
    )

    print(f"Step 2: Submitting test job...")
    print(f"   Prompt: {test_prompt[:80]}...")

    result = api.generate.remote({"prompt": test_prompt, "num_inference_steps": 30})
    job_id = result["job_id"]
    print(f"   Job ID: {job_id}")
    print(f"   Status URL: {result['status_url']}")
    print()

    # Step 3: Poll until complete
    print("Step 3: Polling status...")
    for i in range(40):
        time.sleep(15)
        status = api.status.remote({"job_id": job_id})
        s = status.get("status", "unknown")
        elapsed = status.get("elapsed_ms", 0)
        print(f"   [{i+1:02d}] status={s} elapsed={elapsed}ms")

        if s == "complete":
            print(f"\n✅ COMPLETE!")
            print(f"   Output URL:  {status['output_url']}")
            print(f"   Duration:    {status['duration_seconds']:.1f}s")
            print(f"   File size:   {status['file_size_bytes']:,} bytes")
            print(f"   Total time:  {status['elapsed_ms']}ms")
            break
        elif s == "failed":
            print(f"\n❌ FAILED: {status.get('error', 'unknown error')}")
            break
    else:
        print("⏰ Timed out after 10 minutes")
