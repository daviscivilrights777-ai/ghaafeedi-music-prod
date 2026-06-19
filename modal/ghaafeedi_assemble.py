"""
Ghaafeedi Music — Modal FFmpeg Assembly Worker
===============================================
Assembles ordered video clips + audio into a final cinematic MP4.
Uploads result to Cloudflare R2.

Deploy:  modal deploy ghaafeedi_assemble.py
URL:     https://ghaafeedi--ghaafeedi-assemble-run.modal.run
"""

import modal
import subprocess
import tempfile
import os
import json
import uuid
import time
import boto3
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

# ── Modal App ─────────────────────────────────────────────────────────────────
app = modal.App("ghaafeedi")

# Slim image — ffmpeg + boto3 (for R2 upload) + requests
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("boto3", "requests", "pydantic")
)

# In-memory job store (Modal volumes for persistence in production)
job_store = modal.Dict.from_name("ghaafeedi-assembly-jobs", create_if_missing=True)


# ── Request / Response models ─────────────────────────────────────────────────
class AudioMix(BaseModel):
    music_level:     float = 0.15
    narration_level: float = 0.85

class AssemblyRequest(BaseModel):
    pipeline_run_id:          str
    production_id:            str
    clip_urls:                list[str]
    audio_url:                Optional[str] = None
    narration_url:            Optional[str] = None
    crossfade_duration_ms:    int   = 500
    credits_duration_seconds: int   = 3
    output_format:            str   = "mp4"
    resolution:               str   = "1280x720"
    fps:                      int   = 24
    audio_mix:                AudioMix = AudioMix()
    watermark:                bool  = False
    r2_bucket:                str
    r2_endpoint:              str
    r2_access_key:            str
    r2_secret_key:            str
    r2_output_key:            str


class AssemblyResponse(BaseModel):
    job_id:           str
    status:           str   # queued | running | complete | failed
    output_key:       Optional[str] = None
    output_url:       Optional[str] = None
    duration_seconds: Optional[float] = None
    error:            Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────
def download_file(url: str, dest: Path) -> bool:
    """Download a file from a URL to a local path."""
    import requests
    try:
        r = requests.get(url, timeout=120, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"[Download] Failed {url}: {e}")
        return False


def upload_to_r2(
    local_path: Path,
    bucket: str,
    key: str,
    endpoint: str,
    access_key: str,
    secret_key: str,
) -> str:
    """Upload assembled video to Cloudflare R2, return CDN URL."""
    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )
    s3.upload_file(
        str(local_path),
        bucket,
        key,
        ExtraArgs={"ContentType": "video/mp4"},
    )
    # Construct public CDN URL (Ghaafeedi R2 public bucket)
    account_id = endpoint.split("//")[1].split(".")[0]
    cdn_url = f"https://pub-bc7b203485814e1186102277ad450211.r2.dev/{key}"
    return cdn_url


def run_ffmpeg(cmd: list[str]) -> tuple[int, str]:
    """Run an ffmpeg command, return (returncode, stderr)."""
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[FFmpeg] STDERR: {result.stderr[-2000:]}")
    return result.returncode, result.stderr


