// ============================================================
// FILE: packages/web/src/api/routes/sophia-mobile.ts
// PURPOSE: Server-side orchestration for mobile Sophia lip sync
//
// Flow:
// 1. Receive text from mobile client
// 2. Check R2 cache (text hash → skip inference if cached)
// 3. Call Modal Wav2Lip function via REST API
// 4. Return CDN video URL to client
//
// The Modal function handles:
// - ElevenLabs TTS audio generation
// - Wav2Lip GPU inference
// - R2 upload + CDN URL
// ============================================================

import { Hono } from "hono";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";

export const sophiaMobileRoutes = new Hono();

// ─── Environment ──────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

// ─── R2 Client (cache check only — Modal does the upload) ─────────────────────

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${getEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

// ─── Cache Key ────────────────────────────────────────────────────────────────

function buildCacheKey(text: string, voiceId: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${text.trim().toLowerCase()}${voiceId}`)
    .digest("hex")
    .slice(0, 16);
  return hash;
}

// ─── Modal REST Caller ────────────────────────────────────────────────────────

async function callModalWav2Lip(payload: {
  text: string;
  step_index: number;
  voice_id: string;
}): Promise<{
  video_url: string;
  duration_seconds: number;
  clip_id: string;
  from_cache: boolean;
  latency_ms: number;
}> {
  // Direct web endpoint — workspace is fixed, no API lookup needed
  // Deployed at: modal deploy modal/wav2lip_inference.py
  const webEndpointUrl = "https://daviscivilrights777--sophia-speak-mobile.modal.run";

  const response = await fetch(webEndpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000), // 90s — A10G cold start can take ~60s
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Modal inference failed: ${response.status} — ${errorText}`);
  }

  const result = await response.json() as {
    video_url: string;
    duration_seconds: number;
    clip_id: string;
    from_cache: boolean;
    latency_ms: number;
  };

  return result;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/sophia-mobile/speak
 *
 * Request body:
 *   { text: string, stepIndex?: number }
 *
 * Response:
 *   { video_url, duration_seconds, clip_id, from_cache, latency_ms }
 */
sophiaMobileRoutes.post("/speak", async (c) => {
  const startTime = Date.now();

  let body: { text?: string; stepIndex?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { text, stepIndex = 0 } = body;

  // Validate
  if (!text || typeof text !== "string") {
    return c.json({ error: "text is required" }, 400);
  }
  if (text.trim().length === 0) {
    return c.json({ error: "text cannot be empty" }, 400);
  }
  if (text.length > 1200) {
    return c.json({ error: "text exceeds 1200 character limit" }, 400);
  }

  const voiceId = process.env["ELEVENLABS_VOICE_ID"] ?? "CwhRBWXzGAHq8TQ4Fs17";

  // ── Server-side cache check ──────────────────────────────────
  try {
    const r2        = getR2Client();
    const textHash  = buildCacheKey(text, voiceId);
    const r2Key     = `sophia/sophia_${stepIndex}_${textHash}.mp4`;
    const bucket    = process.env["R2_BUCKET_NAME"] ?? "ghaafeedi-media";
    const publicUrl = process.env["R2_PUBLIC_URL"] ?? "https://pub-bc7b203485814e1186102277ad450211.r2.dev";

    try {
      await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: r2Key }));

      // Cache hit — return immediately
      const videoUrl = `${publicUrl}/${r2Key}`;
      console.log(`[SophiaMobile] Cache hit: ${r2Key}`);

      return c.json({
        video_url:        videoUrl,
        duration_seconds: 5.0,  // Estimate — corrected by video element
        clip_id:          `sophia_${stepIndex}_${textHash}`,
        from_cache:       true,
        latency_ms:       Date.now() - startTime,
      });
    } catch {
      // Not cached — fall through to Modal inference
    }
  } catch (envErr) {
    // R2 not configured — skip cache check, go straight to Modal
    console.warn("[SophiaMobile] R2 cache check skipped:", envErr);
  }

  // ── Call Modal Wav2Lip ───────────────────────────────────────
  try {
    console.log(`[SophiaMobile] Calling Modal Wav2Lip for step ${stepIndex}: "${text.slice(0, 50)}"`);

    const result = await callModalWav2Lip({
      text:       text.trim(),
      step_index: stepIndex,
      voice_id:   voiceId,
    });

    console.log(
      `[SophiaMobile] Done: latency=${result.latency_ms}ms ` +
      `duration=${result.duration_seconds.toFixed(1)}s ` +
      `cache=${result.from_cache}`
    );

    return c.json(result);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SophiaMobile] Modal call failed:", message);

    // Signal client to use static portrait fallback
    return c.json(
      {
        error:    message,
        fallback: "use_static_portrait",
      },
      503
    );
  }
});

/**
 * GET /api/sophia-mobile/health
 * Quick health check — verifies Modal + R2 credentials are present
 */
sophiaMobileRoutes.get("/health", async (c) => {
  const checks: Record<string, boolean> = {
    modal_token_id:     !!process.env["MODAL_TOKEN_ID"],
    modal_token_secret: !!process.env["MODAL_TOKEN_SECRET"],
    elevenlabs_key:     !!process.env["ELEVENLABS_API_KEY"],
    elevenlabs_voice:   !!process.env["ELEVENLABS_VOICE_ID"],
    r2_account_id:      !!process.env["R2_ACCOUNT_ID"],
    r2_access_key:      !!process.env["R2_ACCESS_KEY_ID"],
    r2_secret_key:      !!process.env["R2_SECRET_ACCESS_KEY"],
    r2_public_url:      !!process.env["R2_PUBLIC_URL"],
  };

  const allOk = Object.values(checks).every(Boolean);

  return c.json(
    {
      status:  allOk ? "ok" : "degraded",
      checks,
      service: "sophia-mobile-lipsync",
    },
    allOk ? 200 : 503
  );
});

/**
 * GET /api/sophia-mobile/cache-status?text=...&stepIndex=...
 * Check if a clip is already cached in R2
 */
sophiaMobileRoutes.get("/cache-status", async (c) => {
  const text      = c.req.query("text") ?? "";
  const stepIndex = parseInt(c.req.query("stepIndex") ?? "0", 10);
  const voiceId   = process.env["ELEVENLABS_VOICE_ID"] ?? "CwhRBWXzGAHq8TQ4Fs17";

  if (!text) {
    return c.json({ error: "text query param required" }, 400);
  }

  try {
    const r2        = getR2Client();
    const textHash  = buildCacheKey(text, voiceId);
    const r2Key     = `sophia/sophia_${stepIndex}_${textHash}.mp4`;
    const bucket    = process.env["R2_BUCKET_NAME"] ?? "ghaafeedi-media";
    const publicUrl = process.env["R2_PUBLIC_URL"] ?? "https://pub-bc7b203485814e1186102277ad450211.r2.dev";

    try {
      await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: r2Key }));
      return c.json({
        cached:    true,
        video_url: `${publicUrl}/${r2Key}`,
        r2_key:    r2Key,
      });
    } catch {
      return c.json({ cached: false, r2_key: r2Key });
    }
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
