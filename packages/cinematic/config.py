# ============================================================
# FILE: config.py
# PURPOSE: All shared data models and settings for the cinematic module
# ============================================================

import os
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ============================================================
# EMOTIONAL TONE ENUM — 13 values (exact)
# ============================================================

class EmotionalTone(str, Enum):
    GRIEF = "grief"
    LOVE = "love"
    LONELINESS = "loneliness"
    NOSTALGIA = "nostalgia"
    JOY = "joy"
    GRATITUDE = "gratitude"
    PEACE = "peace"
    COMEBACK = "comeback"
    HOPE = "hope"
    COURAGE = "courage"
    TRIUMPH = "triumph"
    HEARTBREAK = "heartbreak"
    ANGER = "anger"


# ============================================================
# VIDEO STYLE ENUM — 5 values (exact)
# ============================================================

class VideoStyle(str, Enum):
    DESATURATED_COLD = "desaturated_cold"
    WARM_GOLDEN = "warm_golden"
    CINEMATIC_TEAL_ORANGE = "cinematic_teal_orange"
    ETHEREAL_LIGHT = "ethereal_light"
    NEON_NOIR = "neon_noir"


# ============================================================
# SHOT ENUMS
# ============================================================

class ShotType(str, Enum):
    EXTREME_WIDE_SHOT = "EXTREME_WIDE_SHOT"
    WIDE_SHOT = "WIDE_SHOT"
    MEDIUM_WIDE_SHOT = "MEDIUM_WIDE_SHOT"
    MEDIUM_SHOT = "MEDIUM_SHOT"
    MEDIUM_CLOSE_UP = "MEDIUM_CLOSE_UP"
    CLOSE_UP = "CLOSE_UP"
    EXTREME_CLOSE = "EXTREME_CLOSE_UP"
    OVER_THE_SHOULDER = "OVER_THE_SHOULDER"
    POINT_OF_VIEW = "POINT_OF_VIEW"
    INSERT_SHOT = "INSERT_SHOT"


class CameraMove(str, Enum):
    STATIC = "STATIC"
    SLOW_PUSH_IN = "SLOW_PUSH_IN"
    MEDIUM_PUSH_IN = "MEDIUM_PUSH_IN"
    SLOW_PULL_OUT = "SLOW_PULL_OUT"
    CRANE_DOWN = "CRANE_DOWN"
    CRANE_UP = "CRANE_UP"
    SLOW_PAN_RIGHT = "SLOW_PAN_RIGHT"
    SLOW_PAN_LEFT = "SLOW_PAN_LEFT"
    ORBIT_RIGHT = "ORBIT_RIGHT"
    ORBIT_LEFT = "ORBIT_LEFT"
    STEADICAM_FOLLOW = "STEADICAM_FOLLOW"
    DOLLY_ZOOM_IN = "DOLLY_ZOOM_IN"
    TILT_UP_REVEAL = "TILT_UP_REVEAL"
    TRUCK_RIGHT = "TRUCK_RIGHT"
    DRAMATIC_PUSH_IN = "DRAMATIC_PUSH_IN"
    HANDHELD_SUBTLE = "HANDHELD_SUBTLE"
    BIRDS_EYE_DESCENT = "BIRDS_EYE_DESCENT"
    FLOAT_DRIFT = "FLOAT_DRIFT"
    RISE_AND_REVEAL = "RISE_AND_REVEAL"
    TILT_DOWN = "TILT_DOWN"
    TILT_UP = "TILT_UP"
    RACK_FOCUS = "RACK_FOCUS"
    SLOW_ORBIT = "SLOW_ORBIT"
    SLOW_PAN = "SLOW_PAN"


class TransitionType(str, Enum):
    CUT = "CUT"
    DISSOLVE = "DISSOLVE"
    CROSS_DISSOLVE = "CROSS_DISSOLVE"
    FADE_TO_BLACK = "FADE_TO_BLACK"
    FADE_FROM_BLACK = "FADE_FROM_BLACK"
    MATCH_CUT = "MATCH_CUT"
    J_CUT = "J_CUT"
    L_CUT = "L_CUT"
    SMASH_CUT = "SMASH_CUT"
    WHIP_PAN = "WHIP_PAN"


