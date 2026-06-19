// ============================================================
// Ghaafeedi Music — Pipeline Routes
// /api/pipeline/*
// ============================================================
import { Hono } from "hono";
import { PipelineOrchestrator } from "../orchestration/pipeline-orchestrator";
import { OrchestrationEngine } from "../orchestration/orchestration-engine";
import { db } from "../database/pg-client";
import { aiJobs } from "../database/pg-schema";
import { eq, and, sql } from "drizzle-orm";
import { up as migration007 } from "../database/migrations/007_pipeline_columns";

const pipeline = new Hono();
const orchestrator = PipelineOrchestrator.getInstance();

// ─── POST /api/pipeline/start ─────────────────────────────────
// Kick off a full multi-stage pipeline for a production
pipeline.post("/start", async (c) => {
  try {
    const body = await c.req.json();
    const {
      userId,
      productionId,
      orderId,
      productSlug,
      tier = "starter",
      queueTier = "starter",
      inputPayload = {},
      metadata = {},
    } = body;

    if (!userId || !productionId || !productSlug) {
      return c.json({ error: "userId, productionId, productSlug required" }, 400);
    }

    // Check if this product uses the full pipeline
    if (!PipelineOrchestrator.shouldUsePipeline(productSlug)) {
      // Social Ready Clips: direct video job
      const engine = OrchestrationEngine.getInstance();
      const result = await engine.submitJob({
        userId,
        productType: productSlug as any,
        jobType: "video",
        orderId,
        productionId,
        tier: queueTier,
        inputPayload,
        metadata,
      });
      return c.json({ ...result, pipelineUsed: false, message: "Direct video job (no full pipeline for this product)" });
    }

    const result = await orchestrator.startPipeline({
      userId,
      productionId,
      orderId,
      productSlug,
      tier,
      queueTier,
      inputPayload,
      metadata,
    });

    return c.json({
      success: true,
      pipelineUsed: true,
      pipelineRunId: result.pipelineRunId,
      firstJobId: result.firstJobId,
    });
  } catch (err) {
    const e = err as Error;
    console.error("[pipeline.start] Error:", e.message);
    return c.json({ error: e.message }, 500);
  }
});

// ─── GET /api/pipeline/:pipelineRunId/status ──────────────────
pipeline.get("/:pipelineRunId/status", async (c) => {
  const { pipelineRunId } = c.req.param();

  try {
    const status = await orchestrator.getPipelineStatus(pipelineRunId);
    return c.json(status);
  } catch (err) {
    const e = err as Error;
    return c.json({ error: e.message }, 500);
  }
});

// ─── GET /api/pipeline/:pipelineRunId/jobs ────────────────────
// All jobs in this pipeline run with stage outputs
pipeline.get("/:pipelineRunId/jobs", async (c) => {
  const { pipelineRunId } = c.req.param();

  try {
    const rows = await db
      .select()
      .from(aiJobs)
      .where(sql`pipeline_run_id = ${pipelineRunId}`);

    return c.json({ jobs: rows, count: rows.length });
  } catch (err) {
    const e = err as Error;
    return c.json({ error: e.message }, 500);
  }
});

// ─── GET /api/pipeline/:pipelineRunId/stage/:stage ───────────
// Get stage output (StoryBible / ProductionBible / ShotList / etc.)
pipeline.get("/:pipelineRunId/stage/:stage", async (c) => {
  const { pipelineRunId, stage } = c.req.param();

  try {
    type StageRow = { id: string; status: string; stageOutputs: unknown; completedAt: Date | null; errorMessage: string | null };
    const rows = await db.execute<StageRow>(
      sql`SELECT id, status, stage_outputs as "stageOutputs", completed_at as "completedAt", error_message as "errorMessage"
          FROM ai_jobs WHERE pipeline_run_id = ${pipelineRunId} AND pipeline_stage = ${stage}`
    );

    const rowArr = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
    if (rowArr.length === 0) {
      return c.json({ error: "Stage not found" }, 404);
    }

    return c.json({
      stage,
      jobs: rowArr,
      output: rowArr.find((r: StageRow) => r.stageOutputs)?.stageOutputs ?? null,
    });
  } catch (err) {
    const e = err as Error;
    return c.json({ error: e.message }, 500);
  }
});

// ─── POST /api/pipeline/:jobId/approve-qc ────────────────────
// Admin: approve a job stuck in quality_review → advance to delivery
pipeline.post("/:jobId/approve-qc", async (c) => {
  const { jobId } = c.req.param();
  const { adminNote = "" } = await c.req.json().catch(() => ({}));

  try {
    const { JobStateMachine } = await import("../orchestration/state-machine");
    await JobStateMachine.transition(jobId, "delivery", {
      provider: "admin_approved",
    });

    // Then queue a deliver job
    const rows = await db.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1);
    const job = rows[0];
    if (job) {
      const { JobQueue } = await import("../orchestration/job-queue");
      await JobQueue.enqueue({
        userId:        job.userId,
        orderId:       job.orderId ?? undefined,
        productionId:  job.productionId ?? undefined,
        jobType:       "deliver",
        tier:          "elite", // admin-approved = top priority
        priority:      1,
        inputPayload:  { approvedJobId: jobId, adminNote },
        pipelineRunId: job.pipelineRunId ?? undefined,
        pipelineStage: "deliver",
        maxAttempts:   3,
      });
    }

    return c.json({ success: true, message: "QC approved, delivery queued" });
  } catch (err) {
    const e = err as Error;
    return c.json({ error: e.message }, 500);
  }
});

// ─── POST /api/pipeline/migrate ──────────────────────────────
// Run migration 007 (pipeline columns). Admin-only.
pipeline.post("/migrate", async (c) => {
  try {
    await migration007();
    return c.json({ success: true, message: "Migration 007 complete" });
  } catch (err) {
    const e = err as Error;
    console.error("[pipeline.migrate] Error:", e.message);
    return c.json({ error: e.message }, 500);
  }
});

export { pipeline };
