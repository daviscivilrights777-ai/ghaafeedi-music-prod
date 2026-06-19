// ============================================================
// Ghaafeedi Music — Pipeline Orchestrator
// Multi-stage production pipeline manager.
// Stages: story_bible → production_bible → shot_list →
//         [audio + clips in parallel] → edit_assemble →
//         qc_check → deliver
//
// Architecture: pure PG + Redis job chaining.
// No Temporal/Kafka/K8s — parent_job_id + pipeline_run_id
// ============================================================

import { v4 as uuidv4 } from "uuid";
import { db } from "../database/pg-client";
import { aiJobs } from "../database/pg-schema";
import { eq, and, sql } from "drizzle-orm";
import { JobQueue } from "./job-queue";
import { JobStateMachine } from "./state-machine";
import { AuditLogger } from "./audit-logger";
import { EventBus } from "./event-bus";
import type { StoryBible } from "./schemas/story-bible.schema";
import type { ProductionBible } from "./schemas/production-bible.schema";
import type { ShotList } from "./schemas/shot-list.schema";
import {
  MAX_SHOTS,
  type ProductionTier,
} from "./schemas/production-bible.schema";
import type { QueueTier } from "./redis-client";

// ─── Pipeline run status ─────────────────────────────────────
export type PipelineStage =
  | "story_bible"
  | "production_bible"
  | "shot_list"
  | "audio"           // song + narration (parallel with shot_list)
  | "clip_batch"      // per-shot video generation (Phase 8)
  | "edit_assemble"   // ffmpeg assembly (Phase 9)
  | "qc_check"        // quality review (Phase 9)
  | "deliver";        // R2 upload + signed URL (Phase 10)

