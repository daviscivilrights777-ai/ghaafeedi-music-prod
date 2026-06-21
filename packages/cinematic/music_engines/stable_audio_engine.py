# ============================================================
# FILE: music_engines/stable_audio_engine.py
# PURPOSE: Stable Audio Open — best instrumental generation
#
# Stability AI Stable Audio Open.
# Up to 47s native per generation; chunked for longer pieces.
# Best for: orchestral backgrounds, instrumental mood pieces,
#           ultra-quality cinematic scoring without vocals.
# License: CreativeML Open Rail-M — commercial use allowed.
# GPU: A10G (24GB VRAM) sufficient.
# Repo: https://github.com/Stability-AI/stable-audio-tools
# ============================================================

import logging
import os
import time
import tempfile
from typing import Optional

logger = logging.getLogger("ghaafeedi.music.stable_audio")

STABLE_AUDIO_WORKSPACE = os.environ.get(
    "STABLE_AUDIO_PATH", "/workspace/stable-audio"
)
STABLE_AUDIO_MODEL_ID = os.environ.get(
    "STABLE_AUDIO_MODEL_ID", "stabilityai/stable-audio-open-1.0"
)
STABLE_AUDIO_OUTPUT_DIR = os.environ.get(
    "STABLE_AUDIO_OUTPUT_DIR", "/tmp/stable-audio-output"
)

# Stable Audio Open native max is ~47 seconds per inference pass
NATIVE_MAX_SECONDS = 47.0
# Crossfade overlap for seamless chunk stitching (seconds)
CROSSFADE_SECONDS = 2.0


# Emotion → style prompt enrichment map
EMOTION_STYLE_MAP = {
    "grief":      "melancholic, minor key, slow tempo, strings, piano",
    "love":       "warm, romantic, gentle guitar, strings, soft piano",
    "loneliness": "sparse, atmospheric, minimal, ambient, reverb-heavy",
    "nostalgia":  "warm analog, acoustic guitar, vintage, lo-fi warmth",
    "joy":        "uplifting, major key, bright, energetic, playful",
    "gratitude":  "gentle, warm, acoustic, uplifting strings",
    "peace":      "ambient, calm, slow, minimal, meditation",
    "comeback":   "building, triumphant, epic, cinematic swell",
    "hope":       "uplifting, ascending, bright, orchestral",
    "courage":    "bold, driving, orchestral, march-like",
    "triumph":    "epic, full orchestra, major key, powerful brass",
    "heartbreak": "sad, piano, minor key, sparse, emotional",
    "anger":      "intense, distorted, driving rhythm, dark",
}


