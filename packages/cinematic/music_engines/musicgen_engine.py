# ============================================================
# FILE: music_engines/musicgen_engine.py
# PURPOSE: Meta MusicGen Medium + XTTS-v2 vocal mixing
#
# MusicGen Medium: Most reliable open-source music backbone.
# XTTS-v2: Multilingual TTS for vocal layer (17 languages).
# Final output: FFmpeg mix of instrumental + vocal track.
#
# CRITICAL: Use facebook/musicgen-medium ONLY.
#           facebook/musicgen-large = non-commercial license.
#           Medium = CC-BY-NC 4.0 = commercial OK.
#
# GPU: A10G (24GB VRAM)
# Repo: https://github.com/facebookresearch/audiocraft
# XTTS: https://github.com/coqui-ai/TTS
# ============================================================

import logging
import os
import time
import tempfile
import subprocess
from typing import Optional

logger = logging.getLogger("ghaafeedi.music.musicgen")

MUSICGEN_WORKSPACE = os.environ.get("MUSICGEN_PATH", "/workspace/musicgen")
MUSICGEN_OUTPUT_DIR = os.environ.get("MUSICGEN_OUTPUT_DIR", "/tmp/musicgen-output")

# CRITICAL: Only use medium. Large is non-commercial.
MUSICGEN_MODEL_ID = "facebook/musicgen-medium"

# MusicGen max single-pass duration (seconds)
# Beyond this we chunk + crossfade
MUSICGEN_MAX_CHUNK_SECONDS = 30
CROSSFADE_SECONDS = 1.5

# XTTS-v2 supported languages
XTTS_SUPPORTED_LANGUAGES = [
    "en", "es", "fr", "de", "it", "pt", "pl", "tr",
    "ru", "nl", "cs", "ar", "zh-cn", "hu", "ko", "ja", "hi"
]

# Language name → XTTS language code
LANGUAGE_MAP = {
    "english": "en",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "italian": "it",
    "portuguese": "pt",
    "polish": "pl",
    "turkish": "tr",
    "russian": "ru",
    "dutch": "nl",
    "czech": "cs",
    "arabic": "ar",
    "chinese": "zh-cn",
    "mandarin": "zh-cn",
    "hungarian": "hu",
    "korean": "ko",
    "japanese": "ja",
    "hindi": "hi",
}

# Emotion → MusicGen text prompt mapping
EMOTION_PROMPT_MAP = {
    "grief":      "sad emotional piano, slow strings, minor key, cinematic",
    "love":       "romantic ballad, soft guitar, warm strings, gentle piano",
    "loneliness": "sparse ambient, single piano, reverb, minimal, quiet",
    "nostalgia":  "warm acoustic guitar, vintage feel, soft drums, analog",
    "joy":        "uplifting pop, bright major key, energetic, feel-good",
    "gratitude":  "gentle uplifting, acoustic guitar, warm, positive",
    "peace":      "ambient meditation, soft pads, minimal, calm, 60bpm",
    "comeback":   "epic cinematic build, orchestra, powerful, rising",
    "hope":       "uplifting orchestral, ascending melody, bright",
    "courage":    "bold orchestral, driving, powerful, heroic",
    "triumph":    "epic victory, full orchestra, brass fanfare, major key",
    "heartbreak": "sad ballad, piano, minor key, emotional, slow",
    "anger":      "intense, heavy drums, dark minor, driving, aggressive",
}


