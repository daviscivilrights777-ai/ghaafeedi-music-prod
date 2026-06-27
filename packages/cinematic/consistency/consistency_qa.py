"""
consistency_qa.py — Step 8
Post-generation QA for character consistency.

Level 3: InsightFace similarity check (lazy import).
Fallback:  SSIM structural similarity when InsightFace is not installed.

Key behaviours:
- Double-fail on the same shot → should_pause_job() returns True
- Fail counter is per (order_id, shot_index) stored in Redis (TTL 24h)
- Thresholds pulled from config; hardcoded defaults if config unavailable
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from typing import Optional

import httpx
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy imports
# ---------------------------------------------------------------------------
try:
    import insightface  # noqa: F401
    from insightface.app import FaceAnalysis
    _INSIGHTFACE_AVAILABLE = True
except ImportError:
    _INSIGHTFACE_AVAILABLE = False
    logger.warning("insightface not installed — Level 3 QA will use SSIM fallback")

try:
    from skimage.metrics import structural_similarity as ssim
    from skimage.color import rgb2gray
    import skimage.transform as sktr
    _SKIMAGE_AVAILABLE = True
except ImportError:
    _SKIMAGE_AVAILABLE = False
    logger.warning("scikit-image not installed — SSIM fallback unavailable")


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------
def _get_threshold(key: str, default: float) -> float:
    try:
        from config import settings  # type: ignore
        return getattr(settings, key, default)
    except Exception:
        return default


FACE_SIMILARITY_THRESHOLD = lambda: _get_threshold("face_similarity_threshold", 0.55)
SSIM_THRESHOLD            = lambda: _get_threshold("ssim_threshold", 0.45)
DOUBLE_FAIL_REDIS_TTL     = 86400  # 24 h


# ---------------------------------------------------------------------------
# Redis helper (Upstash)
# ---------------------------------------------------------------------------
def _get_redis():
    try:
        from config import settings  # type: ignore
        import redis as _redis
        return _redis.from_url(settings.upstash_redis_url, decode_responses=True)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------
@dataclass
class QAResult:
    passed: bool
    score: float
    method: str           # "insightface" | "ssim" | "skip"
    message: str
    fail_count: int = 0   # cumulative fails for this shot


# ---------------------------------------------------------------------------
# Image utilities
# ---------------------------------------------------------------------------
def _fetch_image_bytes(url_or_bytes: str | bytes) -> bytes:
    if isinstance(url_or_bytes, bytes):
        return url_or_bytes
    resp = httpx.get(url_or_bytes, timeout=30)
    resp.raise_for_status()
    return resp.content


def _decode_rgb(raw: bytes) -> np.ndarray:
    """Decode image bytes → float32 RGB ndarray [H, W, 3]."""
    from PIL import Image
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return np.array(img, dtype=np.float32) / 255.0


# ---------------------------------------------------------------------------
# InsightFace similarity
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
            return None
    return _face_app


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def _insightface_score(ref_bytes: bytes, gen_bytes: bytes) -> Optional[float]:
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

        faces_ref = app.get(_to_bgr(ref_bytes))
        faces_gen = app.get(_to_bgr(gen_bytes))

        if not faces_ref or not faces_gen:
            return None  # no face detected — skip score

        emb_ref = faces_ref[0].embedding
        emb_gen = faces_gen[0].embedding
        return _cosine_similarity(emb_ref, emb_gen)
    except Exception as exc:
        logger.warning("InsightFace scoring failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# SSIM fallback
# ---------------------------------------------------------------------------
def _ssim_score(ref_bytes: bytes, gen_bytes: bytes) -> Optional[float]:
    if not _SKIMAGE_AVAILABLE:
        return None
    try:
        ref_arr = _decode_rgb(ref_bytes)
        gen_arr = _decode_rgb(gen_bytes)

        # Resize gen to match ref dimensions
        if ref_arr.shape != gen_arr.shape:
            gen_arr = sktr.resize(gen_arr, ref_arr.shape, anti_aliasing=True)

        ref_gray = rgb2gray(ref_arr)
        gen_gray = rgb2gray(gen_arr)
        score = ssim(ref_gray, gen_gray, data_range=1.0)
        return float(score)
    except Exception as exc:
        logger.warning("SSIM scoring failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Fail counter (Redis)
# ---------------------------------------------------------------------------
def _fail_key(order_id: str, shot_index: int) -> str:
    return f"qa:fail:{order_id}:{shot_index}"


def _increment_fail(order_id: str, shot_index: int) -> int:
    """Increment fail counter in Redis. Returns new count."""
    rc = _get_redis()
    if rc is None:
        # No Redis — use in-process dict (not production-safe but won't crash)
        _MEM_FAILS.setdefault((order_id, shot_index), 0)
        _MEM_FAILS[(order_id, shot_index)] += 1
        return _MEM_FAILS[(order_id, shot_index)]
    key = _fail_key(order_id, shot_index)
    count = rc.incr(key)
    rc.expire(key, DOUBLE_FAIL_REDIS_TTL)
    return int(count)


def _get_fail_count(order_id: str, shot_index: int) -> int:
    rc = _get_redis()
    if rc is None:
        return _MEM_FAILS.get((order_id, shot_index), 0)
    val = rc.get(_fail_key(order_id, shot_index))
    return int(val) if val else 0


def _reset_fail(order_id: str, shot_index: int) -> None:
    rc = _get_redis()
    if rc is None:
        _MEM_FAILS.pop((order_id, shot_index), None)
        return
    rc.delete(_fail_key(order_id, shot_index))


_MEM_FAILS: dict[tuple[str, int], int] = {}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def check_shot(
    ref_image: str | bytes,
    generated_image: str | bytes,
    order_id: str,
    shot_index: int,
) -> QAResult:
    """
    Compare a reference character image against a generated shot frame.

    Returns QAResult with passed/score/method and cumulative fail_count.
    """
    try:
        ref_bytes = _fetch_image_bytes(ref_image)
        gen_bytes = _fetch_image_bytes(generated_image)
    except Exception as exc:
        logger.error("QA image fetch failed: %s", exc)
        return QAResult(
            passed=False,
            score=0.0,
            method="skip",
            message=f"Image fetch error: {exc}",
            fail_count=_get_fail_count(order_id, shot_index),
        )

    # --- Try InsightFace first ---
    score = _insightface_score(ref_bytes, gen_bytes)
    method = "insightface"
    threshold = FACE_SIMILARITY_THRESHOLD()

    if score is None:
        # Fall back to SSIM
        score = _ssim_score(ref_bytes, gen_bytes)
        method = "ssim"
        threshold = SSIM_THRESHOLD()

    if score is None:
        # Both methods unavailable — skip QA, allow job to continue
        logger.warning("QA skipped (no scoring method available) for order=%s shot=%d", order_id, shot_index)
        return QAResult(
            passed=True,
            score=0.0,
            method="skip",
            message="No scoring method available — QA skipped",
            fail_count=_get_fail_count(order_id, shot_index),
        )

    passed = score >= threshold

    if not passed:
        fail_count = _increment_fail(order_id, shot_index)
        message = (
            f"Score {score:.3f} below threshold {threshold:.3f} "
            f"(method={method}, fails={fail_count})"
        )
        logger.warning("QA FAIL order=%s shot=%d %s", order_id, shot_index, message)
    else:
        fail_count = _get_fail_count(order_id, shot_index)
        _reset_fail(order_id, shot_index)  # clear on pass
        message = f"Score {score:.3f} >= threshold {threshold:.3f} (method={method})"
        logger.info("QA PASS order=%s shot=%d %s", order_id, shot_index, message)

    return QAResult(
        passed=passed,
        score=score,
        method=method,
        message=message,
        fail_count=fail_count,
    )


def should_pause_job(order_id: str, shot_index: int) -> bool:
    """
    Returns True if this shot has failed QA twice or more.
    Caller should pause the job and email the customer.
    """
    return _get_fail_count(order_id, shot_index) >= 2
