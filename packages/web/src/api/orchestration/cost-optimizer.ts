// ============================================================
// Ghaafeedi Music — Cost Optimizer & Provider Router
// Scores all eligible providers and selects optimal route.
// Weights loaded from DB routing_rules — no hard-coding.
// ============================================================
import { db } from "../database/pg-client";
import { providers, routingRules } from "../database/pg-schema";
import { eq, and } from "drizzle-orm";
import { ProviderRegistry, type ProviderAdapter } from "./adapters/provider-adapter";
import { getRedis, REDIS_KEYS } from "./redis-client";
import type { JobSpec } from "./job-queue";

// ─── Weight profiles per job type ─────────────────────────────
// Loaded from DB if present; these are defaults.
const DEFAULT_WEIGHTS: Record<string, { quality: number; cost: number; speed: number }> = {
  video:          { quality: 0.55, cost: 0.20, speed: 0.25 },
  song:           { quality: 0.50, cost: 0.35, speed: 0.15 },
  voice_clone:    { quality: 0.65, cost: 0.20, speed: 0.15 },
  visualization:  { quality: 0.45, cost: 0.30, speed: 0.25 },
  analysis:       { quality: 0.40, cost: 0.40, speed: 0.20 },
  lyrics:         { quality: 0.45, cost: 0.35, speed: 0.20 },
  storyboard:     { quality: 0.45, cost: 0.35, speed: 0.20 },
  narration:      { quality: 0.50, cost: 0.30, speed: 0.20 },
  image:          { quality: 0.55, cost: 0.25, speed: 0.20 },
};

// Reference costs for normalization (cents)
const REFERENCE_COST: Record<string, number> = {
  video:  700,    // $7.00 reference
  song:   10,     // $0.10 reference
  other:  5,      // $0.05 reference
};

export interface RouteDecision {
  adapter:       ProviderAdapter;
  score:         number;
  estimatedCost: number;
  reasoning:     string;
}

export class CostOptimizer {
  /**
   * Select the optimal provider for a job.
   * Returns top-scored adapter.
   */
  static async selectProvider(job: JobSpec): Promise<RouteDecision> {
    const redis = getRedis();

    // 1. Check routing rules (DB-driven, highest priority)
    const ruleMatch = await this.matchRoutingRule(job);
    if (ruleMatch) {
      const adapter = ProviderRegistry.get(ruleMatch);
      if (adapter) {
        const est = await adapter.estimateCost(job);
        return {
          adapter,
          score:         100,
          estimatedCost: est.estimateCents,
          reasoning:     `Routing rule matched → ${ruleMatch}`,
        };
      }
    }

    // 2. Score all eligible adapters
    const candidates = ProviderRegistry.getForJobType(job.jobType);
    if (candidates.length === 0) {
      throw new Error(`[Router] No adapters registered for job type: ${job.jobType}`);
    }

    // 3. Check provider availability from DB
    const enabledProviders = await db
      .select({ name: providers.name, enabled: providers.enabled,
                hourlyBudgetCents: providers.hourlyBudgetCents,
                maxConcurrent: providers.maxConcurrent })
      .from(providers)
      .where(eq(providers.enabled, true));

    const enabledNames = new Set(enabledProviders.map((p) => p.name));

    const weights = DEFAULT_WEIGHTS[job.jobType] ?? DEFAULT_WEIGHTS["analysis"]!;
    const refCost = REFERENCE_COST[job.jobType] ?? REFERENCE_COST["other"]!;

    const scores: RouteDecision[] = [];

    for (const adapter of candidates) {
      if (!enabledNames.has(adapter.name)) continue;

      try {
        const health = await redis.hget(REDIS_KEYS.providerHealth(adapter.name), "healthy");
        if (health === "false") continue;

        const conc = Number(await redis.get(REDIS_KEYS.providerConc(adapter.name))) || 0;
        const cfg = enabledProviders.find((p) => p.name === adapter.name);
        if (cfg?.maxConcurrent && conc >= cfg.maxConcurrent) continue;

        const est = await adapter.estimateCost(job);

        // Score 0–1 for each dimension
        const qualityScore = this.qualityScore(adapter.name);
        const costScore    = Math.min(1, refCost / Math.max(est.estimateCents, 1));
        const speedScore   = this.speedScore(adapter.name);
        const loadPenalty  = Math.min(0.3, conc * 0.02);

        const score =
          weights.quality * qualityScore +
          weights.cost    * costScore +
          weights.speed   * speedScore -
          loadPenalty;

        scores.push({
          adapter,
          score:         Math.round(score * 1000) / 1000,
          estimatedCost: est.estimateCents,
          reasoning:     `q:${qualityScore.toFixed(2)} c:${costScore.toFixed(2)} s:${speedScore.toFixed(2)} load:-${loadPenalty.toFixed(2)}`,
        });
      } catch {
        // Provider threw on cost estimate — skip
      }
    }

    if (scores.length === 0) {
      throw new Error(`[Router] All providers unavailable for job type: ${job.jobType}`);
    }

    scores.sort((a, b) => b.score - a.score);
    return scores[0]!;
  }

  /**
   * Check DB routing rules for an explicit provider match.
   */
  private static async matchRoutingRule(job: JobSpec): Promise<string | null> {
    try {
      const rules = await db
        .select()
        .from(routingRules)
        .where(eq(routingRules.enabled, true))
        .orderBy(routingRules.priority);

      for (const rule of rules) {
        const conds = rule.conditions as Record<string, unknown>;
        if (conds.job_type && conds.job_type !== job.jobType) continue;
        if (conds.tier     && conds.tier     !== job.tier)    continue;
        if (rule.targetProvider) return rule.targetProvider;
      }
    } catch {
      // DB unavailable — skip rule matching
    }
    return null;
  }

  // ─── Quality scores by provider (higher = better output quality) ───
  private static qualityScore(name: string): number {
    const scores: Record<string, number> = {
      fal_ai_kling:  0.92,
      fal_ai_hailuo: 0.78,
      modal:         0.72,
      vast_ai:       0.65,
      poyo:          0.90,  // Poyo.ai (Suno V5.5 + full pipeline)
      elevenlabs:    0.90,
      openai:        0.95,
    };
    return scores[name] ?? 0.70;
  }

  // ─── Speed scores (lower latency = higher score) ──────────────
  private static speedScore(name: string): number {
    const scores: Record<string, number> = {
      fal_ai_kling:  0.80,
      fal_ai_hailuo: 0.85,
      modal:         0.60,
      vast_ai:       0.40,
      poyo:          0.80,  // Poyo.ai (async, typical 30-90s turnaround)
      elevenlabs:    0.95,
      openai:        0.90,
    };
    return scores[name] ?? 0.60;
  }
}
