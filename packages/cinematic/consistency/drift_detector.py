"""
drift_detector.py — Fix 4
Cross-shot character drift detection for Ghaafeedi Music.

Problem: Each shot may individually pass QA (score ≥ threshold) but the character
can slowly drift across the production — shot 1 looks great, shot 9 looks like a
different person.  This module detects that pattern.

Algorithm:
  - After each shot, record the QA score in Redis (sorted set per order+character).
  - Compute drift = baseline_score (shot 0) − current_score.
  - If drift exceeds DRIFT_THRESHOLD (default 0.12) → flag it.
  - Additionally track a rolling 3-shot moving average — if average drops more than
    ROLLING_DROP_THRESHOLD (default 0.08) below the baseline → also flag.

Storage:
  - Redis sorted set: key = drift:{order_id}:{character_id}
    member = "<shot_index>:<score>" (score as member not as ZADD score to avoid float precision)
    ZADD score = shot_index (for ordered retrieval)
  - TTL: 7 days (production window)
  - PostgreSQL: drift flags written to shot_qa_results.drift_flagged column
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thresholds — pulled from config if available, else defaults
# ---------------------------------------------------------------------------

def _get_threshold(key: str, default: float) -> float:
    try:
        from config import settings  # type: ignore
        return float(getattr(settings, key, default))
    except Exception:
        return default


def DRIFT_THRESHOLD() -> float:
    """Max allowed drop from baseline score before drift is flagged."""
    return _get_threshold("drift_threshold", 0.12)


def ROLLING_DROP_THRESHOLD() -> float:
    """Max allowed drop of 3-shot moving average below baseline."""
    return _get_threshold("drift_rolling_drop_threshold", 0.08)


DRIFT_REDIS_TTL = 7 * 24 * 3600  # 7 days
ROLLING_WINDOW  = 3               # shots for moving average


# ---------------------------------------------------------------------------
# Redis helper
# ---------------------------------------------------------------------------

def _get_redis():
    try:
        from config import settings  # type: ignore
        import redis as _redis
        url = getattr(settings, "upstash_redis_url", None) or getattr(settings, "redis_url", None)
        if not url:
            return None
        return _redis.from_url(url, decode_responses=True)
    except Exception:
        return None


def _drift_key(order_id: str, character_id: str) -> str:
    return f"drift:{order_id}:{character_id}"


# ---------------------------------------------------------------------------
# DriftDetector
# ---------------------------------------------------------------------------

class DriftDetector:
    """
    Per-order-per-character drift monitor.

    Usage:
        dd = DriftDetector(order_id="ord_abc123")
        drift_flagged = dd.record_and_check("char_primary", shot_index=3, score=0.48)
        if drift_flagged:
            # fire _notify_drift() from consistency_manager
    """

    def __init__(self, order_id: str) -> None:
        self.order_id = order_id
        self._mem_scores: dict[str, list[Tuple[int, float]]] = {}  # fallback if no Redis

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def record_and_check(
        self, character_id: str, shot_index: int, score: float
    ) -> bool:
        """
        Record this shot's QA score and check for drift.
        Returns True if drift is flagged (caller should notify).
        Non-blocking — errors are caught and logged.
        """
        try:
            self._record(character_id, shot_index, score)
            history = self._get_history(character_id)
            return self._check_drift(history, shot_index, score)
        except Exception as exc:
            logger.warning("DriftDetector.record_and_check failed: %s", exc)
            return False

    def get_history(self, character_id: str) -> List[Tuple[int, float]]:
        """Return [(shot_index, score), ...] ordered by shot_index."""
        return self._get_history(character_id)

    def baseline_score(self, character_id: str) -> Optional[float]:
        """Return the QA score from shot 0 (baseline)."""
        history = self._get_history(character_id)
        if not history:
            return None
        # sorted by shot_index ascending
        sorted_h = sorted(history, key=lambda t: t[0])
        return sorted_h[0][1]

    def summary(self, character_id: str) -> dict:
        history = self._get_history(character_id)
        if not history:
            return {"order_id": self.order_id, "character_id": character_id, "shots": 0}
        sorted_h = sorted(history, key=lambda t: t[0])
        baseline = sorted_h[0][1]
        current  = sorted_h[-1][1]
        return {
            "order_id"    : self.order_id,
            "character_id": character_id,
            "shots"       : len(sorted_h),
            "baseline"    : round(baseline, 4),
            "current"     : round(current, 4),
            "drift"       : round(baseline - current, 4),
            "drift_threshold": DRIFT_THRESHOLD(),
            "flagged"     : (baseline - current) >= DRIFT_THRESHOLD(),
            "scores"      : [(idx, round(s, 4)) for idx, s in sorted_h],
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _record(self, character_id: str, shot_index: int, score: float) -> None:
        rc = _get_redis()
        key = _drift_key(self.order_id, character_id)
        member = f"{shot_index}:{score:.6f}"
        if rc is not None:
            rc.zadd(key, {member: float(shot_index)})
            rc.expire(key, DRIFT_REDIS_TTL)
        else:
            # In-process fallback
            self._mem_scores.setdefault(character_id, [])
            # Remove old entry for same shot if re-running
            self._mem_scores[character_id] = [
                (i, s) for i, s in self._mem_scores[character_id] if i != shot_index
            ]
            self._mem_scores[character_id].append((shot_index, score))

    def _get_history(self, character_id: str) -> List[Tuple[int, float]]:
        """Return list of (shot_index, score) tuples, oldest first."""
        rc = _get_redis()
        key = _drift_key(self.order_id, character_id)
        if rc is not None:
            members = rc.zrange(key, 0, -1, withscores=False)  # ordered by shot_index
            result = []
            for m in members:
                try:
                    idx_str, score_str = m.split(":", 1)
                    result.append((int(idx_str), float(score_str)))
                except ValueError:
                    pass
            return result
        # Fallback
        return list(self._mem_scores.get(character_id, []))

    def _check_drift(
        self, history: List[Tuple[int, float]], current_shot: int, current_score: float
    ) -> bool:
        """
        Returns True if either:
          (A) current_score dropped >= DRIFT_THRESHOLD from baseline (shot 0), OR
          (B) rolling 3-shot average dropped >= ROLLING_DROP_THRESHOLD from baseline
        Only fires after at least 2 shots (need baseline + comparison).
        """
        if len(history) < 2:
            return False  # Not enough data

        sorted_h = sorted(history, key=lambda t: t[0])
        baseline = sorted_h[0][1]

        # (A) Absolute drift from baseline
        absolute_drift = baseline - current_score
        if absolute_drift >= DRIFT_THRESHOLD():
            logger.warning(
                "Drift (A): order=%s shot=%d baseline=%.3f current=%.3f drop=%.3f threshold=%.3f",
                self.order_id, current_shot, baseline, current_score,
                absolute_drift, DRIFT_THRESHOLD(),
            )
            return True

        # (B) Rolling average drift
        # Take last ROLLING_WINDOW scores (including current)
        recent = [s for _, s in sorted_h[-ROLLING_WINDOW:]]
        if len(recent) >= ROLLING_WINDOW:
            rolling_avg = sum(recent) / len(recent)
            rolling_drop = baseline - rolling_avg
            if rolling_drop >= ROLLING_DROP_THRESHOLD():
                logger.warning(
                    "Drift (B): order=%s shot=%d baseline=%.3f rolling_avg=%.3f drop=%.3f threshold=%.3f",
                    self.order_id, current_shot, baseline, rolling_avg,
                    rolling_drop, ROLLING_DROP_THRESHOLD(),
                )
                return True

        return False

    # ------------------------------------------------------------------
    # Mark drift in DB (called externally after flag)
    # ------------------------------------------------------------------

    @staticmethod
    def mark_drift_in_db(order_id: str, character_id: str, shot_index: int) -> None:
        """
        Update shot_qa_results.drift_flagged = TRUE for this shot.
        No-op if table doesn't exist or DB unreachable.
        """
        try:
            from config import settings  # type: ignore
            db_url = getattr(settings, "database_url", None)
            if not db_url:
                return
            import psycopg2
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE shot_qa_results
                SET    drift_flagged = TRUE
                WHERE  order_id = %s AND character_id = %s AND shot_index = %s
                """,
                (order_id, character_id, shot_index),
            )
            conn.commit()
            conn.close()
        except Exception as exc:
            logger.warning("mark_drift_in_db failed: %s", exc)
