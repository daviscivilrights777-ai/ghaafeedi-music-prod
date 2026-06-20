# ============================================================
# FILE: agents/director.py
# PURPOSE: GPT-4o powered autonomous film director
# RUNABLE: This is the creative brain of the cinematic module
# ============================================================

import json
import logging
from typing import List, Dict, Any, Optional
from openai import OpenAI

from config import (
    CustomerInput, Shot, ShotPlan, ShotType, CameraMove,
    TransitionType, GhaafeediSettings
)
from knowledge.cinematography import (
    CINEMATOGRAPHY_KNOWLEDGE, EMOTION_STYLE_MAP
)

logger = logging.getLogger("ghaafeedi.director")


class AIDirector:
    """
    Autonomous AI Film Director powered by GPT-4o.

    Takes the emotional analysis, lyrics, song, and video script
    from the existing Ghaafeedi pipeline and creates a complete
    cinematic shot plan with professional film grammar.
    """

    def __init__(self, settings: GhaafeediSettings):
        self.settings = settings
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def create_shot_plan(self, customer_input: CustomerInput) -> ShotPlan:
        """
        Main method: Creates a complete cinematic shot plan.
        """
        logger.info(f"Creating shot plan for order {customer_input.order_id}")

        music_analysis = self._analyze_music_structure(customer_input)
        visual_plan = self._create_visual_narrative(customer_input, music_analysis)
        shots = self._create_shot_list(customer_input, music_analysis, visual_plan)
        refined_shots = self._cinematographer_pass(shots, customer_input)
        final_shots = self._editor_pass(refined_shots, customer_input, music_analysis)

        emotion_key = customer_input.primary_emotion.value
        style_config = EMOTION_STYLE_MAP.get(emotion_key, EMOTION_STYLE_MAP["hope"])

        shot_plan = ShotPlan(
            order_id=customer_input.order_id,
            title=f"Ghaafeedi - {customer_input.customer_id}",
            total_duration_seconds=customer_input.song_duration_seconds,
            total_shots=len(final_shots),
            visual_style=customer_input.preferred_style,
            color_palette={
                "primary": style_config["color_palette"],
                "lighting": style_config["lighting"],
                "atmosphere": style_config["atmosphere"],
            },
            shots=final_shots,
            song_bpm=customer_input.song_bpm or 120.0,
            beat_timestamps=music_analysis.get("beat_timestamps", []),
            section_markers=music_analysis.get("sections", {}),
        )

        logger.info(
            f"Shot plan created: {len(final_shots)} shots, "
            f"{customer_input.song_duration_seconds}s duration"
        )

        return shot_plan

    def _analyze_music_structure(self, customer_input: CustomerInput) -> dict:
        """Analyze song structure for visual sync."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": """You are a music analyst for film/music video production.

Analyze the song structure based on the lyrics and genre.
Output a JSON structure with:
- sections: dict mapping section names to their start times
  (intro, verse1, prechorus1, chorus1, verse2, prechorus2,
   chorus2, bridge, chorus3, outro)
- estimated_bpm: number
- key_emotional_peaks: list of timestamps where emotion is highest
- recommended_cut_points: list of timestamps where cuts should land
- energy_curve: list of [timestamp, energy_level_0_to_1] points
- beat_timestamps: list of beat times (approximate based on BPM)

Base timing on song duration and typical song structure.
Output ONLY valid JSON."""
                },
                {
                    "role": "user",
                    "content": f"""
LYRICS:
{customer_input.lyrics}

SONG GENRE: {customer_input.song_genre}
SONG DURATION: {customer_input.song_duration_seconds} seconds
SONG BPM: {customer_input.song_bpm or 'unknown - estimate from genre'}
PRIMARY EMOTION: {customer_input.primary_emotion.value}
"""
                }
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            logger.warning("Could not parse music analysis, using defaults")
            return self._default_music_analysis(customer_input)

    def _default_music_analysis(self, customer_input: CustomerInput) -> dict:
        """Fallback music structure analysis."""
        dur = customer_input.song_duration_seconds
        bpm = customer_input.song_bpm or 120

        return {
            "sections": {
                "intro": 0,
                "verse1": dur * 0.08,
                "prechorus1": dur * 0.20,
                "chorus1": dur * 0.25,
                "verse2": dur * 0.38,
                "prechorus2": dur * 0.50,
                "chorus2": dur * 0.55,
                "bridge": dur * 0.70,
                "chorus3": dur * 0.80,
                "outro": dur * 0.92,
            },
            "estimated_bpm": bpm,
            "key_emotional_peaks": [dur * 0.30, dur * 0.60, dur * 0.85],
            "recommended_cut_points": [],
            "energy_curve": [
                [0, 0.2], [dur * 0.25, 0.6], [dur * 0.35, 0.4],
                [dur * 0.55, 0.8], [dur * 0.70, 0.5],
                [dur * 0.85, 1.0], [dur, 0.3]
            ],
            "beat_timestamps": [i * (60 / bpm) for i in range(int(dur * bpm / 60))],
        }

    def _create_visual_narrative(self, customer_input: CustomerInput,
                                  music_analysis: dict) -> str:
        """Create the visual narrative concept."""

        emotion_key = customer_input.primary_emotion.value
        style = EMOTION_STYLE_MAP.get(emotion_key, EMOTION_STYLE_MAP["hope"])

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": f"""You are a visionary music video director combining
the talents of Spike Jonze, Hype Williams, and Denis Villeneuve.

