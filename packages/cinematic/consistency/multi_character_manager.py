"""
multi_character_manager.py — Fix 3
Multi-character consistency orchestrator for Ghaafeedi Music.

Handles productions with more than one character (e.g. Couples Journey Film,
Relationship Healing, Family Vault).  Each character gets its own
ConsistencyManager (face bank, injector, QA counter, drift detector).

Public API consumed by engines/generation.py:
    mgr = MultiCharacterConsistencyManager(order_id, character_ids=["char_a", "char_b"])
    payload  = await mgr.get_consistent_payload(base_payload, shot_description)
    results  = await mgr.verify_all_shots_with_pause(shot_frame_urls, shot_index)
    paused   = results.any_paused

Registration helper:
    ok = await mgr.register_character("char_a", source_path, display_name, consent_id)
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .consistency_manager import ConsistencyManager, VerifyResult
from .consistency_qa import QAResult

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class MultiVerifyResult:
    """
    Aggregated QA result across all characters for one shot.
    - all_passed   : True only if every character passed QA
    - any_paused   : True if any character hit double-fail (job should halt)
    - per_character: dict mapping character_id → VerifyResult
    """
    all_passed: bool
    any_paused: bool
    per_character: Dict[str, VerifyResult] = field(default_factory=dict)

    @property
    def worst_score(self) -> float:
        if not self.per_character:
            return 0.0
        return min(v.qa.score for v in self.per_character.values())

    @property
    def paused_characters(self) -> List[str]:
        return [cid for cid, v in self.per_character.items() if v.paused]


# ---------------------------------------------------------------------------
# MultiCharacterConsistencyManager
# ---------------------------------------------------------------------------

class MultiCharacterConsistencyManager:
    """
    Manages consistency for multiple characters within a single order.

    Parameters
    ----------
    order_id      : Ghaafeedi order ID (shared storage namespace)
    character_ids : List of character IDs to manage (minimum 1)
    primary_character_id : Optional — which character's face-lock image is
                           used for Level 2 (Poyo `image` param).
                           Defaults to first character_id.
    """

    def __init__(
        self,
        order_id: str,
        character_ids: List[str],
        primary_character_id: Optional[str] = None,
    ) -> None:
        if not character_ids:
            raise ValueError("MultiCharacterConsistencyManager requires at least one character_id")

        self.order_id    = order_id
        self.character_ids = character_ids
        self.primary_id  = primary_character_id or character_ids[0]

        # One ConsistencyManager per character
        self._managers: Dict[str, ConsistencyManager] = {
            cid: ConsistencyManager(order_id=order_id, character_id=cid)
            for cid in character_ids
        }

        logger.info(
            "[MultiConsistency] order=%s characters=%s primary=%s",
            order_id, character_ids, self.primary_id,
        )

    # ------------------------------------------------------------------
    # Payload builder — merges all character prompt prefixes
    # ------------------------------------------------------------------

    async def get_consistent_payload(
        self,
        base_payload: Dict[str, Any],
        shot_description: str,
    ) -> Dict[str, Any]:
        """
        Build a Poyo/Seedance payload that encodes ALL characters.

        Strategy:
          - Level 1: Concatenate each character's visual_description + negative_prefix
            into a combined prompt.  Ordering: primary first, others appended.
          - Level 2: Use the primary character's poyo_image_url as the `image` param
            (Seedance 2 accepts one reference image; the primary face anchors the scene).
          - Extra characters are described in text; their face banks are active for L3 QA.
        """
        if not self._managers:
            return base_payload

        # Gather payloads from all characters concurrently
        tasks = {
            cid: asyncio.create_task(
                mgr.get_consistent_payload(base_payload, shot_description)
            )
            for cid, mgr in self._managers.items()
        }
        await asyncio.gather(*tasks.values(), return_exceptions=True)

        # Start from primary character's payload (has the image param)
        primary_payload: Dict[str, Any] = {}
        primary_task = tasks.get(self.primary_id)
        if primary_task and not primary_task.exception():
            primary_payload = primary_task.result()
        else:
            primary_payload = dict(base_payload)

        # Collect all character prompt prefixes (excluding primary — already in payload)
        extra_descriptions: List[str] = []
        for cid, task in tasks.items():
            if cid == self.primary_id:
                continue
            if task.exception():
                logger.warning("Payload build failed for character=%s: %s", cid, task.exception())
                continue
            result = task.result()
            extra_prompt = result.get("prompt", "")
            if extra_prompt:
                extra_descriptions.append(extra_prompt)

        # Merge extra descriptions into prompt
        if extra_descriptions:
            base_prompt = primary_payload.get("prompt", shot_description)
            merged = base_prompt + " " + " ".join(extra_descriptions)
            # Trim to 800 chars to stay within Poyo prompt limits
            if len(merged) > 800:
                merged = merged[:797] + "..."
            primary_payload["prompt"] = merged
            logger.debug(
                "[MultiConsistency] Merged prompt for %d characters (%d chars)",
                len(self.character_ids), len(merged),
            )

        return primary_payload

    # ------------------------------------------------------------------
    # Post-generation QA — run all characters concurrently
    # ------------------------------------------------------------------

    async def verify_all_shots_with_pause(
        self,
        shot_frame_urls: Dict[str, str],
        shot_index: int,
    ) -> MultiVerifyResult:
        """
        Run QA for all characters on a generated shot.

        Parameters
        ----------
        shot_frame_urls : dict mapping character_id → frame URL (or video URL).
                          If a character_id is missing from the dict, the same
                          URL is used for all characters (single-frame output).
        shot_index      : 0-based shot position in the production.

        Returns MultiVerifyResult with per-character breakdown.
        """
        # If only one URL given (not per-character), broadcast to all
        if len(shot_frame_urls) == 1 and list(shot_frame_urls.keys())[0] not in self.character_ids:
            shared_url = list(shot_frame_urls.values())[0]
            shot_frame_urls = {cid: shared_url for cid in self.character_ids}
        else:
            # Fill missing character IDs with first available URL
            fallback_url = next(iter(shot_frame_urls.values()), "")
            for cid in self.character_ids:
                if cid not in shot_frame_urls:
                    shot_frame_urls[cid] = fallback_url

        # Run all verifications concurrently
        tasks = {
            cid: asyncio.create_task(
                self._managers[cid].verify_shot_with_pause(
                    generated_frame_url=shot_frame_urls[cid],
                    shot_index=shot_index,
                )
            )
            for cid in self.character_ids
        }
        await asyncio.gather(*tasks.values(), return_exceptions=True)

        per_character: Dict[str, VerifyResult] = {}
        for cid, task in tasks.items():
            if task.exception():
                logger.error("QA failed for character=%s: %s", cid, task.exception())
                per_character[cid] = VerifyResult(
                    passed=False,
                    paused=False,
                    qa=QAResult(
                        passed=False, score=0.0, method="error",
                        message=str(task.exception()),
                    ),
                )
            else:
                per_character[cid] = task.result()

        all_passed = all(v.passed for v in per_character.values())
        any_paused = any(v.paused for v in per_character.values())

        if any_paused:
            paused_list = [cid for cid, v in per_character.items() if v.paused]
            logger.error(
                "[MultiConsistency] Job paused — double QA fail on characters=%s order=%s shot=%d",
                paused_list, self.order_id, shot_index,
            )
        elif not all_passed:
            failed_list = [
                f"{cid}({v.qa.score:.3f})"
                for cid, v in per_character.items() if not v.passed
            ]
            logger.warning(
                "[MultiConsistency] QA fail (non-blocking) order=%s shot=%d chars=%s",
                self.order_id, shot_index, failed_list,
            )

        return MultiVerifyResult(
            all_passed=all_passed,
            any_paused=any_paused,
            per_character=per_character,
        )

    # ------------------------------------------------------------------
    # Convenience: broadcast verify when single video URL for all chars
    # ------------------------------------------------------------------

    async def verify_shot_broadcast(
        self,
        generated_frame_url: str,
        shot_index: int,
    ) -> MultiVerifyResult:
        """
        Verify a single generated frame against ALL characters.
        Use this when Seedance produces one video with multiple people in frame.
        """
        return await self.verify_all_shots_with_pause(
            shot_frame_urls={cid: generated_frame_url for cid in self.character_ids},
            shot_index=shot_index,
        )

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    async def register_character(
        self,
        character_id: str,
        source_image_path: str,
        display_name: str = "",
        consent_id: Optional[str] = None,
    ) -> bool:
        """
        Register or re-register a character's face.
        character_id must already be in self.character_ids (added at init).
        """
        if character_id not in self._managers:
            # Auto-add if called with a new character (graceful expansion)
            self._managers[character_id] = ConsistencyManager(
                order_id=self.order_id,
                character_id=character_id,
            )
            if character_id not in self.character_ids:
                self.character_ids.append(character_id)

        name = display_name or character_id
        return await self._managers[character_id].register_character(
            source_image_path=source_image_path,
            display_name=name,
            consent_id=consent_id,
        )

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def character_count(self) -> int:
        return len(self.character_ids)

    def summary(self) -> Dict[str, Any]:
        return {
            "order_id": self.order_id,
            "character_count": self.character_count(),
            "character_ids": self.character_ids,
            "primary_character_id": self.primary_id,
        }
