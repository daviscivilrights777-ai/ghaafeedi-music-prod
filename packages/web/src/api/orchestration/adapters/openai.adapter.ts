// ============================================================
// Ghaafeedi Music — OpenAI Adapter
// Story analysis, lyrics gen, storyboard, Sophia AI, recommendations.
// ============================================================
import type { ProviderAdapter, CostEstimate, JobHandle, ProviderJobResult, ProviderHealth } from "./provider-adapter";
import type { JobSpec } from "../job-queue";
import { getSecret, SECRET_KEYS } from "../secrets";

const BASE = "https://api.openai.com/v1";

// Token cost estimates per job type (cents)
const COST_MAP: Record<string, number> = {
  analysis:   2,   // ~$0.02
  lyrics:     3,   // ~$0.03
  storyboard: 5,   // ~$0.05
  image:      4,   // ~$0.04 per DALL-E image
  narration:  1,   // ~$0.01 TTS
};

export const OpenAIAdapter: ProviderAdapter = {
  name:        "openai",
  displayName: "OpenAI GPT-4o",
  jobTypes:    ["analysis", "lyrics", "storyboard", "image", "narration"],

  async estimateCost(job: JobSpec): Promise<CostEstimate> {
    const cost = COST_MAP[job.jobType] || 3;
    return {
      minCents:      cost,
      maxCents:      cost * 3,
      estimateCents: cost,
      unit:          "per_request",
      breakdown:     `1 ${job.jobType} call ≈ $${(cost / 100).toFixed(2)} (token estimate)`,
    };
  },

  async dispatch(job: JobSpec): Promise<JobHandle> {
    const apiKey = await getSecret(SECRET_KEYS.OPENAI_API_KEY);

    let result: unknown;

    if (job.jobType === "image") {
      const res = await fetch(`${BASE}/images/generations`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model:   "gpt-image-1",
          prompt:  job.inputPayload?.prompt || "",
          n:       1,
          size:    job.inputPayload?.size || "1024x1024",
        }),
      });
      if (!res.ok) throw new Error(`[OpenAI] Image gen failed: ${res.status}`);
      const data = await res.json();
      result = data;
    } else {
      // Chat completion for analysis / lyrics / storyboard
      const systemPrompt = (job.inputPayload?.systemPrompt as string)
        || "You are a cinematic AI storyteller for Ghaafeedi Music. Help create deeply personal and emotional content.";
      const userPrompt   = (job.inputPayload?.userPrompt as string)
        || (job.inputPayload?.prompt as string) || "";

      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model:       "gpt-4o",
          messages:    [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt },
          ],
          temperature: (job.inputPayload?.temperature as number) || 0.7,
          max_tokens:  (job.inputPayload?.maxTokens as number)  || 2000,
        }),
      });
      if (!res.ok) throw new Error(`[OpenAI] Chat failed: ${res.status}`);
      result = await res.json();

      // Log to Braintrust for fine-tuning dataset collection
      try {
        const { logAICall } = await import("../../../api/lib/braintrust");
        const outputText = result?.choices?.[0]?.message?.content ?? "";
        logAICall({
          name: `orchestration-${job.jobType}`,
          model: "gpt-4o",
          prompt: userPrompt,
          output: outputText,
          metadata: {
            jobId: job.id,
            jobType: job.jobType,
            userId: job.userId,
            tier: job.tier,
          },
        });
      } catch { /* never block job on logging */ }
    }

    // OpenAI is synchronous — embed result in handle
    return {
      externalJobId: `openai_${Date.now()}`,
      provider:      this.name,
      dispatchedAt:  new Date(),
      webhookUrl:    JSON.stringify(result), // embed result
    };
  },

  async getStatus(handle: JobHandle): Promise<ProviderJobResult> {
    // Always synchronous — result is embedded in handle.webhookUrl
    if (handle.webhookUrl) {
      try {
        const data = JSON.parse(handle.webhookUrl);
        // Chat completion
        if (data.choices?.[0]?.message?.content) {
          return {
            status:    "complete",
            outputUrl: undefined,
            metadata:  { content: data.choices[0].message.content },
            costCents: Math.round(((data.usage?.total_tokens || 0) / 1000) * 0.15 * 100),
          };
        }
        // Image generation
        if (data.data?.[0]?.url) {
          return { status: "complete", outputUrl: data.data[0].url };
        }
      } catch {}
    }
    return { status: "failed", errorMessage: "OpenAI result parsing failed" };
  },

  async cancelJob(_handle: JobHandle): Promise<void> {
    // OpenAI is synchronous — no cancellation
  },

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const apiKey = await getSecret(SECRET_KEYS.OPENAI_API_KEY);
      const res = await fetch(`${BASE}/models`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
        signal:  AbortSignal.timeout(5_000),
      });
      return { healthy: res.ok, latencyMs: Date.now() - start, checkedAt: new Date() };
    } catch (e: any) {
      return { healthy: false, message: e.message, checkedAt: new Date() };
    }
  },
};