You create deeply emotional, cinematic music videos that make
people cry, feel hope, and connect with their own stories.

{CINEMATOGRAPHY_KNOWLEDGE}

VISUAL STYLE FOR THIS PROJECT:
- Color Palette: {style['color_palette']}
- Lighting: {style['lighting']}
- Atmosphere: {style['atmosphere']}
- Camera Energy: {style['camera_energy']}

Create a visual narrative concept for this music video.
Focus on VISUAL storytelling - no dialogue needed.
Every shot should be describable in vivid, concrete visual terms.
The visuals must emotionally match the story and lyrics.
Maximum 2 characters visible per shot for AI generation quality."""
                },
                {
                    "role": "user",
                    "content": f"""
CUSTOMER'S STORY:
{customer_input.customer_story}

EMOTIONAL ANALYSIS:
Primary Emotion: {customer_input.primary_emotion.value}
Secondary Emotions: {[e.value for e in customer_input.secondary_emotions]}
Emotional Arc: {customer_input.emotional_arc}

LYRICS:
{customer_input.lyrics}

VIDEO SCRIPT (from previous GPT-4o pass):
{customer_input.video_script}

SONG STRUCTURE:
{json.dumps(music_analysis.get('sections', {}), indent=2)}

SONG DURATION: {customer_input.song_duration_seconds} seconds

Create a vivid visual narrative concept that maps the emotional
journey of this person's story to cinematic imagery synchronized
with the song structure.
"""
                }
            ],
            temperature=0.8,
            max_tokens=3000
        )

        return response.choices[0].message.content

    def _create_shot_list(self, customer_input: CustomerInput,
                           music_analysis: dict,
                           visual_plan: str) -> List[Shot]:
        """Create the detailed shot-by-shot plan."""

        emotion_key = customer_input.primary_emotion.value
        style = EMOTION_STYLE_MAP.get(emotion_key, EMOTION_STYLE_MAP["hope"])

        song_duration = customer_input.song_duration_seconds
        shot_length_mult = style.get("shot_length_multiplier", 1.0)
        base_shot_length = 3.5 * shot_length_mult
        estimated_shots = max(8, min(40, int(song_duration / base_shot_length)))

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": f"""You are the Director creating the shot list.

{CINEMATOGRAPHY_KNOWLEDGE}

AVAILABLE CAMERA MOVES (use EXACTLY these names):
STATIC, SLOW_PUSH_IN, MEDIUM_PUSH_IN, SLOW_PULL_OUT,
CRANE_DOWN, CRANE_UP, SLOW_PAN_RIGHT, SLOW_PAN_LEFT,
ORBIT_RIGHT, ORBIT_LEFT, STEADICAM_FOLLOW, DOLLY_ZOOM_IN,
TILT_UP_REVEAL, TRUCK_RIGHT, DRAMATIC_PUSH_IN,
HANDHELD_SUBTLE, BIRDS_EYE_DESCENT, FLOAT_DRIFT, RISE_AND_REVEAL

AVAILABLE SHOT TYPES:
EXTREME_WIDE_SHOT, WIDE_SHOT, MEDIUM_WIDE_SHOT, MEDIUM_SHOT,
MEDIUM_CLOSE_UP, CLOSE_UP, EXTREME_CLOSE_UP, OVER_THE_SHOULDER,
POINT_OF_VIEW, INSERT_SHOT

AVAILABLE TRANSITIONS:
CUT, DISSOLVE, FADE_TO_BLACK, FADE_FROM_BLACK, MATCH_CUT,
J_CUT, L_CUT, SMASH_CUT, WHIP_PAN

