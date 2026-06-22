/**
 * Ghaafeedi Music — Cinematic Continuity Bridge
 * Phase C: I2V seeding — extracts last frame of clip[N], uploads to R2,
 * injects as start_frame_url into clip[N+1]'s generation params.
 *
 * This guarantees visual continuity across every scene seam:
 *   - Same lighting bleeds forward
 *   - Same color grade locks
 *   - Character/environment position continues naturally
 *
 * Integration points:
 *   1. After clip_batch job[i] completes → extract its last frame
 *   2. Before clip[i+1] is dispatched → inject start_frame_url
 *   3. On edit_assemble → full xfade assembly via assemble_story.py
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ─── R2 upload helper (reuses existing R2 env) ────────────────────────────────

async function uploadFrameToR2(
  framePath: string,
  r2Key: string,
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const accountId  = process.env.CLOUDFLARE_R2_ACCOUNT_ID  || process.env.R2_ACCOUNT_ID  || "";
  const accessKey  = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY || "";
  const secretKey  = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY || "";
  const bucket     = process.env.CLOUDFLARE_R2_BUCKET || "ghaafeedi-media";
  const publicUrl  = process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://pub-bc7b203485814e1186102277ad450211.r2.dev";

  if (!accountId || !accessKey || !secretKey) {
    throw new Error("[ContinuityBridge] R2 credentials not configured");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  const body = fs.readFileSync(framePath);
  await client.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         r2Key,
    Body:        body,
    ContentType: "image/png",
  }));

  return `${publicUrl}/${r2Key}`;
}


// ─── Frame extraction ─────────────────────────────────────────────────────────

export function extractLastFrame(
  clipPath: string,
  outputPng: string,
  offsetFromEnd = 0.2,
): void {
  // Get duration
  const durationOut = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${clipPath}"`,
    { encoding: "utf8" },
  ).trim();
  const duration = parseFloat(durationOut);
  const seekT = Math.max(0, duration - offsetFromEnd);

  execSync(
    `ffmpeg -y -ss ${seekT} -i "${clipPath}" -vframes 1 -q:v 2 "${outputPng}"`,
    { stdio: "pipe" },
  );
}


// ─── ContinuityBridgeManager ──────────────────────────────────────────────────

export interface ContinuityFrame {
  fromClipIndex:  number;
  toClipIndex:    number;
  localPath:      string;
  r2Url?:         string;
  pipelineRunId:  string;
  extractedAt:    Date;
}

const _frameStore = new Map<string, ContinuityFrame[]>();
// key: pipelineRunId → sorted list of continuity frames


/**
 * Call this immediately after clip[i] is downloaded / confirmed complete.
 * Extracts last frame, uploads to R2, stores for injection into clip[i+1].
 *
 * @param clipLocalPath  — local path to the completed clip (mp4)
 * @param clipIndex      — 0-based index of this clip within the story
 * @param totalClips     — total number of clips in story (to know if there's a next)
 * @param pipelineRunId  — pipeline run identifier for grouping
 * @returns              — ContinuityFrame record, or null if last clip
 */
export async function registerCompletedClip(
  clipLocalPath: string,
  clipIndex:     number,
  totalClips:    number,
  pipelineRunId: string,
): Promise<ContinuityFrame | null> {
  // Last clip — no next to seed
  if (clipIndex >= totalClips - 1) {
    console.log(`[ContinuityBridge] clip ${clipIndex} is last — no continuity frame needed`);
    return null;
  }

  const frameDir = path.join("/tmp", "ghaafeedi_continuity", pipelineRunId);
  fs.mkdirSync(frameDir, { recursive: true });
  const framePath = path.join(frameDir, `frame_${clipIndex}_to_${clipIndex + 1}.png`);

  console.log(`[ContinuityBridge] Extracting last frame: clip[${clipIndex}] → ${path.basename(framePath)}`);
  extractLastFrame(clipLocalPath, framePath);

  const sizeKB = Math.round(fs.statSync(framePath).size / 1024);
  console.log(`[ContinuityBridge] Frame extracted: ${sizeKB}KB`);

  // Upload to R2
  let r2Url: string | undefined;
  try {
    const r2Key = `continuity/${pipelineRunId}/frame_${clipIndex}_to_${clipIndex + 1}.png`;
    r2Url = await uploadFrameToR2(framePath, r2Key);
    console.log(`[ContinuityBridge] Uploaded → ${r2Url}`);
  } catch (err) {
    console.warn(`[ContinuityBridge] R2 upload failed: ${(err as Error).message} — will use base64`);
  }

  const record: ContinuityFrame = {
    fromClipIndex:  clipIndex,
    toClipIndex:    clipIndex + 1,
    localPath:      framePath,
    r2Url,
    pipelineRunId,
    extractedAt:    new Date(),
  };

  const existing = _frameStore.get(pipelineRunId) ?? [];
  existing.push(record);
  _frameStore.set(pipelineRunId, existing);

  return record;
}


/**
 * Retrieve the continuity frame for a given clip index.
 * Call this before dispatching clip[i] to inject start_frame.
 *
 * @param toClipIndex    — the clip about to be generated (0-based)
 * @param pipelineRunId  — pipeline run identifier
 * @returns              — {start_frame_url} or {start_frame_b64} param to inject, or {} if none
 */
export async function getContinuityParams(
  toClipIndex:    number,
  pipelineRunId:  string,
): Promise<Record<string, string>> {
  const frames = _frameStore.get(pipelineRunId) ?? [];
  const frame  = frames.find((f) => f.toClipIndex === toClipIndex);

  if (!frame) {
    return {}; // No continuity frame available — use normal FLUX keyframe
  }

  if (frame.r2Url) {
    console.log(`[ContinuityBridge] clip[${toClipIndex}] will use R2 continuity frame: ${frame.r2Url}`);
    return { start_frame_url: frame.r2Url };
  }

  // Fallback: base64 embed
  console.log(`[ContinuityBridge] clip[${toClipIndex}] will use base64 continuity frame`);
  const b64 = fs.readFileSync(frame.localPath).toString("base64");
  return { start_frame_b64: `data:image/png;base64,${b64}` };
}


/**
 * Clear continuity frame store for a completed pipeline run.
 * Call after edit_assemble is dispatched.
 */
export function clearContinuityFrames(pipelineRunId: string): void {
  _frameStore.delete(pipelineRunId);
  const frameDir = path.join("/tmp", "ghaafeedi_continuity", pipelineRunId);
  try {
    fs.rmSync(frameDir, { recursive: true, force: true });
  } catch {
    // non-fatal
  }
  console.log(`[ContinuityBridge] Cleared frames for run: ${pipelineRunId}`);
}


/**
 * Build complete assembly params for edit_assemble stage.
 * Returns the clip URLs in order + transition map from director notes.
 */
export function buildAssemblyParams(
  clipOutputUrls:  string[],         // in order, R2 URLs
  transitionMap:   string[],         // per clip: DISSOLVE|CUT|FADE|FADE_TO_BLACK (length = N)
  storyId:         string,
  pipelineRunId:   string,
): Record<string, unknown> {
  return {
    story_id:        storyId,
    pipeline_run_id: pipelineRunId,
    clips:           clipOutputUrls,
    transitions:     transitionMap,
    overlap_seconds: 2.0,            // default overlap for DISSOLVE
    output_key:      `cinematic/${pipelineRunId}_assembled.mp4`,
    apply_xfade:     true,
    crf:             16,
    preset:          "slow",
  };
}
