// ============================================================
// Ghaafeedi Music — Modal Adapter
// GPU burst compute — overflow + video assembly (FFmpeg).
// ============================================================
import type { ProviderAdapter, CostEstimate, JobHandle, ProviderJobResult, ProviderHealth } from "./provider-adapter";
import type { JobSpec } from "../job-queue";
import { getSecret, SECRET_KEYS } from "../secrets";

// Modal deployed endpoint — configured in secrets/env
const MODAL_ENDPOINT = process.env.MODAL_ENDPOINT_URL || "https://modal-labs--ghaafeedi-music.modal.run";

const COST_PER_SECOND_CENTS = 5.5; // $0.055/s A100

export const ModalAdapter: ProviderAdapter = {
  name:        "modal",
  displayName: "Modal GPU Burst",
  jobTypes:    ["video", "visualization"],

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const duration = (job.inputPayload?.durationSeconds as number) || 60;
    const est = Math.round(duration * COST_PER_SECOND_CENTS);
    return {
      minCents:      Math.round(est * 0.7),
      maxCents:      Math.round(est * 1.4),
      estimateCents: est,
      unit:          "per_second",
      breakdown:     `~${duration}s × $${COST_PER_SECOND_CENTS / 100}/s (A100) = $${(est / 100).toFixed(2)}`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const apiKey = await getSecret(SECRET_KEYS.MODAL_API_KEY);

    const res = await fetch(`${MODAL_ENDPOINT}/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body:    JSON.stringify({
        job_id:  job.jobId,
        type:    job.jobType,
        payload: job.inputPayload,
      }),
    });

    if (!res.ok) throw new Error(`[Modal] Dispatch failed: ${res.status}`);
    const data = await res.json() as { task_id: string };
    return {
      externalJobId: data.task_id,
      provider:      this.name,
      dispatchedAt:  new Date(),
      pollIntervalMs: 8_000,
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const apiKey = await getSecret(SECRET_KEYS.MODAL_API_KEY);

    const res = await fetch(`${MODAL_ENDPOINT}/status/${handle.externalJobId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!res.ok) return { status: "failed", errorMessage: `Modal status check failed: ${res.status}` };
    const data = await res.json() as {
      status: string;
      output_url?: string;
      duration_seconds?: number;
      error?: string;
    };

    if (data.status === "done")    return { status: "complete", outputUrl: data.output_url, durationSeconds: data.duration_seconds };
    if (data.status === "failed")  return { status: "failed", errorMessage: data.error || "Modal job failed" };
    return { status: "processing" };
  },

  async cancelJob(handle: JobHandle): Promise<void> {
    const apiKey = await getSecret(SECRET_KEYS.MODAL_API_KEY);
    await fetch(`${MODAL_ENDPOINT}/cancel/${handle.externalJobId}`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
  },

  async healthCheck(): Promise<ProviderHealth> {
    // Modal is a secondary/overflow GPU provider — only active when MODAL_API_KEY is set
    const key = process.env.MODAL_API_KEY;
    if (!key) {
      return {
        healthy:  false,
        message:  "Modal not configured (MODAL_API_KEY not set) — overflow provider, activates on demand",
        checkedAt: new Date(),
      };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${MODAL_ENDPOINT}/health`, { signal: AbortSignal.timeout(5_000) });
      return { healthy: res.ok, latencyMs: Date.now() - start, checkedAt: new Date() };
    } catch (e: any) {
      return { healthy: false, message: e.message, checkedAt: new Date() };
    }
  },
};
