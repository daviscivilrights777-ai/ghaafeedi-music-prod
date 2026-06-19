// ============================================================
// Ghaafeedi Music — Shot List Schema
// Granular per-clip production order. One ShotList per
// ProductionBible. Each Shot drives one `clip_batch` job.
// ============================================================

export type ShotType =
  | "establishing"   // wide / scene-setting
  | "character"      // close-up / portrait
  | "action"         // movement / event
  | "cutaway"        // reaction / detail
  | "montage"        // rapid sequence
  | "title"          // text overlay
  | "transition";    // bridge between acts

export type CameraMotion =
  | "static"
  | "slow_push"
  | "pull_back"
  | "pan_right"
  | "pan_left"
  | "orbit"
  | "tilt_up"
  | "tilt_down"
  | "handheld";

export interface Shot {
  shotIndex: number;       // 0-based, sequential
  sceneIndex: number;      // which scene this belongs to
  type: ShotType;
  durationSeconds: number; // target clip duration
  
  // Visual spec
  cameraMotion: CameraMotion;
  subject: string;         // who/what is in frame
  setting: string;         // where / environment
  lighting: string;        // "golden hour warm" | "cool blue night" | etc.
  colorGrading: string;    // CSS filter or LUT reference

  // Generation prompts
  falPrompt: string;       // primary — FAL.ai / Kling
  modalPrompt: string;     // secondary — Modal fallback
  negativePrompt?: string; // what to avoid

  // Audio sync
  audioStartSeconds: number;   // when in the audio track this shot starts
  audioEndSeconds: number;
  hasNarration: boolean;

  // Style memory
  styleEmbeddingRef?: string;  // pgvector ref for consistency (Phase 10)
  referenceImageKey?: string;  // R2 key for style reference image

  // Status (set during execution)
  status?: "pending" | "generating" | "complete" | "failed";
  jobId?: string;          // `clip_batch` job id for this shot
  outputKey?: string;      // R2 key of the generated clip
  outputUrl?: string;      // CDN URL
  retryCount?: number;
}

export interface ShotList {
  version: "1.0";
  productionId: string;
  productionBibleVersion: string;  // SHA-256 of source ProductionBible
  generatedAt: string;

  totalShots: number;
  totalDurationSeconds: number;
  shots: Shot[];

  // Assembly spec (used by edit_assemble job)
  assemblyOrder: number[];         // indices in playback order
  crossfadeDurationMs: number;     // between shots
  creditsDurationSeconds: number;  // end slate

  // Metadata
  productSlug: string;
  tier: "starter" | "premium" | "elite";
}

// ─── Validation ───────────────────────────────────────────────
export function validateShotList(obj: unknown): obj is ShotList {
  if (!obj || typeof obj !== "object") return false;
  const s = obj as Partial<ShotList>;
  return (
    s.version === "1.0" &&
    typeof s.productionId === "string" &&
    Array.isArray(s.shots) &&
    s.shots.length === s.totalShots &&
    Array.isArray(s.assemblyOrder)
  );
}

// ─── Helper — extract pending shots ──────────────────────────
export function getPendingShots(list: ShotList): Shot[] {
  return list.shots.filter((s) => !s.status || s.status === "pending");
}

export function getCompletedShots(list: ShotList): Shot[] {
  return list.shots.filter((s) => s.status === "complete" && s.outputKey);
}

export function isShotListComplete(list: ShotList): boolean {
  return list.shots.every((s) => s.status === "complete");
}
