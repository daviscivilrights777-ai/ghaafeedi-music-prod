/**
 * Revision Memory Layer
 *
 * Sophia remembers what revision approaches worked per customer.
 * This prevents her from repeating the same directive on round 2+
 * and helps her escalate her creative response intelligently.
 *
 * Agent namespace: revision_{userId}
 * Memory types:
 *   - episodic  → what revision was requested, what directive was generated
 *   - semantic  → customer's revision style (picky about X, happy with Y)
 *
 * Fallback: if engram unreachable, buildCustomerContext() DB pull covers it.
 */

import { EngramClient, type EngramMemory } from "./engram-client";

const AGENT = (userId: string) => `revision_${userId}`;

// ─── Recall revision preferences ─────────────────────────────────────────────

/**
 * Returns injected memory context string for the sophia-analysis system prompt.
 * Empty string if no memories or engram unreachable.
 */
export async function recallRevisionPreferences(
  userId: string,
  productSlug: string,
): Promise<string> {
  const memories = await EngramClient.recall({
    agentId:       AGENT(userId),
    subjectId:     userId,
    query:         `revision ${productSlug} feedback preference directive outcome`,
    limit:         6,
    minImportance: 0.4,
  });

  if (memories.length === 0) return "";

  const episodic   = memories.filter((m) => m.memoryType === "episodic");
  const semantic   = memories.filter((m) => m.memoryType === "semantic");

  const lines: string[] = [];

  if (episodic.length > 0) {
    lines.push("Prior revision outcomes:");
    episodic.forEach((m) => lines.push(`  • ${m.content}`));
  }
  if (semantic.length > 0) {
    lines.push("Customer revision style / preferences:");
    semantic.forEach((m) => lines.push(`  • ${m.content}`));
  }

  return lines.length > 0
    ? `\n\n═══ SOPHIA REVISION MEMORY ═══\n${lines.join("\n")}\nUse these to avoid repeating failed approaches and build on what worked.\n═══════════════════════════════`
    : "";
}

// ─── Persist revision outcome ─────────────────────────────────────────────────

export interface RevisionOutcome {
  userId:          string;
  orderId:         string;
  productSlug:     string;
  revisionRound:   number;
  customerNotes:   string;       // what the customer said was wrong
  directiveUsed:   string;       // the sophia_director_note that was generated
  falPromptUsed:   string;       // the revised_falPrompt
  moodAdjustment:  string;
  approved:        boolean;      // did admin approve and dispatch?
  emotionalDiag?:  string;       // sophia's emotional_diagnosis
}

/**
 * Persist revision event as memories. Two memories stored:
 * 1. Episodic: what happened (what they asked for, what Sophia tried)
 * 2. Semantic:  preference extracted from customer notes
 *
 * Fire-and-forget.
 */
export async function persistRevisionOutcome(outcome: RevisionOutcome): Promise<void> {
  try {
    const episodicContent =
      `Round ${outcome.revisionRound} revision for ${outcome.productSlug}: ` +
      `Customer said: "${outcome.customerNotes.slice(0, 120)}". ` +
      `Sophia used directive: "${outcome.directiveUsed.slice(0, 120)}". ` +
      `Mood adjustment: ${outcome.moodAdjustment}. ` +
      (outcome.approved ? "Approved and dispatched." : "Pending admin review.");

    const semanticContent = outcome.emotionalDiag
      ? `For ${outcome.productSlug}: emotional gap was "${outcome.emotionalDiag.slice(0, 100)}"`
      : `Customer requested ${outcome.productSlug} revision round ${outcome.revisionRound}`;

    await EngramClient.storeBatch([
      {
        agentId:    AGENT(outcome.userId),
        subjectId:  outcome.userId,
        content:    episodicContent,
        memoryType: "episodic",
        importance: 0.8,
        tags:       ["revision", outcome.productSlug, `round_${outcome.revisionRound}`, outcome.approved ? "approved" : "pending"],
        ttlDays:    180,
        metadata:   {
          orderId:       outcome.orderId,
          revisionRound: outcome.revisionRound,
          falPromptSlug: outcome.falPromptUsed.slice(0, 60),
        },
      },
      {
        agentId:    AGENT(outcome.userId),
        subjectId:  outcome.userId,
        content:    semanticContent,
        memoryType: "semantic",
        importance: 0.6,
        tags:       ["preference", outcome.productSlug, "revision-style"],
        ttlDays:    365,
      },
    ]);

    console.log(`[RevisionMemory] Stored revision memory for user=${outcome.userId} round=${outcome.revisionRound}`);
  } catch (err) {
    console.warn("[RevisionMemory] persistRevisionOutcome error:", (err as Error).message);
  }
}
