"""
consent_store.py — Step 11
Persistent storage layer for character appearance consent records.

Storage:
  - Consent records → PostgreSQL `consent_records` table
  - Signed consent files (PDF/image) → Cloudflare R2 (encrypted filename)

Consent lifecycle:
  PENDING → GRANTED → (optionally) REVOKED

US-only launch scope: no GDPR/PIPEDA fields in this version.
timedelta bug fix: uses timedelta(days=365*5) NOT timedelta(years=5).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)

# Consent valid for 5 years from grant date
CONSENT_DURATION_DAYS = 365 * 5  # Bug fix: was timedelta(years=5) — invalid in Python


class ConsentStatus(str, Enum):
    PENDING  = "PENDING"
    GRANTED  = "GRANTED"
    REVOKED  = "REVOKED"
    EXPIRED  = "EXPIRED"


@dataclass
class ConsentRecord:
    consent_id: str
    user_id: str
    order_id: str
    character_id: str
    subject_name: str          # name of the person appearing in content
    status: ConsentStatus
    granted_at: Optional[str]  # ISO-8601 UTC
    expires_at: Optional[str]  # ISO-8601 UTC
    revoked_at: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    consent_version: str       # e.g. "1.0"
    file_r2_key: Optional[str] # R2 key for signed consent document
    metadata: dict

    @property
    def is_valid(self) -> bool:
        if self.status != ConsentStatus.GRANTED:
            return False
        if self.expires_at:
            exp = datetime.fromisoformat(self.expires_at)
            if datetime.now(timezone.utc) > exp:
                return False
        return True


# ---------------------------------------------------------------------------
# Config / DB helpers
# ---------------------------------------------------------------------------
def _get_settings():
    try:
        from config import settings  # type: ignore
        return settings
    except Exception:
        return None


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
        logger.error("consent_store DB connect failed: %s", exc)
        return None


def _ensure_table(conn) -> None:
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS consent_records (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            consent_id       UUID NOT NULL UNIQUE,
            user_id          TEXT NOT NULL,
            order_id         TEXT NOT NULL,
            character_id     TEXT NOT NULL,
            subject_name     TEXT NOT NULL,
            status           TEXT NOT NULL DEFAULT 'PENDING',
            granted_at       TIMESTAMPTZ,
            expires_at       TIMESTAMPTZ,
            revoked_at       TIMESTAMPTZ,
            ip_address       TEXT,
            user_agent       TEXT,
            consent_version  TEXT NOT NULL DEFAULT '1.0',
            file_r2_key      TEXT,
            metadata         JSONB DEFAULT '{}',
            created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_consent_user      ON consent_records(user_id);
        CREATE INDEX IF NOT EXISTS idx_consent_order     ON consent_records(order_id);
        CREATE INDEX IF NOT EXISTS idx_consent_character ON consent_records(character_id);
        CREATE INDEX IF NOT EXISTS idx_consent_status    ON consent_records(status);
    """)
    conn.commit()


