// ============================================================
// Ghaafeedi Music — Poyo.ai Adapter
// PRIMARY provider for BOTH music and cinematic video generation.
//
// Poyo.ai is an AI gateway that proxies Suno V4/V5/V5.5 (music),
// Seedance 2 / Seedance 2 Mini (video), and more.
//
// API:
//   Base:   https://api.poyo.ai
//   Auth:   Authorization: Bearer <key>
//   Submit: POST /api/generate/submit  { model, input, callback_url? }
//   Poll:   GET  /api/generate/detail/music?task_id=<id>   ← UNIVERSAL endpoint
//           (works for ALL task types including video — /detail/video returns 404)
//
// ── MUSIC model strings ─────────────────────────────────────
//   generate-music          — Suno song generation
//   generate-lyrics         — Suno lyrics engine (free)
//   create-music-video      — Visualised MP4 from audio_id (Seedance 2 Mini)
//   extend-music            — Suno continuation / long-form
//   separate-vocals         — 2-stem split (Suno-based, no upload)
//   upload-and-cover-audio  — Style transfer with uploaded audio
//   add-vocals              — Instrumental → full song with AI vocals
//   add-instrumental        — Vocals → full song with AI backing
//   boost-music-style       — AI style description enhancer
//   replace-section         — Surgical inpainting of a time range
//   generate-music-cover    — AI album art from song_id
//   get-timestamped-lyrics  — Sync-ready lyric timestamps
//   convert-to-wav          — MP3 → WAV lossless export
//
// ── VIDEO model strings ─────────────────────────────────────
//   seedance-2              — Cinematic video gen (primary: clip_batch/video/visualization)
//                             4K/1080p ONLY, 4-15s. Use image_urls:[first, last] for frame ctrl
//   seedance-2-fast         — Draft/preview tier, cheaper, 480p/720p only
//   seedance-2-mini         — Music video gen (music_video jobType), 480p/720p, fast
//
// ── LLM routing ─────────────────────────────────────────────
//   Sophia chat   → claude-opus-4-8 (POST /v1/chat/completions, OpenAI-compat format)
//   Pipeline orch → deepseek-v3-0324 (emotion analysis, lyrics, storyboards, scripts)
//   Background    → deepseek-v3-0324 (fallback/cheap tasks — flash not yet confirmed)
//   GPT-4o stays as fallback via openai.adapter.ts only
//
// Poll endpoint (ALL task types — music + video):
//   GET https://api.poyo.ai/api/generate/status/{task_id}  (path param, NOT query)
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

const POYO_BASE = "https://api.poyo.ai";
const POYO_SUBMIT = `${POYO_BASE}/api/generate/submit`;
const POYO_STATUS  = `${POYO_BASE}/api/generate/status`;   // GET /<task_id>  (path param)
const POYO_CHAT    = `${POYO_BASE}/v1/chat/completions`;    // OpenAI-compat LLM endpoint

// ── LLM Model Strings (via Poyo.ai Chat Completions) ────────────────────────
// Sophia chat: Claude Opus 4.8 — warm, emotional, luxury concierge
// Pipeline:    DeepSeek V3 Pro — cheap+smart for story/lyrics/scripts/shot lists
// Background:  DeepSeek V3 Pro — cheapest capable model
export const POYO_LLM = {
  sophia:     "claude-opus-4-8",          // Sophia AI chat — Claude Opus 4.8
  pipeline:   "deepseek-v3-0324",         // Orchestration pipeline — DeepSeek V3 Pro
  background: "deepseek-v3-0324",         // Background tasks — DeepSeek V3 Pro
} as const;

/** Default Suno model version for Ghaafeedi productions */
const DEFAULT_MV = "V5";

