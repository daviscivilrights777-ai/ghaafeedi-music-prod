/**
 * GHAAFEEDI MUSIC — Simli Routes
 * ══════════════════════════════════════════════════════════════════
 * POST /api/simli/token        → { session_token, face_id, face_ready }
 * POST /api/simli/tts          → PCM16 audio ArrayBuffer (ElevenLabs → Simli)
 * GET  /api/simli/face-status  → { status, face_id, face_ready }
 *
 * Face priority:
 *   1. SIMLI_SOPHIA_FACE_ID (env) — custom Sophia face (processed from portrait)
 *   2. Zahra preset afdb6a3e     — fallback while Sophia face is processing
 */
import { Hono } from "hono";
import { getSecret } from "../orchestration/secrets";

const app = new Hono();

// Preset fallback — Mediterranean woman, closest to Sophia
const SIMLI_ZAHRA_FACE_ID    = "afdb6a3e-3939-40aa-92df-01604c23101c";
const ELEVENLABS_VOICE_ID    = "CwhRBWXzGAHq8TQ4Fs17"; // Sophia voice

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getSimliKey(): Promise<string> {
  return (
    (await getSecret("SIMLI_API_KEY").catch(() => null)) ??
    process.env.SIMLI_API_KEY ??
    ""
  );
}

/** Returns Sophia's custom face ID if processed, otherwise Zahra preset */
async function resolveActiveFaceId(simliKey: string): Promise<{ faceId: string; faceReady: boolean }> {
  const sophiaFaceId = process.env.SIMLI_SOPHIA_FACE_ID ?? "";

  if (!sophiaFaceId) {
    return { faceId: SIMLI_ZAHRA_FACE_ID, faceReady: false };
  }

  try {
    const res = await fetch(
      `https://api.simli.ai/faces/legacy/generation_status?face_id=${sophiaFaceId}`,
      { headers: { "x-simli-api-key": simliKey } }
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { status?: string; face_id?: string };

    if (data.status === "done" || data.status === "completed" || data.status === "success") {
      return { faceId: sophiaFaceId, faceReady: true };
    }
  } catch (err) {
    console.warn("[Simli] face status check failed:", err);
  }

  // Still processing — use Zahra preset
  return { faceId: SIMLI_ZAHRA_FACE_ID, faceReady: false };
}

// ─── GET /api/simli/face-status ───────────────────────────────────────────────
// Client polls this to know when Sophia's custom face is ready
app.get("/face-status", async (c) => {
  try {
    const simliKey = await getSimliKey();
    if (!simliKey) return c.json({ error: "Simli not configured" }, 503);

    const sophiaFaceId = process.env.SIMLI_SOPHIA_FACE_ID ?? "";
    if (!sophiaFaceId) {
      return c.json({ status: "no_custom_face", face_id: null, face_ready: false });
    }

    const res = await fetch(
      `https://api.simli.ai/faces/legacy/generation_status?face_id=${sophiaFaceId}`,
      { headers: { "x-simli-api-key": simliKey } }
    );

    if (!res.ok) {
      return c.json({ status: "error", face_id: sophiaFaceId, face_ready: false });
    }

    const data = (await res.json()) as { status?: string };
    const faceReady = ["done", "completed", "success"].includes(data.status ?? "");

    return c.json({
      status: data.status ?? "unknown",
      face_id: faceReady ? sophiaFaceId : SIMLI_ZAHRA_FACE_ID,
      sophia_face_id: sophiaFaceId,
      face_ready: faceReady,
    });
  } catch (err) {
    console.error("[Simli] /face-status error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// ─── POST /api/simli/token ────────────────────────────────────────────────────
app.post("/token", async (c) => {
  try {
    const simliKey = await getSimliKey();
    if (!simliKey) return c.json({ error: "Simli not configured" }, 503);

    // Use Sophia's face if ready, else Zahra preset
    const { faceId, faceReady } = await resolveActiveFaceId(simliKey);

    // Try new compose/token endpoint first, fall back to legacy
    const res = await fetch("https://api.simli.ai/compose/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-simli-api-key": simliKey },
      body: JSON.stringify({
        faceId,
        handleSilence: true,
        maxSessionLength: 300,
        maxIdleTime: 60,
        model: "fasttalk",
      }),
    });

    if (!res.ok) {
      // Fallback to legacy endpoint
      const res2 = await fetch("https://api.simli.ai/startAudioToVideoSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: simliKey,
          faceId,
          handleSilence: true,
          maxSessionLength: 300,
          maxIdleTime: 60,
          model: "fasttalk",
        }),
      });
      if (!res2.ok) {
        const err = await res2.text();
        console.error("[Simli] token error (legacy):", err);
        return c.json({ error: "Failed to create session" }, 502);
      }
      const data2 = (await res2.json()) as { session_token: string };
      return c.json({ session_token: data2.session_token, face_id: faceId, face_ready: faceReady });
    }

    const data = (await res.json()) as { session_token: string };
    return c.json({ session_token: data.session_token, face_id: faceId, face_ready: faceReady });
  } catch (err) {
    console.error("[Simli] /token error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// ─── POST /api/simli/tts ──────────────────────────────────────────────────────
// Converts text → ElevenLabs PCM16 audio (16kHz mono) for Simli sendAudioData
// Body: { text: string }
// Returns: raw PCM16 binary (application/octet-stream) — full buffer
app.post("/tts", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { text?: string };
    const text = body.text?.trim();

    if (!text) return c.json({ error: "text required" }, 400);
    if (text.length > 1200) return c.json({ error: "text too long (max 1200 chars)" }, 400);

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

// ─── POST /api/simli/tts-stream ───────────────────────────────────────────────
// Streams ElevenLabs PCM16 chunks as Transfer-Encoding: chunked
// Client reads stream chunk-by-chunk and pipes directly to Simli sendAudioData
// Body: { text: string }
// Returns: chunked PCM16 stream (application/octet-stream)
app.post("/tts-stream", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { text?: string };
    const text = body.text?.trim();

    if (!text) return c.json({ error: "text required" }, 400);
    if (text.length > 1200) return c.json({ error: "text too long (max 1200 chars)" }, 400);

    const elKey =
      (await getSecret("ELEVENLABS_API_KEY").catch(() => null)) ??
      process.env.ELEVENLABS_API_KEY ??
      "";

    if (!elKey) return c.json({ error: "ElevenLabs not configured" }, 503);

    // ElevenLabs streaming PCM 16kHz
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
      console.error("[Simli/TTS-Stream] ElevenLabs error:", res.status, err);
      return c.json({ error: "TTS stream failed" }, 502);
    }

    if (!res.body) {
      return c.json({ error: "No response body from ElevenLabs" }, 502);
    }

    // Pipe the ElevenLabs stream directly back to client as chunked response
    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no", // disable nginx buffering
      },
    });
  } catch (err) {
    console.error("[Simli/TTS-Stream] error:", err);
    return c.json({ error: "TTS stream error" }, 500);
  }
});

export { app as simli };
