// ============================================================
// Ghaafeedi Music — Job State Machine
// Single source of truth for all AI job state transitions.
// Persists to PostgreSQL + syncs real-time state to Redis.
// ============================================================
import { db } from "../database/pg-client";
import { aiJobs } from "../database/pg-schema";
import { eq } from "drizzle-orm";
import { getRedis, REDIS_KEYS } from "./redis-client";
import { EventBus, EVENTS } from "./event-bus";

// ─── States ───────────────────────────────────────────────────
export type JobStatus =
  | "queued"
  | "dispatched"
  | "processing"
  | "complete"
  | "failed"
  | "cancelled"
  | "retry"
  | "failover_dispatch"
  | "quality_review"
  | "delivery"
  // ── Pipeline stage states (Phase 7+) ──────────────────────
  | "story_bible_ready"        // StoryBible generated, awaiting ProductionBible dispatch
  | "production_bible_ready"   // ProductionBible done, ShotList in progress
  | "audio_ready"              // Song/narration generated, clips can start
  | "clips_generating"         // clip_batch jobs running (may be multiple parallel)
  | "assembling"               // edit_assemble job running
  | "qc_failed";               // QC check failed (< maxRetries → auto-retry, else → quality_review)

// ─── Allowed transitions ──────────────────────────────────────
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  // ── Base states ─────────────────────────────────────────
  queued:            ["dispatched", "cancelled"],
  dispatched:        ["processing", "retry", "failed", "cancelled",
                      "story_bible_ready"],           // pipeline fast-dispatch
  processing:        ["complete", "retry", "failed", "quality_review",
                      "story_bible_ready", "production_bible_ready",
                      "audio_ready", "clips_generating", "assembling",
                      "qc_failed"],
  retry:             ["dispatched", "failover_dispatch", "failed"],
  failover_dispatch: ["processing", "failed"],
  quality_review:    ["delivery", "failed", "dispatched"],  // dispatched = re-gen approved
  delivery:          ["complete"],
  complete:          [],  // terminal
  failed:            [],  // terminal
  cancelled:         [],  // terminal
  // ── Pipeline stage transitions ──────────────────────────
  story_bible_ready:       ["dispatched", "production_bible_ready", "failed", "cancelled"],
  production_bible_ready:  ["dispatched", "audio_ready", "clips_generating", "failed", "cancelled"],
  audio_ready:             ["clips_generating", "assembling", "failed"],
  clips_generating:        ["assembling", "qc_failed", "failed"],
  assembling:              ["quality_review", "qc_failed", "delivery", "failed"],
  qc_failed:               ["dispatched", "quality_review", "failed"], // dispatched = auto-retry
};

// ─── State Machine ────────────────────────────────────────────
export class JobStateMachine {
  /**
   * Transition a job to a new state.
   * Validates the transition, persists to DB, syncs Redis, emits event.
   */
  static async transition(
    jobId: string,
    toStatus: JobStatus,
    meta?: {
      provider?: string;
      providerJobId?: string;
      errorMessage?: string;
      actualCostCents?: number;
      outputPayload?: Record<string, unknown>;
      retryCount?: number;
    }
  ): Promise<void> {
    const redis = getRedis();

    // 1. Load current state
    const current = await this.getState(jobId);
    if (!current) throw new Error(`[StateMachine] Job ${jobId} not found`);

    // 2. Validate transition
    const allowed = TRANSITIONS[current];
    if (!allowed.includes(toStatus)) {
      throw new Error(
        `[StateMachine] Invalid transition: ${current} → ${toStatus} for job ${jobId}`
      );
    }

    // 3. Build update patch
    const now = new Date();
    const patch: Partial<typeof aiJobs.$inferInsert> = {
      status: toStatus,
      ...(meta?.provider        && { provider: meta.provider }),
      ...(meta?.providerJobId   && { providerJobId: meta.providerJobId }),
      ...(meta?.errorMessage    && { errorMessage: meta.errorMessage }),
      ...(meta?.actualCostCents !== undefined && { actualCostCents: meta.actualCostCents }),
      ...(meta?.outputPayload   && { outputPayload: meta.outputPayload }),
      ...(meta?.retryCount      !== undefined && { retryCount: meta.retryCount }),
      ...(toStatus === "dispatched"  && { dispatchedAt: now }),
      ...(toStatus === "complete"    && { completedAt: now }),
    };

    // 4. Persist to PostgreSQL
    await db.update(aiJobs).set(patch).where(eq(aiJobs.id, jobId));

    // 5. Sync to Redis (fast lookups for worker loop)
    await redis.hset(REDIS_KEYS.jobState(jobId), {
      status:    toStatus,
      updatedAt: now.toISOString(),
      ...(meta?.provider && { provider: meta.provider }),
    });
    await redis.expire(REDIS_KEYS.jobState(jobId), 7 * 24 * 60 * 60);

    // 6. Emit event
    const eventMap: Partial<Record<JobStatus, string>> = {
      queued:            EVENTS.JOB_QUEUED,
      dispatched:        EVENTS.JOB_DISPATCHED,
      processing:        EVENTS.JOB_PROCESSING,
      complete:          EVENTS.JOB_COMPLETE,
      failed:            EVENTS.JOB_FAILED,
      retry:             EVENTS.JOB_RETRY,
      failover_dispatch: EVENTS.JOB_FAILOVER,
      cancelled:         EVENTS.JOB_CANCELLED,
      quality_review:    EVENTS.JOB_QUALITY_REVIEW,
      // Pipeline stage events
      story_bible_ready:      "pipeline.story_bible_ready",
      production_bible_ready: "pipeline.production_bible_ready",
      audio_ready:            "pipeline.audio_ready",
      clips_generating:       "pipeline.clips_generating",
      assembling:             "pipeline.assembling",
      qc_failed:              "pipeline.qc_failed",
      delivery:               "pipeline.delivery",
    };

    const eventType = eventMap[toStatus];
    if (eventType) {
      await EventBus.publish(eventType as any, {
        jobId,
        fromStatus: current,
        toStatus,
        provider: meta?.provider,
        errorMessage: meta?.errorMessage,
        actualCostCents: meta?.actualCostCents,
      }, { jobId });
    }
  }

  /**
   * Get current job status from Redis (fast) or DB (fallback).
   */
  static async getState(jobId: string): Promise<JobStatus | null> {
    const redis = getRedis();
    const cached = await redis.hget(REDIS_KEYS.jobState(jobId), "status");
    if (cached) return cached as JobStatus;

    // Fallback to DB
    const rows = await db.select({ status: aiJobs.status }).from(aiJobs).where(eq(aiJobs.id, jobId));
    return rows[0]?.status as JobStatus | null;
  }

  /**
   * Check if job is in a terminal state.
   */
  static isTerminal(status: JobStatus): boolean {
    return status === "complete" || status === "failed" || status === "cancelled";
  }

  /**
   * Check if a transition is valid without executing it.
   */
  static canTransition(from: JobStatus, to: JobStatus): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }
}