/** Cost in credits (cents equivalent) per operation */
const OPERATION_COSTS: Record<string, number> = {
  // ── Music ──────────────────────────────────────────────────────────────────
  "generate-music":         10,  // $0.10 — song gen
  "generate-lyrics":         0,  // Free  — Suno lyrics engine
  "create-music-video":      2,  // $0.02 — audio → MP4 (Seedance 2 Mini)
  "extend-music":           10,  // $0.10 — extend beyond 8 min
  "separate-vocals":         2,  // $0.02 — 2-stem split
  "upload-and-cover-audio": 10,  // $0.10 — style transfer
  "add-vocals":             10,  // $0.10 — instrumental → full song
  "add-instrumental":       10,  // $0.10 — vocals → full song
  "boost-music-style":       0,  // Free  — style description enhancer
  "replace-section":        10,  // $0.10 — surgical inpainting
  "generate-music-cover":    2,  // $0.02 — album art
  "get-timestamped-lyrics":  1,  // $0.01 — sync lyrics
  "convert-to-wav":          0,  // Free  — lossless export
  // ── Video (Seedance 2) ─────────────────────────────────────────────────────
  "seedance-2":             40,  // ~$0.40 — cinematic 1080p 5s clip
  "seedance-2-fast":        20,  // ~$0.20 — draft 720p 5s clip
  "seedance-2-mini":         2,  // $0.02  — MV 480p/720p (same as create-music-video)
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
  await redis.expire(MONTHLY_COUNTER_KEY(ym), 32 * 24 * 60 * 60);
}

async function bearerHeaders(): Promise<Record<string, string>> {
  const apiKey = await getSecret(SECRET_KEYS.POYO_API_KEY);
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
}

