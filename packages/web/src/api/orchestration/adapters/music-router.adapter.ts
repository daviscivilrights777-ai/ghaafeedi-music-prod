// ============================================================
// Ghaafeedi Music — Music Router Adapter
// Wraps the Python cinematic microservice /api/music/route
// endpoint. Provides intelligent model routing:
//   Suno → standard English
//   ACE-Step → restricted/explicit content
//   MusicGen → non-English (17 languages)
//   Stable Audio → instrumental / ultra-quality
//   YuE → Suno-quality fallback
//
// Toggle: set MUSIC_ROUTER_ENABLED=true in env to activate.
// Default: SunoAdapter remains primary when flag is absent.
// ============================================================
import type {
  ProviderAdapter,
  CostEstimate,
  JobHandle,
  ProviderJobResult,
  ProviderHealth,
} from "./provider-adapter";
import type { JobSpec } from "../job-queue";

// Python cinematic microservice base URL
const CINEMATIC_API = process.env.CINEMATIC_API_URL ?? "http://localhost:8001";

// Feature flag — opt-in only
const ROUTER_ENABLED =
  process.env.MUSIC_ROUTER_ENABLED === "true";

// Cost estimates per model (cents)
const MODEL_COSTS: Record<string, number> = {
  suno:          10,   // Sunor.cc PAYG
  "ace-step":     5,   // GPU compute estimate
  "stable-audio": 4,   // A10G compute
  musicgen:       3,   // A10G compute (medium model)
  yue:            8,   // A100 compute (heavier model)
};

interface MusicRouteResponse {
  success: boolean;
  song_file_url?: string;
  duration_seconds?: number;
  bpm?: number;
  model?: string;
  routing_decision?: {
    primary_model: string;
    fallback_model: string;
    reasoning: string;
  };
  error?: string;
  generation_time_seconds?: number;
}

export const MusicRouterAdapter: ProviderAdapter = {
  name:        "music_router",
  displayName: "Music Router (ACE-Step / Suno / YuE / MusicGen / Stable Audio)",
  jobTypes:    ["song"],

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    // Before routing we don't know which model will be selected,
    // so we return the range across all models
    return {
      minCents:      MODEL_COSTS["stable-audio"]!, // 4¢ cheapest
      maxCents:      MODEL_COSTS["suno"]!,          // 10¢ most expensive
      estimateCents: MODEL_COSTS["ace-step"]!,      // 5¢ typical self-hosted
      unit:          "per_song",
      breakdown:
        "Music Router: 3–10¢ depending on model selected (Suno=10¢, ACE-Step=5¢, MusicGen=3¢)",
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    if (!ROUTER_ENABLED) {
      throw new Error(
        "[MusicRouter] MUSIC_ROUTER_ENABLED is not set. " +
        "Use SunoAdapter for standard routing."
      );
    }

    const payload = job.inputPayload ?? {};

    const requestBody = {
      lyrics:           payload.lyrics     ?? payload.prompt ?? "",
      genre:            payload.genre      ?? "pop",
      emotion:          payload.emotion    ?? "love",
      language:         payload.language   ?? "english",
      content_flags:    payload.content_flags ?? [],
      quality_tier:     payload.quality_tier  ?? "standard",
      needs_vocals:     payload.instrumental  ? false : true,
      duration_seconds: payload.duration_seconds ?? 200,
    };

    // POST to cinematic microservice — synchronous for short songs
    // (Python side handles the generation synchronously and returns result)
    const res = await fetch(`${CINEMATIC_API}/api/music/route`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(requestBody),
      signal:  AbortSignal.timeout(600_000), // 10 min max
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `[MusicRouter] Dispatch failed: ${res.status} ${errText}`
      );
    }

    const data = (await res.json()) as MusicRouteResponse;

    if (!data.success) {
      throw new Error(
        `[MusicRouter] Generation failed: ${data.error ?? "unknown error"}`
      );
    }

    // Return a completed handle — the result is already available
    // We encode the result in externalJobId as JSON for getStatus() to return
    const resultPayload = JSON.stringify({
      completed:    true,
      song_file_url: data.song_file_url,
      duration:     data.duration_seconds,
      bpm:          data.bpm,
      model:        data.model,
      routing:      data.routing_decision,
    });

    return {
      externalJobId:  `mr_${Date.now()}_${encodeURIComponent(resultPayload)}`,
      provider:       this.name,
      dispatchedAt:   new Date(),
      pollIntervalMs: 5_000,
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    // Decode the result embedded in externalJobId
    try {
      const encodedPayload = handle.externalJobId.replace(/^mr_\d+_/, "");
      const data = JSON.parse(decodeURIComponent(encodedPayload)) as {
        completed:    boolean;
        song_file_url?: string;
        duration?:    number;
        bpm?:         number;
        model?:       string;
        routing?:     { primary_model: string; fallback_model: string; reasoning: string };
      };

      if (data.completed) {
        const modelCost =
          MODEL_COSTS[data.model ?? "ace-step"] ?? MODEL_COSTS["ace-step"]!;

        return {
          status:    "complete",
          outputUrl: data.song_file_url,
          outputUrls: data.song_file_url ? [data.song_file_url] : [],
          metadata: {
            duration_seconds: data.duration,
            bpm:              data.bpm,
            model:            data.model,
            routing_decision: data.routing,
          },
          costCents: modelCost,
        };
      }

      return { status: "processing" };
    } catch {
      return {
        status:       "failed",
        errorMessage: "Failed to decode music router result",
      };
    }
  },

  async cancelJob(_handle: JobHandle): Promise<void> {
    // Synchronous dispatch — nothing to cancel
  },

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const res = await fetch(`${CINEMATIC_API}/api/music/models`, {
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) {
        return {
          healthy:   false,
          latencyMs: Date.now() - start,
          message:   `HTTP ${res.status}`,
          checkedAt: new Date(),
        };
      }

      const data = await res.json() as {
        models: Array<{ id: string; available: boolean }>;
      };

      const availableModels = data.models
        .filter((m) => m.available)
        .map((m) => m.id);

      const healthy = availableModels.length > 0;

      return {
        healthy,
        latencyMs: Date.now() - start,
        message: healthy
          ? `Music Router live — available: ${availableModels.join(", ")}`
          : "Music Router: no models available (self-hosted models not loaded)",
        checkedAt: new Date(),
      };
    } catch (e: unknown) {
      return {
        healthy:   false,
        latencyMs: Date.now() - start,
        message:   (e as Error).message,
        checkedAt: new Date(),
      };
    }
  },
};
