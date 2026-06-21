# ============================================================
# FILE: music_engines/ace_step_engine.py
# PURPOSE: ACE-Step self-hosted music generation engine
#
# ACE-Step: Full song + vocals + lyrics generation.
# Best overall model for Ghaafeedi Music.
# License: Apache 2.0 — full commercial use.
# GPU: A100 40GB or 2×A10G recommended.
# Repo: https://github.com/ace-step/ACE-Step
# ============================================================

import logging
import os
import time
import subprocess
import tempfile
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

logger = logging.getLogger("ghaafeedi.music.ace_step")

# Workspace path (Modal container or local GPU host)
ACE_STEP_WORKSPACE = os.environ.get("ACE_STEP_PATH", "/workspace/ace-step")
ACE_STEP_OUTPUT_DIR = os.environ.get("ACE_STEP_OUTPUT_DIR", "/tmp/ace-step-output")


@dataclass
class SongGenerationRequest:
    """Input for ACE-Step song generation."""
    lyrics: str
    genre: str
    emotion: str
    duration_seconds: int = 200
    language: str = "english"
    # Optional stem separation (returns vocals + instrumental separately)
    separate_stems: bool = False
    # Batch variations — ACE-Step can generate N variations cheaply
    num_variations: int = 1
    # BPM hint (0 = auto-detect)
    target_bpm: float = 0.0


@dataclass
class SongGenerationResult:
    """Output from ACE-Step generation."""
    success: bool
    audio_path: Optional[str] = None
    # Stem separation outputs (if requested)
    vocals_path: Optional[str] = None
    instrumental_path: Optional[str] = None
    # Variations (if num_variations > 1)
    variation_paths: list = field(default_factory=list)
    # Metadata
    duration_seconds: float = 0.0
    bpm_detected: Optional[float] = None
    model_version: str = "ace-step-v1"
    generation_time_seconds: float = 0.0
    error: Optional[str] = None


