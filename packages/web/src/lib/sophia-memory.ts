/**
 * Sophia AI Memory Layer
 *
 * Recall:  on every chat session start — inject relevant memories into system prompt
 * Persist: at session end (or after N messages) — GPT-4o-mini extracts key facts
 *
 * Agent namespace: sophia_{userId}
 * Memory types:
 *   - episodic   → what happened in past sessions (events, decisions)
 *   - semantic   → facts about the customer (name, story theme, preferences)
 *   - procedural → what Sophia has already tried / suggested
 *
 * Fallback: if engram unreachable, returns empty string — no regression.
 */

import { EngramClient, type EngramMemory } from "./engram-client";

const AGENT = (userId: string) => `sophia_${userId}`;

// ─── Recall on session start ──────────────────────────────────────────────────

/**
 * Returns a formatted memory block to inject into Sophia's system prompt.
 * Empty string if no memories or engram unreachable.
 */
export async function recallSophiaMemories(
  userId: string,
  currentMessage: string,
): Promise<string> {
  const memories = await EngramClient.recall({
    agentId:      AGENT(userId),
    subjectId:    userId,
    query:        currentMessage,
    limit:        8,
    minImportance: 0.4,
  });

  if (memories.length === 0) return "";

  const lines = memories.map((m) => {
    const tag = m.memoryType === "episodic"   ? "📖 Past session"
              : m.memoryType === "procedural" ? "🔧 Already tried"
              : "💡 Known fact";
    return `${tag}: ${m.content}`;
  });

  return `\n\n═══ SOPHIA'S PERSISTENT MEMORY (recall for this customer) ═══\n${lines.join("\n")}\nUse these memories to make your response deeply personal. Do NOT reference them mechanically — weave them naturally into your reply.\n═══════════════════════════════════════════════════════════`;
}

// ─── Extract memories from a session ─────────────────────────────────────────

export interface SessionMessage {
  role:    "user" | "assistant";
  content: string;
}

export interface ExtractedMemory {
  content:    string;
  memoryType: "semantic" | "episodic" | "procedural";
  importance: number;
  tags:       string[];
}

/**
 * Call GPT-4o-mini (cheap, fast) to extract durable memories from a session.
 * Called at session end or after every 6th message.
 *
 * Returns structured memories ready to store in engram.
 */
export async function extractMemoriesFromSession(
  userId: string,
  session: SessionMessage[],
  openaiApiKey: string,
): Promise<ExtractedMemory[]> {
  if (session.length < 2) return [];

  const transcript = session
    .slice(-12) // last 12 messages max
    .map((m) => `${m.role === "user" ? "Customer" : "Sophia"}: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are a memory extraction agent for Sophia, the AI Emotional Concierge for Ghaafeedi Music.

Extract 2–5 durable, reusable facts from this conversation that Sophia should remember for ALL future sessions with this customer. 

Rules:
- ONLY extract facts that will still be useful in 30 days
- SKIP filler, greetings, one-off questions
- Include: customer preferences, emotional themes, life events mentioned, products they're interested in, feedback on their production, communication style
- Each memory must be 1 concise sentence (max 80 words)
- Assign memoryType: "semantic" (stable facts), "episodic" (what happened), "procedural" (what was tried/suggested)
- importance 0.0–1.0 (0.9 = very important, 0.5 = moderate, 0.3 = low)
- tags: 1–4 relevant keywords

Output ONLY valid JSON array:
[
  {
    "content": "...",
    "memoryType": "semantic|episodic|procedural",
    "importance": 0.0,
    "tags": ["tag1", "tag2"]
  }
]

If nothing worth remembering, return [].`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model:           "gpt-4o-mini",
        temperature:     0.3,
        max_tokens:      600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: `Session transcript:\n${transcript}\n\nExtract memories now. Output JSON array wrapped in {"memories": [...]}` },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return [];
    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    // handle both {"memories":[...]} and [...] formats
    const arr = Array.isArray(parsed) ? parsed : (parsed.memories ?? []);
    return arr as ExtractedMemory[];
  } catch (err) {
    console.warn("[SophiaMemory] extractMemoriesFromSession failed:", (err as Error).message);
    return [];
  }
}

// ─── Persist session to engram ────────────────────────────────────────────────

/**
 * Full persist pipeline:
 * 1. Extract memories via GPT-4o-mini
 * 2. Batch store to engram
 *
 * Fire-and-forget safe — returns count stored or 0.
 */
export async function persistSessionMemory(
  userId: string,
  session: SessionMessage[],
  openaiApiKey: string,
): Promise<number> {
  try {
    const extracted = await extractMemoriesFromSession(userId, session, openaiApiKey);
    if (extracted.length === 0) return 0;

    const stored = await EngramClient.storeBatch(
      extracted.map((m) => ({
        agentId:    AGENT(userId),
        subjectId:  userId,
        content:    m.content,
        memoryType: m.memoryType,
        importance: m.importance,
        tags:       m.tags,
        ttlDays:    365, // memories expire after 1 year unless refreshed
      })),
    );

    console.log(`[SophiaMemory] Stored ${stored}/${extracted.length} memories for user=${userId}`);
    return stored;
  } catch (err) {
    console.warn("[SophiaMemory] persistSessionMemory error:", (err as Error).message);
    return 0;
  }
}

// ─── Store a single notable fact mid-session ──────────────────────────────────

export async function storeSophiaFact(
  userId: string,
  content: string,
  memoryType: "semantic" | "episodic" | "procedural" = "semantic",
  importance = 0.7,
  tags: string[] = [],
): Promise<void> {
  await EngramClient.store({
    agentId: AGENT(userId),
    subjectId: userId,
    content,
    memoryType,
    importance,
    tags,
    ttlDays: 365,
  });
}
