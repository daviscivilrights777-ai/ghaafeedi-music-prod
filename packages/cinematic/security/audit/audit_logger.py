"""
audit_logger.py — Step 10
Immutable audit chain for all character consent + identity events.

Chain integrity: each entry HMAC-chains to the previous hash (stored in Redis).
Storage: PostgreSQL `audit_log` table (auto-created on first use).
Security alerts: Resend → trust@ghaafeedimusic.com on CRITICAL events.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
import uuid
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)

TRUST_EMAIL = "trust@ghaafeedimusic.com"
ALERT_EVENTS = frozenset([
    "CONSENT_REVOKED",
    "IDENTITY_MISMATCH",
    "UPLOAD_BLOCKED",
    "DMCA_TAKEDOWN",
    "FRAUD_DETECTED",
    "ACCOUNT_SUSPENDED",
])


class AuditLevel(str, Enum):
    INFO     = "INFO"
    WARNING  = "WARNING"
    CRITICAL = "CRITICAL"


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------
def _get_settings():
    try:
        from config import settings  # type: ignore
        return settings
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Redis — last hash anchor
# ---------------------------------------------------------------------------
REDIS_HASH_KEY = "audit:last_hash"


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


def _get_prev_hash() -> str:
    rc = _get_redis()
    if rc is None:
        return "GENESIS"
    val = rc.get(REDIS_HASH_KEY)
    return val if val else "GENESIS"


def _set_prev_hash(new_hash: str) -> None:
    rc = _get_redis()
    if rc is not None:
        rc.set(REDIS_HASH_KEY, new_hash)


# ---------------------------------------------------------------------------
# HMAC chain
# ---------------------------------------------------------------------------
def _chain_hash(prev_hash: str, entry_json: str, secret: Optional[str]) -> str:
    """HMAC-SHA256 of prev_hash + entry_json."""
    key = (secret or "ghaafeedi-audit-chain").encode()
    msg = (prev_hash + entry_json).encode()
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------
# PostgreSQL
# ---------------------------------------------------------------------------
def _get_db_conn():
    settings = _get_settings()
    if settings is None:
        return None
    db_url = getattr(settings, "database_url", None)
    if not db_url:
        return None
    try:
        import psycopg2
        return psycopg2.connect(db_url)
    except Exception as exc:
        logger.error("audit_logger DB connect failed: %s", exc)
        return None


def _ensure_table(conn) -> None:
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            entry_id    UUID NOT NULL,
            event_type  TEXT NOT NULL,
            level       TEXT NOT NULL DEFAULT 'INFO',
            user_id     TEXT,
            order_id    TEXT,
            payload     JSONB,
            prev_hash   TEXT NOT NULL,
            chain_hash  TEXT NOT NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_order  ON audit_log(order_id);
        CREATE INDEX IF NOT EXISTS idx_audit_event  ON audit_log(event_type);
        CREATE INDEX IF NOT EXISTS idx_audit_ts     ON audit_log(created_at DESC);
    """)
    conn.commit()


def _insert_entry(
    conn,
    entry_id: str,
    event_type: str,
    level: str,
    user_id: Optional[str],
    order_id: Optional[str],
    payload: dict[str, Any],
    prev_hash: str,
    chain_hash: str,
) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO audit_log
            (id, entry_id, event_type, level, user_id, order_id, payload, prev_hash, chain_hash)
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            str(uuid.uuid4()),
            entry_id,
            event_type,
            level,
            user_id,
            order_id,
            json.dumps(payload),
            prev_hash,
            chain_hash,
        ),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Resend alert