/** Maps jobType → Poyo model string + input payload */
function resolveOperation(job: JobSpec): {
  model:   string;
  input:   Record<string, unknown>;
} {
  const p = job.inputPayload ?? {};

  switch (job.jobType) {

    // ── Song generation ──────────────────────────────────────────────────────
    case "song": {
      const customMode = !!(p.style || p.title || p.lyrics);
      return {
        model: "generate-music",
        input: {
          prompt:       p.prompt ?? p.lyrics ?? p.description ?? "",
          custom_mode:  customMode,
          instrumental: p.instrumental ?? false,
          mv:           p.model ?? DEFAULT_MV,
          ...(customMode ? {
            style:  p.genre ?? p.style ?? "cinematic emotional",
            title:  p.title ?? "Ghaafeedi Original",
          } : {}),
          ...(p.negative_tags  ? { negative_tags:         p.negative_tags }  : {}),
          ...(p.vocal_gender   ? { vocal_gender:          p.vocal_gender }   : {}),
          ...(p.style_weight   ? { style_weight:          p.style_weight }   : {}),
          ...(p.weirdness_constraint ? { weirdness_constraint: p.weirdness_constraint } : {}),
          ...(p.audio_weight   ? { audio_weight:          p.audio_weight }   : {}),
          ...(p.persona_id     ? { persona_id:            p.persona_id }     : {}),
        },
      };
    }

    // ── Lyrics generation ────────────────────────────────────────────────────
    case "lyrics": {
      return {
        model: "generate-lyrics",
        input: {
          prompt: p.prompt ?? p.story ?? p.description ?? "",
        },
      };
    }

    // ── Music Video ──────────────────────────────────────────────────────────
    // Two paths:
    //   • With audio_id (Suno song) → create-music-video (Seedance 2 Mini via Suno)
    //   • Without audio_id (standalone visual MV) → seedance-2-mini direct
    case "music_video": {
      if (p.audio_id || p.task_id) {
        return {
          model: "create-music-video",
          input: {
            task_id:  p.task_id,
            audio_id: p.audio_id,
            ...(p.author      ? { author:      p.author }      : {}),
            ...(p.domain_name ? { domain_name: p.domain_name } : {}),
          },
        };
      }
      // Standalone Seedance 2 Mini — text/image → short music video
      return {
        model: "seedance-2-mini",
        input: {
          prompt:         p.prompt ?? p.description ?? "",
          duration:       Math.min(Math.max(Math.round((p.durationSeconds as number) ?? 5), 4), 15),
          aspect_ratio:   (p.aspectRatio as string) ?? "16:9",
          resolution:     (p.resolution as string)  ?? "720p",
          generate_audio: p.generateAudio ?? true,  // MV: audio ON by default
          ...(p.imageUrl  ? { image_url: p.imageUrl }  : {}),
          ...(p.negativePrompt ? { negative_prompt: p.negativePrompt } : {}),
        },
      };
    }

    // ── Song extension ───────────────────────────────────────────────────────
    case "song_extension": {
      const customMode = !!(p.continuation_prompt || p.style || p.title);
      return {
        model: "extend-music",
        input: {
          default_param_flag: customMode,
          audio_id:           p.audio_id ?? p.song_id,
          mv:                 p.model ?? DEFAULT_MV,
          ...(customMode ? {
            prompt:      p.continuation_prompt ?? p.prompt ?? "",
            style:       p.genre ?? p.style ?? "cinematic emotional",
            title:       p.title ?? "Extended",
            continue_at: p.continue_at ?? p.extend_at_seconds ?? 120,
          } : {}),
          ...(p.negative_tags  ? { negative_tags:         p.negative_tags }  : {}),
          ...(p.vocal_gender   ? { vocal_gender:          p.vocal_gender }   : {}),
          ...(p.style_weight   ? { style_weight:          p.style_weight }   : {}),
          ...(p.weirdness_constraint ? { weirdness_constraint: p.weirdness_constraint } : {}),
          ...(p.audio_weight   ? { audio_weight:          p.audio_weight }   : {}),
          ...(p.persona_id     ? { persona_id:            p.persona_id }     : {}),
        },
      };
    }

    // ── Vocal removal / stems (Suno-based, no upload) ────────────────────────
    case "vocal_removal":
    case "stem_separation": {
      return {
        model: "separate-vocals",
        input: {
          task_id:  p.task_id,
          audio_id: p.audio_id ?? p.song_id,
        },
      };
    }

    // ── Cover / style transfer (uploaded audio → new style) ──────────────────
    case "cover_generation": {
      const customMode = !!(p.style || p.title);
      return {
        model: "upload-and-cover-audio",
        input: {
          upload_url:   p.audio_url ?? p.upload_url,
          prompt:       p.prompt ?? p.description ?? "",
          custom_mode:  customMode,
          instrumental: p.instrumental ?? false,
          mv:           p.model ?? DEFAULT_MV,
          ...(customMode ? {
            style: p.genre ?? p.style ?? "cinematic emotional",
            title: p.title ?? "Cover",
          } : {}),
          ...(p.negative_tags  ? { negative_tags:         p.negative_tags }  : {}),
          ...(p.vocal_gender   ? { vocal_gender:          p.vocal_gender }   : {}),
          ...(p.style_weight   ? { style_weight:          p.style_weight }   : {}),
          ...(p.weirdness_constraint ? { weirdness_constraint: p.weirdness_constraint } : {}),
          ...(p.audio_weight   ? { audio_weight:          p.audio_weight }   : {}),
          ...(p.persona_id     ? { persona_id:            p.persona_id }     : {}),
        },
      };
    }

    // ── Add vocals to instrumental ───────────────────────────────────────────
    case "vocal_add": {
      return {
        model: "add-vocals",
        input: {
          upload_url:    p.audio_url ?? p.upload_url,
          prompt:        p.lyrics ?? p.prompt ?? "",
          title:         p.title ?? "Ghaafeedi Original",
          style:         p.genre ?? p.style ?? "cinematic emotional",
          negative_tags: p.negative_tags ?? "",
          mv:            p.model ?? "V4_5PLUS",
          ...(p.vocal_gender ? { vocal_gender: p.vocal_gender } : {}),
          ...(p.style_weight ? { style_weight: p.style_weight } : {}),
          ...(p.weirdness_constraint ? { weirdness_constraint: p.weirdness_constraint } : {}),
          ...(p.audio_weight ? { audio_weight: p.audio_weight } : {}),
        },
      };
    }

    // ── Add instrumental backing to vocals ───────────────────────────────────
    case "add_instrumental": {
      return {
        model: "add-instrumental",
        input: {
          upload_url:    p.audio_url ?? p.upload_url,
          title:         p.title ?? "Ghaafeedi Original",
          tags:          p.genre ?? p.style ?? "cinematic, emotional",
          negative_tags: p.negative_tags ?? "",
          mv:            p.model ?? "V4_5PLUS",
          ...(p.vocal_gender ? { vocal_gender: p.vocal_gender } : {}),
          ...(p.style_weight ? { style_weight: p.style_weight } : {}),
          ...(p.weirdness_constraint ? { weirdness_constraint: p.weirdness_constraint } : {}),
          ...(p.audio_weight ? { audio_weight: p.audio_weight } : {}),
        },
      };
    }

    // ── Style boost (AI description enhancer) ────────────────────────────────
    case "style_boost": {
      return {
        model: "boost-music-style",
        input: {
          task_id:  p.task_id,
          audio_id: p.audio_id ?? p.song_id,
        },
      };
    }

    // ── Section replacement (surgical inpainting) ────────────────────────────
    case "section_replace": {
      return {
        model: "replace-section",
        input: {
          task_id:       p.task_id,
          audio_id:      p.audio_id ?? p.song_id,
          prompt:        p.replacement_prompt ?? p.prompt ?? "",
          tags:          p.genre ?? p.style ?? "cinematic emotional",
          title:         p.title ?? "Ghaafeedi Edit",
          infill_start_s: p.start_seconds ?? p.infill_start_s ?? 0,
          infill_end_s:   p.end_seconds   ?? p.infill_end_s   ?? 30,
          ...(p.negative_tags ? { negative_tags: p.negative_tags } : {}),
          ...(p.full_lyrics   ? { full_lyrics:   p.full_lyrics }   : {}),
        },
      };
    }

    // ── Album art generation ─────────────────────────────────────────────────
    case "album_art": {
      return {
        model: "generate-music-cover",
        input: {
          task_id:  p.task_id,
          audio_id: p.audio_id ?? p.song_id,
        },
      };
    }

    // ── Timestamped lyrics ───────────────────────────────────────────────────
    case "timestamped_lyrics": {
      return {
        model: "get-timestamped-lyrics",
        input: {
          task_id:  p.task_id,
          audio_id: p.audio_id ?? p.song_id,
        },
      };
    }

    // ── WAV export ───────────────────────────────────────────────────────────
    case "wav_export": {
      return {
        model: "convert-to-wav",
        input: {
          task_id:  p.task_id,
          audio_id: p.audio_id ?? p.song_id,
        },
      };
    }

    // ── Cinematic video / clip_batch / visualization (Seedance 2) ────────────
    // Seedance 2 API notes:
    //   - image_urls: array[0]=first_frame, array[1]=end_frame (up to 2 images)
    //   - seedance-2: resolution = "1080p" | "4k" ONLY
    //   - seedance-2-fast: resolution = "480p" | "720p" ONLY
    //   - aspect_ratio: "auto" | "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16"
    case "video":
    case "clip_batch":
    case "visualization": {
      const isDraft = p.draft === true;
      const model   = isDraft ? "seedance-2-fast" : "seedance-2";

      // Resolution: seedance-2 only supports 1080p/4k; fast only 480p/720p
      const reqRes  = (p.resolution as string) ?? "";
      let res: string;
      if (isDraft) {
        res = (reqRes === "480p" || reqRes === "720p") ? reqRes : "720p";
      } else {
        res = (reqRes === "4k" || reqRes === "4K") ? "4k" : "1080p";
      }

      const dur    = (p.durationSeconds as number) ?? (p.duration as number) ?? 5;
      const aspect = (p.aspectRatio as string) ?? "16:9";

      // Build image_urls array for first/last frame control
      const imageUrls: string[] = [];
      const startImg = (p.startImageUrl ?? p.imageUrl) as string | undefined;
      const endImg   = p.endImageUrl as string | undefined;
      if (startImg) imageUrls.push(startImg);
      if (endImg)   imageUrls.push(endImg);

      // Shot-specific overrides from pipeline (clip_batch carries a shot object)
      const shot         = p.shot as Record<string, unknown> | undefined;
      const shotPrompt   = shot ? ((shot.falPrompt as string) || (p.prompt as string) || "") : undefined;
      const shotNegative = shot ? ((shot.negativePrompt as string) || "blurry, low quality, amateur, watermark") : undefined;
      const shotDur      = shot ? Math.min(Math.max(Math.round((shot.durationSeconds as number) ?? 5), 4), 15) : undefined;

      return {
        model,
        input: {
          prompt:         shotPrompt ?? p.prompt ?? p.description ?? "",
          duration:       shotDur ?? Math.min(Math.max(Math.round(dur), 4), 15),
          aspect_ratio:   aspect,
          resolution:     res,
          generate_audio: p.generateAudio ?? false,  // audio added at edit_assemble stage
          ...(imageUrls.length > 0  ? { image_urls: imageUrls }                                               : {}),
          ...(shotNegative          ? { negative_prompt: shotNegative }                                       : {}),
          ...(!shot && p.negativePrompt ? { negative_prompt: p.negativePrompt }                               : {}),
        },
      };
    }

    // ── Music Video (Seedance 2 Mini) ─────────────────────────────────────────
    // create-music-video already handled above (takes audio_id → MP4 via Suno).
    // music_video jobType here is for the Seedance-2-mini visual generation path
    // when generating a standalone music video without a Suno audio_id.
    // If audio_id is present → delegate to create-music-video model instead.

    // ── Fallback → song gen ──────────────────────────────────────────────────
    default: {
      return {
        model: "generate-music",
        input: {
          prompt:       p.prompt ?? p.description ?? p.lyrics ?? "",
          custom_mode:  false,
          instrumental: p.instrumental ?? false,
          mv:           p.model ?? DEFAULT_MV,
        },
      };
    }
  }
}

