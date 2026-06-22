#!/usr/bin/env python3
"""
Ghaafeedi Music — Cinematic Continuity Assembly Engine
Phase A + B: FFmpeg xfade overlap compositor with per-shot transition intelligence
Phase C: I2V Continuity Bridge — last frame of clip N seeds clip N+1

Usage:
  python3 scripts/assemble_story.py --clips clip1.mp4 clip2.mp4 clip3.mp4
  python3 scripts/assemble_story.py --story_id story1_grief --shots_json director_shots.json
  python3 scripts/assemble_story.py --demo   (assembles test_output_wan/S01_00{1,2,3}_final.mp4)

Phases:
  Phase A — FFmpeg xfade cross-dissolve with 2s temporal overlap
  Phase B — Per-shot transition map read from director notes (DISSOLVE/CUT/FADE/FADE_TO_BLACK)
  Phase C -- Extract last frame of each clip → save as next clip's start_frame guidance
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from dataclasses import dataclass, field
from typing import Literal

# ─── Transition types ─────────────────────────────────────────────────────────

TransitionType = Literal["DISSOLVE", "CUT", "FADE", "FADE_TO_BLACK"]

TRANSITION_DURATION = {
    "DISSOLVE":      2.0,   # cross-dissolve overlap
    "CUT":           0.0,   # hard cut, no overlap
    "FADE":          1.5,   # fade to black + fade in
    "FADE_TO_BLACK": 2.0,   # longer fade to black + 0.5s hold + fade in
}

# xfade filter names for ffmpeg
XFADE_EFFECT = {
    "DISSOLVE":      "fade",
    "CUT":           None,          # no filter
    "FADE":          "fadeblack",
    "FADE_TO_BLACK": "fadeblack",
}


@dataclass
class ShotMeta:
    clip_path: str
    transition_out: TransitionType = "DISSOLVE"   # transition AFTER this shot
    duration_s: float = 0.0                        # populated from probe


# ─── Helpers ─────────────────────────────────────────────────────────────────

def probe_duration(path: str) -> float:
    """Return video duration in seconds via ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())


def extract_last_frame(clip_path: str, output_png: str, offset_s: float = 0.2) -> str:
    """
    Phase C — Extract last frame (minus offset_s to avoid fade tail).
    Returns path to saved PNG.
    """
    duration = probe_duration(clip_path)
    seek_t = max(0.0, duration - offset_s)
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(seek_t),
        "-i", clip_path,
        "-vframes", "1",
        "-q:v", "2",
        output_png,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_png


def extract_first_frame(clip_path: str, output_png: str) -> str:
    """Extract first frame of a clip (for continuity verification)."""
    cmd = [
        "ffmpeg", "-y",
        "-i", clip_path,
        "-vframes", "1",
        "-q:v", "2",
        output_png,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_png


# ─── Phase A + B Core: xfade assembly ────────────────────────────────────────

def _xfade_two(clip_a: str, clip_b: str, t_type: TransitionType, out_path: str, tmp_dir: str) -> float:
    """Merge two clips with a single transition. Returns output duration."""
    dur_a = probe_duration(clip_a)
    t_dur = TRANSITION_DURATION[t_type]

    if t_type == "CUT" or t_dur == 0.0:
        concat_txt = os.path.join(tmp_dir, "concat2.txt")
        with open(concat_txt, "w") as f:
            f.write(f"file '{os.path.abspath(clip_a)}'\n")
            f.write(f"file '{os.path.abspath(clip_b)}'\n")
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_txt,
            "-c:v", "libx264", "-crf", "16", "-preset", "fast",
            "-pix_fmt", "yuv420p", out_path,
        ]
    else:
        effect = {"DISSOLVE": "fade", "FADE": "fadeblack", "FADE_TO_BLACK": "fadeblack"}.get(t_type, "fade")
        offset = max(0.0, dur_a - t_dur)
        filt = f"[0:v][1:v]xfade=transition={effect}:duration={t_dur}:offset={offset:.4f}[vout]"
        cmd = [
            "ffmpeg", "-y", "-i", clip_a, "-i", clip_b,
            "-filter_complex", filt, "-map", "[vout]",
            "-c:v", "libx264", "-crf", "16", "-preset", "fast",
            "-pix_fmt", "yuv420p", out_path,
        ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[-600:]}")
    return probe_duration(out_path)


