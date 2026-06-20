# ============================================================
# FILE: engines/lip_sync.py
# PURPOSE: FAL.ai LatentSync pipeline — Sophia Lip Sync add-on
# Phase 6: lip_sync JobType
# Pricing: ~$0.015/s output video. 60s ≈ $0.90. Customer charge: $29.
#
# Flow:
#   1. Accept video_url (rendered film) + audio_url (ElevenLabs Sophia VO)
#   2. Dispatch to fal-ai/latentsync via queue API
#   3. Poll until complete (max 20 min)
#   4. Upload result to R2 → return CDN URL
#   5. Update job store status
# ============================================================

import logging
import time
import os
import tempfile
import urllib.request
from typing import Optional, Callable
from dataclasses import dataclass

import httpx

logger = logging.getLogger("ghaafeedi.lip_sync")

LATENTSYNC_MODEL = "fal-ai/latentsync"
FAL_QUEUE_BASE   = "https://queue.fal.run"
POLL_INTERVAL_S  = 5
MAX_WAIT_S       = 1200  # 20 minutes


@dataclass
class LipSyncRequest:
    """Input for a lip sync job."""
    job_id:           str
    order_id:         str
    user_id:          str
    video_url:        str          # rendered cinematic video (no audio or existing VO)
    audio_url:        str          # ElevenLabs Sophia VO (.mp3 or .wav)
    duration_seconds: float = 60.0
    guidance_scale:   float = 2.0  # LatentSync guidance — 2.0 optimal
    sync_confidence:  float = 0.92 # lip sync tightness — 0.92 optimal for narration
    is_elite_free:    bool  = False # Elite members get this free


@dataclass
class LipSyncResult:
    """Result of a lip sync job."""
    job_id:     str
    success:    bool
    output_url: Optional[str] = None
    error:      Optional[str] = None
    duration_s: float          = 0.0


