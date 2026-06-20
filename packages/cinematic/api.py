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


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("CINEMATIC_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
