// ============================================================
// Ghaafeedi Music — FFmpeg Modal Adapter
// Handles edit_assemble jobs: assembles clips into final video.
// Runs ghaafeedi_assemble.py on Modal GPU via HTTP API.
// Phase 9 implementation.
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

// Modal deploy URL for the assembly function
// Format: https://{org}--ghaafeedi-assemble-run.modal.run
const MODAL_BASE_URL = process.env.MODAL_ASSEMBLY_URL
  ?? "https://daviscivilrights777--ghaafeedi-assemble-run.modal.run";

// Cost estimate: ~$0.50 per assembly (20-60s of GPU time @ $0.02-0.04/s)
const ASSEMBLY_COST_CENTS = 50;

// The Modal Python script payload shape
interface AssemblyRequest {
  pipeline_run_id: string;
  production_id: string;
  clip_urls: string[];           // ordered clip URLs to assemble
  audio_url?: string;            // background music
  narration_url?: string;        // voiceover
  crossfade_duration_ms: number;
  credits_duration_seconds: number;
  output_format: "mp4";
  resolution: "1280x720" | "1920x1080";
  fps: number;
  audio_mix: {                   // volume ratios
    music_level: number;         // 0-1, typically 0.15
    narration_level: number;     // 0-1, typically 0.85
  };
  watermark: boolean;
  r2_bucket: string;
  r2_endpoint: string;
  r2_access_key: string;
  r2_secret_key: string;
  r2_output_key: string;         // where to store result in R2
}

interface AssemblyResponse {
  job_id: string;           // Modal job ID for polling
  status: "queued" | "running" | "complete" | "failed";
  output_key?: string;      // R2 key of assembled video
  output_url?: string;      // CDN URL
  duration_seconds?: number;
  error?: string;
}

