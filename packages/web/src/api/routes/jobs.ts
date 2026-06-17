/**
 * Jobs API Routes
 * POST   /api/jobs          — submit a new job
 * GET    /api/jobs/:id      — get job status
 * GET    /api/jobs          — list user's jobs (paginated)
 * DELETE /api/jobs/:id      — cancel a job
 * GET    /api/jobs/admin/queue — admin queue depths
 */

import { Hono } from "hono";
import { OrchestrationEngine } from "../orchestration/orchestration-engine";
import type { JobSubmissionRequest } from "../orchestration/orchestration-engine";
import type { ProductType } from "../orchestration/entitlement-validator";
import { db } from "../database/pg-client";

// Raw SQL helper using pg Pool via drizzle client
async function rawQuery(query: string, params: unknown[] = []): Promise<any[]> {
  const client = (db as any).$client as import("pg").Pool;
  const result = await client.query(query, params);
  return result.rows;
}

const jobs = new Hono();
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
  const userId: string = c.get("userId");

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
  if (!body.payload) return c.json({ error: "payload is required" }, 400);

  const VALID_JOB_TYPES = [
    "video-generation", "video-generation-hailuo",
    "music-generation", "voice-clone", "tts",
    "lyrics-generation", "story-analysis",
    "image-generation", "gpu-compute",
  ];

  if (!VALID_JOB_TYPES.includes(body.jobType)) {
    return c.json({
      error: `Invalid jobType. Must be one of: ${VALID_JOB_TYPES.join(", ")}`,
    }, 400);
  }

  const result = await engine.submitJob({
    userId,
    productType: body.productType as ProductType,
    jobType: body.jobType,
    orderId: body.orderId,
    priority: body.priority,
    payload: body.payload as Record<string, unknown>,
    webhookUrl: body.webhookUrl,
    metadata: body.metadata,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 402);
  }

  return c.json({
    jobId: result.jobId,
    status: "queued",
    position: result.position,
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
  const userId: string = c.get("userId");
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
  const userId: string = c.get("userId");
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
  const userId: string = c.get("userId");
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

export { jobs as jobRoutes };
