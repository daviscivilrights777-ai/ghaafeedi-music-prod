#!/usr/bin/env python3
"""
GHAAFEEDI MUSIC — Wan2.1 v2 Pipeline Test
Story 1: GRIEF "Her Morning Song" — 3 shots
All 6 quality improvements active:
  1. Wan2.1-14B (replaces CogVideoX)
  2. FLUX I2V key frame workflow
  3. RIFE 8fps → 24fps interpolation
  4. Real-ESRGAN 4x upscale
  5. Kodak Vision3 LUT + film grain
  6. steps=50, per-shot guidance tuning
"""

import requests
import time
import os
import subprocess
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────

GENERATE_URL = "https://daviscivilrights777--videogen-v2-generate.modal.run"
STATUS_URL   = "https://daviscivilrights777--videogen-v2-status.modal.run"
HEALTH_URL   = "https://daviscivilrights777--videogen-v2-health.modal.run"

OUT_DIR  = Path("/home/user/ghaafeedi-music/test_output_wan")
MAX_WAIT = 2400   # 40 min — Wan2.1 50 steps + FLUX + ESRGAN + RIFE

OUT_DIR.mkdir(exist_ok=True)

def log(msg): print(msg, flush=True)

# ─── Shot List — Story 1 GRIEF ────────────────────────────────────────────────
# Prompts from director-notes, with shot_type for guidance tuning + use_i2v

