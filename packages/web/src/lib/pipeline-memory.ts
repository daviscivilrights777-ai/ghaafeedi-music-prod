/**
 * Pipeline Memory Layer — Production Pattern Learning
 *
 * The orchestration engine learns what works per product type.
 * After each successful job, it stores what provider + config produced good output.
 * Before each job, it recalls patterns to influence provider selection.
 *
 * Agent namespace: pipeline_{productType}
 * Memory type:     procedural (what was done + outcome)
 * Subject:         productType (not userId — patterns are global, not per-user)
 *
 * Fallback: if engram unreachable, returns empty string — engine runs normally.
 */

import { EngramClient, type EngramMemory } from "./engram-client";

const PIPELINE_SUBJECT = "global_pipeline"; // shared pool, not per-user

const AGENT = (productType: string) => `pipeline_${productType}`;

// ─── Recall patterns before dispatch ─────────────────────────────────────────

/**
 * Recall production patterns relevant to this job dispatch.
 * Returns a formatted string for logging/prompt context, or "" if none.
 */
export async function recallProductionPatterns(
  productType: string,
  jobType: string,
): Promise<string> {
  const memories = await EngramClient.recall({
    agentId:       AGENT(productType),
    subjectId:     PIPELINE_SUBJECT,
    query:         `${productType} ${jobType} provider outcome quality success`,
    memoryType:    "procedural",
    limit:         5,
    minImportance: 0.5,
  });

  if (memories.length === 0) return "";

  const lines = memories.map((m) => `• ${m.content}`).join("\n");
  return `\nPipeline memory patterns for ${productType}:\n${lines}`;
}

// ─── Persist job outcome ──────────────────────────────────────────────────────

export interface JobOutcome {
  jobId:           string;
  productType:     string;
  jobType:         string;
  provider:        string;
  tier:            string;
  success:         boolean;
  durationSeconds: number;
  actualCostCents: number;
  errorMessage?:   string;
  qualityScore?:   number; // 0.0–1.0 if QC ran
  outputMeta?:     Record<string, unknown>;
}

/**
 * Store job outcome as a procedural memory for the pipeline agent.
 * Called after every job completion (success or failure).
 * Fire-and-forget — non-blocking.
 */
export async function persistJobOutcome(outcome: JobOutcome): Promise<void> {
  try {
    const result = outcome.success ? "✅ SUCCESS" : "❌ FAILED";
    const quality = outcome.qualityScore !== undefined
      ? ` | QC score: ${(outcome.qualityScore * 100).toFixed(0)}%`
      : "";

    const content =
      `${result} | ${outcome.jobType} on ${outcome.provider} (${outcome.tier} tier) | ` +
      `duration: ${outcome.durationSeconds}s | cost: ${outcome.actualCostCents}¢${quality}` +
      (outcome.errorMessage ? ` | error: ${outcome.errorMessage.slice(0, 80)}` : "");

    // Importance: successful jobs with good QC → high; failures → lower but still notable
    const importance = outcome.success
      ? 0.6 + (outcome.qualityScore ?? 0.5) * 0.3  // 0.75 avg for successful
      : 0.5;

    await EngramClient.store({
      agentId:    AGENT(outcome.productType),
      subjectId:  PIPELINE_SUBJECT,
      content,
      memoryType: "procedural",
      importance,
      tags:       [outcome.jobType, outcome.provider, outcome.tier, outcome.success ? "success" : "failure"],
      ttlDays:    90, // pipeline patterns are rolling — expire after 90 days
      metadata:   {
        jobId:           outcome.jobId,
        durationSeconds: outcome.durationSeconds,
        actualCostCents: outcome.actualCostCents,
        qualityScore:    outcome.qualityScore,
        errorMessage:    outcome.errorMessage,
      },
    });
  } catch (err) {
    // Totally non-critical — pipeline runs fine without memory
    console.warn("[PipelineMemory] persistJobOutcome error:", (err as Error).message);
  }
}
