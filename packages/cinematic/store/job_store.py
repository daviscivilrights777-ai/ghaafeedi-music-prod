# ============================================================
# FILE: store/job_store.py
# PURPOSE: Upstash Redis job store for production tracking
# Key pattern: gm:cinematic:{job_id}
# TTL: 24h
# ============================================================

import json
import logging
from typing import Optional

from config import ProductionResult

logger = logging.getLogger("ghaafeedi.store")

JOB_KEY_PREFIX = "gm:cinematic:"
JOB_TTL_SECONDS = 86400  # 24 hours


class JobStore:
    """
    Redis job store backed by Upstash.

    Stores ProductionResult objects keyed by order_id.
    Uses upstash-redis for HTTP-based access (no TCP required).
    """

    def __init__(self, redis_url: str):
        """
        Initialize with Upstash Redis REST URL.

        Accepts both:
        - https://... (Upstash REST URL)
        - rediss://... (standard Redis URL)
        """
        self.redis_url = redis_url
        self._client = None
        self._connect()

    def _connect(self):
        """Connect to Redis. Prefers upstash-redis, falls back to redis-py."""
        # Try Upstash REST client first
        try:
            from upstash_redis import Redis as UpstashRedis
            import os

            rest_url = os.environ.get(
                "UPSTASH_REDIS_REST_URL",
                self.redis_url if self.redis_url.startswith("https://") else ""
            )
            rest_token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")

            if rest_url and rest_token:
                self._client = UpstashRedis(url=rest_url, token=rest_token)
                self._client_type = "upstash"
                logger.info("JobStore: using Upstash REST client")
                return
        except ImportError:
            pass

        # Fallback: redis-py
        try:
            import redis

            url = self.redis_url
            if url.startswith("https://"):
                # Convert Upstash HTTPS URL to rediss:// format if needed
                url = url.replace("https://", "rediss://", 1)

            self._client = redis.from_url(url, decode_responses=True)
            self._client_type = "redis-py"
            logger.info("JobStore: using redis-py client")
        except ImportError:
            logger.error("Neither upstash-redis nor redis-py installed")
            self._client = None
            self._client_type = None

    def _key(self, job_id: str) -> str:
        return f"{JOB_KEY_PREFIX}{job_id}"

    def ping(self) -> bool:
        """Test connectivity."""
        if not self._client:
            return False
        try:
            if self._client_type == "upstash":
                result = self._client.ping()
                return result == "PONG" or result is True
            else:
                return self._client.ping()
        except Exception as e:
            logger.error(f"Redis ping failed: {e}")
            return False

    def save(self, job_id: str, result: ProductionResult) -> bool:
        """Save a ProductionResult with 24h TTL."""
        if not self._client:
            return False
        try:
            data = result.model_dump_json()
            key = self._key(job_id)

            if self._client_type == "upstash":
                self._client.set(key, data, ex=JOB_TTL_SECONDS)
            else:
                self._client.set(key, data, ex=JOB_TTL_SECONDS)

            logger.debug(f"Saved job {job_id}")
            return True
        except Exception as e:
            logger.error(f"Redis save failed: {e}")
            return False

    def get(self, job_id: str) -> Optional[ProductionResult]:
        """Retrieve a ProductionResult."""
        if not self._client:
            return None
        try:
            key = self._key(job_id)
            data = self._client.get(key)
            if not data:
                return None
            return ProductionResult.model_validate_json(data)
        except Exception as e:
            logger.error(f"Redis get failed: {e}")
            return None

    def update_status(self, job_id: str, status: str) -> bool:
        """Update just the status field of an existing job."""
        existing = self.get(job_id)
        if not existing:
            return False
        existing.status = status
        return self.save(job_id, existing)

    def update_result(self, job_id: str, result: ProductionResult) -> bool:
        """Overwrite with updated result (preserves TTL refresh)."""
        return self.save(job_id, result)

    def get_ttl(self, job_id: str) -> int:
        """Get remaining TTL in seconds. -1 = no TTL, -2 = not found."""
        if not self._client:
            return -2
        try:
            key = self._key(job_id)
            ttl = self._client.ttl(key)
            return int(ttl)
        except Exception as e:
            logger.error(f"Redis TTL failed: {e}")
            return -2

    def exists(self, job_id: str) -> bool:
        """Check if a job exists."""
        if not self._client:
            return False
        try:
            key = self._key(job_id)
            result = self._client.exists(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis exists failed: {e}")
            return False

    def delete(self, job_id: str) -> bool:
        """Delete a job."""
        if not self._client:
            return False
        try:
            key = self._key(job_id)
            self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis delete failed: {e}")
            return False

    # ── Raw key/value methods (for lip_sync and other ad-hoc jobs) ────────────

    def set_raw(self, key: str, data: dict, ttl: int = 86400) -> bool:
        """Store arbitrary dict under a raw Redis key (no prefix added)."""
        if not self._client:
            return False
        try:
            serialized = json.dumps(data)
            if self._client_type == "upstash":
                self._client.set(key, serialized, ex=ttl)
            else:
                self._client.set(key, serialized, ex=ttl)
            return True
        except Exception as e:
            logger.error(f"Redis set_raw failed key={key}: {e}")
            return False

    def get_raw(self, key: str) -> Optional[dict]:
        """Retrieve arbitrary dict from a raw Redis key."""
        if not self._client:
            return None
        try:
            data = self._client.get(key)
            if not data:
                return None
            return json.loads(data)
        except Exception as e:
            logger.error(f"Redis get_raw failed key={key}: {e}")
            return None