# ---------------------------------------------------------------------------
# R2 storage for consent documents
# ---------------------------------------------------------------------------
def _upload_consent_file(file_bytes: bytes, original_filename: str) -> Optional[str]:
    """
    Upload a signed consent document to R2.
    Returns the R2 key, or None on failure.
    Filename is hashed to avoid PII in storage keys.
    """
    settings = _get_settings()
    if settings is None:
        return None

    r2_key_id  = getattr(settings, "r2_access_key_id", None)
    r2_secret  = getattr(settings, "r2_secret_access_key", None)
    r2_endpoint = getattr(settings, "r2_endpoint", None)
    r2_bucket  = getattr(settings, "r2_bucket", "ghaafeedi-media")

    if not all([r2_key_id, r2_secret, r2_endpoint]):
        logger.warning("R2 not configured — consent file not stored")
        return None

    try:
        import boto3
        from botocore.config import Config

        s3 = boto3.client(
            "s3",
            endpoint_url=r2_endpoint,
            aws_access_key_id=r2_key_id,
            aws_secret_access_key=r2_secret,
            config=Config(signature_version="s3v4"),
        )

        # Hash the filename to avoid PII in R2 keys
        file_hash = hashlib.sha256(original_filename.encode() + str(time.time()).encode()).hexdigest()[:16]
        ext = os.path.splitext(original_filename)[1] or ".pdf"
        r2_key = f"consent/{file_hash}{ext}"

        s3.put_object(
            Bucket=r2_bucket,
            Key=r2_key,
            Body=file_bytes,
            ContentType="application/pdf" if ext == ".pdf" else "image/jpeg",
            ServerSideEncryption="AES256",
        )
        logger.info("Consent file stored at R2 key: %s", r2_key)
        return r2_key
    except Exception as exc:
        logger.error("R2 consent file upload failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
class ConsentStore:
    """
    CRUD operations for consent records.

    All methods operate synchronously (called via run_in_executor from async code).
    """

    def create_pending(
        self,
        *,
        user_id: str,
        order_id: str,
        character_id: str,
        subject_name: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        consent_version: str = "1.0",
        metadata: Optional[dict] = None,
    ) -> ConsentRecord:
        """Create a PENDING consent record. Returns the new record."""
        consent_id = str(uuid.uuid4())
        record = ConsentRecord(
            consent_id=consent_id,
            user_id=user_id,
            order_id=order_id,
            character_id=character_id,
            subject_name=subject_name,
            status=ConsentStatus.PENDING,
            granted_at=None,
            expires_at=None,
            revoked_at=None,
            ip_address=ip_address,
            user_agent=user_agent,
            consent_version=consent_version,
            file_r2_key=None,
            metadata=metadata or {},
        )
        self._upsert(record)
        return record

    def grant(
        self,
        consent_id: str,
        *,
        file_bytes: Optional[bytes] = None,
        original_filename: Optional[str] = None,
    ) -> Optional[ConsentRecord]:
        """
        Transition a PENDING consent to GRANTED.
        Optionally uploads the signed consent document to R2.
        """
        record = self.get_by_id(consent_id)
        if record is None:
            logger.error("grant: consent_id not found: %s", consent_id)
            return None

        if record.status == ConsentStatus.REVOKED:
            logger.error("grant: cannot grant a REVOKED consent: %s", consent_id)
            return None

        now = datetime.now(timezone.utc)
        # BUG FIX: timedelta(years=5) is invalid in Python.
        # Use timedelta(days=365*5) = 1825 days.
        expires = now + timedelta(days=CONSENT_DURATION_DAYS)

        record.status = ConsentStatus.GRANTED
        record.granted_at = now.isoformat()
        record.expires_at = expires.isoformat()

        if file_bytes and original_filename:
            r2_key = _upload_consent_file(file_bytes, original_filename)
            record.file_r2_key = r2_key

        self._upsert(record)
        logger.info("Consent GRANTED: %s (expires %s)", consent_id, expires.date())
        return record

    def revoke(
        self,
        consent_id: str,
        *,
        reason: Optional[str] = None,
    ) -> Optional[ConsentRecord]:
        """Revoke a previously granted consent."""
        record = self.get_by_id(consent_id)
        if record is None:
            return None

        now = datetime.now(timezone.utc)
        record.status = ConsentStatus.REVOKED
        record.revoked_at = now.isoformat()
        if reason:
            record.metadata["revocation_reason"] = reason

        self._upsert(record)
        logger.info("Consent REVOKED: %s (reason=%s)", consent_id, reason)
        return record

    def get_by_id(self, consent_id: str) -> Optional[ConsentRecord]:
        conn = _get_db_conn()
        if conn is None:
            return None
        try:
            _ensure_table(conn)
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM consent_records WHERE consent_id = %s LIMIT 1",
                (consent_id,),
            )
            row = cur.fetchone()
            if row is None:
                return None
            return self._row_to_record(cur, row)
        except Exception as exc:
            logger.error("get_by_id failed: %s", exc)
            return None
        finally:
            conn.close()

    def get_for_order_character(
        self, order_id: str, character_id: str
    ) -> Optional[ConsentRecord]:
        """Return the most recent non-revoked consent for this order/character pair."""
        conn = _get_db_conn()
        if conn is None:
            return None
        try:
            _ensure_table(conn)
            cur = conn.cursor()
            cur.execute(
                """
                SELECT * FROM consent_records
                WHERE order_id = %s AND character_id = %s
                  AND status != 'REVOKED'
                ORDER BY created_at DESC LIMIT 1
                """,
                (order_id, character_id),
            )
            row = cur.fetchone()
            if row is None:
                return None
            return self._row_to_record(cur, row)
        except Exception as exc:
            logger.error("get_for_order_character failed: %s", exc)
            return None
        finally:
            conn.close()

    def is_valid(self, order_id: str, character_id: str) -> bool:
        """Returns True if a valid (GRANTED, non-expired) consent exists."""
        record = self.get_for_order_character(order_id, character_id)
        if record is None:
            return False
        return record.is_valid

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    def _upsert(self, record: ConsentRecord) -> None:
        conn = _get_db_conn()
        if conn is None:
            logger.warning("consent_store: no DB — record not persisted")
            return
        try:
            _ensure_table(conn)
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO consent_records
                    (consent_id, user_id, order_id, character_id, subject_name,
                     status, granted_at, expires_at, revoked_at,
                     ip_address, user_agent, consent_version, file_r2_key, metadata)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (consent_id) DO UPDATE SET
                    status          = EXCLUDED.status,
                    granted_at      = EXCLUDED.granted_at,
                    expires_at      = EXCLUDED.expires_at,
                    revoked_at      = EXCLUDED.revoked_at,
                    file_r2_key     = EXCLUDED.file_r2_key,
                    metadata        = EXCLUDED.metadata,
                    updated_at      = NOW()
                """,
                (
                    record.consent_id,
                    record.user_id,
                    record.order_id,
                    record.character_id,
                    record.subject_name,
                    record.status.value,
                    record.granted_at,
                    record.expires_at,
                    record.revoked_at,
                    record.ip_address,
                    record.user_agent,
                    record.consent_version,
                    record.file_r2_key,
                    json.dumps(record.metadata),
                ),
            )
            conn.commit()
        except Exception as exc:
            conn.rollback()
            logger.error("consent_store _upsert failed: %s", exc)
        finally:
            conn.close()

    @staticmethod
    def _row_to_record(cur, row) -> ConsentRecord:
        cols = [desc[0] for desc in cur.description]
        d = dict(zip(cols, row))
        return ConsentRecord(
            consent_id=str(d["consent_id"]),
            user_id=d["user_id"],
            order_id=d["order_id"],
            character_id=d["character_id"],
            subject_name=d["subject_name"],
            status=ConsentStatus(d["status"]),
            granted_at=d["granted_at"].isoformat() if d["granted_at"] else None,
            expires_at=d["expires_at"].isoformat() if d["expires_at"] else None,
            revoked_at=d["revoked_at"].isoformat() if d["revoked_at"] else None,
            ip_address=d.get("ip_address"),
            user_agent=d.get("user_agent"),
            consent_version=d.get("consent_version", "1.0"),
            file_r2_key=d.get("file_r2_key"),
            metadata=d.get("metadata") or {},
        )
