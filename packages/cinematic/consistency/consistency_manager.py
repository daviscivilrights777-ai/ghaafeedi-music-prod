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
# Fix 2: Extract a still frame from a video URL for image-based QA
# ---------------------------------------------------------------------------
def _extract_still_from_media(url_or_path: str, shot_index: int) -> str | bytes:
    """
    If url_or_path looks like a video, extract frame at t=0.5s via ffmpeg
    and return the JPEG bytes. Otherwise pass through unchanged (already an image URL).
    """
    import subprocess
    import tempfile

    lower = url_or_path.lower().split("?")[0]  # strip query params
    video_exts = (".mp4", ".mov", ".webm", ".mkv", ".avi")
    if not any(lower.endswith(ext) for ext in video_exts):
        # Already an image URL — pass through
        return url_or_path

    # Download video to tmp file
    try:
        import httpx
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as vf:
            video_path = vf.name
        resp = httpx.get(url_or_path, timeout=60, follow_redirects=True)
        resp.raise_for_status()
        with open(video_path, "wb") as f:
            f.write(resp.content)
    except Exception as exc:
        logger.warning("Frame extraction: video download failed (%s) — passing URL as-is", exc)
        return url_or_path

    # Extract frame at 0.5s (or first keyframe if video < 0.5s)
    frame_path = video_path.replace(".mp4", f"_frame{shot_index}.jpg")
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", "0.5",
                "-i", video_path,
                "-vframes", "1",
                "-q:v", "2",
                frame_path,
            ],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            # Retry at t=0 (very short clip)
            subprocess.run(
                ["ffmpeg", "-y", "-i", video_path, "-vframes", "1", "-q:v", "2", frame_path],
                capture_output=True, timeout=30,
            )
        with open(frame_path, "rb") as f:
            frame_bytes = f.read()
        import os
        os.unlink(video_path)
        os.unlink(frame_path)
        logger.info("Frame extracted for QA: shot=%d (%d bytes)", shot_index, len(frame_bytes))
        return frame_bytes
    except Exception as exc:
        logger.warning("Frame extraction failed (%s) — passing URL as-is", exc)
        return url_or_path


# ---------------------------------------------------------------------------
# Fix 5: Persist QA result to PostgreSQL shot_qa_results table
# ---------------------------------------------------------------------------
def _persist_qa_result(
    order_id: str,
    character_id: str,
    shot_index: int,
    qa: "QAResult",
    frame_url: str,
) -> None:
    """Write QA result row to PostgreSQL shot_qa_results (auto-creates table)."""
    settings = _get_settings()
    if settings is None:
        return
    db_url = getattr(settings, "database_url", None)
    if not db_url:
        return
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS shot_qa_results (
                id              BIGSERIAL PRIMARY KEY,
                order_id        TEXT        NOT NULL,
                character_id    TEXT        NOT NULL,
                shot_index      INTEGER     NOT NULL,
                passed          BOOLEAN     NOT NULL,
                score           REAL        NOT NULL,
                method          TEXT        NOT NULL,
                message         TEXT        NOT NULL,
                fail_count      INTEGER     NOT NULL DEFAULT 0,
                frame_url       TEXT        NOT NULL DEFAULT '',
                drift_flagged   BOOLEAN     NOT NULL DEFAULT FALSE,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_shot_qa_order
                ON shot_qa_results (order_id, created_at DESC);
        """)
        cur.execute(
            """
            INSERT INTO shot_qa_results
                (order_id, character_id, shot_index, passed, score, method, message, fail_count, frame_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_id, character_id, shot_index,
                qa.passed, float(qa.score), qa.method,
                qa.message, qa.fail_count, frame_url,
            ),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.warning("_persist_qa_result DB error: %s", exc)


# ---------------------------------------------------------------------------
# Fix 4: Drift notification (fired async when drift detected)
# ---------------------------------------------------------------------------
async def _notify_drift(
    order_id: str,
    character_id: str,
    shot_index: int,
    qa: "QAResult",
) -> None:
    """Email trust@ when character drift is detected (non-blocking)."""
    settings = _get_settings()
    if settings is None:
        return
    resend_key  = getattr(settings, "resend_api_key", None)
    trust_email = getattr(settings, "trust_email", "trust@ghaafeedimusic.com")
    if not resend_key:
        return
    try:
        import httpx
        html = f"""
        <div style="font-family:Inter,sans-serif;background:#050B1A;color:#fff;padding:32px;">
          <h2 style="color:#F59E0B;">⚠ Character Drift Alert</h2>
          <p>Order <strong>{order_id}</strong> — character <strong>{character_id}</strong></p>
          <p>Shot {shot_index + 1} passed QA individually (score: {qa.score:.3f}),
             but a significant drop from the baseline score has been detected across shots.</p>
          <p>This may indicate gradual visual drift. Manual review recommended.</p>
          <p style="color:#9CA3AF;font-size:12px;">Ghaafeedi Music — Consistency Monitor</p>
        </div>
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {resend_key}"},
                json={
                    "from": "Ghaafeedi Music <no-reply@ghaafeedimusic.com>",
                    "to": [trust_email],
                    "subject": f"[Ghaafeedi Music] Drift Alert — Order {order_id} Shot {shot_index + 1}",
                    "html": html,
                },
            )
            resp.raise_for_status()
    except Exception as exc:
        logger.error("Drift notification failed: %s", exc)


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

        # Fix 1: Try all attribute names CharacterReference may use for the face URL
        ref_image = (
            getattr(ref, "face_url", None)
            or getattr(ref, "front_image_path", None)
            or getattr(ref, "poyo_image_url", None)   # primary R2/CDN URL on dataclass
            or getattr(ref, "front_face_path", None)  # local tmp path fallback
        )
        if not ref_image:
            logger.warning("CharacterReference has no usable face URL — QA skipped")
            return VerifyResult(
                passed=True, paused=False,
                qa=QAResult(passed=True, score=0.0, method="skip",
                            message="No face URL on reference"),
            )

        # Fix 2: If generated_frame_url is a video (.mp4/.mov/.webm), extract a still
        # frame at t=0.5s before passing to InsightFace/SSIM (which expect images).
        qa_frame = await asyncio.get_event_loop().run_in_executor(
            None, _extract_still_from_media, generated_frame_url, shot_index
        )

        qa_result = await asyncio.get_event_loop().run_in_executor(
            None, check_shot,
            ref_image,
            qa_frame,
            self.order_id,
            shot_index,
        )

        # Fix 5: persist QA result to PostgreSQL shot_qa_results table
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, _persist_qa_result,
                self.order_id, self.character_id, shot_index,
                qa_result, generated_frame_url,
            )
        except Exception as _pqe:
            logger.warning("QA result persist failed (non-blocking): %s", _pqe)

        # Fix 4: drift detection — check running score delta across shots
        try:
            from .drift_detector import DriftDetector
            dd = DriftDetector(self.order_id)
            drift_flagged = await asyncio.get_event_loop().run_in_executor(
                None, dd.record_and_check, self.character_id, shot_index, qa_result.score
            )
            if drift_flagged:
                logger.warning(
                    "Drift detected on order=%s character=%s at shot=%d (score=%.3f)",
                    self.order_id, self.character_id, shot_index, qa_result.score,
                )
                asyncio.create_task(
                    _notify_drift(self.order_id, self.character_id, shot_index, qa_result)
                )
        except Exception as _dde:
            logger.warning("Drift detection failed (non-blocking): %s", _dde)

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
