/**
 * GHAAFEEDI MUSIC — Simli Session Token Route
 * ══════════════════════════════════════════════════════════════════
 * Keeps Simli API key server-side. Client requests a session token,
 * never sees the raw key.
 *
 * POST /api/simli/token   → { session_token }
 * POST /api/sophia/tts    → PCM16 audio ArrayBuffer (for Simli sendAudioData)
 */
import { Hono } from "hono";
import { getSecret } from "../orchestration/secrets";

const app = new Hono();

const SIMLI_FACE_ID = "afdb6a3e-3939-40aa-92df-01604c23101c"; // Zahra — Mediterranean woman
const ELEVENLABS_VOICE_ID = "CwhRBWXzGAHq8TQ4Fs17"; // Sophia voice

// ─── POST /api/simli/token ────────────────────────────────────────────────────
app.post("/token", async (c) => {
  try {
    const simliKey =
      (await getSecret("SIMLI_API_KEY").catch(() => null)) ??
      process.env.SIMLI_API_KEY ??
      "";

    if (!simliKey) return c.json({ error: "Simli not configured" }, 503);

    const res = await fetch("https://api.simli.ai/startAudioToVideoSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: simliKey,
        faceId: SIMLI_FACE_ID,
        handleSilence: true,
        maxSessionLength: 300, // 5 min max — free tier safe
        maxIdleTime: 60,
        model: "fasttalk", // lower latency
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Simli] token error:", err);
      return c.json({ error: "Failed to create session" }, 502);
    }

    const data = (await res.json()) as { session_token: string };
    return c.json({ session_token: data.session_token });
  } catch (err) {
    console.error("[Simli] /token error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// ─── POST /api/simli/tts ──────────────────────────────────────────────────────
// Converts text → ElevenLabs PCM16 audio (16kHz mono) for Simli
// Body: { text: string }
// Returns: raw PCM16 binary (application/octet-stream)
app.post("/tts", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { text?: string };
    const text = body.text?.trim();

    if (!text) return c.json({ error: "text required" }, 400);
    if (text.length > 500) return c.json({ error: "text too long (max 500 chars)" }, 400);

    const elKey =
      (await getSecret("ELEVENLABS_API_KEY").catch(() => null)) ??
      process.env.ELEVENLABS_API_KEY ??
      "";

    if (!elKey) return c.json({ error: "ElevenLabs not configured" }, 503);

    // ElevenLabs → PCM 16kHz (required by Simli)
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream?output_format=pcm_16000`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.48,
            similarity_boost: 0.82,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Simli/TTS] ElevenLabs error:", res.status, err);
      return c.json({ error: "TTS failed" }, 502);
    }

    const audioBuffer = await res.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[Simli/TTS] error:", err);
    return c.json({ error: "TTS error" }, 500);
  }
});

export { app as simli };
