#!/usr/bin/env python3
"""
Dispatch all 9 Story 1 shots to Modal ghaafeedi-video-gen-v2.
Fires all in parallel, polls until complete, downloads all clips.

Usage:
  python3 scripts/dispatch_story1_all9.py
  python3 scripts/dispatch_story1_all9.py --shots 4 5 6   # only fire specific shots
"""

import argparse
import json
import os
import sys
import time
import threading
import subprocess
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─── Config ───────────────────────────────────────────────────────────────────

GENERATE_URL = "https://daviscivilrights777--videogen-v2-generate.modal.run"
STATUS_URL   = "https://daviscivilrights777--videogen-v2-status.modal.run"
HEALTH_URL   = "https://daviscivilrights777--videogen-v2-health.modal.run"
OUTPUT_DIR   = Path("test_output_wan/story1_v3")
SHOTS_JSON   = Path("scripts/story1_continuity_shots_full.json")
POLL_INTERVAL = 30   # seconds between status checks
MAX_WAIT     = 1800  # 30 minutes max per shot

# ─── Load shot list ──────────────────────────────────────────────────────────

def load_shots(filter_ids=None):
    data = json.loads(SHOTS_JSON.read_text())
    shots = data["shots"]
    if filter_ids:
        shots = [s for s in shots if s["id"] in filter_ids or
                 str(shots.index(s) + 1) in [str(f) for f in filter_ids]]
    return shots

# ─── Health check ────────────────────────────────────────────────────────────

def check_health():
    print("→ Checking Modal endpoint health...")
    try:
        r = requests.get(HEALTH_URL, timeout=30)
        if r.status_code == 200:
            print(f"  ✓ Endpoint healthy: {r.json()}")
            return True
        else:
            print(f"  ✗ Health check failed: {r.status_code}")
            return False
    except Exception as e:
        print(f"  ✗ Health check error: {e}")
        return False

# ─── Fire one shot ───────────────────────────────────────────────────────────