// ─── Response Shapes ─────────────────────────────────────────────────────────

interface PoyoSubmitResponse {
  code: number;
  data?: {
    task_id:      string;
    status:       string;
    created_time: string;
  };
  error?: {
    message: string;
    type:    string;
  };
}

interface PoyoFile {
  // Music generation outputs
  audio_id?:   string;
  audio_url?:  string;
  image_url?:  string;
  title?:      string;
  tags?:        string;
  duration?:   number;
  prompt?:     string;
  // Lyrics
  text?:                string;
  timestampe_lyrics?:   string;   // note: Poyo typos "timestamp"
  // Boost
  style?: string;
  // WAV
  wav_url?: string;
  // Vocal separation
  separate_vocals?: string;    // JSON: { vocal_url, instrumental_url }
  vocal_removal?:  string;    // JSON: { bass, drums, piano, guitar, vocals, other }
  stem_split?:     string;    // JSON: full 12-stem map
  // Album art
  generate_cover?: string;    // JSON array: [{ file_url, file_type }]
  // Music video
  video_url?: string;
  // Persona
  persona_id?: string;
}

interface PoyoDetailResponse {
  code: number;
  data?: {
    task_id:        string;
    status:         string;    // not_started | running | finished | failed
    credits_amount: number;
    files:          PoyoFile[];
    created_time:   string;
    error_message:  string | null;
  };
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export const PoyoAdapter: ProviderAdapter = {
  name:        "poyo",
  displayName: "Poyo.ai",

  jobTypes: [
    // ── Video (Seedance 2 / Mini) — PRIMARY for all cinematic video ───────
    "video",
    "clip_batch",
    "visualization",
    "music_video",
    // ── Music (Suno V4/V5/V5.5) ──────────────────────────────────────────
    "song",
    "lyrics",
    "song_extension",
    "vocal_removal",
    "stem_separation",
    "cover_generation",
    "vocal_add",
    "add_instrumental",
    "style_boost",
    "section_replace",
    "album_art",
    "timestamped_lyrics",
    "wav_export",
  ] as any[],

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const { model } = resolveOperation(job);
    const baseCpc = OPERATION_COSTS[model] ?? 10;

    // For video models, scale by requested duration
    if (model === "seedance-2" || model === "seedance-2-fast" || model === "seedance-2-mini") {
      const dur       = (job.inputPayload?.durationSeconds as number) ?? 5;
      const perSec    = baseCpc / 5; // base cost assumes 5s; scale linearly
      const cpc       = Math.round(perSec * dur);
      return {
        minCents:      Math.round(cpc * 0.8),
        maxCents:      Math.round(cpc * 1.3),
        estimateCents: cpc,
        unit:          "per_clip",
        breakdown:     `${dur}s ${model} ≈ ${(cpc / 100).toFixed(2)} (Poyo.ai Seedance 2)`,
      };
    }

    return {
      minCents:      baseCpc,
      maxCents:      baseCpc,
      estimateCents: baseCpc,
      unit:          `per_${model}`,
      breakdown:     `1 ${model} × ${(baseCpc / 100).toFixed(2)} (Poyo.ai)`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const headers = await bearerHeaders();
    const { model, input } = resolveOperation(job);

    // Strip undefined/null before sending
    const cleanInput = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined && v !== null)
    );

