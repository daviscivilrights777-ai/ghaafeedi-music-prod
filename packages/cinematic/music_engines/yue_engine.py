# ============================================================
# FILE: music_engines/yue_engine.py
# PURPOSE: YuE — Unified vocal + music generation (Suno-closest)
#
# YuE by HKUST: Full song generation with vocals.
# Closest open-source equivalent to Suno's output quality.
# Excels at: pop, R&B, emotional ballads.
# License: Apache 2.0 — full commercial use.
# GPU: A100 40GB recommended (minimum A100 40GB).
#
# Used as:
# - Fallback when ACE-Step fails on restricted content
# - Fallback for ultra-quality vocal generation
# Repo: https://github.com/multimodal-art-projection/YuE
# ============================================================

import logging
import os
import time
import subprocess
import tempfile
from typing import Optional

logger = logging.getLogger("ghaafeedi.music.yue")

YUE_WORKSPACE = os.environ.get("YUE_PATH", "/workspace/yue-model")
YUE_OUTPUT_DIR = os.environ.get("YUE_OUTPUT_DIR", "/tmp/yue-output")
YUE_MODEL_ID = os.environ.get("YUE_MODEL_ID", "m-a-p/YuE-s1-7B-anneal-en-cot")

# YuE supports genre conditioning via text tags (similar to Suno style tags)
# Map Ghaafeedi emotions to YuE genre + mood tags
YUE_GENRE_EMOTION_MAP = {
    "grief": "pop ballad, slow, sad, emotional, piano, strings",
    "love": "romantic pop, warm, soft, gentle, love song",
    "loneliness": "indie pop, melancholic, sparse, introspective",
    "nostalgia": "folk pop, warm, acoustic, vintage, reminiscent",
    "joy": "upbeat pop, bright, energetic, happy, celebratory",
    "gratitude": "gentle pop, thankful, uplifting, warm, acoustic",
    "peace": "ambient pop, calm, soft, meditative, tranquil",
    "comeback": "epic pop, empowering, triumphant, building, strong",
    "hope": "inspirational pop, uplifting, bright, aspiring",
    "courage": "powerful pop, bold, strong, motivating, determined",
    "triumph": "epic pop anthem, victorious, powerful, celebratory",
    "heartbreak": "sad ballad, heartbroken, emotional, minor key, piano",
    "anger": "intense pop, dark, heavy, raw, frustrated",
}