class MusicGenEngine:
    """
    MusicGen Medium + XTTS-v2 engine.
    
    Most reliable fallback for multilingual content.
    Handles 17 languages via XTTS-v2 vocal synthesis
    mixed over MusicGen instrumental background.
    
    Generation strategy:
    1. Generate instrumental with MusicGen (chunked if >30s)
    2. Generate vocals with XTTS-v2 from lyrics
    3. Mix: instrumental 70% + vocals 100% via FFmpeg
    """
    
    def __init__(self, workspace: str = MUSICGEN_WORKSPACE):
        self.workspace = workspace
        self.output_dir = MUSICGEN_OUTPUT_DIR
        self.available = self._check_available()
        self._musicgen_model = None
        self._tts_engine = None
        
        if self.available:
            logger.info(f"MusicGen engine ready (model: {MUSICGEN_MODEL_ID})")
        else:
            logger.info(
                "MusicGen not available "
                "(expected on Modal GPU containers)"
            )
    
    def _check_available(self) -> bool:
        return (
            os.path.isdir(self.workspace) and
            len(os.listdir(self.workspace)) > 0
        )
    
    def _load_musicgen(self):
        """Lazy-load MusicGen Medium model."""
        if self._musicgen_model is not None:
            return
        
        import torch
        from audiocraft.models import MusicGen
        
        logger.info(f"[MusicGen] Loading {MUSICGEN_MODEL_ID}...")
        self._musicgen_model = MusicGen.get_pretrained(MUSICGEN_MODEL_ID)
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self._musicgen_model = self._musicgen_model.to(device)
        
        logger.info(f"[MusicGen] Model loaded on {device}")
    
    def _load_tts(self):
        """Lazy-load XTTS-v2 TTS engine."""
        if self._tts_engine is not None:
            return
        
        from TTS.api import TTS
        
        logger.info("[XTTS] Loading XTTS-v2...")
        self._tts_engine = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        logger.info("[XTTS] XTTS-v2 loaded")
    
    def generate_full_song(
        self,
        lyrics: str,
        genre: str,
        emotion: str,
        duration_seconds: int = 200,
        language: str = "english",
    ) -> dict:
        """
        Generate a complete song:
        1. MusicGen instrumental
        2. XTTS-v2 vocal layer
        3. FFmpeg mix
        
        Returns dict compatible with MusicRouter interface.
        """
        start_time = time.time()
        
        if not self.available:
            return {
                "success": False,
                "error": "MusicGen model not loaded"
            }
        
        try:
            os.makedirs(self.output_dir, exist_ok=True)
            job_id = int(time.time())
            
            # Step 1: Generate instrumental
            logger.info(f"[MusicGen] Generating instrumental ({duration_seconds}s)...")
            instrumental_path = self._generate_instrumental(
                emotion=emotion,
                genre=genre,
                duration_seconds=duration_seconds,
                job_id=job_id
            )
            
            # Step 2: Generate vocals if we have lyrics
            vocal_path = None
            if lyrics and lyrics.strip():
                lang_code = self._resolve_language(language)
                logger.info(
                    f"[XTTS] Generating vocals "
                    f"(lang={lang_code}, "
                    f"chars={len(lyrics)})..."
                )
                try:
                    vocal_path = self._generate_vocals(
                        lyrics=lyrics,
                        language_code=lang_code,
                        job_id=job_id
                    )
                except Exception as e:
                    logger.warning(f"[XTTS] Vocal generation failed: {e}")
                    # Proceed with instrumental only
            
            # Step 3: Mix if we have vocals
            if vocal_path and os.path.exists(vocal_path):
                final_path = self._mix_audio(
                    instrumental_path=instrumental_path,
                    vocals_path=vocal_path,
                    output_path=os.path.join(
                        self.output_dir, f"musicgen_final_{job_id}.wav"
                    ),
                    duration_seconds=duration_seconds
                )
            else:
                final_path = instrumental_path
            
            gen_time = time.time() - start_time
            duration_actual = self._get_duration(final_path)
            
            logger.info(
                f"[MusicGen] Done — "
                f"{duration_actual:.1f}s, "
                f"gen_time={gen_time:.1f}s"
            )
            
            return {
                "success": True,
                "song_file_url": final_path,
                "duration_seconds": duration_actual,
                "bpm": None,
                "model": "musicgen",
                "language": language,
                "generation_time_seconds": gen_time,
            }
            
        except Exception as e:
            logger.exception(f"[MusicGen] Generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": "musicgen"
            }
    
    def _generate_instrumental(
        self,
        emotion: str,
        genre: str,
        duration_seconds: int,
        job_id: int
    ) -> str:
        """Generate instrumental using MusicGen (chunked if needed)."""
        import torch
        import torchaudio
        
        self._load_musicgen()
        
        prompt = self._build_musicgen_prompt(emotion, genre)
        
        if duration_seconds <= MUSICGEN_MAX_CHUNK_SECONDS:
            return self._generate_musicgen_chunk(
                prompt=prompt,
                duration=duration_seconds,
                output_path=os.path.join(
                    self.output_dir, f"musicgen_instr_{job_id}.wav"
                )
            )
        else:
            return self._generate_musicgen_chunked(
                prompt=prompt,
                total_duration=duration_seconds,
                job_id=job_id
            )
    
    def _generate_musicgen_chunk(
        self,
        prompt: str,
        duration: float,
        output_path: str
    ) -> str:
        """Single MusicGen generation pass (≤30s)."""
        import torch
        import torchaudio
        
        self._musicgen_model.set_generation_params(
            duration=min(duration, MUSICGEN_MAX_CHUNK_SECONDS)
        )
        
        with torch.no_grad():
            wav = self._musicgen_model.generate([prompt])
        
        # wav shape: [batch, channels, samples]
        audio = wav[0].float().cpu()
        torchaudio.save(
            output_path, audio,
            self._musicgen_model.sample_rate
        )
        
        return output_path
    
    def _generate_musicgen_chunked(
        self,
        prompt: str,
        total_duration: int,
        job_id: int
    ) -> str:
        """Generate multiple 30s chunks and crossfade stitch."""
        chunk_dir = tempfile.mkdtemp(prefix=f"mg_chunks_{job_id}_")
        chunk_duration = MUSICGEN_MAX_CHUNK_SECONDS
        
        num_chunks = (total_duration // chunk_duration) + (
            1 if total_duration % chunk_duration > 0 else 0
        )
        
        chunk_paths = []
        
        for i in range(num_chunks):
            remaining = total_duration - (i * chunk_duration)
            this_chunk = min(chunk_duration, remaining)
            
            if this_chunk < 3:
                break
            
            chunk_path = os.path.join(chunk_dir, f"chunk_{i:03d}.wav")
            self._generate_musicgen_chunk(
                prompt=prompt,
                duration=float(this_chunk),
                output_path=chunk_path
            )
            chunk_paths.append(chunk_path)
            logger.info(f"[MusicGen] Chunk {i+1}/{num_chunks} ({this_chunk}s)")
        
        output_path = os.path.join(
            self.output_dir, f"musicgen_instr_{job_id}.wav"
        )
        self._crossfade_stitch(chunk_paths, output_path)
        return output_path
    
    def _crossfade_stitch(self, chunk_paths: list, output_path: str):
        """Stitch chunks with crossfade using FFmpeg."""
        if len(chunk_paths) == 1:
            import shutil
            shutil.copy(chunk_paths[0], output_path)
            return
        
        inputs = []
        for p in chunk_paths:
            inputs += ["-i", p]
        
        filter_parts = []
        prev_label = "[0]"
        for i in range(1, len(chunk_paths)):
            out_label = f"[cf{i}]"
            filter_parts.append(
                f"{prev_label}[{i}]acrossfade="
                f"d={CROSSFADE_SECONDS:.1f}{out_label}"
            )
            prev_label = out_label
        
        cmd = (
            ["ffmpeg", "-y"] +
            inputs +
            ["-filter_complex", ";".join(filter_parts),
             "-map", prev_label, output_path]
        )
        
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300
        )
        
        if result.returncode != 0:
            raise RuntimeError(
                f"[MusicGen] FFmpeg stitch failed: {result.stderr[-300:]}"
            )
    
    def _generate_vocals(
        self,
        lyrics: str,
        language_code: str,
        job_id: int
    ) -> str:
        """Generate vocal track from lyrics using XTTS-v2."""
        self._load_tts()
        
        output_path = os.path.join(
            self.output_dir, f"musicgen_vocals_{job_id}.wav"
        )
        
        # Chunk lyrics to stay within XTTS token limits (~400 chars/chunk)
        lyrics_chunks = self._chunk_lyrics(lyrics, max_chars=400)
        
        if len(lyrics_chunks) == 1:
            self._tts_engine.tts_to_file(
                text=lyrics_chunks[0],
                language=language_code,
                file_path=output_path
            )
            return output_path
        
        # Generate per-chunk and concatenate
        chunk_dir = tempfile.mkdtemp(prefix=f"xtts_chunks_{job_id}_")
        chunk_paths = []
        
        for i, chunk in enumerate(lyrics_chunks):
            chunk_path = os.path.join(chunk_dir, f"vocal_{i:03d}.wav")
            self._tts_engine.tts_to_file(
                text=chunk,
                language=language_code,
                file_path=chunk_path
            )
            chunk_paths.append(chunk_path)
        
        # Simple concatenation for vocals (no crossfade needed between lines)
        concat_list = os.path.join(chunk_dir, "concat.txt")
        with open(concat_list, "w") as f:
            for p in chunk_paths:
                f.write(f"file '{p}'\n")
        
        result = subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
             "-i", concat_list, output_path],
            capture_output=True, text=True, timeout=180
        )
        
        if result.returncode != 0:
            raise RuntimeError(
                f"[XTTS] Vocal concat failed: {result.stderr[-200:]}"
            )
        
        return output_path
    
    def _mix_audio(
        self,
        instrumental_path: str,
        vocals_path: str,
        output_path: str,
        duration_seconds: int
    ) -> str:
        """
        Mix instrumental + vocals.
        Instrumental: 70% volume. Vocals: 100% volume.
        Trim to target duration.
        """
        cmd = [
            "ffmpeg", "-y",
            "-i", instrumental_path,
            "-i", vocals_path,
            "-filter_complex",
            (
                f"[0:a]volume=0.7[instr];"
                f"[1:a]volume=1.0[vox];"
                f"[instr][vox]amix=inputs=2:duration=longest[mix];"
                f"[mix]atrim=0:{duration_seconds}[out]"
            ),
            "-map", "[out]",
            output_path
        ]
        
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=180
        )
        
        if result.returncode != 0:
            logger.warning(
                f"[MusicGen] Mix failed, using instrumental only: "
                f"{result.stderr[-200:]}"
            )
            return instrumental_path
        
        return output_path
    
    def _build_musicgen_prompt(self, emotion: str, genre: str) -> str:
        """Build MusicGen text conditioning prompt."""
        emotion_style = EMOTION_PROMPT_MAP.get(
            emotion.lower(),
            "cinematic, emotional, orchestral"
        )
        return f"{genre}, {emotion_style}, professional quality"
    
    def _resolve_language(self, language: str) -> str:
        """Resolve language name/code to XTTS language code."""
        lang_lower = language.lower().strip()
        
        # Already a code
        if lang_lower in XTTS_SUPPORTED_LANGUAGES:
            return lang_lower
        
        # Name → code
        code = LANGUAGE_MAP.get(lang_lower, "en")
        
        if code not in XTTS_SUPPORTED_LANGUAGES:
            logger.warning(
                f"[XTTS] Language '{language}' not supported, "
                f"falling back to English"
            )
            return "en"
        
        return code
    
    def _chunk_lyrics(self, lyrics: str, max_chars: int = 400) -> list:
        """Split lyrics into chunks safe for XTTS token limits."""
        if len(lyrics) <= max_chars:
            return [lyrics]
        
        lines = lyrics.split("\n")
        chunks = []
        current_chunk = ""
        
        for line in lines:
            if len(current_chunk) + len(line) + 1 > max_chars:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = line
            else:
                current_chunk += ("\n" if current_chunk else "") + line
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks or [lyrics[:max_chars]]
    
    def _get_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds via ffprobe."""
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