    const body: Record<string, unknown> = { model, input: cleanInput };

    const res = await fetch(POYO_SUBMIT, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[Poyo] Dispatch failed (${model}): HTTP ${res.status} — ${errText}`);
    }

    const data = await res.json() as PoyoSubmitResponse;

    if (data.error) {
      throw new Error(`[Poyo] API error (${model}): ${data.error.message}`);
    }

    if (!data.data?.task_id) {
      throw new Error(`[Poyo] No task_id returned for ${model}: ${JSON.stringify(data)}`);
    }

    if (model === "generate-music") {
      await incrementMonthlyCounter();
    }

    return {
      externalJobId:  data.data.task_id,
      provider:       this.name,
      dispatchedAt:   new Date(),
      pollIntervalMs: 8_000,
      metadata:       { model },
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    const apiKey = await getSecret(SECRET_KEYS.POYO_API_KEY);
    const model  = (handle.metadata as any)?.model ?? "generate-music";

    const res = await fetch(`${POYO_STATUS}/${handle.externalJobId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return {
        status:       "failed",
        errorMessage: `[Poyo] Status check failed: HTTP ${res.status}`,
      };
    }

    const resp = await res.json() as PoyoDetailResponse;
    const d    = resp.data;

    if (!d) {
      return { status: "processing" };
    }

    const status = d.status?.toLowerCase();

    if (status === "finished") {
      const files  = d.files ?? [];
      const first  = files[0] ?? {};

      // ── Collect all output URLs ────────────────────────────────────────────
      const outputUrls: string[] = [];

      for (const f of files) {
        if (f.audio_url)  outputUrls.push(f.audio_url);
        if (f.video_url)  outputUrls.push(f.video_url);
        if (f.wav_url)    outputUrls.push(f.wav_url);
        if (f.image_url)  outputUrls.push(f.image_url);

        // Stem/vocal separation — parse JSON fields
        if (f.separate_vocals) {
          try {
            const sv = JSON.parse(f.separate_vocals) as { vocal_url?: string; instrumental_url?: string };
            if (sv.vocal_url)          outputUrls.push(sv.vocal_url);
            if (sv.instrumental_url)   outputUrls.push(sv.instrumental_url);
          } catch { /* ignore */ }
        }
        if (f.vocal_removal) {
          try {
            const vr = JSON.parse(f.vocal_removal) as Record<string, string>;
            outputUrls.push(...Object.values(vr).filter(Boolean));
          } catch { /* ignore */ }
        }
        if (f.generate_cover) {
          try {
            const gc = JSON.parse(f.generate_cover) as Array<{ file_url: string }>;
            outputUrls.push(...gc.map(x => x.file_url).filter(Boolean));
          } catch { /* ignore */ }
        }
      }

      const primaryUrl =
        first.video_url ??   // video first — Seedance 2 outputs video_url
        first.audio_url ??
        first.wav_url   ??
        first.image_url ??
        outputUrls[0];

      const costCents = OPERATION_COSTS[model] ?? 10;

      // Preserve clip_batch / pipeline metadata passed through handle
      const handleMeta = handle.metadata as Record<string, unknown> ?? {};

      return {
        status:     "complete",
        outputUrl:  primaryUrl,
        outputUrls: outputUrls.length > 0 ? outputUrls : undefined,
        metadata: {
          model,
          files,
          // Pipeline passthrough — required by OrchestrationEngine clip_batch handler
          shotIndex:          handleMeta.shotIndex,
          pipelineRunId:      handleMeta.pipelineRunId,
          clipUrl:            first.video_url ?? primaryUrl,
          // Convenience unwrapped fields
          audio_url:          first.audio_url,
          video_url:          first.video_url,
          wav_url:            first.wav_url,
          image_url:          first.image_url,
          audio_id:           first.audio_id,
          title:              first.title,
          tags:               first.tags,
          duration:           first.duration,
          lyrics_text:        first.text,
          timestamped_lyrics: first.timestampe_lyrics,
          style_boost:        first.style,
          persona_id:         first.persona_id,
          separate_vocals:    first.separate_vocals,
          vocal_removal:      first.vocal_removal,
          stem_split:         first.stem_split,
          generate_cover:     first.generate_cover,
          credits_used:       d.credits_amount,
        },
        costCents,
      };
    }

    if (status === "failed") {
      return {
        status:       "failed",
        errorMessage: d.error_message ?? "Poyo.ai generation failed",
      };
    }

    // not_started | running
    return { status: "processing" };
  },

