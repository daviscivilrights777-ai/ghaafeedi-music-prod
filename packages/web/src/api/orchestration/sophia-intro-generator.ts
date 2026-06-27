/**
 * Sophia Intro/Outro Generator
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates personalized cinematic intro + emotionally-mapped outro scripts
 * for each customer's Ghaafeedi Music production, then renders both to audio
 * via ElevenLabs using Sophia's voice.
 *
 * Emotion map:
 *   grief      → hope / forward light
 *   sadness    → warmth + uplift
 *   joy        → amplify / celebrate
 *   love       → reverence / honor
 *   anger      → empowerment / strength
 *   hope       → forward momentum
 *   nostalgia  → cherish / gratitude
 *   longing    → connection / reunion
 */

import { getSecret } from "./secrets";
import { poyoChat, POYO_LLM } from "./adapters/poyo.adapter";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmotionalScores {
  grief?:     number; // 0–100
  sadness?:   number;
  joy?:       number;
  love?:      number;
  anger?:     number;
  hope?:      number;
  nostalgia?: number;
  longing?:   number;
  [key: string]: number | undefined;
}

export interface SophiaIntroRequest {
  userId:        string;
  customerFirstName: string;
  customerLastName:  string;
  story:         string;          // S4 text story (full text)
  emotionalScores: EmotionalScores;
  eventType:     string;          // e.g. "anniversary", "memorial", "celebration", "healing"
  productType:   string;          // e.g. "cinematic_life_story", "memorial_legacy_film"
  suggestedTitle?: string;        // AI-generated title from S5, if available
}

export interface SophiaIntroResult {
  introScript:   string;
  outroScript:   string;
  introAudioUrl: string | null;   // null if ElevenLabs fails (graceful)
  outroAudioUrl: string | null;
  dominantEmotion: string;
  emotionalTheme:  string;
  generatedAt:   string;
}

// ─── Emotion map ─────────────────────────────────────────────────────────────

