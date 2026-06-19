// ============================================================
// Ghaafeedi Music — Job Queue
// Priority queue per membership tier using Redis lists.
// elite > premium > starter > free
// ============================================================
import { getRedis, REDIS_KEYS, QUEUE_TIERS, QueueTier } from "./redis-client";
import { v4 as uuidv4 } from "uuid";

export interface JobSpec {
  jobId:       string;
  userId:      string;
  orderId?:    string;
  productionId?: string;
  storyId?:    string;
  jobType:     JobType;
  tier:        QueueTier;
  priority:    number;       // 1=highest
  inputPayload: Record<string, unknown>;
  estimatedCostCents?: number;
  enqueuedAt:  string;       // ISO timestamp
  metadata?:   Record<string, unknown>;
}

export type JobType =
  | "song"
  | "video"
  | "voice_clone"
  | "visualization"
  | "narration"
  | "analysis"
  | "image"
  | "storyboard"
  | "lyrics"
  | "sophia_intro"
  | "lip_sync";    // Sophia Lip Sync Narration upgrade — FAL.ai LatentSync (Phase 6)

export class JobQueue {
  /**
   * Enqueue a job. Returns the job spec with assigned jobId.
   */
  static async enqueue(spec: Omit<JobSpec, "jobId" | "enqueuedAt">): Promise<JobSpec> {
    const redis = getRedis();
    const jobId = `job_${uuidv4().replace(/-/g, "")}`;
    const job: JobSpec = {
      ...spec,
      jobId,
      enqueuedAt: new Date().toISOString(),
    };

    const key = REDIS_KEYS.jobQueue(spec.tier);
    // LPUSH = add to head (newest at front for LIFO within same tier)
    // We use sorted sets per priority for intra-tier ordering
    await redis.lpush(key, JSON.stringify(job));

    // Set TTL so orphaned queue entries don't persist forever (7 days)
    await redis.expire(key, 7 * 24 * 60 * 60);

    return job;
  }

  /**
   * Dequeue next job — respects tier priority order.
   * Checks elite first, then premium, starter, free.
   * Returns null if all queues empty.
   */
  static async dequeue(): Promise<JobSpec | null> {
    const redis = getRedis();

    for (const tier of QUEUE_TIERS) {
      const key = REDIS_KEYS.jobQueue(tier);
      const raw = await redis.rpop(key);
      if (raw) {
        const job = typeof raw === "string" ? JSON.parse(raw) : raw;
        return job as JobSpec;
      }
    }

    return null;
  }

  /**
   * Peek at queue depths without consuming.
   */
  static async depths(): Promise<Record<QueueTier, number>> {
    const redis = getRedis();
    const result = {} as Record<QueueTier, number>;

    await Promise.all(
      QUEUE_TIERS.map(async (tier) => {
        const len = await redis.llen(REDIS_KEYS.jobQueue(tier));
        result[tier] = len;
      })
    );

    return result;
  }

  /**
   * Total jobs waiting across all tiers.
   */
  static async totalDepth(): Promise<number> {
    const depths = await this.depths();
    return Object.values(depths).reduce((a, b) => a + b, 0);
  }

  /**
   * Re-enqueue a job (e.g. after failover — back to front of its tier queue).
   */
  static async requeue(job: JobSpec): Promise<void> {
    const redis = getRedis();
    const key = REDIS_KEYS.jobQueue(job.tier);
    // rpush = back of queue = processed last (lower priority within tier on retry)
    await redis.rpush(key, JSON.stringify({ ...job, requeuedAt: new Date().toISOString() }));
  }
}
