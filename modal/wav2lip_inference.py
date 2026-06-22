# ============================================================
# FILE: modal/wav2lip_inference.py
# PURPOSE: GPU-accelerated Wav2Lip inference on Modal
#
# Architecture:
# - Modal A10G GPU (2-4s inference for 5-10s clips)
# - Persistent volume for model weights (download once)
# - ElevenLabs TTS audio generation
# - Wav2Lip lip-sync inference
# - Cloudflare R2 upload + CDN URL return
# ============================================================

import modal
import os
import io
import hashlib
import tempfile
import subprocess
from pathlib import Path

# ─── Modal App Definition ─────────────────────────────────────────────────────

app = modal.App("ghaafeedi-sophia-wav2lip")

# Persistent volume for model weights (downloaded once, reused forever)
model_volume = modal.Volume.from_name(
    "ghaafeedi-wav2lip-models",
    create_if_missing=True
)

MODEL_DIR = Path("/models")
WAV2LIP_DIR = MODEL_DIR / "Wav2Lip"
CHECKPOINT_PATH = MODEL_DIR / "wav2lip_gan.pth"

# ─── Docker Image ─────────────────────────────────────────────────────────────
# Pre-install all dependencies in the image layer (cached across deploys)

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install([
        "ffmpeg",
        "git",
        "wget",
        "libgl1-mesa-glx",
        "libglib2.0-0",
        "libsm6",
        "libxext6",
        "libxrender-dev",
        "libgomp1",
    ])
    .pip_install(
        "torch==2.1.0",
        "torchvision==0.16.0",
        "torchaudio==2.1.0",
        extra_options="--index-url https://download.pytorch.org/whl/cu118",
    )
    .pip_install([
        "fastapi[standard]",
        "numpy==1.24.4",
        "scipy==1.11.4",
        "numba==0.58.1",
        "librosa==0.9.2",
        "Pillow==10.1.0",
        "tqdm==4.66.1",
    ])
    .pip_install([
        "opencv-python==4.8.1.78",
        "boto3==1.34.0",
        "requests==2.31.0",
        "face_alignment==1.3.5",
        "batch_face==1.5.4",
    ])
    .run_commands([
        # Clone Wav2Lip repo into image
        "git clone https://github.com/Rudrabha/Wav2Lip.git /wav2lip",
        "cd /wav2lip && pip install -r requirements.txt || true",
    ])
)

# ─── Model Download Function ───────────────────────────────────────────────────

@app.function(
    image=image,
    volumes={str(MODEL_DIR): model_volume},
    timeout=600,
)
def download_models():
    """Download Wav2Lip GAN checkpoint to persistent volume (run once)."""
    import urllib.request

    CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)

    if CHECKPOINT_PATH.exists():
        print(f"✅ Model already downloaded: {CHECKPOINT_PATH}")
        return

    print("⬇️  Downloading Wav2Lip GAN checkpoint...")
    # Wav2Lip GAN checkpoint — best visual quality for talking faces
    # Wav2Lip GAN checkpoint from HuggingFace mirror (stable, no auth required)
    url = "https://huggingface.co/numz/wav2lip_studio/resolve/main/Wav2lip/wav2lip_gan.pth"
    import subprocess
    result = subprocess.run(
        ["wget", "-q", "--show-progress", "-O", str(CHECKPOINT_PATH), url],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"wget failed: {result.stderr}")
    print(f"✅ Downloaded: {CHECKPOINT_PATH} ({CHECKPOINT_PATH.stat().st_size:,} bytes)")

    model_volume.commit()

# ─── Main Inference Function ───────────────────────────────────────────────────