class LipSyncEngine:
    """
    Dispatches lip sync jobs to FAL.ai LatentSync.
    Called by orchestrator.py when job_type == "lip_sync".
    """

    def __init__(self, fal_api_key: str, storage_endpoint: str,
                 storage_bucket: str, storage_access_key: str,
                 storage_secret_key: str):
        self.fal_api_key        = fal_api_key
        self.storage_endpoint   = storage_endpoint
        self.storage_bucket     = storage_bucket
        self.storage_access_key = storage_access_key
        self.storage_secret_key = storage_secret_key

    def run(self, req: LipSyncRequest,
            progress_cb: Optional[Callable] = None) -> LipSyncResult:
        """
        Full lip sync pipeline.
        Returns LipSyncResult with output_url set on success.
        """
        start = time.time()
        logger.info(
            f"[LipSync] START job={req.job_id} order={req.order_id} "
            f"elite_free={req.is_elite_free}"
        )

        # 1. Dispatch to LatentSync
        request_id = self._dispatch(req)
        if not request_id:
            return LipSyncResult(
                job_id=req.job_id, success=False,
                error="LatentSync dispatch failed",
                duration_s=time.time() - start
            )

        if progress_cb:
            progress_cb({"phase": "dispatched", "request_id": request_id, "percent": 10})

        # 2. Poll for completion
        output_url = self._poll(request_id, progress_cb)
        if not output_url:
            return LipSyncResult(
                job_id=req.job_id, success=False,
                error="LatentSync polling timed out or failed",
                duration_s=time.time() - start
            )

        if progress_cb:
            progress_cb({"phase": "uploading", "percent": 90})

        # 3. Mirror to R2 CDN (so customer gets our CDN URL, not FAL's temp URL)
        try:
            r2_url = self._mirror_to_r2(output_url, req.order_id, req.job_id)
        except Exception as e:
            logger.warning(f"[LipSync] R2 mirror failed, using FAL URL directly: {e}")
            r2_url = output_url

        elapsed = time.time() - start
        logger.info(f"[LipSync] COMPLETE job={req.job_id} url={r2_url} time={elapsed:.1f}s")

        if progress_cb:
            progress_cb({"phase": "complete", "url": r2_url, "percent": 100})

        return LipSyncResult(
            job_id=req.job_id,
            success=True,
            output_url=r2_url,
            duration_s=elapsed,
        )

    # ─── Internal Methods ──────────────────────────────────────────────────────

    def _dispatch(self, req: LipSyncRequest) -> Optional[str]:
        """POST to FAL queue, return request_id."""
        payload = {
            "video_url":       req.video_url,
            "audio_url":       req.audio_url,
            "guidance_scale":  req.guidance_scale,
            "sync_confidence": req.sync_confidence,
            "output_format":   "mp4",
        }

        try:
            with httpx.Client(timeout=30) as client:
                res = client.post(
                    f"{FAL_QUEUE_BASE}/{LATENTSYNC_MODEL}",
                    json=payload,
                    headers={
                        "Content-Type":  "application/json",
                        "Authorization": f"Key {self.fal_api_key}",
                    }
                )

            if not res.is_success:
                logger.error(
                    f"[LipSync] Dispatch HTTP {res.status_code}: {res.text[:300]}"
                )
                return None

            data = res.json()
            request_id = data.get("request_id")
            logger.info(f"[LipSync] Dispatched request_id={request_id}")
            return request_id

        except Exception as e:
            logger.error(f"[LipSync] Dispatch exception: {e}")
            return None

    def _poll(self, request_id: str,
              progress_cb: Optional[Callable] = None) -> Optional[str]:
        """Poll FAL queue until COMPLETED or FAILED. Returns output URL."""
        deadline = time.time() + MAX_WAIT_S
        attempt  = 0

        while time.time() < deadline:
            attempt += 1
            time.sleep(POLL_INTERVAL_S)

            try:
                with httpx.Client(timeout=15) as client:
                    status_res = client.get(
                        f"{FAL_QUEUE_BASE}/{LATENTSYNC_MODEL}/requests/{request_id}/status",
                        headers={"Authorization": f"Key {self.fal_api_key}"}
                    )

                if not status_res.is_success:
                    logger.warning(
                        f"[LipSync] Poll attempt {attempt} HTTP {status_res.status_code}"
                    )
                    continue

                status_data = status_res.json()
                status      = status_data.get("status", "")
                elapsed_pct = min(85, 10 + attempt * 2)

                logger.debug(f"[LipSync] Poll {attempt}: status={status}")

                if progress_cb:
                    progress_cb({"phase": "processing", "status": status, "percent": elapsed_pct})

                if status == "COMPLETED":
                    # Fetch result
                    with httpx.Client(timeout=15) as client:
                        result_res = client.get(
                            f"{FAL_QUEUE_BASE}/{LATENTSYNC_MODEL}/requests/{request_id}",
                            headers={"Authorization": f"Key {self.fal_api_key}"}
                        )

                    if not result_res.is_success:
                        logger.error(f"[LipSync] Result fetch failed: {result_res.status_code}")
                        return None

                    result_data = result_res.json()
                    # LatentSync response: { video: { url, content_type }, output: { video_url } }
                    url = (
                        result_data.get("video", {}).get("url")
                        or result_data.get("output", {}).get("video_url")
                    )
                    logger.info(f"[LipSync] COMPLETED url={url}")
                    return url

                if status == "FAILED":
                    err = status_data.get("error", "Unknown error")
                    logger.error(f"[LipSync] FAILED: {err}")
                    return None

            except Exception as e:
                logger.warning(f"[LipSync] Poll attempt {attempt} exception: {e}")

        logger.error(f"[LipSync] Timed out after {MAX_WAIT_S}s waiting for {request_id}")
        return None

    def _mirror_to_r2(self, fal_url: str, order_id: str, job_id: str) -> str:
        """Download from FAL CDN, upload to R2, return R2 public URL."""
        try:
            import boto3
            from botocore.client import Config as BotoConfig
        except ImportError:
            logger.warning("[LipSync] boto3 not installed — skipping R2 mirror")
            return fal_url

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            urllib.request.urlretrieve(fal_url, tmp_path)
            logger.info(f"[LipSync] Downloaded {os.path.getsize(tmp_path) // 1024}KB to {tmp_path}")

            s3 = boto3.client(
                "s3",
                endpoint_url        = self.storage_endpoint,
                aws_access_key_id   = self.storage_access_key,
                aws_secret_access_key = self.storage_secret_key,
                config              = BotoConfig(signature_version="s3v4"),
            )

            key = f"lipsync/{order_id}/{job_id}/sophia_lipsync.mp4"
            s3.upload_file(
                tmp_path,
                self.storage_bucket,
                key,
                ExtraArgs={"ContentType": "video/mp4"},
            )

            # Construct public R2 URL
            r2_public_base = os.environ.get(
                "R2_PUBLIC_URL",
                "https://pub-bc7b203485814e1186102277ad450211.r2.dev"
            )
            r2_url = f"{r2_public_base}/{key}"
            logger.info(f"[LipSync] Uploaded to R2: {r2_url}")
            return r2_url

        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# ─── Convenience factory ────────────────────────────────────────────────────

def create_lip_sync_engine() -> LipSyncEngine:
    """Build LipSyncEngine from environment variables."""
    return LipSyncEngine(
        fal_api_key        = os.environ["FAL_API_KEY"],
        storage_endpoint   = os.environ.get(
            "STORAGE_ENDPOINT",
            "https://56e7ace05da7338f6d61b014123e6a24.r2.cloudflarestorage.com"
        ),
        storage_bucket     = os.environ.get("STORAGE_BUCKET", "ghaafeedi-media"),
        storage_access_key = os.environ["R2_ACCESS_KEY_ID"],
        storage_secret_key = os.environ["R2_SECRET_ACCESS_KEY"],
    )
