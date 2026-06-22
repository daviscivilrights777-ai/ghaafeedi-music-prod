#!/usr/bin/env python3
"""
Ghaafeedi Music — Pipeline v2 Test
Story 1: GRIEF "Her Morning Song" — 3 shots

WHAT'S NEW vs v1:
  1. Wan2.1-14B      — replaces CogVideoX-5B
  2. I2V workflow    — FLUX key frame → Wan2.1 I2V
  3. RIFE 24fps      — frame interpolation post-process
  4. Real-ESRGAN 4x  — 480p → 1920p upscale
  5. Kodak Vision3 LUT + film grain
  6. Steps=50, per-shot guidance tuning

Usage:
  python3 test_pipeline_v2.py
  python3 test_pipeline_v2.py --t2v-only    # skip FLUX/I2V, use T2V only
  python3 test_pipeline_v2.py --shot 1      # test single shot (1/2/3)
"""

import requests
import time
import subprocess
import os
import json
import argparse
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────
GENERATE_URL = "https://daviscivilrights777--videogen-v2-generate.modal.run"
STATUS_URL   = "https://daviscivilrights777--videogen-v2-status.modal.run"
HEALTH_URL   = "https://daviscivilrights777--videogen-v2-health.modal.run"
OUTPUT_DIR   = Path("/home/user/ghaafeedi-music/test_output_v2")
OUTPUT_DIR.mkdir(exist_ok=True)

POLL_INTERVAL = 20    # seconds between status checks
MAX_WAIT      = 2400  # 40 min max — Wan2.1-14B + FLUX + post ~15-20min

# ── Story 1 Shot Plans — v2 Enhanced ──────────────────────────────────────────
# Changes from v1:
#   - shot_type added (drives guidance_scale auto-tuning)
#   - negative_prompts upgraded to cinematic-specific
#   - num_inference_steps = 50 (was 30)
#   - use_i2v = True (FLUX keyframe → I2V animation)

SHOTS = [
    {
        "shot_id":    "S01_001",
        "shot_type":  "wide",
        "use_i2v":    True,
        # guidance auto = 7.5 for wide shots
        "prompt": (
            "Cinematic wide shot of an empty kitchen at 4:00 AM. "
            "Predawn blue-gray darkness. A single warm amber practical lamp "
            "over a wooden prep table. Cold gray walls with visible kitchen "
            "details — shelves, pots, a window with dawn barely starting. "
            "Flour dusted across the prep surface. No person present. "
            "Shallow depth of field, foreground objects soft. "
            "Desaturated cold grade with one isolated warm amber source. "
            "Camera slowly pushes in toward the flour on the table. "
            "Naturalistic lighting, Roger Deakins style. "
            "35mm anamorphic, film grain, cinematic color grade."
        ),
        "negative_prompt": (
            "low quality, blurry, cartoon, anime, text, watermark, "
            "motion blur, temporal inconsistency, flickering, color banding, "
            "overexposed, crushed blacks, CGI look, multiple people, bright daylight, "
            "neon colors, oversaturated, amateur, plastic"
        ),
        "num_frames": 49,
        "fps": 8,
        "num_inference_steps": 50,
        "seed": 1001,
    },
    {
        "shot_id":    "S01_002",
        "shot_type":  "extreme_close",
        "use_i2v":    True,
        # guidance auto = 5.5 for ECU — detail focused
        "prompt": (
            "Extreme close-up of elderly Black woman's hands, aged 60s to 70s, "
            "deeply lined and experienced, working flour into dough on a wooden surface. "
            "Warm amber color grade — memory tone, golden and slightly elevated saturation. "
            "Slow deliberate movement, the hands know exactly what they are doing. "
            "100mm macro lens, perfectly static camera. "
            "Shallow depth of field, only hands in sharp focus, surface soft. "
            "Warm amber practical kitchen light from above-left. "
            "Film grain, cinematic, naturalistic lighting."
        ),
        "negative_prompt": (
            "low quality, blurry, cartoon, anime, text, watermark, "
            "motion blur, temporal inconsistency, flickering, color banding, "
            "young hands, male hands, bright harsh light, overexposed, "
            "CGI look, plastic skin, multiple hands, deformed fingers"
        ),
        "num_frames": 49,
        "fps": 8,
        "num_inference_steps": 50,
        "seed": 1002,
    },
    {
        "shot_id":    "S01_003",
        "shot_type":  "medium",
        "use_i2v":    True,
        # guidance auto = 6.5 for medium shots
        "prompt": (
            "Medium shot of a Black woman in her early 60s standing at a "
            "kitchen prep surface. She looks up from what she is doing toward "
            "the camera with a deeply warm, unconditional smile — the smile of "
            "a mother seeing her child. Her face is full of specific love. "
            "Warm amber grade slightly above neutral, memory color temperature. "
            "Camera holds still for 2 beats, then slowly dollies left at barely "
            "perceptible speed. "
            "50mm lens, warm practical kitchen lighting, soft shadows. "
            "Film grain, cinematic, emotionally grounded."
        ),
        "negative_prompt": (
            "low quality, blurry, cartoon, anime, text, watermark, "
            "motion blur, temporal inconsistency, flickering, color banding, "
            "cold lighting, sad expression, angry, neutral expression, "
            "CGI look, plastic skin, overexposed, ugly, disfigured"
        ),
        "num_frames": 49,
        "fps": 8,
        "num_inference_steps": 50,
        "seed": 1003,
    },
]


