/**
 * Pricing Intelligence Data
 * Source of truth: cinematic-cost.report/content.md (June 2026)
 * Approved by Lawrence Davis — do not modify numbers without new approval.
 *
 * Legal framing: Factual price comparisons only. No quality judgments.
 * Disclaimer shown in PricingIntelligenceModal footer.
 */

// ─── Film lengths ─────────────────────────────────────────────────────────────
export const FILM_LENGTHS = [
  { label: "5 min",  min: 5  },
  { label: "10 min", min: 10 },
  { label: "15 min", min: 15 },
  { label: "20 min", min: 20 },
  { label: "25 min", min: 25 },
  { label: "30 min", min: 30 },
] as const;

export type FilmLengthIndex = 0 | 1 | 2 | 3 | 4 | 5;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CompetitorEntry {
  name: string;
  logo: string;           // emoji or short text used as icon
  url: string;
  color: string;          // hex for accent
  priceRange: string;     // display string e.g. "$303–$482"
  priceMin: number;
  priceMax: number;
  includes: string[];
  missing: string[];
  note?: string;
}

export interface GhaafeediTier {
  name: "Essential" | "Creator" | "Pro";
  price: number;
  features: string[];
}

export interface ProductComparison {
  productSlugs: string[];       // which product detail pages show this data
  headline: string;             // "Save up to $X vs DIY"
  subline: string;
  ghaafeediTiers: GhaafeediTier[];
  competitors: CompetitorEntry[];
  savingsVsCheapest: string;    // badge text
  savingsVsMostExpensive: string;
  whyWeWin: string[];           // 4–5 bullets
  legalNote: string;
}