# ---------------------------------------------------------------------------
def _send_security_alert(
    event_type: str,
    user_id: Optional[str],
    order_id: Optional[str],
    payload: dict[str, Any],
    chain_hash: str,
) -> None:
    """Fire-and-forget security alert email. Non-blocking."""
    settings = _get_settings()
    if settings is None:
        return
    resend_key = getattr(settings, "resend_api_key", None)
    if not resend_key:
        logger.warning("RESEND_API_KEY missing — security alert not sent")
        return

    try:
        import httpx

        html = f"""
        <div style="font-family:Inter,sans-serif;background:#050B1A;color:#fff;padding:32px;">
          <h2 style="color:#EF4444;">🔐 Security Alert: {event_type}</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#9CA3AF;padding:4px 8px;">User</td>
                <td style="padding:4px 8px;">{user_id or "—"}</td></tr>
            <tr><td style="color:#9CA3AF;padding:4px 8px;">Order</td>
                <td style="padding:4px 8px;">{order_id or "—"}</td></tr>
            <tr><td style="color:#9CA3AF;padding:4px 8px;">Chain Hash</td>
                <td style="padding:4px 8px;font-family:monospace;font-size:11px;">{chain_hash[:32]}...</td></tr>
            <tr><td style="color:#9CA3AF;padding:4px 8px;">Payload</td>
                <td style="padding:4px 8px;font-family:monospace;font-size:11px;">
                  {json.dumps(payload, indent=2)[:500]}</td></tr>
          </table>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">
            Ghaafeedi Music Security System — {time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())}
          </p>
        </div>
        """

        httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}"},
            json={
                "from": "Ghaafeedi Security <no-reply@ghaafeedimusic.com>",
                "to": [TRUST_EMAIL],
                "subject": f"[SECURITY] {event_type} — Ghaafeedi Music",
                "html": html,
            },
            timeout=10,
        )
    except Exception as exc:
        logger.error("Security alert send failed: %s", exc)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
class AuditLogger:
    """
    Immutable audit chain logger.

    Usage:
        logger = AuditLogger()
        logger.log("CONSENT_GRANTED", user_id="u_123", order_id="ord_456",
                   payload={"product": "cinematic_life_story"})
    """

    def __init__(self) -> None:
        settings = _get_settings()
        self._secret = getattr(settings, "audit_chain_secret", None)

    def log(
        self,
        event_type: str,
        *,
        user_id: Optional[str] = None,
        order_id: Optional[str] = None,
        payload: Optional[dict[str, Any]] = None,
        level: AuditLevel = AuditLevel.INFO,
    ) -> str:
        """
        Append an audit entry to the chain.
        Returns the chain_hash of the new entry.
        """
        entry_id = str(uuid.uuid4())
        ts = time.time()
        _payload = payload or {}
        _payload["_ts"] = ts
        _payload["_entry_id"] = entry_id

        entry_json = json.dumps(
            {"event_type": event_type, "user_id": user_id, "order_id": order_id, **_payload},
            sort_keys=True,
        )

        prev_hash = _get_prev_hash()
        chain_hash = _chain_hash(prev_hash, entry_json, self._secret)
        _set_prev_hash(chain_hash)

        # Write to PostgreSQL
        conn = _get_db_conn()
        if conn:
            try:
                _ensure_table(conn)
                _insert_entry(
                    conn,
                    entry_id,
                    event_type,
                    level.value,
                    user_id,
                    order_id,
                    _payload,
                    prev_hash,
                    chain_hash,
                )
            except Exception as exc:
                logger.error("audit DB write failed: %s", exc)
            finally:
                conn.close()
        else:
            logger.warning("audit_logger: no DB — entry not persisted (entry_id=%s)", entry_id)

        # Security alert for critical events
        if event_type in ALERT_EVENTS or level == AuditLevel.CRITICAL:
            _send_security_alert(event_type, user_id, order_id, _payload, chain_hash)

        logger.info("AUDIT %s user=%s order=%s hash=%s...", event_type, user_id, order_id, chain_hash[:16])
        return chain_hash

    def log_info(self, event_type: str, **kwargs) -> str:
        return self.log(event_type, level=AuditLevel.INFO, **kwargs)

    def log_warning(self, event_type: str, **kwargs) -> str:
        return self.log(event_type, level=AuditLevel.WARNING, **kwargs)

    def log_critical(self, event_type: str, **kwargs) -> str:
        return self.log(event_type, level=AuditLevel.CRITICAL, **kwargs)