# ── Helpers ────────────────────────────────────────────────────────────────────

def log(msg):
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

def check_health():
    log("Checking v2 endpoint health...")
    r = requests.get(HEALTH_URL, timeout=30)
    r.raise_for_status()
    d = r.json()
    log(f"  ✅ {d['app']} v{d['version']} | gpu={d['gpu']}")
    log(f"     Models: {', '.join(d['models'])}")
    log(f"     Post:   {', '.join(d['post'])}")
    return True

def submit_job(shot: dict) -> str:
    log(f"  Submitting {shot['shot_id']} ({shot['shot_type']}, i2v={shot['use_i2v']})...")
    payload = {
        "prompt":               shot["prompt"],
        "negative_prompt":      shot["negative_prompt"],
        "num_frames":           shot["num_frames"],
        "fps":                  shot["fps"],
        "num_inference_steps":  shot["num_inference_steps"],
        "seed":                 shot["seed"],
        "shot_type":            shot["shot_type"],
        "use_i2v":              shot["use_i2v"],
        "shot_id":              shot["shot_id"],
        "ghaafeedi_job_id":     f"v2_{shot['shot_id']}_{int(time.time())}",
    }
    r = requests.post(GENERATE_URL, json=payload, timeout=30)
    r.raise_for_status()
    d = r.json()
    job_id = d["job_id"]
    log(f"  ✅ Queued → {job_id} | pipeline={d['pipeline']} | est={d['estimated_seconds']}s")
    return job_id

def poll_job(job_id: str, shot_id: str) -> dict:
    start = time.time()
    attempt = 0
    log(f"  Polling {shot_id} ({job_id})...")
    log(f"  NOTE: First run downloads Wan2.1-14B + FLUX (~60GB) — allow 30-40 min.")

    while time.time() - start < MAX_WAIT:
        attempt += 1
        try:
            r = requests.get(f"{STATUS_URL}?job_id={job_id}", timeout=30)
            if r.status_code == 404:
                log(f"  [{attempt:02d}] Not found yet, waiting...")
                time.sleep(POLL_INTERVAL)
                continue
            r.raise_for_status()
            d = r.json()
            status  = d.get("status", "unknown")
            elapsed = int(time.time() - start)

            if status == "complete":
                url = d.get("output_url", "")
                dur = d.get("duration_seconds", "?")
                res = d.get("output_resolution", "?")
                fps = d.get("output_fps", "?")
                ms  = d.get("elapsed_ms", "?")
                kf  = d.get("keyframe_url", "none")
                log(f"  ✅ COMPLETE in {elapsed}s")
                log(f"     Video:     {url}")
                log(f"     Keyframe:  {kf}")
                log(f"     Duration:  {dur}s | Resolution: {res} | FPS: {fps}")
                log(f"     Modal time: {ms}ms")
                log(f"     Post steps: {d.get('post_steps', [])}")
                return d
            elif status == "failed":
                log(f"  ❌ FAILED: {d.get('error', 'unknown')[:200]}")
                if d.get("traceback"):
                    log(f"     Traceback: {d['traceback'][-300:]}")
                return d
            elif status in ("queued", "running"):
                log(f"  [{attempt:02d}] {status}... ({elapsed}s elapsed)")
                time.sleep(POLL_INTERVAL)
            else:
                log(f"  [{attempt:02d}] status={status} ({elapsed}s)")
                time.sleep(POLL_INTERVAL)

        except requests.RequestException as e:
            log(f"  [{attempt:02d}] Poll error: {e}")
            time.sleep(POLL_INTERVAL)

    log(f"  ⚠️  Timeout after {MAX_WAIT}s")
    return {"status": "timeout", "job_id": job_id}

def download_clip(url: str, shot_id: str) -> Path:
    out = OUTPUT_DIR / f"{shot_id}_v2.mp4"
    log(f"  Downloading {shot_id}...")
    r = requests.get(url, stream=True, timeout=180)
    r.raise_for_status()
    with open(out, "wb") as f:
        for chunk in r.iter_content(65536):
            f.write(chunk)
    size_mb = out.stat().st_size / 1024 / 1024
    log(f"  ✅ {out.name} ({size_mb:.1f} MB)")
    return out

