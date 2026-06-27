"""
consistency_manager.py — Step 9
High-level orchestrator for character consistency.

Wires together:
  FaceBank            — PostgreSQL + R2 face storage (per order_id)
  CharacterExtractor  — FAL.ai face extraction (needs openai_client)
  ConsistencyInjector — payload builder (prompt text + image_url param)
  ConsistencyQA       — post-gen InsightFace / SSIM QA

Public API consumed by engines/generation.py:
  manager = ConsistencyManager(order_id, character_id)
  payload  = await manager.get_consistent_payload(base_payload, shot_description)
  result   = await manager.verify_shot_with_pause(shot_frame_url, shot_index)
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Any, Optional

from .character_extractor import CharacterExtractor
from .consistency_injector import ConsistencyInjector
from .consistency_qa import QAResult, check_shot, should_pause_job
from .face_bank import FaceBank

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------
def _get_settings():
    try:
        from config import settings  # type: ignore
        return settings
    except Exception:
        return None


def _make_openai_client():
    """Build an OpenAI client from env var (lazy)."""
    try:
        import openai
        return openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Pause notification
# ---------------------------------------------------------------------------
async def _notify_pause(order_id: str, shot_index: int, qa_result: QAResult) -> None:
    """
    Email customer + trust@ when a job is paused due to double QA fail.
    Non-blocking — errors are logged but do not raise.
    """
    settings = _get_settings()
    if settings is None:
        return

    resend_key  = getattr(settings, "resend_api_key", None)
    trust_email = getattr(settings, "trust_email", "trust@ghaafeedimusic.com")

    if not resend_key:
        logger.warning("RESEND_API_KEY not set — skipping pause notification")
        return

    customer_email = await _get_customer_email(order_id)

    to_list = [trust_email]
    if customer_email and customer_email != trust_email:
        to_list.insert(0, customer_email)

    try:
        import httpx

        html = f"""
        <div style="font-family:Inter,sans-serif;background:#050B1A;color:#fff;padding:32px;">
          <h2 style="color:#D4AF37;">Production Quality Hold</h2>
          <p>Your order <strong>{order_id}</strong> has been paused for quality review.</p>
          <p>Shot {shot_index + 1} did not meet our character consistency standard after two attempts
             (score: {qa_result.score:.3f}, method: {qa_result.method}).</p>
          <p>Our team at <a href="mailto:{trust_email}" style="color:#D4AF37;">{trust_email}</a>
             will review and contact you within 24 hours.</p>
          <p style="color:#9CA3AF;font-size:12px;">Ghaafeedi Music — Your Story. Your Legacy.</p>
        </div>
        """

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {resend_key}"},
                json={
                    "from": "Ghaafeedi Music <no-reply@ghaafeedimusic.com>",
                    "to": to_list,
                    "subject": f"[Ghaafeedi Music] Production Paused — Order {order_id}",
                    "html": html,
                },
            )
            resp.raise_for_status()
            logger.info("Pause notification sent for order=%s shot=%d", order_id, shot_index)
    except Exception as exc:
        logger.error("Pause notification failed: %s", exc)


async def _get_customer_email(order_id: str) -> Optional[str]:
    """Fetch customer email from PostgreSQL."""
    settings = _get_settings()
    if settings is None:
        return None
    db_url = getattr(settings, "database_url", None)
    if not db_url:
        return None
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute(
            """
            SELECT u.email FROM orders o
            JOIN profiles p ON p.user_id = o.user_id
            JOIN users u ON u.id = p.user_id
            WHERE o.id = %s LIMIT 1
            """,
            (order_id,),
        )
        row = cur.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception as exc:
        logger.warning("Could not fetch customer email: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------
@dataclass
class VerifyResult:
    passed: bool
    paused: bool
    qa: QAResult


# ---------------------------------------------------------------------------
# ConsistencyManager
# ---------------------------------------------------------------------------
class ConsistencyManager:
    """
    Per-order consistency orchestrator.

    Parameters
    ----------
    order_id     : Ghaafeedi order ID (used as storage namespace)
    character_id : Unique ID for this character within the order
    """

    def __init__(self, order_id: str, character_id: str) -> None:
        self.order_id     = order_id
        self.character_id = character_id

        self._face_bank = FaceBank(order_id=order_id)
        self._injector  = ConsistencyInjector()

    def _get_extractor(self) -> CharacterExtractor:
        """Build CharacterExtractor lazily (needs OpenAI client)."""
        return CharacterExtractor(
            openai_client=_make_openai_client(),
            fal_api_key=os.environ.get("FAL_KEY", ""),
        )

    def _get_primary_ref(self):
        """
        Get CharacterReference for this character_id.
        Falls back to get_primary() if character_id not found by name.
        """
        # FaceBank indexes by character_name; try character_id as name
        ref = self._face_bank.get_by_name(self.character_id)
        if ref is None:
            ref = self._face_bank.get_primary()
        return ref

    # ------------------------------------------------------------------
    # Payload builder
    # ------------------------------------------------------------------
    async def get_consistent_payload(
        self,
        base_payload: dict[str, Any],
        shot_description: str,
    ) -> dict[str, Any]:
        """
        Augment a Poyo/Seedance base payload with character consistency context.
        Returns modified payload (does not mutate original).
        """
        ref = await asyncio.get_event_loop().run_in_executor(
            None, self._get_primary_ref
        )

        if ref is None:
            logger.warning(
                "No character reference for order=%s character=%s — skipping injection",
                self.order_id, self.character_id,
            )
            return base_payload

        # ConsistencyInjector.build_consistent_payload() is the actual method name
        shot_type = base_payload.get('shot_type', 'DEFAULT')
        model     = base_payload.get('model', 'seedance-2')
        base_prompt = base_payload.get('prompt', shot_description)

        injected = self._injector.build_consistent_payload(
            base_prompt=base_prompt or shot_description,
            reference=ref,
            shot_type=str(shot_type),
            model=model,
            extra_params={k: v for k, v in base_payload.items()
                          if k not in ('prompt', 'model', 'shot_type')},
        )
        return injected

    # ------------------------------------------------------------------
    # Post-generation QA
    # ------------------------------------------------------------------
    async def verify_shot_with_pause(
        self,
        generated_frame_url: str,
        shot_index: int,
    ) -> VerifyResult:
        """
        Run QA on a generated shot frame against the stored face reference.
        - Pass: VerifyResult(passed=True, paused=False)
        - Single fail: VerifyResult(passed=False, paused=False)
        - Double fail: pauses job + emails customer, VerifyResult(paused=True)
        """
        ref = await asyncio.get_event_loop().run_in_executor(
            None, self._get_primary_ref
        )

        if ref is None:
            logger.warning(
                "No face reference for QA — skipping. order=%s character=%s",
                self.order_id, self.character_id,
            )
            return VerifyResult(
                passed=True,
                paused=False,
                qa=QAResult(
                    passed=True, score=0.0, method="skip",
                    message="No reference available — QA skipped",
                ),
            )

        # face_url is stored on CharacterReference
        ref_image = getattr(ref, "face_url", None) or getattr(ref, "front_image_path", None)
        if not ref_image:
            logger.warning("CharacterReference has no face_url — QA skipped")
            return VerifyResult(
                passed=True, paused=False,
                qa=QAResult(passed=True, score=0.0, method="skip",
                            message="No face URL on reference"),
            )

        qa_result = await asyncio.get_event_loop().run_in_executor(
            None, check_shot,
            ref_image,
            generated_frame_url,
            self.order_id,
            shot_index,
        )

        paused = False
        if not qa_result.passed and should_pause_job(self.order_id, shot_index):
            paused = True
            logger.error(
                "Double QA fail — pausing job. order=%s shot=%d",
                self.order_id, shot_index,
            )
            asyncio.create_task(_notify_pause(self.order_id, shot_index, qa_result))

        return VerifyResult(passed=qa_result.passed, paused=paused, qa=qa_result)

    # ------------------------------------------------------------------
    # Registration helper
    # ------------------------------------------------------------------
    async def register_character(
        self,
        source_image_path: str,
        display_name: str = "Primary Character",
        consent_id: Optional[str] = None,
    ) -> bool:
        """
        Extract face from source image, store in R2 + PostgreSQL.
        Returns True on success.
        """
        try:
            extractor = self._get_extractor()
            ref = await asyncio.get_event_loop().run_in_executor(
                None,
                extractor.extract_from_photo,
                source_image_path,
                display_name,
                self.order_id,
            )
            if ref:
                await asyncio.get_event_loop().run_in_executor(
                    None, self._face_bank.store, ref
                )
                logger.info(
                    "Character registered: order=%s name=%s",
                    self.order_id, display_name,
                )
                return True
            return False
        except Exception as exc:
            logger.error("register_character failed: %s", exc)
            return False
