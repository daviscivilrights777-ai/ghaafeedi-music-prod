// ============================================================
// Ghaafeedi Music — OpenAI Adapter
// Primary: Poyo.ai (DeepSeek V3 for pipeline, Claude Opus 4.8 for Sophia)
// Fallback: OpenAI GPT-4o / GPT-4o-mini
// ============================================================
import type { ProviderAdapter, CostEstimate, JobHandle, ProviderJobResult, ProviderHealth } from "./provider-adapter";
import type { JobSpec } from "../job-queue";
import { getSecret, SECRET_KEYS } from "../secrets";
import { poyoChat, POYO_LLM } from "./poyo.adapter";

const BASE = "https://api.openai.com/v1";

// Token cost estimates per job type (cents)
const COST_MAP: Record<string, number> = {
  analysis:         2,   // ~$0.02
  lyrics:           3,   // ~$0.03
  storyboard:       5,   // ~$0.05
  image:            4,   // ~$0.04 per DALL-E image
  narration:        1,   // ~$0.01 TTS
  story_bible:      3,   // ~$0.03 GPT-4o-mini extraction
  production_bible: 10,  // ~$0.10 GPT-4o creative brief
  shot_list:        8,   // ~$0.08 GPT-4o shot breakdown
  qc_check:         5,   // ~$0.05 vision check
  deliver:          1,   // internal, no OpenAI cost
};

