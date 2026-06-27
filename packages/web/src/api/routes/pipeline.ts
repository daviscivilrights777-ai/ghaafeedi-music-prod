// ============================================================
// Ghaafeedi Music — Pipeline Routes
// /api/pipeline/*
// ============================================================
import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { PipelineOrchestrator } from "../orchestration/pipeline-orchestrator";
import { OrchestrationEngine } from "../orchestration/orchestration-engine";
import { db } from "../database/pg-client";
import { aiJobs } from "../database/pg-schema";
import { eq, and, sql } from "drizzle-orm";
import { up as migration007 } from "../database/migrations/007_pipeline_columns";
import { up as migration008 } from "../database/migrations/008_style_embeddings";
import { findSimilarProductions, generateSignedUrl } from "../orchestration/delivery";

const pipeline = new Hono<HonoEnv>();
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
// Run migrations 007 + 008 (pipeline columns + style embeddings). Admin-only.
pipeline.post("/migrate", async (c) => {
  const results: string[] = [];
  const errors: string[] = [];

  try { await migration007(); results.push("007 pipeline_columns"); }
  catch (e) { errors.push(`007: ${(e as Error).message}`); }

  try { await migration008(); results.push("008 style_embeddings"); }
  catch (e) { errors.push(`008: ${(e as Error).message}`); }

  if (errors.length > 0) {
    return c.json({ success: false, completed: results, errors }, 500);
  }
  return c.json({ success: true, message: `Migrations complete: ${results.join(", ")}` });
});

// ─── GET /api/pipeline/similar-productions ───────────────────
// Find productions with similar emotional profile (pgvector)
pipeline.get("/similar-productions", async (c) => {
  const emotionVectorRaw = c.req.query("emotions"); // "0.8,0.2,0.7,0.4,0.6"
  const limit = parseInt(c.req.query("limit") ?? "5", 10);

  if (!emotionVectorRaw) {
    return c.json({ error: "emotions query param required (comma-separated 5 values)" }, 400);
  }

  const vector = emotionVectorRaw.split(",").map(Number).slice(0, 5);
  if (vector.some(isNaN) || vector.length !== 5) {
    return c.json({ error: "emotions must be 5 comma-separated numbers (0-1)" }, 400);
  }

  try {
    const results = await findSimilarProductions(vector, limit);
    return c.json({ results, count: results.length });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ─── GET /api/pipeline/:productionId/signed-url ──────────────
// Get a fresh 48h signed URL for a delivered production
pipeline.get("/:productionId/signed-url", async (c) => {
  const { productionId } = c.req.param();
  const key = c.req.query("key"); // R2 object key

  if (!key) return c.json({ error: "key query param required" }, 400);

  try {
    const signedUrl = await generateSignedUrl({ bucket: "ghaafeedi-media", key, expiresIn: 172800 });
    const expiresAt = new Date(Date.now() + 172800 * 1000).toISOString();
    return c.json({ signedUrl, expiresAt, productionId });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export { pipeline };
