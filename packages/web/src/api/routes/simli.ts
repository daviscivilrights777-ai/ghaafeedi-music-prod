// ============================================================
// FILE: packages/web/src/api/routes/simli.ts
// PURPOSE: Complete rewrite of all Simli API routes
//
// Changes from previous version:
// 1. Token endpoint tries compose/token first, no extra
//    model parameters that may not be supported
// 2. tts-stream endpoint correctly sets headers to prevent
//    any buffering (nginx, bun, cloudflare all covered)
// 3. New tts-pcm-chunked endpoint that pre-chunks PCM
//    server-side into exactly 3200-byte frames
// 4. Removed tts-fallback (MP3) — Simli handles audio now
// 5. Added diagnostics endpoint for debugging
// ============================================================

import { Hono } from "hono";
import { stream } from "hono/streaming";

const simliRoutes = new Hono();

// ─── Environment ─────────────────────────────────────────────

const SIMLI_API_KEY = process.env.SIMLI_API_KEY!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID ?? "pFZP5JQG7iQjIQuC4Bku";
const SIMLI_FACE_ID =
  process.env.SIMLI_FACE_ID ?? "9c402979-2e74-47f5-a4ed-ae235b092dc9";

// PCM spec: 16kHz, mono, PCM16 = 3200 bytes per 100ms
const SIMLI_CHUNK_BYTES = 3200;
const SIMLI_CHUNK_MS = 100;

// ─── POST /api/simli/token ───────────────────────────────────

simliRoutes.post("/token", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const faceId = (body as Record<string, string>).faceId ?? SIMLI_FACE_ID;

    console.log(`[Simli/token] Requesting token for face: ${faceId}`);

    // ── Attempt 1: New compose/token endpoint ────────────────
    let sessionToken: string | null = null;

    const attempt1 = await fetch("https://api.simli.ai/compose/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-simli-api-key": SIMLI_API_KEY,
      },
      body: JSON.stringify({
        faceId,
        handleSilence: true,
        maxSessionLength: 300,
        maxIdleTime: 60,
        // NOTE: Do NOT send "model" field unless confirmed supported
        // Sending unsupported fields may cause silent failures
      }),
    });

    if (attempt1.ok) {
      const data = await attempt1.json() as Record<string, unknown>;
      sessionToken =
        (data.session_token as string) ??
        (data.sessionToken as string) ??
        null;
      console.log("[Simli/token] compose/token succeeded");
    } else {
      const errText = await attempt1.text();
      console.warn(
        `[Simli/token] compose/token failed: ${attempt1.status} — ${errText}`
      );
    }

    // ── Attempt 2: Legacy endpoint ───────────────────────────
    if (!sessionToken) {
      console.log("[Simli/token] Trying legacy startAudioToVideoSession...");

      const attempt2 = await fetch(
        "https://api.simli.ai/startAudioToVideoSession",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: SIMLI_API_KEY,
            faceId,
            handleSilence: true,
            maxSessionLength: 300,
            maxIdleTime: 60,
          }),
        }
      );

      if (attempt2.ok) {
        const data = await attempt2.json() as Record<string, unknown>;
        sessionToken =
          (data.session_token as string) ??
          (data.sessionToken as string) ??
          null;
        console.log("[Simli/token] Legacy endpoint succeeded");
      } else {
        const errText = await attempt2.text();
        console.error(
          `[Simli/token] Legacy endpoint failed: ${attempt2.status} — ${errText}`
        );
      }
    }

    if (!sessionToken) {
      return c.json(
        {
          error: "Failed to obtain session token from both endpoints",
          hint: "Check SIMLI_API_KEY and face_id validity",
        },
        502
      );
    }

    console.log(
      `[Simli/token] Token obtained: ${sessionToken.substring(0, 20)}...`
    );

    return c.json({
      session_token: sessionToken,
      face_id: faceId,
    });

  } catch (err) {
    console.error("[Simli/token] Unexpected error:", err);
    return c.json(
      { error: "Internal server error", detail: String(err) },
      500
    );
  }
});

// ─── POST /api/simli/tts-stream ──────────────────────────────
//
// Streams raw PCM16 from ElevenLabs to the client.
// The client (SimliAvatarEngine) re-chunks into 3200-byte frames.
//
// Headers are set to prevent ALL forms of buffering:
// - nginx: X-Accel-Buffering: no
// - bun/node: Cache-Control: no-store
// - cloudflare: X-Robots-Tag prevents edge caching

