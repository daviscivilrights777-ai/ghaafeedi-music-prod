// ============================================================
// FILE: packages/web/src/api/routes/did.ts
// PURPOSE: D-ID talking-head video generation for Sophia
//
// Flow:
// 1. Receive text from client
// 2. POST to D-ID /talks — D-ID calls ElevenLabs directly (native provider)
// 3. Poll D-ID until video is ready
// 4. Return D-ID video URL to client
//
// D-ID replaces Wav2Lip/Modal. REST only — no WebRTC.
// Works on ALL devices: desktop, iOS, Android.
// Portrait: sophia-lipsync-portrait.png on R2 CDN
// ============================================================

import { Hono } from "hono";

export const didRoutes = new Hono();

// ─── Constants ───────────────────────────────────────────────────────────────

const DID_API_URL = "https://api.d-id.com";
const SOPHIA_PORTRAIT_URL =
  process.env["SOPHIA_PORTRAIT_URL"] ??
  "https://pub-bc7b203485814e1186102277ad450211.r2.dev/sophia-lipsync-portrait.png";

// D-ID API key is base64(email:key) format — already provided as-is
function getDIDKey(): string {
  const key = process.env["DID_API_KEY"];
  if (!key) throw new Error("DID_API_KEY not configured");
  return key;
}

// ─── D-ID: Create talk (native ElevenLabs provider) ─────────────────────────

async function createDIDTalk(text: string): Promise<string> {
  const key = getDIDKey();
  const voiceId = process.env["ELEVENLABS_VOICE_ID"] ?? "pFZP5JQG7iQjIQuC4Bku";

  const body = {
    source_url: SOPHIA_PORTRAIT_URL,
    script: {
      type: "text",
      input: text.trim(),
      provider: {
        type: "elevenlabs",
        voice_id: voiceId,
        voice_config: { model_id: "eleven_turbo_v2_5" },
      },
    },
    config: {
      stitch: true,
      result_format: "mp4",
    },
  };

  const res = await fetch(`${DID_API_URL}/talks`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`D-ID create talk failed: ${res.status} — ${err}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

// ─── D-ID: Poll for result ────────────────────────────────────────────────────

async function pollDIDTalk(talkId: string, timeoutMs = 60000): Promise<string> {
  const key = getDIDKey();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${DID_API_URL}/talks/${talkId}`, {
      headers: {
        Authorization: `Basic ${key}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`D-ID poll failed: ${res.status}`);
    }

    const data = await res.json() as {
      status: string;
      result_url?: string;
      error?: { kind: string; description: string };
    };

    if (data.status === "done" && data.result_url) {
      return data.result_url;
    }

    if (data.status === "error" || data.status === "rejected") {
      throw new Error(`D-ID talk failed: ${data.error?.description ?? data.status}`);
    }

    // Still processing — wait 1.5s and poll again
    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error("D-ID talk timed out after 60s");
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/did/speak
 *
 * Request: { text: string }
 * Response: { video_url: string, latency_ms: number, talk_id: string }
 *
 * Full pipeline: ElevenLabs TTS → R2 upload → D-ID talk → poll → video URL
 */
didRoutes.post("/speak", async (c) => {
  const t0 = Date.now();

  let body: { text?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { text } = body;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return c.json({ error: "text is required" }, 400);
  }
  if (text.length > 1200) {
    return c.json({ error: "text exceeds 1200 char limit" }, 400);
  }

  // ── Create D-ID talk (D-ID calls ElevenLabs directly) ──────
  let talkId: string;
  try {
    console.log(`[D-ID] Creating talk for: "${text.slice(0, 60)}..."`);
    talkId = await createDIDTalk(text);
    console.log(`[D-ID] Talk created: ${talkId} in ${Date.now() - t0}ms`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[D-ID] Create talk failed:", msg);
    return c.json({ error: msg, fallback: "use_static_portrait" }, 503);
  }

  // ── Step 4: Poll for result ─────────────────────────────────
  let videoUrl: string;
  try {
    videoUrl = await pollDIDTalk(talkId);
    const totalMs = Date.now() - t0;
    console.log(`[D-ID] Done: ${videoUrl} total=${totalMs}ms`);
    return c.json({ video_url: videoUrl, talk_id: talkId, latency_ms: totalMs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[D-ID] Poll failed:", msg);
    return c.json({ error: msg, fallback: "use_static_portrait" }, 503);
  }
});

/**
 * GET /api/did/health
 */
didRoutes.get("/health", (c) => {
  const checks = {
    did_api_key: !!process.env["DID_API_KEY"],
    elevenlabs_key: !!process.env["ELEVENLABS_API_KEY"],
    r2_configured: !!process.env["R2_ACCOUNT_ID"],
    sophia_portrait: SOPHIA_PORTRAIT_URL,
  };
  const ok = checks.did_api_key && checks.elevenlabs_key && checks.r2_configured;
  return c.json({ status: ok ? "ok" : "degraded", checks }, ok ? 200 : 503);
});

/**
 * GET /api/did/credits
 * Check remaining D-ID credits/plan
 */
didRoutes.get("/credits", async (c) => {
  try {
    const key = getDIDKey();
    const res = await fetch(`${DID_API_URL}/credits`, {
      headers: { Authorization: `Basic ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`D-ID credits check: ${res.status}`);
    const data = await res.json();
    return c.json(data);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