export interface PipelineRun {
  pipelineRunId: string;
  productionId: string;
  userId: string;
  orderId?: string;
  productSlug: string;
  tier: ProductionTier;
  queueTier: QueueTier;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  failedStages: PipelineStage[];
  stageJobIds: Partial<Record<PipelineStage, string[]>>;  // stage → job IDs
  stageOutputs: {
    story_bible?: StoryBible;
    production_bible?: ProductionBible;
    shot_list?: ShotList;
    audio_url?: string;
    narration_url?: string;
    clip_urls?: string[];
    assembled_url?: string;
    qc_score?: number;
    delivery_url?: string;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── Skip-pipeline products ──────────────────────────────────
// Social Ready Clips: pipeline cost > product price, direct video job only
const SKIP_PIPELINE_SLUGS = new Set([
  "social-ready-clips",
]);

let _pgAvailable = true;

export class PipelineOrchestrator {
  private static _instance: PipelineOrchestrator;
  private logger = AuditLogger.getInstance();

  static getInstance(): PipelineOrchestrator {
    if (!PipelineOrchestrator._instance) {
      PipelineOrchestrator._instance = new PipelineOrchestrator();
    }
    return PipelineOrchestrator._instance;
  }

  // ---------------------------------------------------------------------------
  // startPipeline — entry point from OrchestrationEngine.submitJob
  // ---------------------------------------------------------------------------
  async startPipeline(params: {
    userId: string;
    productionId: string;
    orderId?: string;
    productSlug: string;
    tier: ProductionTier;
    queueTier: QueueTier;
    inputPayload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<{ pipelineRunId: string; firstJobId: string }> {
    const pipelineRunId = `pipe_${uuidv4().replace(/-/g, "")}`;

    await this.logger.log({
      action: "pipeline.start",
      actorId: params.userId,
      actorRole: "user",
      resourceType: "pipeline",
      resourceId: pipelineRunId,
      payload: {
        productionId: params.productionId,
        productSlug: params.productSlug,
        tier: params.tier,
      },
      severity: "info",
    });

    // Dispatch first stage: story_bible
    const firstJob = await JobQueue.enqueue({
      userId:        params.userId,
      orderId:       params.orderId,
      productionId:  params.productionId,
      jobType:       "story_bible",
      tier:          params.queueTier,
      priority:      this._tierToPriority(params.queueTier),
      inputPayload:  params.inputPayload,
      estimatedCostCents: 3, // GPT-4o-mini story extraction ~3¢
      metadata: {
        ...(params.metadata ?? {}),
        productSlug:   params.productSlug,
        pipelineRunId,
        productionTier: params.tier,
      },
      pipelineRunId,
      pipelineStage: "story_bible",
      maxAttempts:   3,
    });

    // Persist pipeline job to DB
    if (_pgAvailable) {
      try {
        await db.insert(aiJobs).values({
          id:            firstJob.jobId,
          userId:        params.userId,
          orderId:       params.orderId ?? null,
          productionId:  params.productionId,
          jobType:       "story_bible",
          status:        "queued",
          provider:      "openai",
          inputPayload:  params.inputPayload,
          estimatedCostCents: 3,
          priority:      this._tierToPriority(params.queueTier),
          metadata:      params.metadata ?? {},
          pipelineRunId,
          pipelineStage: "story_bible",
        });
      } catch (err) {
        const e = err as Error;
        if (e.message.includes("connect")) _pgAvailable = false;
        console.warn("[PipelineOrchestrator] PG insert failed:", e.message);
      }
    }

    await EventBus.publish("pipeline.started" as any, {
      pipelineRunId,
      productionId: params.productionId,
      userId: params.userId,
      firstJobId: firstJob.jobId,
    }, { jobId: firstJob.jobId });

    console.log(`[PipelineOrchestrator] Started run=${pipelineRunId} prod=${params.productionId} first_job=${firstJob.jobId}`);
    return { pipelineRunId, firstJobId: firstJob.jobId };
  }

  // ---------------------------------------------------------------------------
  // advanceStage — called by OrchestrationEngine after a stage job completes
  // Dispatches the next stage's job(s)
  // ---------------------------------------------------------------------------
  async advanceStage(params: {
    completedJobId: string;
    completedStage: PipelineStage;
    pipelineRunId: string;
    productionId: string;
    userId: string;
    orderId?: string;
    productSlug: string;
    tier: ProductionTier;
    queueTier: QueueTier;
    stageOutput: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<string[]> {
    const nextStage = this._nextStage(params.completedStage, params.productSlug);
    if (!nextStage) {
      console.log(`[PipelineOrchestrator] Pipeline complete for run=${params.pipelineRunId}`);
      return [];
    }

    const jobs: string[] = [];
    const base = {
      userId:        params.userId,
      orderId:       params.orderId,
      productionId:  params.productionId,
      tier:          params.queueTier,
      priority:      this._tierToPriority(params.queueTier),
      pipelineRunId: params.pipelineRunId,
      maxAttempts:   3,
      metadata: {
        ...(params.metadata ?? {}),
        productSlug:      params.productSlug,
        pipelineRunId:    params.pipelineRunId,
        productionTier:   params.tier,
        parentJobId:      params.completedJobId,
      },
    };

    // ── shot_list → clip_batch: dispatch one job per shot (Phase 8) ─────────
    if (nextStage === "clip_batch") {
      const shotList = params.stageOutput as unknown as ShotList;
      const maxShots = MAX_SHOTS[params.tier];

      for (let i = 0; i < Math.min(shotList.shots.length, maxShots); i++) {
        const shot = shotList.shots[i];
        const j = await JobQueue.enqueue({
          ...base,
          jobType:          "clip_batch",
          inputPayload:     {
            shot,
            pipelineRunId:  params.pipelineRunId,
            shotIndex:      i,
            productSlug:    params.productSlug,
          },
          estimatedCostCents: 800, // ~$8 per video clip
          pipelineStage:    "clip_batch",
          parentJobId:      params.completedJobId,
        });
        jobs.push(j.jobId);
      }

      await this._persistPipelineJobs(jobs, "clip_batch", params, 800);
      return jobs;
    }

    // ── Standard single next-stage dispatch ─────────────────────────────────
    const STAGE_CONFIG: Record<PipelineStage, {
      jobType: Parameters<typeof JobQueue.enqueue>[0]["jobType"];
      provider: string;
      costCents: number;
    }> = {
      story_bible:      { jobType: "story_bible",      provider: "openai",     costCents: 3   },
      production_bible: { jobType: "production_bible", provider: "openai",     costCents: 10  },
      shot_list:        { jobType: "shot_list",         provider: "openai",     costCents: 8   },
      audio:            { jobType: "song",              provider: "sunor_cc",   costCents: 10  },
      clip_batch:       { jobType: "clip_batch",        provider: "fal-ai",     costCents: 800 },
      edit_assemble:    { jobType: "edit_assemble",     provider: "modal",      costCents: 50  },
      qc_check:         { jobType: "qc_check",          provider: "openai",     costCents: 5   },
      deliver:          { jobType: "deliver",           provider: "internal",   costCents: 1   },
    };

    const cfg = STAGE_CONFIG[nextStage];
    const job = await JobQueue.enqueue({
      ...base,
      jobType:          cfg.jobType,
      inputPayload:     { ...params.stageOutput, productSlug: params.productSlug },
      estimatedCostCents: cfg.costCents,
      pipelineStage:    nextStage,
      parentJobId:      params.completedJobId,
    });
    jobs.push(job.jobId);

    await this._persistPipelineJobs(jobs, nextStage, params, cfg.costCents);

    console.log(`[PipelineOrchestrator] Dispatched stage=${nextStage} jobs=${jobs.join(",")} run=${params.pipelineRunId}`);
    return jobs;
  }

  // ---------------------------------------------------------------------------
  // handleQcFailed — determines retry vs quality_review escalation
  // Max 2 auto-retries; 3rd fail → quality_review (admin intervention)
  // ---------------------------------------------------------------------------
  async handleQcFailed(params: {
    jobId: string;
    pipelineRunId: string;
    productionId: string;
    userId: string;
    retryCount: number;
    qcReason: string;
  }): Promise<"retry" | "quality_review"> {
    const QC_MAX_RETRIES = 2;

    if (params.retryCount < QC_MAX_RETRIES) {
      await JobStateMachine.transition(params.jobId, "qc_failed", {
        errorMessage: params.qcReason,
        retryCount: params.retryCount,
      });
      console.log(`[PipelineOrchestrator] QC fail #${params.retryCount + 1} for job=${params.jobId}, auto-retry`);
      return "retry";
    }

    // Escalate to manual quality_review
    await JobStateMachine.transition(params.jobId, "quality_review", {
      errorMessage: `QC failed ${QC_MAX_RETRIES + 1} times: ${params.qcReason}`,
    });

    await this.logger.log({
      action: "pipeline.qc.escalated",
      actorId: "system",
      actorRole: "system",
      resourceType: "pipeline",
      resourceId: params.pipelineRunId,
      payload: {
        jobId: params.jobId,
        retryCount: params.retryCount,
        reason: params.qcReason,
      },
      severity: "warn",
    });

    console.warn(`[PipelineOrchestrator] QC escalated to quality_review for run=${params.pipelineRunId}`);
    return "quality_review";
  }

  // ---------------------------------------------------------------------------
  // getPipelineStatus — admin + customer polling
  // ---------------------------------------------------------------------------
  async getPipelineStatus(pipelineRunId: string): Promise<{
    pipelineRunId: string;
    stages: Array<{ stage: string; status: string; jobIds: string[] }>;
    currentStage?: string;
    overallStatus: "running" | "complete" | "failed" | "quality_review";
  }> {
    if (!_pgAvailable) {
      return { pipelineRunId, stages: [], overallStatus: "running" };
    }

    try {
      const rows = await db
        .select({
          id:            aiJobs.id,
          status:        aiJobs.status,
          pipelineStage: aiJobs.pipelineStage,
        })
        .from(aiJobs)
        .where(sql`pipeline_run_id = ${pipelineRunId}`);

      const stageMap: Record<string, { status: string; jobIds: string[] }> = {};
      for (const row of rows) {
        const stage = row.pipelineStage ?? "unknown";
        if (!stageMap[stage]) stageMap[stage] = { status: row.status, jobIds: [] };
        stageMap[stage].jobIds.push(row.id);
        // Stage status = worst status among its jobs
        if (row.status === "failed") stageMap[stage].status = "failed";
        else if (row.status === "quality_review") stageMap[stage].status = "quality_review";
      }

      const stages = Object.entries(stageMap).map(([stage, v]) => ({
        stage,
        status: v.status,
        jobIds: v.jobIds,
      }));

      const allComplete = stages.every((s) => s.status === "complete");
      const anyFailed   = stages.some((s)  => s.status === "failed");
      const anyQR       = stages.some((s)  => s.status === "quality_review");
      const currentStage = stages.find((s) =>
        ["queued", "dispatched", "processing"].includes(s.status)
      )?.stage;

      return {
        pipelineRunId,
        stages,
        currentStage,
        overallStatus: anyFailed ? "failed"
          : anyQR ? "quality_review"
          : allComplete ? "complete"
          : "running",
      };
    } catch (err) {
      console.error("[PipelineOrchestrator] getPipelineStatus error:", (err as Error).message);
      return { pipelineRunId, stages: [], overallStatus: "running" };
    }
  }

  // ---------------------------------------------------------------------------
  // shouldUsePipeline — some cheap products skip the full pipeline
  // ---------------------------------------------------------------------------
  static shouldUsePipeline(productSlug: string): boolean {
    return !SKIP_PIPELINE_SLUGS.has(productSlug);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------
  private _nextStage(
    current: PipelineStage,
    productSlug: string
  ): PipelineStage | null {
    const isFilm = productSlug.includes("film") || productSlug.includes("video");
    const isAudioOnly = productSlug.includes("soundtrack") || productSlug.includes("song");

    const PIPELINE: PipelineStage[] = isAudioOnly
      ? ["story_bible", "production_bible", "audio", "deliver"]
      : ["story_bible", "production_bible", "shot_list", "clip_batch", "edit_assemble", "qc_check", "deliver"];

    const idx = PIPELINE.indexOf(current);
    if (idx === -1 || idx === PIPELINE.length - 1) return null;
    return PIPELINE[idx + 1];
  }

  private _tierToPriority(tier: QueueTier): number {
    const map: Record<QueueTier, number> = { elite: 1, premium: 2, starter: 3, free: 4 };
    return map[tier] ?? 5;
  }

  private async _persistPipelineJobs(
    jobIds: string[],
    stage: PipelineStage,
    params: {
      userId: string;
      orderId?: string;
      productionId: string;
      queueTier: QueueTier;
      stageOutput: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    },
    costCents: number
  ): Promise<void> {
    if (!_pgAvailable || jobIds.length === 0) return;
    try {
      await db.insert(aiJobs).values(
        jobIds.map((id) => ({
          id,
          userId:       params.userId,
          orderId:      params.orderId ?? null,
          productionId: params.productionId,
          jobType:      stage === "clip_batch" ? "clip_batch" : stage,
          status:       "queued" as const,
          provider:     stage === "clip_batch" ? "fal-ai" : "openai",
          inputPayload: params.stageOutput,
          estimatedCostCents: costCents,
          priority:     this._tierToPriority(params.queueTier),
          metadata:     params.metadata ?? {},
          pipelineStage: stage,
        }))
      );
    } catch (err) {
      const e = err as Error;
      if (e.message.includes("connect")) _pgAvailable = false;
      console.warn("[PipelineOrchestrator] _persistPipelineJobs failed:", e.message);
    }
  }
}
