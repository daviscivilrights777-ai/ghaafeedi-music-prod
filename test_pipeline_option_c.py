#!/usr/bin/env python3
"""
Option C Pipeline Test — Ghaafeedi Music
Uses saved director notes (Story 1 — GRIEF "Her Morning Song")
Zero dependency on OpenAI or Sunor.cc.
Fires 3 shots → polls Modal CogVideoX-5B → assembles clips via ffmpeg.
"""

import requests
import time
import subprocess
import os
import json
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────
GENERATE_URL = "https://daviscivilrights777--videogen-generate.modal.run"
STATUS_URL   = "https://daviscivilrights777--videogen-status.modal.run"
HEALTH_URL   = "https://daviscivilrights777--videogen-health.modal.run"
OUTPUT_DIR   = Path("/home/user/ghaafeedi-music/test_output")
OUTPUT_DIR.mkdir(exist_ok=True)

POLL_INTERVAL = 15   # seconds between status checks
MAX_WAIT      = 1800  # 15 min max per clip (first clip triggers model download ~15-20min)

# ── 3 shots from Story 1 — GRIEF "Her Morning Song" ───────────────────────
# These are the verbatim visual_prompts from the director notes.
# No GPT-4o required — these are pre-generated.
SHOTS = [
    {
        "shot_id": "S01_001",
        "prompt": (
            "Cinematic wide shot of an empty kitchen at 4:00 AM. Predawn darkness. "
            "A single lamp over a wooden prep table casts warm amber light against cold gray walls. "
            "Flour dusted across the surface — no person present, only the trace of one. "
            "Shallow depth of field, foreground kitchen objects slightly soft. "
            "Desaturated color grade with one warm amber source. "
            "Camera slowly pushes in toward the flour on the table. "
            "Shot on ARRI Alexa Mini LF, Cooke S7/i 35mm, 2.39:1 anamorphic widescreen, "
            "Kodak Vision3 500T film grain, cinematic, masterpiece, 8K."
        ),
        "negative_prompt": "low quality, blurry, cartoon, anime, text, watermark, multiple people, bright daylight",
        "num_frames": 49,
        "fps": 8,
        "num_inference_steps": 30,  # 30 for faster test, 50 for full quality
        "seed": 1001,
    },
    {
        "shot_id": "S01_002",
        "prompt": (
            "Extreme close-up of Black women's hands, aged 60s-70s, working flour into dough. "
            "Warm amber color grade — this is memory, not present day. "
            "Slow motion feel, deliberate movement. The hands know exactly what they're doing. "
            "Camera static. "
            "Shot on ARRI Alexa Mini LF, Cooke S7/i 100mm macro, 2.39:1 anamorphic widescreen, "
            "Kodak Vision3 500T film grain, shallow depth of field, warm amber practical lighting, "
            "cinematic, masterpiece, 8K."
        ),
        "negative_prompt": "low quality, blurry, cartoon, anime, text, watermark, young hands, bright harsh light",
        "num_frames": 49,
        "fps": 8,
        "num_inference_steps": 30,
        "seed": 1002,
    },
    {
        "shot_id": "S01_003",
        "prompt": (
            "Medium shot: a Black woman in her 60s looks up from a kitchen prep surface toward camera. "
            "She smiles — a specific, deeply warm smile of unconditional love. "
            "Warm amber grade saturated slightly above neutral, memory color tone. "
            "Camera holds perfectly still for 2 beats, then extremely slowly dollies left. "
            "Shot on ARRI Alexa Mini LF, Cooke S7/i 50mm, 2.39:1 anamorphic widescreen, "
            "Kodak Vision3 500T film grain, warm practical kitchen lighting, "
            "cinematic, masterpiece, 8K."
        ),
        "negative_prompt": "low quality, blurry, cartoon, anime, text, watermark, cold lighting, sad expression",
        "num_frames": 49,
        "fps": 8,
        "num_inference_steps": 30,
        "seed": 1003,
    },
]

# ── Helpers ────────────────────────────────────────────────────────────────
def log(msg):
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")

def check_health():
    log("Checking Modal endpoint health...")
    r = requests.get(HEALTH_URL, timeout=30)
    r.raise_for_status()
    data = r.json()
    log(f"  ✅ {data['app']} | model={data['model']} | gpu={data['gpu']}")
    return True

