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
  userId:               string;
  storyText:            string;
  emotionalFingerprint: string[];
  emotionalArc:         string;
  songTitle:            string;
  profileSummary:       string;
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
  audioUrl?:   string;
  duration?:   number;
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
  userId:               string;
  emotionalFingerprint: string[];
  images: {
    emotion:  string;
    imageUrl: string;
    prompt:   string;
  }[];
}

export interface CompletedDeliverable {
  userId:       string;
  orderId:      string;
  productType:  string;
  jobId:        string;
  outputUrl:    string;
  outputType:   "audio" | "video" | "image" | "lyrics" | "storyboard";
  durationSec?: number;
  metadata?:    Record<string, unknown>;
}

// ─── Store Emotional Analysis ─────────────────────────────────────────────────

export async function persistEmotionalAnalysis(data: EmotionalAnalysis): Promise<void> {
  try {
    const { userId, emotionalFingerprint, emotionalArc, songTitle, profileSummary, scores } = data;

    await EngramClient.store(
      AGENT(userId),
      `Emotional profile — Arc: "${emotionalArc}" | Fingerprint: ${emotionalFingerprint.join(", ")} | Suggested title: "${songTitle}"`,
      { emotionalFingerprint, emotionalArc, songTitle, profileSummary, type: "emotional_profile" },
    );

    const scoreLines = scores.map((s) => `${s.label}: ${s.score}/100 — ${s.insight}`).join(" | ");
    await EngramClient.store(
      AGENT(userId),
      `Emotional scores — ${scoreLines}`,
      { scores, type: "emotional_scores" },
    );

    await EngramClient.store(
      AGENT(userId),
      `Customer emotional profile: "${profileSummary}"`,
      { profileSummary, type: "profile_summary" },
    );
  } catch (err) {
    console.warn("[ProductionMemory] persistEmotionalAnalysis error:", (err as Error).message);
  }
}

// ─── Store Song Creation ──────────────────────────────────────────────────────

export async function persistSongCreation(data: SongCreation): Promise<void> {
  try {
    const { userId, title, genre, bpm, mood, instruments, lyrics, audioUrl } = data;

    await EngramClient.store(
      AGENT(userId),
      `Song created: "${title}" | ${genre} | ${bpm} BPM | Mood: ${mood.join(", ")} | Instruments: ${instruments.join(", ")}${audioUrl ? ` | Audio: ${audioUrl}` : ""}`,
      { title, genre, subgenre: data.subgenre, bpm, key: data.key, mood, instruments, vocalStyle: data.vocalStyle, audioUrl, orderId: data.orderId, duration: data.duration, type: "song_metadata" },
    );

    const fullLyrics =
      `[Verse 1]\n${lyrics.verse1}\n\n` +
      `[Chorus]\n${lyrics.chorus}\n\n` +
      `[Verse 2]\n${lyrics.verse2}\n\n` +
      `[Bridge]\n${lyrics.bridge}\n\n` +
      `[Outro Chorus]\n${lyrics.outroChorus}`;

    await EngramClient.store(
      AGENT(userId),
      `Lyrics for "${title}":\n${fullLyrics}`,
      { title, lyrics, orderId: data.orderId, type: "lyrics" },
    );

    if (data.sunoPrompt) {
      await EngramClient.store(
        AGENT(userId),
        `Music generation prompt for "${title}": ${data.sunoPrompt}`,
        { title, sunoPrompt: data.sunoPrompt, type: "music_prompt" },
      );
    }
  } catch (err) {
    console.warn("[ProductionMemory] persistSongCreation error:", (err as Error).message);
  }
}

// ─── Store Director Shot List ─────────────────────────────────────────────────

export async function persistDirectorShotList(data: DirectorShotList): Promise<void> {
  try {
    const { userId, songTitle, totalShots, totalSeconds, shots } = data;

    await EngramClient.store(
      AGENT(userId),
      `Director shot list for "${songTitle}" — ${totalShots} shots, ${totalSeconds}s total runtime`,
      { songTitle, totalShots, totalSeconds, orderId: data.orderId, type: "shot_list_summary" },
    );

    const shotLines = shots.map((s) =>
      `Shot ${s.shotNumber} [${s.lyricsSection}]: ${s.cameraMove} — ${s.subject} in ${s.setting}, ${s.lighting} lighting, ${s.mood} mood, ${s.duration}s`
    ).join("\n");

    await EngramClient.store(
      AGENT(userId),
      `Cinematic shot plan for "${songTitle}":\n${shotLines}`,
      { songTitle, shots, orderId: data.orderId, type: "shot_list_detail" },
    );
  } catch (err) {
    console.warn("[ProductionMemory] persistDirectorShotList error:", (err as Error).message);
  }
}

// ─── Store Mood Images ────────────────────────────────────────────────────────

export async function persistMoodImages(data: MoodImageSet): Promise<void> {
  try {
    const { userId, emotionalFingerprint, images } = data;
    const imageLines = images.map((img) => `${img.emotion}: ${img.imageUrl}`).join(" | ");

    await EngramClient.store(
      AGENT(userId),
      `Emotional arc mood images — Fingerprint: ${emotionalFingerprint.join(", ")} | ${imageLines}`,
      { emotionalFingerprint, images, type: "mood_images" },
    );
  } catch (err) {
    console.warn("[ProductionMemory] persistMoodImages error:", (err as Error).message);
  }
}

// ─── Store Completed Deliverable ──────────────────────────────────────────────

export async function persistCompletedDeliverable(data: CompletedDeliverable): Promise<void> {
  try {
    const { userId, orderId, productType, jobId, outputUrl, outputType } = data;

    await EngramClient.store(
      AGENT(userId),
      `Completed ${outputType} deliverable for ${productType} (order: ${orderId}): ${outputUrl}`,
      { orderId, productType, jobId, outputUrl, outputType, durationSec: data.durationSec, ...data.metadata, type: "deliverable" },
    );
  } catch (err) {
    console.warn("[ProductionMemory] persistCompletedDeliverable error:", (err as Error).message);
  }
}

// ─── Recall All Production Data for a Customer ───────────────────────────────

export async function recallProductionHistory(
  userId: string,
  query: string,
): Promise<string> {
  try {
    const results = await EngramClient.search(AGENT(userId), query, 12);
    if (!results.length) return "";

    const lines = results.map((m) => `• ${m.content_preview}`).join("\n");
    return `\n\n═══ CUSTOMER PRODUCTION HISTORY ═══\n${lines}\n══════════════════════════════════`;
  } catch {
    return "";
  }
}