SHOTS = [
    {
        "shot_id":   "S01_001",
        "shot_type": "wide",
        "seed":      1001,
        "use_i2v":   True,
        "num_frames": 49,
        "fps":        8,
        "prompt": (
            "Cinematic wide shot of an empty kitchen at 4:00 AM. Predawn darkness, "
            "visible kitchen details — wooden prep table, hanging pots, tiled walls. "
            "A single amber lamp over the prep table casts warm golden light against "
            "cold gray walls. Flour dusted across the surface, no person present, "
            "only the trace of one. Shallow depth of field, foreground objects slightly soft. "
            "Desaturated color grade with one warm amber practical light source. "
            "Camera slowly pushes in toward the flour on the table. "
            "Shot on ARRI Alexa Mini LF, Cooke S7/i 35mm, 2.39:1 anamorphic widescreen, cinematic."
        ),
        "negative_prompt": (
            "low quality, blurry, cartoon, anime, text, watermark, "
            "motion blur, flickering, overexposed, CGI, plastic, "
            "people, faces, deformed, void, completely black frame"
        ),
    },
    {
        "shot_id":   "S01_002",
        "shot_type": "extreme_close",
        "seed":      1002,
        "use_i2v":   True,
        "num_frames": 49,
        "fps":        8,
        "prompt": (
            "Extreme close-up of elderly Black woman's hands, aged 60s-70s, deeply lined skin, "
            "working flour into dough on a wooden surface. Warm amber color grade — "
            "this is memory, bathed in golden light. Slow deliberate movement, "
            "the hands move with practiced muscle memory. Camera perfectly static. "
            "Shallow depth of field, soft bokeh background. Kodak film look, "
            "warm amber tint, retain accurate dark skin tone, not orange. "
            "Shot on ARRI Alexa Mini LF, Cooke S7/i 100mm macro, cinematic."
        ),
        "negative_prompt": (
            "low quality, blurry, cartoon, anime, text, watermark, "
            "young hands, bright harsh light, orange skin, color cast, "
            "multiple hands, deformed fingers, extra fingers, CGI"
        ),
    },
    {
        "shot_id":   "S01_003",
        "shot_type": "medium",
        "seed":      1003,
        "use_i2v":   True,
        "num_frames": 49,
        "fps":        8,
        "prompt": (
            "Medium shot of an elderly Black woman in her 60s in a warm kitchen, "
            "she looks up from the prep surface toward camera with the most specific smile — "
            "warm, knowing, full of love. Amber practical lighting, warm color grade. "
            "Camera holds perfectly still for two beats, then extremely slowly dollies left. "
            "She does not move, only her eyes track. The smile stays. "
            "Shot on ARRI Alexa Mini LF, Cooke S7/i 50mm, 2.39:1 anamorphic, cinematic."
        ),
        "negative_prompt": (
            "low quality, blurry, cartoon, anime, text, watermark, "
            "motion blur, flickering, multiple people, deformed face, "
            "bad anatomy, CGI, plastic skin, harsh lighting"
        ),
    },
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def submit_shot(shot: dict) -> str:
    log(f"  Submitting {shot['shot_id']} ({shot['shot_type']}, use_i2v={shot['use_i2v']})...")
    payload = {
        "ghaafeedi_job_id":   f"wan_{shot['shot_id']}_{int(time.time())}",
        "prompt":             shot["prompt"],
        "negative_prompt":    shot["negative_prompt"],
        "shot_type":          shot["shot_type"],
        "num_frames":         shot["num_frames"],
        "fps":                shot["fps"],
        "seed":               shot["seed"],
        "num_inference_steps": 50,
        "use_i2v":            shot["use_i2v"],
    }
    r = requests.post(GENERATE_URL, json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()
    job_id = data["job_id"]
    log(f"  ✅ Queued → {job_id}")
    log(f"     Poll: {STATUS_URL}?job_id={job_id}")
    return job_id


def poll_job(job_id: str, shot_id: str) -> dict:
    log(f"\n[POLL] {shot_id} — {job_id}")
    log(f"  NOTE: Wan2.1 50 steps + FLUX + ESRGAN + RIFE = ~10-15 min per clip")
    start = time.time()
    poll_n = 0
    while time.time() - start < MAX_WAIT:
        poll_n += 1
        try:
            r = requests.get(f"{STATUS_URL}?job_id={job_id}", timeout=30)
            r.raise_for_status()
            data = r.json()
            status = data.get("status", "unknown")
            elapsed = int(time.time() - start)

            if status == "complete":
                log(f"  ✅ COMPLETE in {elapsed}s → {data.get('output_url')}")
                return data
            elif status == "failed":
                log(f"  ❌ FAILED: {data.get('error','?')[:200]}")
                return data
            else:
                log(f"  [{poll_n}] {status}... ({elapsed}s elapsed)")
        except Exception as e:
            log(f"  [{poll_n}] poll error: {e}")

        time.sleep(20)

    log(f"  ⚠️  Timeout after {MAX_WAIT}s")
    return {"status": "timeout", "job_id": job_id}


def download_clip(url: str, out_path: Path):
    log(f"  Downloading {out_path.name}...")
    r = requests.get(url, stream=True, timeout=120)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=65536):
            f.write(chunk)
    size_kb = out_path.stat().st_size // 1024
    log(f"  ✅ {out_path.name} — {size_kb}KB")


def assemble(clip_paths: list, out_path: Path):
    log(f"\n[ASSEMBLE] {len(clip_paths)} clips → {out_path.name}")
    concat_file = OUT_DIR / "concat.txt"
    concat_file.write_text("\n".join(f"file '{p}'" for p in clip_paths))
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-c:v", "libx264", "-crf", "16", "-preset", "slow",
        "-pix_fmt", "yuv420p",
        str(out_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log(f"  ❌ ffmpeg error: {result.stderr[-300:]}")
    else:
        size_mb = out_path.stat().st_size / (1024*1024)
        log(f"  ✅ Assembled: {size_mb:.1f}MB")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    log("=" * 60)
    log("  GHAAFEEDI MUSIC — WAN2.1 v2 PIPELINE TEST")
    log("  Story 1: GRIEF 'Her Morning Song' — 3 shots")
    log("  All 6 quality improvements ACTIVE")
    log("=" * 60)

    # Health check
    log("\n[HEALTH] Checking v2 endpoint...")
    r = requests.get(HEALTH_URL, timeout=30)
    h = r.json()
    log(f"  ✅ {h['app']} v{h['version']}")
    log(f"     Models: {h['models']}")
    log(f"     Post:   {h['post']}")

    # Submit all 3 shots
    log("\n[SUBMIT] Queuing all 3 shots...")
    jobs = []
    for shot in SHOTS:
        job_id = submit_shot(shot)
        jobs.append((shot["shot_id"], job_id))
        time.sleep(1)

    # Poll sequentially
    log("\n[POLL] Sequential polling (each ~10-15 min)...")
    results = []
    clip_paths = []

    for shot_id, job_id in jobs:
        result = poll_job(job_id, shot_id)
        results.append({"shot_id": shot_id, "job_id": job_id, "result": result})

        if result.get("status") == "complete" and result.get("output_url"):
            clip_path = OUT_DIR / f"{shot_id}.mp4"
            download_clip(result["output_url"], clip_path)
            clip_paths.append(clip_path)

    # Assemble
    if clip_paths:
        assembled = OUT_DIR / "story1_grief_wan21_assembled.mp4"
        assemble(clip_paths, assembled)
    else:
        log("\n❌ No clips to assemble")

    # Summary
    log("\n" + "=" * 60)
    log("  RESULTS SUMMARY")
    log("=" * 60)
    for r in results:
        st = r["result"].get("status", "?")
        url = r["result"].get("output_url", r["result"].get("error", "")[:80])
        post = r["result"].get("post_steps", [])
        log(f"  {r['shot_id']}: {st} | {url}")
        if post:
            log(f"           post: {post}")

    complete = sum(1 for r in results if r["result"].get("status") == "complete")
    log(f"\n  {complete}/{len(SHOTS)} clips complete")
    if clip_paths:
        log(f"  Assembled: {OUT_DIR}/story1_grief_wan21_assembled.mp4")
    log("=" * 60)


if __name__ == "__main__":
    main()
