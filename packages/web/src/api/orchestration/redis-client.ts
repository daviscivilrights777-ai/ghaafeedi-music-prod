// ============================================================
// Ghaafeedi Music — Redis Client (Upstash / ioredis compatible)
// Used for: job queues, session cache, rate limiting, real-time counters
// ============================================================
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (redis) return redis;

  const url   = process.env.UPSTASH_REDIS_REST_URL   || process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN  || process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    throw new Error("[Redis] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
  }

  redis = new Redis({ url, token });
  return redis;
}

// ─── Key builders ─────────────────────────────────────────────
export const REDIS_KEYS = {
  // Job queues — one list per tier (LPUSH to add, BRPOP to consume)
  jobQueue:         (tier: string)         => `queue:jobs:${tier}`,
  // Real-time job state
  jobState:         (jobId: string)        => `job:state:${jobId}`,
  // Monthly quota counter
  quota:            (userId: string, ym: string) => `quota:${userId}:${ym}`,
  // Provider health
  providerHealth:   (name: string)         => `provider:health:${name}`,
  // Provider concurrency counter
  providerConc:     (name: string)         => `provider:concurrency:${name}`,
  // Cached entitlement result
  entitlement:      (userId: string)       => `entitlement:${userId}`,
  // API rate limit window
  rateApi:          (userId: string)       => `rate:api:${userId}`,
  // Job submission rate limit
  rateSubmit:       (userId: string)       => `rate:submit:${userId}`,
  // Running revenue counter
  revenueToday:     ()                     => `analytics:revenue:today`,
  // User LTV
  ltv:              (userId: string)       => `ltv:${userId}`,
  // Session
  session:          (token: string)        => `session:${token}`,
} as const;

// ─── Queue tier priority order ────────────────────────────────
export const QUEUE_TIERS = ["elite", "premium", "starter", "free"] as const;
export type QueueTier = typeof QUEUE_TIERS[number];

export function tierToPriority(tier: string): number {
  const map: Record<string, number> = { elite: 1, premium: 2, starter: 3, free: 4 };
  return map[tier] ?? 5;
}