# ============================================================
# CORE DATA MODELS
# ============================================================

class Shot(BaseModel):
    """A single shot in the film."""
    shot_id: str
    scene_number: int
    shot_number: int
    start_time_seconds: float
    duration_seconds: float
    shot_type: ShotType
    camera_movement: CameraMove
    camera_angle: str = "EYE_LEVEL"
    lens_mm: int = 50
    composition: str = "RULE_OF_THIRDS"
    focus_type: str = "DEEP_FOCUS"
    visual_prompt: str
    negative_prompt: str = (
        "low quality, blurry, cartoon, anime, text, watermark"
    )
    lighting_description: str = ""
    color_temperature_kelvin: int = 5600
    emotional_beat: str = ""
    narrative_purpose: str = ""
    lyrics_section: str = ""
    transition_to_next: TransitionType = TransitionType.CUT
    transition_duration_seconds: float = 0.0
    music_timestamp_start: float = 0.0
    music_timestamp_end: float = 0.0
    beat_aligned: bool = False


class ShotPlan(BaseModel):
    """Complete shot plan for a music video."""
    order_id: str
    title: str
    total_duration_seconds: float
    total_shots: int
    visual_style: VideoStyle
    color_palette: Dict[str, Any] = Field(default_factory=dict)
    shots: List[Shot]
    song_bpm: float = 120.0
    beat_timestamps: List[float] = Field(default_factory=list)
    section_markers: Dict[str, float] = Field(default_factory=dict)


class CustomerInput(BaseModel):
    """All input data from the existing Ghaafeedi pipeline."""
    # Identity
    order_id: str = Field(default="")
    customer_id: str

    # Story
    customer_story: str
    emotional_analysis: Dict[str, Any] = Field(default_factory=dict)

    # Emotions
    primary_emotion: EmotionalTone
    secondary_emotions: List[EmotionalTone] = Field(default_factory=list)
    emotional_arc: List[str] = Field(default_factory=list)

    # Song
    lyrics: str = ""
    song_file_url: str = ""
    song_duration_seconds: float = 180.0
    song_bpm: Optional[float] = None
    song_genre: str = "pop"

    # Video script from prior GPT pass
    video_script: str = ""

    # Style
    preferred_style: VideoStyle = VideoStyle.CINEMATIC_TEAL_ORANGE

    # Optional — customer photo for character consistency
    customer_photo_url: Optional[str] = None
    location_preference: Optional[str] = None
    time_period_preference: Optional[str] = None
    include_characters: bool = True


class ProductionResult(BaseModel):
    """Output from the cinematic producer."""
    order_id: str
    status: str = "pending"

    # Output
    final_video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    shot_gallery_urls: List[str] = Field(default_factory=list)
    final_video_duration_seconds: float = 0.0

    # Stats
    total_shots_planned: int = 0
    total_shots_generated: int = 0
    total_shots_failed: int = 0
    production_time_seconds: float = 0.0

    # Quality
    quality_report: Dict[str, Any] = Field(default_factory=dict)

    # Error
    error_message: Optional[str] = None


# ============================================================
# SETTINGS
# ============================================================

