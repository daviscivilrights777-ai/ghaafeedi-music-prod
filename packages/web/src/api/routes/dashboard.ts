// ============================================================
// Ghaafeedi Music — Member Dashboard API Routes
// Covers: notifications, deliverables, revisions, referrals,
//         billing history, profile update, Sophia chat history
// Phase 7: Lip Sync delivery integration
// ============================================================
import { Hono } from "hono";
import { db } from "../database/pg-client";
import * as schema from "../database/pg-schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { nanoid } from "nanoid";
import { OrchestrationEngine } from "../orchestration/orchestration-engine";

export const dashboard = new Hono()
  .use("*", authMiddleware)

  // ─── GET /api/dashboard/me ────────────────────────────────────────────────
  // Returns current user's role — used by signin to redirect admin → /admin
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [profile] = await db
      .select({ role: schema.profiles.role, fullName: schema.profiles.fullName })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1);
    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: profile?.role ?? "customer",
    });
  })

  // ─── GET /api/dashboard/summary ──────────────────────────────────────────
  // Returns everything the dashboard overview needs in one shot
  .get("/summary", requireAuth, async (c) => {
    const user = c.get("user")!;
    try {
      const [memberRows, ordersRows, prodsRows, subsRows, jobsRows, ticketsRows, convoRows, lipsyncRows] =
        await Promise.all([
          db.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1),
          db.select().from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.createdAt)),
          db.select().from(schema.productions).where(eq(schema.productions.userId, user.id)).orderBy(desc(schema.productions.createdAt)),
          db.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.userId, user.id), eq(schema.subscriptions.status, "active"))),
          db.select().from(schema.aiJobs).where(eq(schema.aiJobs.userId, user.id)).orderBy(desc(schema.aiJobs.queuedAt)).limit(20),
          db.select().from(schema.tickets).where(eq(schema.tickets.userId, user.id)).orderBy(desc(schema.tickets.createdAt)).limit(10),
          db.select().from(schema.conversations).where(eq(schema.conversations.userId, user.id)).orderBy(desc(schema.conversations.updatedAt)).limit(5),
          // Phase 7: Lip sync jobs for this member
          db.select().from(schema.aiJobs)
            .where(and(eq(schema.aiJobs.userId, user.id), eq(schema.aiJobs.jobType, "lip_sync")))
            .orderBy(desc(schema.aiJobs.queuedAt))
            .limit(20),
        ]);

      const member = memberRows[0] ?? null;

      // Billing events (cost ledger)
      const billingRows = await db
        .select()
        .from(schema.billingEvents)
        .where(eq(schema.billingEvents.userId, user.id))
        .orderBy(desc(schema.billingEvents.createdAt))
        .limit(30);

      // Deliverable assets
      const assetRows = await db
        .select()
        .from(schema.assets)
        .where(eq(schema.assets.userId, user.id))
        .orderBy(desc(schema.assets.createdAt));

      // Referral stats — use auditLogs as proxy (referral_click / referral_converted)
      const referralEvents = await db
        .select()
        .from(schema.auditLogs)
        .where(
          and(
            eq(schema.auditLogs.actorId, user.id),
            sql`${schema.auditLogs.action} LIKE ${'referral%'}`
          )
        )
        .limit(50);


      const referralCode = `GM-${(member?.memberId ?? user.id.slice(0, 6)).toUpperCase()}`;
      const referralClicks = referralEvents.filter(e => e.action === "referral.click").length;
      const referralConverted = referralEvents.filter(e => e.action === "referral.converted").length;
      const referralCredits = referralConverted * 1500; // $15 per conversion

      return c.json({
        member: member ? { ...member, email: user.email, name: user.name } : null,
        orders: ordersRows,
        productions: prodsRows,
        subscriptions: subsRows,
        aiJobs: jobsRows,
        tickets: ticketsRows,
        conversations: convoRows,
        billing: billingRows,
        assets: assetRows,
        lipsyncJobs: lipsyncRows,   // Phase 7
        referral: {
          code: referralCode,
          clicks: referralClicks,
          conversions: referralConverted,
          creditsCents: referralCredits,
        },
      }, 200);
    } catch (err) {
      console.error("[dashboard/summary]", err);
      return c.json({ error: "Failed to load dashboard" }, 500);
    }
  })

  // ─── GET /api/dashboard/notifications ────────────────────────────────────
  .get("/notifications", requireAuth, async (c) => {
    const user = c.get("user")!;
    // Generate smart notifications from system events
    const [prods, orders, tickets, lipsyncJobs] = await Promise.all([
      db.select().from(schema.productions).where(eq(schema.productions.userId, user.id)).orderBy(desc(schema.productions.createdAt)).limit(10),
      db.select().from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.createdAt)).limit(5),
      db.select().from(schema.tickets).where(and(eq(schema.tickets.userId, user.id), eq(schema.tickets.status, "resolved"))).limit(5),
      // Phase 7: lip sync job completion notifications
      db.select().from(schema.aiJobs)
        .where(and(
          eq(schema.aiJobs.userId, user.id),
          eq(schema.aiJobs.jobType, "lip_sync"),
          eq(schema.aiJobs.status, "complete"),
        ))
        .orderBy(desc(schema.aiJobs.completedAt))
        .limit(5),
    ]);

    const notifications: Array<{
      id: string; type: string; title: string; body: string;
      createdAt: string; read: boolean; link?: string;
    }> = [];

    for (const p of prods) {
      if (p.currentStage === "delivered") {
        notifications.push({
          id: `notif-prod-${p.id}`,
          type: "delivery",
          title: "Your creation is ready! 🎉",
          body: `${p.productSlug.replace(/-/g, " ")} has been delivered.`,
          createdAt: (p.deliveredAt ?? p.updatedAt ?? p.createdAt)?.toISOString() ?? new Date().toISOString(),
          read: false,
          link: "/dashboard?tab=deliverables",
        });
      } else if (p.currentStage === "music_generating" || p.currentStage === "video_generating") {
        notifications.push({
          id: `notif-prod-progress-${p.id}`,
          type: "progress",
          title: "Production update",
          body: `Your ${p.productSlug.replace(/-/g, " ")} is being created right now.`,
          createdAt: (p.updatedAt ?? p.createdAt)?.toISOString() ?? new Date().toISOString(),
          read: true,
        });
      }
    }

    for (const t of tickets) {
      notifications.push({
        id: `notif-ticket-${t.id}`,
        type: "support",
        title: "Support ticket resolved",
        body: `Your ticket "${t.subject}" has been resolved.`,
        createdAt: t.updatedAt?.toISOString() ?? new Date().toISOString(),
        read: false,
        link: "/dashboard?tab=support",
      });
    }

    if (orders.length === 0) {
      notifications.push({
        id: "notif-welcome",
        type: "welcome",
        title: "Welcome to Ghaafeedi Music ✦",
        body: "Your account is set up. Browse our 15 cinematic experiences to begin your legacy.",
        createdAt: new Date().toISOString(),
        read: false,
        link: "/products",
      });
    }

    // Phase 7: Lip sync job completion notifications
    for (const job of lipsyncJobs) {
      const out = (job.outputPayload ?? {}) as Record<string, unknown>;
      const outputUrl = (out.outputUrl ?? out.output_url ?? out.r2Url ?? null) as string | null;
      notifications.push({
        id: `notif-lipsync-${job.id}`,
        type: "lipsync",
        title: "Sophia Lip Sync Complete 🎬",
        body: "Your Sophia AI lip-sync video is ready to download in Deliverables.",
        createdAt: job.completedAt?.toISOString() ?? job.queuedAt?.toISOString() ?? new Date().toISOString(),
        read: false,
        link: "/dashboard?tab=deliverables",
        ...(outputUrl ? { previewUrl: outputUrl } : {}),
      } as any);
    }

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ notifications }, 200);
  })

  // ─── GET /api/dashboard/deliverables ─────────────────────────────────────
  .get("/deliverables", requireAuth, async (c) => {
    const user = c.get("user")!;
    const assets = await db
      .select()
      .from(schema.assets)
      .where(eq(schema.assets.userId, user.id))
      .orderBy(desc(schema.assets.createdAt));

    // Also pull delivered productions with their asset info
    const deliveredProds = await db
      .select()
      .from(schema.productions)
      .where(and(eq(schema.productions.userId, user.id), eq(schema.productions.currentStage, "delivered")));

    return c.json({ assets, deliveredProds }, 200);
  })

  // ─── POST /api/dashboard/revisions ───────────────────────────────────────
  .post("/revisions", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const { productionId, notes } = body as { productionId?: string; notes?: string };

    if (!productionId || !notes) {
      return c.json({ error: "productionId and notes required" }, 400);
    }

    const [prod] = await db
      .select()
      .from(schema.productions)
      .where(and(eq(schema.productions.id, productionId), eq(schema.productions.userId, user.id)))
      .limit(1);

    if (!prod) return c.json({ error: "Production not found" }, 404);
    if (prod.revisionCount >= prod.maxRevisions) {
      return c.json({ error: `Revision limit reached (${prod.maxRevisions} max)` }, 422);
    }

    await db.update(schema.productions)
      .set({
        revisionCount: (prod.revisionCount ?? 0) + 1,
        currentStage: "revision_requested",
        updatedAt: new Date(),
      })
      .where(eq(schema.productions.id, productionId));

    // Log ticket for support
    await db.insert(schema.tickets).values({
      id: nanoid(),
      userId: user.id,
      subject: `Revision request — ${prod.productSlug}`,
      body: notes,
      status: "open",
      priority: "normal",
    });

    return c.json({ success: true, revisionsUsed: (prod.revisionCount ?? 0) + 1, max: prod.maxRevisions }, 200);
  })

  // ─── GET /api/dashboard/billing ──────────────────────────────────────────
  .get("/billing", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [billing, subscriptions, orders] = await Promise.all([
      db.select().from(schema.billingEvents).where(eq(schema.billingEvents.userId, user.id)).orderBy(desc(schema.billingEvents.createdAt)).limit(50),
      db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, user.id)).orderBy(desc(schema.subscriptions.createdAt)),
      db.select().from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.createdAt)),
    ]);
    return c.json({ billing, subscriptions, orders }, 200);
  })

  // ─── PATCH /api/dashboard/profile ────────────────────────────────────────
  .patch("/profile", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const { name, displayName, timezone, preferredGenre, preferredMood } = body as Record<string, string>;

    // Update profile if it exists
    const existing = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id)).limit(1);
    if (existing.length > 0) {
      await db.update(schema.profiles)
        .set({
          displayName: displayName ?? existing[0].displayName,
          timezone: timezone ?? existing[0].timezone,
          preferredGenre: preferredGenre ?? existing[0].preferredGenre,
          preferredMood: preferredMood ?? existing[0].preferredMood,
          updatedAt: new Date(),
        })
        .where(eq(schema.profiles.userId, user.id));
    }

    // Better Auth name update would go through auth.api — for now update profile only
    return c.json({ success: true }, 200);
  })

  // ─── POST /api/dashboard/referral/track ──────────────────────────────────
  .post("/referral/track", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { referralCode, event } = body as { referralCode?: string; event?: string };
    if (!referralCode || !event) return c.json({ ok: true }, 200);
    // Find referrer by memberId embedded in code (GM-XXXXXXXX)
    const memberId = referralCode.replace("GM-", "");
    const [member] = await db
      .select()
      .from(schema.members)
      .where(sql`UPPER(${schema.members.memberId}) LIKE UPPER(${'%' + memberId + '%'})`)
      .limit(1);
    if (member) {
      await db.insert(schema.auditLogs).values({
        actorId: member.userId,
        actorRole: "member",
        action: event === "click" ? "referral.click" : "referral.converted",
        resourceType: "referral",
        resourceId: referralCode,
      });
    }
    return c.json({ ok: true }, 200);
  })

  // ─── POST /api/dashboard/support/ticket ──────────────────────────────────
  .post("/support/ticket", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const { subject, body: msgBody, priority } = body as { subject?: string; body?: string; priority?: string };

    if (!subject || !msgBody) {
      return c.json({ error: "subject and body required" }, 400);
    }

    const ticketId = nanoid();
    await db.insert(schema.tickets).values({
      id: ticketId,
      userId: user.id,
      subject: subject.slice(0, 200),
      body: msgBody.slice(0, 5000),
      status: "open",
      priority: (priority as "low" | "normal" | "high" | "urgent") ?? "normal",
    });

    return c.json({ success: true, ticketId }, 201);
  })

  // ─── GET /api/dashboard/lipsync ────────────────────────────────────────
  // Phase 7: Return all lip sync jobs for this member (with output URLs)
  .get("/lipsync", requireAuth, async (c) => {
    const user = c.get("user")!;
    const jobs = await db
      .select()
      .from(schema.aiJobs)
      .where(and(eq(schema.aiJobs.userId, user.id), eq(schema.aiJobs.jobType, "lip_sync")))
      .orderBy(desc(schema.aiJobs.queuedAt))
      .limit(50);

    // Enrich: extract outputUrl from outputPayload if available
    const enriched = jobs.map(j => {
      const out = (j.outputPayload ?? {}) as Record<string, unknown>;
      return {
        ...j,
        outputUrl: (out.outputUrl ?? out.output_url ?? out.r2Url ?? out.r2_url ?? null) as string | null,
        thumbnailUrl: (out.thumbnailUrl ?? out.thumbnail_url ?? null) as string | null,
        durationSeconds: (out.durationSeconds ?? out.duration_seconds ?? j.durationSeconds ?? null) as number | null,
      };
    });

    return c.json({ jobs: enriched }, 200);
  })

  // ─── POST /api/dashboard/lipsync/request ──────────────────────────────
  // Phase 7: Member requests lip sync add-on for a production
  // Elite = free, others = $29 billing event
  .post("/lipsync/request", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const { productionId, videoUrl, audioUrl, durationSeconds } =
      body as { productionId?: string; videoUrl?: string; audioUrl?: string; durationSeconds?: number };

    if (!productionId) {
      return c.json({ error: "productionId is required" }, 400);
    }
    if (!videoUrl || !audioUrl) {
      return c.json({ error: "videoUrl and audioUrl are required" }, 400);
    }

    // Verify production belongs to member
    const [prod] = await db
      .select()
      .from(schema.productions)
      .where(and(eq(schema.productions.id, productionId), eq(schema.productions.userId, user.id)))
      .limit(1);
    if (!prod) return c.json({ error: "Production not found" }, 404);

    // Check member tier for Elite free benefit
    const [member] = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.userId, user.id))
      .limit(1);
    const isElite = member?.tier === "elite";

    // If not Elite, record billing event ($29)
    if (!isElite) {
      await db.insert(schema.billingEvents).values({
        id: nanoid(),
        userId: user.id,
        orderId: prod.orderId,
        eventType: "charge",
        provider: "internal",
        amountCents: 2900,
        metadata: { description: "Sophia AI Lip Sync Add-on", productionId },
      });
    }

    // Submit lip sync job via orchestration engine
    const engine = OrchestrationEngine.getInstance();
    const jobId = nanoid();
    await engine.submitJob({
      userId: user.id,
      orderId: prod.orderId ?? undefined,
      jobType: "lip_sync",
      inputPayload: {
        jobId,
        orderId: prod.orderId ?? "",
        userId: user.id,
        productionId,
        videoUrl,
        audioUrl,
        durationSeconds: durationSeconds ?? 60,
        guidanceScale: 2.0,
        syncConfidence: 0.92,
        isEliteFree: isElite,
      },
    });

    // Audit log
    await db.insert(schema.auditLogs).values({
      actorId: user.id,
      actorRole: "member",
      action: "lipsync.requested",
      resourceType: "production",
      resourceId: productionId,
      metadata: { isElite, jobId, productSlug: prod.productSlug },
    });

    return c.json({
      ok: true,
      jobId,
      isEliteFree: isElite,
      chargedCents: isElite ? 0 : 2900,
      message: isElite
        ? "Lip sync queued — free with your Elite membership."
        : "Lip sync queued — $29 add-on applied to your account.",
    }, 201);
  });