export const OpenAIAdapter: ProviderAdapter = {
  name:        "openai",
  displayName: "OpenAI GPT-4o",
  jobTypes:    ["analysis", "lyrics", "storyboard", "image", "narration",
                "story_bible", "production_bible", "shot_list", "qc_check", "deliver"],

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

    // ── Pipeline stage job types ─────────────────────────────────────────────
    if (job.jobType === "story_bible") {
      const storyText   = (job.inputPayload?.storyText as string) || (job.inputPayload?.text as string) || "";
      const productSlug = (job.inputPayload?.productSlug as string) || "";
      const tier        = (job.inputPayload?.productionTier as string) || "starter";

      const sysMsg = `You are a master narrative architect for Ghaafeedi Music, a luxury cinematic storytelling platform. Extract a deeply emotional narrative structure from the customer's personal story. Respond with a JSON object matching the StoryBible schema exactly.`;
      const usrMsg = `Extract the story bible from this personal story for product "${productSlug}" (tier: ${tier}):\n\n${storyText}\n\nReturn JSON with: version="1.0", title, logline, emotionalArc{opening,inciting,climax,resolution}, characters[], thematicPillars[], primaryEmotion, emotionScores{joy,sadness,love,nostalgia,hope}, tone, pacing, colorPalette[], musicalMood, keyPhrases[], suggestedTitle. Make it cinematic and emotionally resonant.`;

      try {
        const content = await poyoChat({ model: POYO_LLM.pipeline, messages: [{ role: "system", content: sysMsg }, { role: "user", content: usrMsg }], temperature: 0.7, max_tokens: 1500 });
        result = { choices: [{ message: { content } }], _provider: "poyo/deepseek-v3" };
      } catch (poyoErr) {
        console.warn("[story_bible] Poyo failed, falling back to GPT-4o-mini:", (poyoErr as Error).message);
        const res = await fetch(`${BASE}/chat/completions`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: sysMsg }, { role: "user", content: usrMsg }], temperature: 0.7, max_tokens: 1500, response_format: { type: "json_object" } }),
        });
        if (!res.ok) throw new Error(`[OpenAI story_bible] Failed: ${res.status} ${await res.text()}`);
        result = await res.json();
      }
    } else if (job.jobType === "production_bible") {
      // Primary: Poyo Claude Opus 4.8 — creative director quality
      // Fallback: GPT-4o
      const storyBible  = job.inputPayload?.storyBible as Record<string, unknown>;
      const productSlug = (job.inputPayload?.productSlug as string) || "";
      const tier        = (job.inputPayload?.productionTier as string) || "starter";
      const maxScenes   = tier === "elite" ? 6 : tier === "premium" ? 3 : 1;
      const pbUserMsg   = `You are a cinematic director and music supervisor for Ghaafeedi Music. Create a detailed production bible from this story bible for product "${productSlug}" (tier: ${tier}). Story Bible: ${JSON.stringify(storyBible)}. Return JSON matching ProductionBible schema with: version="1.0", audio{genre,tempo,mood,instruments,lyrics,vocalStyle,duration,sunoPrompt}, narration{script,voice,style,pacing,emotionalBeat,durationTarget}, visual{cinematicStyle,colorGrading,aspectRatio:"16:9",resolution:"1280x720",renderQuality:"premium",transitionStyle}, scenes[] (max ${maxScenes} scenes), deliveryFormat, watermark:false, deliveryDeadlineHours.`;

      try {
        const content = await poyoChat({ model: POYO_LLM.sophia, messages: [{ role: "user", content: pbUserMsg }], temperature: 0.8, max_tokens: 2500 });
        result = { choices: [{ message: { content } }], _provider: "poyo/claude-opus-4-8" };
      } catch (poyoErr) {
        console.warn("[production_bible] Poyo failed, falling back to GPT-4o:", (poyoErr as Error).message);
        const res = await fetch(`${BASE}/chat/completions`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model:    "gpt-4o",
            messages: [
              { role: "system", content: "You are a cinematic director and music supervisor for Ghaafeedi Music. Create detailed production bibles." },
              { role: "user",   content: pbUserMsg },
            ],
            temperature: 0.8,
            max_tokens:  2500,
            response_format: { type: "json_object" },
          }),
        });
        if (!res.ok) throw new Error(`[OpenAI production_bible] Failed: ${res.status}`);
        result = await res.json();
      }
    } else if (job.jobType === "shot_list") {
      const productionBible = job.inputPayload?.productionBible as Record<string, unknown>;
      const tier            = (job.inputPayload?.productionTier as string) || "starter";
      const maxShots        = tier === "elite" ? 6 : tier === "premium" ? 3 : 1;

      const slSysMsg = "You are a cinematographer creating precise shot lists for Ghaafeedi Music emotional productions. Each shot drives an AI video generation job.";
      const slUsrMsg = `Create a shot list from this production bible. Max ${maxShots} shots for tier "${tier}". Production Bible: ${JSON.stringify(productionBible)}. Return JSON matching ShotList schema: version="1.0", totalShots (≤${maxShots}), shots[]{shotIndex,sceneIndex,type,durationSeconds(3-7),cameraMotion,subject,setting,lighting,colorGrading,falPrompt(detailed for Seedance 2),negativePrompt,audioStartSeconds,audioEndSeconds,hasNarration}, assemblyOrder[], crossfadeDurationMs:500, creditsDurationSeconds:3.`;

      try {
        const content = await poyoChat({ model: POYO_LLM.pipeline, messages: [{ role: "system", content: slSysMsg }, { role: "user", content: slUsrMsg }], temperature: 0.7, max_tokens: 2000 });
        result = { choices: [{ message: { content } }], _provider: "poyo/deepseek-v3" };
      } catch (poyoErr) {
        console.warn("[shot_list] Poyo failed, falling back to GPT-4o:", (poyoErr as Error).message);
        const res = await fetch(`${BASE}/chat/completions`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: slSysMsg }, { role: "user", content: slUsrMsg }], temperature: 0.7, max_tokens: 2000, response_format: { type: "json_object" } }),
        });
        if (!res.ok) throw new Error(`[OpenAI shot_list] Failed: ${res.status}`);
        result = await res.json();
      }
    } else if (job.jobType === "qc_check") {
      // Vision-based quality check on assembled video (Phase 9)
      // Primary: Poyo DeepSeek V3 (text-only QC); fallback: GPT-4o (vision QC if thumbnail available)
      const videoUrl     = (job.inputPayload?.videoUrl as string) || "";
      const thumbnailUrl = (job.inputPayload?.thumbnailUrl as string) || videoUrl;
      const criteria     = (job.inputPayload?.criteria as string) || "visual quality, emotional resonance, technical correctness";

      try {
        const qcContent = await poyoChat({
          model: POYO_LLM.pipeline,
          messages: [
            { role: "system", content: "You are a quality control specialist for Ghaafeedi Music. Return JSON only: {passed:bool, score:number(0-1), issues:string[], recommendation:string}." },
            { role: "user",   content: `QC check for Ghaafeedi Music production. URL: ${videoUrl}. Criteria: ${criteria}. Return passed=true if score >= 0.7.` },
          ],
          temperature: 0.3,
          max_tokens:  500,
        });
        result = { choices: [{ message: { content: qcContent } }], _provider: "poyo/deepseek-v3" };
      } catch (qcErr) {
        console.warn("[qc_check] Poyo failed, falling back to GPT-4o:", (qcErr as Error).message);
        const messages: unknown[] = thumbnailUrl ? [
          { role: "system", content: "You are a quality control specialist for Ghaafeedi Music. Rate the video quality and emotional impact. Respond with JSON: {passed:bool, score:number(0-1), issues:string[], recommendation:string}." },
          { role: "user",   content: [
            { type: "text",      text: `Rate this production for Ghaafeedi Music. Criteria: ${criteria}. The video must be cinematic, emotionally resonant, and technically correct.` },
            { type: "image_url", image_url: { url: thumbnailUrl, detail: "low" } },
          ]},
        ] : [
          { role: "system", content: "Rate video quality and return JSON: {passed:bool, score:number(0-1), issues:string[], recommendation:string}." },
          { role: "user",   content: `QC check for video: ${videoUrl}. Return passed=true if score >= 0.7.` },
        ];
        const res = await fetch(`${BASE}/chat/completions`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: thumbnailUrl ? "gpt-4o" : "gpt-4o-mini", messages, temperature: 0.3, max_tokens: 500, response_format: { type: "json_object" } }),
        });
        if (!res.ok) throw new Error(`[OpenAI qc_check] Failed: ${res.status}`);
        result = await res.json();
      }
    } else if (job.jobType === "deliver") {
      // Deliver stage is handled directly by OrchestrationEngine (R2 upload + signed URL)
      // This is a no-op in the adapter — just signal success
      result = { choices: [{ message: { content: JSON.stringify({ delivered: true, timestamp: new Date().toISOString() }) } }] };
    } else if (job.jobType === "image") {
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
      // Primary: Poyo DeepSeek V3 — fallback: GPT-4o
      const systemPrompt = (job.inputPayload?.systemPrompt as string)
        || "You are a cinematic AI storyteller for Ghaafeedi Music. Help create deeply personal and emotional content.";
      const userPrompt   = (job.inputPayload?.userPrompt as string)
        || (job.inputPayload?.prompt as string) || "";
      const temperature  = (job.inputPayload?.temperature as number) || 0.7;
      const maxTokens    = (job.inputPayload?.maxTokens as number)  || 2000;

      let outputText: string;
      try {
        outputText = await poyoChat({ model: POYO_LLM.pipeline, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature, max_tokens: maxTokens });
        result = { choices: [{ message: { content: outputText } }], _provider: "poyo/deepseek-v3" };
      } catch (poyoErr) {
        console.warn(`[${job.jobType}] Poyo failed, falling back to GPT-4o:`, (poyoErr as Error).message);
        const res = await fetch(`${BASE}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature, max_tokens: maxTokens }),
        });
        if (!res.ok) throw new Error(`[OpenAI] Chat failed: ${res.status}`);
        result = await res.json();
        outputText = (result as any)?.choices?.[0]?.message?.content ?? "";
      }

      // Log to Braintrust for fine-tuning dataset collection
      try {
        const { logAICall } = await import("../../../api/lib/braintrust");
        logAICall({
          name: `orchestration-${job.jobType}`,
          model: POYO_LLM.pipeline,
          prompt: userPrompt,
          output: outputText!,
          metadata: { jobId: job.jobId, jobType: job.jobType, userId: job.userId, tier: job.tier },
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
