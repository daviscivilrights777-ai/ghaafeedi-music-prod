# ============================================================
# FILE: knowledge/cinematography.py
# PURPOSE: Cinematography knowledge base for the AI Director
# ============================================================

CINEMATOGRAPHY_KNOWLEDGE = """
PROFESSIONAL CINEMATOGRAPHY PRINCIPLES:

SHOT PROGRESSION:
- Start wide to establish context and location
- Move to medium shots for storytelling and character relationship
- Use close-ups and extreme close-ups at emotional peaks
- Return to wide shots for transitions and new scenes
- The climax should be your tightest framing

CAMERA MOVEMENT GRAMMAR:
- Push in = increasing intimacy, revelation, suspense
- Pull out = isolation, scale reveal, distance, ending
- Pan = following action, revelation, connection of elements
- Tilt up = aspiration, hope, transcendence
- Tilt down = defeat, introspection, descent
- Orbit = examination, power, god-like perspective
- Handheld = reality, urgency, documentary truth
- Steadicam = dream-like flow, memory, continuous time

CUT RHYTHM:
- Slow cuts (4-6s): contemplation, grief, peace, nostalgia
- Medium cuts (2.5-4s): storytelling, love, hope
- Fast cuts (1-2s): climax, triumph, anger, energy
- Vary rhythm to match emotional arc of the song
- Sync cuts to strong beats for maximum impact

LIGHTING FOR EMOTION:
- Low key (dark): grief, mystery, heartbreak, fear
- High key (bright): joy, hope, ethereal, transcendence
- Motivated light (window/lamp): intimacy, realism, nostalgia
- Backlight: isolation, silhouette, mystery, otherworldly
- Golden hour: love, nostalgia, warmth, memory
- Blue/cool: loneliness, coldness, distance, grief

COMPOSITION RULES:
- Rule of thirds: natural, dynamic, engaging
- Center frame: confrontation, isolation, power, symmetry
- Negative space: loneliness, contemplation, scale
- Frame within frame: restriction, perspective, cinema
- Golden ratio: mathematical beauty, complexity

LENS SELECTION:
- 14-24mm: epic wide, distortion, drama, landscape
- 35mm: natural, cinematic, human eye, storytelling
- 50mm: neutral, documentary, honest
- 85mm: portrait, beauty, compression, character
- 100-135mm: isolation, compression, intimacy

DEPTH OF FIELD:
- Deep focus: environments, context, documentary
- Shallow DOF: character focus, intimacy, beauty
- Rack focus: revelation, surprise, connection

COLOR AND TONE:
- Warm palette (ambers, oranges, yellows): love, nostalgia, hope, joy
- Cool palette (blues, teals, greens): grief, loneliness, distance
- Teal/orange split: cinematic, tension, contrast
- Desaturated: grief, memory, distance, age
- High contrast: drama, noir, urban, heartbreak
- Soft pastel: dream, peace, ethereal, memory
"""

