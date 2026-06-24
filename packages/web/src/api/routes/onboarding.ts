import { Hono } from "hono";
import { generateText } from "ai";
import { gateway } from "../lib/ai";
import { logAICall } from "../lib/braintrust";
import { getSecret, SECRET_KEYS } from "../orchestration/secrets";

// All 14 Ghaafeedi Music products + memberships for recommendation engine
const GM_CATALOG = [
  { id: "mem-starter",           name: "Starter Membership",       category: "Membership",    price: 49,   priceStr: "$49/mo",   icon: "🎵", accent: "#D4AF37", tags: ["music","songs","entry"] },
  { id: "mem-premium",           name: "Premium Membership",       category: "Membership",    price: 79,   priceStr: "$79/mo",   icon: "🎵", accent: "#FFC24D", tags: ["music","songs","volume"] },
  { id: "mem-elite",             name: "Elite Membership",         category: "Membership",    price: 125,  priceStr: "$125/mo",  icon: "🎵", accent: "#FFD700", tags: ["music","songs","elite","volume"] },
  { id: "film2-essential",       name: "2-Min Cinematic Film",     category: "Short Films",   price: 79,   priceStr: "$79",      icon: "🎬", accent: "#D4A574", tags: ["video","film","visual","memorial"] },
  { id: "film2-premium",         name: "2-Min Film — Premium",     category: "Short Films",   price: 129,  priceStr: "$129",     icon: "🎬", accent: "#D4A574", tags: ["video","film","4k","premium"] },
  { id: "film5-essential",       name: "5-Min Cinematic Film",     category: "Feature Films", price: 149,  priceStr: "$149",     icon: "🎥", accent: "#06B6D4", tags: ["video","film","feature","legacy"] },
  { id: "film10-premium",        name: "10-Min Legacy Film",       category: "Masterpiece",   price: 499,  priceStr: "$499",     icon: "🏆", accent: "#10B981", tags: ["film","legacy","masterpiece","documentary"] },
  { id: "voice-cloning",         name: "Voice Cloning Studio",     category: "Studio",        price: 297,  priceStr: "$297",     icon: "🎙️", accent: "#EC4899", tags: ["voice","immortalize","legacy","audio"] },
  { id: "signature-masterpiece", name: "Signature Masterpiece",    category: "Premium",       price: 4997, priceStr: "$4,997",   icon: "💎", accent: "#D4AF37", tags: ["elite","legacy","masterpiece","lifetime"] },
  { id: "dream-visualization",   name: "Dream AI Visualization",   category: "AI",            price: 247,  priceStr: "$247",     icon: "🌌", accent: "#6366F1", tags: ["ai","visual","dream","future"] },
  { id: "future-self",           name: "Future Self Vision",       category: "AI",            price: 197,  priceStr: "$197",     icon: "🔮", accent: "#8B5CF6", tags: ["ai","future","self","vision"] },
  { id: "memorial-legacy",       name: "Memorial Legacy Film",     category: "Video",         price: 149,  priceStr: "$149",     icon: "🕊️", accent: "#64748B", tags: ["memorial","tribute","loss","grief","honor"] },
  { id: "family-vault",          name: "Family Vault",             category: "Legacy",        price: 19,   priceStr: "$19/mo",   icon: "🏛️", accent: "#22D3EE", tags: ["family","legacy","archive","generations"] },
  { id: "couples-journey",       name: "Couples Journey Film",     category: "Video",         price: 299,  priceStr: "$299",     icon: "💑", accent: "#F43F5E", tags: ["love","couple","relationship","romance"] },
  { id: "relationship-healing",  name: "Relationship Healing",     category: "Music",         price: 19,   priceStr: "$19/mo",   icon: "💚", accent: "#10B981", tags: ["healing","breakup","relationship","processing"] },
  { id: "cinematic-life-story",  name: "Cinematic Life Story",     category: "Video",         price: 299,  priceStr: "$299",     icon: "📽️", accent: "#A78BFA", tags: ["life","story","personal","cinematic"] },
  { id: "sophia-ai",             name: "Sophia AI Companion",      category: "AI",            price: 49,   priceStr: "$49/mo",   icon: "✨", accent: "#D4AF37", tags: ["ai","companion","emotional","support"] },
  { id: "emotional-soundtrack",  name: "Emotional Soundtrack",     category: "Music",         price: 19,   priceStr: "$19/mo",   icon: "🎶", accent: "#F472B6", tags: ["music","emotion","soundtrack","mood"] },
];

