// ============================================================
// Ghaafeedi Music — FAL.ai Adapter
// Primary video generation provider.
// Models: Kling v3 Pro (primary), Kling v3 Standard (draft), Hailuo 02 Standard (fallback)
// Kling v3 Pro: $0.168/s (audio on) — 40% cheaper than v2 Master, newer architecture
// Updated: June 2026
// ============================================================
import type { ProviderAdapter, CostEstimate, JobHandle, ProviderJobResult, ProviderHealth } from "./provider-adapter";
import type { JobSpec } from "../job-queue";
import { getSecret, SECRET_KEYS } from "../secrets";

const MODELS = {
  kling_pro:           "fal-ai/kling-video/v3/pro/image-to-video",       // primary — cinematic delivery
  kling_standard:      "fal-ai/kling-video/v3/standard/image-to-video",  // drafts / storyboards
  kling_pro_txt:       "fal-ai/kling-video/v3/pro/text-to-video",        // text-to-video variant
  hailuo:              "fal-ai/minimax-video/image-to-video",             // fallback
} as const;

const COST_PER_SECOND_CENTS = {
  kling_pro:      16.8,  // $0.168/s (audio on) — Kling v3 Pro
  kling_standard: 12.6,  // $0.126/s (audio on) — Kling v3 Standard
  hailuo:         4.5,   // $0.045/s
} as const;

// Estimated durations by job type (seconds)
const ESTIMATED_DURATION: Record<string, number> = {
  video:         45,
  visualization: 20,
};

