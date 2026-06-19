// ============================================================
// Ghaafeedi Music — Story Bible Schema
// The foundational narrative document extracted from customer
// intake data. Drives all downstream production stages.
// ============================================================

export interface EmotionalArc {
  opening: string;      // emotional state at beginning
  inciting: string;     // the pivotal moment / turning point
  climax: string;       // peak emotional moment
  resolution: string;   // where the story lands
}

export interface Character {
  role: "subject" | "supporting" | "narrator";
  description: string;  // physical / emotional descriptor
  relationship?: string; // relationship to primary subject
}

export interface ThematicPillar {
  theme: string;        // love | loss | triumph | hope | nostalgia | healing
  weight: number;       // 0-1, how dominant is this theme
  visualMotif: string;  // what imagery embodies this theme
}

export interface StoryBible {
  version: "1.0";
  productionId: string;
  userId: string;
  orderId?: string;
  generatedAt: string;  // ISO timestamp

  // Core narrative
  title: string;        // working title for the production
  logline: string;      // one-sentence essence of the story
  emotionalArc: EmotionalArc;
  characters: Character[];

  // Thematic DNA
  thematicPillars: ThematicPillar[];
  primaryEmotion: string;     // dominant emotion label
  emotionScores: Record<string, number>; // from S5 analysis

  // World-building
  timespan?: string;          // "3 years" | "one summer" | etc.
  locations?: string[];       // real or metaphorical places
  culturalContext?: string;   // relevant cultural notes

  // Creative direction
  tone: "cinematic" | "intimate" | "epic" | "bittersweet" | "triumphant" | "elegiac";
  pacing: "slow-burn" | "mid-tempo" | "dynamic" | "montage";
  colorPalette: string[];     // 3-5 hex values that feel right
  musicalMood: string;        // genre + tempo guidance for Sunor

  // Source material digest
  rawInputDigest: string;     // SHA-256 of source text (non-PII)
  keyPhrases: string[];       // extracted verbatim phrases worth preserving
  suggestedTitle?: string;    // AI-suggested final title

  // Metadata
  productSlug: string;
  tier: "starter" | "premium" | "elite";
  aiModel: string;            // which model generated this
  confidenceScore?: number;   // 0-1
}

// ─── Validation ───────────────────────────────────────────────
export function validateStoryBible(obj: unknown): obj is StoryBible {
  if (!obj || typeof obj !== "object") return false;
  const b = obj as Partial<StoryBible>;
  return (
    b.version === "1.0" &&
    typeof b.productionId === "string" &&
    typeof b.userId === "string" &&
    typeof b.title === "string" &&
    typeof b.logline === "string" &&
    typeof b.emotionalArc === "object" &&
    Array.isArray(b.thematicPillars) &&
    typeof b.primaryEmotion === "string" &&
    typeof b.tone === "string" &&
    typeof b.pacing === "string" &&
    Array.isArray(b.keyPhrases)
  );
}
