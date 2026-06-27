// ============================================================
// Ghaafeedi Music — Generic Character Creator Routes
// POST /api/characters/generate-synthetic
//   → Build a cinematic portrait prompt from questionnaire
//   → Call FAL.ai flux/schnell to generate synthetic character
//   → Return { characterId, imageUrl, prompt }
//
// GET  /api/characters/:characterId
//   → Fetch a previously generated synthetic character
// ============================================================
import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { getSecret, SECRET_KEYS } from "../orchestration/secrets";

export const characters = new Hono<HonoEnv>();

// ─── Types ────────────────────────────────────────────────────────────────────
interface CharacterQuestionnaire {
  // Who is this character?
  label:      string;          // e.g. "Partner", "Friend", "Parent", "Sibling"
  gender:     string;          // "male" | "female" | "non-binary" | "prefer-not-to-say"
  ageRange:   string;          // "18-25" | "26-35" | "36-45" | "46-55" | "56-65" | "65+"
  ethnicity:  string;          // free text or option
  skinTone:   string;          // "fair" | "light" | "medium" | "olive" | "tan" | "deep"
  hairColor:  string;          // free text
  hairStyle:  string;          // "short" | "medium" | "long" | "curly" | "straight" | "wavy" | "locs" | "braids" | "bald"
  build:      string;          // "slim" | "athletic" | "average" | "plus"
  eyeColor:   string;          // "brown" | "blue" | "green" | "hazel" | "gray" | "dark"
  style:      string;          // "casual" | "business" | "streetwear" | "elegant" | "artistic" | "athletic"
  mood:       string;          // "warm" | "serious" | "playful" | "mysterious" | "confident" | "gentle"
  extraNotes: string;          // optional free text
  // Context for cinematic rendering
  productType?: string;        // e.g. "couples-journey", "relationship-healing"
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPortraitPrompt(q: CharacterQuestionnaire): string {
  const genderMap: Record<string, string> = {
    "male": "man", "female": "woman", "non-binary": "person", "prefer-not-to-say": "person"
  };
  const genderWord = genderMap[q.gender] ?? q.gender;

  const hairDesc = `${q.hairColor} ${q.hairStyle} hair`;
  const ethnicityPart = q.ethnicity ? `${q.ethnicity} ` : "";

  const styleMap: Record<string, string> = {
    "casual": "casual everyday wear",
    "business": "business professional attire",
    "streetwear": "modern streetwear",
    "elegant": "elegant formal wear",
    "artistic": "artistic bohemian style",
    "athletic": "athletic sportswear"
  };
  const outfitDesc = styleMap[q.style] ?? q.style;

  const moodMap: Record<string, string> = {
    "warm":       "warm gentle smile, approachable expression",
    "serious":    "composed thoughtful expression, dignified",
    "playful":    "playful bright smile, joyful energy",
    "mysterious": "enigmatic subtle expression, depth in the eyes",
    "confident":  "confident poised expression, strong presence",
    "gentle":     "soft gentle expression, kind warm eyes"
  };
  const expressionDesc = moodMap[q.mood] ?? q.mood;

  const buildMap: Record<string, string> = {
    "slim": "slender build", "athletic": "athletic toned build",
    "average": "average build", "plus": "full-figured build"
  };
  const buildDesc = buildMap[q.build] ?? q.build;

  const productContext = q.productType
    ? `, cinematic ${q.productType.replace(/-/g, " ")} emotional story`
    : ", cinematic emotional narrative";

  const prompt = [
    `Professional cinematic portrait of a ${ethnicityPart}${q.ageRange} year old ${genderWord},`,
    `${q.skinTone} skin tone, ${hairDesc}, ${q.eyeColor} eyes, ${buildDesc},`,
    `${expressionDesc}, wearing ${outfitDesc}.`,
    `Dramatic golden hour lighting, shallow depth of field, bokeh background,`,
    `ultra-realistic photographic quality, 85mm portrait lens look,`,
    `cinematic color grading, warm gold and navy tones,`,
    `premium luxury aesthetic${productContext}.`,
    q.extraNotes ? `Additional details: ${q.extraNotes}.` : "",
    `High-end fashion photography, 8K resolution, award-winning portrait.`
  ].filter(Boolean).join(" ");

  return prompt;
}

// ─── POST /api/characters/generate-synthetic ──────────────────────────────────
characters.post("/generate-synthetic", async (c) => {
  try {
    const body = await c.req.json() as {
      questionnaire: CharacterQuestionnaire;
      orderId?:      string;
      userId?:       string;
    };

    const { questionnaire } = body;

    if (!questionnaire?.gender || !questionnaire?.ageRange) {
      return c.json({ error: "questionnaire.gender and questionnaire.ageRange are required" }, 400);
    }

    const prompt = buildPortraitPrompt(questionnaire);
    const characterId = `synth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // ── Dispatch to FAL.ai flux/schnell ──────────────────────────────────────
    const FAL_API_KEY = await getSecret(SECRET_KEYS.FAL_API_KEY);

    let imageUrl: string | null = null;

    try {
      const submitRes = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          image_size:   "portrait_4_3",   // 768×1024
          num_images:    1,
          output_format: "jpeg",
          num_inference_steps: 4,         // schnell = 4 steps optimal
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (submitRes.ok) {
        const submitData = await submitRes.json() as {
          request_id?: string;
          images?: { url: string }[];
        };

        // Synchronous path
        if (submitData.images?.[0]?.url) {
          imageUrl = submitData.images[0].url;
        }

        // Async queue path
        if (!imageUrl && submitData.request_id) {
          const requestId = submitData.request_id;
          const pollDeadline = Date.now() + 60_000;

          while (Date.now() < pollDeadline) {
            await new Promise(r => setTimeout(r, 3_000));
            const statusRes = await fetch(
              `https://queue.fal.run/fal-ai/flux/schnell/requests/${requestId}`,
              {
                headers: { "Authorization": `Key ${FAL_API_KEY}` },
                signal: AbortSignal.timeout(10_000),
              }
            );
            if (!statusRes.ok) continue;
            const statusData = await statusRes.json() as {
              status?: string;
              images?: { url: string }[];
            };
            if (statusData.status === "COMPLETED" || statusData.images?.[0]?.url) {
              imageUrl = statusData.images?.[0]?.url ?? null;
              break;
            }
            if (statusData.status === "FAILED") break;
          }
        }
      }
    } catch (falErr: any) {
      console.warn("[generate-synthetic] FAL error:", falErr?.message);
      // imageUrl stays null — frontend renders avatar fallback
    }

    return c.json({
      success:     true,
      characterId,
      imageUrl,
      prompt,
      questionnaire,
      synthetic:   true,
      label:       questionnaire.label || "Character",
      generatedAt: new Date().toISOString(),
    }, 200);

  } catch (err: any) {
    console.error("[generate-synthetic] Error:", err?.message);
    return c.json({ error: "Character generation failed", details: err?.message }, 500);
  }
});

// ─── GET /api/characters/:characterId ─────────────────────────────────────────
// Minimal lookup — synthetic characters are stored in localStorage on the client,
// but this endpoint validates the ID format and confirms it's a synthetic char.
characters.get("/:characterId", async (c) => {
  const { characterId } = c.req.param();
  if (!characterId.startsWith("synth_")) {
    return c.json({ error: "Not a synthetic character" }, 404);
  }
  return c.json({ characterId, synthetic: true }, 200);
});
