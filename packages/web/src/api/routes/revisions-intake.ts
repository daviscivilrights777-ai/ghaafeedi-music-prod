// ============================================================
// Ghaafeedi Music — Revision Intake API
// Line 2: AI Songs + Music Video product line
//
// Routes:
//   POST /api/revisions/submit          ← Customer submits revision request
//   GET  /api/revisions/my              ← Customer's revision history
//   GET  /api/revisions/:revisionId     ← Single revision status
//   POST /api/revisions/sophia-analysis ← GPT-4o retake directive generation
//   GET  /api/admin/revisions           ← Admin queue
//   POST /api/admin/revisions/:id/approve ← Admin approves + dispatches
//   POST /api/admin/revisions/:id/reject  ← Admin rejects
// ============================================================

import { Hono } from "hono";
import { auth } from "../auth";
import { db } from "../database/pg-client";
import {
  revisionRequests, orders, productions, aiJobs,
  user as userTable, profiles,
} from "../database/pg-schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { OrchestrationEngine } from "../orchestration/orchestration-engine";
import { getSecret, SECRET_KEYS } from "../orchestration/secrets";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RevisionJobPayload {
  revisionId:   string;
  orderId:      string;
  productionId: string;
  productSlug:  string;
  tier:         "starter" | "premium" | "elite";
  revisionRound: number;

  // Song revision
  song?: {
    currentSongUrl:    string;
    changes: {
      lyrics?:    string;
      tempo?:     string;
      key?:       string;
      genre?:     string;
      mood?:      string;
      structure?: string;
    };
    emotionalIntent:     string;
    referenceTrackUrl?:  string;
  };

  // Music video revision
  video?: {
    currentVideoUrl: string;
    shotIndex?:      number;
    retake_start_time?: number;
    retake_duration?:   number;
    changes: {
      sceneChanges?:  string;
      colorGrade?:    string;
      pacing?:        string;
      narration?:     string;
      transitions?:   string;
      rerender?:      boolean;
      revised_cameraMotion?: string;
      revised_lighting?:     string;
      revised_subject?:      string;
      revised_falPrompt?:    string;
    };
    visualReferenceUrls?: string[];
  };

  bothSongAndVideo:  boolean;
  submittedAt:       string;
  customerMessage:   string;
  urgency:           "standard" | "priority";
  attachments?:      string[];
  avatarProvider?:   string;
}

// ─── Max revisions per tier ───────────────────────────────────────────────────
const MAX_REVISIONS: Record<string, number> = {
  starter: 1,
  premium: 2,
  elite:   3,
};

// Revision window: 7 days from order creation
const REVISION_WINDOW_DAYS = 7;

