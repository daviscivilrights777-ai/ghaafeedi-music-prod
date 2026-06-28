/**
 * Sophia AI Memory Layer
 *
 * Recall:  on every chat session start — inject relevant memories into system prompt
 * Persist: at session end (or after N messages) — GPT-4o-mini extracts key facts
 *
 * Agent namespace: sophia_{userId}
 * Fallback: if engram unreachable, returns empty string — no regression.
 */

import { EngramClient } from "./engram-client";

const AGENT = (userId: string) => `sophia_${userId}`;

// ─── Recall on session start ──────────────────────────────────────────────────

export async function recallSophiaMemories(
  userId: string,
  currentMessage: string,
): Promise<string> {
  const results = await EngramClient.search(AGENT(userId), currentMessage, 8);
  if (results.length === 0) return "";

  const lines = results.map((m) => `💡 ${m.content_preview}`);
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

export async function extractMemoriesFromSession(
  userId: string,
  session: SessionMessage[],
  openaiApiKey: string,
): Promise<ExtractedMemory[]> {
  if (session.length < 2) return [];

  const transcript = session
    .slice(-12)
    .map((m) => `${m.role === "user" ? "Customer" : "Sophia"}: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are a memory extraction agent for Sophia, the AI Emotional Concierge for Ghaafeedi Music.

Extract 2–5 durable, reusable facts from this conversation that Sophia should remember for ALL future sessions with this customer.

Rules:
- ONLY extract facts that will still be useful in 30 days
- SKIP filler, greetings, one-off questions
- Include: customer preferences, emotional themes, life events mentioned, products they're interested in, feedback on their production
- Each memory must be 1 concise sentence (max 80 words)
- Assign memoryType: "semantic" (stable facts), "episodic" (what happened), "procedural" (what was tried)
- importance 0.0–1.0

Output ONLY valid JSON: {"memories": [{"content":"...","memoryType":"semantic","importance":0.8,"tags":["tag1"]}]}
If nothing worth remembering, return {"memories": []}.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: `Session transcript:\n${transcript}\n\nExtract memories now.` },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    return (parsed.memories ?? []) as ExtractedMemory[];
  } catch (err) {
    console.warn("[SophiaMemory] extractMemoriesFromSession failed:", (err as Error).message);
    return [];
  }
}

// ─── Persist session to engram ────────────────────────────────────────────────

export async function persistSessionMemory(
  userId: string,
  session: SessionMessage[],
  openaiApiKey: string,
): Promise<number> {
  try {
    const extracted = await extractMemoriesFromSession(userId, session, openaiApiKey);
    if (extracted.length === 0) return 0;

    let stored = 0;
    for (const m of extracted) {
      const res = await EngramClient.store(
        AGENT(userId),
        m.content,
        { memoryType: m.memoryType, importance: m.importance, tags: m.tags },
      );
      if (res?.success) stored++;
    }

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
  await EngramClient.store(
    AGENT(userId),
    content,
    { memoryType, importance, tags },
  ).catch(() => {});
}