// ─── Film products comparison (all 6 film types share same competitor data by length) ──
export const FILM_COMPARISON_BY_LENGTH: {
  lengths: typeof FILM_LENGTHS;
  ghaafeediByLength: GhaafeediTier[][];  // index = length index
  competitorsByLength: CompetitorEntry[][];
  savingsByLength: { vsCheapest: string; vsMostExpensive: string; badge: string }[];
} = {
  lengths: FILM_LENGTHS,
  ghaafeediByLength: [
    // 5 min
    [
      { name: "Essential", price: 199, features: ["5-min film · 480p · Seedance 2.0", "AI Emotional Story Script", "Original music score", "1 revision", "Digital delivery"] },
      { name: "Creator",   price: 349, features: ["5-min film · 720p · Seedance 2.0", "AI Emotional Story Script", "Sophia AI Concierge", "2 revisions", "Color grading"] },
      { name: "Pro",       price: 599, features: ["5-min film · 1080p · Seedance 2.0", "AI Emotional Story Script", "Sophia AI Concierge", "ElevenLabs Narration", "3 revisions", "Premiere kit"] },
    ],
    // 10 min
    [
      { name: "Essential", price: 299, features: ["Full film production", "AI scripting", "Original music", "Voiceover", "1 revision"] },
      { name: "Creator",   price: 499, features: ["Everything in Essential", "Priority production", "2 revisions", "4K delivery"] },
      { name: "Pro",       price: 799, features: ["Everything in Creator", "Full orchestral score", "4 revisions", "Physical keepsake"] },
    ],
    // 15 min
    [
      { name: "Essential", price: 449, features: ["Full film production", "AI scripting", "Original music", "Voiceover", "1 revision"] },
      { name: "Creator",   price: 749, features: ["Everything in Essential", "Priority production", "2 revisions", "4K delivery"] },
      { name: "Pro",       price: 1199, features: ["Everything in Creator", "Full orchestral score", "4 revisions", "Physical keepsake"] },
    ],
    // 20 min
    [
      { name: "Essential", price: 599, features: ["Full film production", "AI scripting", "Original music", "Voiceover", "1 revision"] },
      { name: "Creator",   price: 999, features: ["Everything in Essential", "Priority production", "2 revisions", "4K delivery"] },
      { name: "Pro",       price: 1599, features: ["Everything in Creator", "Full orchestral score", "4 revisions", "Physical keepsake"] },
    ],
    // 25 min
    [
      { name: "Essential", price: 749, features: ["Full film production", "AI scripting", "Original music", "Voiceover", "1 revision"] },
      { name: "Creator",   price: 1249, features: ["Everything in Essential", "Priority production", "2 revisions", "4K delivery"] },
      { name: "Pro",       price: 1999, features: ["Everything in Creator", "Full orchestral score", "4 revisions", "Physical keepsake"] },
    ],
    // 30 min
    [
      { name: "Essential", price: 899, features: ["Full film production", "AI scripting", "Original music", "Voiceover", "1 revision"] },
      { name: "Creator",   price: 1499, features: ["Everything in Essential", "Priority production", "2 revisions", "4K delivery"] },
      { name: "Pro",       price: 2399, features: ["Everything in Creator", "Full orchestral score", "4 revisions", "Physical keepsake"] },
    ],
  ],
  competitorsByLength: [
    // 5 min
    [
      {
        name: "Runway Gen-4", logo: "✈", url: "https://runwayml.com",
        color: "#4A90D9",
        priceRange: "$303–$482", priceMin: 303, priceMax: 482,
        includes: ["Video generation credits", "Basic editing"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Credits only. Story scripting, VO, music, revisions all cost extra.",
      },
      {
        name: "HiggsField Kling 3.0", logo: "H", url: "https://higsfield.ai",
        color: "#7B5CF6",
        priceRange: "$484–$660", priceMin: 484, priceMax: 660,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Ultra plan ($129/mo). Credits drain fast on cinematic shots.",
      },
      {
        name: "HiggsField Seedance 2.0", logo: "H", url: "https://higsfield.ai",
        color: "#A855F7",
        priceRange: "$1,405–$1,800", priceMin: 1405, priceMax: 1800,
        includes: ["Premium cinematic video"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Same Seedance 2.0 model — but no story layer, no narration, no concierge. Just raw credits.",
      },
      {
        name: "Pika 2.2", logo: "P", url: "https://pika.art",
        color: "#EC4899",
        priceRange: "$228–$468/yr ($19–$39/mo)", priceMin: 228, priceMax: 468,
        includes: ["Video generation credits", "Basic effects"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Original music score", "Revisions included", "Delivery guarantee"],
        note: "Template-first tool. No emotional personalization. Generates short clips, not full films.",
      },
      {
        name: "Kling AI Pro", logo: "K", url: "https://klingai.com",
        color: "#059669",
        priceRange: "$200–$300", priceMin: 200, priceMax: 300,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Cheapest DIY — 40–60% rejection rate on cinematic shots. Still no story layer.",
      },
    ],
    // 10 min
    [
      { name: "Runway Gen-4", logo: "✈", url: "https://runwayml.com", color: "#4A90D9",
        priceRange: "$581–$939", priceMin: 581, priceMax: 939,
        includes: ["Video generation credits", "Basic editing"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Credits only. Story scripting, VO, music, revisions all cost extra.",
      },
      { name: "HiggsField Kling 3.0", logo: "H", url: "https://higsfield.ai", color: "#7B5CF6",
        priceRange: "$943–$1,250", priceMin: 943, priceMax: 1250,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Ultra plan. Double the 5-min cost.",
      },
      { name: "HiggsField Seedance 2.0", logo: "H", url: "https://higsfield.ai", color: "#A855F7",
        priceRange: "$2,784–$3,500", priceMin: 2784, priceMax: 3500,
        includes: ["Premium cinematic video"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Same model — no story, no narration, no concierge. Just credits.",
      },
      { name: "Pika 2.2", logo: "P", url: "https://pika.art", color: "#EC4899",
        priceRange: "$228–$468/yr", priceMin: 228, priceMax: 468,
        includes: ["Video generation credits", "Basic effects"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "10-min film capability"],
        note: "Built for short clips, not long-form cinematic films.",
      },
      { name: "Kling AI Pro", logo: "K", url: "https://klingai.com", color: "#059669",
        priceRange: "$375–$560", priceMin: 375, priceMax: 560,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "No story layer. 40–60% rejection rate on cinematic shots.",
      },
    ],
    // 15 min
    [
      { name: "Runway Gen-4", logo: "✈", url: "https://runwayml.com", color: "#4A90D9",
        priceRange: "$859–$1,396", priceMin: 859, priceMax: 1396,
        includes: ["Video generation credits", "Basic editing"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Credits only. All production services cost extra.",
      },
      { name: "HiggsField Kling 3.0", logo: "H", url: "https://higsfield.ai", color: "#7B5CF6",
        priceRange: "$1,402–$1,800", priceMin: 1402, priceMax: 1800,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
      { name: "HiggsField Seedance 2.0", logo: "H", url: "https://higsfield.ai", color: "#A855F7",
        priceRange: "$4,164–$5,200", priceMin: 4164, priceMax: 5200,
        includes: ["Premium cinematic video"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
      { name: "Pika 2.2", logo: "P", url: "https://pika.art", color: "#EC4899",
        priceRange: "$228–$468/yr", priceMin: 228, priceMax: 468,
        includes: ["Short video clips"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Long-form film capability", "Revisions included"],
        note: "Not designed for 15-min films. Short-clip tool only.",
      },
      { name: "Kling AI Pro", logo: "K", url: "https://klingai.com", color: "#059669",
        priceRange: "$550–$820", priceMin: 550, priceMax: 820,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
    ],
    // 20 min
    [
      { name: "Runway Gen-4", logo: "✈", url: "https://runwayml.com", color: "#4A90D9",
        priceRange: "$1,132–$1,848", priceMin: 1132, priceMax: 1848,
        includes: ["Video generation credits", "Basic editing"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
      { name: "HiggsField Kling 3.0", logo: "H", url: "https://higsfield.ai", color: "#7B5CF6",
        priceRange: "$1,856–$2,400", priceMin: 1856, priceMax: 2400,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
      { name: "HiggsField Seedance 2.0", logo: "H", url: "https://higsfield.ai", color: "#A855F7",
        priceRange: "$5,538–$6,900", priceMin: 5538, priceMax: 6900,
        includes: ["Premium cinematic video"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Same model — no story, no narration, no concierge. Just credits.",
      },
      { name: "Pika 2.2", logo: "P", url: "https://pika.art", color: "#EC4899",
        priceRange: "$228–$468/yr", priceMin: 228, priceMax: 468,
        includes: ["Short video clips"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Long-form film capability", "Revisions included"],
        note: "Not designed for 20-min films. Short-clip tool only.",
      },
      { name: "Kling AI Pro", logo: "K", url: "https://klingai.com", color: "#059669",
        priceRange: "$719–$1,080", priceMin: 719, priceMax: 1080,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
    ],
    // 25 min
    [
      { name: "Runway Gen-4", logo: "✈", url: "https://runwayml.com", color: "#4A90D9",
        priceRange: "$1,405–$2,300", priceMin: 1405, priceMax: 2300,
        includes: ["Video generation credits", "Basic editing"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
      { name: "HiggsField Kling 3.0", logo: "H", url: "https://higsfield.ai", color: "#7B5CF6",
        priceRange: "$2,310–$3,000", priceMin: 2310, priceMax: 3000,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
      { name: "HiggsField Seedance 2.0", logo: "H", url: "https://higsfield.ai", color: "#A855F7",
        priceRange: "$6,913–$8,600", priceMin: 6913, priceMax: 8600,
        includes: ["Premium cinematic video"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Same model — no story, no narration, no concierge. Just credits.",
      },
      { name: "Pika 2.2", logo: "P", url: "https://pika.art", color: "#EC4899",
        priceRange: "$228–$468/yr", priceMin: 228, priceMax: 468,
        includes: ["Short video clips"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Long-form film capability", "Revisions included"],
        note: "Not designed for 25-min films. Short-clip tool only.",
      },
      { name: "Kling AI Pro", logo: "K", url: "https://klingai.com", color: "#059669",
        priceRange: "$889–$1,340", priceMin: 889, priceMax: 1340,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
    ],
    // 30 min
    [
      { name: "Runway Gen-4", logo: "✈", url: "https://runwayml.com", color: "#4A90D9",
        priceRange: "$1,678–$2,752", priceMin: 1678, priceMax: 2752,
        includes: ["Video generation credits", "Basic editing"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Credits only. Story scripting, VO, music, revisions all cost extra.",
      },
      { name: "HiggsField Kling 3.0", logo: "H", url: "https://higsfield.ai", color: "#7B5CF6",
        priceRange: "$2,764–$3,600", priceMin: 2764, priceMax: 3600,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
      },
      { name: "HiggsField Seedance 2.0", logo: "H", url: "https://higsfield.ai", color: "#A855F7",
        priceRange: "$8,287–$10,300", priceMin: 8287, priceMax: 10300,
        includes: ["Premium cinematic video"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Most cinematic model on the market — but no story, no narration, no concierge. 10× more than Ghaafeedi.",
      },
      { name: "Pika 2.2", logo: "P", url: "https://pika.art", color: "#EC4899",
        priceRange: "$228–$468/yr", priceMin: 228, priceMax: 468,
        includes: ["Short video clips"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Long-form film capability", "Revisions included"],
        note: "Not designed for 30-min films. Short-clip tool only.",
      },
      { name: "Kling AI Pro", logo: "K", url: "https://klingai.com", color: "#059669",
        priceRange: "$1,059–$1,600", priceMin: 1059, priceMax: 1600,
        includes: ["Video generation credits"],
        missing: ["AI Emotional Story Script", "ElevenLabs Narration", "Sophia AI Concierge", "Music included", "Revisions included", "Delivery guarantee"],
        note: "Cheapest DIY — still more expensive than Ghaafeedi Essential.",
      },
    ],
  ],
  savingsByLength: [
    { vsCheapest: "Save $1+ vs Kling — with story script, narration & concierge included", vsMostExpensive: "Up to $1,601 saved vs HiggsField Seedance 2.0 DIY", badge: "Save $1–$1,601 vs DIY — with everything included" },
    { vsCheapest: "Save $76+ vs Kling — full story, narration & concierge included",       vsMostExpensive: "Up to $3,201 saved vs HiggsField Seedance 2.0",    badge: "Save $76–$3,201 vs DIY — everything included" },
    { vsCheapest: "Save $101+ vs Kling — full story, narration & concierge included",      vsMostExpensive: "Up to $4,751 saved vs HiggsField Seedance 2.0",    badge: "Save $101–$4,751 vs DIY — everything included" },
    { vsCheapest: "Save $120+ vs Kling — full story, narration & concierge included",      vsMostExpensive: "Up to $6,301 saved vs HiggsField Seedance 2.0",    badge: "Save $120–$6,301 vs DIY — everything included" },
    { vsCheapest: "Save $140+ vs Kling — full story, narration & concierge included",      vsMostExpensive: "Up to $7,851 saved vs HiggsField Seedance 2.0",    badge: "Save $140–$7,851 vs DIY — everything included" },
    { vsCheapest: "Save $160+ vs Kling — full story, narration & concierge included",      vsMostExpensive: "Up to $9,401 saved vs HiggsField Seedance 2.0",    badge: "Save $160–$9,401 vs DIY — everything included" },
  ],
};

// ─── Why Ghaafeedi wins (film) ─────────────────────────────────────────────
export const FILM_WHY_WE_WIN = [
  "Everything included: scripting, voiceover, music, editing, and revisions — one price",
  "AI orchestration handles 90+ generations per project with zero effort from you",
  "Revisions cost $0 extra — DIY platforms charge per re-generation attempt",
  "Guaranteed delivery with timeline — DIY has no delivery commitment",
  "No 20–160 hours of your time required to learn platform credit systems",
];

// ─── Non-film product comparisons ─────────────────────────────────────────────

export const SONG_COMPARISON: ProductComparison = {
  productSlugs: ["emotional-soundtrack", "signature-masterpiece", "relationship-healing"],
  headline: "Professional music for a fraction of what producers charge",
  subline: "AI-composed, emotionally personalized, delivered faster than any freelancer.",
  ghaafeediTiers: [
    { name: "Essential", price: 19, features: ["2 songs/mo", "AI emotional analysis", "MP3 delivery", "1 revision"] },
    { name: "Creator",   price: 39, features: ["5 songs/mo", "WAV + stems", "Streaming master", "2 revisions"] },
    { name: "Pro",       price: 79, features: ["12 songs/mo", "Full production", "3 revisions", "Priority delivery"] },
  ],
  competitors: [
    {
      name: "Suno Pro", logo: "S", url: "https://suno.com", color: "#8B5CF6",
      priceRange: "$8–$48/mo", priceMin: 8, priceMax: 48,
      includes: ["Song generation credits"],
      missing: ["Emotional AI analysis", "Custom lyrics from your story", "Stems delivery", "Revision guarantee"],
      note: "Generates generic music. No personalization from your story.",
    },
    {
      name: "Udio", logo: "U", url: "https://udio.com", color: "#0EA5E9",
      priceRange: "$10–$30/mo", priceMin: 10, priceMax: 30,
      includes: ["Song generation credits"],
      missing: ["Emotional AI analysis", "Custom lyrics from your story", "Stems delivery", "Producer quality mixing"],
      note: "Credit-based. No story-driven personalization.",
    },
    {
      name: "Fiverr Producer", logo: "F", url: "https://fiverr.com", color: "#1DBF73",
      priceRange: "$150–$800/song", priceMin: 150, priceMax: 800,
      includes: ["Custom song", "Some revisions"],
      missing: ["AI emotional analysis", "Same-day delivery", "Story integration", "Consistent quality"],
      note: "Human producer. $150 min. 1–2 weeks turnaround.",
    },
    {
      name: "SoundBetter", logo: "SB", url: "https://soundbetter.com", color: "#E63946",
      priceRange: "$500–$5,000/song", priceMin: 500, priceMax: 5000,
      includes: ["Custom song", "Studio quality", "Professional mixing"],
      missing: ["AI personalization", "Fast delivery", "Affordable pricing"],
      note: "Professional studio rates. Starting at $500/song.",
    },
  ],
  savingsVsCheapest: "Save vs $150+ freelancer",
  savingsVsMostExpensive: "Up to $4,921 saved vs studio",
  whyWeWin: [
    "Your story drives the lyrics and emotional tone — no generic prompts",
    "AI emotional analysis ensures the music mirrors your actual feelings",
    "Delivered in 3–5 days vs 1–2 weeks for freelancers",
    "Monthly subscription covers multiple songs — far cheaper than per-song studio rates",
    "Revisions included — freelancers charge extra or limit them",
  ],
  legalNote: "Prices compared: Suno Pro plan, Udio Standard plan, Fiverr music production category average, SoundBetter marketplace rates. All prices USD, current as of June 2026.",
};

export const VOICE_CLONING_COMPARISON: ProductComparison = {
  productSlugs: ["voice-cloning-studio"],
  headline: "Enterprise voice cloning without the enterprise price tag",
  subline: "Same technology as Fortune 500 voice systems — built for your story.",
  ghaafeediTiers: [
    { name: "Essential", price: 299, features: ["1 voice clone", "50 generations/mo", "Basic emotions", "Secure vault"] },
    { name: "Creator",   price: 599, features: ["2 voice clones", "Unlimited generations", "Full emotions", "All formats"] },
    { name: "Pro",       price: 999, features: ["5 voice clones", "API access", "Custom emotions", "White label"] },
  ],
  competitors: [
    {
      name: "ElevenLabs Professional", logo: "11", url: "https://elevenlabs.io", color: "#9333EA",
      priceRange: "$22–$330/mo", priceMin: 22, priceMax: 330,
      includes: ["Voice clone", "Character voices", "API access"],
      missing: ["One-time pricing", "Emotional story integration", "Physical keepsake"],
      note: "Subscription only. $22/mo Creator, $99/mo Pro, $330/mo Scale.",
    },
    {
      name: "Resemble AI", logo: "R", url: "https://resemble.ai", color: "#0F766E",
      priceRange: "$29–$500+/mo", priceMin: 29, priceMax: 500,
      includes: ["Voice clone", "API access", "Custom voices"],
      missing: ["One-time pricing", "Story integration", "Non-technical workflow"],
      note: "Developer-focused. Requires technical setup.",
    },
    {
      name: "Murf.ai", logo: "M", url: "https://murf.ai", color: "#F59E0B",
      priceRange: "$19–$166/mo", priceMin: 19, priceMax: 166,
      includes: ["Voice generation", "Basic cloning"],
      missing: ["True voice cloning fidelity", "Story-driven personalization", "One-time pricing"],
      note: "More TTS than true cloning. Lower emotional fidelity.",
    },
  ],
  savingsVsCheapest: "Save vs $22+/mo subscriptions",
  savingsVsMostExpensive: "One-time price vs $500+/mo",
  whyWeWin: [
    "One-time price — no recurring monthly subscription to cancel",
    "Emotionally-aware cloning integrated with your story vault",
    "Secure private storage — your voice data never shared",
    "Works for families preserving elderly voices — no tech knowledge needed",
    "Includes a memory experience, not just a raw API endpoint",
  ],
  legalNote: "Prices compared: ElevenLabs Creator/Pro/Scale plans, Resemble AI individual plan, Murf.ai Pro plan. Prices USD, current as of June 2026.",
};

export const NFT_COMPARISON: ProductComparison = {
  productSlugs: ["nft-collection"],
  headline: "Your story as NFT art — without the DIY gas fee nightmare",
  subline: "Full collection design, minting, and listing. One price, no surprises.",
  ghaafeediTiers: [
    { name: "Essential", price: 299, features: ["10-piece collection", "AI-generated art", "Ethereum minting", "OpenSea listing"] },
    { name: "Creator",   price: 599, features: ["25-piece collection", "Premium art styles", "Multi-chain", "Marketing kit"] },
    { name: "Pro",       price: 1299, features: ["100-piece collection", "Custom smart contract", "Whitelist system", "Launch support"] },
  ],
  competitors: [
    {
      name: "OpenSea DIY", logo: "O", url: "https://opensea.io", color: "#2081E2",
      priceRange: "$200–$800+ for 10 pieces", priceMin: 200, priceMax: 800,
      includes: ["Marketplace listing"],
      missing: ["Art creation", "Smart contract writing", "Collection design", "Marketing support"],
      note: "Minting fees + gas + art design + contract writing all separate costs.",
    },
    {
      name: "Midjourney + Dev", logo: "MJ", url: "https://midjourney.com", color: "#5865F2",
      priceRange: "$300–$1,500+ for full DIY stack", priceMin: 300, priceMax: 1500,
      includes: ["Image generation"],
      missing: ["Smart contract", "Minting", "Listing", "Story-driven personalization"],
      note: "Still need a developer to write and deploy the contract.",
    },
  ],
  savingsVsCheapest: "All-in vs $200+ just for minting",
  savingsVsMostExpensive: "Save vs $1,500+ DIY stack",
  whyWeWin: [
    "Art generated from your emotional story — not random prompts",
    "Full-service: design, mint, list, and market in one package",
    "No gas fee surprises — one fixed price covers everything",
    "Story metadata embedded in each NFT for authenticity",
    "No blockchain knowledge required",
  ],
  legalNote: "Gas fees and OpenSea marketplace rates current as of June 2026. Blockchain fees are variable. Ghaafeedi pricing does not fluctuate with gas prices.",
};

export const SOCIAL_CLIPS_COMPARISON: ProductComparison = {
  productSlugs: ["social-ready-clips"],
  headline: "Cinematic social clips in days, not weeks",
  subline: "Story-driven short-form content that stands apart from template tools.",
  ghaafeediTiers: [
    { name: "Essential", price: 49, features: ["3 clips", "9:16 + 16:9", "Captions", "MP4 delivery"] },
    { name: "Creator",   price: 99, features: ["8 clips", "All formats", "Brand kit", "Music included"] },
    { name: "Pro",       price: 199, features: ["20 clips", "Full series", "Strategy doc", "Priority turnaround"] },
  ],
  competitors: [
    {
      name: "Fiverr Videographer", logo: "F", url: "https://fiverr.com", color: "#1DBF73",
      priceRange: "$50–$400/clip", priceMin: 50, priceMax: 400,
      includes: ["Video editing"],
      missing: ["AI story analysis", "Emotional personalization", "Same-week delivery", "Music included"],
      note: "Human freelancer. 1–2 week turnaround per clip. Quality inconsistent.",
    },
    {
      name: "CapCut Pro", logo: "CC", url: "https://capcut.com", color: "#000000",
      priceRange: "$8–$13/mo + 20–40 hrs your time", priceMin: 8, priceMax: 13,
      includes: ["Editing templates", "Auto captions"],
      missing: ["Story-driven generation", "Original music", "Professional production", "Done-for-you"],
      note: "DIY tool. Requires significant time investment to learn and produce.",
    },
  ],
  savingsVsCheapest: "3 clips for $49 vs $150+ freelancer",
  savingsVsMostExpensive: "Save vs $400/clip agency rates",
  whyWeWin: [
    "Story-analyzed content, not generic B-roll templates",
    "Original AI-composed music included — no licensing issues",
    "Done-for-you production — zero editing skills needed",
    "Delivered in days, not weeks",
    "Priced per series, not per clip — scales with your content plan",
  ],
  legalNote: "Fiverr videography and short-form video editing category averages, CapCut Pro plan. USD, June 2026.",
};

export const SOPHIA_COMPARISON: ProductComparison = {
  productSlugs: ["sophia-ai"],
  headline: "24/7 emotional AI that knows your story",
  subline: "Not therapy. Not a chatbot. A presence built from your narrative.",
  ghaafeediTiers: [
    { name: "Essential", price: 29, features: ["50 conversations/mo", "Basic emotional analysis", "Story guidance"] },
    { name: "Creator",   price: 49, features: ["Unlimited conversations", "Deep analysis", "Priority responses", "Memory vault"] },
    { name: "Pro",       price: 79, features: ["Custom voice sessions", "1:1 story review", "VIP priority", "Dedicated producer line"] },
  ],
  competitors: [
    {
      name: "BetterHelp", logo: "BH", url: "https://betterhelp.com", color: "#5C9BE6",
      priceRange: "$60–$100/week ($240–$400/mo)", priceMin: 240, priceMax: 400,
      includes: ["Licensed therapist sessions", "Text + video sessions"],
      missing: ["24/7 availability", "Story archive", "Creative output (music/film)", "AI-driven insights"],
      note: "Professional therapy — a different product category. 8× more expensive.",
    },
    {
      name: "Replika Pro", logo: "RP", url: "https://replika.com", color: "#FF6B6B",
      priceRange: "$19.99/mo", priceMin: 20, priceMax: 20,
      includes: ["AI companion chat"],
      missing: ["Emotional story analysis", "Creative production", "Memory vault integration", "Your personal narrative"],
      note: "Generic AI companion. Not personalized to your story or memories.",
    },
    {
      name: "Character.ai Plus", logo: "C", url: "https://character.ai", color: "#7C3AED",
      priceRange: "$9.99/mo", priceMin: 10, priceMax: 10,
      includes: ["AI character chat"],
      missing: ["Emotional depth", "Story integration", "Personal memory", "Creative output"],
      note: "Entertainment-focused. No emotional intelligence or story personalization.",
    },
  ],
  savingsVsCheapest: "Same price as Replika — infinitely more personal",
  savingsVsMostExpensive: "Save $211–$371/mo vs therapy apps",
  whyWeWin: [
    "Sophia is built from your story — she knows your specific memories and emotions",
    "Available at 3am when no therapist or app is there",
    "Leads directly to creative output: songs, films, and experiences",
    "Not a substitute for therapy — a complement to your creative and emotional journey",
    "Lifelike presence with ElevenLabs voice and Simli lip-sync technology",
  ],
  legalNote: "Sophia AI is not a licensed therapist and does not provide medical or psychological advice. BetterHelp pricing current as of June 2026. Replika and Character.ai pricing current as of June 2026.",
};

export const FAMILY_VAULT_COMPARISON: ProductComparison = {
  productSlugs: ["family-vault"],
  headline: "A living legacy archive, not just cloud storage",
  subline: "Your family's history organized, narrated, and preserved — not just stored.",
  ghaafeediTiers: [
    { name: "Essential", price: 199, features: ["100GB vault", "5 users", "AI organization", "1-year hosting"] },
    { name: "Creator",   price: 349, features: ["500GB", "15 users", "AI tagging", "Family tree", "2-year hosting"] },
    { name: "Pro",       price: 599, features: ["Unlimited storage", "Unlimited users", "Legacy book", "Lifetime hosting"] },
  ],
  competitors: [
    {
      name: "Google Photos", logo: "G", url: "https://photos.google.com", color: "#4285F4",
      priceRange: "$3–$10/mo ongoing ($36–$120/yr)", priceMin: 36, priceMax: 120,
      includes: ["Photo + video storage", "Basic auto-organize"],
      missing: ["Family tree", "Legacy narrative", "Multi-generation sharing", "Physical legacy book", "Story integration"],
      note: "Storage only. No narrative, no legacy, no story structure.",
    },
    {
      name: "iCloud 2TB", logo: "iC", url: "https://apple.com/icloud", color: "#555555",
      priceRange: "$10/mo ($120/yr)", priceMin: 120, priceMax: 120,
      includes: ["2TB cloud storage", "Family sharing (5 people)"],
      missing: ["AI organization", "Legacy features", "Family tree", "Legacy book", "Non-Apple devices"],
      note: "Apple ecosystem only. Pure storage, no legacy features.",
    },
    {
      name: "Legacybox", logo: "LB", url: "https://legacybox.com", color: "#C05621",
      priceRange: "$200–$700 one-time", priceMin: 200, priceMax: 700,
      includes: ["Physical media digitization", "DVD + USB delivery"],
      missing: ["Cloud vault", "AI organization", "Family tree", "Ongoing hosting", "Story integration"],
      note: "Physical media scanning service only. No ongoing vault or AI features.",
    },
  ],
  savingsVsCheapest: "One price vs years of monthly subscriptions",
  savingsVsMostExpensive: "Full legacy vs basic storage at similar cost",
  whyWeWin: [
    "AI automatically organizes decades of media by person, date, and event",
    "Narrative layer: your vault tells a story, not just stores files",
    "Family tree integration connects media to the people in it",
    "Annual legacy book printed and shipped — a physical artifact",
    "One-time price includes long-term hosting — no subscription anxiety",
  ],
  legalNote: "Google Photos 2TB plan, iCloud 2TB plan, Legacybox standard pricing. USD, current as of June 2026.",
};

// ─── Map slug → comparison data ─────────────────────────────────────────────
export const FILM_SLUGS = [
  "cinematic-life-story",
  "couples-journey-film",
  "memorial-legacy-film",
  "cinematic-story-film",
  "dream-ai-visualization",
  "future-self-vision",
];

export const SONG_SLUGS = ["emotional-soundtrack", "signature-masterpiece", "relationship-healing"];

export function getComparisonType(slug: string): "film" | "song" | "voice" | "nft" | "social" | "sophia" | "vault" | null {
  if (FILM_SLUGS.includes(slug)) return "film";
  if (SONG_SLUGS.includes(slug)) return "song";
  if (slug === "voice-cloning-studio") return "voice";
  if (slug === "nft-collection") return "nft";
  if (slug === "social-ready-clips") return "social";
  if (slug === "sophia-ai") return "sophia";
  if (slug === "family-vault") return "vault";
  return null;
}

export function getNonFilmComparison(slug: string): ProductComparison | null {
  const type = getComparisonType(slug);
  switch (type) {
    case "song":   return SONG_COMPARISON;
    case "voice":  return VOICE_CLONING_COMPARISON;
    case "nft":    return NFT_COMPARISON;
    case "social": return SOCIAL_CLIPS_COMPARISON;
    case "sophia": return SOPHIA_COMPARISON;
    case "vault":  return FAMILY_VAULT_COMPARISON;
    default: return null;
  }
}

// ─── Hex grid savings badge text per product ─────────────────────────────────
export const HEX_SAVINGS_BADGE: Record<string, string> = {
  "cinematic-life-story":   "Save $4–$3,201 vs DIY — story + narration + concierge included",
  "couples-journey-film":   "Save $4–$1,601 vs DIY — story + narration + concierge included",
  "memorial-legacy-film":   "Save $4–$1,601 vs DIY — story + narration + concierge included",
  "cinematic-story-film":   "Save $4–$1,601 vs DIY — story + narration + concierge included",
  "dream-ai-visualization": "Save $4–$1,601 vs DIY — story + narration + concierge included",
  "future-self-vision":     "Save $4–$1,601 vs DIY — story + narration + concierge included",
  "emotional-soundtrack":   "Save vs $150+ freelancer",
  "signature-masterpiece":  "Save vs $500+ studio",
  "relationship-healing":   "Save vs $150+ freelancer",
  "voice-cloning-studio":   "Save vs $22+/mo recurring",
  "nft-collection":         "Save vs $200+ DIY minting",
  "social-ready-clips":     "3 clips from $49 vs $150+",
  "sophia-ai":              "Save $211+/mo vs therapy apps",
  "family-vault":           "One-time vs years of fees",
};

// ─── Checkout savings line by product slug ────────────────────────────────────
export const CHECKOUT_SAVINGS_LINE: Record<string, (price: number) => string | null> = {
  "cinematic-life-story":   (p) => `DIY on Runway/HiggsField costs ${(p + 104).toLocaleString()}–${(p + 3201).toLocaleString()} — with no story script, narration, or concierge`,
  "couples-journey-film":   (p) => `DIY on Runway/Pika/Kling costs ${(p + 1).toLocaleString()}–${(p + 1601).toLocaleString()} — with no story script, narration, or concierge`,
  "memorial-legacy-film":   (p) => `DIY on Runway/Pika/Kling costs ${(p + 1).toLocaleString()}–${(p + 1601).toLocaleString()} — with no story script, narration, or concierge`,
  "cinematic-story-film":   (p) => `DIY on Runway/Pika/Kling costs ${(p + 1).toLocaleString()}–${(p + 1601).toLocaleString()} — with no story script, narration, or concierge`,
  "dream-ai-visualization": (p) => `DIY on Runway/Pika/Kling costs ${(p + 1).toLocaleString()}–${(p + 1601).toLocaleString()} — with no story script, narration, or concierge`,
  "future-self-vision":     (p) => `DIY on Runway/Pika/Kling costs ${(p + 1).toLocaleString()}–${(p + 1601).toLocaleString()} — with no story script, narration, or concierge`,
  "emotional-soundtrack":   (_p) => `Freelance producers charge $150–$800 per song`,
  "signature-masterpiece":  (_p) => `Studio production starts at $500 per song`,
  "relationship-healing":   (_p) => `Comparable freelancer work runs $150–$800 per song`,
  "voice-cloning-studio":   (_p) => `ElevenLabs and Resemble AI charge $22–$500/mo recurring`,
  "nft-collection":         (p) => `DIY minting + design + contract deployment costs $200–$1,500+`,
  "social-ready-clips":     (_p) => `Fiverr videographers charge $50–$400 per clip`,
  "sophia-ai":              (_p) => `Therapy apps charge $240–$400/mo for less personalization`,
  "family-vault":           (_p) => `Years of Google Photos + Legacybox digitization costs more long-term`,
};
