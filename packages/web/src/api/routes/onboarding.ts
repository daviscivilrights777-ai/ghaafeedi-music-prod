import { Hono } from "hono";
import { generateText } from "ai";
import { gateway } from "../lib/ai";
import { logAICall } from "../lib/braintrust";

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
      "insight": "<specific 6-12 word insight derived from THIS story>"
    },
    {
      "key": "arc",
      "label": "Story Arc",
      "score": <integer 68-99>,
      "insight": "<specific insight about narrative structure>"
    },
    {
      "key": "memories",
      "label": "Key Memories",
      "score": <integer 70-99>,
      "insight": "<specific insight about memory anchors found>"
    },
    {
      "key": "mood",
      "label": "Mood Profile",
      "score": <integer 65-99>,
      "insight": "<specific mood signature for THIS person>"
    },
    {
      "key": "resonance",
      "label": "Cinematic Resonance",
      "score": <integer 75-99>,
      "insight": "<insight about visual/cinematic potential>"
    }
  ],
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
      { key: "emotional",  label: "Emotional Tone",      score: base[0] + offsets[0], insight: insights[0] },
      { key: "arc",        label: "Story Arc",            score: base[1] + offsets[1], insight: "A journey with clear emotional turning points" },
      { key: "memories",   label: "Key Memories",         score: base[2] + offsets[2], insight: insights[1] ?? "Vivid emotional anchors identified" },
      { key: "mood",       label: "Mood Profile",         score: base[3] + offsets[3], insight: "Complex emotional signature — rare and powerful" },
      { key: "resonance",  label: "Cinematic Resonance",  score: base[4] + offsets[4], insight: insights[2] ?? "Strong visual storytelling potential" },
    ],
    dominantEmotion: emotionMap[key] ?? "Deep Emotion",
    emotionalArc: "A story of transformation, memory, and connection.",
    songTitle: "Echoes of You",
    profileSummary: "Your story holds something rare — a depth of feeling that most people never put into words. Ghaafeedi Music was built for exactly this moment.",
    recommendations,
  };
}
