# ============================================================
# FILE: consistency/consistency_injector.py
# PURPOSE: Build Level 1 + Level 2 consistent Poyo.ai payloads
#
# Level 1: Injects character visual fingerprint text into prompt
# Level 2: Passes face image URL as Poyo 'image' parameter
#
# REPLACED: ComfyUI IP-Adapter FaceID node graph manipulation
# NEW:      Pure HTTP JSON payload construction — no ComfyUI,
#           no node graphs, no external GPU dependency.
# ============================================================

import logging
from typing import Optional

from consistency.character_extractor import CharacterReference

logger = logging.getLogger("ghaafeedi.consistency.injector")


# ─── Shot-type → consistency language strength ───────────────────────────────
# How strongly to phrase the character lock based on how visible
# the face is in each shot type. Close-ups get strict language.
# Wide shots get gentle reminders.

SHOT_CONSISTENCY_LANGUAGE: dict[str, str] = {
    "EXTREME_CLOSE_UP": (
        "maintaining exact facial features with maximum fidelity, "
        "same person throughout, precise identity match"
    ),
    "CLOSE_UP": (
        "maintaining precise facial features and identity, "
        "same person, consistent appearance"
    ),
    "MEDIUM_CLOSE_UP": (
        "preserving character identity and facial consistency, "
        "same person"
    ),
    "MEDIUM_SHOT": (
        "same character, consistent appearance throughout"
    ),
    "MEDIUM_WIDE_SHOT": (
        "same character, recognizable appearance"
    ),
    "WIDE_SHOT": (
        "same character visible in frame"
    ),
    "EXTREME_WIDE_SHOT": (
        "character present in scene"
    ),
    "OVER_THE_SHOULDER": (
        "same character, consistent hair and clothing"
    ),
    "POINT_OF_VIEW": (
        "subjective camera, character implied"
    ),
    "INSERT_SHOT": "",   # object/detail shots — no face lock needed
    "DEFAULT": (
        "same character, consistent appearance"
    ),
}

# Shot types where we skip the Level 2 image reference entirely
# (face not prominent enough to benefit from face-lock overhead)
SKIP_FACE_LOCK_TYPES = {"INSERT_SHOT", "EXTREME_WIDE_SHOT"}


class ConsistencyInjector:
    """
    Builds Poyo.ai-ready generation payloads with character consistency baked in.

    Level 1: Prepends character visual fingerprint to the prompt text.
    Level 2: Adds face image URL as Poyo 'image' parameter (Seedance 2 supports this).

    No external dependencies. No GPU required. Pure JSON construction.
    """

    def build_consistent_payload(
        self,
        base_prompt: str,
        reference: CharacterReference,
        shot_type: str,
        model: str = "seedance-2",
        extra_params: Optional[dict] = None,
    ) -> dict:
        """
        Build a complete Poyo.ai generation payload with both consistency levels.

        Args:
            base_prompt:   The shot's visual prompt (from ShotGenerationEngine)
            reference:     CharacterReference for the character in this shot
            shot_type:     ShotType enum value (e.g. "CLOSE_UP")
            model:         Poyo model to use
            extra_params:  Any additional params to merge into the payload

        Returns:
            dict ready to pass as Poyo.ai 'input' payload
        """
        # ── Level 1: inject character fingerprint text ──────────────────────
        consistency_text = SHOT_CONSISTENCY_LANGUAGE.get(
            shot_type,
            SHOT_CONSISTENCY_LANGUAGE["DEFAULT"],
        )

        if reference.prompt_prefix:
            enhanced_prompt = (
                f"{reference.prompt_prefix} "
                f"{base_prompt}"
            )
        else:
            enhanced_prompt = base_prompt

        if consistency_text:
            enhanced_prompt = f"{enhanced_prompt}, {consistency_text}"

        # ── Level 2: face-lock image reference ───────────────────────────────
        payload: dict = {
            "prompt": enhanced_prompt,
            "negative_prompt": self._build_negative(reference),
            "model": model,
        }

        if (
            shot_type not in SKIP_FACE_LOCK_TYPES
            and reference.poyo_image_url
            and reference.quality_score >= 0.5
        ):
            payload["image"] = reference.poyo_image_url
            logger.debug(
                f"[Injector] Level 2 face-lock applied for "
                f"'{reference.character_name}' on {shot_type}"
            )
        else:
            logger.debug(
                f"[Injector] Level 2 skipped for {shot_type} "
                f"(shot type excluded or no image URL)"
            )

        if extra_params:
            payload.update(extra_params)

        return payload

    def build_retry_payload(
        self,
        original_payload: dict,
        reference: CharacterReference,
        shot_type: str,
        fail_count: int = 1,
    ) -> dict:
        """
        Build a strengthened payload for a retry after QA failure.
        Increases linguistic pressure on character fidelity.
        """
        base_prompt = original_payload.get("prompt", "")
        model       = original_payload.get("model", "seedance-2")

        # Strip any existing consistency language to avoid repetition
        if reference.prompt_prefix and reference.prompt_prefix in base_prompt:
            base_prompt = base_prompt.replace(reference.prompt_prefix, "").strip()

        retry_suffix = (
            "CRITICAL character consistency: absolutely the same person, "
            "exact same face, exact same features, maximum identity fidelity, "
            "do not change the person's appearance"
        )

        retry_prompt = (
            f"{reference.prompt_prefix} "
            f"{base_prompt}, "
            f"{retry_suffix}"
        )

        payload = {
            **original_payload,
            "prompt": retry_prompt,
        }

        # Always include face-lock on retry (even for wide shots)
        if reference.poyo_image_url:
            payload["image"] = reference.poyo_image_url

        logger.info(
            f"[Injector] Retry payload built (fail_count={fail_count}) "
            f"for '{reference.character_name}'"
        )
        return payload

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE
    # ──────────────────────────────────────────────────────────────────────────

    def _build_negative(self, reference: CharacterReference) -> str:
        base_negative = (
            "low quality, blurry, cartoon, anime, text, watermark, "
            "deformed face, distorted"
        )
        if reference.negative_prefix:
            return f"{reference.negative_prefix}, {base_negative}"
        return base_negative
