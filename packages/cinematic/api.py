# ============================================================
# FILE: api.py
# PURPOSE: HTTP API server for the cinematic microservice
# PORT: 8001 (separate from main Hono server on 3000)
# ============================================================

import logging
import os
import sys
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import CustomerInput, ProductionResult, GhaafeediSettings
from orchestrator import GhaafeediCinematicProducer
from store.job_store import JobStore
from engines.lip_sync import LipSyncRequest, LipSyncResult, create_lip_sync_engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("ghaafeedi.api")

app = FastAPI(
    title="Ghaafeedi Cinematic API",
    description="AI-powered cinematic music video production microservice",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize settings and store
settings = GhaafeediSettings()
store = JobStore(os.environ.get("UPSTASH_REDIS_URL", ""))
producer = GhaafeediCinematicProducer(settings)


class ProduceRequest(BaseModel):
    """Request body for /produce endpoint."""
    customer_input: CustomerInput


class StatusResponse(BaseModel):
    """Response for job status."""
    job_id: str
    status: str
    progress_percent: Optional[float] = None
    result: Optional[ProductionResult] = None


@app.get("/health")
def health():
    """Health check endpoint."""
    redis_ok = store.ping()
    return {
        "status": "ok",
        "redis": "connected" if redis_ok else "disconnected",
        "version": "1.0.0",
        "service": "ghaafeedi-cinematic"
    }


@app.post("/produce", response_model=StatusResponse)
async def produce(request: ProduceRequest, background_tasks: BackgroundTasks):
    """
    Start a cinematic video production job.
    Returns immediately with job_id.
    Production runs in background.
    """
    customer_input = request.customer_input
    job_id = customer_input.order_id or f"job_{int(__import__('time').time())}"
    customer_input.order_id = job_id

    # Create initial job record
    initial_result = ProductionResult(
        order_id=job_id,
        status="queued"
    )
    store.save(job_id, initial_result)

    # Queue background production
    background_tasks.add_task(_run_production, job_id, customer_input)

    return StatusResponse(
        job_id=job_id,
        status="queued",
        progress_percent=0.0
    )


@app.get("/status/{job_id}", response_model=StatusResponse)
def get_status(job_id: str):
    """Get the status of a production job."""
    result = store.get(job_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return StatusResponse(
        job_id=job_id,
        status=result.status,
        result=result if result.status in ["completed", "failed"] else None
    )


@app.get("/result/{job_id}", response_model=ProductionResult)
def get_result(job_id: str):
    """Get the full production result for a completed job."""
    result = store.get(job_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if result.status not in ["completed", "failed"]:
        raise HTTPException(
            status_code=202,
            detail=f"Job {job_id} is still {result.status}"
        )

    return result


async def _run_production(job_id: str, customer_input: CustomerInput):
    """Background task that runs the full production."""
    logger.info(f"Starting background production for job {job_id}")

    def progress_callback(data: dict):
        result = store.get(job_id)
        if result:
            if data.get("phase"):
                result.status = data["phase"]
            store.save(job_id, result)

    try:
        result = producer.produce(customer_input, progress_callback)
        store.save(job_id, result)
        logger.info(f"Job {job_id} complete: {result.status}")
    except Exception as e:
        logger.exception(f"Job {job_id} failed: {e}")
        failed = ProductionResult(
            order_id=job_id,
            status="failed",
            error_message=str(e)
        )
        store.save(job_id, failed)


# ─── Lip Sync Routes (Phase 6) ─────────────────────────────────────────────

class LipSyncJobRequest(BaseModel):
    """Request body for /lipsync endpoint."""
    job_id:           str
    order_id:         str
    user_id:          str
    video_url:        str
    audio_url:        str
    duration_seconds: float = 60.0
    guidance_scale:   float = 2.0
    sync_confidence:  float = 0.92
    is_elite_free:    bool  = False


class LipSyncStatusResponse(BaseModel):
    job_id:     str
    status:     str
    output_url: Optional[str] = None
    error:      Optional[str] = None
    duration_s: float          = 0.0


@app.post("/lipsync", response_model=LipSyncStatusResponse)
async def lipsync(request: LipSyncJobRequest, background_tasks: BackgroundTasks):
    """
    Start a lip sync job.
    Accepts video_url + audio_url, dispatches to FAL.ai LatentSync.
    Returns immediately with job_id. Poll /lipsync/status/{job_id}.
    """
    # Save initial queued state to Redis
    store.set_raw(
        f"gm:lipsync:{request.job_id}",
        {"status": "queued", "job_id": request.job_id, "output_url": None},
        ttl=86400
    )

    background_tasks.add_task(_run_lipsync, request)

    return LipSyncStatusResponse(
        job_id=request.job_id,
        status="queued"
    )


@app.get("/lipsync/status/{job_id}", response_model=LipSyncStatusResponse)
def lipsync_status(job_id: str):
    """Poll lip sync job status."""
    raw = store.get_raw(f"gm:lipsync:{job_id}")
    if not raw:
        raise HTTPException(status_code=404, detail=f"Lip sync job {job_id} not found")

    return LipSyncStatusResponse(
        job_id  = job_id,
        status  = raw.get("status", "unknown"),
        output_url = raw.get("output_url"),
        error   = raw.get("error"),
        duration_s = raw.get("duration_s", 0.0),
    )


async def _run_lipsync(request: LipSyncJobRequest):
    """Background task — full LatentSync pipeline."""
    logger.info(f"[LipSync] Background start job={request.job_id}")

    def progress_cb(data: dict):
        raw = store.get_raw(f"gm:lipsync:{request.job_id}") or {}
        raw["status"]  = data.get("phase", "processing")
        raw["percent"] = data.get("percent", 0)
        store.set_raw(f"gm:lipsync:{request.job_id}", raw, ttl=86400)

    try:
        engine = create_lip_sync_engine()
        lip_req = LipSyncRequest(
            job_id           = request.job_id,
            order_id         = request.order_id,
            user_id          = request.user_id,
            video_url        = request.video_url,
            audio_url        = request.audio_url,
            duration_seconds = request.duration_seconds,
            guidance_scale   = request.guidance_scale,
            sync_confidence  = request.sync_confidence,
            is_elite_free    = request.is_elite_free,
        )
        result = engine.run(lip_req, progress_cb)
        store.set_raw(
            f"gm:lipsync:{request.job_id}",
            {
                "status":     "complete" if result.success else "failed",
                "job_id":     result.job_id,
                "output_url": result.output_url,
                "error":      result.error,
                "duration_s": result.duration_s,
            },
            ttl=86400
        )
        logger.info(f"[LipSync] Done job={request.job_id} success={result.success}")
    except Exception as e:
        logger.exception(f"[LipSync] Fatal error job={request.job_id}: {e}")
        store.set_raw(
            f"gm:lipsync:{request.job_id}",
            {"status": "failed", "job_id": request.job_id, "error": str(e)},
            ttl=86400
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("CINEMATIC_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