def submit_job(shot: dict) -> str:
    log(f"  Submitting {shot['shot_id']}...")
    payload = {
        "prompt":               shot["prompt"],
        "negative_prompt":      shot["negative_prompt"],
        "num_frames":           shot["num_frames"],
        "fps":                  shot["fps"],
        "num_inference_steps":  shot["num_inference_steps"],
        "seed":                 shot["seed"],
        "shot_id":              shot["shot_id"],
        "ghaafeedi_job_id":     f"optc_{shot['shot_id']}_{int(time.time())}",
    }
    r = requests.post(GENERATE_URL, json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()
    job_id = data["job_id"]
    log(f"  ✅ Queued → job_id={job_id}")
    log(f"     Poll: {data['status_url']}")
    return job_id

def poll_job(job_id: str, shot_id: str) -> dict:
    start = time.time()
    attempt = 0
    log(f"  Polling {shot_id} (job_id={job_id})...")
    log(f"  NOTE: First clip triggers ~15GB model download — may take 15-20 min. Subsequent clips are ~90s.")

    while time.time() - start < MAX_WAIT:
        attempt += 1
        try:
            r = requests.get(f"{STATUS_URL}?job_id={job_id}", timeout=30)
            if r.status_code == 404:
                log(f"  [{attempt}] Job not found yet, waiting...")
                time.sleep(POLL_INTERVAL)
                continue
            r.raise_for_status()
            data = r.json()
            status = data.get("status", "unknown")
            elapsed = int(time.time() - start)

            if status == "complete":
                url = data.get("output_url", "")
                dur = data.get("duration_seconds", "?")
                ms  = data.get("elapsed_ms", "?")
                log(f"  ✅ COMPLETE in {elapsed}s | video_dur={dur}s | modal_time={ms}ms")
                log(f"     URL: {url}")
                return data
            elif status == "failed":
                log(f"  ❌ FAILED: {data.get('error', 'unknown error')}")
                return data
            elif status in ("queued", "running"):
                log(f"  [{attempt}] {status}... ({elapsed}s elapsed)")
                time.sleep(POLL_INTERVAL)
            else:
                log(f"  [{attempt}] Unknown status={status}, waiting...")
                time.sleep(POLL_INTERVAL)

        except requests.exceptions.RequestException as e:
            log(f"  [{attempt}] Poll error: {e}, retrying...")
            time.sleep(POLL_INTERVAL)

    log(f"  ⚠️  Timeout after {MAX_WAIT}s for job {job_id}")
    return {"status": "timeout", "job_id": job_id}

def download_clip(url: str, shot_id: str) -> Path:
    out = OUTPUT_DIR / f"{shot_id}.mp4"
    log(f"  Downloading {shot_id} from R2...")
    r = requests.get(url, stream=True, timeout=120)
    r.raise_for_status()
    with open(out, "wb") as f:
        for chunk in r.iter_content(chunk_size=65536):
            f.write(chunk)
    size_mb = out.stat().st_size / 1024 / 1024
    log(f"  ✅ Saved {out.name} ({size_mb:.1f} MB)")
    return out

def assemble_clips(clip_paths: list[Path], output_name: str = "assembled.mp4") -> Path:
    """Concatenate clips using ffmpeg concat demuxer."""
    log("Assembling clips with ffmpeg...")
    concat_file = OUTPUT_DIR / "concat.txt"
    with open(concat_file, "w") as f:
        for p in clip_paths:
            f.write(f"file '{p.absolute()}'\n")

    out = OUTPUT_DIR / output_name
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c", "copy",
        str(out)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log(f"  ffmpeg stderr: {result.stderr[-500:]}")
        raise RuntimeError("ffmpeg assembly failed")
    size_mb = out.stat().st_size / 1024 / 1024
    log(f"  ✅ Assembled → {out.name} ({size_mb:.1f} MB)")
    return out

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    print()
    print("=" * 60)
    print("  GHAAFEEDI MUSIC — OPTION C PIPELINE TEST")
    print("  Story 1: GRIEF 'Her Morning Song' — 3 shots")
    print("  OpenAI: BYPASSED | Sunor.cc: BYPASSED")
    print("  Modal CogVideoX-5B + R2 storage")
    print("=" * 60)
    print()

    # 1. Health check
    check_health()
    print()

    results = []
    clip_paths = []

    # 2. Submit ALL 3 jobs immediately (parallel dispatch)
    log("Submitting all 3 shots...")
    jobs = []
    for shot in SHOTS:
        job_id = submit_job(shot)
        jobs.append((shot["shot_id"], job_id))
        time.sleep(1)  # brief pause between submits

    print()
    log(f"All 3 jobs queued. Beginning sequential poll...")
    print()

    # 3. Poll each job to completion
    for shot_id, job_id in jobs:
        log(f"--- Waiting for {shot_id} ---")
        result = poll_job(job_id, shot_id)
        results.append({"shot_id": shot_id, "job_id": job_id, "result": result})

        if result.get("status") == "complete":
            url = result.get("output_url")
            if url:
                try:
                    path = download_clip(url, shot_id)
                    clip_paths.append(path)
                except Exception as e:
                    log(f"  ⚠️  Download failed: {e}")
        else:
            log(f"  ⚠️  {shot_id} did not complete — skipping download")
        print()

    # 4. Save results JSON
    results_file = OUTPUT_DIR / "pipeline_results.json"
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2)
    log(f"Results saved → {results_file}")

    # 5. Assemble if we have clips
    print()
    if len(clip_paths) >= 2:
        assembled = assemble_clips(clip_paths, "grief_test_assembled.mp4")
        log(f"")
        log(f"{'='*60}")
        log(f"  PIPELINE TEST COMPLETE")
        log(f"  Clips generated: {len(clip_paths)}/{len(SHOTS)}")
        log(f"  Assembled video: {assembled}")
        log(f"  Results JSON:    {results_file}")
        log(f"{'='*60}")
    elif len(clip_paths) == 1:
        log(f"Only 1 clip generated — skipping assembly")
        log(f"Clip: {clip_paths[0]}")
    else:
        log(f"No clips downloaded successfully.")
        log(f"Check pipeline_results.json for error details.")

    print()

if __name__ == "__main__":
    main()
