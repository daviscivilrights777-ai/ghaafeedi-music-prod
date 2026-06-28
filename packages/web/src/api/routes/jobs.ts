/**
 * Jobs API Routes
 * POST   /api/jobs          — submit a new job
 * GET    /api/jobs/:id      — get job status
 * GET    /api/jobs          — list user's jobs (paginated)
 * DELETE /api/jobs/:id      — cancel a job
 * GET    /api/jobs/admin/queue — admin queue depths
 */

import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { OrchestrationEngine } from "../orchestration/orchestration-engine";
import type { JobSubmissionRequest } from "../orchestration/orchestration-engine";
import type { ProductType } from "../orchestration/entitlement-validator";
import { db } from "../database/pg-client";
import { persistDirectorShotList } from "../../lib/production-memory";

// Raw SQL helper using pg Pool via drizzle client
async function rawQuery(query: string, params: unknown[] = []): Promise<any[]> {
  const client = (db as any).$client as import("pg").Pool;
  const result = await client.query(query, params);
  return result.rows;
}

const jobs = new Hono<HonoEnv>();
const engine = OrchestrationEngine.getInstance();

let _pgAvailable = true;

// --- Rate limiting (simple in-memory, per user) ----------------------------
const _rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // 10 submissions per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = _rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    _rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// --- Auth middleware --------------------------------------------------------

const GM_QA_KEY = process.env.GM_ADMIN_QA_KEY ?? "";

