// ============================================================
// Ghaafeedi Music — Production Bible Schema
// Detailed creative blueprint for a single production run.
// Generated from StoryBible → drives shot lists + music brief.
// ============================================================

import type { StoryBible } from "./story-bible.schema";

export type ProductionTier = "starter" | "premium" | "elite";

// Shot count limits per tier (enforced, never exceeded)
export const MAX_SHOTS: Record<ProductionTier, number> = {
  starter: 1,
  premium: 3,
  elite:   6,
};

export interface AudioBrief {
  genre: string;           // "cinematic orchestral" | "R&B ballad" | "ambient" | etc.
  tempo: string;           // "60 BPM slow ballad" | "90 BPM mid-tempo" | etc.
  mood: string;            // maps to Sunor.cc mood tags
  instruments: string[];   // key instruments
  lyrics?: string;         // pre-written lyrics if product includes them
  vocalStyle?: string;     // "soulful female" | "deep male" | etc.
  duration: number;        // target duration in seconds
  sunoPrompt: string;      // fully formatted Poyo.ai / Suno V5 generation prompt
}

export interface NarrationBrief {
  script: string;          // full voiceover script
  voice: string;           // ElevenLabs voice ID
  style: "conversational" | "cinematic" | "documentary" | "intimate";
  pacing: "slow" | "medium" | "fast";
  emotionalBeat: string;   // what should the delivery feel like
  durationTarget: number;  // seconds
}

export interface VisualDirection {
  cinematicStyle: string;  // "golden hour nostalgia" | "dark cinematic" | etc.
  colorGrading: string;    // "warm teal-orange" | "cool blue desaturation" | etc.
  aspectRatio: "16:9" | "9:16" | "1:1";
  resolution: "1280x720" | "1920x1080";
  renderQuality: "standard" | "premium";
  transitionStyle: string; // "dissolve" | "match-cut" | "whip-pan" | etc.
}

export interface ProductionScene {
  sceneIndex: number;
  title: string;           // "Opening — The Last Summer"
  emotionalBeat: string;   // what the audience should feel here
  durationSeconds: number;
  visualPrompt: string;    // FAL.ai/Modal generation prompt
  audioNote: string;       // which part of the audio track plays here
  narrationSegment?: string; // voiceover segment for this scene
  bRollKeywords: string[]; // fallback stock footage search terms
}

export interface ProductionBible {
  version: "1.0";
  productionId: string;
  storyBibleVersion: string; // SHA-256 of source StoryBible
  generatedAt: string;       // ISO timestamp

  // Budget
  tier: ProductionTier;
  maxShots: number;          // from MAX_SHOTS[tier]
  totalDurationSeconds: number;

  // Creative briefs
  audio: AudioBrief;
  narration: NarrationBrief;
  visual: VisualDirection;

  // Scene breakdown
  scenes: ProductionScene[];

  // Delivery spec
  deliveryFormat: "mp4" | "mp3" | "mp4+mp3";
  watermark: boolean;        // false for paid tiers
  deliveryDeadlineHours: number;

  // Derived from StoryBible
  title: string;
  logline: string;
  primaryEmotion: string;
  productSlug: string;

  // AI metadata
  aiModel: string;
  anthropicUsed: boolean;    // true if Claude was used (better creative output)
}

// ─── Validation ───────────────────────────────────────────────
export function validateProductionBible(obj: unknown): obj is ProductionBible {
  if (!obj || typeof obj !== "object") return false;
  const b = obj as Partial<ProductionBible>;
  return (
    b.version === "1.0" &&
    typeof b.productionId === "string" &&
    typeof b.tier === "string" &&
    typeof b.maxShots === "number" &&
    b.maxShots >= 1 && b.maxShots <= 6 &&
    typeof b.audio === "object" &&
    typeof b.narration === "object" &&
    typeof b.visual === "object" &&
    Array.isArray(b.scenes) &&
    b.scenes.length <= b.maxShots
  );
}

// ─── Builder helpers ──────────────────────────────────────────
export function buildProductionBibleFromStory(
  story: StoryBible,
  productionId: string,
  tier: ProductionTier,
  productSlug: string
): Partial<ProductionBible> {
  const maxShots = MAX_SHOTS[tier];
  const isFilm = productSlug.includes("film") || productSlug.includes("video");

  return {
    version: "1.0",
    productionId,
    tier,
    maxShots,
    totalDurationSeconds: isFilm ? (tier === "elite" ? 300 : tier === "premium" ? 120 : 60) : 180,
    deliveryFormat: isFilm ? "mp4" : "mp3",
    watermark: false,
    deliveryDeadlineHours: tier === "elite" ? 24 : tier === "premium" ? 48 : 72,
    title: story.title,
    logline: story.logline,
    primaryEmotion: story.primaryEmotion,
    productSlug,
  };
}
