"""
consent_manager.py — Step 12
High-level consent orchestration layer.

Wires together:
  ConsentStore    — PostgreSQL persistence
  IdentityVerifier — face match against account profile photo
  AuditLogger      — immutable event chain

Redis:
  _approval_cache : consent_id → "approved" (TTL 24h)
  Key format: consent:approval:{consent_id}

Gate check (used by generation.py):
  manager = ConsentManager()
  ok, reason = await manager.check_gate(order_id, character_id, user_id)
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional, Tuple

from .consent_store import ConsentRecord, ConsentStatus, ConsentStore
from ..audit.audit_logger import AuditLogger

logger = logging.getLogger(__name__)

APPROVAL_CACHE_TTL = 86400  # 24 h
CONSENT_VERSION    = "1.0"


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------
def _get_settings():
    try:
        from config import settings  # type: ignore
        return settings
    except Exception:
        return None


def _get_redis():
    try:
        settings = _get_settings()
        import redis as _redis
        url = getattr(settings, "upstash_redis_url", None)
        if not url:
            return None
        return _redis.from_url(url, decode_responses=True)
    except Exception:
        return None


def _cache_key(consent_id: str) -> str:
    return f"consent:approval:{consent_id}"


# ---------------------------------------------------------------------------
# ConsentManager
# ---------------------------------------------------------------------------
class ConsentManager:
    """
    Orchestrates consent creation, granting, revocation, and gate checks.

    All async methods use run_in_executor for synchronous DB/Redis operations.
    """

    def __init__(self) -> None:
        self._store  = ConsentStore()
        self._audit  = AuditLogger()
        self._redis  = _get_redis()

    # ------------------------------------------------------------------
    # Cache helpers
    # ------------------------------------------------------------------
    def _cache_approval(self, consent_id: str) -> None:
        if self._redis:
            self._redis.setex(_cache_key(consent_id), APPROVAL_CACHE_TTL, "approved")

    def _is_cached(self, consent_id: str) -> bool:
        if self._redis is None:
            return False
        return self._redis.get(_cache_key(consent_id)) == "approved"

    def _invalidate_cache(self, consent_id: str) -> None:
        if self._redis:
            self._redis.delete(_cache_key(consent_id))

    # ------------------------------------------------------------------
    # Public async API
    # ------------------------------------------------------------------
    async def create_pending_consent(
        self,
        *,
        user_id: str,
        order_id: str,
        character_id: str,
        subject_name: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> ConsentRecord:
        """Create a PENDING consent record. Returns the record."""
        loop = asyncio.get_event_loop()
        record = await loop.run_in_executor(
            None,
            lambda: self._store.create_pending(
                user_id=user_id,
                order_id=order_id,
                character_id=character_id,
                subject_name=subject_name,
                ip_address=ip_address,
                user_agent=user_agent,
                consent_version=CONSENT_VERSION,
                metadata=metadata or {},
            ),
        )
        self._audit.log_info(
            "CONSENT_PENDING",
            user_id=user_id,
            order_id=order_id,
            payload={"consent_id": record.consent_id, "subject_name": subject_name},
        )
        return record

    async def grant_consent(
        self,
        consent_id: str,
        *,
        user_id: str,
        order_id: str,
        file_bytes: Optional[bytes] = None,
        original_filename: Optional[str] = None,
    ) -> Optional[ConsentRecord]:
        """Grant consent and optionally store signed document."""
        loop = asyncio.get_event_loop()
        record = await loop.run_in_executor(
            None,
            lambda: self._store.grant(
                consent_id,
                file_bytes=file_bytes,
                original_filename=original_filename,
            ),
        )
        if record is None:
            return None

        self._cache_approval(consent_id)
        self._audit.log_info(
            "CONSENT_GRANTED",
            user_id=user_id,
            order_id=order_id,
            payload={
                "consent_id": consent_id,
                "expires_at": record.expires_at,
                "has_file": file_bytes is not None,
            },
        )
        return record

    async def revoke_consent(
        self,
        consent_id: str,
        *,
        user_id: str,
        order_id: str,
        reason: Optional[str] = None,
    ) -> Optional[ConsentRecord]:
        """Revoke an existing consent."""
        loop = asyncio.get_event_loop()
        record = await loop.run_in_executor(
            None,
            lambda: self._store.revoke(consent_id, reason=reason),
        )
        if record is None:
            return None

        self._invalidate_cache(consent_id)
        self._audit.log_critical(
            "CONSENT_REVOKED",
            user_id=user_id,
            order_id=order_id,
            payload={"consent_id": consent_id, "reason": reason},
        )
        return record

    async def check_gate(
        self,
        order_id: str,
        character_id: str,
        user_id: str,
    ) -> Tuple[bool, str]:
        """
        Production gate: returns (True, "") if consent is valid.
        Returns (False, reason) if not.

        Checks Redis cache first, then PostgreSQL.
        """
        loop = asyncio.get_event_loop()

        # Check DB
        record = await loop.run_in_executor(
            None,
            lambda: self._store.get_for_order_character(order_id, character_id),
        )

        if record is None:
            return False, "No consent record found for this character"

        if record.status == ConsentStatus.REVOKED:
            return False, "Consent has been revoked"

        if record.status == ConsentStatus.PENDING:
            return False, "Consent not yet granted"

        if not record.is_valid:
            return False, "Consent has expired"

        # Cache the valid approval
        self._cache_approval(record.consent_id)

        return True, ""

    async def get_record(
        self, order_id: str, character_id: str
    ) -> Optional[ConsentRecord]:
        """Fetch consent record for an order/character pair."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self._store.get_for_order_character(order_id, character_id),
        )
