/**
 * Production Memory Layer — Ghaafeedi Music
 *
 * Stores ALL creative production data per customer into Engram:
 *   - Emotional analysis scores + fingerprint + arc
 *   - Song metadata (title, genre, BPM, lyrics)
 *   - Director shot list (cinematic orchestration plan)
 *   - Mood images (emotional arc visuals)
 *   - Completed job outputs (audio URL, video URL)
 *
 * Agent namespace: production_{userId}
 * All calls are fire-and-forget — never blocks the main pipeline.
 * Fallback: silently returns if engram unreachable.
 */

import { EngramClient } from "./engram-client";

const AGENT = (userId: string) => `production_${userId}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmotionalAnalysis {
  userId:              string;
  storyText:           string;
  emotionalFingerprint: string[];   // e.g. ["Nostalgic", "Resilient", "Devoted"]
  emotionalArc:        string;      // e.g. "A journey from grief to gratitude"
  songTitle:           string;
  profileSummary:      string;
  scores: {
    key:     string;
    label:   string;
    score:   number;
    insight: string;
    reason:  string;
  }[];
}

export interface SongCreation {
  userId:      string;
  orderId?:    string;
  title:       string;
  genre:       string;
  subgenre?:   string;
  bpm:         number;
  key?:        string;
  mood:        string[];
  instruments: string[];
  vocalStyle?: string;
  lyrics: {
    verse1:      string;
    chorus:      string;
    verse2:      string;
    bridge:      string;
    outroChorus: string;
  };
  sunoPrompt?: string;
  audioUrl?:   string;   // populated when Poyo.ai returns
  duration?:   number;   // seconds
}

export interface DirectorShotList {
  userId:       string;
  orderId?:     string;
  songTitle:    string;
  totalShots:   number;
  totalSeconds: number;
  shots: {
    shotNumber:    number;
    lyricsSection: string;
    cameraMove:    string;
    subject:       string;
    setting:       string;
    lighting:      string;
    mood:          string;
    duration:      number;
    sunoPrompt?:   string;
  }[];
}

export interface MoodImageSet {
  userId:              string;
  emotionalFingerprint: string[];
  images: {
    emotion:  string;
    imageUrl: string;
    prompt:   string;
  }[];
}

export interface CompletedDeliverable {
  userId:      string;
  orderId:     string;
  productType: string;
  jobId:       string;
  outputUrl:   string;   // R2 / CDN URL
  outputType:  "audio" | "video" | "image" | "lyrics" | "storyboard";
  durationSec?: number;
  metadata?:   Record<string, unknown>;
}

// ─── Store Emotional Analysis ─────────────────────────────────────────────────

/**
 * Called after POST /api/onboarding/analyze completes.
 * Stores the full emotional profile — scores, arc, fingerprint, song title.
 */
export async function persistEmotionalAnalysis(data: EmotionalAnalysis): Promise<void> {
  try {
    const { userId, emotionalFingerprint, emotionalArc, songTitle, profileSummary, scores } = data;

    // 1. Emotional fingerprint + arc
    await EngramClient.store({
      agentId:           AGENT(userId),
      content:           `Emotional profile — Arc: "${emotionalArc}" | Fingerprint: ${emotionalFingerprint.join(", ")} | Suggested title: "${songTitle}"`,
      memoryType:        "fact",
      subjectExternalId: userId,
      confidence:        0.95,
      source:            "agent",
      metadata: {
        emotionalFingerprint,
        emotionalArc,
        songTitle,
        profileSummary,
      },
    });

    // 2. Individual scores
    const scoreLines = scores.map((s) => `${s.label}: ${s.score}/100 — ${s.insight}`).join(" | ");
    await EngramClient.store({
      agentId:           AGENT(userId),
      content:           `Emotional scores — ${scoreLines}`,
      memoryType:        "fact",
      subjectExternalId: userId,
      confidence:        0.9,
      source:            "agent",
      metadata: { scores },
    });

    // 3. Profile summary (most personal — high confidence)
    await EngramClient.store({
      agentId:           AGENT(userId),
      content:           `Customer emotional profile: "${profileSummary}"`,
      memoryType:        "fact",
      subjectExternalId: userId,
      confidence:        0.98,
      source:            "agent",
      metadata: { profileSummary },
    });

  } catch (err) {
    console.warn("[ProductionMemory] persistEmotionalAnalysis error:", (err as Error).message);
  }
}

// ─── Store Song Creation ──────────────────────────────────────────────────────

/**
 * Called after /api/onboarding/generate-song completes (with or without audio URL).
 * Stores full lyrics, metadata, and audio URL if available.
 */
export async function persistSongCreation(data: SongCreation): Promise<void> {
  try {
    const { userId, title, genre, bpm, mood, instruments, lyrics, audioUrl } = data;

    // 1. Song identity + metadata
    await EngramClient.store({
      agentId:           AGENT(userId),
      content:           `Song created: "${title}" | ${genre} | ${bpm} BPM | Mood: ${mood.join(", ")} | Instruments: ${instruments.join(", ")}${audioUrl ? ` | Audio: ${audioUrl}` : ""}`,
      memoryType:        "fact",
      subjectExternalId: userId,
      confidence:        0.95,
      source:            "agent",
      metadata: {
        title,
        genre,
        subgenre:   data.subgenre,
        bpm,
        key:        data.key,
        mood,
        instruments,
        vocalStyle: data.vocalStyle,
        audioUrl,
        orderId:    data.orderId,
        duration:   data.duration,
      },
    });

    // 2. Full lyrics — stored separately so Sophia can recall and reference them
    const fullLyrics =
      `[Verse 1]\n${lyrics.verse1}\n\n` +
      `[Chorus]\n${lyrics.chorus}\n\n` +
      `[Verse 2]\n${lyrics.verse2}\n\n` +
      `[Bridge]\n${lyrics.bridge}\n\n` +
      `[Outro Chorus]\n${lyrics.outroChorus}`;

    await EngramClient.store({
      agentId:           AGENT(userId),
      content:           `Lyrics for "${title}":\n${fullLyrics}`,
      memoryType:        "fact",
      subjectExternalId: userId,
      confidence:        1.0,
      source:            "agent",
      metadata: { title, lyrics, orderId: data.orderId },
    });

    // 3. Suno generation prompt (useful for regeneration / style matching)
    if (data.sunoPrompt) {
      await EngramClient.store({
        agentId:           AGENT(userId),
        content:           `Music generation prompt for "${title}": ${data.sunoPrompt}`,
        memoryType:        "fact",
        subjectExternalId: userId,
        confidence:        0.85,
        source:            "agent",
        metadata: { title, sunoPrompt: data.sunoPrompt },
      });
    }

  } catch (err) {
    console.warn("[ProductionMemory] persistSongCreation error:", (err as Error).message);
  }
}

// ─── Store Director Shot List ─────────────────────────────────────────────────

/**
 * Called after the cinematic orchestration pipeline generates a shot plan.
 * Stores the full director's shot list per customer.
 */
export async function persistDirectorShotList(data: DirectorShotList): Promise<void> {
  try {
    const { userId, songTitle, totalShots, totalSeconds, shots } = data;

    // 1. Shot list summary
    await EngramClient.store({
      agentId:           AGENT(userId),
      content:           `Director shot list for "${songTitle}" — ${totalShots} shots, ${totalSeconds}s total runtime`,
      memoryType:        "fact",
      subjectExternalId: userId,
      confidence:        0.92,
      source:            "agent",
      metadata: {
        songTitle,
        totalShots,
        totalSeconds,
        orderId: data.orderId,
      },
    });

    // 2. Full shot list detail (cinematic orchestration data)
    const shotLines = shots.map((s) =>
      `Shot ${s.shotNumber} [${s.lyricsSection}]: ${s.cameraMove} — ${s.subject} in ${s.setting}, ${s.lighting} lighting, ${s.mood} mood, ${s.duration}s`
    ).join("\n");

    await EngramClient.store({
      agentId:           AGENT(userId),
      content:           `Cinematic shot plan for "${songTitle}":\n${shotLines}`,
      memoryType:        "fact",
      subjectExternalId: userId,
      confidence:        0.9,
      source:            "agent",
      metadata: { songTitle, shots, orderId: data.orderId },
    });

  } catch (err) {
    console.warn("[ProductionMemory] persistDirectorShotList error:", (err as Error).message);
  }
}

// ─── Store Mood Images ────────────────────────────────────────────────────────

/**
 * Called after /api/onboarding/generate-mood-images completes.
 * Stores each emotion + image URL so Sophia can reference them.
 */
export async function persistMoodImages(data: MoodImageSet): Promise<void> {
  try {
    const { userId, emotionalFingerprint, images } = data;

    const imageLines = images.map((img) => `${img.emotion}: ${img.imageUrl}`).join(" | ");

    await EngramClient.store({
      agentId:           AGENT(userId),
      content:           `Emotional arc mood images — Fingerprint: ${emotionalFingerprint.join(", ")} | ${imageLines}`,
      memoryType:        "fact",
      subjectExternalId: userId,
      confidence:        0.88,
      source:            "agent",
      metadata: { emotionalFingerprint, images },
    });

  } catch (err) {
    console.warn("[ProductionMemory] persistMoodImages error:", (err as Error).message);
  }
}

// ─── Store Completed Deliverable ──────────────────────────────────────────────

/**
 * Called when any job completes and output URL is available.
 * Stores the final deliverable link per customer.
 */
export async function persistCompletedDeliverable(data: CompletedDeliverable): Promise<void> {
  try {
    const { userId, orderId, productType, jobId, outputUrl, outputType } = data;

    await EngramClient.store({
      agentId:           AGENT(userId),
      content:           `Completed ${outputType} deliverable for ${productType} (order: ${orderId}): ${outputUrl}`,
      memoryType:        "fact",
      subjectExternalId: userId,
      confidence:        1.0,
      source:            "agent",
      metadata: {
        orderId,
        productType,
        jobId,
        outputUrl,
        outputType,
        durationSec: data.durationSec,
        ...data.metadata,
      },
    });

  } catch (err) {
    console.warn("[ProductionMemory] persistCompletedDeliverable error:", (err as Error).message);
  }
}

// ─── Recall All Production Data for a Customer ───────────────────────────────

/**
 * Recall everything stored for a customer — used by Sophia to give
 * deeply personalized responses about their productions.
 */
export async function recallProductionHistory(
  userId: string,
  query: string,
): Promise<string> {
  try {
    const memories = await EngramClient.recall({
      agentId:           AGENT(userId),
      query,
      subjectExternalId: userId,
      limit:             12,
      minConfidence:     0.5,
    });

    if (!memories.length) return "";

    const lines = memories.map((m) => `• ${m.content}`).join("\n");
    return `\n\n═══ CUSTOMER PRODUCTION HISTORY ═══\n${lines}\n══════════════════════════════════`;
  } catch {
    return "";
  }
}
