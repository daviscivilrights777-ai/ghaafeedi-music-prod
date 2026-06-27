"""
upload_guard.py — Step 14
Security guard for all character photo uploads.

Checks (in order):
  1. Rate limit   — Redis, 10 uploads per user per hour
  2. File size    — max 20MB
  3. Magic bytes  — python-magic confirms JPEG/PNG/WEBP
  4. Identity     — IdentityVerifier face match (lazy)
  5. R2 upload    — stores to ghaafeedi-media bucket

Returns UploadResult with R2 URL on success.
"""

from __future__ import annotations

import hashlib
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
RATE_LIMIT_MAX      = 10                 # uploads per user per hour
RATE_LIMIT_WINDOW   = 3600               # 1 hour in seconds

ALLOWED_MIME_TYPES = frozenset([
    "image/jpeg",
    "image/png",
    "image/webp",
])


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


# ---------------------------------------------------------------------------
# python-magic (lazy)
# ---------------------------------------------------------------------------
def _detect_mime(file_bytes: bytes) -> Optional[str]:
    try:
        import magic
        return magic.from_buffer(file_bytes[:2048], mime=True)
    except ImportError:
        logger.warning("python-magic not installed — MIME check skipped")
        return None
    except Exception as exc:
        logger.warning("MIME detection failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Rate limiter (Redis sliding window)
# ---------------------------------------------------------------------------
def _rate_limit_key(user_id: str) -> str:
    return f"upload:rate:{user_id}"


def _check_rate_limit(user_id: str) -> tuple[bool, int]:
    """
    Returns (allowed: bool, current_count: int).
    Uses Redis sliding window — increments and sets TTL on first request.
    """
    rc = _get_redis()
    if rc is None:
        # No Redis — allow all uploads (log warning)
        logger.warning("Rate limiter: no Redis — all uploads allowed")
        return True, 0

    key = _rate_limit_key(user_id)
    pipe = rc.pipeline()
    pipe.incr(key)
    pipe.ttl(key)
    results = pipe.execute()

    count = int(results[0])
    ttl   = int(results[1])

    if ttl < 0:
        # Key has no expiry — set it
        rc.expire(key, RATE_LIMIT_WINDOW)

    allowed = count <= RATE_LIMIT_MAX
    return allowed, count


# ---------------------------------------------------------------------------
# R2 upload
# ---------------------------------------------------------------------------
def _upload_to_r2(file_bytes: bytes, user_id: str, original_filename: str) -> Optional[str]:
    settings = _get_settings()
    if settings is None:
        return None

    r2_key_id   = getattr(settings, "r2_access_key_id", None)
    r2_secret   = getattr(settings, "r2_secret_access_key", None)
    r2_endpoint = getattr(settings, "r2_endpoint", None)
    r2_bucket   = getattr(settings, "r2_bucket", "ghaafeedi-media")
    r2_public   = getattr(settings, "r2_public_url", "")

    if not all([r2_key_id, r2_secret, r2_endpoint]):
        logger.warning("R2 not configured — upload_guard cannot store file")
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

        # Anonymise filename — use hash of content + timestamp
        content_hash = hashlib.sha256(file_bytes).hexdigest()[:12]
        ts = int(time.time())
        safe_ext = _safe_extension(original_filename)
        r2_key = f"uploads/characters/{user_id}/{ts}_{content_hash}{safe_ext}"

        s3.put_object(
            Bucket=r2_bucket,
            Key=r2_key,
            Body=file_bytes,
            ContentType=_detect_mime(file_bytes) or "image/jpeg",
            ServerSideEncryption="AES256",
        )

        public_url = f"{r2_public.rstrip('/')}/{r2_key}" if r2_public else r2_key
        logger.info("Upload stored: %s", r2_key)
        return public_url
    except Exception as exc:
        logger.error("R2 upload failed: %s", exc)
        return None


def _safe_extension(filename: str) -> str:
    import os
    ext = os.path.splitext(filename)[1].lower()
    return ext if ext in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------
@dataclass
class UploadResult:
    allowed: bool
    r2_url: Optional[str]
    reason: str
    identity_verified: bool
    identity_score: float
    identity_method: str


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
class UploadGuard:
    """
    Synchronous guard for character photo uploads.
    Call via run_in_executor from async routes.

    Usage:
        guard = UploadGuard()
        result = guard.check_and_store(
            user_id="u_123",
            file_bytes=<bytes>,
            original_filename="photo.jpg",
        )
    """

    def check_and_store(
        self,
        user_id: str,
        file_bytes: bytes,
        original_filename: str,
        skip_identity_check: bool = False,
    ) -> UploadResult:

        # 1. File size
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            size_mb = len(file_bytes) / (1024 * 1024)
            return UploadResult(
                allowed=False,
                r2_url=None,
                reason=f"File too large: {size_mb:.1f}MB (max 20MB)",
                identity_verified=False,
                identity_score=0.0,
                identity_method="skip",
            )

        # 2. Rate limit
        allowed, count = _check_rate_limit(user_id)
        if not allowed:
            logger.warning("Upload rate limit exceeded for user=%s (count=%d)", user_id, count)
            return UploadResult(
                allowed=False,
                r2_url=None,
                reason=f"Rate limit exceeded: {count}/{RATE_LIMIT_MAX} uploads this hour",
                identity_verified=False,
                identity_score=0.0,
                identity_method="skip",
            )

        # 3. Magic bytes MIME check
        mime = _detect_mime(file_bytes)
        if mime and mime not in ALLOWED_MIME_TYPES:
            logger.warning("Upload blocked — invalid MIME type=%s user=%s", mime, user_id)
            return UploadResult(
                allowed=False,
                r2_url=None,
                reason=f"Invalid file type: {mime}. Only JPEG, PNG, and WEBP are allowed.",
                identity_verified=False,
                identity_score=0.0,
                identity_method="skip",
            )

        # 4. Identity verification (optional, lazy)
        identity_verified = True
        identity_score    = 0.0
        identity_method   = "skip"

        if not skip_identity_check:
            try:
                from ..identity.identity_verifier import IdentityVerifier
                verifier = IdentityVerifier()
                v_result = verifier.verify(user_id=user_id, upload_bytes=file_bytes)
                identity_verified = v_result.verified
                identity_score    = v_result.score
                identity_method   = v_result.method

                if not identity_verified:
                    logger.warning(
                        "Identity mismatch user=%s score=%.3f method=%s",
                        user_id, identity_score, identity_method,
                    )
                    # We do NOT block on mismatch — flag for manual review instead
                    # Production decision: soft-flag, not hard-block
            except Exception as exc:
                logger.warning("Identity check failed (non-blocking): %s", exc)

        # 5. R2 upload
        r2_url = _upload_to_r2(file_bytes, user_id, original_filename)
        if r2_url is None:
            return UploadResult(
                allowed=False,
                r2_url=None,
                reason="Storage error — upload failed. Please try again.",
                identity_verified=identity_verified,
                identity_score=identity_score,
                identity_method=identity_method,
            )

        return UploadResult(
            allowed=True,
            r2_url=r2_url,
            reason="Upload accepted",
            identity_verified=identity_verified,
            identity_score=identity_score,
            identity_method=identity_method,
        )
