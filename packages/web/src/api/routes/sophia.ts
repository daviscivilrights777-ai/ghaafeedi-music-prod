import { Hono } from "hono";
import { auth } from "../auth";
import { getSecret } from "../orchestration/secrets";

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

    const systemPrompt = `You are Sophia, the AI Emotional Concierge for Ghaafeedi Music — a luxury AI-powered emotional storytelling platform that turns people's memories into cinematic songs, films, and legacy experiences.

Your personality: warm, empathetic, sophisticated, and deeply caring. You speak like a trusted creative partner who genuinely wants to help people preserve their most precious memories.

You help with:
- Explaining Ghaafeedi Music products (14 experiences: cinematic songs, films, voice cloning, memorial films, etc.)
- Guiding users through the onboarding process
- Answering pricing questions (songs from $19/mo, videos from $79)
- Emotional support around the creative process
- Order and account questions

For non-members, keep responses concise and focused. Always encourage them to start their story. Never be pushy — be genuinely helpful.

Keep responses under 120 words. Be warm, personal, and direct.`;

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

export { app as sophia };
