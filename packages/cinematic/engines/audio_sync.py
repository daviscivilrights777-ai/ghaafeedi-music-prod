# ============================================================
# FILE: engines/audio_sync.py
# PURPOSE: Beat detection and audio sync engine
# ============================================================

import logging
from typing import List, Optional

logger = logging.getLogger("ghaafeedi.audio_sync")


class AudioSyncEngine:
    """
    Beat detection and audio synchronization.
    Uses librosa when available, falls back to BPM-based estimation.
    """

    def analyze_beats(self, audio_path: str) -> dict:
        """
        Analyze beats and structure of an audio file.

        Returns:
        {
            "bpm": float,
            "beat_times": [float, ...],
            "onset_times": [float, ...],
            "duration": float,
        }
        """
        try:
            import librosa
            import numpy as np

            y, sr = librosa.load(audio_path, sr=22050)
            duration = float(len(y) / sr)

            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
            # librosa >=0.10 may return tempo as array
            bpm_val = float(tempo.item()) if hasattr(tempo, 'item') else float(tempo)
            beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()

            onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
            onset_times = librosa.frames_to_time(onset_frames, sr=sr).tolist()

            logger.info(
                f"Beat analysis: {bpm_val:.1f} BPM, "
                f"{len(beat_times)} beats, {duration:.1f}s"
            )

            return {
                "bpm": bpm_val,
                "beat_times": beat_times,
                "onset_times": onset_times,
                "duration": duration,
            }

        except ImportError:
            logger.warning("librosa not available — using BPM estimation")
            return self._estimate_from_bpm(120.0, 180.0)
        except Exception as e:
            logger.error(f"Beat analysis failed: {e}")
            return self._estimate_from_bpm(120.0, 180.0)

    def _estimate_from_bpm(self, bpm: float, duration: float) -> dict:
        """Fallback: generate beat times from BPM."""
        beat_interval = 60.0 / bpm
        beat_times = [
            i * beat_interval
            for i in range(int(duration / beat_interval))
        ]
        return {
            "bpm": bpm,
            "beat_times": beat_times,
            "onset_times": beat_times[::2],
            "duration": duration,
        }

    def get_closest_beat(
        self,
        timestamp: float,
        beat_times: List[float],
        max_offset: float = 0.5
    ) -> float:
        """
        Snap a timestamp to the nearest beat.
        Returns original timestamp if no beat within max_offset.
        """
        if not beat_times:
            return timestamp

        closest = min(beat_times, key=lambda b: abs(b - timestamp))
        if abs(closest - timestamp) <= max_offset:
            return closest
        return timestamp

    def align_shot_cuts(
        self,
        shot_durations: List[float],
        beat_times: List[float],
        tolerance: float = 0.3
    ) -> List[float]:
        """
        Adjust shot durations so cuts land on beats.

        Returns adjusted duration list (same length as input).
        """
        if not beat_times:
            return shot_durations

        adjusted = []
        current_time = 0.0

        for duration in shot_durations:
            end_time = current_time + duration
            snapped = self.get_closest_beat(end_time, beat_times, tolerance)
            new_duration = max(1.5, snapped - current_time)
            adjusted.append(new_duration)
            current_time += new_duration

        return adjusted