function revisionId(): string {
  return `REV-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const revisionsIntake = new Hono();

// ── POST /submit ─────────────────────────────────────────────────────────────
revisionsIntake.post("/submit", async (c) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json() as RevisionJobPayload;
    if (!body.orderId || !body.productSlug) {
      return c.json({ error: "orderId and productSlug are required" }, 400);
    }

    // Verify order belongs to user
    const [order] = await db.select()
      .from(orders)
      .where(and(
        eq(orders.id, body.orderId),
        eq(orders.userId, session.user.id),
      ))
      .limit(1);

    if (!order) return c.json({ error: "Order not found or access denied" }, 404);

    const tier = (body.tier || order.metadata?.tier || "starter") as string;
    const maxRevisions = MAX_REVISIONS[tier] ?? 1;

    // Count existing revisions for this order
    const [{ usedCount }] = await db.select({
      usedCount: count(revisionRequests.id),
    })
    .from(revisionRequests)
    .where(and(
      eq(revisionRequests.orderId, body.orderId),
      sql`${revisionRequests.status} NOT IN ('rejected')`,
    ));

    if (Number(usedCount) >= maxRevisions) {
      return c.json({
        error: `Revision limit reached. Your ${tier} tier includes ${maxRevisions} revision round(s).`,
        maxRevisions,
        used: Number(usedCount),
      }, 409);
    }

    // Check revision window (7 days from order creation)
    const orderDate = new Date(order.createdAt);
    const windowClose = new Date(orderDate.getTime() + REVISION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    if (new Date() > windowClose) {
      return c.json({
        error: `Revision window closed. Revisions must be submitted within ${REVISION_WINDOW_DAYS} days of order.`,
        windowClosedAt: windowClose.toISOString(),
      }, 409);
    }

    const id = revisionId();
    const revisionRound = Number(usedCount) + 1;

    await db.insert(revisionRequests).values({
      id,
      userId:          session.user.id,
      orderId:         body.orderId,
      productionId:    body.productionId || null,
      productSlug:     body.productSlug,
      tier,
      revisionRound,
      maxRevisions,
      windowClosesAt:  windowClose,
      avatarProvider:  body.avatarProvider || "static",
      status:          "pending",
      requestPayload:  body as unknown as Record<string, unknown>,
      beforeUrl:       body.video?.currentVideoUrl || body.song?.currentSongUrl || null,
    });

    return c.json({
      ok:           true,
      revisionId:   id,
      revisionRound,
      maxRevisions,
      remaining:    maxRevisions - revisionRound,
      windowClosesAt: windowClose.toISOString(),
      message:      "Revision request submitted. Our production team will review and begin your retake within 24–48 hours.",
    }, 201);

  } catch (err: any) {
    console.error("[revisions/submit]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ── GET /my ──────────────────────────────────────────────────────────────────
revisionsIntake.get("/my", async (c) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

    const revs = await db.select()
      .from(revisionRequests)
      .where(eq(revisionRequests.userId, session.user.id))
      .orderBy(desc(revisionRequests.createdAt))
      .limit(50);

    return c.json({ revisions: revs }, 200);
  } catch (err: any) {
    console.error("[revisions/my]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ── GET /:revisionId ─────────────────────────────────────────────────────────
revisionsIntake.get("/:revisionId", async (c) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

    const { revisionId: rid } = c.req.param();
    const [rev] = await db.select()
      .from(revisionRequests)
      .where(and(
        eq(revisionRequests.id, rid),
        eq(revisionRequests.userId, session.user.id),
      ))
      .limit(1);

    if (!rev) return c.json({ error: "Revision not found" }, 404);
    return c.json({ revision: rev }, 200);
  } catch (err: any) {
    console.error("[revisions/:id]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ── POST /sophia-analysis ────────────────────────────────────────────────────
// GPT-4o endpoint: takes customer words + production context
// → returns structured RetakeDirective (what Sophia recommends)
revisionsIntake.post("/sophia-analysis", async (c) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json() as {
      orderId:         string;
      productionId?:   string;
      shotIndex?:      number;
      customerWords:   string;    // free-form complaint
      currentShotDesc: string;    // what Sophia originally directed
      productSlug:     string;
    };

    const apiKey = await getSecret(SECRET_KEYS.OPENAI_API_KEY);
    if (!apiKey) return c.json({ error: "AI service unavailable" }, 503);

    const systemPrompt = `You are Sophia, Ghaafeedi Music's AI creative director.
A customer is requesting a revision to their produced AI music video.
Your job is to listen to their complaint, understand what isn't working emotionally or visually,
and produce a structured retake directive that our production engine can execute.

Output ONLY valid JSON matching this schema:
{
  "emotional_diagnosis": "feeling|visual|representation|other",
  "director_note": "1-2 sentences describing what needs to change and why",
  "revised_cameraMotion": "static|slow_push|pull_back|pan_right|pan_left|orbit|tilt_up|tilt_down|handheld",
  "revised_lighting": "string describing desired lighting",
  "revised_subject": "string describing subject adjustment if needed",
  "revised_falPrompt": "Full FAL.ai generation prompt for the retake",
  "revised_modalPrompt": "Fallback Modal prompt",
  "mood_adjustment": "warmer|cooler|more_dramatic|more_intimate|unchanged",
  "confidence": 0.0-1.0
}`;

    const userPrompt = `Product: ${body.productSlug}
Shot being revised: Shot ${body.shotIndex ?? "?"} — ${body.currentShotDesc}

Customer's words: "${body.customerWords}"

Based on what the customer said, produce the retake directive.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        messages:    [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        temperature:   0.7,
        max_tokens:    600,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("[sophia-analysis] OpenAI error:", errText);
      return c.json({ error: "AI analysis failed" }, 502);
    }

    const aiData = await openaiRes.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const directive = JSON.parse(aiData.choices[0].message.content);
    return c.json({ ok: true, directive }, 200);

  } catch (err: any) {
    console.error("[sophia-analysis]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── Admin sub-router ─────────────────────────────────────────────────────────
export const adminRevisions = new Hono();

// Helper: verify admin
async function verifyAdmin(c: any): Promise<{ userId: string } | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return null;
  const [profile] = await db.select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1) as any[];
  if (!profile || profile.role !== "admin") return null;
  return { userId: session.user.id };
}

