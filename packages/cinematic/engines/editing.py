# ============================================================
# FILE: engines/editing.py
# PURPOSE: Automated film editing with FFmpeg
# RUNABLE: Runs after all shots are generated
# ============================================================

import subprocess
import json
import logging
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass

from config import Shot, ShotPlan, TransitionType

logger = logging.getLogger("ghaafeedi.editing")


@dataclass
class EditPoint:
    """Single point in the edit decision list."""
    sequence_number: int
    source_file: str
    in_point: float
    out_point: float
    transition_type: str
    transition_duration: float
    speed: float = 1.0


class EditingEngine:
    """Autonomous film editing engine."""

    def __init__(self, output_dir: str, fps: int = 24):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.fps = fps

    def assemble_music_video(self, shot_files: List[str],
                              shot_plan: ShotPlan,
                              song_file: str,
                              output_path: str) -> str:
        """
        Main method: Assemble all shots into a complete music video
        synced to the song.
        """
        logger.info(f"Assembling music video from {len(shot_files)} shots")

        if not shot_files:
            raise ValueError("No shot files to assemble")

        # Step 1: Apply color grading to each shot
        graded_files = []
        for i, shot_file in enumerate(shot_files):
            shot = shot_plan.shots[i] if i < len(shot_plan.shots) else shot_plan.shots[-1]
            graded_path = str(self.output_dir / f"graded_{i:04d}.mp4")
            try:
                self._apply_cinematic_grade(shot_file, graded_path, shot)
                graded_files.append(graded_path)
            except Exception as e:
                logger.warning(f"Grading failed for shot {i}: {e}")
                graded_files.append(shot_file)

        # Step 2: Trim each shot to its planned duration
        trimmed_files = []
        for i, (graded_file, shot) in enumerate(zip(
            graded_files, shot_plan.shots[:len(graded_files)]
        )):
            trimmed_path = str(self.output_dir / f"trimmed_{i:04d}.mp4")
            try:
                self._trim_to_duration(graded_file, trimmed_path, shot.duration_seconds)
                trimmed_files.append(trimmed_path)
            except Exception as e:
                logger.warning(f"Trim failed for shot {i}: {e}")
                trimmed_files.append(graded_file)

        # Step 3: Create transitions and assemble
        assembled_path = str(self.output_dir / "assembled_no_audio.mp4")
        self._assemble_with_transitions(trimmed_files, shot_plan, assembled_path)

        # Step 4: Add the song as audio
        logger.info("Adding song audio...")
        self._add_audio(assembled_path, song_file, output_path)

        logger.info(f"Music video assembled: {output_path}")
        return output_path

    def _apply_cinematic_grade(self, input_path: str,
                                output_path: str, shot: Shot):
        """Apply cinematic color grading to a shot."""
        filters = []
        filters.append("eq=contrast=1.12:saturation=0.88")
        filters.append(
            "colorbalance=rs=-0.08:gs=-0.03:bs=0.12"
            ":rh=0.06:gh=0.02:bh=-0.04"
        )
        filters.append("vignette=PI/4")
        filters.append("noise=alls=8:allf=t")
        filters.append(
            "drawbox=x=0:y=0:w=iw:h=ih*0.12:color=black@1.0:t=fill,"
            "drawbox=x=0:y=ih-ih*0.12:w=iw:h=ih*0.12:color=black@1.0:t=fill"
        )

        filter_string = ",".join(filters)

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vf", filter_string,
            "-c:v", "libx264",
            "-preset", "slow",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-an",
            output_path
        ]

        subprocess.run(cmd, check=True, capture_output=True, timeout=120)

    def _trim_to_duration(self, input_path: str, output_path: str,
                          duration: float):
        """Trim video to exact duration."""
        source_duration = self._get_duration(input_path)

        if source_duration <= 0:
            raise ValueError(f"Source has no duration: {input_path}")

        if source_duration >= duration:
            cmd = [
                "ffmpeg", "-y",
                "-i", input_path,
                "-t", str(duration),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "18",
                "-an",
                output_path
            ]
        else:
            speed = source_duration / duration
            if speed < 0.25:
                speed = 0.25
            pts_multiplier = 1.0 / speed
            cmd = [
                "ffmpeg", "-y",
                "-i", input_path,
                "-vf", f"setpts={pts_multiplier}*PTS",
                "-t", str(duration),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "18",
                "-an",
                output_path
            ]

        subprocess.run(cmd, check=True, capture_output=True, timeout=120)

    def _assemble_with_transitions(self, clips: List[str],
                                    shot_plan: ShotPlan,
                                    output_path: str):
        """Assemble clips with transitions."""
        if len(clips) <= 1:
            if clips:
                subprocess.run(["cp", clips[0], output_path], check=True)
            return

        current = clips[0]

        for i in range(1, len(clips)):
            intermediate = str(self.output_dir / f"assembly_{i:04d}.mp4")

            if i - 1 < len(shot_plan.shots):
                transition = shot_plan.shots[i - 1].transition_to_next
                trans_dur = shot_plan.shots[i - 1].transition_duration_seconds
            else:
                transition = TransitionType.CUT
                trans_dur = 0.0

            if transition == TransitionType.CUT or trans_dur <= 0:
                self._concat_two(current, clips[i], intermediate)
            elif transition in [TransitionType.DISSOLVE, TransitionType.FADE_TO_BLACK]:
                self._crossfade_two(
                    current, clips[i], intermediate,
                    transition.value, max(0.3, trans_dur)
                )
            else:
                self._concat_two(current, clips[i], intermediate)

            current = intermediate

        subprocess.run(["cp", current, output_path], check=True)

    def _concat_two(self, clip_a: str, clip_b: str, output: str):
        """Concatenate two clips."""
        list_file = str(self.output_dir / "concat_temp.txt")
        with open(list_file, "w") as f:
            f.write(f"file '{clip_a}'\n")
            f.write(f"file '{clip_b}'\n")

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-an",
            output
        ]

        subprocess.run(cmd, check=True, capture_output=True, timeout=120)

    def _crossfade_two(self, clip_a: str, clip_b: str, output: str,
                       transition: str = "fade", duration: float = 0.5):
        """Create crossfade transition between two clips."""
        dur_a = self._get_duration(clip_a)
        offset = max(0, dur_a - duration)

        xfade_type = "fade"
        if transition == "FADE_TO_BLACK":
            xfade_type = "fadeblack"

        cmd = [
            "ffmpeg", "-y",
            "-i", clip_a,
            "-i", clip_b,
            "-filter_complex",
            f"[0:v][1:v]xfade=transition={xfade_type}:"
            f"duration={duration}:offset={offset}[v]",
            "-map", "[v]",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-an",
            output
        ]

        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=120)
        except subprocess.CalledProcessError:
            self._concat_two(clip_a, clip_b, output)

    def _add_audio(self, video_path: str, audio_path: str,
                   output_path: str):
        """Add audio track to video, trimming to shortest."""
        video_dur = self._get_duration(video_path)

        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-filter_complex",
            (
                f"[1:a]afade=t=in:st=0:d=1.5,"
                f"afade=t=out:st={max(0, video_dur - 2)}:d=2[a]"
            ),
            "-map", "0:v",
            "-map", "[a]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "320k",
            "-shortest",
            output_path
        ]

        subprocess.run(cmd, check=True, capture_output=True, timeout=300)

    def create_final_master(self, input_path: str,
                            output_path: str) -> str:
        """Create final high-quality delivery master."""
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-c:v", "libx265",
            "-b:v", "30M",
            "-c:a", "aac",
            "-b:a", "320k",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p10le",
            output_path
        ]

        subprocess.run(cmd, check=True, capture_output=True, timeout=600)
        return output_path

    def extract_thumbnail(self, video_path: str,
                          output_path: str,
                          time_seconds: float = 0) -> str:
        """Extract a high-quality thumbnail from the video."""
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(time_seconds),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            output_path
        ]

        subprocess.run(cmd, check=True, capture_output=True, timeout=30)
        return output_path

    def _get_duration(self, filepath: str) -> float:
        """Get duration of a media file."""
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            filepath
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        try:
            data = json.loads(result.stdout)
            return float(data["format"]["duration"])
        except:
            return 0.0
