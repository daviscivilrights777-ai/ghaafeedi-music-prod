/**
 * Pipeline Memory Layer — Production Pattern Learning
 *
 * Agent namespace: pipeline_{productType}
 * Stores job outcomes so the engine learns what provider+config works per product type.
 * Fallback: if engram unreachable, engine runs normally.
 */

import { EngramClient } from "./engram-client";

const AGENT = (productType: string) => `pipeline_${productType}`;

// ─── Recall patterns before dispatch ─────────────────────────────────────────

export async function recallProductionPatterns(
  productType: string,
  jobType: string,
): Promise<string> {
  const results = await EngramClient.search(
    AGENT(productType),
    `${productType} ${jobType} provider outcome quality success`,
    5,
  );
  if (results.length === 0) return "";
  const lines = results.map((m) => `• ${m.content_preview}`).join("\n");
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
  qualityScore?:   number;
  outputMeta?:     Record<string, unknown>;
}

export async function persistJobOutcome(outcome: JobOutcome): Promise<void> {
  try {
    const result = outcome.success ? "SUCCESS" : "FAILED";
    const quality = outcome.qualityScore !== undefined
      ? ` | QC: ${(outcome.qualityScore * 100).toFixed(0)}%`
      : "";

    const text =
      `${result} | ${outcome.jobType} on ${outcome.provider} (${outcome.tier}) | ` +
      `${outcome.durationSeconds}s | ${outcome.actualCostCents}¢${quality}` +
      (outcome.errorMessage ? ` | error: ${outcome.errorMessage.slice(0, 80)}` : "");

    await EngramClient.store(
      AGENT(outcome.productType),
      text,
      {
        jobId:           outcome.jobId,
        jobType:         outcome.jobType,
        provider:        outcome.provider,
        tier:            outcome.tier,
        success:         outcome.success,
        durationSeconds: outcome.durationSeconds,
        actualCostCents: outcome.actualCostCents,
        qualityScore:    outcome.qualityScore,
        type:            "job_outcome",
      },
    );
  } catch (err) {
    console.warn("[PipelineMemory] persistJobOutcome error:", (err as Error).message);
  }
}
