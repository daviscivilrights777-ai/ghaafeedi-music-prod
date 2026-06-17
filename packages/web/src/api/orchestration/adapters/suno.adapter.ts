// ============================================================
// Ghaafeedi Music — Suno/Sunor.cc Adapter
// Song generation. Auto-switches PAYG → Bulk → Enterprise tier.
// ============================================================
import type { ProviderAdapter, CostEstimate, JobHandle, ProviderJobResult, ProviderHealth } from "./provider-adapter";
import type { JobSpec } from "../job-queue";
import { getSecret, SECRET_KEYS } from "../secrets";
import { getRedis } from "../redis-client";

// Real Sunor.cc API base (from their docs: https://sunor.cc/api/v1/task)
const SUNOR_API = "https://sunor.cc/api/v1";

// Cost tiers (cents per song)
const TIERS = {
  payg:       10,  // $0.10/song
  bulk:        6.5, // $0.065/song at 100+/mo
  enterprise:  5.4, // $0.054/song at 500+/mo
} as const;

const MONTHLY_COUNTER_KEY = (ym: string) => `suno:monthly:${ym}`;

async function getCurrentTierCostCents(): Promise<number> {
  const redis = getRedis();
  const ym = new Date().toISOString().slice(0, 7); // "2026-06"
  const count = Number(await redis.get(MONTHLY_COUNTER_KEY(ym))) || 0;
  if (count >= 500) return TIERS.enterprise;
  if (count >= 100) return TIERS.bulk;
  return TIERS.payg;
}

export const SunoAdapter: ProviderAdapter = {
  name:        "sunor_cc",
  displayName: "Suno / Sunor.cc",
  jobTypes:    ["song"],

  async estimateCost(_job: JobSpec): Promise<CostEstimate> {
    const cpc = await getCurrentTierCostCents();
    const tierLabel = cpc === TIERS.enterprise ? "enterprise" : cpc === TIERS.bulk ? "bulk" : "payg";
    return {
      minCents:      cpc,
      maxCents:      cpc,
      estimateCents: cpc,
      unit:          "per_song",
      breakdown:     `1 song × $${(cpc / 100).toFixed(3)} (${tierLabel} tier)`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const apiKey = await getSecret(SECRET_KEYS.SUNO_API_KEY);

    // Sunor.cc REST API — POST /api/v1/task with x-api-key header
    const payload = {
      model:     "suno",
      task_type: "music",
      input: {
        gpt_description_prompt: job.inputPayload?.lyrics || job.inputPayload?.prompt || "",
        prompt:                  job.inputPayload?.lyrics || undefined,
        title:                   job.inputPayload?.title  || undefined,
        tags:                    job.inputPayload?.genre  || "cinematic emotional",
        make_instrumental:       job.inputPayload?.instrumental || false,
      },
    };

    const res = await fetch(`${SUNOR_API}/task`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key":    apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Suno] Dispatch failed: ${res.status} ${err}`);
    }

    const data = await res.json() as { task_id?: string; id?: string; taskId?: string };
    const taskId = data.task_id ?? data.taskId ?? data.id;

    // Increment monthly counter for tier management
    const ym = new Date().toISOString().slice(0, 7);
    const redis = getRedis();
    await redis.incr(MONTHLY_COUNTER_KEY(ym));
    // Set expiry to end of month (32 days is safe)
    await redis.expire(MONTHLY_COUNTER_KEY(ym), 32 * 24 * 60 * 60);

    return {
      externalJobId: taskId ?? `suno-${Date.now()}`,
      provider:      this.name,
      dispatchedAt:  new Date(),
      pollIntervalMs: 10_000,
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const apiKey = await getSecret(SECRET_KEYS.SUNO_API_KEY);

    const res = await fetch(`${SUNOR_API}/task/${handle.externalJobId}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) return { status: "failed", errorMessage: `Status check failed: ${res.status}` };

    const data = await res.json() as {
      status: string;
      audio_url?: string;
      video_url?: string;
      metadata?: Record<string, unknown>;
    };

    if (data.status === "complete") {
      return {
        status:    "complete",
        outputUrl: data.audio_url,
        outputUrls: [data.audio_url, data.video_url].filter(Boolean) as string[],
        metadata:  data.metadata,
        costCents: await getCurrentTierCostCents(),
      };
    }
    if (data.status === "error") return { status: "failed", errorMessage: "Suno generation failed" };
    return { status: "processing" };
  },

  async cancelJob(_handle: JobHandle): Promise<void> {
    // Suno does not support cancellation — no-op
  },

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const apiKey = await getSecret(SECRET_KEYS.SUNO_API_KEY);
      // Sunor.cc health: POST /api/v1/task returns 405 GET (alive) or 401 (bad key)
      // We GET the task endpoint — 405 means server is up and responding
      const res = await fetch(`${SUNOR_API}/task`, {
        method: "GET",
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(8_000),
      });
      // 401 = bad key (server alive), 405 = wrong method (server alive), 200 = great
      const alive = res.ok || res.status === 401 || res.status === 405 || res.status === 403;
      return {
        healthy:  alive,
        latencyMs: Date.now() - start,
        message:  alive ? `HTTP ${res.status} — Sunor.cc reachable` : `HTTP ${res.status}`,
        checkedAt: new Date(),
      };
    } catch (e: any) {
      return { healthy: false, message: e.message, checkedAt: new Date() };
    }
  },
};
