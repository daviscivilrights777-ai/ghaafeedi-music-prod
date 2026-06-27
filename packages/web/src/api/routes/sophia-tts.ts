// ============================================================
// FILE: packages/web/src/api/routes/sophia-tts.ts
// PURPOSE: Server-side ElevenLabs TTS proxy for Sophia
//
// Keeps API key server-side — no VITE_ exposure needed.
// Returns raw audio/mpeg stream directly to client.
// ============================================================

import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";

export const sophiaTtsRoutes = new Hono<HonoEnv>();

const EL_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "pFZP5JQG7iQjIQuC4Bku"; // Lily Velvety Actress

// ─── POST /api/sophia/tts ──────────────────────────────────────────────────
// Request: { text: string, voice_id?: string }
// Response: audio/mpeg stream

sophiaTtsRoutes.post("/tts", async (c) => {
  const elKey = process.env["ELEVENLABS_API_KEY"];
  if (!elKey) {
    return c.json({ error: "ElevenLabs not configured" }, 503);
  }

  let body: { text?: string; voice_id?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const { text, voice_id } = body;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return c.json({ error: "text is required" }, 400);
  }
  if (text.length > 1200) {
    return c.json({ error: "text exceeds 1200 char limit" }, 400);
  }

  const voiceId = voice_id ?? process.env["ELEVENLABS_VOICE_ID"] ?? DEFAULT_VOICE_ID;

  const upstream = await fetch(
    `${EL_BASE}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.82,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!upstream.ok) {
    const err = await upstream.text().catch(() => upstream.statusText);
    console.error(`[Sophia TTS] ElevenLabs error ${upstream.status}:`, err);
    return c.json({ error: `ElevenLabs ${upstream.status}` }, 502);
  }

  // Stream raw audio back — no buffering needed
  const audioData = await upstream.arrayBuffer();

  return new Response(audioData, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

// ─── GET /api/sophia/tts/health ───────────────────────────────────────────
sophiaTtsRoutes.get("/tts/health", (c) => {
  return c.json({
    status: !!process.env["ELEVENLABS_API_KEY"] ? "ok" : "degraded",
    voice_id: process.env["ELEVENLABS_VOICE_ID"] ?? DEFAULT_VOICE_ID,
  });
});