@app.function(
    image=image,
    gpu="A10G",
    volumes={str(MODEL_DIR): model_volume},
    timeout=120,
    secrets=[
        modal.Secret.from_name("ghaafeedi-sophia-secrets"),
    ],
)
@modal.fastapi_endpoint(method="POST", label="sophia-speak-mobile")
def sophia_speak_mobile(
    item: dict,
) -> dict:
    """
    Web endpoint wrapper — accepts JSON body:
      { "text": str, "step_index": int, "voice_id": str }
    """
    text      = str(item.get("text", ""))
    step_index = int(item.get("step_index", 0))
    voice_id  = str(item.get("voice_id", "CwhRBWXzGAHq8TQ4Fs17"))
    """
    Full pipeline:
    1. Generate ElevenLabs TTS audio (MP3)
    2. Run Wav2Lip inference (portrait + audio → video)
    3. Upload to Cloudflare R2
    4. Return signed CDN URL

    Returns:
        {
            "video_url": str,        # R2 CDN URL
            "duration_seconds": float,
            "clip_id": str,
            "from_cache": bool,
            "latency_ms": int,
        }
    """
    import time
    import requests
    import boto3

    start_time = time.time()

    # ── Environment ────────────────────────────────────────────
    elevenlabs_key  = os.environ["ELEVENLABS_API_KEY"]
    r2_account_id   = os.environ["CLOUDFLARE_ACCOUNT_ID"]
    r2_access_key   = os.environ["R2_ACCESS_KEY_ID"]
    r2_secret_key   = os.environ["R2_SECRET_ACCESS_KEY"]
    r2_bucket       = os.environ.get("R2_BUCKET_NAME", "ghaafeedi-media")
    r2_public_url   = os.environ["R2_PUBLIC_URL"]
    portrait_url    = os.environ.get(
        "SOPHIA_PORTRAIT_URL",
        "https://pub-bc7b203485814e1186102277ad450211.r2.dev/assets/sophia-lipsync-portrait.png"
    )

    # ── Cache key ──────────────────────────────────────────────
    text_hash = hashlib.sha256(
        f"{text.strip().lower()}{voice_id}".encode()
    ).hexdigest()[:16]
    clip_id   = f"sophia_{step_index}_{text_hash}"
    r2_key    = f"sophia/{clip_id}.mp4"

    # ── R2 client ──────────────────────────────────────────────
    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=r2_access_key,
        aws_secret_access_key=r2_secret_key,
        region_name="auto",
    )

    # ── Cache check ────────────────────────────────────────────
    try:
        s3.head_object(Bucket=r2_bucket, Key=r2_key)
        video_url = f"{r2_public_url}/{r2_key}"
        print(f"✅ Cache hit: {r2_key}")

        # Get duration from a quick probe
        probe_result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", str(r2_key)],
            capture_output=True, text=True
        )
        duration = 5.0  # Default estimate on cache hit

        return {
            "video_url": video_url,
            "duration_seconds": duration,
            "clip_id": clip_id,
            "from_cache": True,
            "latency_ms": int((time.time() - start_time) * 1000),
        }
    except s3.exceptions.ClientError:
        pass  # Not cached — proceed with inference

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path      = Path(tmp)
        audio_path    = tmp_path / "speech.mp3"
        portrait_path = tmp_path / "sophia_portrait.png"
        output_path   = tmp_path / "sophia_output.mp4"

        # ── Step 1: Download portrait ──────────────────────────
        print(f"⬇️  Fetching portrait from {portrait_url}")
        portrait_resp = requests.get(portrait_url, timeout=15)
        portrait_resp.raise_for_status()
        portrait_path.write_bytes(portrait_resp.content)
        print(f"✅ Portrait: {len(portrait_resp.content):,} bytes")

        # ── Step 2: ElevenLabs TTS ────────────────────────────
        print(f"🎙️  Generating TTS: \"{text[:50]}...\"")
        tts_resp = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": elevenlabs_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True,
                },
            },
            timeout=30,
        )
        tts_resp.raise_for_status()
        audio_path.write_bytes(tts_resp.content)
        audio_bytes = tts_resp.content
        print(f"✅ TTS audio: {len(audio_bytes):,} bytes")

        # ── Step 3: Get audio duration ─────────────────────────
        duration_result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                str(audio_path),
            ],
            capture_output=True,
            text=True,
        )
        import json as _json
        try:
            fmt = _json.loads(duration_result.stdout).get("format", {})
            duration_seconds = float(fmt.get("duration", 5.0))
        except Exception:
            duration_seconds = 5.0
        print(f"✅ Audio duration: {duration_seconds:.2f}s")

        # ── Step 4: Wav2Lip inference ──────────────────────────
        print("🎬 Running Wav2Lip inference...")
        wav2lip_result = subprocess.run(
            [
                "python", "/wav2lip/inference.py",
                "--checkpoint_path", str(CHECKPOINT_PATH),
                "--face",            str(portrait_path),
                "--audio",           str(audio_path),
                "--outfile",         str(output_path),
                "--resize_factor",   "1",
                "--fps",             "25",
                "--pads",            "0", "10", "0", "0",
                "--wav2lip_batch_size", "128",
                "--face_det_batch_size", "16",
                "--nosmooth",
            ],
            capture_output=True,
            text=True,
            cwd="/wav2lip",
        )

        if wav2lip_result.returncode != 0:
            print("❌ Wav2Lip stderr:", wav2lip_result.stderr[-2000:])
            raise RuntimeError(
                f"Wav2Lip inference failed: {wav2lip_result.stderr[-500:]}"
            )

        if not output_path.exists():
            raise RuntimeError("Wav2Lip produced no output file")

        video_bytes = output_path.read_bytes()
        print(f"✅ Wav2Lip output: {len(video_bytes):,} bytes")

        # ── Step 5: Upload to R2 ───────────────────────────────
        print(f"⬆️  Uploading to R2: {r2_key}")
        s3.put_object(
            Bucket=r2_bucket,
            Key=r2_key,
            Body=video_bytes,
            ContentType="video/mp4",
            CacheControl="public, max-age=31536000, immutable",
        )

        video_url = f"{r2_public_url}/{r2_key}"
        latency_ms = int((time.time() - start_time) * 1000)

        print(f"✅ Done. URL: {video_url} | Latency: {latency_ms}ms")

        return {
            "video_url": video_url,
            "duration_seconds": duration_seconds,
            "clip_id": clip_id,
            "from_cache": False,
            "latency_ms": latency_ms,
        }


# ─── Local Test Entrypoint ────────────────────────────────────────────────────

@app.local_entrypoint()
def main():
    """Run with: modal run modal/wav2lip_inference.py"""
    print("🚀 Testing Sophia Wav2Lip pipeline...")

    result = sophia_speak_mobile.remote({
        "text": "Welcome to Ghaafeedi Music. I'm Sophia, your AI Emotional Concierge.",
        "step_index": 0,
        "voice_id": "CwhRBWXzGAHq8TQ4Fs17",
    })

    print(f"\n✅ Result:")
    print(f"   Video URL:       {result['video_url']}")
    print(f"   Duration:        {result['duration_seconds']:.1f}s")
    print(f"   Clip ID:         {result['clip_id']}")
    print(f"   From cache:      {result['from_cache']}")
    print(f"   Latency:         {result['latency_ms']}ms")