class StableAudioEngine:
    """
    Stable Audio Open engine for instrumental generation.
    
    Used when:
    - quality_tier = "ultra" + needs_vocals = False
    - Pure instrumental cinematic scoring needed
    - Duration > 300s (chunked generation)
    
    Chunks longer pieces with crossfade stitching via FFmpeg.
    """
    
    def __init__(self, workspace: str = STABLE_AUDIO_WORKSPACE):
        self.workspace = workspace
        self.output_dir = STABLE_AUDIO_OUTPUT_DIR
        self.available = self._check_available()
        self._pipeline = None  # Lazy-loaded
        
        if self.available:
            logger.info("Stable Audio Open engine ready")
        else:
            logger.info(
                "Stable Audio not available "
                "(expected on Modal GPU containers)"
            )
    
    def _check_available(self) -> bool:
        return (
            os.path.isdir(self.workspace) and
            len(os.listdir(self.workspace)) > 0
        )
    
    def _load_pipeline(self):
        """Lazy-load the Stable Audio pipeline to avoid OOM at import."""
        if self._pipeline is not None:
            return
        
        try:
            import torch
            from stable_audio_tools import get_pretrained_model
            from stable_audio_tools.inference.generation import generate_diffusion_cond
            
            model, model_config = get_pretrained_model(STABLE_AUDIO_MODEL_ID)
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            model = model.to(device)
            model.eval()
            
            self._pipeline = {
                "model": model,
                "model_config": model_config,
                "device": device,
                "generate_fn": generate_diffusion_cond,
            }
            
            logger.info(f"[StableAudio] Pipeline loaded on {device}")
            
        except Exception as e:
            logger.error(f"[StableAudio] Failed to load pipeline: {e}")
            raise
    
    def generate_instrumental(
        self,
        prompt: str,
        duration_seconds: float,
        emotion: str = "",
        sample_rate: int = 44100,
        steps: int = 100,
        cfg_scale: float = 7.0,
        seed: Optional[int] = None,
    ) -> dict:
        """
        Generate instrumental music for given duration.
        
        For duration > 47s: generates multiple chunks and crossfades.
        
        Returns dict compatible with MusicRouter._call_model() interface:
          { success, song_file_url, duration_seconds, model }
        """
        start_time = time.time()
        
        if not self.available:
            return {
                "success": False,
                "error": "Stable Audio model not loaded"
            }
        
        try:
            os.makedirs(self.output_dir, exist_ok=True)
            
            # Enrich prompt with emotion-specific style
            enriched_prompt = self._build_prompt(prompt, emotion)
            
            output_filename = f"stable_audio_{int(time.time())}.wav"
            output_path = os.path.join(self.output_dir, output_filename)
            
            if duration_seconds <= NATIVE_MAX_SECONDS:
                # Single pass
                audio_path = self._generate_chunk(
                    prompt=enriched_prompt,
                    duration=duration_seconds,
                    sample_rate=sample_rate,
                    steps=steps,
                    cfg_scale=cfg_scale,
                    seed=seed,
                    output_path=output_path
                )
            else:
                # Chunked generation + crossfade stitch
                audio_path = self._generate_chunked(
                    prompt=enriched_prompt,
                    total_duration=duration_seconds,
                    sample_rate=sample_rate,
                    steps=steps,
                    cfg_scale=cfg_scale,
                    output_path=output_path
                )
            
            gen_time = time.time() - start_time
            logger.info(
                f"[StableAudio] Done — "
                f"{duration_seconds:.1f}s requested, "
                f"gen_time={gen_time:.1f}s"
            )
            
            return {
                "success": True,
                "song_file_url": audio_path,
                "duration_seconds": duration_seconds,
                "model": "stable-audio",
                "bpm": None,  # Instrumental — BPM varies
                "generation_time_seconds": gen_time,
            }
            
        except Exception as e:
            logger.exception(f"[StableAudio] Generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": "stable-audio"
            }
    
    def _build_prompt(self, base_prompt: str, emotion: str) -> str:
        """Build enriched generation prompt from base + emotion context."""
        emotion_style = EMOTION_STYLE_MAP.get(
            emotion.lower(), "cinematic, emotional, orchestral"
        )
        return (
            f"{base_prompt}, {emotion_style}, "
            f"high quality, 44.1khz, professional mastering, "
            f"no vocals, instrumental only"
        )
    
    def _generate_chunk(
        self,
        prompt: str,
        duration: float,
        sample_rate: int,
        steps: int,
        cfg_scale: float,
        seed: Optional[int],
        output_path: str
    ) -> str:
        """Generate a single audio chunk (≤47s)."""
        import torch
        import torchaudio
        
        self._load_pipeline()
        p = self._pipeline
        
        conditioning = [{
            "prompt": prompt,
            "seconds_start": 0,
            "seconds_total": duration
        }]
        
        with torch.no_grad():
            output = p["generate_fn"](
                model=p["model"],
                conditioning=conditioning,
                model_config=p["model_config"],
                batch_size=1,
                sample_size=int(sample_rate * duration),
                sample_rate=sample_rate,
                seed=seed if seed is not None else -1,
                device=p["device"],
                init_noise_level=1.0,
                return_latents=False,
                sampler_type="dpmpp-3m-sde",
                sigma_min=0.03,
                sigma_max=500,
                cfg_scale=cfg_scale,
                steps=steps,
            )
        
        # output shape: [batch, channels, samples]
        audio = output[0].float().cpu()
        torchaudio.save(output_path, audio, sample_rate)
        
        return output_path
    
    def _generate_chunked(
        self,
        prompt: str,
        total_duration: float,
        sample_rate: int,
        steps: int,
        cfg_scale: float,
        output_path: str
    ) -> str:
        """
        Generate multiple chunks and stitch with crossfade.
        Uses FFmpeg for lossless WAV concatenation with crossfade.
        """
        import subprocess
        
        chunk_duration = NATIVE_MAX_SECONDS - CROSSFADE_SECONDS
        num_chunks = int(total_duration / chunk_duration) + 1
        
        chunk_paths = []
        chunk_dir = tempfile.mkdtemp(prefix="sa_chunks_")
        
        logger.info(
            f"[StableAudio] Chunked mode: "
            f"{num_chunks} chunks × {chunk_duration:.0f}s"
        )
        
        for i in range(num_chunks):
            remaining = total_duration - (i * chunk_duration)
            this_chunk = min(NATIVE_MAX_SECONDS, remaining + CROSSFADE_SECONDS)
            
            if this_chunk < 5.0:
                break  # Skip tiny tail chunk
            
            chunk_path = os.path.join(chunk_dir, f"chunk_{i:03d}.wav")
            
            self._generate_chunk(
                prompt=prompt,
                duration=this_chunk,
                sample_rate=sample_rate,
                steps=steps,
                cfg_scale=cfg_scale,
                seed=None,
                output_path=chunk_path
            )
            chunk_paths.append(chunk_path)
            
            logger.info(
                f"[StableAudio] Chunk {i+1}/{num_chunks} done "
                f"({this_chunk:.1f}s)"
            )
        
        if len(chunk_paths) == 1:
            import shutil
            shutil.copy(chunk_paths[0], output_path)
            return output_path
        
        # Stitch with FFmpeg crossfade
        self._stitch_chunks(chunk_paths, output_path, sample_rate)
        
        return output_path
    
    def _stitch_chunks(
        self,
        chunk_paths: list,
        output_path: str,
        sample_rate: int
    ):
        """Crossfade-stitch chunks using FFmpeg acrossfade filter."""
        import subprocess
        
        if len(chunk_paths) == 0:
            raise ValueError("No chunks to stitch")
        
        if len(chunk_paths) == 1:
            import shutil
            shutil.copy(chunk_paths[0], output_path)
            return
        
        # Build ffmpeg filter chain for N-way acrossfade
        # ffmpeg -i chunk0 -i chunk1 ... -filter_complex "[0][1]acrossfade=d=2[cf1];[cf1][2]acrossfade=d=2..." out.wav
        inputs = []
        for p in chunk_paths:
            inputs += ["-i", p]
        
        filter_parts = []
        prev_label = "[0]"
        for i in range(1, len(chunk_paths)):
            out_label = f"[cf{i}]"
            filter_parts.append(
                f"{prev_label}[{i}]acrossfade=d={CROSSFADE_SECONDS:.0f}{out_label}"
            )
            prev_label = out_label
        
        filter_str = ";".join(filter_parts)
        
        cmd = (
            ["ffmpeg", "-y"] +
            inputs +
            ["-filter_complex", filter_str,
             "-map", prev_label,
             output_path]
        )
        
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300
        )
        
        if result.returncode != 0:
            raise RuntimeError(
                f"FFmpeg stitch failed: {result.stderr[-300:]}"
            )
        
        logger.info(f"[StableAudio] Stitched {len(chunk_paths)} chunks → {output_path}")