class GhaafeediSettings(BaseModel):
    """All runtime settings loaded from environment variables."""

    # OpenAI
    openai_api_key: str = Field(
        default_factory=lambda: os.environ.get("OPENAI_API_KEY", "")
    )
    openai_model: str = Field(
        default_factory=lambda: os.environ.get("OPENAI_MODEL", "gpt-4o")
    )

    # ComfyUI — DEPRECATED: kept for backward compat only. No new code should use this.
    comfyui_url: str = Field(
        default_factory=lambda: os.environ.get(
            "COMFYUI_URL", ""
        )
    )

    # GPU Provider
    gpu_provider: str = Field(
        default_factory=lambda: os.environ.get("GPU_PROVIDER", "poyo")
    )
    fal_key: str = Field(
        default_factory=lambda: os.environ.get("FAL_KEY", "")
    )

    # Storage (Cloudflare R2)
    storage_endpoint: str = Field(
        default_factory=lambda: os.environ.get(
            "STORAGE_ENDPOINT",
            "https://56e7ace05da7338f6d61b014123e6a24.r2.cloudflarestorage.com"
        )
    )
    storage_bucket: str = Field(
        default_factory=lambda: os.environ.get(
            "STORAGE_BUCKET", "ghaafeedi-media"
        )
    )
    storage_access_key: str = Field(
        default_factory=lambda: os.environ.get("STORAGE_ACCESS_KEY", "")
    )
    storage_secret_key: str = Field(
        default_factory=lambda: os.environ.get("STORAGE_SECRET_KEY", "")
    )

    # Suno / Sunor.cc
    suno_api_key: str = Field(
        default_factory=lambda: os.environ.get("SUNO_API_KEY", "")
    )

    # Redis (Upstash)
    redis_url: str = Field(
        default_factory=lambda: os.environ.get("UPSTASH_REDIS_URL", "")
    )

    # Video generation settings
    default_video_width: int = 1280
    default_fps: int = 24
    keyframe_steps: int = 30
    video_steps: int = 50
    cfg_scale: float = 7.0

    # QA thresholds
    blur_threshold: int = 100      # Below = fail/regen
    soft_threshold: int = 200      # Below = pass+enhance, above = pass

    # Video tier durations (seconds)
    tier_basic_seconds: int = 60
    tier_standard_seconds: int = 90
    # tier_premium = full song duration (no cap)


    # ── Consistency & Security ─────────────────────────────────────────────────
    face_similarity_threshold: float = Field(
        default_factory=lambda: float(os.environ.get('FACE_SIMILARITY_THRESHOLD', '0.55'))
    )
    ssim_threshold: float = Field(
        default_factory=lambda: float(os.environ.get('SSIM_THRESHOLD', '0.45'))
    )
    # Fix 4: Drift detection thresholds
    # drift_threshold            — absolute drop from baseline score that flags drift
    # drift_rolling_drop_threshold — 3-shot rolling average drop that flags drift
    drift_threshold: float = Field(
        default_factory=lambda: float(os.environ.get('DRIFT_THRESHOLD', '0.12'))
    )
    drift_rolling_drop_threshold: float = Field(
        default_factory=lambda: float(os.environ.get('DRIFT_ROLLING_DROP_THRESHOLD', '0.08'))
    )
    audit_chain_secret: str = Field(
        default_factory=lambda: os.environ.get('AUDIT_CHAIN_SECRET', 'ghaafeedi-audit-chain-v1')
    )
    trust_email: str = Field(
        default_factory=lambda: os.environ.get('TRUST_EMAIL', 'trust@ghaafeedimusic.com')
    )

    @property
    def r2_access_key_id(self) -> str:
        return self.storage_access_key

    @property
    def r2_secret_access_key(self) -> str:
        return self.storage_secret_key

    @property
    def r2_endpoint(self) -> str:
        return self.storage_endpoint

    @property
    def r2_bucket(self) -> str:
        return self.storage_bucket

    @property
    def r2_public_url(self) -> str:
        import os as _os
        return _os.environ.get('R2_PUBLIC_URL', 'https://pub-bc7b203485814e1186102277ad450211.r2.dev')

    @property
    def upstash_redis_url(self) -> str:
        import os as _os
        return _os.environ.get('UPSTASH_REDIS_REST_URL', '')

    @property
    def database_url(self) -> str:
        import os as _os
        return _os.environ.get('DATABASE_URL', '')

    @property
    def resend_api_key(self) -> str:
        import os as _os
        return _os.environ.get('RESEND_API_KEY', '')


    class Config:
        env_file = ".env"
