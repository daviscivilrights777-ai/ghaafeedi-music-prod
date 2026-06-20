// ============================================================
// Ghaafeedi Music — FAL.ai LatentSync Adapter
// Phase 6: Sophia Lip Sync Narration ($29 add-on / Elite FREE)
// Model: fal-ai/latentsync (video + audio → lip-synced video)
// Pricing: ~$0.015/s of output video — 60s clip ≈ $0.90
// ============================================================
import type { ProviderAdapter, CostEstimate, JobHandle, ProviderJobResult, ProviderHealth } from "./provider-adapter";
import type { JobSpec } from "../job-queue";
import { getSecret, SECRET_KEYS } from "../secrets";

const LATENTSYNC_MODEL = "fal-ai/latentsync";

// LatentSync billing: ~1.5¢ per second of output video
const COST_PER_SECOND_CENTS = 1.5;

export const LatentSyncAdapter: ProviderAdapter = {
  name:        "latentsync",
  displayName: "FAL.ai LatentSync",
  jobTypes:    ["lip_sync"],

  // ─── Cost Estimate ──────────────────────────────────────────────────────────
  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const durationSeconds = (job.inputPayload?.durationSeconds as number) || 60;
    const est = Math.round(durationSeconds * COST_PER_SECOND_CENTS);
    return {
      minCents:      Math.round(est * 0.8),
      maxCents:      Math.round(est * 1.4),
      estimateCents: est,
      unit:          "per_second",
      breakdown:     `~${durationSeconds}s × $${COST_PER_SECOND_CENTS / 100}/s = $${(est / 100).toFixed(2)}`,
    };
  },

  // ─── Dispatch ───────────────────────────────────────────────────────────────
  async dispatch(job: JobSpec): Promise<JobHandle> {
    const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);

    const videoUrl  = job.inputPayload?.videoUrl  as string | undefined;
    const audioUrl  = job.inputPayload?.audioUrl  as string | undefined;
    const guidanceScale = (job.inputPayload?.guidanceScale as number) || 2.0;
    const syncConf  = (job.inputPayload?.syncConfidence as number) || 0.92;

    if (!videoUrl) throw new Error("[LatentSync] inputPayload.videoUrl is required");
    if (!audioUrl) throw new Error("[LatentSync] inputPayload.audioUrl is required");

    const payload = {
      video_url:        videoUrl,
      audio_url:        audioUrl,
      guidance_scale:   guidanceScale,
      // sync_confidence controls lip sync tightness — 0.92 is optimal for narration
      sync_confidence:  syncConf,
      // output_format: mp4 always
      output_format:    "mp4",
    };

    const res = await fetch(`https://queue.fal.run/${LATENTSYNC_MODEL}`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[LatentSync] Dispatch failed: ${res.status} — ${err}`);
    }

    const data = await res.json() as { request_id: string };

    return {
      externalJobId:  data.request_id,
      provider:       this.name,
      dispatchedAt:   new Date(),
      pollIntervalMs: 4_000,
      metadata: {
        model:          LATENTSYNC_MODEL,
        durationSeconds: job.inputPayload?.durationSeconds,
        orderId:         job.orderId,
        isEliteFree:    job.inputPayload?.isEliteFree === true,
      },
    };
  },

  // ─── Status Poll ────────────────────────────────────────────────────────────
  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);

    const res = await fetch(
      `https://queue.fal.run/${LATENTSYNC_MODEL}/requests/${handle.externalJobId}/status`,
      { headers: { "Authorization": `Key ${apiKey}` } }
    );

    if (!res.ok) {
      return { status: "failed", errorMessage: `Status check failed: ${res.status}` };
    }

    const data = await res.json() as {
      status: string;
      response_url?: string;
      error?: string;
    };

    if (data.status === "COMPLETED") {
      const resultRes = await fetch(
        `https://queue.fal.run/${LATENTSYNC_MODEL}/requests/${handle.externalJobId}`,
        { headers: { "Authorization": `Key ${apiKey}` } }
      );
      if (!resultRes.ok) {
        return { status: "failed", errorMessage: "Failed to fetch LatentSync result" };
      }

      const result = await resultRes.json() as {
        video?: { url: string; content_type: string };
        output?: { video_url: string };
      };

      const outputUrl = result.video?.url || result.output?.video_url;

      if (!outputUrl) {
        return { status: "failed", errorMessage: "LatentSync returned no video URL" };
      }

      return {
        status:    "complete",
        outputUrl,
        metadata: {
          isEliteFree:     handle.metadata?.isEliteFree,
          durationSeconds: handle.metadata?.durationSeconds,
          model:           LATENTSYNC_MODEL,
        },
      };
    }

    if (data.status === "FAILED") {
      return {
        status:       "failed",
        errorMessage: data.error || "LatentSync generation failed",
      };
    }

    if (data.status === "IN_QUEUE" || data.status === "IN_PROGRESS") {
      return { status: "processing" };
    }

    return { status: "processing" };
  },

  // ─── Cancel ─────────────────────────────────────────────────────────────────
  async cancelJob(handle: JobHandle): Promise<void> {
    const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);
    await fetch(
      `https://queue.fal.run/${LATENTSYNC_MODEL}/requests/${handle.externalJobId}/cancel`,
      { method: "PUT", headers: { "Authorization": `Key ${apiKey}` } }
    ).catch(() => {}); // best-effort cancel
  },

  // ─── Health Check ────────────────────────────────────────────────────────────
  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    const dashboardUrl = "https://fal.ai/dashboard/billing";

    try {
      const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);

      // POST an intentionally invalid payload — fails fast without billing
      const res = await fetch(`https://queue.fal.run/${LATENTSYNC_MODEL}`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Key ${apiKey}`,
        },
        body: JSON.stringify({ __health_probe__: true }),
        signal: AbortSignal.timeout(8_000),
      });

      const latencyMs = Date.now() - start;
      let bodyText = "";
      try { bodyText = await res.text(); } catch {}

      const exhausted =
        bodyText.toLowerCase().includes("exhausted balance") ||
        bodyText.toLowerCase().includes("exhausted_balance") ||
        (bodyText.toLowerCase().includes("locked") && bodyText.toLowerCase().includes("balance"));

      const reachable =
        res.ok ||
        res.status === 400 ||
        res.status === 401 ||
        res.status === 403 ||
        res.status === 405 ||
        res.status === 422;

      if (exhausted) {
        return {
          healthy:             false,
          latencyMs,
          message:             "FAL.ai LatentSync — balance exhausted. Top up at fal.ai/dashboard/billing",
          checkedAt:           new Date(),
          balanceCents:        0,
          balanceStatus:       "exhausted",
          balanceDashboardUrl: dashboardUrl,
        };
      }

      return {
        healthy:             reachable,
        latencyMs,
        message:             reachable
          ? `FAL.ai LatentSync reachable (HTTP ${res.status})`
          : `FAL.ai LatentSync unreachable (HTTP ${res.status})`,
        checkedAt:           new Date(),
        balanceCents:        null,
        balanceStatus:       reachable ? "ok" : "unknown",
        balanceDashboardUrl: dashboardUrl,
      };
    } catch (e: any) {
      return {
        healthy:             false,
        message:             `LatentSync health check error: ${e.message}`,
        checkedAt:           new Date(),
        balanceCents:        null,
        balanceStatus:       "unknown",
        balanceDashboardUrl: dashboardUrl,
      };
    }
  },
};