  async cancelJob(_handle: JobHandle): Promise<void> {
    // Poyo.ai has no cancel endpoint — no-op
  },

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const apiKey = await getSecret(SECRET_KEYS.POYO_API_KEY);

      // Probe the status endpoint with a dummy task_id.
      // 200/400/404 = server up and auth valid.
      const res = await fetch(`${POYO_STATUS}/health-probe`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
        signal:  AbortSignal.timeout(8_000),
      });

      // 200 with null status = server up and auth valid
      const alive = res.status === 200 || res.status === 400 || res.status === 404;

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

// ─── Poyo LLM Chat Helper ─────────────────────────────────────────────────────
// Drop-in replacement for OpenAI chat/completions calls.
// Uses Poyo.ai /v1/chat/completions (OpenAI-compatible format).
// Model strings: POYO_LLM.sophia | POYO_LLM.pipeline | POYO_LLM.background

export interface PoyoChatMessage {
  role:    "system" | "user" | "assistant";
  content: string;
}

export interface PoyoChatOptions {
  model?:          string;            // defaults to POYO_LLM.pipeline
  messages:        PoyoChatMessage[];
  temperature?:    number;
  max_tokens?:     number;
  response_format?: { type: "json_object" | "text" };
  stream?:         boolean;
}

export interface PoyoChatResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens:     number;
    completion_tokens: number;
    total_tokens:      number;
  };
  model?: string;
}