EMOTION_STYLE_MAP = {
    "grief": {
        "color_palette": "desaturated cool blues and warm memory fragments",
        "lighting": "low key, motivated natural light, shadows heavy",
        "atmosphere": "quiet, heavy, fragile, honest",
        "camera_energy": "slow, deliberate, still",
        "shot_length_multiplier": 1.4,
        "dominant_shot_types": ["CLOSE_UP", "MEDIUM_CLOSE_UP", "INSERT_SHOT"],
        "dominant_moves": ["STATIC", "SLOW_PUSH_IN", "FLOAT_DRIFT"],
        "color_temperature": 4200,
        "lut": "desaturated_cold",
    },
    "love": {
        "color_palette": "warm golden ambers, soft bokeh, morning light",
        "lighting": "golden hour, warm practicals, soft diffusion",
        "atmosphere": "tender, warm, intimate, grateful",
        "camera_energy": "gentle, flowing, intimate",
        "shot_length_multiplier": 1.1,
        "dominant_shot_types": ["MEDIUM_CLOSE_UP", "CLOSE_UP", "MEDIUM_SHOT"],
        "dominant_moves": ["SLOW_PUSH_IN", "STEADICAM_FOLLOW", "STATIC"],
        "color_temperature": 5200,
        "lut": "warm_golden",
    },
    "loneliness": {
        "color_palette": "desaturated blues, empty urban spaces, cold",
        "lighting": "artificial light, sodium vapor, cold overhead",
        "atmosphere": "empty, expansive, isolated, aching",
        "camera_energy": "static, drifting, disconnected",
        "shot_length_multiplier": 1.5,
        "dominant_shot_types": ["WIDE_SHOT", "EXTREME_WIDE_SHOT", "MEDIUM_SHOT"],
        "dominant_moves": ["STATIC", "SLOW_PULL_OUT", "SLOW_PAN_RIGHT"],
        "color_temperature": 3800,
        "lut": "desaturated_cold",
    },
    "nostalgia": {
        "color_palette": "warm film grain, faded ambers, vintage tones",
        "lighting": "soft diffused, practical warm light, memory haze",
        "atmosphere": "bittersweet, warm, faded, time-worn",
        "camera_energy": "gentle, drifting, memory-like",
        "shot_length_multiplier": 1.3,
        "dominant_shot_types": ["MEDIUM_SHOT", "INSERT_SHOT", "CLOSE_UP"],
        "dominant_moves": ["FLOAT_DRIFT", "SLOW_PUSH_IN", "STATIC"],
        "color_temperature": 4800,
        "lut": "warm_golden",
    },
    "joy": {
        "color_palette": "vibrant warm colors, sunlight, bright highlights",
        "lighting": "bright, high key, natural sunlight",
        "atmosphere": "energetic, alive, celebratory",
        "camera_energy": "dynamic, moving, free",
        "shot_length_multiplier": 0.8,
        "dominant_shot_types": ["MEDIUM_SHOT", "WIDE_SHOT", "MEDIUM_WIDE_SHOT"],
        "dominant_moves": ["STEADICAM_FOLLOW", "ORBIT_RIGHT", "CRANE_UP"],
        "color_temperature": 6000,
        "lut": "warm_golden",
    },
    "gratitude": {
        "color_palette": "warm golden light, soft bokeh, natural beauty",
        "lighting": "gentle natural light, warm practicals",
        "atmosphere": "open, warm, peaceful, appreciative",
        "camera_energy": "gentle, reverent, slow",
        "shot_length_multiplier": 1.2,
        "dominant_shot_types": ["CLOSE_UP", "MEDIUM_CLOSE_UP", "WIDE_SHOT"],
        "dominant_moves": ["SLOW_PUSH_IN", "CRANE_UP", "STATIC"],
        "color_temperature": 5500,
        "lut": "warm_golden",
    },
    "peace": {
        "color_palette": "soft ethereal light, clean whites, gentle pastels",
        "lighting": "soft, even, diffused, serene",
        "atmosphere": "still, luminous, transcendent, quiet",
        "camera_energy": "very slow, floating, breathlike",
        "shot_length_multiplier": 1.6,
        "dominant_shot_types": ["WIDE_SHOT", "MEDIUM_SHOT", "EXTREME_WIDE_SHOT"],
        "dominant_moves": ["STATIC", "FLOAT_DRIFT", "RISE_AND_REVEAL"],
        "color_temperature": 6500,
        "lut": "ethereal_light",
    },
    "comeback": {
        "color_palette": "teal shadows with warm orange highlights, contrast",
        "lighting": "dramatic side lighting, motivated practicals, contrast",
        "atmosphere": "raw, honest, hard-won, quietly triumphant",
        "camera_energy": "purposeful, building, rising",
        "shot_length_multiplier": 1.0,
        "dominant_shot_types": ["MEDIUM_SHOT", "CLOSE_UP", "WIDE_SHOT"],
        "dominant_moves": ["DRAMATIC_PUSH_IN", "CRANE_UP", "RISE_AND_REVEAL"],
        "color_temperature": 4600,
        "lut": "cinematic_teal_orange",
    },
    "hope": {
        "color_palette": "ethereal light, soft glows, bright highlights",
        "lighting": "soft overhead, morning light, luminous",
        "atmosphere": "fragile, quiet, radiant, renewed",
        "camera_energy": "gentle, rising, light",
        "shot_length_multiplier": 1.2,
        "dominant_shot_types": ["CLOSE_UP", "MEDIUM_SHOT", "WIDE_SHOT"],
        "dominant_moves": ["SLOW_PUSH_IN", "CRANE_UP", "FLOAT_DRIFT"],
        "color_temperature": 6200,
        "lut": "ethereal_light",
    },
    "courage": {
        "color_palette": "warm amber, strong contrast, golden highlights",
        "lighting": "dramatic directional, strong motivated practicals",
        "atmosphere": "determined, strong, purposeful",
        "camera_energy": "steady, forward-moving, grounded",
        "shot_length_multiplier": 1.0,
        "dominant_shot_types": ["MEDIUM_SHOT", "CLOSE_UP", "LOW_ANGLE"],
        "dominant_moves": ["STEADICAM_FOLLOW", "DRAMATIC_PUSH_IN", "STATIC"],
        "color_temperature": 4800,
        "lut": "cinematic_teal_orange",
    },
    "triumph": {
        "color_palette": "warm golden light, epic scope, wide vistas",
        "lighting": "golden hour, epic scale, warm dramatic",
        "atmosphere": "epic, earned, powerful, expansive",
        "camera_energy": "rising, expanding, dynamic",
        "shot_length_multiplier": 0.9,
        "dominant_shot_types": ["EXTREME_WIDE_SHOT", "WIDE_SHOT", "CLOSE_UP"],
        "dominant_moves": ["RISE_AND_REVEAL", "CRANE_UP", "ORBIT_RIGHT"],
        "color_temperature": 5000,
        "lut": "warm_golden",
    },
    "heartbreak": {
        "color_palette": "neon light, urban night, cold blue with warm accents",
        "lighting": "neon signs, streetlight, practical artifical, contrast",
        "atmosphere": "aching, honest, urban isolation, self-aware",
        "camera_energy": "slow, deliberate, unflinching",
        "shot_length_multiplier": 1.3,
        "dominant_shot_types": ["MEDIUM_CLOSE_UP", "INSERT_SHOT", "MEDIUM_SHOT"],
        "dominant_moves": ["STATIC", "SLOW_PUSH_IN", "HANDHELD_SUBTLE"],
        "color_temperature": 3600,
        "lut": "neon_noir",
    },
    "anger": {
        "color_palette": "high contrast, deep shadows, hot highlights, red tones",
        "lighting": "hard directional, harsh shadows, minimal fill",
        "atmosphere": "intense, raw, unstable, urgent",
        "camera_energy": "handheld, fast, aggressive",
        "shot_length_multiplier": 0.7,
        "dominant_shot_types": ["CLOSE_UP", "MEDIUM_CLOSE_UP", "EXTREME_CLOSE_UP"],
        "dominant_moves": ["HANDHELD_SUBTLE", "DRAMATIC_PUSH_IN", "DOLLY_ZOOM_IN"],
        "color_temperature": 3400,
        "lut": "neon_noir",
    },
}