async function requireAuth(c: any, next: () => Promise<void>) {
  // Local QA bypass
  if (GM_QA_KEY && c.req.header("X-Admin-QA-Key") === GM_QA_KEY) {
    c.set("userId", "qa-admin");
    return next();
  }
  const userId = c.req.header("x-user-id") ?? c.req.query("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("userId", userId);
  await next();
}

async function requireAdmin(c: any, next: () => Promise<void>) {
  // Local QA bypass
  if (GM_QA_KEY && c.req.header("X-Admin-QA-Key") === GM_QA_KEY) {
    return next();
  }
  const role = c.req.header("x-user-role");
  if (role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
}

// --- POST /api/jobs ---------------------------------------------------------

jobs.post("/", requireAuth, async (c) => {
  const userId: string = (c.get("user") as any)?.id ?? "";

  if (!checkRateLimit(userId)) {
    return c.json({ error: "Rate limit exceeded. Max 10 job submissions per minute." }, 429);
  }

  let body: Partial<JobSubmissionRequest>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Validate required fields
  if (!body.jobType) return c.json({ error: "jobType is required" }, 400);
  if (!body.productType) return c.json({ error: "productType is required" }, 400);
  if (!body.inputPayload) return c.json({ error: "inputPayload is required" }, 400);

  const VALID_JOB_TYPES = [
    "video-generation", "video-generation-hailuo",
    "music-generation", "voice-clone", "tts",
    "lyrics-generation", "story-analysis",
    "image-generation", "gpu-compute",
    "cinematic_video", "director_notes",
    "lip_sync", "sophia_intro",
  ];

  if (!VALID_JOB_TYPES.includes(body.jobType)) {
    return c.json({
      error: `Invalid jobType. Must be one of: ${VALID_JOB_TYPES.join(", ")}`,
    }, 400);
  }

  const result = await engine.submitJob({
    userId,
    productType: body.productType as ProductType,
    jobType: body.jobType as any,
    orderId: body.orderId,
    inputPayload: (body.inputPayload ?? {}) as Record<string, unknown>,
    webhookUrl: body.webhookUrl,
    metadata: body.metadata,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 402);
  }

  return c.json({
    jobId: result.jobId,
    status: "queued",
    position: (result as any).position ?? 0,
    quotaRemaining: result.quotaRemaining,
    message: "Job submitted successfully",
  }, 201);
});

// --- GET /api/jobs/:id ------------------------------------------------------

jobs.get("/admin/queue", requireAdmin, async (c) => {
  const [depths, active] = await Promise.all([
    engine.getQueueDepths(),
    engine.getActiveJobCount(),
  ]);
  return c.json({ depths, active });
});

jobs.get("/:id", requireAuth, async (c) => {
  const userId: string = (c.get("user") as any)?.id ?? "";
  const jobId = c.req.param("id");

  const status = await engine.getJobStatus(jobId);
  if (!status) {
    return c.json({ error: "Job not found" }, 404);
  }

  // Verify ownership (or admin)
  if (_pgAvailable) {
    try {
      const rows = await rawQuery("SELECT user_id FROM ai_jobs WHERE id = $1 LIMIT 1", [jobId]);
      if (rows[0] && rows[0].user_id !== userId) {
        const role = c.req.header("x-user-role");
        if (role !== "admin") {
          return c.json({ error: "Access denied" }, 403);
        }
      }
    } catch (err) {
      if ((err as Error).message.includes("connect")) _pgAvailable = false;
    }
  }

  return c.json(status);
});

// --- GET /api/jobs ----------------------------------------------------------

jobs.get("/", requireAuth, async (c) => {
  const userId: string = (c.get("user") as any)?.id ?? "";
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20", 10), 100);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);
  const status = c.req.query("status");
  const jobType = c.req.query("jobType");

  if (!_pgAvailable) {
    return c.json({ jobs: [], total: 0, hasMore: false });
  }

  try {
    const conditions: string[] = [`user_id = '${userId}'`];
    if (status) conditions.push(`status = '${status}'`);
    if (jobType) conditions.push(`job_type = '${jobType}'`);
    const where = `WHERE ${conditions.join(" AND ")}`;

    const [rowsResult, countResult] = await Promise.all([
      rawQuery(
        `SELECT id, job_type, product_type, status, tier, provider, output_url, error_message, created_at, completed_at, duration_ms
         FROM ai_jobs ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      ),
      rawQuery(`SELECT COUNT(*) AS total FROM ai_jobs ${where}`),
    ]);

    const total = parseInt((countResult[0]?.total as string) ?? "0", 10);

    return c.json({
      jobs: rowsResult,
      total,
      hasMore: offset + limit < total,
      limit,
      offset,
    });
  } catch (err) {
    if ((err as Error).message.includes("connect")) _pgAvailable = false;
    return c.json({ jobs: [], total: 0, hasMore: false });
  }
});

// --- DELETE /api/jobs/:id ---------------------------------------------------

jobs.delete("/:id", requireAuth, async (c) => {
  const userId: string = (c.get("user") as any)?.id ?? "";
  const jobId = c.req.param("id");

  // Ownership check
  if (_pgAvailable) {
    try {
      const rows = await rawQuery("SELECT user_id, status FROM ai_jobs WHERE id = $1 LIMIT 1", [jobId]);

      if (!rows[0]) return c.json({ error: "Job not found" }, 404);

      const isOwner = rows[0].user_id === userId;
      const isAdmin = c.req.header("x-user-role") === "admin";
      if (!isOwner && !isAdmin) return c.json({ error: "Access denied" }, 403);

      if (["completed", "failed", "cancelled"].includes(rows[0].status as string)) {
        return c.json({ error: `Cannot cancel job in "${rows[0].status}" status` }, 409);
      }
    } catch (err) {
      if ((err as Error).message.includes("connect")) _pgAvailable = false;
    }
  }

  const cancelled = await engine.cancelJob(jobId, userId);
  if (!cancelled) {
    return c.json({ error: "Job cannot be cancelled in its current state" }, 409);
  }

  return c.json({ success: true, message: "Job cancelled" });
});

// ─── GET /api/jobs/stream — SSE real-time job events (admin) ─────────────────
jobs.get("/stream", requireAdmin, async (c) => {
  const engine = OrchestrationEngine.getInstance();

  return new Response(
    new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();

        const send = (data: unknown) => {
          try {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {}
        };

        // Send initial snapshot
        const [depths, activeCount] = await Promise.all([
          engine.getQueueDepths(),
          engine.getActiveJobCount(),
        ]);
        send({ type: "snapshot", depths, activeCount, ts: Date.now() });

        // Poll every 4 seconds
        const interval = setInterval(async () => {
          try {
            const [d, a] = await Promise.all([
              engine.getQueueDepths(),
              engine.getActiveJobCount(),
            ]);
            send({ type: "update", depths: d, activeCount: a, ts: Date.now() });
          } catch {
            clearInterval(interval);
            controller.close();
          }
        }, 4_000);

        // Cleanup on disconnect
        c.req.raw.signal?.addEventListener("abort", () => {
          clearInterval(interval);
          try { controller.close(); } catch {}
        });
      },
    }),
    {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
        "X-Accel-Buffering": "no",
      },
    }
  );
});

// ─── POST /api/jobs/director — run Python AIDirector, return shot plan ────────
// This is the end-to-end orchestration entry point for cinematic_video jobs.
// Payload schema:
//   { customer_id, customer_story, primary_emotion, secondary_emotions[],
//     emotional_arc[], lyrics, song_file_url, song_duration_seconds,
//     song_bpm, song_genre, video_script, preferred_style,
//     precomputed_music_analysis? }

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

jobs.post("/director", requireAuth, async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.customer_story) {
    return c.json({ error: "customer_story is required" }, 400);
  }
  if (!body.primary_emotion) {
    return c.json({ error: "primary_emotion is required" }, 400);
  }

  const cinemaPath = path.resolve((process as any).cwd?.(), "../../packages/cinematic");

  // Build a temp Python runner that serialises the payload and calls AIDirector
  const runnerScript = `
import sys, os, json
sys.path.insert(0, '${cinemaPath}')
os.chdir('${cinemaPath}')
from dotenv import load_dotenv
load_dotenv('${cinemaPath}/.env')

from config import GhaafeediSettings, CustomerInput, EmotionalTone, VideoStyle
from agents.director import AIDirector

body = json.loads(sys.argv[1])

# Map emotion string → EmotionalTone enum (case-insensitive, fallback HOPE)
def to_emotion(s):
    try:
        return EmotionalTone(s.upper())
    except Exception:
        return EmotionalTone.HOPE

def to_style(s):
    try:
        return VideoStyle(s.upper())
    except Exception:
        return VideoStyle.WARM_GOLDEN

inp = CustomerInput(
    customer_id=body.get('customer_id', 'api-request'),
    customer_story=body['customer_story'],
    primary_emotion=to_emotion(body.get('primary_emotion', 'hope')),
    secondary_emotions=[to_emotion(e) for e in body.get('secondary_emotions', [])],
    emotional_arc=body.get('emotional_arc', []),
    lyrics=body.get('lyrics', ''),
    song_file_url=body.get('song_file_url', ''),
    song_duration_seconds=float(body.get('song_duration_seconds', 180)),
    song_bpm=body.get('song_bpm'),
    song_genre=body.get('song_genre', 'pop'),
    video_script=body.get('video_script', ''),
    preferred_style=to_style(body.get('preferred_style', 'warm_golden')),
    emotional_analysis=body.get('emotional_analysis', {}),
)

settings = GhaafeediSettings()
director = AIDirector(settings)
plan = director.create_shot_plan(inp, precomputed_music_analysis=body.get('precomputed_music_analysis'))

# Serialise to dict
out = {
    'order_id': plan.order_id,
    'title': plan.title,
    'total_shots': plan.total_shots,
    'total_duration_seconds': plan.total_duration_seconds,
    'visual_style': str(plan.visual_style),
    'color_palette': plan.color_palette,
    'song_bpm': plan.song_bpm,
    'beat_timestamps': plan.beat_timestamps,
    'section_markers': plan.section_markers,
    'shots': [
        {
            'shot_id': s.shot_id,
            'scene_number': s.scene_number,
            'shot_number': s.shot_number,
            'start_time_seconds': s.start_time_seconds,
            'duration_seconds': s.duration_seconds,
            'shot_type': str(s.shot_type),
            'camera_movement': str(s.camera_movement),
            'camera_angle': s.camera_angle,
            'lens_mm': s.lens_mm,
            'composition': s.composition,
            'focus_type': s.focus_type,
            'visual_prompt': s.visual_prompt,
            'negative_prompt': s.negative_prompt,
            'lighting_description': s.lighting_description,
            'color_temperature_kelvin': s.color_temperature_kelvin,
            'emotional_beat': s.emotional_beat,
            'narrative_purpose': s.narrative_purpose,
            'lyrics_section': s.lyrics_section,
            'transition_to_next': str(s.transition_to_next),
            'transition_duration_seconds': s.transition_duration_seconds,
            'music_timestamp_start': s.music_timestamp_start,
            'music_timestamp_end': s.music_timestamp_end,
            'beat_aligned': s.beat_aligned,
        }
        for s in plan.shots
    ],
}
print(json.dumps(out))
`;

  try {
    const { stdout, stderr } = await execFileAsync(
      "python3",
      ["-c", runnerScript, JSON.stringify(body)],
      {
        timeout: 120_000,
        maxBuffer: 5 * 1024 * 1024, // 5MB
        env: { ...process.env },
      }
    );

    if (stderr) {
      // Log warnings but don't fail on them (Python prints skip warnings to stderr)
      console.warn("[Director] stderr:", stderr.slice(0, 500));
    }

    const plan = JSON.parse(stdout.trim());

    // ── Persist director shot list to Engram (fire-and-forget) ──
    const directorUserId = (c.get("user") as any)?.id ?? "anonymous";
    persistDirectorShotList({
      userId:       directorUserId,
      songTitle:    plan.song_title ?? "Untitled",
      totalShots:   plan.total_shots ?? 0,
      totalSeconds: plan.total_duration_seconds ?? 0,
      shots: (plan.shots ?? []).map((s: any, i: number) => ({
        shotNumber:    i + 1,
        lyricsSection: s.lyrics_section ?? "",
        cameraMove:    s.camera_move ?? "",
        subject:       s.subject ?? "",
        setting:       s.setting ?? "",
        lighting:      s.lighting ?? "",
        mood:          s.mood ?? "",
        duration:      s.duration ?? 5,
        sunoPrompt:    s.prompt ?? undefined,
      })),
    }).catch(() => {});

    return c.json({
      success: true,
      shot_plan: plan,
      shots_generated: plan.total_shots,
      message: `Director shot plan complete — ${plan.total_shots} shots across ${plan.total_duration_seconds}s`,
    }, 200);

  } catch (err: any) {
    const msg = err?.message ?? "Director agent failed";
    const stderr = err?.stderr ?? "";
    console.error("[Director] FAILED:", msg, stderr.slice(0, 500));
    return c.json({
      error: "Director agent failed",
      detail: msg,
      stderr: stderr.slice(0, 300),
    }, 500);
  }
});

export { jobs as jobRoutes };
