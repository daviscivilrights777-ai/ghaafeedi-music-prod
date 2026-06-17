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
  | "delivery";

// ─── Allowed transitions ──────────────────────────────────────
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  queued:            ["dispatched", "cancelled"],
  dispatched:        ["processing", "retry", "failed", "cancelled"],
  processing:        ["complete", "retry", "failed", "quality_review"],
  retry:             ["dispatched", "failover_dispatch", "failed"],
  failover_dispatch: ["processing", "failed"],
  quality_review:    ["delivery", "failed", "dispatched"], // dispatched = re-gen approved
  delivery:          ["complete"],
  complete:          [],  // terminal
  failed:            [],  // terminal
  cancelled:         [],  // terminal
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
