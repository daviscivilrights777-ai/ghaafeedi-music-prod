// ============================================================
// Ghaafeedi Music — ElevenLabs Adapter
// Voice narration, voice cloning.
// ============================================================
import type { ProviderAdapter, CostEstimate, JobHandle, ProviderJobResult, ProviderHealth } from "./provider-adapter";
import type { JobSpec } from "../job-queue";
import { getSecret, SECRET_KEYS } from "../secrets";

const BASE = "https://api.elevenlabs.io/v1";

// Cost estimates (cents per job)
const COSTS = {
  narration:    12,   // ~$0.12 per narration job
  voice_clone:  30,   // ~$0.30 per clone job
} as const;

// ElevenLabs premade voices (free-tier compatible)
const DEFAULT_VOICE_ID = "pFZP5JQG7iQjIQuC4Bku"; // Lily — Velvety Actress (Sophia)
const DEFAULT_MODEL    = "eleven_turbo_v2_5";       // Free tier + paid tier compatible

export const ElevenLabsAdapter: ProviderAdapter = {
  name:        "elevenlabs",
  displayName: "ElevenLabs",
  jobTypes:    ["narration", "voice_clone"],

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const cost = job.jobType === "voice_clone" ? COSTS.voice_clone : COSTS.narration;
    return {
      minCents:      cost,
      maxCents:      Math.round(cost * 1.5),
      estimateCents: cost,
      unit:          "per_request",
      breakdown:     `1 ${job.jobType} request × $${(cost / 100).toFixed(2)}`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const apiKey = await getSecret(SECRET_KEYS.ELEVENLABS_API_KEY);

    if (job.jobType === "voice_clone") {
      // Voice cloning — async training job
      const formData = new FormData();
      formData.append("name", (job.inputPayload?.label as string) || `clone_${job.userId}`);
      formData.append("description", "Ghaafeedi Music voice clone");
      // Audio file URLs from input payload
      const audioUrls = (job.inputPayload?.audioUrls as string[]) || [];
      for (const url of audioUrls) {
        const blob = await fetch(url).then((r) => r.blob());
        formData.append("files", blob, "sample.mp3");
      }

      const res = await fetch(`${BASE}/voices/add`, {
        method:  "POST",
        headers: { "xi-api-key": apiKey },
        body:    formData,
      });

      if (!res.ok) throw new Error(`[ElevenLabs] Voice clone dispatch failed: ${res.status}`);
      const data = await res.json() as { voice_id: string };
      return { externalJobId: data.voice_id, provider: this.name, dispatchedAt: new Date() };
    }

    // Text-to-speech narration
    const voiceId = (job.inputPayload?.voiceId as string) || DEFAULT_VOICE_ID;
    const text    = (job.inputPayload?.text as string) || "";

    const res = await fetch(`${BASE}/text-to-speech/${voiceId}`, {
      method:  "POST",
      headers: {
        "xi-api-key":   apiKey,
        "Content-Type": "application/json",
        "Accept":       "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id:        (job.inputPayload?.modelId as string) || DEFAULT_MODEL,
        voice_settings:  { stability: 0.5, similarity_boost: 0.8 },
      }),
    });

    if (!res.ok) throw new Error(`[ElevenLabs] TTS failed: ${res.status}`);

    // ElevenLabs TTS is synchronous — audio returned directly
    const audioBuffer = await res.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return {
      externalJobId: `tts_${Date.now()}`,
      provider:      this.name,
      dispatchedAt:  new Date(),
      // Embed audio in handle metadata for immediate retrieval
      webhookUrl:    `data:audio/mpeg;base64,${base64Audio}`,
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    // TTS is synchronous — check for embedded audio in handle
    if (handle.webhookUrl?.startsWith("data:audio")) {
      return { status: "complete", outputUrl: handle.webhookUrl, costCents: COSTS.narration };
    }

    // Voice clone — check status
    const apiKey = await getSecret(SECRET_KEYS.ELEVENLABS_API_KEY);
    const res = await fetch(`${BASE}/voices/${handle.externalJobId}`, {
      headers: { "xi-api-key": apiKey },
    });

    if (!res.ok) return { status: "failed", errorMessage: "Voice fetch failed" };
    const data = await res.json() as { voice_id: string; name: string };
    return {
      status:    "complete",
      outputUrl: data.voice_id,
      metadata:  { voiceId: data.voice_id, name: data.name },
      costCents: COSTS.voice_clone,
    };
  },

  async cancelJob(_handle: JobHandle): Promise<void> {
    // ElevenLabs TTS is synchronous; clones can be deleted but not cancelled mid-train
  },

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const apiKey = await getSecret(SECRET_KEYS.ELEVENLABS_API_KEY);
      const res = await fetch(`${BASE}/user`, {
        headers: { "xi-api-key": apiKey },
        signal:  AbortSignal.timeout(5_000),
      });
      return { healthy: res.ok, latencyMs: Date.now() - start, checkedAt: new Date() };
    } catch (e: any) {
      return { healthy: false, message: e.message, checkedAt: new Date() };
    }
  },
};
