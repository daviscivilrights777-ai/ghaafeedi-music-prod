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
  user as userTable, profiles, stories, members,
} from "../database/pg-schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { OrchestrationEngine } from "../orchestration/orchestration-engine";
import { getSecret, SECRET_KEYS } from "../orchestration/secrets";

// ─── Customer Context Builder ──────────────────────────────────────────────────
// Pulls everything Sophia needs to know about this customer + production
// before she speaks a single word. This feeds both the frontend scripts
// and the GPT-4o system prompt.

export interface SophiaCustomerContext {
  // Identity
  customerName:      string;
  tier:              string;
  memberId:          string | null;
  revisionRound:     number;
  revisionsRemaining: number;
  // Story / onboarding
  storyText:         string | null;    // their S4 narrative
  emotionalProfile:  Record<string, number> | null; // { grief: 87, nostalgia: 72, ... }
  originalEmotion:   string | null;   // top emotion from S5 analysis
  originalMood:      string | null;
  storyTitle:        string | null;
  // Production details
  originalFalPrompt: string | null;   // the FAL.ai prompt that generated the video
  originalSongUrl:   string | null;
  originalVideoUrl:  string | null;
  storyboard:        any[] | null;    // shot list if available
  productSlug:       string;
  productionStatus:  string | null;
  // Prior revisions
  priorRevisionDirectives: string[];  // Sophia's previous retake notes for round 2+
}

async function buildCustomerContext(
  userId: string,
  orderId: string,
  productSlug: string,
  tier: string,
  revisionRound: number,
  maxRevisions: number,
): Promise<SophiaCustomerContext> {
  // Fetch in parallel: user, profile, member, order, production, story, prior revisions
  const [
    [userRow],
    [profile],
    [member],
    [order],
    [production],
  ] = await Promise.all([
    db.select().from(userTable).where(eq(userTable.id, userId)).limit(1),
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db.select().from(members).where(eq(members.userId, userId)).limit(1),
    db.select().from(orders).where(eq(orders.id, orderId)).limit(1),
    db.select().from(productions).where(eq(productions.orderId, orderId)).limit(1),
  ]);

  // Fetch story linked to this order (or user's latest)
  const storyRows = await db.select().from(stories)
    .where(eq(stories.orderId, orderId))
    .orderBy(desc(stories.createdAt))
    .limit(1);
  const story = storyRows[0] || null;

  // If no story linked to order, try user's latest story (onboarding S4/S5 data)
  let fallbackStory: typeof story | null = null;
  if (!story) {
    const fallback = await db.select().from(stories)
      .where(eq(stories.userId, userId))
      .orderBy(desc(stories.createdAt))
      .limit(1);
    fallbackStory = fallback[0] || null;
  }

  const activeStory = story || fallbackStory;

  // Pull prior revision directives (so Sophia remembers what she already tried)
  const priorRevisions = await db.select({
    retakeDirective: revisionRequests.retakeDirective,
    revisionRound:   revisionRequests.revisionRound,
  })
  .from(revisionRequests)
  .where(and(
    eq(revisionRequests.orderId, orderId),
    eq(revisionRequests.userId, userId),
    sql`${revisionRequests.status} IN ('complete', 'in_progress')`,
  ))
  .orderBy(revisionRequests.revisionRound);

  const priorDirectives = priorRevisions
    .map((r) => {
      const d = r.retakeDirective as any;
      return d?.director_note || d?.revised_falPrompt || null;
    })
    .filter(Boolean) as string[];

  // Extract emotional profile from profile.emotionalProfile or story.aiAnalysis
  let emotionalProfile: Record<string, number> | null = null;
  if (profile?.emotionalProfile && typeof profile.emotionalProfile === "object") {
    emotionalProfile = profile.emotionalProfile as Record<string, number>;
  } else if (activeStory?.aiAnalysis && typeof activeStory.aiAnalysis === "object") {
    const analysis = activeStory.aiAnalysis as any;
    if (analysis.emotionalScores || analysis.scores) {
      emotionalProfile = analysis.emotionalScores || analysis.scores;
    }
  }

  // Extract original FAL prompt from production metadata or job outputPayload
  let originalFalPrompt: string | null = null;
  let originalVideoUrl: string | null = null;
  let originalSongUrl: string | null = null;

  if (production) {
    const meta = production.metadata as any;
    originalFalPrompt = meta?.falPrompt || meta?.original_fal_prompt || meta?.cinematic_prompt || null;
    const deliverables = production.deliverableKeys as any[];
    if (Array.isArray(deliverables)) {
      for (const d of deliverables) {
        if (typeof d === "string") {
          if (d.match(/\.(mp4|mov|webm)$/i)) originalVideoUrl = d;
          if (d.match(/\.(mp3|wav|flac|m4a)$/i)) originalSongUrl = d;
        } else if (d?.url) {
          if (d.type === "video" || d.url.match(/\.(mp4|mov|webm)$/i)) originalVideoUrl = d.url;
          if (d.type === "song" || d.type === "audio" || d.url.match(/\.(mp3|wav)$/i)) originalSongUrl = d.url;
        }
      }
    }
  }

  // Fallback: try to get original URLs from order metadata
  if (!originalVideoUrl || !originalSongUrl) {
    const orderMeta = order?.metadata as any;
    originalVideoUrl = originalVideoUrl || orderMeta?.deliveredVideoUrl || orderMeta?.videoUrl || null;
    originalSongUrl  = originalSongUrl  || orderMeta?.deliveredSongUrl  || orderMeta?.songUrl  || null;
  }

  return {
    customerName:      userRow?.name || profile?.fullName || "there",
    tier:              member?.tier || tier,
    memberId:          member?.memberId || null,
    revisionRound,
    revisionsRemaining: Math.max(0, maxRevisions - revisionRound),
    storyText:         activeStory?.storyText || profile?.storyS || null,
    emotionalProfile,
    originalEmotion:   activeStory?.emotion || null,
    originalMood:      activeStory?.mood || null,
    storyTitle:        activeStory?.title || order?.productName || null,
    originalFalPrompt,
    originalSongUrl,
    originalVideoUrl,
    storyboard:        activeStory?.storyboard as any[] | null || null,
    productSlug,
    productionStatus:  production?.status || null,
    priorRevisionDirectives: priorDirectives,
  };
}

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