// ─── Sunor.cc polling helper ─────────────────────────────────
const SUNOR_API = "https://sunor.cc/api/v1";

async function sunorPoll(taskId: string, apiKey: string, timeoutMs = 90_000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 6_000));
    try {
      const res = await fetch(`${SUNOR_API}/task/${taskId}`, {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { status: string; audio_url?: string; output?: { audio_url?: string }[] };
      if (data.status === "complete" || data.status === "success" || data.status === "SUCCESS") {
        return data.audio_url ?? data.output?.[0]?.audio_url ?? null;
      }
      if (data.status === "error" || data.status === "failed") return null;
    } catch { /* retry */ }
  }
  return null;
}

export const onboardingRoutes = new Hono()
  .post("/analyze", async (c) => {
    try {
      const body = await c.req.json() as {
        whoFor?: string;
        experienceType?: string;
        storyText?: string;
        mediaCount?: number;
        alreadyOwnedIds?: string[];
      };

      const { whoFor = "", experienceType = "", storyText = "", mediaCount = 0, alreadyOwnedIds = [] } = body;

      // Filter out already-owned products from recommendation pool
      const availableProducts = GM_CATALOG.filter(p => !alreadyOwnedIds.includes(p.id));
      const catalogSummary = availableProducts.map(p =>
        `${p.id}: "${p.name}" (${p.priceStr}) — tags: ${p.tags.join(", ")}`
      ).join("\n");

      const hasStory = storyText.trim().length > 30;
      const storyContext = hasStory
        ? `STORY: ${storyText.slice(0, 1200)}`
        : `No story text provided yet.`;

      const mediaContext = mediaCount > 0 ? `They also uploaded ${mediaCount} media files.` : "";

      const prompt = `You are Ghaafeedi Music's emotional AI analyst. You analyze personal stories and emotional data to:
1. Score the emotional dimensions of a user's story
2. Recommend the most fitting Ghaafeedi Music products for their unique situation

USER CONTEXT:
- This story is for: ${whoFor || "themselves"}
- Experience type selected: ${experienceType || "not specified"}
- ${storyContext}
- ${mediaContext}

AVAILABLE PRODUCTS (do NOT recommend already-owned items):
${catalogSummary}

TASK: Analyze the story and return a JSON object (no markdown, no code blocks, raw JSON only):
{
  "categories": [
    {
      "key": "emotional",
      "label": "Emotional Tone",
      "score": <integer 72-99 based on emotional richness>,
      "insight": "<specific 6-12 word insight derived from THIS story>",
      "reason": "<2-3 sentence explanation of WHY this score was given, referencing specific story content>"
    },
    {
      "key": "arc",
      "label": "Story Arc",
      "score": <integer 68-99>,
      "insight": "<specific insight about narrative structure>",
      "reason": "<2-3 sentence explanation of the narrative arc found in their story>"
    },
    {
      "key": "memories",
      "label": "Key Memories",
      "score": <integer 70-99>,
      "insight": "<specific insight about memory anchors found>",
      "reason": "<2-3 sentences on the specific memories or sensory details that stand out>"
    },
    {
      "key": "mood",
      "label": "Mood Profile",
      "score": <integer 65-99>,
      "insight": "<specific mood signature for THIS person>",
      "reason": "<2-3 sentences explaining the mood tone and emotional coloring of their story>"
    },
    {
      "key": "resonance",
      "label": "Cinematic Resonance",
      "score": <integer 75-99>,
      "insight": "<insight about visual/cinematic potential>",
      "reason": "<2-3 sentences on why this story would translate powerfully to cinematic or musical form>"
    }
  ],
  "emotionalFingerprint": ["<adjective1>", "<adjective2>", "<adjective3>", "<optional adjective4>", "<optional adjective5>"],
  "dominantEmotion": "<2-4 word emotion label>",
  "emotionalArc": "<one sentence describing their emotional journey>",
  "songTitle": "<evocative song title that fits their story>",
  "profileSummary": "<2-3 sentence poetic description of this person's emotional world, written as if to them>",
  "recommendations": [
    {
      "id": "<product id from catalog>",
      "rank": 1,
      "reason": "<1-2 sentence specific reason why this product fits their story>"
    }
  ]
}

RULES:
- scores must vary realistically — NOT all 90+. Some lower scores are authentic
- Each insight must feel specific to THIS person, not generic
- Each reason must reference specific content from the story (names, places, emotions mentioned), or if no story, reference whoFor + experienceType
- emotionalFingerprint: 3-5 single adjectives that capture this person's emotional signature (e.g. "Nostalgic", "Resilient", "Devoted", "Tender")
- Recommend exactly 4 products, ranked 1-4, most relevant first
- Only recommend products from the available catalog above
- profileSummary should feel emotionally resonant and personal
- If no story text: base everything on whoFor + experienceType context only`;

      const { text } = await generateText({
        model: gateway("openai/gpt-4o-mini"),
        prompt,
        maxTokens: 900,
      });

      // Log to Braintrust for fine-tuning dataset collection
      logAICall({
        name: "emotional-analysis",
        model: "openai/gpt-4o-mini",
        prompt,
        output: text,
        metadata: {
          whoFor,
          experienceType,
          hasStory,
          mediaCount,
          storyLength: storyText.trim().length,
        },
      });

      // Parse response
      let analysis: any;
      try {
        // Strip any accidental markdown
        const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        analysis = JSON.parse(clean);
      } catch {
        // Fallback: contextual mock based on whoFor/experienceType
        analysis = buildFallback(whoFor, experienceType, availableProducts);
      }

      // Validate and clamp scores
      if (analysis.categories) {
        analysis.categories = analysis.categories.map((cat: any) => ({
          ...cat,
          score: Math.min(99, Math.max(55, parseInt(cat.score) || 80)),
        }));
      }

      return c.json({ success: true, analysis }, 200);
    } catch (err: any) {
      // Return graceful fallback so S5 never hard-fails
      const fallback = buildFallback("", "", GM_CATALOG);
      return c.json({ success: true, analysis: fallback, fallback: true }, 200);
    }
  })

  // ─── POST /api/onboarding/generate-song ───────────────────────
  // Step 1: GPT-4o-mini → title, lyrics, BPM, genre, mood, suno prompt
  // Step 2: Sunor.cc → submit + poll for 30-45s audio preview URL
  .post("/generate-song", async (c) => {
    try {
      const body = await c.req.json() as {
        storyText?: string;
        whoFor?: string;
        experienceType?: string;
        dominantEmotion?: string;
        emotionalArc?: string;
        suggestedTitle?: string;
      };
      const { storyText = "", whoFor = "", experienceType = "", dominantEmotion = "", emotionalArc = "", suggestedTitle = "" } = body;

      // ── Step 1: GPT-4o-mini → song metadata ──
      const lyricsPrompt = `You are a professional songwriter and music producer for Ghaafeedi Music, a luxury AI-powered emotional storytelling platform.

CUSTOMER STORY CONTEXT:
- Who this is for: ${whoFor || "themselves"}
- Experience type: ${experienceType || "song"}
- Dominant emotion: ${dominantEmotion || "deep emotion"}
- Emotional arc: ${emotionalArc || "a journey of memory and meaning"}
- Story excerpt: ${storyText.slice(0, 1000) || "Personal emotional story"}
- Suggested title from AI analysis: ${suggestedTitle || ""}

Create a complete, emotionally resonant song. Return ONLY raw JSON (no markdown, no code blocks):
{
  "title": "<evocative, personal song title — 2-5 words>",
  "genre": "<primary genre: Soul / R&B / Pop / Cinematic / Gospel / Neo-Soul / Indie>",
  "subgenre": "<specific subgenre e.g. Cinematic Soul, Emotional R&B>",
  "bpm": <integer 65-110, emotionally appropriate tempo>,
  "key": "<musical key e.g. A minor, D major>",
  "mood": ["<mood tag 1>", "<mood tag 2>", "<mood tag 3>"],
  "instruments": ["<instrument 1>", "<instrument 2>", "<instrument 3>"],
  "vocalStyle": "<vocal description e.g. warm tenor, soulful soprano, intimate whisper>",
  "lyrics": {
    "verse1": "<verse 1 lyrics — 4-8 lines, deeply personal>",
    "chorus": "<chorus lyrics — 4-6 lines, anthemic, repeatable>",
    "verse2": "<verse 2 lyrics — 4-8 lines, continuing the story>",
    "bridge": "<bridge lyrics — 2-4 lines, emotional climax>",
    "outroChorus": "<final chorus — same as chorus or slight variation>"
  },
  "sunoPrompt": "<30-50 word music generation prompt for Suno AI: genre, instruments, BPM, mood, vocal style — NO lyrics in this field>"
}

RULES:
- Lyrics must feel personal, not generic — reference the specific emotion and story context
- sunoPrompt: only describe the SOUND and STYLE, never include actual lyrics
- BPM: ballad 65-80, mid-tempo 80-95, upbeat 95-110
- Match the dominant emotion: grief=slower, love=mid-tempo warm, joy=upbeat`;

      const { text: lyricsRaw } = await generateText({
        model: gateway("openai/gpt-4o-mini"),
        prompt: lyricsPrompt,
        maxTokens: 1200,
      });

      let songMeta: any;
      try {
        const clean = lyricsRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        songMeta = JSON.parse(clean);
      } catch {
        songMeta = {
          title: suggestedTitle || "Echoes of You",
          genre: "Cinematic Soul",
          subgenre: "Emotional R&B",
          bpm: 78,
          key: "A minor",
          mood: ["nostalgic", "intimate", "hopeful"],
          instruments: ["piano", "strings", "soft drums"],
          vocalStyle: "warm soulful tenor",
          lyrics: {
            verse1: "I carry your memory like morning light\nIn the quiet spaces where you once shined\nThese walls still echo what we left behind\nA story written between the lines",
            chorus: "You are the song I never could forget\nThe harmony that holds me when I break\nEvery note we shared, I hear it yet\nIn the music only love can make",
            verse2: "The photographs have faded at the edge\nBut you remain as vivid as the day\nI made a promise standing on that ledge\nThat I would find the words to finally say",
            bridge: "Some stories never end, they just transform\nInto the melody that keeps you warm",
            outroChorus: "You are the song I never could forget\nThe harmony that holds me, holds me yet",
          },
          sunoPrompt: "Cinematic soul ballad, warm piano, lush orchestral strings, intimate vocals, emotional and nostalgic, 78 BPM, key of A minor, slow build to powerful chorus",
        };
      }

      // ── Step 2: Sunor.cc → generate audio preview ──
      let audioUrl: string | null = null;
      try {
        const apiKey = await getSecret(SECRET_KEYS.SUNO_API_KEY);

        // Format lyrics as a single block for Suno
        const fullLyrics = [
          "[Verse 1]", songMeta.lyrics.verse1,
          "[Chorus]", songMeta.lyrics.chorus,
          "[Verse 2]", songMeta.lyrics.verse2,
          "[Bridge]", songMeta.lyrics.bridge,
          "[Outro Chorus]", songMeta.lyrics.outroChorus,
        ].join("\n");

        const dispatchRes = await fetch(`${SUNOR_API}/task`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            model: "suno",
            task_type: "music",
            input: {
              gpt_description_prompt: songMeta.sunoPrompt,
              prompt: fullLyrics,
              title: songMeta.title,
              tags: `${songMeta.genre} ${songMeta.mood?.join(" ")}`,
              make_instrumental: false,
            },
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (dispatchRes.ok) {
          const dispatchData = await dispatchRes.json() as { task_id?: string; id?: string; taskId?: string };
          const taskId = dispatchData.task_id ?? dispatchData.taskId ?? dispatchData.id;
          if (taskId) {
            audioUrl = await sunorPoll(String(taskId), apiKey, 90_000);
          }
        }
      } catch (sunoErr: any) {
        console.warn("[generate-song] Sunor.cc error:", sunoErr?.message);
        // audioUrl stays null — frontend will show "preview generating" state
      }

      return c.json({
        success: true,
        title: songMeta.title,
        genre: songMeta.genre,
        subgenre: songMeta.subgenre,
        bpm: songMeta.bpm,
        key: songMeta.key,
        mood: songMeta.mood ?? [],
        instruments: songMeta.instruments ?? [],
        vocalStyle: songMeta.vocalStyle,
        lyrics: songMeta.lyrics,
        sunoPrompt: songMeta.sunoPrompt,
        audioUrl,      // null if Sunor.cc not yet ready
        audioReady: !!audioUrl,
      }, 200);
    } catch (err: any) {
      console.error("[generate-song] Fatal:", err?.message);
      return c.json({ success: false, error: err?.message ?? "Song generation failed" }, 500);
    }
  })

  // ─── POST /api/onboarding/generate-album-art ──────────────────
  // FAL.ai Flux Schnell → cinematic album art image
  .post("/generate-album-art", async (c) => {
    try {
      const body = await c.req.json() as {
        title?: string;
        genre?: string;
        mood?: string[];
        dominantEmotion?: string;
        whoFor?: string;
      };
      const { title = "Echoes of You", genre = "Cinematic Soul", mood = [], dominantEmotion = "", whoFor = "" } = body;

      const moodStr = mood.slice(0, 3).join(", ") || "emotional, cinematic";
      const emotionContext = dominantEmotion ? `Dominant emotion: ${dominantEmotion}. ` : "";
      const forContext = whoFor ? `Created for: ${whoFor}. ` : "";

      const artPrompt = `Ultra-premium album cover art for a luxury AI music platform. Song: "${title}". Genre: ${genre}. ${emotionContext}${forContext}Visual style: cinematic luxury, deep space-black background, dramatic gold and navy gradient lighting, volumetric god rays, floating particles of light, abstract human silhouette dissolving into music notes and stars, emotional and ethereal atmosphere, moody bokeh, ${moodStr}. Art direction: A24 film meets Apple Vision Pro aesthetic, stunning 4K quality, dark luxury mood board, no text, no typography, pure visual emotion.`;

      const FAL_API_KEY = await getSecret(SECRET_KEYS.FAL_API_KEY);

      // FAL.ai flux/schnell via queue API
      const submitRes = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: artPrompt,
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: false,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!submitRes.ok) {
        throw new Error(`FAL submit failed: ${submitRes.status}`);
      }

      const submitData = await submitRes.json() as { request_id?: string; images?: { url: string }[] };

      // If synchronous response (some FAL models return immediately)
      if (submitData.images?.[0]?.url) {
        return c.json({ success: true, imageUrl: submitData.images[0].url }, 200);
      }

      const requestId = submitData.request_id;
      if (!requestId) throw new Error("No request_id from FAL");

      // Poll FAL queue
      const pollDeadline = Date.now() + 45_000;
      while (Date.now() < pollDeadline) {
        await new Promise(r => setTimeout(r, 3_000));
        const statusRes = await fetch(`https://queue.fal.run/fal-ai/flux/schnell/requests/${requestId}`, {
          headers: { "Authorization": `Key ${FAL_API_KEY}` },
          signal: AbortSignal.timeout(8_000),
        });
        if (!statusRes.ok) continue;
        const statusData = await statusRes.json() as { status?: string; images?: { url: string }[] };
        if (statusData.status === "COMPLETED" || statusData.images?.[0]?.url) {
          return c.json({ success: true, imageUrl: statusData.images?.[0]?.url ?? null }, 200);
        }
        if (statusData.status === "FAILED") break;
      }

      // FAL timed out — return null, frontend shows gold gradient fallback
      return c.json({ success: true, imageUrl: null }, 200);
    } catch (err: any) {
      console.warn("[generate-album-art] Error:", err?.message);
      // Never hard-fail — frontend handles null gracefully
      return c.json({ success: true, imageUrl: null }, 200);
    }
  });

  // ─── POST /api/onboarding/generate-mood-images ────────────────
  // 4 parallel FAL.ai flux/schnell calls — one per emotional arc point
  // Returns: { success, images: [{ emotion, url }] }
  .post("/generate-mood-images", async (c) => {
    try {
      const body = await c.req.json() as {
        emotions?: string[];          // up to 4 adjectives from emotionalFingerprint
        dominantEmotion?: string;
        storyText?: string;
        whoFor?: string;
      };
      const {
        emotions = [],
        dominantEmotion = "Deep Emotion",
        storyText = "",
        whoFor = "",
      } = body;

      // Ensure exactly 4 emotions — pad/trim as needed
      const BASE_EMOTIONS = ["Longing", "Resilience", "Hope", "Peace"];
      const emotionSlots: string[] = [
        emotions[0] ?? BASE_EMOTIONS[0],
        emotions[1] ?? BASE_EMOTIONS[1],
        emotions[2] ?? BASE_EMOTIONS[2],
        emotions[3] ?? BASE_EMOTIONS[3],
      ];

      const FAL_API_KEY = await getSecret(SECRET_KEYS.FAL_API_KEY);
      const storySnippet = storyText.slice(0, 300);

      // Cinematic prompt builder per emotion
      function buildEmotionPrompt(emotion: string): string {
        const emotionLower = emotion.toLowerCase();
        const visualMap: Record<string, string> = {
          nostalgic:   "soft golden light, faded photographs, warm bokeh, empty chairs at sunrise, gentle mist over water",
          devoted:     "two silhouettes holding hands against city lights, warm amber glow, rain-soaked streets, intimate close-up",
          resilient:   "lone figure standing on a cliff edge at dawn, dramatic storm clearing, rays of light breaking through dark clouds",
          tender:      "close-up hands cradling something precious, soft candlelight, shallow depth of field, warm honey tones",
          hopeful:     "golden hour horizon, figure walking toward light, vast open landscape, ethereal god rays, morning mist",
          grief:       "empty bench in rain, wilted flowers, silver moonlight, fog-covered graveyard, dramatic shadows",
          longing:     "figure standing at a window looking out, city lights blurred in rain, solitary silhouette, blue-silver tones",
          joy:         "burst of golden confetti, laughing silhouette, warm sunlight, vibrant colors exploding from center",
          strength:    "powerful silhouette against stormy sky, lightning in background, defiant stance, dramatic volumetric light",
          peace:       "still water at twilight, single lotus flower, purple-gold sky reflection, serene minimalist landscape",
          love:        "intertwined silhouettes, rose gold light, floating petals, soft lens flare, warm cinematic mood",
          healing:     "new green shoots through cracked earth, dawn light, gentle rain, rebirth symbolism, hope imagery",
          wonder:      "cosmic nebula with human figure, stars and galaxies, awe-inspiring scale, electric blue and gold",
          melancholy:  "overcast city street, lone umbrella, blue-grey tones, reflections in puddles, cinematic sadness",
          passion:     "deep red and gold flames, intense lighting, dramatic shadows, powerful energy, cinematic intensity",
        };

        const lookup = Object.keys(visualMap).find(k => emotionLower.includes(k));
        const visualDesc = lookup ? visualMap[lookup] : `cinematic emotion of ${emotion}, dramatic lighting, deep shadows, gold accents`;

        return `Ultra-cinematic emotional portrait for a luxury AI music platform. Emotion: "${emotion}". Visual: ${visualDesc}. Style: A24 film meets Apple Vision Pro aesthetic, deep space-black background, dramatic gold and navy gradient lighting, volumetric god rays, floating particles of light, shallow depth of field, 4K quality, luxury dark mood board, no text, no people's faces, no typography, pure visual emotion. ${whoFor ? `Story context: created for ${whoFor}.` : ""} ${storySnippet ? `Story essence: ${storySnippet.slice(0, 120)}.` : ""}`;
      }

      // Fire all 4 in parallel
      async function generateOne(emotion: string): Promise<{ emotion: string; url: string | null }> {
        try {
          const prompt = buildEmotionPrompt(emotion);
          const submitRes = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Key ${FAL_API_KEY}`,
            },
            body: JSON.stringify({
              prompt,
              image_size: "landscape_4_3",
              num_inference_steps: 4,
              num_images: 1,
              enable_safety_checker: false,
            }),
            signal: AbortSignal.timeout(12_000),
          });

          if (!submitRes.ok) return { emotion, url: null };

          const submitData = await submitRes.json() as { request_id?: string; images?: { url: string }[] };

          // Synchronous response
          if (submitData.images?.[0]?.url) return { emotion, url: submitData.images[0].url };

          const requestId = submitData.request_id;
          if (!requestId) return { emotion, url: null };

          // Poll up to 30s
          const deadline = Date.now() + 30_000;
          while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 2_500));
            const statusRes = await fetch(`https://queue.fal.run/fal-ai/flux/schnell/requests/${requestId}`, {
              headers: { "Authorization": `Key ${FAL_API_KEY}` },
              signal: AbortSignal.timeout(8_000),
            });
            if (!statusRes.ok) continue;
            const s = await statusRes.json() as { status?: string; images?: { url: string }[] };
            if (s.images?.[0]?.url) return { emotion, url: s.images[0].url };
            if (s.status === "COMPLETED") return { emotion, url: s.images?.[0]?.url ?? null };
            if (s.status === "FAILED") return { emotion, url: null };
          }
          return { emotion, url: null };
        } catch {
          return { emotion, url: null };
        }
      }

      const results = await Promise.all(emotionSlots.map(e => generateOne(e)));

      return c.json({ success: true, images: results }, 200);
    } catch (err: any) {
      console.warn("[generate-mood-images] Error:", err?.message);
      return c.json({ success: true, images: [] }, 200);
    }
  });

