// ============================================================
// Ghaafeedi Music — Vast.ai Adapter
// Spot GPU — non-urgent batch jobs, off-peak generation, cost optimization.
// NEVER used for same-day delivery orders.
// ============================================================
import type { ProviderAdapter, CostEstimate, JobHandle, ProviderJobResult, ProviderHealth } from "./provider-adapter";
import type { JobSpec } from "../job-queue";
import { getSecret, SECRET_KEYS } from "../secrets";

const BASE = "https://console.vast.ai/api/v0";
const VAST_API = "https://vast.ai/api/v0";

// Spot pricing range (cents/sec) — varies by availability
const COST_PER_SECOND_CENTS_MIN = 3;
const COST_PER_SECOND_CENTS_MAX = 5;

export const VastAiAdapter: ProviderAdapter = {
  name:        "vast_ai",
  displayName: "Vast.ai Spot GPU",
  jobTypes:    ["video", "visualization"], // Only non-urgent

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const duration = (job.inputPayload?.durationSeconds as number) || 90;
    const minCents = Math.round(duration * COST_PER_SECOND_CENTS_MIN);
    const maxCents = Math.round(duration * COST_PER_SECOND_CENTS_MAX);
    return {
      minCents,
      maxCents,
      estimateCents: Math.round((minCents + maxCents) / 2),
      unit:          "per_second",
      breakdown:     `~${duration}s × $${COST_PER_SECOND_CENTS_MIN / 100}–$${COST_PER_SECOND_CENTS_MAX / 100}/s (spot) = $${(minCents / 100).toFixed(2)}–$${(maxCents / 100).toFixed(2)}`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const apiKey = await getSecret(SECRET_KEYS.VAST_AI_API_KEY);

    // 1. Find cheapest available instance
    const offerRes = await fetch(
      `${VAST_API}/bundles/?q={"gpu_name":"RTX_3090","num_gpus":{"gte":1},"rentable":true}&order_by=dph_total&limit=5`,
      { headers: { "Authorization": `Bearer ${apiKey}` } }
    );

    if (!offerRes.ok) throw new Error("[Vast.ai] Could not fetch instances");
    const offers = await offerRes.json() as { offers: Array<{ id: number; dph_total: number }> };
    const best = offers.offers?.[0];
    if (!best) throw new Error("[Vast.ai] No instances available");

    // 2. Rent instance and run job
    const rentRes = await fetch(`${VAST_API}/asks/${best.id}/`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        client_id:  "ghaafeedi_music",
        image:      "pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime",
        onstart:    `pip install -q fal-client && python /workspace/generate.py '${JSON.stringify(job.inputPayload)}'`,
        runtype:    "ssh",
      }),
    });

    if (!rentRes.ok) throw new Error(`[Vast.ai] Rent failed: ${rentRes.status}`);
    const rent = await rentRes.json() as { new_contract: number };

    return {
      externalJobId: String(rent.new_contract),
      provider:      this.name,
      dispatchedAt:  new Date(),
      pollIntervalMs: 30_000, // Slow poll — spot instances take time
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const apiKey = await getSecret(SECRET_KEYS.VAST_AI_API_KEY);

    const res = await fetch(`${VAST_API}/instances/${handle.externalJobId}/`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!res.ok) return { status: "failed", errorMessage: "Vast.ai status check failed" };
    const data = await res.json() as { actual_status: string; status_msg?: string };

    if (data.actual_status === "running") return { status: "processing" };
    if (data.actual_status === "exited")  return { status: "complete" }; // Job script completed
    if (data.actual_status === "deleted") return { status: "failed", errorMessage: "Instance deleted" };
    return { status: "processing" };
  },

  async cancelJob(handle: JobHandle): Promise<void> {
    const apiKey = await getSecret(SECRET_KEYS.VAST_AI_API_KEY);
    await fetch(`${VAST_API}/instances/${handle.externalJobId}/`, {
      method:  "DELETE",
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
  },

  async healthCheck(): Promise<ProviderHealth> {
    // Vast.ai is the overflow GPU tier — activates when VAST_AI_API_KEY is set
    const key = process.env.VAST_AI_API_KEY;
    if (!key) {
      return {
        healthy:  false,
        message:  "Vast.ai not configured (VAST_AI_API_KEY not set) — overflow GPU provider, activates on demand",
        checkedAt: new Date(),
      };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${VAST_API}/users/current/`, {
        headers: { "Authorization": `Bearer ${key}` },
        signal: AbortSignal.timeout(5_000),
      });
      return { healthy: res.ok, latencyMs: Date.now() - start, checkedAt: new Date() };
    } catch (e: any) {
      return { healthy: false, message: e.message, checkedAt: new Date() };
    }
  },
};