Output ONLY a valid JSON object with key "shots" containing an array.
Each shot must have these exact fields:
- shot_id: string (format "S01_001")
- scene_number: int
- shot_number: int
- start_time_seconds: float
- duration_seconds: float (3-6 seconds each)
- shot_type: string (from available list)
- camera_movement: string (from available list)
- camera_angle: string ("EYE_LEVEL", "LOW_ANGLE", "HIGH_ANGLE", "DUTCH", "BIRDS_EYE")
- lens_mm: int (14, 24, 35, 50, 85, 100, 135)
- composition: string ("RULE_OF_THIRDS", "CENTER_FRAME", "GOLDEN_RATIO", "NEGATIVE_SPACE", "FRAME_IN_FRAME")
- focus_type: string ("DEEP_FOCUS", "SHALLOW_DOF", "RACK_FOCUS")
- visual_prompt: string (detailed description for AI generation)
- negative_prompt: string
- lighting_description: string
- color_temperature_kelvin: int
- emotional_beat: string
- narrative_purpose: string
- lyrics_section: string
- transition_to_next: string (from available list)
- transition_duration_seconds: float
- music_timestamp_start: float
- music_timestamp_end: float
- beat_aligned: bool"""
                },
                {
                    "role": "user",
                    "content": f"""
Create exactly {estimated_shots} shots for this music video.

VISUAL NARRATIVE PLAN:
{visual_plan}

SONG SECTIONS WITH TIMESTAMPS:
{json.dumps(music_analysis.get('sections', {}), indent=2)}

EMOTIONAL PEAKS:
{json.dumps(music_analysis.get('key_emotional_peaks', []))}

TOTAL SONG DURATION: {song_duration} seconds
PRIMARY EMOTION: {customer_input.primary_emotion.value}
STYLE: {style['color_palette']}
ATMOSPHERE: {style['atmosphere']}

CRITICAL RULES:
1. Shots must cover the ENTIRE song duration (0 to {song_duration}s)
2. No gaps between shots
3. Start wider, get tighter as emotion builds
4. Chorus = close-ups + dynamic camera
5. Verse = wider + storytelling
6. Bridge = completely different visual approach
7. Sync cuts to beat timestamps when possible
8. Every visual_prompt must be specific and vivid
9. Include "shot on ARRI Alexa, cinematic, 2.39:1" in visual prompts

