import { Hono } from "hono";
import { auth } from "../auth";
import { getSecret } from "../orchestration/secrets";
import { SophiaIntroGenerator, type SophiaIntroRequest } from "../orchestration/sophia-intro-generator";
import { logAICall } from "../lib/braintrust";

const app = new Hono();

// In-memory free tier tracker: key = ip+date, value = message count
// This resets naturally when server restarts; Redis would be better for scale
// but for 0-100k users this is fine with 24h reset baked into the key
const freeTierUsage = new Map<string, number>();

function getFreeTierKey(ip: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${ip}:${today}`;
}

const FREE_LIMIT = 3;

// POST /api/sophia/chat
app.post("/chat", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ||
              c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
              "unknown";

  // Check auth session
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const userId = session?.user?.id ?? null;

  // Determine if paid member (has active subscription)
  // Free-tier logic applies to non-authenticated OR authenticated free-tier users
  let isPaidMember = false;
  if (userId) {
    try {
      const { db } = await import("../database/pg-client");
      const { subscriptions } = await import("../database/pg-schema");
      const { eq, and } = await import("drizzle-orm");
      const activeSubs = await db.select()
        .from(subscriptions)
        .where(and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        ))
        .limit(1);
      isPaidMember = activeSubs.length > 0;
    } catch { isPaidMember = false; }
  }

  // Rate limit for non-paid users
  if (!isPaidMember) {
    const key = userId ? `user:${userId}:${new Date().toISOString().slice(0,10)}` : getFreeTierKey(ip);
    const count = freeTierUsage.get(key) ?? 0;
    if (count >= FREE_LIMIT) {
      return c.json({
        reply: null,
        limitReached: true,
        remaining: 0,
        message: "You've used your 3 free daily messages with Sophia. Upgrade to any plan for unlimited access.",
      }, 429);
    }
    freeTierUsage.set(key, count + 1);
    // Clean up old keys every 1000 entries to prevent memory leak
    if (freeTierUsage.size > 1000) {
      const today = new Date().toISOString().slice(0, 10);
      for (const [k] of freeTierUsage) {
        if (!k.includes(today)) freeTierUsage.delete(k);
      }
    }
  }

  const body = await c.req.json().catch(() => ({}));
  const { message, history = [] } = body as { message: string; history: {role:string;content:string}[] };

  if (!message?.trim()) {
    return c.json({ error: "Message required" }, 400);
  }

  try {
    const apiKey = await getSecret("OPENAI_API_KEY").catch(() => process.env.OPENAI_API_KEY ?? "");
    if (!apiKey) return c.json({ error: "AI not configured" }, 503);

    // ── Phase 8: Lip sync context injection ────────────────────────────────
    const lipSyncTriggers = ["lip sync", "lipsync", "sophia video", "my video", "video status", "lip-sync"];
    const hasLipSyncQuery = lipSyncTriggers.some(t => message.toLowerCase().includes(t));
    let lipSyncContext = "";
    if (hasLipSyncQuery && userId) {
      try {
        const { db: pgDb } = await import("../database/pg-client");
        const { aiJobs } = await import("../database/pg-schema");
        const { eq, and, desc } = await import("drizzle-orm");
        const lsJobs = await pgDb
          .select({
            id: aiJobs.id,
            status: aiJobs.status,
            outputUrl: aiJobs.outputUrl,
            errorMessage: aiJobs.errorMessage,
            createdAt: aiJobs.createdAt,
            completedAt: aiJobs.completedAt,
          })
          .from(aiJobs)
          .where(and(eq(aiJobs.userId, userId), eq(aiJobs.jobType, "lip_sync")))
          .orderBy(desc(aiJobs.createdAt))
          .limit(5);

        if (lsJobs.length > 0) {
          const jobLines = lsJobs.map((j, i) => {
            const status = j.status;
            const created = j.createdAt ? new Date(j.createdAt).toLocaleDateString() : "unknown date";
            const out = (j.outputUrl as string | null) ? `Output ready: ${j.outputUrl}` : "";
            const err = (j.errorMessage as string | null) ? `Error: ${(j.errorMessage as string).slice(0, 80)}` : "";
            return `  Job ${i + 1}: status=${status}, created=${created}${out ? ", " + out : ""}${err ? ", " + err : ""}`;
          }).join("\n");
          lipSyncContext = `\n\nMEMBER LIP SYNC JOB STATUS (last ${lsJobs.length}):\n${jobLines}\nUse this data to answer the member's lip sync status question accurately. If status is "completed" and output URL exists, share it. If "failed", empathize and suggest they contact support or retry. If "queued" or "running", let them know it's being processed.`;
        } else {
          lipSyncContext = "\n\nThe member has no lip sync jobs on record. If they want to add Sophia Lip Sync narration, it's a $29 add-on (FREE for Elite members) they can request from their dashboard.";
        }
      } catch { /* silently skip — don't break chat */ }
    }
    // ────────────────────────────────────────────────────────────────────────

    const systemPrompt = `You are Sophia, the AI Emotional Concierge for Ghaafeedi Music — a luxury AI-powered emotional storytelling platform that turns people's memories into cinematic songs, films, and legacy experiences.

Your personality: warm, empathetic, sophisticated, and deeply caring. You speak like a trusted creative partner who genuinely wants to help people preserve their most precious memories.

You help with:
- Explaining Ghaafeedi Music products (14 experiences: cinematic songs, films, voice cloning, memorial films, etc.)
- Guiding users through the onboarding process
- Answering pricing questions (songs from $19/mo, videos from $79)
- Emotional support around the creative process
- Order and account questions
- Sophia Lip Sync Narration add-on ($29, FREE for Elite members) — AI lip sync of Sophia narrating the member's production

For non-members, keep responses concise and focused. Always encourage them to start their story. Never be pushy — be genuinely helpful.

Keep responses under 120 words. Be warm, personal, and direct.${lipSyncContext}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 180,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.slice(-6), // keep last 6 messages for context
          { role: "user", content: message.trim() },
        ],
      }),
    });

    const data = await response.json() as any;
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "I'm here to help. Could you tell me more?";

    // Log to Braintrust for fine-tuning dataset collection
    logAICall({
      name: "sophia-chat",
      model: "gpt-4o-mini",
      prompt: message.trim(),
      output: reply,
      metadata: {
        userId: userId ?? "anonymous",
        isPaidMember,
        historyLength: history.length,
      },
    });

    const key = userId
      ? `user:${userId}:${new Date().toISOString().slice(0,10)}`
      : getFreeTierKey(ip);
    const remaining = isPaidMember ? 999 : Math.max(0, FREE_LIMIT - (freeTierUsage.get(key) ?? 0));

    return c.json({ reply, limitReached: false, remaining, isPaidMember });
  } catch (err) {
    console.error("[Sophia] Chat error:", err);
    return c.json({ error: "Sophia is unavailable right now. Please try again." }, 500);
  }
});

