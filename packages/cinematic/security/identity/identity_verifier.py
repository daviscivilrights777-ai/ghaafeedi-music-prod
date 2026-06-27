"""
identity_verifier.py — Step 13
Verify that an uploaded character photo belongs to the account holder.

Approach:
  1. Fetch the account profile photo from PostgreSQL profiles table.
  2. Use InsightFace to compare embeddings (lazy import).
  3. SSIM fallback if InsightFace not available.
  4. Returns (verified: bool, score: float, method: str).

US-only scope: no GDPR data minimisation fields.
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass
from typing import Optional, Tuple

import httpx
import numpy as np

logger = logging.getLogger(__name__)

# Similarity thresholds
FACE_VERIFY_THRESHOLD = 0.50   # slightly lower than QA — looser for selfie vs professional photo
SSIM_VERIFY_THRESHOLD = 0.40


# ---------------------------------------------------------------------------
# Lazy imports
# ---------------------------------------------------------------------------
try:
    import insightface  # noqa: F401
    from insightface.app import FaceAnalysis
    _INSIGHTFACE_AVAILABLE = True
except ImportError:
    _INSIGHTFACE_AVAILABLE = False
    logger.warning("insightface not installed — IdentityVerifier will use SSIM fallback")

try:
    from skimage.metrics import structural_similarity as ssim
    from skimage.color import rgb2gray
    import skimage.transform as sktr
    _SKIMAGE_AVAILABLE = True
except ImportError:
    _SKIMAGE_AVAILABLE = False


# ---------------------------------------------------------------------------
# Config + DB
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
        logger.error("identity_verifier DB connect failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Image utilities
# ---------------------------------------------------------------------------
def _fetch_bytes(url_or_bytes: str | bytes) -> bytes:
    if isinstance(url_or_bytes, bytes):
        return url_or_bytes
    resp = httpx.get(url_or_bytes, timeout=30)
    resp.raise_for_status()
    return resp.content


def _decode_rgb(raw: bytes) -> np.ndarray:
    from PIL import Image
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return np.array(img, dtype=np.float32) / 255.0


# ---------------------------------------------------------------------------
# InsightFace
# ---------------------------------------------------------------------------
_face_app: Optional["FaceAnalysis"] = None


def _get_face_app() -> Optional["FaceAnalysis"]:
    global _face_app
    if not _INSIGHTFACE_AVAILABLE:
        return None
    if _face_app is None:
        try:
            app = FaceAnalysis(providers=["CPUExecutionProvider"])
            app.prepare(ctx_id=0, det_size=(640, 640))
            _face_app = app
        except Exception as exc:
            logger.error("InsightFace init failed: %s", exc)
    return _face_app


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def _insightface_compare(ref_bytes: bytes, upload_bytes: bytes) -> Optional[float]:
    app = _get_face_app()
    if app is None:
        return None
    try:
        from PIL import Image
        import cv2

        def _to_bgr(raw: bytes) -> np.ndarray:
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            arr = np.array(img)
            return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

        faces_ref    = app.get(_to_bgr(ref_bytes))
        faces_upload = app.get(_to_bgr(upload_bytes))

        if not faces_ref or not faces_upload:
            return None

        return _cosine_sim(faces_ref[0].embedding, faces_upload[0].embedding)
    except Exception as exc:
        logger.warning("InsightFace compare failed: %s", exc)
        return None


def _ssim_compare(ref_bytes: bytes, upload_bytes: bytes) -> Optional[float]:
    if not _SKIMAGE_AVAILABLE:
        return None
    try:
        ref = _decode_rgb(ref_bytes)
        upl = _decode_rgb(upload_bytes)
        if ref.shape != upl.shape:
            upl = sktr.resize(upl, ref.shape, anti_aliasing=True)
        return float(ssim(rgb2gray(ref), rgb2gray(upl), data_range=1.0))
    except Exception as exc:
        logger.warning("SSIM compare failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Profile photo lookup
# ---------------------------------------------------------------------------
def _get_profile_photo_url(user_id: str) -> Optional[str]:
    """Fetch profile photo URL from PostgreSQL profiles table."""
    conn = _get_db_conn()
    if conn is None:
        return None
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT avatar_url FROM profiles WHERE user_id = %s LIMIT 1",
            (user_id,),
        )
        row = cur.fetchone()
        return row[0] if row else None
    except Exception as exc:
        logger.warning("profile photo lookup failed: %s", exc)
        return None
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------
@dataclass
class VerifyResult:
    verified: bool
    score: float
    method: str
    message: str


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
class IdentityVerifier:
    """
    Compare an uploaded character photo against the account holder's profile photo.

    Usage (sync — call via run_in_executor from async code):
        verifier = IdentityVerifier()
        result = verifier.verify(user_id="u_123", upload_bytes=<bytes>)
    """

    def verify(
        self,
        user_id: str,
        upload_bytes: bytes,
    ) -> VerifyResult:
        """
        Returns VerifyResult.
        If no profile photo exists, returns verified=True (trust-on-upload fallback).
        """
        profile_url = _get_profile_photo_url(user_id)
        if not profile_url:
            # No profile photo to compare — allow upload, log for manual review
            logger.info("No profile photo for user=%s — identity check skipped", user_id)
            return VerifyResult(
                verified=True,
                score=0.0,
                method="skip",
                message="No profile photo on file — upload accepted with manual review flag",
            )

        try:
            ref_bytes = _fetch_bytes(profile_url)
        except Exception as exc:
            logger.warning("Could not fetch profile photo for user=%s: %s", user_id, exc)
            return VerifyResult(
                verified=True,
                score=0.0,
                method="skip",
                message=f"Profile photo fetch failed — skipping: {exc}",
            )

        # Try InsightFace first
        score = _insightface_compare(ref_bytes, upload_bytes)
        method = "insightface"
        threshold = FACE_VERIFY_THRESHOLD

        if score is None:
            score = _ssim_compare(ref_bytes, upload_bytes)
            method = "ssim"
            threshold = SSIM_VERIFY_THRESHOLD

        if score is None:
            return VerifyResult(
                verified=True,
                score=0.0,
                method="skip",
                message="No scoring method available — skipped",
            )

        verified = score >= threshold
        msg = (
            f"{'VERIFIED' if verified else 'MISMATCH'} "
            f"score={score:.3f} threshold={threshold:.3f} method={method}"
        )
        logger.info("Identity check user=%s %s", user_id, msg)

        return VerifyResult(verified=verified, score=score, method=method, message=msg)