def fire_shot(shot: dict) -> dict:
    """POST to Modal, return {shot_id, job_id, status_url}."""
    payload = {
        "prompt":   shot["prompt"],
        "duration": shot.get("duration", 5),
        "shot_id":  shot["id"],
    }

    print(f"  → FIRING {shot['id']}: {shot['label'][:60]}...")

    try:
        r = requests.post(GENERATE_URL, json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()
        job_id = data.get("job_id")
        print(f"  ✓ {shot['id']} dispatched → job_id: {job_id}")
        return {"shot": shot, "job_id": job_id, "error": None}
    except Exception as e:
        print(f"  ✗ {shot['id']} FAILED TO DISPATCH: {e}")
        return {"shot": shot, "job_id": None, "error": str(e)}

# ─── Poll until done ─────────────────────────────────────────────────────────

def poll_job(job_id: str, shot_id: str) -> dict:
    """Poll status endpoint until done/failed. Returns final status dict."""
    start = time.time()
    attempt = 0

    while True:
        elapsed = time.time() - start
        if elapsed > MAX_WAIT:
            return {"status": "timeout", "job_id": job_id}

        try:
            r = requests.get(STATUS_URL, params={"job_id": job_id}, timeout=30)
            data = r.json()
            status = data.get("status", "unknown")

            if attempt % 4 == 0:  # log every ~2 min
                print(f"  [{shot_id}] {status} ({elapsed:.0f}s elapsed)")

            if status == "done":
                print(f"  ✓ [{shot_id}] COMPLETE — output_key: {data.get('output_key')}")
                return data
            elif status in ("failed", "error"):
                print(f"  ✗ [{shot_id}] FAILED: {data.get('error', 'unknown')}")
                return data

        except Exception as e:
            print(f"  [{shot_id}] poll error: {e}")

        attempt += 1
        time.sleep(POLL_INTERVAL)

# ─── Download clip ───────────────────────────────────────────────────────────

def download_clip(job_result: dict, shot: dict, out_dir: Path) -> str:
    """Download final clip from R2 or direct URL in job result."""
    output_key = job_result.get("output_key") or job_result.get("output_url")
    if not output_key:
        print(f"  ✗ [{shot['id']}] No output_key in result")
        return None

    # Build R2 URL if it's just a key (not a full URL)
    if output_key.startswith("http"):
        url = output_key
    else:
        R2_PUBLIC = "https://pub-bc7b203485814e1186102277ad450211.r2.dev"
        url = f"{R2_PUBLIC}/{output_key}"

    out_path = out_dir / f"{shot['id']}_final.mp4"
    print(f"  → Downloading {shot['id']} from {url}")

    try:
        r = requests.get(url, stream=True, timeout=120)
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        size_mb = out_path.stat().st_size / 1_000_000
        print(f"  ✓ [{shot['id']}] saved to {out_path} ({size_mb:.1f} MB)")
        return str(out_path)
    except Exception as e:
        print(f"  ✗ [{shot['id']}] download error: {e}")
        return None

# ─── Worker: fire + poll + download ─────────────────────────────────────────

def process_shot(shot: dict, out_dir: Path) -> dict:
    """Complete pipeline for one shot. Returns summary dict."""
    result = {"shot_id": shot["id"], "label": shot["label"]}

    # 1. Fire
    fire_result = fire_shot(shot)
    job_id = fire_result.get("job_id")
    if not job_id:
        result.update({"status": "dispatch_failed", "error": fire_result.get("error")})
        return result

    # 2. Poll
    job_result = poll_job(job_id, shot["id"])
    result["job_id"] = job_id
    result["status"] = job_result.get("status")

    if job_result.get("status") != "done":
        result["error"] = job_result.get("error", "unknown")
        return result

    # 3. Download
    clip_path = download_clip(job_result, shot, out_dir)
    result["clip_path"] = clip_path
    result["output_key"] = job_result.get("output_key")

    return result

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--shots", nargs="*", help="Shot IDs or numbers to dispatch (default: all 9)")
    parser.add_argument("--skip-health", action="store_true")
    parser.add_argument("--sequential", action="store_true", help="Fire one at a time (default: parallel)")
    args = parser.parse_args()

    # Output dir
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Health check
    if not args.skip_health:
        if not check_health():
            print("Endpoint unhealthy — aborting. Use --skip-health to bypass.")
            sys.exit(1)

    # Load shots
    shots = load_shots(args.shots)
    print(f"\n{'='*60}")
    print(f"Story 1 — Her Morning Song")
    print(f"Dispatching {len(shots)} shots to Modal ghaafeedi-video-gen-v2")
    print(f"Output dir: {OUTPUT_DIR}")
    print(f"Mode: {'sequential' if args.sequential else 'parallel'}")
    print(f"{'='*60}\n")

    for s in shots:
        print(f"  [{s['id']}] {s['label']}")
    print()

    # Execute
    results = []
    start_time = time.time()

    if args.sequential:
        for shot in shots:
            r = process_shot(shot, OUTPUT_DIR)
            results.append(r)
    else:
        with ThreadPoolExecutor(max_workers=9) as executor:
            futures = {executor.submit(process_shot, shot, OUTPUT_DIR): shot for shot in shots}
            for future in as_completed(futures):
                r = future.result()
                results.append(r)

    elapsed = time.time() - start_time

    # ─── Summary ────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"DISPATCH COMPLETE — {elapsed:.0f}s total")
    print(f"{'='*60}")

    completed = [r for r in results if r.get("status") == "done"]
    failed    = [r for r in results if r.get("status") != "done"]

    print(f"✓ Completed: {len(completed)}/{len(results)}")
    for r in sorted(completed, key=lambda x: x["shot_id"]):
        print(f"   {r['shot_id']} → {r.get('clip_path', 'no path')}")

    if failed:
        print(f"\n✗ Failed: {len(failed)}")
        for r in failed:
            print(f"   {r['shot_id']} — {r.get('status')} — {r.get('error', '')}")

    # ─── Auto-assemble if all done ──────────────────────────────────────────
    if len(completed) == len(shots):
        print(f"\n→ All {len(shots)} shots complete. Auto-assembling...")
        clip_paths = [r["clip_path"] for r in sorted(completed, key=lambda x: x["shot_id"]) if r.get("clip_path")]

        if len(clip_paths) == len(shots):
            assemble_cmd = [
                "python3", "scripts/assemble_story.py",
                "--clips", *clip_paths,
                "--output", f"test_output_wan/story1_v3/story1_grief_v3_ASSEMBLED.mp4",
            ]
            print(f"  Running: {' '.join(assemble_cmd)}")
            subprocess.run(assemble_cmd)
        else:
            print(f"  ✗ Some clip paths missing — run assemble manually")
    else:
        print(f"\n→ {len(failed)} shots failed. Re-run with --shots {' '.join(r['shot_id'] for r in failed)} to retry.")

    # Save manifest
    manifest_path = OUTPUT_DIR / "dispatch_manifest.json"
    manifest_path.write_text(json.dumps({"shots": results, "elapsed_s": elapsed}, indent=2))
    print(f"\n→ Manifest saved: {manifest_path}")


if __name__ == "__main__":
    main()