class ACEStepEngine:
    """
    ACE-Step music generation engine.
    
    Handles full song generation with vocals and lyrics.
    This is Ghaafeedi's primary self-hosted model.
    
    At Phase Immediate: returns not_available if /workspace/ace-step
    is not populated (local dev). On Modal GPU containers the workspace
    path is mounted and populated at container startup.
    """
    
    def __init__(self, workspace: str = ACE_STEP_WORKSPACE):
        self.workspace = workspace
        self.output_dir = ACE_STEP_OUTPUT_DIR
        self.available = self._check_available()
        
        if self.available:
            logger.info(f"ACE-Step engine ready at {workspace}")
        else:
            logger.info(
                f"ACE-Step not available at {workspace} "
                f"(expected on Modal GPU containers)"
            )
    
    def _check_available(self) -> bool:
        """Check if ACE-Step model weights are loaded."""
        return (
            os.path.isdir(self.workspace) and
            len(os.listdir(self.workspace)) > 0
        )
    
    def generate_song(self, request: SongGenerationRequest) -> SongGenerationResult:
        """
        Generate a full song with vocals using ACE-Step.
        
        On GPU containers: runs ACE-Step inference pipeline.
        When unavailable: returns failure so router falls back.
        """
        start_time = time.time()
        
        if not self.available:
            return SongGenerationResult(
                success=False,
                error="ACE-Step model not loaded — not available in this environment"
            )
        
        try:
            os.makedirs(self.output_dir, exist_ok=True)
            
            output_filename = f"ace_step_{int(time.time())}.wav"
            output_path = os.path.join(self.output_dir, output_filename)
            
            # Build ACE-Step generation command
            # ACE-Step uses a Python CLI entry point
            cmd = self._build_command(request, output_path)
            
            logger.info(f"[ACE-Step] Running generation: {' '.join(cmd[:4])}...")
            
            proc = subprocess.run(
                cmd,
                cwd=self.workspace,
                capture_output=True,
                text=True,
                timeout=600  # 10 min max
            )
            
            if proc.returncode != 0:
                logger.error(f"[ACE-Step] Generation failed: {proc.stderr}")
                return SongGenerationResult(
                    success=False,
                    error=f"ACE-Step subprocess error: {proc.stderr[-500:]}"
                )
            
            if not os.path.exists(output_path):
                return SongGenerationResult(
                    success=False,
                    error="ACE-Step did not produce output file"
                )
            
            # Detect BPM from output
            bpm = self._detect_bpm(output_path)
            
            # Get duration
            duration = self._get_duration(output_path)
            
            result = SongGenerationResult(
                success=True,
                audio_path=output_path,
                duration_seconds=duration,
                bpm_detected=bpm,
                generation_time_seconds=time.time() - start_time
            )
            
            # Optional stem separation
            if request.separate_stems:
                stems = self._separate_stems(output_path)
                result.vocals_path = stems.get("vocals")
                result.instrumental_path = stems.get("instrumental")
            
            logger.info(
                f"[ACE-Step] Done — {duration:.1f}s, "
                f"BPM={bpm}, "
                f"time={result.generation_time_seconds:.1f}s"
            )
            
            return result
            
        except subprocess.TimeoutExpired:
            return SongGenerationResult(
                success=False,
                error="ACE-Step generation timed out (>10 min)"
            )
        except Exception as e:
            logger.exception(f"[ACE-Step] Unexpected error: {e}")
            return SongGenerationResult(
                success=False,
                error=str(e),
                generation_time_seconds=time.time() - start_time
            )
    
    def _build_command(
        self,
        request: SongGenerationRequest,
        output_path: str
    ) -> list:
        """
        Build the ACE-Step CLI command.
        ACE-Step inference script: python inference.py (or ace_step/cli.py)
        """
        # Escape lyrics for safe shell passing
        lyrics_safe = request.lyrics.replace('"', '\\"')
        
        # Style prompt: combine genre + emotion for ACE-Step conditioning
        style_prompt = (
            f"{request.genre}, {request.emotion}, "
            f"emotional, cinematic, high production quality"
        )
        
        cmd = [
            "python", "inference.py",
            "--lyrics", request.lyrics,
            "--style_prompt", style_prompt,
            "--output_path", output_path,
            "--duration", str(request.duration_seconds),
            "--language", request.language,
        ]
        
        if request.target_bpm > 0:
            cmd += ["--target_bpm", str(request.target_bpm)]
        
        if request.num_variations > 1:
            cmd += ["--num_variations", str(request.num_variations)]
        
        return cmd
    
    def _detect_bpm(self, audio_path: str) -> Optional[float]:
        """Detect BPM using librosa."""
        try:
            import librosa
            y, sr = librosa.load(audio_path, sr=22050, duration=60.0)
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            return round(float(tempo), 1)
        except Exception as e:
            logger.warning(f"[ACE-Step] BPM detection failed: {e}")
            return None
    
    def _get_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds."""
        try:
            import librosa
            return float(librosa.get_duration(path=audio_path))
        except Exception:
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
    
    def _separate_stems(self, audio_path: str) -> dict:
        """
        Separate vocals and instrumental using demucs or spleeter.
        Returns dict with 'vocals' and 'instrumental' paths.
        """
        try:
            output_dir = Path(audio_path).parent / "stems"
            output_dir.mkdir(exist_ok=True)
            
            # Try demucs (bundled with ACE-Step workspace)
            result = subprocess.run(
                ["python", "-m", "demucs", "--two-stems=vocals",
                 "-o", str(output_dir), audio_path],
                cwd=self.workspace,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                stem_name = Path(audio_path).stem
                htdemucs_dir = output_dir / "htdemucs" / stem_name
                
                return {
                    "vocals": str(htdemucs_dir / "vocals.wav"),
                    "instrumental": str(htdemucs_dir / "no_vocals.wav"),
                }
        except Exception as e:
            logger.warning(f"[ACE-Step] Stem separation failed: {e}")
        
        return {}
