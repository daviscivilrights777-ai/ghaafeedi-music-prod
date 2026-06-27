// ============================================================
// Ghaafeedi Music — Poyo.ai Music Adapter
// PRIMARY music infrastructure provider. Replaces Sunor.cc.
//
// Poyo.ai covers the FULL music production stack:
//   - Song generation (Suno V4/V4.5/V5/V5.5)
//   - Song extend (>8 min long-form)
//   - Music Video (AI MV at $0.02/video — killer feature)
//   - Vocal remover / stem separation
//   - Cover / style transfer
//   - Add vocals / add instrumental
//   - Boost music style
//   - Replace section (surgical inpainting)
//   - Timestamped lyrics
//   - WAV export (lossless)
//   - Album art generation
//   - Lyrics generation (free)
//
// API Pattern: Async task_id + polling (same as Sunor.cc — seamless swap)
// Auth: x-api-key header
// Base: https://poyo.ai/api/v1
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
import { getRedis } from "../redis-client";

// ─── Constants ───────────────────────────────────────────────────────────────

const POYO_API = "https://poyo.ai/api/v1";

/** Default Suno model version for Ghaafeedi productions */
const DEFAULT_MODEL = "V5";

/** Cost in cents per operation type */
const OPERATION_COSTS: Record<string, number> = {
  generate:          10,  // $0.10 — song gen
  extend:            10,  // $0.10 — extend beyond 8 min
  cover_audio:       10,  // $0.10 — style transfer (your audio → new cover)
  extend_audio:      10,  // $0.10 — extend an uploaded track
  add_instrumental:  10,  // $0.10 — vocal track → full instrumental
  add_vocals:        10,  // $0.10 — instrumental → add vocal layer
  boost:             10,  // $0.10 — style reinforcement pass
  album_art:         10,  // $0.10 — AI-generated album artwork
  replace_section:   10,  // $0.10 — surgical inpainting for specific segment
  vocal_remover:     10,  // $0.10 — stem separation / instrumental output
  music_video:        2,  // $0.02 — audio → cinematic MV (Seedance 2 Mini)
  lyrics:             0,  // Free  — Suno lyrics engine
  timestamped_lyrics: 0,  // Free  — sync-ready lyric data
  wav_convert:        0,  // Free  — MP3 → WAV lossless export
  persona:           10,  // TBD   — artist voice/style persona (estimate)
};

