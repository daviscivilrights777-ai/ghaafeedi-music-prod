// ============================================================
// Ghaafeedi Music — Modal Adapter
//
// Two separate Modal apps — this adapter targets video gen:
//   ghaafeedi-video-gen  → CogVideoX-5B text-to-video (A100)
//
// Wav2Lip (ghaafeedi-sophia-wav2lip) is handled separately
// in sophia-mobile.ts — NOT touched here.
//
// FFmpeg assembly (ghaafeedi) is handled in ffmpeg-modal.adapter.ts
// ============================================================

import type {
  ProviderAdapter, CostEstimate, JobHandle,
  ProviderJobResult, ProviderHealth,
} from "./provider-adapter";
import type { JobSpec } from "../job-queue";

// ─── Endpoints ───────────────────────────────────────────────────────────────
// Set in Render env: MODAL_VIDEOGEN_BASE_URL
// Defaults match the deployed app label pattern for daviscivilrights777 workspace

const BASE_URL = (
  process.env.MODAL_VIDEOGEN_BASE_URL ||
  "https://daviscivilrights777--videogen"
).replace(/\/$/, "");

const HEALTH_URL   = `${BASE_URL}-health.modal.run`;
const GENERATE_URL = `${BASE_URL}-generate.modal.run`;
const STATUS_URL   = `${BASE_URL}-status.modal.run`;
const SYNC_URL     = `${BASE_URL}-sync.modal.run`;

// A100 pricing: ~$0.055/s, 6s clip ≈ $0.33 → 33¢
const COST_PER_CLIP_CENTS = 35;

// ─── Adapter ─────────────────────────────────────────────────────────────────

export const ModalAdapter: ProviderAdapter = {
  name:        "modal",
  displayName: "Modal GPU — CogVideoX-5B",
  jobTypes:    ["cinematic_video", "video", "visualization"],

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    // Estimate: 1 clip per shot, ~$0.35/clip
    const numShots = (job.inputPayload?.num_shots as number) || 10;
    const est = Math.round(numShots * COST_PER_CLIP_CENTS);
    return {
      minCents:      Math.round(est * 0.8),
      maxCents:      Math.round(est * 1.5),
      estimateCents: est,
      unit:          "per_clip",
      breakdown:     `~${numShots} shots × $${COST_PER_CLIP_CENTS / 100}/clip (A100 CogVideoX) = $${(est / 100).toFixed(2)}`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    // Build video prompt from shot plan or raw payload
    const payload = job.inputPayload as Record<string, unknown>;

    // If this is a cinematic_video job with a shot plan, dispatch the first shot
    // (full multi-shot dispatch is handled by the pipeline orchestrator)
    const prompt = (
      (payload?.visual_prompt as string) ||
      (payload?.prompt as string) ||
      (payload?.customer_story as string)?.slice(0, 300) ||
      "cinematic emotional music video, golden hour, film grain"
    );

    const body = {
      prompt,
      negative_prompt:     payload?.negative_prompt as string || "blurry, low quality, distorted, watermark, text, logo",
      num_frames:          Number(payload?.num_frames ?? 49),
      fps:                 Number(payload?.fps ?? 8),
      guidance_scale:      Number(payload?.guidance_scale ?? 6.0),
      num_inference_steps: Number(payload?.num_inference_steps ?? 50),
      seed:                Number(payload?.seed ?? 42),
      ghaafeedi_job_id:    job.jobId,
      shot_id:             payload?.shot_id as string || "",
    };

    const res = await fetch(GENERATE_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`[Modal] Dispatch failed ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as {
      job_id: string;
      status: string;
      status_url: string;
      estimated_seconds: number;
    };

    return {
      externalJobId:  data.job_id,
      provider:       this.name,
      dispatchedAt:   new Date(),
      pollIntervalMs: 15_000,   // CogVideoX takes ~60-90s
      webhookUrl:     data.status_url,
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const res = await fetch(`${STATUS_URL}?job_id=${encodeURIComponent(handle.externalJobId)}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return { status: "failed", errorMessage: `Modal status check failed: ${res.status}` };
    }

    const data = await res.json() as {
      status:             string;
      output_url?:        string;
      duration_seconds?:  number;
      file_size_bytes?:   number;
      elapsed_ms?:        number;
      error?:             string;
    };

    if (data.status === "complete") {
      return {
        status:          "complete",
        outputUrl:       data.output_url,
        durationSeconds: data.duration_seconds,
        costCents:       COST_PER_CLIP_CENTS,
        metadata: {
          file_size_bytes: data.file_size_bytes,
          elapsed_ms:      data.elapsed_ms,
        },
      };
    }

    if (data.status === "failed") {
      return { status: "failed", errorMessage: data.error || "Modal video gen failed" };
    }

    // queued | running
    return { status: "processing" };
  },

  async cancelJob(_handle: JobHandle): Promise<void> {
    // Modal async jobs can't be cancelled mid-GPU — no-op
    console.warn("[Modal] cancelJob: Modal GPU tasks cannot be cancelled once started");
  },

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const res = await fetch(HEALTH_URL, {
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) {
        return { healthy: false, message: `Health returned ${res.status}`, checkedAt: new Date() };
      }

      const data = await res.json() as { status: string; model: string; gpu: string };
      return {
        healthy:   data.status === "ok",
        latencyMs: Date.now() - start,
        message:   `${data.model} on ${data.gpu}`,
        checkedAt: new Date(),
      };
    } catch (e: any) {
      return {
        healthy:   false,
        message:   `Modal video-gen unreachable: ${e.message}`,
        checkedAt: new Date(),
      };
    }
  },
};