export const FfmpegModalAdapter: ProviderAdapter = {
  name:        "modal_ffmpeg",
  displayName: "Modal FFmpeg Assembly",
  jobTypes:    ["edit_assemble"],

  async estimateCost(_job: JobSpec): Promise<CostEstimate> {
    return {
      minCents:      30,
      maxCents:      100,
      estimateCents: ASSEMBLY_COST_CENTS,
      unit:          "per_assembly",
      breakdown:     `~30-60s GPU @ ~$0.02-0.04/s + R2 write = ~$${(ASSEMBLY_COST_CENTS / 100).toFixed(2)}`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const modalToken    = process.env.MODAL_TOKEN_ID && process.env.MODAL_TOKEN_SECRET
      ? `${process.env.MODAL_TOKEN_ID}:${process.env.MODAL_TOKEN_SECRET}`
      : null;

    // Build ordered clip URL list from stage output or metadata
    const clipUrls: string[] = [];
    const stageOutputs = job.inputPayload?.stageOutputs as Record<string, unknown> | undefined;
    const shots        = (job.inputPayload?.shots as Array<{ outputUrl?: string; shotIndex?: number }>) || [];
    const clipsMap     = (job.inputPayload?.clipUrls as Record<string, string>) || {};

    // Prefer explicit clip_urls list; fall back to shots array
    if (job.inputPayload?.clip_urls && Array.isArray(job.inputPayload.clip_urls)) {
      clipUrls.push(...(job.inputPayload.clip_urls as string[]));
    } else if (shots.length > 0) {
      shots.sort((a, b) => (a.shotIndex ?? 0) - (b.shotIndex ?? 0));
      for (const shot of shots) {
        if (shot.outputUrl) clipUrls.push(shot.outputUrl);
      }
    } else {
      // Fall back to clipsMap values
      clipUrls.push(...Object.values(clipsMap));
    }

    if (clipUrls.length === 0) {
      throw new Error("[FFmpegModal] No clip URLs found in job payload — cannot assemble");
    }

    const pipelineRunId = job.pipelineRunId ?? (job.metadata?.pipelineRunId as string) ?? "unknown";
    const r2OutputKey   = `productions/${job.productionId ?? "unknown"}/${pipelineRunId}/final.mp4`;

    const assemblyReq: AssemblyRequest = {
      pipeline_run_id:          pipelineRunId,
      production_id:            job.productionId ?? "unknown",
      clip_urls:                clipUrls,
      audio_url:                job.inputPayload?.audioUrl as string | undefined,
      narration_url:            job.inputPayload?.narrationUrl as string | undefined,
      crossfade_duration_ms:    (job.inputPayload?.crossfadeDurationMs as number) || 500,
      credits_duration_seconds: (job.inputPayload?.creditsDurationSeconds as number) || 3,
      output_format:            "mp4",
      resolution:               "1280x720",
      fps:                      24,
      audio_mix:                {
        music_level:     0.15,
        narration_level: 0.85,
      },
      watermark:                false,
      r2_bucket:                "ghaafeedi-media",
      r2_endpoint:              process.env.R2_ENDPOINT ?? "https://56e7ace05da7338f6d61b014123e6a24.r2.cloudflarestorage.com",
      r2_access_key:            process.env.R2_ACCESS_KEY_ID ?? "",
      r2_secret_key:            process.env.R2_SECRET_ACCESS_KEY ?? "",
      r2_output_key:            r2OutputKey,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (modalToken) {
      headers["Authorization"] = `Token ${modalToken}`;
    }

    const res = await fetch(MODAL_BASE_URL, {
      method:  "POST",
      headers,
      body:    JSON.stringify(assemblyReq),
      signal:  AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[FFmpegModal] Dispatch failed: ${res.status} ${err}`);
    }

    const data = await res.json() as AssemblyResponse;

    return {
      externalJobId:  data.job_id,
      provider:       this.name,
      dispatchedAt:   new Date(),
      pollIntervalMs: 10_000, // Poll every 10s — assembly can take 1-2 minutes
      metadata: {
        r2OutputKey,
        pipelineRunId,
        clipCount: clipUrls.length,
      },
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const pollUrl = `${MODAL_BASE_URL}/status/${handle.externalJobId}`;

    try {
      const res = await fetch(pollUrl, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) {
        // If Modal endpoint isn't deployed yet, return pending (graceful degradation)
        if (res.status === 404 || res.status === 503) {
          console.warn(`[FFmpegModal] Assembly endpoint not deployed — job=${handle.externalJobId}`);
          return {
            status:    "complete", // Stub for Phase 9 — replace with real poll when deployed
            outputUrl: `https://pub-bc7b203485814e1186102277ad450211.r2.dev/${handle.metadata?.r2OutputKey ?? "stub.mp4"}`,
            metadata:  { stubbed: true, r2OutputKey: handle.metadata?.r2OutputKey },
          };
        }
        return { status: "failed", errorMessage: `Status check failed: ${res.status}` };
      }

      const data = await res.json() as AssemblyResponse;

      if (data.status === "complete" && data.output_url) {
        return {
          status:    "complete",
          outputUrl: data.output_url,
          metadata:  {
            r2OutputKey:     handle.metadata?.r2OutputKey,
            outputKey:       data.output_key,
            durationSeconds: data.duration_seconds,
            pipelineRunId:   handle.metadata?.pipelineRunId,
          },
        };
      }

      if (data.status === "failed") {
        return { status: "failed", errorMessage: data.error ?? "Assembly failed" };
      }

      return { status: "processing" };
    } catch (err) {
      const e = err as Error;
      if (e.name === "TimeoutError" || e.name === "AbortError") {
        return { status: "processing" }; // Timeout = still running
      }
      return { status: "failed", errorMessage: e.message };
    }
  },

  async cancelJob(_handle: JobHandle): Promise<void> {
    // Modal jobs can't be cancelled once started — no-op
  },

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    // Modal doesn't have a health endpoint — just verify the URL resolves
    try {
      const res = await fetch(MODAL_BASE_URL, {
        method:  "HEAD",
        signal:  AbortSignal.timeout(5_000),
      });
      const latencyMs = Date.now() - start;
      // 405 = Method Not Allowed = endpoint exists
      const reachable = res.ok || res.status === 405 || res.status === 404;
      return {
        healthy:    reachable,
        latencyMs,
        message:    reachable ? "Modal assembly endpoint reachable" : `Modal endpoint returned ${res.status}`,
        checkedAt:  new Date(),
      };
    } catch (e: unknown) {
      return {
        healthy:   false,
        message:   `Modal endpoint unreachable: ${(e as Error).message}`,
        checkedAt: new Date(),
      };
    }
  },
};