# ── Core Assembly Logic ───────────────────────────────────────────────────────
@app.function(
    image=image,
    gpu="T4",               # T4 is cheapest — ffmpeg doesn't need GPU but benefits from fast CPU
    cpu=4,
    memory=4096,
    timeout=600,            # 10 min max
    retries=1,
)
def assemble_video(req_dict: dict) -> dict:
    """
    Main assembly function.
    1. Download all clips
    2. Concat with crossfade transitions
    3. Mix audio (narration 85% + music 15%)
    4. Add credits fade out
    5. Upload to R2
    """
    req = AssemblyRequest(**req_dict)
    job_id = req.pipeline_run_id

    # Update status → running
    job_store[job_id] = {"status": "running", "started_at": time.time()}

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)

            # ── 1. Download clips ─────────────────────────────────────────────
            print(f"[Assembly] Downloading {len(req.clip_urls)} clips...")
            clip_paths = []
            for i, url in enumerate(req.clip_urls):
                dest = tmp / f"clip_{i:03d}.mp4"
                ok = download_file(url, dest)
                if not ok:
                    raise RuntimeError(f"Failed to download clip {i}: {url}")
                clip_paths.append(dest)
                print(f"[Assembly] Clip {i} downloaded ({dest.stat().st_size // 1024}KB)")

            # ── 2. Download audio tracks ──────────────────────────────────────
            music_path     = None
            narration_path = None

            if req.audio_url:
                music_path = tmp / "music.mp3"
                if not download_file(req.audio_url, music_path):
                    print("[Assembly] Warning: music download failed, continuing without")
                    music_path = None

            if req.narration_url:
                narration_path = tmp / "narration.mp3"
                if not download_file(req.narration_url, narration_path):
                    print("[Assembly] Warning: narration download failed")
                    narration_path = None

            # ── 3. Concat clips with crossfade ────────────────────────────────
            print("[Assembly] Concatenating clips...")
            concat_out = tmp / "concat.mp4"

            if len(clip_paths) == 1:
                # Single clip — just copy
                concat_out = clip_paths[0]
            else:
                # Build filter_complex for xfade transitions
                xfade_ms    = req.crossfade_duration_ms
                xfade_s     = xfade_ms / 1000.0

                # Get duration of each clip to calculate offsets
                durations = []
                for cp in clip_paths:
                    probe = subprocess.run(
                        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                         "-of", "default=noprint_wrappers=1:nokey=1", str(cp)],
                        capture_output=True, text=True,
                    )
                    try:
                        durations.append(float(probe.stdout.strip()))
                    except Exception:
                        durations.append(5.0)  # fallback 5s

                # Build xfade filter chain
                inputs       = []
                filter_parts = []
                offset       = 0.0

                for i, cp in enumerate(clip_paths):
                    inputs += ["-i", str(cp)]

                if len(clip_paths) == 2:
                    offset = durations[0] - xfade_s
                    filter_complex = (
                        f"[0][1]xfade=transition=fade:duration={xfade_s}:offset={offset:.3f}[v];"
                        f"[0][1]acrossfade=d={xfade_s}[a]"
                    )
                    rc, err = run_ffmpeg([
                        "ffmpeg", "-y",
                        *inputs,
                        "-filter_complex", filter_complex,
                        "-map", "[v]", "-map", "[a]",
                        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
                        "-c:a", "aac", "-b:a", "192k",
                        str(concat_out),
                    ])
                else:
                    # 3+ clips: chain xfade
                    filter_lines = []
                    # Scale all clips to same resolution first
                    w, h = req.resolution.split("x")
                    scale_parts = []
                    for i in range(len(clip_paths)):
                        scale_parts.append(f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2[v{i}]")

                    prev_v = "v0"
                    prev_a = "0:a"
                    offset = 0.0
                    for i in range(1, len(clip_paths)):
                        offset += durations[i-1] - xfade_s
                        out_v  = f"xv{i}" if i < len(clip_paths) - 1 else "vout"
                        out_a  = f"xa{i}" if i < len(clip_paths) - 1 else "aout"
                        filter_lines.append(
                            f"[{prev_v}][v{i}]xfade=transition=fade:duration={xfade_s}:offset={offset:.3f}[{out_v}]"
                        )
                        filter_lines.append(
                            f"[{prev_a}][{i}:a]acrossfade=d={xfade_s}[{out_a}]"
                        )
                        prev_v = out_v
                        prev_a = out_a

                    filter_complex = ";".join(scale_parts + filter_lines)
                    rc, err = run_ffmpeg([
                        "ffmpeg", "-y",
                        *inputs,
                        "-filter_complex", filter_complex,
                        "-map", "[vout]", "-map", "[aout]",
                        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
                        "-c:a", "aac", "-b:a", "192k",
                        str(concat_out),
                    ])

                if rc != 0:
                    raise RuntimeError(f"FFmpeg concat failed: {err[-500:]}")

            # ── 4. Mix audio (music + narration over video) ───────────────────
            final_out = tmp / "final.mp4"

            if music_path or narration_path:
                print("[Assembly] Mixing audio...")
                audio_inputs  = ["-i", str(concat_out)]
                audio_filters = []
                mix_inputs    = ["[0:a]"]

                if music_path:
                    audio_inputs += ["-i", str(music_path)]
                    idx = len(audio_inputs) // 2
                    audio_filters.append(f"[{idx}:a]volume={req.audio_mix.music_level}[music]")
                    mix_inputs.append("[music]")

                if narration_path:
                    audio_inputs += ["-i", str(narration_path)]
                    idx = len(audio_inputs) // 2
                    audio_filters.append(f"[{idx}:a]volume={req.audio_mix.narration_level}[narration]")
                    mix_inputs.append("[narration]")

                n_inputs = len(mix_inputs)
                audio_filters.append(
                    f"{''.join(mix_inputs)}amix=inputs={n_inputs}:duration=first:dropout_transition=2[amixed]"
                )

                filter_complex = ";".join(audio_filters)
                rc, err = run_ffmpeg([
                    "ffmpeg", "-y",
                    *audio_inputs,
                    "-filter_complex", filter_complex,
                    "-map", "0:v",
                    "-map", "[amixed]",
                    "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k",
                    "-shortest",
                    str(final_out),
                ])
                if rc != 0:
                    # Audio mix failed — use video-only
                    print(f"[Assembly] Audio mix failed, using video only: {err[-200:]}")
                    final_out = concat_out
            else:
                final_out = concat_out

            # ── 5. Credits fade out ───────────────────────────────────────────
            if req.credits_duration_seconds > 0 and final_out.exists():
                print("[Assembly] Adding credits fade...")
                faded_out = tmp / "faded.mp4"

                # Get final duration
                probe = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "default=noprint_wrappers=1:nokey=1", str(final_out)],
                    capture_output=True, text=True,
                )
                try:
                    total_dur = float(probe.stdout.strip())
                    fade_start = total_dur - req.credits_duration_seconds
                    if fade_start > 0:
                        rc, err = run_ffmpeg([
                            "ffmpeg", "-y", "-i", str(final_out),
                            "-vf", f"fade=t=out:st={fade_start:.3f}:d={req.credits_duration_seconds}",
                            "-af", f"afade=t=out:st={fade_start:.3f}:d={req.credits_duration_seconds}",
                            "-c:v", "libx264", "-crf", "23", "-preset", "fast",
                            "-c:a", "aac", "-b:a", "192k",
                            str(faded_out),
                        ])
                        if rc == 0:
                            final_out = faded_out
                except Exception:
                    pass  # fade failed — not critical

            # ── 6. Upload to R2 ───────────────────────────────────────────────
            print(f"[Assembly] Uploading to R2: {req.r2_output_key}")
            cdn_url = upload_to_r2(
                final_out,
                req.r2_bucket,
                req.r2_output_key,
                req.r2_endpoint,
                req.r2_access_key,
                req.r2_secret_key,
            )

            # Get final file info
            file_size = final_out.stat().st_size
            probe = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", str(final_out)],
                capture_output=True, text=True,
            )
            duration = float(probe.stdout.strip()) if probe.returncode == 0 else 0

            print(f"[Assembly] Done. {file_size // 1024}KB, {duration:.1f}s → {cdn_url}")

            result = {
                "status":           "complete",
                "output_key":       req.r2_output_key,
                "output_url":       cdn_url,
                "duration_seconds": duration,
                "file_size_bytes":  file_size,
                "completed_at":     time.time(),
            }
            job_store[job_id] = result
            return result

    except Exception as e:
        error_msg = str(e)
        print(f"[Assembly] FAILED: {error_msg}")
        result = {"status": "failed", "error": error_msg, "failed_at": time.time()}
        job_store[job_id] = result
        return result


# ── HTTP Endpoints ────────────────────────────────────────────────────────────
@app.function(image=image)
@modal.web_endpoint(method="POST", label="ghaafeedi-assemble-run")
def run_endpoint(req_dict: dict) -> dict:
    """
    POST /  — Dispatch assembly job
    Body:   AssemblyRequest JSON
    Returns: { job_id, status: "queued" }
    """
    job_id = req_dict.get("pipeline_run_id") or str(uuid.uuid4())

    # Store initial state
    job_store[job_id] = {"status": "queued", "queued_at": time.time()}

    # Spawn async
    assemble_video.spawn(req_dict)

    return {"job_id": job_id, "status": "queued"}


@app.function(image=image)
@modal.web_endpoint(method="GET", label="ghaafeedi-assemble-status")
def status_endpoint(job_id: str) -> dict:
    """
    GET /status?job_id=xxx — Poll job status
    Returns: AssemblyResponse JSON
    """
    data = job_store.get(job_id)
    if not data:
        return {"job_id": job_id, "status": "not_found"}
    return {"job_id": job_id, **data}