/**
 * Send a chat completion request via Poyo.ai.
 * Automatically uses POYO_API_KEY — no separate API key needed.
 *
 * @example
 * const resp = await poyoChat({
 *   model: POYO_LLM.sophia,
 *   messages: [{ role: "user", content: "Hello Sophia" }],
 * });
 * const reply = resp.choices[0].message.content;
 */
export async function poyoChat(opts: PoyoChatOptions): Promise<PoyoChatResponse> {
  const apiKey = await getSecret(SECRET_KEYS.POYO_API_KEY);
  const body = {
    model:            opts.model ?? POYO_LLM.pipeline,
    messages:         opts.messages,
    temperature:      opts.temperature ?? 0.7,
    max_tokens:       opts.max_tokens  ?? 2000,
    ...(opts.response_format ? { response_format: opts.response_format } : {}),
    ...(opts.stream           ? { stream: opts.stream }                   : {}),
  };

  const res = await fetch(POYO_CHAT, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body:   JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Poyo LLM] ${opts.model ?? body.model} failed: HTTP ${res.status} — ${errText}`);
  }

  // Poyo wraps in { code, data: { ...openai_response } } for some endpoints
  // but /v1/chat/completions returns standard OpenAI format directly
  const json = await res.json() as any;

  // Handle Poyo wrapper format if present
  if (json.code === 200 && json.data?.choices) {
    return json.data as PoyoChatResponse;
  }

  return json as PoyoChatResponse;
}

// ── Convenience helper ───────────────────────────────────────
// Returns the text content string directly, avoiding PoyoChatResponse
// type mismatch when callers need a plain string.
export async function poyoChatText(opts: PoyoChatOptions): Promise<string> {
  const r = await poyoChat(opts);
  return r.choices[0]?.message?.content ?? "";
}