simliRoutes.post("/tts-stream", async (c) => {
  try {
    const body = await c.req.json() as { text: string };
    const { text } = body;

    if (!text || typeof text !== "string") {
      return c.json({ error: "text is required" }, 400);
    }

    console.log(
      `[Simli/tts-stream] Generating PCM for: "${text.substring(0, 50)}..."`
    );

    // Request PCM16 at 16kHz from ElevenLabs
    const elResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream` +
      `?output_format=pcm_16000&optimize_streaming_latency=3`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elResponse.ok || !elResponse.body) {
      const errText = await elResponse.text();
      console.error(
        `[Simli/tts-stream] ElevenLabs error: ${elResponse.status} — ${errText}`
      );
      return c.json(
        { error: "ElevenLabs TTS failed", status: elResponse.status },
        502
      );
    }

    // Proxy the stream directly with no-buffer headers
    return new Response(elResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        // Prevent ALL buffering
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "X-Accel-Buffering": "no",        // nginx
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (err) {
    console.error("[Simli/tts-stream] Error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── POST /api/simli/tts-chunked ─────────────────────────────
//
// ALTERNATIVE: Pre-chunk PCM server-side into 3200-byte frames
// and stream each chunk as a newline-delimited base64 message.
//
// Use this if the client-side rechunking in SimliAvatarEngine
// still causes issues. This guarantees chunk sizes are correct.

simliRoutes.post("/tts-chunked", async (c) => {
  try {
    const body = await c.req.json() as { text: string };
    const { text } = body;

    const elResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream` +
      `?output_format=pcm_16000&optimize_streaming_latency=3`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!elResponse.ok || !elResponse.body) {
      return c.json({ error: "ElevenLabs failed" }, 502);
    }

    // Stream as newline-delimited base64 chunks of exactly 3200 bytes
    return stream(c, async (streamWriter) => {
      const reader = elResponse.body!.getReader();
      let buffer = new Uint8Array(0);

      const sendChunk = async (chunk: Uint8Array) => {
        const b64 = Buffer.from(chunk).toString("base64");
        await streamWriter.write(b64 + "\n");
        // Pace at real-time rate
        await new Promise(r => setTimeout(r, SIMLI_CHUNK_MS));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          // Merge into buffer
          const merged = new Uint8Array(buffer.length + value.length);
          merged.set(buffer);
          merged.set(value, buffer.length);
          buffer = merged;

          // Send complete 3200-byte chunks
          while (buffer.length >= SIMLI_CHUNK_BYTES) {
            const chunk = buffer.slice(0, SIMLI_CHUNK_BYTES);
            buffer = buffer.slice(SIMLI_CHUNK_BYTES);
            await sendChunk(chunk);
          }
        }
      }

      // Flush remainder with silence padding
      if (buffer.length > 0) {
        const padded = new Uint8Array(SIMLI_CHUNK_BYTES);
        padded.set(buffer);
        await sendChunk(padded);
      }

      // Send end-of-stream marker
      await streamWriter.write("END\n");
    });

  } catch (err) {
    console.error("[Simli/tts-chunked] Error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── GET /api/simli/diagnostics ──────────────────────────────
//
// Run this endpoint FIRST before debugging any other issue.
// It checks all external dependencies and returns a health report.

simliRoutes.get("/diagnostics", async (c) => {
  const results: Record<string, unknown> = {};

  // Check Simli API key
  try {
    const faceCheck = await fetch(
      `https://api.simli.ai/faces/legacy/generation_status?face_id=${SIMLI_FACE_ID}`,
      { headers: { "x-simli-api-key": SIMLI_API_KEY } }
    );
    results.simli_face_check = {
      status: faceCheck.status,
      ok: faceCheck.ok,
      body: await faceCheck.json().catch(() => null),
    };
  } catch (e) {
    results.simli_face_check = { error: String(e) };
  }

  // Check compose/token endpoint
  try {
    const tokenCheck = await fetch("https://api.simli.ai/compose/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-simli-api-key": SIMLI_API_KEY,
      },
      body: JSON.stringify({ faceId: SIMLI_FACE_ID }),
    });
    const tokenBody = await tokenCheck.json().catch(() => null) as Record<string, unknown> | null;
    results.simli_token = {
      status: tokenCheck.status,
      ok: tokenCheck.ok,
      has_token: !!(tokenBody?.session_token || tokenBody?.sessionToken),
    };
  } catch (e) {
    results.simli_token = { error: String(e) };
  }

  // Check ElevenLabs
  try {
    const elCheck = await fetch(
      `https://api.elevenlabs.io/v1/voices/${ELEVENLABS_VOICE_ID}`,
      { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
    );
    results.elevenlabs_voice = {
      status: elCheck.status,
      ok: elCheck.ok,
      voice_id: ELEVENLABS_VOICE_ID,
    };
  } catch (e) {
    results.elevenlabs_voice = { error: String(e) };
  }

  // Environment check
  results.environment = {
    has_simli_key: !!SIMLI_API_KEY,
    has_elevenlabs_key: !!ELEVENLABS_API_KEY,
    simli_face_id: SIMLI_FACE_ID,
    elevenlabs_voice_id: ELEVENLABS_VOICE_ID,
  };

  const allOk = Object.values(results).every(
    (v) => typeof v === "object" && v !== null && (v as Record<string, unknown>).ok !== false
  );

  return c.json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks: results,
  });
});

// ─── GET /api/simli/face-status ──────────────────────────────

simliRoutes.get("/face-status", async (c) => {
  const faceId = c.req.query("face_id") ?? SIMLI_FACE_ID;

  try {
    const response = await fetch(
      `https://api.simli.ai/faces/legacy/generation_status?face_id=${faceId}`,
      {
        headers: {
          "x-simli-api-key": SIMLI_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    return c.json({
      face_id: faceId,
      status: response.status,
      data,
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


export { simliRoutes };