const EMOTION_THEMES: Record<string, { theme: string; outroTone: string; closingLine: string }> = {
  grief: {
    theme:      "hope",
    outroTone:  "tender and forward-looking",
    closingLine: "Even in loss, your story becomes a light that guides those who come after.",
  },
  sadness: {
    theme:      "warmth and uplift",
    outroTone:  "comforting and gently uplifting",
    closingLine: "From the depths of feeling, beauty is born.",
  },
  joy: {
    theme:      "amplified celebration",
    outroTone:  "celebratory and electric",
    closingLine: "This joy is yours forever — and now, it is forever heard.",
  },
  love: {
    theme:      "reverence",
    outroTone:  "reverent and intimate",
    closingLine: "Love like yours deserves to live beyond time.",
  },
  anger: {
    theme:      "empowerment",
    outroTone:  "strong and empowering",
    closingLine: "Your fire is your power. Your story, your declaration.",
  },
  hope: {
    theme:      "forward momentum",
    outroTone:  "inspiring and forward-moving",
    closingLine: "Every step forward begins with a story worth telling.",
  },
  nostalgia: {
    theme:      "cherish and gratitude",
    outroTone:  "warm and deeply grateful",
    closingLine: "The past never truly leaves us — it lives in the music we create.",
  },
  longing: {
    theme:      "connection and reunion",
    outroTone:  "yearning yet tender",
    closingLine: "Distance cannot silence what the heart has always known.",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDominantEmotion(scores: EmotionalScores): string {
  let top = "love";
  let topScore = -1;
  for (const [emotion, score] of Object.entries(scores)) {
    if (score !== undefined && score > topScore) {
      topScore = score;
      top = emotion;
    }
  }
  return top;
}

function humanizeProductType(productType: string): string {
  const map: Record<string, string> = {
    cinematic_life_story:   "cinematic life story",
    memorial_legacy_film:   "memorial legacy film",
    emotional_soundtrack:   "emotional soundtrack",
    voice_cloning_studio:   "voice cloning experience",
    relationship_healing:   "relationship healing song",
    signature_masterpiece:  "signature masterpiece song",
    nft_collection:         "legacy NFT collection",
    couples_journey_film:   "couples journey film",
    cinematic_story_film:   "cinematic story film",
    dream_ai_visualization: "dream visualization",
    future_self_vision:     "future self vision",
    social_ready_clips:     "social legacy clips",
    family_vault:           "family vault archive",
  };
  return map[productType] ?? productType.replace(/_/g, " ");
}

// ─── Script generation ───────────────────────────────────────────────────────

async function generateScripts(req: SophiaIntroRequest): Promise<{ introScript: string; outroScript: string }> {
  // No key fetch needed — poyoChat uses POYO_API_KEY internally

  const dominantEmotion = getDominantEmotion(req.emotionalScores);
  const emotionMeta = (EMOTION_THEMES[dominantEmotion] ?? EMOTION_THEMES.love)!;
  const productHuman = humanizeProductType(req.productType);
  const scoresSummary = Object.entries(req.emotionalScores)
    .filter(([, v]) => v !== undefined && v > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .map(([k, v]) => `${k}: ${v}%`)
    .join(", ");

  const systemPrompt = `You are Sophia, the AI Emotional Concierge for Ghaafeedi Music — a luxury cinematic storytelling platform. You write voiceover scripts in first person, speaking directly as Sophia. Your voice is warm, cinematic, intimate, and emotionally resonant. Every word matters. No filler. No corporate speak. Pure emotional truth.

Writing rules:
- Intro: ~15 seconds when read aloud (~40–50 words). 2–3 sentences max. Reference the customer's event and the dominant emotion.
- Outro: ~12 seconds when read aloud (~30–40 words). Emotionally mapped closing. Must end EXACTLY with: "Presented by Ghaafeedi Music."
- Never use the last name in the intro. First name only.
- Outro uses full name: "${req.customerFirstName} ${req.customerLastName}"
- Tone for this production: ${emotionMeta.outroTone}
- Dominant emotional theme: ${emotionMeta.theme}
- No quotes around the scripts. No labels. Output JSON only.`;

  const userPrompt = `Generate an intro and outro for this Ghaafeedi Music production.

Customer: ${req.customerFirstName} ${req.customerLastName}
Event type: ${req.eventType}
Product: ${productHuman}
Emotional scores: ${scoresSummary}
Dominant emotion: ${dominantEmotion} (theme: ${emotionMeta.theme})
Story excerpt (first 300 chars): "${req.story.slice(0, 300).trim()}"
${req.suggestedTitle ? `Suggested title: "${req.suggestedTitle}"` : ""}

Closing line inspiration for outro: "${emotionMeta.closingLine}"

Respond with valid JSON only:
{
  "introScript": "...",
  "outroScript": "... Presented by Ghaafeedi Music."
}`;

  // ── DeepSeek V3 via Poyo.ai (pipeline LLM) ────────────────────────────────
  const data = await poyoChat({
    model:           POYO_LLM.pipeline,
    max_tokens:      300,
    temperature:     0.85,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt },
    ],
  });

  const raw = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  const introScript = (parsed.introScript ?? "").trim();
  const outroScript = (parsed.outroScript ?? "").trim();

  if (!introScript || !outroScript) {
    throw new Error("OpenAI returned empty scripts");
  }

  // Enforce "Presented by Ghaafeedi Music." closer
  const fixedOutro = outroScript.endsWith("Presented by Ghaafeedi Music.")
    ? outroScript
    : outroScript.replace(/\.?\s*$/, ". Presented by Ghaafeedi Music.");

  return { introScript, outroScript: fixedOutro };
}

// ─── ElevenLabs audio render ─────────────────────────────────────────────────

const ELEVENLABS_VOICE_ID = "pFZP5JQG7iQjIQuC4Bku"; // Lily — Velvety Actress
const ELEVENLABS_MODEL    = "eleven_turbo_v2_5";

async function renderToAudio(script: string): Promise<string | null> {
  try {
    const apiKey = await getSecret("ELEVENLABS_API_KEY").catch(() => process.env.ELEVENLABS_API_KEY ?? "");
    if (!apiKey) {
      console.warn("[SophiaIntroGenerator] ElevenLabs key missing — skipping audio render");
      return null;
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key":   apiKey,
        "Content-Type": "application/json",
        "Accept":       "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability:        0.52,
          similarity_boost: 0.80,
          style:            0.30,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[SophiaIntroGenerator] ElevenLabs render failed: ${response.status} — ${errText}`);
      return null;
    }

    // Upload to R2 via presigned-URL or return base64 data URL for dev
    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");
    return `data:audio/mpeg;base64,${base64}`;

  } catch (err) {
    console.error("[SophiaIntroGenerator] Audio render error:", (err as Error).message);
    return null;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export class SophiaIntroGenerator {
  /**
   * Generate personalized intro + outro scripts and render both to audio.
   * Audio failures are graceful — returns null audio URLs rather than throwing.
   */
  static async generate(req: SophiaIntroRequest): Promise<SophiaIntroResult> {
    const dominantEmotion = getDominantEmotion(req.emotionalScores);
    const emotionMeta = (EMOTION_THEMES[dominantEmotion] ?? EMOTION_THEMES.love)!;

    console.log(`[SophiaIntroGenerator] Generating for ${req.customerFirstName} ${req.customerLastName} | emotion=${dominantEmotion} | product=${req.productType}`);

    // 1. Generate scripts (OpenAI)
    const { introScript, outroScript } = await generateScripts(req);

    // 2. Render both to audio in parallel (ElevenLabs) — graceful on failure
    const [introAudioUrl, outroAudioUrl] = await Promise.all([
      renderToAudio(introScript),
      renderToAudio(outroScript),
    ]);

    console.log(`[SophiaIntroGenerator] Done. intro=${introAudioUrl ? "rendered" : "skipped"} outro=${outroAudioUrl ? "rendered" : "skipped"}`);

    return {
      introScript,
      outroScript,
      introAudioUrl,
      outroAudioUrl,
      dominantEmotion,
      emotionalTheme: emotionMeta.theme,
      generatedAt: new Date().toISOString(),
    };
  }
}
