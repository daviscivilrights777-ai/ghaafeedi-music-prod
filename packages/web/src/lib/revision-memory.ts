/**
 * Revision Memory Layer
 *
 * Sophia remembers what revision approaches worked per customer.
 * Agent namespace: revision_{userId}
 * Fallback: if engram unreachable, buildCustomerContext() DB pull covers it.
 */

import { EngramClient } from "./engram-client";

const AGENT = (userId: string) => `revision_${userId}`;

// ─── Recall revision preferences ─────────────────────────────────────────────

export async function recallRevisionPreferences(
  userId: string,
  productSlug: string,
): Promise<string> {
  const results = await EngramClient.search(
    AGENT(userId),
    `revision ${productSlug} feedback preference directive outcome`,
    6,
  );
  if (results.length === 0) return "";

  const lines = results.map((m) => `  • ${m.content_preview}`);
  return `\n\n═══ SOPHIA REVISION MEMORY ═══\n${lines.join("\n")}\nUse these to avoid repeating failed approaches.\n═══════════════════════════════`;
}

// ─── Persist revision outcome ─────────────────────────────────────────────────

export interface RevisionOutcome {
  userId:         string;
  orderId:        string;
  productSlug:    string;
  revisionRound:  number;
  customerNotes:  string;
  directiveUsed:  string;
  falPromptUsed:  string;
  moodAdjustment: string;
  approved:       boolean;
  emotionalDiag?: string;
}

export async function persistRevisionOutcome(outcome: RevisionOutcome): Promise<void> {
  try {
    const episodic =
      `Round ${outcome.revisionRound} revision for ${outcome.productSlug}: ` +
      `Customer said: "${outcome.customerNotes.slice(0, 120)}". ` +
      `Sophia used: "${outcome.directiveUsed.slice(0, 120)}". ` +
      `Mood: ${outcome.moodAdjustment}. ` +
      (outcome.approved ? "Approved and dispatched." : "Pending admin review.");

    const semantic = outcome.emotionalDiag
      ? `For ${outcome.productSlug}: emotional gap was "${outcome.emotionalDiag.slice(0, 100)}"`
      : `Customer requested ${outcome.productSlug} revision round ${outcome.revisionRound}`;

    await EngramClient.store(
      AGENT(outcome.userId),
      episodic,
      { orderId: outcome.orderId, revisionRound: outcome.revisionRound, approved: outcome.approved, type: "revision_episodic" },
    );

    await EngramClient.store(
      AGENT(outcome.userId),
      semantic,
      { productSlug: outcome.productSlug, revisionRound: outcome.revisionRound, type: "revision_semantic" },
    );

    console.log(`[RevisionMemory] Stored revision memory user=${outcome.userId} round=${outcome.revisionRound}`);
  } catch (err) {
    console.warn("[RevisionMemory] persistRevisionOutcome error:", (err as Error).message);
  }
}