function buildFallback(whoFor: string, experienceType: string, products: typeof GM_CATALOG) {
  // Context-aware variance so fallback never looks the same
  const seed = (whoFor + experienceType).length % 7;
  const base = [82, 76, 89, 71, 94];
  const offsets = [seed, seed * 2 % 9, seed * 3 % 11, seed * 4 % 13, seed * 5 % 7];

  const emotionMap: Record<string, string> = {
    relationship: "Deep Longing & Love",
    family: "Warmth & Belonging",
    child: "Pure Joy & Wonder",
    self: "Quiet Strength",
    loss: "Grief & Healing",
    friend: "Loyal Affection",
  };

  const insightMap: Record<string, string[]> = {
    relationship: ["Love that reshaped who you are", "A bond written across time", "Devotion beyond words"],
    family: ["Roots that hold you steady", "Generations of quiet love", "Home lives in your voice"],
    child: ["Wonder seen through innocent eyes", "A story of becoming", "Joy that echoes forward"],
    self: ["A journey only you could take", "Strength forged from silence", "Becoming who you were meant to be"],
  };

  const key = Object.keys(emotionMap).find(k => whoFor?.includes(k)) ?? "self";
  const insights = insightMap[key] ?? insightMap.self;

  const recommendations = products.slice(0, 4).map((p, i) => ({
    id: p.id,
    rank: i + 1,
    reason: `This product was selected based on your emotional profile and what you chose to create.`,
  }));

  return {
    categories: [
      { key: "emotional",  label: "Emotional Tone",      score: base[0] + offsets[0], insight: insights[0],                                               reason: "Your story carries a depth of feeling that resonates strongly. The emotional investment you've put into this experience is clear and authentic." },
      { key: "arc",        label: "Story Arc",            score: base[1] + offsets[1], insight: "A journey with clear emotional turning points",            reason: "There is a discernible narrative shape — a beginning rooted in memory, a middle shaped by feeling, and a resolution that points toward meaning." },
      { key: "memories",   label: "Key Memories",         score: base[2] + offsets[2], insight: insights[1] ?? "Vivid emotional anchors identified",        reason: "The specific details and emotional anchors in your story provide rich material for cinematic memory sequences and lyrical imagery." },
      { key: "mood",       label: "Mood Profile",         score: base[3] + offsets[3], insight: "Complex emotional signature — rare and powerful",          reason: "Your emotional coloring is multidimensional — not a single note, but a chord. This complexity makes for richer, more resonant music and film." },
      { key: "resonance",  label: "Cinematic Resonance",  score: base[4] + offsets[4], insight: insights[2] ?? "Strong visual storytelling potential",      reason: "The imagery and emotion in your story translate naturally to cinematic form. This is the kind of story that moves people on screen and in sound." },
    ],
    dominantEmotion: emotionMap[key] ?? "Deep Emotion",
    emotionalArc: "A story of transformation, memory, and connection.",
    emotionalFingerprint: ["Nostalgic", "Devoted", "Resilient"],
    songTitle: "Echoes of You",
    profileSummary: "Your story holds something rare — a depth of feeling that most people never put into words. Ghaafeedi Music was built for exactly this moment.",
    recommendations,
  };
}