// ─── POST /api/sophia/intro ───────────────────────────────────────────────────
// Generate personalized intro + outro scripts + audio for a customer production.
// Accepts: { userId, customerFirstName, customerLastName, story,
//            emotionalScores, eventType, productType, suggestedTitle? }
// Returns: SophiaIntroResult

const _introRateLimit = new Map<string, { count: number; resetAt: number }>();
const INTRO_RATE_LIMIT = 5; // max 5 generates per user per minute

app.post("/intro", async (c) => {
  // Auth check (allow QA bypass via X-Admin-QA-Key)
  const qaKey = process.env.GM_ADMIN_QA_KEY ?? "";
  const isQA  = qaKey && c.req.header("X-Admin-QA-Key") === qaKey;

  const session = isQA ? null : await auth.api.getSession({ headers: c.req.raw.headers });
  const userId  = isQA ? "qa-admin" : (session?.user?.id ?? c.req.header("x-user-id") ?? null);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Rate limit
  const now = Date.now();
  const rl   = _introRateLimit.get(userId);
  if (rl && now < rl.resetAt) {
    if (rl.count >= INTRO_RATE_LIMIT) {
      return c.json({ error: "Rate limit: max 5 intro generations per minute." }, 429);
    }
    rl.count++;
  } else {
    _introRateLimit.set(userId, { count: 1, resetAt: now + 60_000 });
  }

  // Parse body
  let body: Partial<SophiaIntroRequest>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { customerFirstName, customerLastName, story, emotionalScores, eventType, productType, suggestedTitle } = body;

  if (!customerFirstName || !customerLastName) {
    return c.json({ error: "customerFirstName and customerLastName are required" }, 400);
  }
  if (!story || story.length < 10) {
    return c.json({ error: "story must be at least 10 characters" }, 400);
  }
  if (!emotionalScores || Object.keys(emotionalScores).length === 0) {
    return c.json({ error: "emotionalScores is required (at least one emotion)" }, 400);
  }
  if (!eventType) return c.json({ error: "eventType is required" }, 400);
  if (!productType) return c.json({ error: "productType is required" }, 400);

  try {
    const result = await SophiaIntroGenerator.generate({
      userId:            body.userId ?? userId,
      customerFirstName,
      customerLastName,
      story,
      emotionalScores,
      eventType,
      productType,
      suggestedTitle,
    });

    return c.json({ success: true, ...result });
  } catch (err) {
    console.error("[Sophia] /intro error:", err);
    return c.json({ error: "Intro generation failed. Please try again." }, 500);
  }
});

// ─── POST /api/sophia/tts ────────────────────────────────────────────────────
// Server-side ElevenLabs proxy — keeps API key server-side, no VITE_ exposure
// Request: { text: string }
// Response: audio/mpeg binary stream
const EL_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "pFZP5JQG7iQjIQuC4Bku";

app.post("/tts", async (c) => {
  const elKey = process.env["ELEVENLABS_API_KEY"];
  if (!elKey) return c.json({ error: "ElevenLabs not configured" }, 503);

  let body: { text?: string; voice_id?: string };
  try { body = await c.req.json(); }
  catch { return c.json({ error: "Invalid JSON" }, 400); }

  const { text, voice_id } = body;
  if (!text || typeof text !== "string" || text.trim().length === 0)
    return c.json({ error: "text is required" }, 400);
  if (text.length > 1200)
    return c.json({ error: "text exceeds 1200 char limit" }, 400);

  const voiceId = voice_id ?? process.env["ELEVENLABS_VOICE_ID"] ?? DEFAULT_VOICE_ID;

  const upstream = await fetch(`${EL_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": elKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: text.trim(),
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.35, use_speaker_boost: true },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!upstream.ok) {
    const err = await upstream.text().catch(() => upstream.statusText);
    console.error(`[Sophia TTS] ElevenLabs ${upstream.status}:`, err);
    return c.json({ error: `ElevenLabs ${upstream.status}` }, 502);
  }

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

// ─── GET /api/sophia/tts/health ──────────────────────────────────────────────
app.get("/tts/health", (c) =>
  c.json({
    status: !!process.env["ELEVENLABS_API_KEY"] ? "ok" : "degraded",
    voice_id: process.env["ELEVENLABS_VOICE_ID"] ?? DEFAULT_VOICE_ID,
  })
);

export { app as sophia };