const MONTHLY_COUNTER_KEY = (ym: string) => `poyo:monthly:${ym}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getMonthlyCount(): Promise<number> {
  const redis = getRedis();
  const ym = new Date().toISOString().slice(0, 7);
  return Number(await redis.get(MONTHLY_COUNTER_KEY(ym))) || 0;
}

async function incrementMonthlyCounter(): Promise<void> {
  const redis = getRedis();
  const ym = new Date().toISOString().slice(0, 7);
  await redis.incr(MONTHLY_COUNTER_KEY(ym));
  await redis.expire(MONTHLY_COUNTER_KEY(ym), 32 * 24 * 60 * 60); // 32 days safe
}

async function poyoHeaders(): Promise<Record<string, string>> {
  const apiKey = await getSecret(SECRET_KEYS.POYO_API_KEY);
  return {
    "Content-Type": "application/json",
    "x-api-key":    apiKey,
  };
}

/** Maps jobType → Poyo.ai operation + endpoint */
function resolveOperation(job: JobSpec): {
  operation: string;
  endpoint: string;
  payload: Record<string, unknown>;
} {
  const p = job.inputPayload ?? {};

  switch (job.jobType) {
    // ── Song generation ──────────────────────────────────────────────────────
    case "song": {
      return {
        operation: "generate",
        endpoint:  `${POYO_API}/music/generate`,
        payload: {
          model:              p.model        ?? DEFAULT_MODEL,
          title:              p.title        ?? undefined,
          prompt:             p.prompt       ?? p.description ?? "",
          // Custom mode fields
          style:              p.genre        ?? p.style ?? "cinematic emotional",
          negative_tags:      p.negative_tags ?? undefined,
          style_weight:       p.style_weight  ?? undefined,
          weirdness_constraint: p.weirdness_constraint ?? undefined,
          vocal_gender:       p.vocal_gender  ?? undefined,
          make_instrumental:  p.instrumental  ?? false,
          // Lyric mode
          lyrics:             p.lyrics        ?? undefined,
          gpt_description_prompt: p.gpt_description_prompt ?? p.lyrics ?? p.prompt ?? undefined,
        },
      };
    }

    // ── Lyrics generation ────────────────────────────────────────────────────
    case "lyrics": {
      return {
        operation: "lyrics",
        endpoint:  `${POYO_API}/music/lyrics`,
        payload: {
          prompt: p.prompt ?? p.story ?? p.description ?? "",
          model:  p.model ?? DEFAULT_MODEL,
        },
      };
    }

    // ── Music Video generation ───────────────────────────────────────────────
    case "music_video": {
      return {
        operation: "music_video",
        endpoint:  `${POYO_API}/music/video`,
        payload: {
          song_id:   p.song_id ?? undefined,
          audio_url: p.audio_url ?? undefined,
          model:     p.mv_model ?? "Seedance_mini", // Seedance 2 Mini — $0.02
          title:     p.title ?? undefined,
        },
      };
    }

    // ── Song extension ───────────────────────────────────────────────────────
    case "song_extension": {
      return {
        operation: "extend",
        endpoint:  `${POYO_API}/music/extend`,
        payload: {
          song_id:  p.song_id,
          model:    p.model ?? DEFAULT_MODEL,
          prompt:   p.continuation_prompt ?? undefined,
          duration: p.extend_seconds ?? 120,
        },
      };
    }

    // ── Vocal removal / stems ────────────────────────────────────────────────
    case "vocal_removal":
    case "stem_separation": {
      return {
        operation: "vocal_remover",
        endpoint:  `${POYO_API}/music/vocal-remover`,
        payload: {
          song_id:   p.song_id   ?? undefined,
          audio_url: p.audio_url ?? undefined,
        },
      };
    }

    // ── Cover / style transfer ───────────────────────────────────────────────
    case "cover_generation": {
      return {
        operation: "cover_audio",
        endpoint:  `${POYO_API}/music/cover-audio`,
        payload: {
          audio_url: p.audio_url,
          style:     p.genre ?? p.style ?? "cinematic emotional",
          model:     p.model ?? DEFAULT_MODEL,
          style_weight: p.style_weight ?? 0.7,
        },
      };
    }

    // ── Add vocals to instrumental ───────────────────────────────────────────
    case "vocal_add": {
      return {
        operation: "add_vocals",
        endpoint:  `${POYO_API}/music/add-vocals`,
        payload: {
          audio_url:    p.audio_url,
          vocal_gender: p.vocal_gender ?? "female",
          model:        p.model ?? DEFAULT_MODEL,
          style:        p.genre ?? p.style ?? undefined,
        },
      };
    }

    // ── Style boost ──────────────────────────────────────────────────────────
    case "style_boost": {
      return {
        operation: "boost",
        endpoint:  `${POYO_API}/music/boost`,
        payload: {
          song_id: p.song_id,
          model:   p.model ?? DEFAULT_MODEL,
        },
      };
    }

    // ── Section replacement ──────────────────────────────────────────────────
    case "section_replace": {
      return {
        operation: "replace_section",
        endpoint:  `${POYO_API}/music/replace-section`,
        payload: {
          song_id:       p.song_id,
          start_seconds: p.start_seconds,
          end_seconds:   p.end_seconds,
          prompt:        p.replacement_prompt ?? "",
          model:         p.model ?? DEFAULT_MODEL,
        },
      };
    }

    // ── Album art ────────────────────────────────────────────────────────────
    case "album_art": {
      return {
        operation: "album_art",
        endpoint:  `${POYO_API}/music/album-art`,
        payload: {
          song_id: p.song_id,
          prompt:  p.prompt ?? p.description ?? "",
        },
      };
    }

    // ── Timestamped lyrics ───────────────────────────────────────────────────
    case "timestamped_lyrics": {
      return {
        operation: "timestamped_lyrics",
        endpoint:  `${POYO_API}/music/timestamped-lyrics`,
        payload: {
          song_id: p.song_id,
        },
      };
    }

    // ── WAV export ───────────────────────────────────────────────────────────
    case "wav_export": {
      return {
        operation: "wav_convert",
        endpoint:  `${POYO_API}/music/wav`,
        payload: {
          song_id:   p.song_id   ?? undefined,
          audio_url: p.audio_url ?? undefined,
        },
      };
    }

    // ── Fallback ─────────────────────────────────────────────────────────────
    default: {
      // Treat any unknown type as song gen with whatever payload was passed
      return {
        operation: "generate",
        endpoint:  `${POYO_API}/music/generate`,
        payload: {
          model:   p.model ?? DEFAULT_MODEL,
          prompt:  p.prompt ?? p.description ?? p.lyrics ?? "",
          style:   p.genre ?? p.style ?? "cinematic emotional",
          lyrics:  p.lyrics ?? undefined,
          make_instrumental: p.instrumental ?? false,
        },
      };
    }
  }
}

// ─── Response Shapes ─────────────────────────────────────────────────────────

interface PoyoTaskResponse {
  task_id?:  string;
  id?:       string;
  taskId?:   string;
  status?:   string;
  error?:    string;
}

interface PoyoStatusResponse {
  status:         string;             // "pending" | "processing" | "complete" | "error" | "failed"
  audio_url?:     string;
  video_url?:     string;
  cover_url?:     string;             // album art or cover generation
  instrumental_url?: string;          // vocal removal result
  vocals_url?:    string;             // vocals-only track (stems)
  wav_url?:       string;             // WAV export
  lyrics?:        string;             // lyrics text result
  timestamped_lyrics?: Array<{
    text:  string;
    start: number;
    end:   number;
  }>;
  metadata?: {
    duration_seconds?: number;
    bpm?:              number;
    model?:            string;
    title?:            string;
    tags?:             string[];
    credits_used?:     number;
  };
  error_message?: string;
  error?:         string;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export const PoyoAdapter: ProviderAdapter = {
  name:        "poyo",
  displayName: "Poyo.ai",

  // All job types this adapter handles
  jobTypes: [
    "song",
    "lyrics",
    "music_video",
    "song_extension",
    "vocal_removal",
    "stem_separation",
    "cover_generation",
    "vocal_add",
    "style_boost",
    "section_replace",
    "album_art",
    "timestamped_lyrics",
    "wav_export",
  ] as any[],

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const { operation } = resolveOperation(job);
    const cpc = OPERATION_COSTS[operation] ?? 10;

    return {
      minCents:      cpc,
      maxCents:      cpc,
      estimateCents: cpc,
      unit:          `per_${operation}`,
      breakdown:     `1 ${operation} × $${(cpc / 100).toFixed(2)} (Poyo.ai)`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const headers = await poyoHeaders();
    const { operation, endpoint, payload } = resolveOperation(job);

    // Strip undefined values before sending
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined && v !== null)
    );

    const res = await fetch(endpoint, {
      method:  "POST",
      headers,
      body:    JSON.stringify(cleanPayload),
      signal:  AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[Poyo] Dispatch failed (${operation}): ${res.status} ${errText}`);
    }

    const data = await res.json() as PoyoTaskResponse;

    if (data.error) {
      throw new Error(`[Poyo] API error (${operation}): ${data.error}`);
    }

    const taskId = data.task_id ?? data.taskId ?? data.id;

    if (!taskId) {
      throw new Error(`[Poyo] No task_id returned for ${operation}`);
    }

    // Increment monthly song counter for analytics
    if (operation === "generate") {
      await incrementMonthlyCounter();
    }

    return {
      externalJobId:  taskId,
      provider:       this.name,
      dispatchedAt:   new Date(),
      pollIntervalMs: 8_000,
      metadata: { operation, endpoint },
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const apiKey = await getSecret(SECRET_KEYS.POYO_API_KEY);
    const operation = (handle.metadata as any)?.operation ?? "generate";

    const res = await fetch(`${POYO_API}/music/task/${handle.externalJobId}`, {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return {
        status:       "failed",
        errorMessage: `[Poyo] Status check failed: ${res.status}`,
      };
    }

    const data = await res.json() as PoyoStatusResponse;

    // Normalize status
    const status = data.status?.toLowerCase();

    if (status === "complete" || status === "completed" || status === "success" || status === "done") {
      // Build output URLs — collect all result URLs for this operation
      const outputUrls: string[] = [];
      if (data.audio_url)          outputUrls.push(data.audio_url);
      if (data.video_url)          outputUrls.push(data.video_url);
      if (data.cover_url)          outputUrls.push(data.cover_url);
      if (data.instrumental_url)   outputUrls.push(data.instrumental_url);
      if (data.vocals_url)         outputUrls.push(data.vocals_url);
      if (data.wav_url)            outputUrls.push(data.wav_url);

      const primaryUrl =
        data.audio_url ??
        data.video_url ??
        data.cover_url ??
        data.instrumental_url ??
        data.wav_url ??
        outputUrls[0];

      const costCents = OPERATION_COSTS[operation] ?? 10;

      return {
        status:     "complete",
        outputUrl:  primaryUrl,
        outputUrls: outputUrls.length > 0 ? outputUrls : undefined,
        metadata: {
          operation,
          lyrics:              data.lyrics,
          timestamped_lyrics:  data.timestamped_lyrics,
          audio_url:           data.audio_url,
          video_url:           data.video_url,
          cover_url:           data.cover_url,
          instrumental_url:    data.instrumental_url,
          vocals_url:          data.vocals_url,
          wav_url:             data.wav_url,
          duration_seconds:    data.metadata?.duration_seconds,
          bpm:                 data.metadata?.bpm,
          model:               data.metadata?.model,
          title:               data.metadata?.title,
          tags:                data.metadata?.tags,
          credits_used:        data.metadata?.credits_used,
        },
        costCents,
      };
    }

    if (
      status === "error" ||
      status === "failed" ||
      status === "failure"
    ) {
      return {
        status:       "failed",
        errorMessage: data.error_message ?? data.error ?? "Poyo.ai generation failed",
      };
    }

    // Still processing (pending / processing / queued)
    return { status: "processing" };
  },

  async cancelJob(_handle: JobHandle): Promise<void> {
    // Poyo.ai does not expose a cancel endpoint — no-op (same as Sunor.cc)
  },

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const apiKey = await getSecret(SECRET_KEYS.POYO_API_KEY);

      // GET /api/v1/music/generate — expect 405 (wrong method) or 200, 401 (bad key)
      // Any response means server is up and reachable
      const res = await fetch(`${POYO_API}/music/generate`, {
        method:  "GET",
        headers: { "x-api-key": apiKey },
        signal:  AbortSignal.timeout(8_000),
      });

      const alive =
        res.ok ||
        res.status === 401 ||
        res.status === 405 ||
        res.status === 403 ||
        res.status === 422 ||
        res.status === 400;

      return {
        healthy:   alive,
        latencyMs: Date.now() - start,
        message:   alive
          ? `HTTP ${res.status} — Poyo.ai reachable`
          : `HTTP ${res.status} — unexpected status`,
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