def assemble_with_xfade(shots: list[ShotMeta], output_path: str, tmp_dir: str) -> dict:
    """
    Phase A + B: Sequential pairwise assembly with correct transition chaining.

    Strategy: process clip pairs one at a time (A+B → temp, temp+C → temp2, etc.)
    This avoids ffmpeg xfade chaining bugs where second xfade ignores stream timing.

    Transitions:
      - DISSOLVE:      2s cross-dissolve (overlap 2s)
      - CUT:           hard cut, no overlap
      - FADE:          1.5s fadeblack
      - FADE_TO_BLACK: 2s fadeblack
    """
    if len(shots) == 0:
        raise ValueError("No shots provided")

    for shot in shots:
        shot.duration_s = probe_duration(shot.clip_path)
        print(f"  📎 {Path(shot.clip_path).name} → {shot.duration_s:.2f}s  [{shot.transition_out}]")

    n = len(shots)
    applied_transitions = []
    total_duration = sum(s.duration_s for s in shots)

    if n == 1:
        subprocess.run(
            ["ffmpeg", "-y", "-i", shots[0].clip_path,
             "-c:v", "libx264", "-crf", "16", "-preset", "slow",
             "-pix_fmt", "yuv420p", "-movflags", "+faststart", output_path],
            check=True, capture_output=True,
        )
        return {
            "clips": 1,
            "total_duration_s": shots[0].duration_s,
            "actual_duration_s": shots[0].duration_s,
            "transitions_applied": [],
            "output": output_path,
            "file_size_bytes": os.path.getsize(output_path),
            "file_size_mb": round(os.path.getsize(output_path) / 1024 / 1024, 2),
        }

    print(f"\n  🎬 Sequential pairwise assembly ({n} clips)...")

    # Pairwise sequential merge
    current_clip = shots[0].clip_path
    for i in range(n - 1):
        t_type = shots[i].transition_out
        t_dur  = TRANSITION_DURATION[t_type]
        next_clip = shots[i + 1].clip_path
        out_seg = os.path.join(tmp_dir, f"seg_{i}_{i+1}.mp4")

        dur_before = probe_duration(current_clip)
        seg_dur = _xfade_two(current_clip, next_clip, t_type, out_seg, tmp_dir)
        print(f"  → Clip[{i}]+Clip[{i+1}] via {t_type} ({t_dur}s) → {seg_dur:.2f}s")

        applied_transitions.append({
            "from_clip": i,
            "to_clip": i + 1,
            "type": t_type,
            "duration_s": t_dur,
            "overlap_s": t_dur if t_type != "CUT" else 0.0,
        })
        total_duration -= t_dur if t_type != "CUT" else 0.0
        current_clip = out_seg

    # Re-encode final output with slow preset + faststart
    subprocess.run(
        ["ffmpeg", "-y", "-i", current_clip,
         "-c:v", "libx264", "-crf", "16", "-preset", "slow",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", output_path],
        check=True, capture_output=True,
    )

    out_duration = probe_duration(output_path)
    out_size = os.path.getsize(output_path)

    return {
        "clips": n,
        "total_duration_s": round(total_duration, 3),
        "actual_duration_s": round(out_duration, 3),
        "transitions_applied": applied_transitions,
        "output": output_path,
        "file_size_bytes": out_size,
        "file_size_mb": round(out_size / 1024 / 1024, 2),
    }


# ─── Phase C: I2V Continuity Bridge ─────────────────────────────────────────

def extract_continuity_frames(shots: list[ShotMeta], output_dir: str) -> list[dict]:
    """
    Phase C: Extract last frame of clip[i] to use as start_frame guidance for clip[i+1].

    Returns list of continuity frame records:
    [
      {"from_clip": 0, "to_clip": 1, "frame_path": "/path/to/frame_0to1.png"},
      ...
    ]

    These frames are passed to video_gen_v2 as the next shot's start_frame.
    The I2V pipeline (Wan2.1-14B-I2V) locks onto this frame and generates
    motion FROM it — guaranteeing visual continuity across the seam.
    """
    os.makedirs(output_dir, exist_ok=True)
    continuity_frames = []

    for i in range(len(shots) - 1):
        clip = shots[i].clip_path
        frame_path = os.path.join(output_dir, f"continuity_{i}_to_{i+1}.png")
        print(f"  🖼  Extracting last frame: clip {i} → {Path(frame_path).name}")
        extract_last_frame(clip, frame_path)
        continuity_frames.append({
            "from_clip": i,
            "to_clip": i + 1,
            "frame_path": frame_path,
            "use_as_start_frame": True,
        })

    return continuity_frames


def build_next_shot_params(
    base_params: dict,
    continuity_frame: dict,
    r2_public_url: str | None = None,
    r2_upload_fn=None,
) -> dict:
    """
    Phase C: Augment a shot's generation params with continuity start_frame.

    If r2_upload_fn is provided, uploads the frame to R2 and returns the URL
    for Modal to fetch. Otherwise embeds as base64 data URI.
    """
    frame_path = continuity_frame["frame_path"]

    if r2_upload_fn and r2_public_url:
        # Upload to R2, pass public URL to Modal
        r2_key = f"continuity/{Path(frame_path).name}"
        frame_url = r2_upload_fn(frame_path, r2_key)
        augmented = {**base_params, "start_frame_url": frame_url}
    else:
        # Embed as base64 (fallback — larger payload)
        import base64
        with open(frame_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        augmented = {**base_params, "start_frame_b64": f"data:image/png;base64,{b64}"}

    return augmented


# ─── Director Notes Parser ────────────────────────────────────────────────────

def parse_shots_from_director_notes(notes_path: str, story_index: int = 0) -> list[ShotMeta]:
    """
    Parse shot list from director notes markdown.
    Extracts transition type per shot from the table.

    story_index: which story's shot list to use (0 = first story = GRIEF)
    """
    with open(notes_path) as f:
        content = f.read()

    # Find all shot tables
    import re
    # Match shot table rows: | N | TYPE | CAMERA | DURs | TRANSITION |
    row_pattern = re.compile(
        r"\|\s*(\d+)\s*\|\s*(\w[\w\s]*?)\s*\|\s*([\w\s]+?)\s*\|\s*(\d+s)\s*\|\s*([\w\s]+?)\s*\|"
    )
    all_matches = row_pattern.findall(content)

    # Group into stories by shot number resetting to 1
    stories = []
    current = []
    last_num = 0
    for m in all_matches:
        shot_num = int(m[0])
        if shot_num <= last_num and current:
            stories.append(current)
            current = []
        current.append(m)
        last_num = shot_num
    if current:
        stories.append(current)

    if story_index >= len(stories):
        raise ValueError(f"Story index {story_index} not found. {len(stories)} stories parsed.")

    story_shots = stories[story_index]
    shots = []
    for row in story_shots:
        raw_transition = row[4].strip().upper().replace(" ", "_")
        # Normalize
        if "FADE_TO_BLACK" in raw_transition or "FADE TO BLACK" in raw_transition:
            t_type = "FADE_TO_BLACK"
        elif "FADE" in raw_transition:
            t_type = "FADE"
        elif "CUT" in raw_transition:
            t_type = "CUT"
        else:
            t_type = "DISSOLVE"
        shots.append(ShotMeta(clip_path="", transition_out=t_type))

    return shots


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Ghaafeedi Cinematic Continuity Assembler")
    parser.add_argument("--clips", nargs="+", help="Clip paths in order")
    parser.add_argument("--transitions", nargs="+",
                        help="Transition per clip gap: DISSOLVE|CUT|FADE|FADE_TO_BLACK (N-1 values)")
    parser.add_argument("--shots_json", help="JSON file with shot metadata")
    parser.add_argument("--director_notes", help="Path to director notes .md")
    parser.add_argument("--story_index", type=int, default=0,
                        help="Which story in director notes (0-indexed)")
    parser.add_argument("--output", default="assembled_story.mp4", help="Output path")
    parser.add_argument("--extract_continuity", action="store_true",
                        help="Phase C: Extract last frames for next clip I2V seeding")
    parser.add_argument("--continuity_dir", default="continuity_frames",
                        help="Where to save continuity frames")
    parser.add_argument("--demo", action="store_true",
                        help="Run demo: assemble test_output_wan/S01_00{1,2,3}_final.mp4")
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent  # ghaafeedi-music root

    # ── Demo mode ──
    if args.demo:
        wan_dir = base_dir / "test_output_wan"
        clips = [
            str(wan_dir / "S01_001_final.mp4"),
            str(wan_dir / "S01_002_final.mp4"),
            str(wan_dir / "S01_003_final.mp4"),
        ]
        # Story 1 shots 1-3 transitions: DISSOLVE, CUT, DISSOLVE
        shots = [
            ShotMeta(clip_path=clips[0], transition_out="DISSOLVE"),
            ShotMeta(clip_path=clips[1], transition_out="CUT"),
            ShotMeta(clip_path=clips[2], transition_out="DISSOLVE"),
        ]
        output = str(wan_dir / "story1_grief_CONTINUITY.mp4")
        continuity_dir = str(wan_dir / "continuity_frames")

    # ── Clips mode ──
    elif args.clips:
        clips = args.clips
        n = len(clips)
        # Build transitions list
        if args.transitions:
            trans = args.transitions
            # Pad to n (last clip transition doesn't matter)
            while len(trans) < n:
                trans.append("DISSOLVE")
        elif args.director_notes:
            parsed = parse_shots_from_director_notes(args.director_notes, args.story_index)
            trans = [s.transition_out for s in parsed[:n]]
            while len(trans) < n:
                trans.append("DISSOLVE")
        else:
            trans = ["DISSOLVE"] * n

        shots = [
            ShotMeta(clip_path=c, transition_out=t)
            for c, t in zip(clips, trans)
        ]
        output = args.output
        continuity_dir = args.continuity_dir

    else:
        parser.print_help()
        sys.exit(1)

    print("\n═══════════════════════════════════════════════════════")
    print("  Ghaafeedi Cinematic Continuity Assembler")
    print(f"  {len(shots)} clips → {Path(output).name}")
    print("═══════════════════════════════════════════════════════\n")

    with tempfile.TemporaryDirectory() as tmp:

        # ── Phase A + B: xfade assembly ──
        print("▶ Phase A+B — xfade overlap assembly")
        meta = assemble_with_xfade(shots, output, tmp)

        print(f"\n  ✅ Assembly complete:")
        print(f"     Output   : {output}")
        print(f"     Duration : {meta['actual_duration_s']}s (target {meta['total_duration_s']}s)")
        print(f"     Size     : {meta['file_size_mb']} MB")
        print(f"     Clips    : {meta['clips']}")
        if meta.get("transitions_applied"):
            print(f"     Transitions applied:")
            for t in meta["transitions_applied"]:
                print(f"       Clip {t['from_clip']}→{t['to_clip']}: {t['type']} ({t['overlap_s']}s overlap)")

        # ── Phase C: Extract continuity frames ──
        if args.extract_continuity or args.demo:
            print(f"\n▶ Phase C — I2V Continuity Bridge")
            frames = extract_continuity_frames(shots, continuity_dir)
            print(f"\n  ✅ {len(frames)} continuity frame(s) extracted:")
            for f in frames:
                size = os.path.getsize(f["frame_path"])
                print(f"     {Path(f['frame_path']).name} ({size//1024}KB) — seeds clip {f['to_clip']}")

            # Save manifest
            manifest_path = os.path.join(continuity_dir, "continuity_manifest.json")
            with open(manifest_path, "w") as mf:
                json.dump({
                    "story_clips": [s.clip_path for s in shots],
                    "assembled_output": output,
                    "continuity_frames": frames,
                    "instructions": (
                        "Feed frame_path as start_frame guidance for the clip at to_clip index. "
                        "Pass via start_frame_url (R2) or start_frame_b64 to Modal video_gen_v2."
                    ),
                }, mf, indent=2)
            print(f"\n     Manifest : {manifest_path}")

        # ── Final summary ──
        meta_out = os.path.splitext(output)[0] + "_assembly_meta.json"
        with open(meta_out, "w") as mf:
            json.dump(meta, mf, indent=2)
        print(f"\n  📋 Metadata : {meta_out}")
        print("\n═══════════════════════════════════════════════════════")
        print("  DONE. Cinematic continuity assembly complete.")
        print("═══════════════════════════════════════════════════════\n")


if __name__ == "__main__":
    main()