export const FalAiAdapter: ProviderAdapter = {
  name:        "fal_ai_kling",
  displayName: "FAL.ai Kling v3 Pro",
  jobTypes:    ["video", "visualization", "image", "clip_batch"],

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const duration = (job.inputPayload?.durationSeconds as number) || ESTIMATED_DURATION[job.jobType] || 30;
    const cps = COST_PER_SECOND_CENTS.kling_pro;
    const est = Math.round(duration * cps);
    return {
      minCents:      Math.round(est * 0.8),
      maxCents:      Math.round(est * 1.3),
      estimateCents: est,
      unit:          "per_second",
      breakdown:     `~${duration}s × $${cps / 100}/s = $${(est / 100).toFixed(2)}`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);
    // Use kling_standard for draft/preview jobs to save cost; pro for all customer-facing delivery
    const isDraft = job.inputPayload?.draft === true;

    // ── clip_batch: use shot-specific prompt from ShotList ────────────────────
    if (job.jobType === "clip_batch") {
      const shot = job.inputPayload?.shot as Record<string, unknown> | undefined;
      const model = MODELS.kling_pro_txt; // text-to-video for shot generation
      const payload = {
        prompt:         (shot?.falPrompt as string) || (job.inputPayload?.prompt as string) || "",
        negative_prompt: (shot?.negativePrompt as string) || "blurry, low quality, amateur, watermark",
        duration:       (shot?.durationSeconds as number) || 5,
        aspect_ratio:   "16:9",
        generate_audio: false, // audio added in assembly stage
      };
      const res = await fetch(`https://queue.fal.run/${model}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Key ${apiKey}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`[FAL.ai clip_batch] Dispatch failed: ${res.status} ${err}`);
      }
      const data = await res.json() as { request_id: string };
      return {
        externalJobId:  data.request_id,
        provider:       this.name,
        dispatchedAt:   new Date(),
        pollIntervalMs: 5_000,
        metadata:       { model, shotIndex: job.inputPayload?.shotIndex, pipelineRunId: job.pipelineRunId },
      };
    }
    // ─────────────────────────────────────────────────────────────────────────

    const model = (job.inputPayload?.model as string)
      || (isDraft ? MODELS.kling_standard : MODELS.kling_pro);

    const payload = {
      prompt:          job.inputPayload?.prompt || "",
      start_image_url: job.inputPayload?.imageUrl,   // v3 uses start_image_url
      image_url:       job.inputPayload?.imageUrl,   // keep for backward compat
      duration:        job.inputPayload?.durationSeconds || 5,
      aspect_ratio:    job.inputPayload?.aspectRatio || "16:9",
      generate_audio:  job.inputPayload?.generateAudio !== false, // default ON for v3
      ...(job.inputPayload?.negativePrompt && { negative_prompt: job.inputPayload.negativePrompt }),
      ...(job.inputPayload?.endImageUrl   && { end_image_url:   job.inputPayload.endImageUrl }),
    };

    const res = await fetch(`https://queue.fal.run/${model}`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[FAL.ai] Dispatch failed: ${res.status} ${err}`);
    }

    const data = await res.json() as { request_id: string };
    return {
      externalJobId: data.request_id,
      provider:      this.name,
      dispatchedAt:  new Date(),
      pollIntervalMs: 5_000,
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);
    // Use the model stored in handle metadata if available (clip_batch uses text-to-video model)
    const model = (handle.metadata?.model as string) || MODELS.kling_pro;

    const res = await fetch(
      `https://queue.fal.run/${model}/requests/${handle.externalJobId}/status`,
      { headers: { "Authorization": `Key ${apiKey}` } }
    );

    if (!res.ok) {
      return { status: "failed", errorMessage: `Status check failed: ${res.status}` };
    }

    const data = await res.json() as { status: string; response_url?: string };

    if (data.status === "COMPLETED") {
      // Fetch actual result
      const resultRes = await fetch(
        `https://queue.fal.run/${model}/requests/${handle.externalJobId}`,
        { headers: { "Authorization": `Key ${apiKey}` } }
      );
      const result = await resultRes.json() as { video?: { url: string }; images?: Array<{ url: string }> };
      const url = result.video?.url || result.images?.[0]?.url;
      return {
        status:    "complete",
        outputUrl: url,
        metadata:  {
          shotIndex:     handle.metadata?.shotIndex,
          pipelineRunId: handle.metadata?.pipelineRunId,
          clipUrl:       url,
        },
      };
    }

    if (data.status === "FAILED") {
      return { status: "failed", errorMessage: "FAL.ai generation failed" };
    }

    return { status: "processing" };
  },

  async cancelJob(handle: JobHandle): Promise<void> {
    const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);
    await fetch(
      `https://queue.fal.run/${MODELS.kling_pro}/requests/${handle.externalJobId}/cancel`,
      { method: "PUT", headers: { "Authorization": `Key ${apiKey}` } }
    );
  },

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    const dashboardUrl = "https://fal.ai/dashboard/billing";
    try {
      const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);

      // POST a minimal job — this returns the "exhausted balance" error body if $0.
      // We intentionally use an invalid/empty payload so it fails fast without charging.
      const res = await fetch(`https://queue.fal.run/${MODELS.kling_pro}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${apiKey}`,
        },
        body: JSON.stringify({ __health_probe__: true }),
        signal: AbortSignal.timeout(8_000),
      });

      const latencyMs = Date.now() - start;
      let bodyText = "";
      try { bodyText = await res.text(); } catch {}

      // Detect exhausted balance from error body (422/402/403 with "locked"/"exhausted")
      const exhausted = bodyText.toLowerCase().includes("exhausted balance")
        || bodyText.toLowerCase().includes("exhausted_balance")
        || (bodyText.toLowerCase().includes("locked") && bodyText.toLowerCase().includes("balance"));

      // 422 = validation error (API alive, has balance), 402/403+locked = exhausted
      const reachable = res.ok || res.status === 405 || res.status === 422
        || res.status === 400 || res.status === 401 || res.status === 403;

      if (exhausted) {
        return {
          healthy:             false,
          latencyMs,
          message:             "FAL.ai balance exhausted — top up at fal.ai/dashboard/billing",
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
          ? `FAL.ai reachable (HTTP ${res.status})`
          : `FAL.ai unreachable (HTTP ${res.status})`,
        checkedAt:           new Date(),
        balanceCents:        null,   // No public balance API — check dashboard
        balanceStatus:       reachable ? "ok" : "unknown",
        balanceDashboardUrl: dashboardUrl,
      };
    } catch (e: any) {
      return {
        healthy:             false,
        message:             e.message,
        checkedAt:           new Date(),
        balanceCents:        null,
        balanceStatus:       "unknown",
        balanceDashboardUrl: dashboardUrl,
      };
    }
  },
};

// ─── Hailuo fallback adapter ──────────────────────────────────
export const FalAiHailuoAdapter: ProviderAdapter = {
  ...FalAiAdapter,
  name:        "fal_ai_hailuo",
  displayName: "FAL.ai Hailuo 02 Standard",

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const duration = (job.inputPayload?.durationSeconds as number) || 30;
    const cps = COST_PER_SECOND_CENTS.hailuo;
    const est = Math.round(duration * cps);
    return {
      minCents:      Math.round(est * 0.8),
      maxCents:      Math.round(est * 1.3),
      estimateCents: est,
      unit:          "per_second",
      breakdown:     `~${duration}s × $${cps / 100}/s = $${(est / 100).toFixed(2)}`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);
    const payload = {
      prompt:       job.inputPayload?.prompt || "",
      image_url:    job.inputPayload?.imageUrl,
      duration:     job.inputPayload?.durationSeconds || 5,
    };

    const res = await fetch(`https://queue.fal.run/${MODELS.hailuo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Key ${apiKey}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`[FAL.ai Hailuo] Dispatch failed: ${res.status}`);
    const data = await res.json() as { request_id: string };
    return { externalJobId: data.request_id, provider: this.name, dispatchedAt: new Date(), pollIntervalMs: 5_000 };
  },
};