def assemble_clips(clip_paths: list, story_name: str) -> Path:
    log("Assembling final video...")
    concat_file = OUTPUT_DIR / "concat_v2.txt"
    with open(concat_file, "w") as f:
        for p in clip_paths:
            f.write(f"file '{Path(p).absolute()}'\n")

    out = OUTPUT_DIR / f"{story_name}_assembled_v2.mp4"
    result = subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_file),
        "-c", "copy",
        str(out)
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[-300:]}")
    size_mb = out.stat().st_size / 1024 / 1024
    log(f"  ✅ {out.name} ({size_mb:.1f} MB)")
    return out

def probe_video(path: Path) -> dict:
    result = subprocess.run([
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_streams", "-show_format", str(path)
    ], capture_output=True, text=True)
    data = json.loads(result.stdout)
    streams = data.get("streams", [])
    vid = next((s for s in streams if s["codec_type"] == "video"), {})
    return {
        "width":      vid.get("width", "?"),
        "height":     vid.get("height", "?"),
        "fps":        vid.get("r_frame_rate", "?"),
        "codec":      vid.get("codec_name", "?"),
        "duration":   data.get("format", {}).get("duration", "?"),
        "size_mb":    round(int(data.get("format", {}).get("size", 0)) / 1024 / 1024, 2),
        "nb_frames":  vid.get("nb_frames", "?"),
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--t2v-only", action="store_true", help="Skip FLUX/I2V, use T2V only")
    parser.add_argument("--shot", type=int, choices=[1, 2, 3], help="Test single shot only")
    args = parser.parse_args()

    if args.t2v_only:
        for s in SHOTS:
            s["use_i2v"] = False

    shots_to_run = SHOTS
    if args.shot:
        shots_to_run = [SHOTS[args.shot - 1]]

    print()
    print("=" * 65)
    print("  GHAAFEEDI MUSIC — PIPELINE v2 TEST")
    print("  Story 1: GRIEF 'Her Morning Song'")
    print(f"  Shots: {len(shots_to_run)} | I2V: {not args.t2v_only} | Steps: 50")
    print("  Wan2.1-14B + FLUX + ESRGAN + RIFE + LUT + Grain")
    print("=" * 65)
    print()

    # 1. Health check
    check_health()
    print()

    # 2. Submit all jobs
    log(f"Submitting {len(shots_to_run)} shot(s)...")
    jobs = []
    for shot in shots_to_run:
        job_id = submit_job(shot)
        jobs.append((shot["shot_id"], job_id))
        time.sleep(1)

    print()
    log(f"All jobs queued. Polling sequentially...")
    print()

    # 3. Poll + collect
    results = []
    clip_paths = []

    for shot_id, job_id in jobs:
        log(f"── {shot_id} ──────────────────────────────")
        result = poll_job(job_id, shot_id)
        results.append({"shot_id": shot_id, "job_id": job_id, "result": result})

        if result.get("status") == "complete":
            url = result.get("output_url")
            if url:
                try:
                    path = download_clip(url, shot_id)
                    clip_paths.append(path)
                    info = probe_video(path)
                    log(f"  QA: {info['width']}x{info['height']} | {info['fps']}fps | {info['duration']}s | {info['size_mb']}MB")
                except Exception as e:
                    log(f"  ⚠️  Download failed: {e}")
        else:
            log(f"  ⚠️  {shot_id} not complete — skipping")
        print()

    # 4. Save results JSON
    results_path = OUTPUT_DIR / "pipeline_v2_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    log(f"Results → {results_path}")

    # 5. Assemble
    if len(clip_paths) >= 2:
        assembled = assemble_clips(clip_paths, "grief_story1")
        info = probe_video(assembled)
        print()
        print("=" * 65)
        log("  PIPELINE v2 TEST COMPLETE")
        log(f"  Clips:      {len(clip_paths)}/{len(shots_to_run)}")
        log(f"  Assembled:  {assembled}")
        log(f"  Quality:    {info['width']}x{info['height']} | {info['fps']}fps | {info['duration']}s")
        log(f"  Size:       {info['size_mb']}MB")
        print("=" * 65)
    elif len(clip_paths) == 1:
        log(f"1/3 clips — no assembly")
        info = probe_video(clip_paths[0])
        log(f"Quality: {info['width']}x{info['height']} | {info['fps']}fps")
    else:
        log("No clips completed — check pipeline_v2_results.json")

    print()

if __name__ == "__main__":
    main()
