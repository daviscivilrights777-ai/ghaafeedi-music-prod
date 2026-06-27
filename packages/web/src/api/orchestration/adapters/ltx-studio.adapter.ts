// ============================================================
// Ghaafeedi Music — LTX Studio Adapter
// Line 2: AI Song + Music Video — Shot Retake
// Model: ltx-video/ltx-video-13b-distilled on FAL.ai (primary)
//        LTX Studio API direct (secondary — when key available)
// Cost: ~$0.10/sec of output video
// ============================================================
import type {
  ProviderAdapter,
  CostEstimate,
  JobHandle,
  ProviderJobResult,
  ProviderHealth,
} from "./provider-adapter";
import type { JobSpec } from "../job-queue";
import { getSecret, SECRET_KEYS } from "../secrets";

// LTX via FAL.ai — best quality, no direct API key needed beyond FAL key
const LTX_FAL_MODEL = "fal-ai/ltx-video/image-to-video";
const LTX_FAL_BASE  = "https://queue.fal.run";
const FAL_BASE      = "https://fal.run";

// Cost: $0.10/sec (10¢/sec) of generated video
const COST_PER_SECOND_CENTS = 10;

export const LtxStudioAdapter: ProviderAdapter = {
  name:        "ltx_studio",
  displayName: "LTX Studio (FAL.ai)",
  jobTypes:    ["ltx_retake"],

  // ─── Cost Estimate ────────────────────────────────────────────────────────
  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const dur = (job.inputPayload?.retake_duration as number) || 4;
    const est = Math.round(dur * COST_PER_SECOND_CENTS);
    return {
      minCents:      Math.round(est * 0.7),
      maxCents:      Math.round(est * 1.5),
      estimateCents: est,
      unit:          "per_second",
      breakdown:     `~${dur}s × $${COST_PER_SECOND_CENTS / 100}/s = $${(est / 100).toFixed(2)}`,
    };
  },

  // ─── Health Check ─────────────────────────────────────────────────────────
  async healthCheck(): Promise<ProviderHealth> {
    try {
      const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);
      if (!apiKey) {
        return {
          healthy: false,
          message: "FAL_API_KEY not configured",
          checkedAt: new Date(),
          balanceStatus: "unknown",
        };
      }

      // Ping FAL.ai model info endpoint
      const res = await fetch(`${FAL_BASE}/fal-ai/ltx-video`, {
        method: "HEAD",
        headers: { Authorization: `Key ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });

      // 200, 405, or 403 all mean reachable
      const healthy = res.status < 500;
      return {
        healthy,
        latencyMs: 0,
        message: healthy ? "LTX Studio reachable via FAL.ai" : `HTTP ${res.status}`,
        checkedAt: new Date(),
        balanceStatus: "unknown",
        balanceDashboardUrl: "https://fal.ai/dashboard",
      };
    } catch (err: any) {
      return {
        healthy: false,
        message: `LTX Studio health check failed: ${err?.message}`,
        checkedAt: new Date(),
      };
    }
  },

  // ─── Dispatch ─────────────────────────────────────────────────────────────
  // Expects inputPayload:
  //   shotIndex, retake_start_time, retake_duration
  //   revised_falPrompt, revised_modalPrompt (fallback)
  //   referenceImageUrl? (first frame of original shot for continuity)
  //   mode: "replace_video"
  //   sophia_director_note
  async dispatch(job: JobSpec): Promise<JobHandle> {
    const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);
    if (!apiKey) throw new Error("[LTXStudio] FAL_API_KEY not configured");

    const {
      revised_falPrompt,
      retake_duration,
      referenceImageUrl,
      revised_cameraMotion,
      revised_lighting,
    } = job.inputPayload as Record<string, unknown>;

    if (!revised_falPrompt) throw new Error("[LTXStudio] revised_falPrompt is required");

    const durationSeconds = (retake_duration as number) || 4;

    // Build enriched prompt with camera + lighting directives
    const enrichedPrompt = [
      revised_falPrompt as string,
      revised_cameraMotion ? `Camera: ${revised_cameraMotion}` : "",
      revised_lighting ? `Lighting: ${revised_lighting}` : "",
    ].filter(Boolean).join(". ");

    const payload: Record<string, unknown> = {
      prompt:           enrichedPrompt,
      duration:         Math.min(Math.max(Math.round(durationSeconds), 1), 15),
      resolution:       "720p",
      // If we have a reference frame, use image-to-video for shot continuity
      ...(referenceImageUrl ? { image_url: referenceImageUrl } : {}),
    };

    // Submit to FAL.ai queue (async dispatch)
    const submitRes = await fetch(`${LTX_FAL_BASE}/fal-ai/ltx-video`, {
      method:  "POST",
      headers: {
        Authorization:  `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      throw new Error(`[LTXStudio] FAL.ai queue submit failed: ${submitRes.status} — ${errText}`);
    }

    const queueData = await submitRes.json() as { request_id: string; status?: string };
    const externalJobId = queueData.request_id;

    console.log(`[LTXStudio] Retake job dispatched. FAL request_id: ${externalJobId}`);

    return {
      externalJobId,
      provider:     "ltx_studio",
      dispatchedAt: new Date(),
      pollIntervalMs: 8000,
      metadata: {
        model:     LTX_FAL_MODEL,
        shotIndex: job.inputPayload?.shotIndex,
        mode:      job.inputPayload?.mode,
        duration:  durationSeconds,
      },
    };
  },

  // ─── Poll ─────────────────────────────────────────────────────────────────
  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);
    if (!apiKey) throw new Error("[LTXStudio] FAL_API_KEY not configured");

    const statusRes = await fetch(
      `${LTX_FAL_BASE}/fal-ai/ltx-video/requests/${handle.externalJobId}/status`,
      { headers: { Authorization: `Key ${apiKey}` } }
    );

    if (!statusRes.ok) {
      return { status: "failed", errorMessage: `Poll HTTP ${statusRes.status}` };
    }

    const statusData = await statusRes.json() as {
      status: string;
      request_id?: string;
    };

    if (statusData.status === "COMPLETED") {
      // Fetch the actual result
      const resultRes = await fetch(
        `${LTX_FAL_BASE}/fal-ai/ltx-video/requests/${handle.externalJobId}`,
        { headers: { Authorization: `Key ${apiKey}` } }
      );
      if (!resultRes.ok) {
        return { status: "failed", errorMessage: `Result fetch HTTP ${resultRes.status}` };
      }
      const result = await resultRes.json() as {
        video?: { url: string };
        videos?: Array<{ url: string }>;
      };
      const outputUrl = result.video?.url ?? result.videos?.[0]?.url;
      return {
        status:    "complete",
        outputUrl,
        costCents: Math.round(((handle.metadata?.duration as number) || 4) * COST_PER_SECOND_CENTS),
      };
    }

    if (statusData.status === "FAILED") {
      return { status: "failed", errorMessage: "LTX Studio generation failed" };
    }

    // IN_PROGRESS or QUEUED
    return { status: "pending" };
  },

  // ─── Cancel ───────────────────────────────────────────────────────────────
  async cancelJob(handle: JobHandle): Promise<void> {
    try {
      const apiKey = await getSecret(SECRET_KEYS.FAL_API_KEY);
      if (!apiKey) return;
      await fetch(
        `${LTX_FAL_BASE}/fal-ai/ltx-video/requests/${handle.externalJobId}/cancel`,
        {
          method:  "PUT",
          headers: { Authorization: `Key ${apiKey}` },
        }
      );
    } catch { /* ignore cancel errors */ }
  },
};
