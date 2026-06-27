// ============================================================
// Ghaafeedi Music — Style Genome Schema
// Captures the visual + audio DNA of a completed production
// for cross-production consistency and style memory (Phase 10).
// Stored alongside pgvector embedding for similarity search.
// ============================================================

export interface ColorDNA {
  dominantPalette: string[];   // 5 hex values from final output
  shadowTone: string;          // hex
  highlightTone: string;       // hex
  midtone: string;             // hex
  temperature: "warm" | "cool" | "neutral";
  saturation: "vivid" | "muted" | "desaturated";
}

export interface VisualDNA {
  cinematicStyle: string;      // detected/assigned style label
  colorGrading: ColorDNA;
  aspectRatio: string;
  averageShotDurationSeconds: number;
  cameraMotionProfile: string[];  // dominant motions used
  lightingProfile: string;
}

export interface AudioDNA {
  genre: string;
  tempo: number;               // BPM
  keySignature?: string;
  vocalPresence: boolean;
  instrumentalProfile: string[];
  energyLevel: number;         // 0-1
  emotionalValence: number;    // -1 (negative) to +1 (positive)
}

export interface StyleGenome {
  version: "1.0";
  productionId: string;
  userId: string;
  createdAt: string;           // ISO timestamp

  // Visual + audio DNA
  visual: VisualDNA;
  audio: AudioDNA;

  // Emotional fingerprint
  primaryEmotion: string;
  emotionVector: number[];     // 5-dim from S5 scoring [joy, sadness, love, nostalgia, hope]

  // pgvector embedding (Phase 10)
  embeddingModel?: string;     // "text-embedding-3-small"
  embeddingDimensions?: number; // 1536

  // Reference assets for future productions
  referenceFrameKeys: string[];   // R2 keys of representative frames
  referencePaletteKey?: string;   // R2 key of color palette image

  // Usage
  usedInProductionIds: string[];  // productions that referenced this genome
  qualityScore?: number;          // 0-1, set after QC
  approved: boolean;
}

// ─── Similarity helpers (Phase 10) ───────────────────────────
export function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vector dimension mismatch");
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function buildEmotionVector(scores: Record<string, number>): number[] {
  const keys = ["joy", "sadness", "love", "nostalgia", "hope"];
  return keys.map((k) => scores[k] ?? 0);
}