// ── GET /context?orderId=ORD-xxx ─────────────────────────────────────────────
// Called on mount by SophiaRevisionGuide — returns everything Sophia knows
// about this customer and production so she can speak with full context.
revisionsIntake.get("/context", async (c) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

    const orderId    = c.req.query("orderId");
    const productSlug = c.req.query("productSlug") || "";
    if (!orderId) return c.json({ error: "orderId required" }, 400);

    // Verify order belongs to user
    const [order] = await db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, session.user.id)))
      .limit(1);
    if (!order) return c.json({ error: "Order not found" }, 404);

    const tier = (order.metadata as any)?.tier || order.tier || "starter";
    const maxRevisions = MAX_REVISIONS[tier] ?? 1;

    // Count existing revisions
    const [{ usedCount }] = await db.select({ usedCount: count(revisionRequests.id) })
      .from(revisionRequests)
      .where(and(
        eq(revisionRequests.orderId, orderId),
        sql`${revisionRequests.status} NOT IN ('rejected')`,
      ));

    const revisionRound = Number(usedCount) + 1;

    const ctx = await buildCustomerContext(
      session.user.id,
      orderId,
      productSlug || order.productSlug,
      tier,
      revisionRound,
      maxRevisions,
    );

    return c.json({ ok: true, context: ctx }, 200);
  } catch (err: any) {
    console.error("[revisions/context]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

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
// Sophia's full creative intelligence endpoint.
// Loads the customer's entire story context, emotional fingerprint,
// original production prompts, and prior revision history before calling GPT-4o.
// This is what makes Sophia sound like she built the song — because she did.
revisionsIntake.post("/sophia-analysis", async (c) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json() as {
      orderId:         string;
      productSlug:     string;
      productionId?:   string;
      revisionType:    "song" | "video" | "both";
      emotionalIntent: string;
      songChanges:     Record<string, string>;
      videoChanges:    Record<string, string>;
      customerNotes:   string;   // Director's note from Phase 3
      shotIndex?:      number;
    };

    if (!body.orderId || !body.productSlug) {
      return c.json({ error: "orderId and productSlug are required" }, 400);
    }

    // Verify order belongs to user
    const [order] = await db.select().from(orders)
      .where(and(eq(orders.id, body.orderId), eq(orders.userId, session.user.id)))
      .limit(1);
    if (!order) return c.json({ error: "Order not found" }, 404);

    const tier = (order.metadata as any)?.tier || order.tier || "starter";
    const maxRevisions = MAX_REVISIONS[tier] ?? 1;
    const [{ usedCount }] = await db.select({ usedCount: count(revisionRequests.id) })
      .from(revisionRequests)
      .where(and(
        eq(revisionRequests.orderId, body.orderId),
        sql`${revisionRequests.status} NOT IN ('rejected')`,
      ));

    // Build full customer context — everything Sophia knows
    const ctx = await buildCustomerContext(
      session.user.id,
      body.orderId,
      body.productSlug,
      tier,
      Number(usedCount) + 1,
      maxRevisions,
    );

    const apiKey = await getSecret(SECRET_KEYS.OPENAI_API_KEY);
    if (!apiKey) return c.json({ error: "AI service unavailable" }, 503);

    // ── Build emotional fingerprint summary ───────────────────────────────────
    let emotionSummary = "Unknown emotional profile";
    if (ctx.emotionalProfile) {
      const sorted = Object.entries(ctx.emotionalProfile)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([e, v]) => `${e} ${Math.round(v)}%`);
      emotionSummary = sorted.join(", ");
    }

    // ── Build storyboard summary if available ──────────────────────────────────
    let storyboardSummary = "No shot list available";
    if (Array.isArray(ctx.storyboard) && ctx.storyboard.length > 0) {
      storyboardSummary = ctx.storyboard
        .slice(0, 8)
        .map((s: any, i: number) => `Shot ${i}: ${s.description || s.prompt || JSON.stringify(s).slice(0, 80)}`)
        .join("\n");
    }

    // ── Build prior revision history ───────────────────────────────────────────
    let revisionHistory = "No prior revisions";
    if (ctx.priorRevisionDirectives.length > 0) {
      revisionHistory = ctx.priorRevisionDirectives
        .map((d, i) => `Round ${i + 1} directive: ${d}`)
        .join("\n");
    }

    // ── Build what changed in this revision ───────────────────────────────────
    const changesSummary: string[] = [];
    if (body.emotionalIntent) changesSummary.push(`Emotional intent: ${body.emotionalIntent}`);
    if (body.revisionType) changesSummary.push(`Revision type: ${body.revisionType}`);
    if (body.songChanges) {
      for (const [k, v] of Object.entries(body.songChanges)) {
        if (v) changesSummary.push(`Song ${k}: ${v}`);
      }
    }
    if (body.videoChanges) {
      for (const [k, v] of Object.entries(body.videoChanges)) {
        if (v) changesSummary.push(`Video ${k}: ${v}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM PROMPT — Sophia's full creative director persona
    // She knows the customer, their story, their emotional fingerprint,
    // the original production choices, and what she already tried.
    // ═══════════════════════════════════════════════════════════════
    const systemPrompt = `You are Sophia, Ghaafeedi Music's AI creative director and emotional storytelling expert.

You personally orchestrated ${ctx.customerName}'s production from the beginning.
You know their story. You know their emotional fingerprint. You know exactly what prompts
you used to generate their song and video. You are not a generic chatbot — you are their
specific creative director who built this work and is now fixing it.

═══ CUSTOMER PROFILE ═══
Name: ${ctx.customerName}
Member ID: ${ctx.memberId || "Guest"}
Tier: ${ctx.tier}
This is revision round ${ctx.revisionRound} of ${maxRevisions} allowed.
Revisions remaining after this: ${ctx.revisionsRemaining - 1 < 0 ? 0 : ctx.revisionsRemaining - 1}

═══ THEIR STORY (what they told us in onboarding) ═══
${ctx.storyText ? ctx.storyText.slice(0, 800) : "Story not recorded — base decisions on emotional profile and their current words."}

═══ EMOTIONAL FINGERPRINT (from AI analysis of their story) ═══
${emotionSummary}
Primary emotion: ${ctx.originalEmotion || "unknown"}
Original mood direction: ${ctx.originalMood || "unknown"}

═══ WHAT YOU ORIGINALLY CREATED ═══
Product: ${ctx.productSlug}
Production title: ${ctx.storyTitle || "Untitled"}
Original FAL.ai prompt you used: ${ctx.originalFalPrompt || "Not recorded — use their story to reconstruct intent."}
Storyboard you wrote:
${storyboardSummary}

═══ PRIOR REVISION HISTORY ═══
${revisionHistory}

═══ YOUR TASK ═══
${ctx.customerName} is not satisfied with ${body.revisionType === "both" ? "the song and video" : `the ${body.revisionType}`}.
You need to:
1. Diagnose what's emotionally or visually wrong based on everything you know about them
2. Write a precise retake directive that fixes the root cause — not just the symptom
3. Generate a new FAL.ai prompt that will produce something that actually matches their soul
4. Be specific. Be cinematic. Reference their actual story and emotional fingerprint.

If this is round 2+, acknowledge what you tried before and why you're taking a different approach.

Output ONLY valid JSON:
{
  "emotional_diagnosis": "brief: what emotional need isn't being met",
  "sophia_assessment": "1-2 sentences in Sophia's voice — what she understands is really wrong",
  "director_note": "2-3 cinematic sentences: the specific change and why it will work emotionally",
  "revised_cameraMotion": "static|slow_push|pull_back|pan_right|pan_left|orbit|tilt_up|tilt_down|handheld",
  "revised_lighting": "specific lighting description referencing their emotional tone",
  "revised_subject": "subject adjustment if needed — reference their actual story",
  "revised_falPrompt": "Complete, rich FAL.ai generation prompt. Must reference their emotional fingerprint. Min 80 words.",
  "revised_songDirective": "If song revision: specific note to song generation engine on mood/key/tempo/lyric changes",
  "revised_modalPrompt": "Fallback Modal prompt (can be shorter)",
  "mood_adjustment": "warmer|cooler|more_dramatic|more_intimate|more_hopeful|more_haunting|unchanged",
  "confidence": 0.0,
  "sophia_closing_line": "What Sophia will say to the customer after presenting this directive — personal, warm, referencing their story"
}`;

    const userPrompt = `${ctx.customerName}'s director's note: "${body.customerNotes || "No specific note provided."}"

Additional details they flagged:
${changesSummary.join("\n") || "None beyond the director's note."}

${body.shotIndex !== undefined ? `Specific shot being retaken: Shot ${body.shotIndex}` : "Full re-render requested."}

Analyze everything you know about this customer and write the retake directive now.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:           "gpt-4o",   // Full 4o — this is Sophia's surgical creative work
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        temperature:     0.75,
        max_tokens:      1200,
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

    // Return directive + the customer context so the frontend can
    // update Sophia's spoken script with personal references
    return c.json({
      ok: true,
      directive,
      customerContext: {
        customerName:    ctx.customerName,
        storyTitle:      ctx.storyTitle,
        emotionalProfile: ctx.emotionalProfile,
        originalEmotion: ctx.originalEmotion,
        revisionRound:   ctx.revisionRound,
        revisionsRemaining: ctx.revisionsRemaining,
        tier:            ctx.tier,
      },
    }, 200);

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

// GET /api/admin/revisions/kpis — MUST be before /:id routes
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