Output ONLY valid JSON object with "shots" key.
"""
                }
            ],
            temperature=0.7,
            max_tokens=8000,
            response_format={"type": "json_object"}
        )

        try:
            raw = json.loads(response.choices[0].message.content)
            shot_list = raw if isinstance(raw, list) else raw.get("shots", [])
        except json.JSONDecodeError:
            logger.error("Failed to parse shot list JSON")
            shot_list = []

        shots = []
        for i, s in enumerate(shot_list):
            try:
                shot = Shot(
                    shot_id=s.get("shot_id", f"S01_{i+1:03d}"),
                    scene_number=s.get("scene_number", 1),
                    shot_number=s.get("shot_number", i + 1),
                    start_time_seconds=s.get("start_time_seconds", i * base_shot_length),
                    duration_seconds=s.get("duration_seconds", base_shot_length),
                    shot_type=ShotType(s.get("shot_type", "MEDIUM_SHOT")),
                    camera_movement=CameraMove(s.get("camera_movement", "STATIC")),
                    camera_angle=s.get("camera_angle", "EYE_LEVEL"),
                    lens_mm=s.get("lens_mm", 50),
                    composition=s.get("composition", "RULE_OF_THIRDS"),
                    focus_type=s.get("focus_type", "DEEP_FOCUS"),
                    visual_prompt=s.get("visual_prompt", ""),
                    negative_prompt=s.get("negative_prompt",
                        "low quality, blurry, cartoon, anime, text, watermark"),
                    lighting_description=s.get("lighting_description", style["lighting"]),
                    color_temperature_kelvin=s.get("color_temperature_kelvin",
                        style.get("color_temperature", 5600)),
                    emotional_beat=s.get("emotional_beat", ""),
                    narrative_purpose=s.get("narrative_purpose", ""),
                    lyrics_section=s.get("lyrics_section", ""),
                    transition_to_next=TransitionType(
                        s.get("transition_to_next", "CUT")),
                    transition_duration_seconds=s.get("transition_duration_seconds", 0.0),
                    music_timestamp_start=s.get("music_timestamp_start",
                        s.get("start_time_seconds", i * base_shot_length)),
                    music_timestamp_end=s.get("music_timestamp_end",
                        s.get("start_time_seconds", i * base_shot_length) +
                        s.get("duration_seconds", base_shot_length)),
                    beat_aligned=s.get("beat_aligned", False),
                )
                shots.append(shot)
            except Exception as e:
                logger.warning(f"Skipping shot {i}: {e}")

        logger.info(f"Created {len(shots)} shots from director")
        return shots

    def _cinematographer_pass(self, shots: List[Shot],
                               customer_input: CustomerInput) -> List[Shot]:
        """Refine shots with cinematographer expertise."""

        emotion_key = customer_input.primary_emotion.value
        style = EMOTION_STYLE_MAP.get(emotion_key, EMOTION_STYLE_MAP["hope"])

        batch_size = 8
        refined_shots = []

        for batch_start in range(0, len(shots), batch_size):
            batch = shots[batch_start:batch_start + batch_size]
            batch_data = [s.model_dump() for s in batch]

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are a world-class Director of Photography.
Your job: enhance each shot's visual_prompt for maximum AI generation quality.

RULES FOR ENHANCED PROMPTS:
1. ALWAYS include: "shot on ARRI Alexa Mini LF"
2. ALWAYS include specific lens: "Cooke S7/i {{lens_mm}}mm"
3. ALWAYS include: "2.39:1 anamorphic widescreen"
4. ALWAYS include: "Kodak Vision3 500T film grain"
5. ALWAYS include specific lighting details
6. ALWAYS include atmosphere/mood descriptors
7. ALWAYS include "cinematic, masterpiece, 8K"
8. Make descriptions vivid and specific - not generic
9. Reference the emotion: {emotion_key}
10. Match the style: {style['atmosphere']}

Output the enhanced shots as a JSON object with key "shots".
Only modify: visual_prompt, negative_prompt, lighting_description.
Keep all other fields identical.
Output ONLY valid JSON."""
                    },
                    {
                        "role": "user",
                        "content": json.dumps({"shots": batch_data})
                    }
                ],
                temperature=0.5,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )

            try:
                raw = json.loads(response.choices[0].message.content)
                enhanced = raw if isinstance(raw, list) else raw.get("shots", batch_data)
            except:
                enhanced = batch_data

            for i, enhanced_shot in enumerate(enhanced):
                if i < len(batch):
                    original = batch[i]
                    original.visual_prompt = enhanced_shot.get(
                        "visual_prompt", original.visual_prompt
                    )
                    original.negative_prompt = enhanced_shot.get(
                        "negative_prompt", original.negative_prompt
                    )
                    original.lighting_description = enhanced_shot.get(
                        "lighting_description", original.lighting_description
                    )
                    refined_shots.append(original)

        logger.info(f"Cinematographer refined {len(refined_shots)} shots")
        return refined_shots

    def _editor_pass(self, shots: List[Shot],
                     customer_input: CustomerInput,
                     music_analysis: dict) -> List[Shot]:
        """Editor pass: optimize timing, transitions, and pacing."""

        beat_timestamps = music_analysis.get("beat_timestamps", [])
        emotional_peaks = music_analysis.get("key_emotional_peaks", [])

        for i, shot in enumerate(shots):
            if beat_timestamps and shot.beat_aligned:
                end_time = shot.start_time_seconds + shot.duration_seconds
                closest_beat = min(beat_timestamps,
                    key=lambda b: abs(b - end_time),
                    default=end_time)
                if abs(closest_beat - end_time) < 0.3:
                    shot.duration_seconds = closest_beat - shot.start_time_seconds
                    if shot.duration_seconds < 1.5:
                        shot.duration_seconds = 1.5

            if i > 0:
                prev = shots[i - 1]
                shot.start_time_seconds = (
                    prev.start_time_seconds + prev.duration_seconds
                )
                shot.music_timestamp_start = shot.start_time_seconds
                shot.music_timestamp_end = (
                    shot.start_time_seconds + shot.duration_seconds
                )

            for peak in emotional_peaks:
                if abs(shot.start_time_seconds - peak) < 2.0:
                    if shot.shot_type not in [ShotType.CLOSE_UP, ShotType.EXTREME_CLOSE]:
                        shot.shot_type = ShotType.CLOSE_UP
                    if shot.camera_movement == CameraMove.STATIC:
                        shot.camera_movement = CameraMove.SLOW_PUSH_IN

        logger.info(f"Editor refined pacing for {len(shots)} shots")
        return shots