// GET /api/admin/revisions
adminRevisions.get("/", async (c) => {
  const admin = await verifyAdmin(c);
  if (!admin) return c.json({ error: "Forbidden" }, 403);

  try {
    const statusFilter = c.req.query("status") || "";
    const revs = await db.select()
      .from(revisionRequests)
      .orderBy(desc(revisionRequests.createdAt))
      .limit(100);

    const filtered = statusFilter
      ? revs.filter((r) => r.status === statusFilter)
      : revs;

    // Stats
    const all = revs;
    const stats = {
      total:       all.length,
      pending:     all.filter((r) => r.status === "pending").length,
      in_progress: all.filter((r) => r.status === "in_progress").length,
      complete:    all.filter((r) => r.status === "complete").length,
      rejected:    all.filter((r) => r.status === "rejected").length,
    };

    return c.json({ revisions: filtered, stats }, 200);
  } catch (err: any) {
    console.error("[admin/revisions]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /api/admin/revisions/:id/approve → dispatch ltx_retake job
adminRevisions.post("/:id/approve", async (c) => {
  const admin = await verifyAdmin(c);
  if (!admin) return c.json({ error: "Forbidden" }, 403);

  try {
    const { id } = c.req.param();
    const body = await c.req.json().catch(() => ({})) as { adminNotes?: string };

    const [rev] = await db.select()
      .from(revisionRequests)
      .where(eq(revisionRequests.id, id))
      .limit(1);

    if (!rev) return c.json({ error: "Revision not found" }, 404);
    if (rev.status !== "pending") {
      return c.json({ error: `Cannot approve revision in status: ${rev.status}` }, 409);
    }

    const payload = rev.requestPayload as RevisionJobPayload;

    // Build ltx_retake job input from stored payload
    const jobInput: Record<string, unknown> = {
      revisionId:           rev.id,
      orderId:              rev.orderId,
      productionId:         rev.productionId,
      shotIndex:            payload.video?.shotIndex ?? 0,
      retake_start_time:    payload.video?.retake_start_time ?? 0,
      retake_duration:      payload.video?.retake_duration ?? 4,
      revised_cameraMotion: payload.video?.changes?.revised_cameraMotion ?? "slow_push",
      revised_lighting:     payload.video?.changes?.revised_lighting ?? "",
      revised_subject:      payload.video?.changes?.revised_subject ?? "",
      revised_falPrompt:    payload.video?.changes?.revised_falPrompt ??
                            `Cinematic retake: ${payload.customerMessage}`,
      revised_modalPrompt:  payload.video?.changes?.revised_falPrompt ?? "",
      sophia_director_note: (rev.retakeDirective as any)?.director_note ?? payload.customerMessage,
      mode:                 "replace_video",
      approved_by_customer: true,
      beforeUrl:            rev.beforeUrl,
    };

    // Dispatch via orchestration engine
    const engine = OrchestrationEngine.getInstance();
    const result = await engine.submitJob({
      userId:       rev.userId,
      orderId:      rev.orderId,
      productionId: rev.productionId ?? undefined,
      jobType:      "ltx_retake",
      inputPayload: jobInput,
      tier:         "standard",
    });

    if (!result.success || !result.jobId) {
      return c.json({ error: result.error || "Failed to dispatch retake job" }, 500);
    }

    // Update revision record
    await db.update(revisionRequests)
      .set({
        status:          "in_progress",
        dispatchedJobId: result.jobId,
        adminNotes:      body.adminNotes || null,
        updatedAt:       new Date(),
      })
      .where(eq(revisionRequests.id, id));

    return c.json({
      ok:     true,
      jobId:  result.jobId,
      message: "Retake job dispatched to LTX Studio pipeline",
    }, 200);

  } catch (err: any) {
    console.error("[admin/revisions/:id/approve]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /api/admin/revisions/:id/reject
adminRevisions.post("/:id/reject", async (c) => {
  const admin = await verifyAdmin(c);
  if (!admin) return c.json({ error: "Forbidden" }, 403);

  try {
    const { id } = c.req.param();
    const body = await c.req.json().catch(() => ({})) as { adminNotes?: string };

    await db.update(revisionRequests)
      .set({
        status:     "rejected",
        adminNotes: body.adminNotes || "Rejected by admin",
        updatedAt:  new Date(),
      })
      .where(eq(revisionRequests.id, id));

    return c.json({ ok: true }, 200);
  } catch (err: any) {
    console.error("[admin/revisions/:id/reject]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /api/admin/revisions/:id/payload — view full JSON payload
adminRevisions.get("/:id/payload", async (c) => {
  const admin = await verifyAdmin(c);
  if (!admin) return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.param();
  const [rev] = await db.select()
    .from(revisionRequests)
    .where(eq(revisionRequests.id, id))
    .limit(1);

  if (!rev) return c.json({ error: "Not found" }, 404);
  return c.json({ revision: rev, payload: rev.requestPayload, directive: rev.retakeDirective }, 200);
});

// GET /api/admin/revisions/kpis
adminRevisions.get("/kpis", async (c) => {
  const admin = await verifyAdmin(c);
  if (!admin) return c.json({ error: "Forbidden" }, 403);

  try {
    const all = await db.select({ status: revisionRequests.status })
      .from(revisionRequests);

    const count = (s: string) => all.filter((r) => r.status === s).length;

    return c.json({
      total:      all.length,
      pending:    count("pending"),
      approved:   count("approved"),
      rejected:   count("rejected"),
      inProgress: count("in_progress"),
      complete:   count("complete"),
    });
  } catch (err: any) {
    return c.json({ error: "Internal server error" }, 500);
  }
});
