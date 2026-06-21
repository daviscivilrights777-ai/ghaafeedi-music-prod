# ============================================================
# FILE: music_engines/music_router.py
# PURPOSE: Intelligent routing between music generation models
#
# This is the STRATEGIC ADVANTAGE for Ghaafeedi Music.
# Instead of being locked into Suno or any single model,
# the router sends each customer story to the best model
# for that specific emotional type and content requirement.
# ============================================================

import logging
from enum import Enum
from typing import Optional
from dataclasses import dataclass

from config import EmotionalTone, GhaafeediSettings

logger = logging.getLogger("ghaafeedi.music.router")


class MusicModel(str, Enum):
    SUNO = "suno"
    ACE_STEP = "ace-step"
    STABLE_AUDIO = "stable-audio"
    MUSICGEN = "musicgen"
    YUE = "yue"


@dataclass
class RoutingDecision:
    """Result of the routing decision."""
    primary_model: MusicModel
    fallback_model: MusicModel
    reasoning: str
    allow_explicit: bool
    max_duration_seconds: int


class MusicRouter:
    """
    Intelligent music model router.
    
    Routes each generation request to the best available model
    based on emotional content, language, quality requirements,
    and content policy needs.
    
    This means Ghaafeedi Music never depends on a single
    service and always has multiple fallback options.
    """
    
    def __init__(self, settings: GhaafeediSettings):
        self.settings = settings
        
        # Which models are available (set from environment)
        self.available_models = {
            MusicModel.SUNO: bool(
                getattr(settings, 'suno_api_key', None)
            ),
            MusicModel.ACE_STEP: self._check_model_available("ace-step"),
            MusicModel.STABLE_AUDIO: self._check_model_available(
                "stable-audio"
            ),
            MusicModel.MUSICGEN: self._check_model_available("musicgen"),
            MusicModel.YUE: self._check_model_available("yue"),
        }
        
        logger.info(
            f"Music Router initialized. Available models: "
            f"{[m.value for m, a in self.available_models.items() if a]}"
        )
    
    def route(self,
              emotion: EmotionalTone,
              language: str = "english",
              content_flags: list = None,
              quality_tier: str = "standard",
              needs_vocals: bool = True,
              duration_seconds: int = 200) -> RoutingDecision:
        """
        Decide which model to use for this generation.
        
        Args:
            emotion: Primary emotion of the customer story
            language: Language for vocals
            content_flags: List of content types that may be restricted
                          e.g. ["explicit", "religious", "political"]
            quality_tier: "standard", "premium", "ultra"
            needs_vocals: Whether the song needs sung vocals
            duration_seconds: Target song length
            
        Returns:
            RoutingDecision with primary and fallback model
        """
        content_flags = content_flags or []
        
        # Content policy check
        # If content might be restricted on Suno, route to self-hosted
        content_restricted = any(flag in [
            "explicit", "religious_specific", "political",
            "trauma_detailed", "adult_themes", "grief_raw"
        ] for flag in content_flags)
        
        # Language check
        # Suno handles English best
        # Self-hosted models handle more languages
        non_english = language.lower() not in [
            "english", "en", "english-us", "english-uk"
        ]
        
        # Duration check
        # Suno handles standard song lengths fine
        # Very long pieces work better on self-hosted
        very_long = duration_seconds > 300
        
        # Quality tier mapping
        ultra_quality = quality_tier == "ultra"
        
        # ---- ROUTING LOGIC ----
        
        # Rule 1: Content restrictions → Self-hosted always
        if content_restricted:
            logger.info(
                f"Content flags detected: {content_flags} — "
                f"routing to self-hosted"
            )
            return RoutingDecision(
                primary_model=MusicModel.ACE_STEP,
                fallback_model=MusicModel.YUE,
                reasoning=(
                    f"Content flags {content_flags} require "
                    f"self-hosted model without content policy"
                ),
                allow_explicit=True,
                max_duration_seconds=duration_seconds
            )
        
        # Rule 2: Non-English → Route based on language support
        if non_english:
            logger.info(
                f"Non-English content: {language} — "
                f"routing to multilingual model"
            )
            return RoutingDecision(
                primary_model=MusicModel.ACE_STEP,
                fallback_model=MusicModel.MUSICGEN,
                reasoning=(
                    f"Language '{language}' best handled by "
                    f"self-hosted multilingual models"
                ),
                allow_explicit=False,
                max_duration_seconds=duration_seconds
            )
        
        # Rule 3: Suno is available and content is standard
        if (self.available_models.get(MusicModel.SUNO) and
                not content_restricted and
                not non_english and
                not very_long):
            
            # For standard emotional content in English,
            # Suno still produces the most polished results
            logger.info("Standard content — routing to Suno primary")
            return RoutingDecision(
                primary_model=MusicModel.SUNO,
                fallback_model=MusicModel.ACE_STEP,
                reasoning=(
                    "Standard English emotional content — "
                    "Suno primary for polish, ACE-Step fallback"
                ),
                allow_explicit=False,
                max_duration_seconds=min(duration_seconds, 240)
            )
        
        # Rule 4: Ultra quality or very long → Best self-hosted
        if ultra_quality or very_long:
            return RoutingDecision(
                primary_model=MusicModel.STABLE_AUDIO
                if not needs_vocals else MusicModel.ACE_STEP,
                fallback_model=MusicModel.YUE,
                reasoning=(
                    f"Ultra quality/long duration — "
                    f"Stable Audio for instrumental, "
                    f"ACE-Step for vocals"
                ),
                allow_explicit=True,
                max_duration_seconds=duration_seconds
            )
        
        # Default: ACE-Step as primary open source option
        return RoutingDecision(
            primary_model=MusicModel.ACE_STEP,
            fallback_model=MusicModel.MUSICGEN,
            reasoning="Default routing to ACE-Step",
            allow_explicit=False,
            max_duration_seconds=duration_seconds
        )
    
    def _check_model_available(self, model_name: str) -> bool:
        """Check if a self-hosted model is installed and available."""
        import os
        
        model_paths = {
            "ace-step": "/workspace/ace-step",
            "stable-audio": "/workspace/stable-audio",
            "musicgen": "/workspace/musicgen",
            "yue": "/workspace/yue-model",
        }
        
        path = model_paths.get(model_name, "")
        return os.path.isdir(path) and len(os.listdir(path)) > 0
    
    def generate_with_routing(self,
                               lyrics: str,
                               genre: str,
                               emotion: EmotionalTone,
                               language: str = "english",
                               content_flags: list = None,
                               quality_tier: str = "standard",
                               duration_seconds: int = 200) -> dict:
        """
        Main entry point for the Ghaafeedi pipeline.
        Routes to best model and handles fallback automatically.
        """
        decision = self.route(
            emotion=emotion,
            language=language,
            content_flags=content_flags,
            quality_tier=quality_tier,
            duration_seconds=duration_seconds
        )
        
        logger.info(
            f"Routing decision: {decision.primary_model.value} "
            f"(fallback: {decision.fallback_model.value})\n"
            f"Reason: {decision.reasoning}"
        )
        
        # Try primary model
        result = self._call_model(
            model=decision.primary_model,
            lyrics=lyrics,
            genre=genre,
            emotion=emotion.value,
            language=language,
            duration_seconds=duration_seconds
        )
        
        # If primary fails, try fallback
        if not result.get("success"):
            logger.warning(
                f"Primary model {decision.primary_model.value} failed. "
                f"Trying fallback: {decision.fallback_model.value}"
            )
            result = self._call_model(
                model=decision.fallback_model,
                lyrics=lyrics,
                genre=genre,
                emotion=emotion.value,
                language=language,
                duration_seconds=duration_seconds
            )
        
        result["routing_decision"] = {
            "primary_model": decision.primary_model.value,
            "fallback_model": decision.fallback_model.value,
            "reasoning": decision.reasoning
        }
        
        return result
    
    def _call_model(self,
                    model: MusicModel,
                    lyrics: str,
                    genre: str,
                    emotion: str,
                    language: str,
                    duration_seconds: int) -> dict:
        """Call the specified model for generation."""
        
        try:
            if model == MusicModel.SUNO:
                return self._call_suno(
                    lyrics, genre, emotion, duration_seconds
                )
            elif model == MusicModel.ACE_STEP:
                from music_engines.ace_step_engine import (
                    ACEStepEngine, SongGenerationRequest
                )
                engine = ACEStepEngine()
                request = SongGenerationRequest(
                    lyrics=lyrics,
                    genre=genre,
                    emotion=emotion,
                    duration_seconds=duration_seconds,
                    language=language
                )
                result = engine.generate_song(request)
                return {
                    "success": result.success,
                    "song_file_url": result.audio_path,
                    "duration_seconds": result.duration_seconds,
                    "bpm": result.bpm_detected,
                    "model": "ace-step",
                    "error": result.error
                }
            elif model == MusicModel.YUE:
                from music_engines.yue_engine import YuEEngine
                engine = YuEEngine()
                result = engine.generate_song(
                    lyrics=lyrics,
                    genre_tags=genre,
                    emotion=emotion,
                    duration_seconds=duration_seconds
                )
                return result
            elif model == MusicModel.MUSICGEN:
                from music_engines.musicgen_engine import MusicGenEngine
                engine = MusicGenEngine()
                result = engine.generate_full_song(
                    lyrics=lyrics,
                    genre=genre,
                    emotion=emotion,
                    duration_seconds=duration_seconds,
                    language=language
                )
                return result
            elif model == MusicModel.STABLE_AUDIO:
                from music_engines.stable_audio_engine import (
                    StableAudioEngine
                )
                engine = StableAudioEngine()
                result = engine.generate_instrumental(
                    prompt=f"{genre}, {emotion}",
                    duration_seconds=float(duration_seconds),
                    emotion=emotion
                )
                return result
            else:
                return {
                    "success": False,
                    "error": f"Unknown model: {model}"
                }
                
        except Exception as e:
            logger.error(f"Model {model.value} call failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _call_suno(self,
                   lyrics: str,
                   genre: str,
                   emotion: str,
                   duration_seconds: int) -> dict:
        """Call existing Suno.cc API (your current integration)."""
        import httpx
        import os
        
        suno_key = os.environ.get("SUNO_API_KEY", "")
        
        if not suno_key:
            return {"success": False, "error": "No Suno API key"}
        
        try:
            response = httpx.post(
                "https://api.suno.ai/generate",
                headers={"Authorization": f"Bearer {suno_key}"},
                json={
                    "lyrics": lyrics,
                    "style": genre,
                    "duration": duration_seconds
                },
                timeout=300
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "song_file_url": data.get("audio_url"),
                    "duration_seconds": data.get("duration"),
                    "bpm": data.get("bpm"),
                    "model": "suno"
                }
            else:
                return {
                    "success": False,
                    "error": f"Suno API error: {response.status_code}"
                }
        except Exception as e:
            return {"success": False, "error": str(e)}