class YuEEngine:
    """
    YuE music generation engine.
    
    Closest Suno alternative — generates full songs with natural
    vocals and lyrics conditioning. Used as fallback for:
    - ACE-Step failures on restricted content
    - Ultra-quality vocal generation scenarios
    
    YuE uses a two-stage pipeline:
    Stage 1: Lyric + genre → music token generation (YuE-s1)
    Stage 2: Music tokens → audio waveform (YuE-s2 / codec decoder)
    """
    
    def __init__(self, workspace: str = YUE_WORKSPACE):
        self.workspace = workspace
        self.output_dir = YUE_OUTPUT_DIR
        self.available = self._check_available()
        
        if self.available:
            logger.info(f"YuE engine ready at {workspace}")
        else:
            logger.info(
                "YuE not available "
                "(expected on A100 Modal containers)"
            )
    
    def _check_available(self) -> bool:
        return (
            os.path.isdir(self.workspace) and
            len(os.listdir(self.workspace)) > 0
        )
    
    def generate_song(
        self,
        lyrics: str,
        genre_tags: str,
        emotion: str,
        duration_seconds: int = 200,
        language: str = "english",
        seed: Optional[int] = None,
    ) -> dict:
        """
        Generate a full song with vocals using YuE.
        
        Args:
            lyrics: Full song lyrics with section markers
                   ([verse], [chorus], [bridge] etc.)
            genre_tags: Comma-separated style tags
                       (e.g. "pop, emotional, piano, strings")
            emotion: Primary emotion string
            duration_seconds: Target duration
            language: Language for vocals (YuE supports EN/ZH natively)
            seed: Optional random seed for reproducibility
            
        Returns:
            dict with keys: success, song_file_url, duration_seconds,
                           bpm, model, error
        """
        start_time = time.time()
        
        if not self.available:
            return {
                "success": False,
                "error": "YuE model not loaded — A100 GPU required",
                "model": "yue"
            }
        
        try:
            os.makedirs(self.output_dir, exist_ok=True)
            
            job_id = int(time.time())
            output_path = os.path.join(
                self.output_dir, f"yue_{job_id}.wav"
            )
            
            # Build enriched genre tags from emotion mapping
            emotion_tags = YUE_GENRE_EMOTION_MAP.get(
                emotion.lower(), "pop, emotional"
            )
            combined_tags = f"{genre_tags}, {emotion_tags}"
            
            # Format lyrics for YuE (add section markers if missing)
            formatted_lyrics = self._format_lyrics(lyrics)
            
            # Write inputs to temp files (YuE CLI expects file paths)
            temp_dir = tempfile.mkdtemp(prefix=f"yue_{job_id}_")
            lyrics_file = os.path.join(temp_dir, "lyrics.txt")
            tags_file = os.path.join(temp_dir, "genre_tags.txt")
            
            with open(lyrics_file, "w", encoding="utf-8") as f:
                f.write(formatted_lyrics)
            
            with open(tags_file, "w", encoding="utf-8") as f:
                f.write(combined_tags)
            
            # Run YuE inference
            cmd = self._build_command(
                lyrics_file=lyrics_file,
                tags_file=tags_file,
                output_path=output_path,
                duration_seconds=duration_seconds,
                language=language,
                seed=seed
            )
            
            logger.info(
                f"[YuE] Starting generation: "
                f"emotion={emotion}, duration={duration_seconds}s"
            )
            
            proc = subprocess.run(
                cmd,
                cwd=self.workspace,
                capture_output=True,
                text=True,
                timeout=900  # 15 min max — YuE is slower than ACE-Step
            )
            
            if proc.returncode != 0:
                logger.error(f"[YuE] Generation failed: {proc.stderr[-500:]}")
                return {
                    "success": False,
                    "error": f"YuE subprocess error: {proc.stderr[-500:]}",
                    "model": "yue"
                }
            
            if not os.path.exists(output_path):
                # YuE may output to a different path — search temp dir
                output_path = self._find_output(temp_dir, output_path)
                if not output_path:
                    return {
                        "success": False,
                        "error": "YuE did not produce output file",
                        "model": "yue"
                    }
            
            # Post-process: normalize audio levels
            normalized_path = self._normalize_audio(output_path, job_id)
            
            # Get metadata
            duration_actual = self._get_duration(normalized_path)
            bpm = self._detect_bpm(normalized_path)
            
            gen_time = time.time() - start_time
            
            logger.info(
                f"[YuE] Done — "
                f"{duration_actual:.1f}s, "
                f"BPM={bpm}, "
                f"gen_time={gen_time:.1f}s"
            )
            
            return {
                "success": True,
                "song_file_url": normalized_path,
                "duration_seconds": duration_actual,
                "bpm": bpm,
                "model": "yue",
                "generation_time_seconds": gen_time,
            }
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "YuE generation timed out (>15 min)",
                "model": "yue"
            }
        except Exception as e:
            logger.exception(f"[YuE] Unexpected error: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": "yue",
                "generation_time_seconds": time.time() - start_time
            }
    
    def _build_command(
        self,
        lyrics_file: str,
        tags_file: str,
        output_path: str,
        duration_seconds: int,
        language: str,
        seed: Optional[int]
    ) -> list:
        """Build YuE CLI inference command."""
        # YuE inference entry point: infer.py or inference/infer.py
        # Check which exists
        infer_script = "infer.py"
        if os.path.exists(os.path.join(self.workspace, "inference", "infer.py")):
            infer_script = "inference/infer.py"
        
        cmd = [
            "python", infer_script,
            "--lyrics_file", lyrics_file,
            "--genre_txt", tags_file,
            "--output_dir", os.path.dirname(output_path),
            "--max_new_tokens", str(self._duration_to_tokens(duration_seconds)),
            "--cuda_idx", "0",
        ]
        
        if seed is not None:
            cmd += ["--seed", str(seed)]
        
        # Language flag (YuE s1 supports en/zh primarily)
        if language.lower() in ["chinese", "mandarin", "zh", "zh-cn"]:
            cmd += ["--language", "zh"]
        else:
            cmd += ["--language", "en"]
        
        return cmd
    
    def _duration_to_tokens(self, duration_seconds: int) -> int:
        """
        Convert target duration to YuE token count.
        YuE generates ~21.5 tokens/second of audio.
        """
        tokens_per_second = 21.5
        return int(duration_seconds * tokens_per_second)
    
    def _format_lyrics(self, lyrics: str) -> str:
        """
        Format lyrics for YuE input.
        YuE expects section markers: [verse], [chorus], [bridge], [outro]
        Add markers if missing.
        """
        if any(marker in lyrics.lower() for marker in [
            "[verse]", "[chorus]", "[bridge]", "[intro]", "[outro]"
        ]):
            return lyrics  # Already formatted
        
        # Simple heuristic: split into verse/chorus/verse/chorus/outro
        lines = [l for l in lyrics.strip().split("\n") if l.strip()]
        total_lines = len(lines)
        
        if total_lines <= 4:
            return f"[verse]\n{lyrics}"
        
        mid = total_lines // 2
        verse1 = "\n".join(lines[:mid // 2])
        chorus1 = "\n".join(lines[mid // 2:mid])
        verse2 = "\n".join(lines[mid:mid + mid // 2])
        chorus2 = "\n".join(lines[mid + mid // 2:])
        
        formatted = (
            f"[verse]\n{verse1}\n\n"
            f"[chorus]\n{chorus1}\n\n"
            f"[verse]\n{verse2}\n\n"
            f"[chorus]\n{chorus2}"
        )
        
        return formatted
    
    def _find_output(self, search_dir: str, expected_path: str) -> Optional[str]:
        """Search for YuE output file if not at expected path."""
        for root, dirs, files in os.walk(search_dir):
            for f in files:
                if f.endswith((".wav", ".mp3", ".flac")):
                    return os.path.join(root, f)
        
        # Also check YuE workspace output dir
        yue_out = os.path.join(self.workspace, "output")
        if os.path.isdir(yue_out):
            for f in sorted(os.listdir(yue_out), reverse=True):
                if f.endswith((".wav", ".mp3")):
                    return os.path.join(yue_out, f)
        
        return None
    
    def _normalize_audio(self, audio_path: str, job_id: int) -> str:
        """Normalize audio to -14 LUFS (streaming standard) via FFmpeg."""
        output_path = os.path.join(
            self.output_dir, f"yue_norm_{job_id}.wav"
        )
        
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-i", audio_path,
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
                output_path
            ],
            capture_output=True, text=True, timeout=120
        )
        
        if result.returncode == 0:
            return output_path
        else:
            logger.warning(f"[YuE] Normalization failed, using raw output")
            return audio_path
    
    def _detect_bpm(self, audio_path: str) -> Optional[float]:
        """Detect BPM using librosa."""
        try:
            import librosa
            y, sr = librosa.load(audio_path, sr=22050, duration=60.0)
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            return round(float(tempo), 1)
        except Exception as e:
            logger.warning(f"[YuE] BPM detection failed: {e}")
            return None
    
    def _get_duration(self, audio_path: str) -> float:
        """Get audio duration via ffprobe."""
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json",
                 "-show_format", audio_path],
                capture_output=True, text=True
            )
            import json
            data = json.loads(result.stdout)
            return float(data["format"]["duration"])
        except Exception:
            return 0.0
