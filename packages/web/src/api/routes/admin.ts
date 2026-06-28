import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { db } from "../database/pg-client";
import * as schema from "../database/pg-schema";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { desc, eq, count, sql } from "drizzle-orm";
import { EngramClient } from "../../lib/engram-client";

export const admin = new Hono<HonoEnv>()
  .use("*", authMiddleware)
  .use("*", requireAdmin)

  // ─── GET /api/admin/overview ─────────────────────────────────────────────
  .get("/overview", async (c) => {
    const [totalMembers]    = await db.select({ count: count() }).from(schema.members);
    const [activeMembers]   = await db.select({ count: count() }).from(schema.members).where(eq(schema.members.status, "active"));
    const [totalOrders]     = await db.select({ count: count() }).from(schema.orders);
    const [pendingOrders]   = await db.select({ count: count() }).from(schema.orders).where(eq(schema.orders.status, "pending"));
    const [completedOrders] = await db.select({ count: count() }).from(schema.orders).where(eq(schema.orders.status, "paid"));
    const [totalRevenue]    = await db.select({ sum: sql<number>`coalesce(sum(price_cents), 0)` }).from(schema.orders).where(eq(schema.orders.status, "paid"));
    const [activeProductions] = await db.select({ count: count() }).from(schema.productions).where(
      sql`status NOT IN ('delivered','archived')`
    );
    const [aiJobsRunning] = await db.select({ count: count() }).from(schema.aiJobs).where(
      sql`status IN ('queued','dispatched','processing')`
    );
    const [openTickets] = await db.select({ count: count() }).from(schema.tickets).where(eq(schema.tickets.status, "open"));

    const tierRows = await db
      .select({ tier: schema.members.tier, count: count() })
      .from(schema.members)
      .groupBy(schema.members.tier);

    const recentOrders = await db
      .select()
      .from(schema.orders)
      .orderBy(desc(schema.orders.createdAt))
      .limit(10);

    const revenueByProduct = await db
      .select({
        productSlug: schema.orders.productSlug,
        productName: schema.orders.productName,
        totalCents:  sql<number>`sum(price_cents)`,
        orderCount:  count(),
      })
      .from(schema.orders)
      .where(eq(schema.orders.status, "paid"))
      .groupBy(schema.orders.productSlug, schema.orders.productName)
      .orderBy(desc(sql`sum(price_cents)`))
      .limit(10);

    return c.json({
      kpis: {
        totalMembers:      totalMembers?.count ?? 0,
        activeMembers:     activeMembers?.count ?? 0,
        totalOrders:       totalOrders?.count ?? 0,
        pendingOrders:     pendingOrders?.count ?? 0,
        completedOrders:   completedOrders?.count ?? 0,
        totalRevenueCents: (totalRevenue as any)?.sum ?? 0,
        activeProductions: activeProductions?.count ?? 0,
        aiJobsRunning:     aiJobsRunning?.count ?? 0,
        openTickets:       openTickets?.count ?? 0,
      },
      tierBreakdown: tierRows,
      recentOrders,
      revenueByProduct,
    }, 200);
  })

  // ─── GET /api/admin/members ──────────────────────────────────────────────
  .get("/members", async (c) => {
    const search = c.req.query("search") ?? "";
    const tier   = c.req.query("tier")   ?? "";
    const status = c.req.query("status") ?? "";
    const limit  = Math.min(parseInt(c.req.query("limit")  ?? "50"), 200);
    const offset = parseInt(c.req.query("offset") ?? "0");

    let rows = await db
      .select({
        id:        schema.members.id,
        memberId:  schema.members.memberId,
        tier:      schema.members.tier,
        status:    schema.members.status,
        joinedAt:  schema.members.joinedAt,
        updatedAt: schema.members.updatedAt,
        userId:    schema.members.userId,
        userName:  schema.user.name,
        userEmail: schema.user.email,
      })
      .from(schema.members)
      .leftJoin(schema.user, eq(schema.members.userId, schema.user.id))
      .orderBy(desc(schema.members.joinedAt))
      .limit(limit)
      .offset(offset);

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.userEmail?.toLowerCase().includes(q) ||
        r.userName?.toLowerCase().includes(q) ||
        r.memberId?.toLowerCase().includes(q)
      );
    }
    if (tier)   rows = rows.filter(r => r.tier === tier);
    if (status) rows = rows.filter(r => r.status === status);

    return c.json({ members: rows, total: rows.length }, 200);
  })

  // ─── PATCH /api/admin/members/:memberId ─────────────────────────────────
  .patch("/members/:memberId", async (c) => {
    const { memberId } = c.req.param();
    const body = await c.req.json() as { tier?: string; status?: string };
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.tier)   update.tier   = body.tier;
    if (body.status) update.status = body.status;
    await db.update(schema.members).set(update).where(eq(schema.members.memberId, memberId));
    return c.json({ success: true }, 200);
  })

  // ─── GET /api/admin/orders ───────────────────────────────────────────────
  .get("/orders", async (c) => {
    const status = c.req.query("status") ?? "";
    const limit  = Math.min(parseInt(c.req.query("limit")  ?? "50"), 200);
    const offset = parseInt(c.req.query("offset") ?? "0");

    let rows = await db
      .select({
        id:              schema.orders.id,
        memberId:        schema.orders.memberId,
        productSlug:     schema.orders.productSlug,
        productName:     schema.orders.productName,
        tier:            schema.orders.tier,
        priceCents:      schema.orders.priceCents,
        status:          schema.orders.status,
        paymentProvider: schema.orders.paymentProvider,
        createdAt:       schema.orders.createdAt,
        userName:        schema.user.name,
        userEmail:       schema.user.email,
      })
      .from(schema.orders)
      .leftJoin(schema.user, eq(schema.orders.userId, schema.user.id))
      .orderBy(desc(schema.orders.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) rows = rows.filter(r => r.status === status);
    return c.json({ orders: rows }, 200);
  })

  // ─── PATCH /api/admin/orders/:id ────────────────────────────────────────
  .patch("/orders/:id", async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json() as { status?: string; notes?: string };
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined) update.status = body.status;
    if (body.notes  !== undefined) update.notes  = body.notes;
    await db.update(schema.orders).set(update).where(eq(schema.orders.id, id));
    return c.json({ success: true }, 200);
  })

  // ─── GET /api/admin/productions ─────────────────────────────────────────
  .get("/productions", async (c) => {
    const status = c.req.query("status") ?? "";
    const limit  = Math.min(parseInt(c.req.query("limit") ?? "50"), 200);

    let rows = await db
      .select({
        id:                  schema.productions.id,
        memberId:            schema.productions.memberId,
        productSlug:         schema.productions.productSlug,
        status:              schema.productions.status,
        currentStage:        schema.productions.currentStage,
        revisionCount:       schema.productions.revisionCount,
        estimatedDeliveryAt: schema.productions.estimatedDeliveryAt,
        deliveredAt:         schema.productions.deliveredAt,
        createdAt:           schema.productions.createdAt,
        userName:            schema.user.name,
        userEmail:           schema.user.email,
      })
      .from(schema.productions)
      .leftJoin(schema.user, eq(schema.productions.userId, schema.user.id))
      .orderBy(desc(schema.productions.createdAt))
      .limit(limit);

    if (status) rows = rows.filter(r => r.status === status);
    return c.json({ productions: rows }, 200);
  })

  // ─── PATCH /api/admin/productions/:id ───────────────────────────────────
  .patch("/productions/:id", async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json() as { status?: string; currentStage?: string; notes?: string };
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status       !== undefined) update.status       = body.status;
    if (body.currentStage !== undefined) update.currentStage = body.currentStage;
    if (body.notes        !== undefined) update.notes        = body.notes;
    await db.update(schema.productions).set(update).where(eq(schema.productions.id, id));
    return c.json({ success: true }, 200);
  })

  // ─── GET /api/admin/ai-jobs ──────────────────────────────────────────────
  .get("/ai-jobs", async (c) => {
    const status = c.req.query("status") ?? "";
    const limit  = Math.min(parseInt(c.req.query("limit") ?? "50"), 200);

    let rows = await db
      .select()
      .from(schema.aiJobs)
      .orderBy(desc(schema.aiJobs.queuedAt))
      .limit(limit);

    if (status) rows = rows.filter(r => r.status === status);
    return c.json({ jobs: rows }, 200);
  })

  // ─── GET /api/admin/revenue ──────────────────────────────────────────────
  .get("/revenue", async (c) => {
    const [total] = await db
      .select({ sum: sql<number>`coalesce(sum(price_cents), 0)` })
      .from(schema.orders)
      .where(eq(schema.orders.status, "paid"));

    const byProvider = await db
      .select({
        provider:   schema.orders.paymentProvider,
        totalCents: sql<number>`sum(price_cents)`,
        count:      count(),
      })
      .from(schema.orders)
      .where(eq(schema.orders.status, "paid"))
      .groupBy(schema.orders.paymentProvider);

    const byProduct = await db
      .select({
        productSlug: schema.orders.productSlug,
        productName: schema.orders.productName,
        totalCents:  sql<number>`sum(price_cents)`,
        count:       count(),
      })
      .from(schema.orders)
      .where(eq(schema.orders.status, "paid"))
      .groupBy(schema.orders.productSlug, schema.orders.productName)
      .orderBy(desc(sql`sum(price_cents)`));

    const byTier = await db
      .select({
        tier:       schema.orders.tier,
        totalCents: sql<number>`sum(price_cents)`,
        count:      count(),
      })
      .from(schema.orders)
      .where(eq(schema.orders.status, "paid"))
      .groupBy(schema.orders.tier);

    // Monthly revenue — PostgreSQL syntax
    const monthly = await db
      .select({
        month:      sql<string>`to_char(created_at, 'YYYY-MM')`,
        totalCents: sql<number>`sum(price_cents)`,
        count:      count(),
      })
      .from(schema.orders)
      .where(eq(schema.orders.status, "paid"))
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM')`);

    return c.json({
      totalRevenueCents: (total as any)?.sum ?? 0,
      byProvider,
      byProduct,
      byTier,
      monthly,
    }, 200);
  })

  // ─── GET /api/admin/support ──────────────────────────────────────────────
  .get("/support", async (c) => {
    const status   = c.req.query("status")   ?? "";
    const priority = c.req.query("priority") ?? "";
    const limit    = Math.min(parseInt(c.req.query("limit") ?? "50"), 200);

    let rows = await db
      .select({
        id:         schema.tickets.id,
        subject:    schema.tickets.subject,
        status:     schema.tickets.status,
        priority:   schema.tickets.priority,
        assignedTo: schema.tickets.assignedTo,
        createdAt:  schema.tickets.createdAt,
        updatedAt:  schema.tickets.updatedAt,
        memberId:   schema.tickets.memberId,
        userName:   schema.user.name,
        userEmail:  schema.user.email,
      })
      .from(schema.tickets)
      .leftJoin(schema.user, eq(schema.tickets.userId, schema.user.id))
      .orderBy(desc(schema.tickets.createdAt))
      .limit(limit);

    if (status)   rows = rows.filter(r => r.status   === status);
    if (priority) rows = rows.filter(r => r.priority === priority);
    return c.json({ tickets: rows }, 200);
  })

  // ─── GET /api/admin/audit-logs ───────────────────────────────────────────
  .get("/audit-logs", async (c) => {
    const limit = Math.min(parseInt(c.req.query("limit") ?? "100"), 500);
    const rows  = await db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);
    return c.json({ logs: rows }, 200);
  })

  // ─── GET /api/admin/providers ────────────────────────────────────────────
  .get("/providers", async (c) => {
    const pool = (db as any).$client;
    const res  = await pool.query(`SELECT * FROM providers ORDER BY priority ASC`);
    return c.json({ providers: res.rows }, 200);
  })

  // ─── PATCH /api/admin/providers/:name ───────────────────────────────────
  .patch("/providers/:name", async (c) => {
    const { name } = c.req.param();
    const body = await c.req.json() as { enabled?: boolean; priority?: number; hourly_budget_cents?: number };
    const pool = (db as any).$client;
    await pool.query(
      `UPDATE providers SET enabled = COALESCE($1, enabled), priority = COALESCE($2, priority),
       hourly_budget_cents = COALESCE($3, hourly_budget_cents), updated_at = NOW() WHERE name = $4`,
      [body.enabled ?? null, body.priority ?? null, body.hourly_budget_cents ?? null, name]
    );
    return c.json({ success: true }, 200);
  })

  // ─── GET /api/admin/webhook-events ──────────────────────────────────────
  .get("/webhook-events", async (c) => {
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 200);
    const pool  = (db as any).$client;
    const res   = await pool.query(`SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT $1`, [limit]);
    return c.json({ events: res.rows }, 200);
  })

  // ─── GET /api/admin/automation-runs ─────────────────────────────────────
  .get("/automation-runs", async (c) => {
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 200);
    const pool  = (db as any).$client;
    const res   = await pool.query(`SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT $1`, [limit]);
    return c.json({ runs: res.rows }, 200);
  })

  // ─── GET /api/admin/lipsync ── Phase 8 ────────────────────────────────────
  // All lip_sync jobs across all members, with user email joined
  .get("/lipsync", async (c) => {
    const status = c.req.query("status") ?? "";
    const limit  = Math.min(parseInt(c.req.query("limit") ?? "100"), 500);
    const pool   = (db as any).$client;

    const whereClause = status
      ? `AND aj.status = $2`
      : "";
    const params: unknown[] = status ? [limit, status] : [limit];

    const res = await pool.query(
      `SELECT aj.id, aj.user_id, aj.order_id, aj.status, aj.provider, aj.queued_at,
              aj.completed_at, aj.actual_cost_cents, aj.error_message, aj.retry_count,
              aj.output_payload, aj.duration_seconds,
              u.email AS member_email, u.name AS member_name
       FROM ai_jobs aj
       LEFT JOIN "user" u ON u.id = aj.user_id
       WHERE aj.job_type = 'lip_sync'
       ${whereClause}
       ORDER BY aj.queued_at DESC
       LIMIT $1`,
      params
    );

    const rows = res.rows ?? [];

    // Normalize to camelCase for frontend
    const jobs = rows.map((r: any) => {
      const out = r.output_payload as Record<string, unknown> | null;
      return {
        id:             r.id,
        userId:         r.user_id,
        orderId:        r.order_id,
        status:         r.status,
        provider:       r.provider,
        costCents:      r.actual_cost_cents,
        durationMs:     r.duration_seconds != null ? Math.round(r.duration_seconds * 1000) : null,
        errorMessage:   r.error_message,
        retryCount:     r.retry_count,
        outputUrl:      (out?.outputUrl ?? out?.output_url ?? out?.r2Url ?? out?.r2_url ?? null) as string | null,
        createdAt:      r.queued_at,
        completedAt:    r.completed_at,
        userEmail:      r.member_email,
        memberName:     r.member_name,
        productionTitle: (r.input_payload as any)?.productionTitle ?? (r.input_payload as any)?.title ?? null,
      };
    });

    // Stats
    const total         = jobs.length;
    const queued        = jobs.filter((j: any) => j.status === "queued").length;
    const running       = jobs.filter((j: any) => j.status === "running" || j.status === "dispatched").length;
    const completed     = jobs.filter((j: any) => j.status === "completed" || j.status === "complete").length;
    const failed        = jobs.filter((j: any) => j.status === "failed").length;
    const totalCostCents = jobs.reduce((s: number, j: any) => s + (j.costCents ?? 0), 0);
    const durations     = jobs.filter((j: any) => j.durationMs != null).map((j: any) => j.durationMs as number);
    const avgDurationMs = durations.length ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0;

    return c.json({
      jobs,
      stats: { total, queued, running, completed, failed, totalCostCents, avgDurationMs },
    }, 200);
  })

  // ─── POST /api/admin/lipsync/:jobId/retry ── Phase 8 ─────────────────────
  .post("/lipsync/:jobId/retry", async (c) => {
    const { jobId } = c.req.param();
    const pool = (db as any).$client;

    // Get the failed job
    const res = await pool.query(
      `SELECT * FROM ai_jobs WHERE id = $1 AND job_type = 'lip_sync'`,
      [jobId]
    );
    const job = res.rows?.[0];
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.status !== "failed" && job.status !== "cancelled") {
      return c.json({ error: "Only failed or cancelled jobs can be retried" }, 400);
    }

    // Reset job to queued
    await pool.query(
      `UPDATE ai_jobs SET status = 'queued', error_message = NULL, retry_count = 0,
       completed_at = NULL, queued_at = NOW() WHERE id = $1`,
      [jobId]
    );

    return c.json({ ok: true, jobId, message: "Job re-queued for processing" }, 200);
  })

  // ─── POST /api/admin/lipsync/:jobId/cancel ── Phase 8 ───────────────────
  .post("/lipsync/:jobId/cancel", async (c) => {
    const { jobId } = c.req.param();
    const pool = (db as any).$client;

    const res = await pool.query(
      `SELECT status FROM ai_jobs WHERE id = $1 AND job_type = 'lip_sync'`,
      [jobId]
    );
    const job = res.rows?.[0];
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.status !== "queued" && job.status !== "dispatched") {
      return c.json({ error: "Only queued or dispatched jobs can be cancelled" }, 400);
    }

    await pool.query(
      `UPDATE ai_jobs SET status = 'cancelled', completed_at = NOW() WHERE id = $1`,
      [jobId]
    );

    return c.json({ ok: true, jobId, message: "Job cancelled" }, 200);
  })

  // ─── Fix 5: GET /api/admin/qa-results ────────────────────────────────────
  // Returns shot QA results with optional order_id filter and pagination.
  .get("/qa-results", async (c) => {
    const pool  = (db as any).$client;
    const orderId = c.req.query("order_id") || null;
    const limit   = Math.min(parseInt(c.req.query("limit") || "100"), 500);
    const offset  = parseInt(c.req.query("offset") || "0");

    // Ensure table exists (idempotent)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shot_qa_results (
        id              BIGSERIAL PRIMARY KEY,
        order_id        TEXT        NOT NULL,
        character_id    TEXT        NOT NULL,
        shot_index      INTEGER     NOT NULL,
        passed          BOOLEAN     NOT NULL,
        score           REAL        NOT NULL,
        method          TEXT        NOT NULL,
        message         TEXT        NOT NULL,
        fail_count      INTEGER     NOT NULL DEFAULT 0,
        frame_url       TEXT        NOT NULL DEFAULT '',
        drift_flagged   BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_shot_qa_order
        ON shot_qa_results (order_id, created_at DESC);
    `);

    // KPI row
    const kpiRes = await pool.query(`
      SELECT
        COUNT(*)                                         AS total_shots,
        COUNT(*) FILTER (WHERE passed = TRUE)           AS passed_shots,
        COUNT(*) FILTER (WHERE passed = FALSE)          AS failed_shots,
        COUNT(*) FILTER (WHERE drift_flagged = TRUE)    AS drift_flagged,
        ROUND(AVG(score)::numeric, 4)                   AS avg_score,
        ROUND(MIN(score)::numeric, 4)                   AS min_score,
        COUNT(DISTINCT order_id)                        AS total_orders
      FROM shot_qa_results
      ${orderId ? "WHERE order_id = $1" : ""}
    `, orderId ? [orderId] : []);

    // Rows
    const rowsRes = await pool.query(`
      SELECT id, order_id, character_id, shot_index, passed, score,
             method, message, fail_count, frame_url, drift_flagged, created_at
      FROM   shot_qa_results
      ${orderId ? "WHERE order_id = $1" : ""}
      ORDER  BY created_at DESC
      LIMIT  ${limit} OFFSET ${offset}
    `, orderId ? [orderId] : []);

    // Worst orders (most failed shots)
    const worstRes = await pool.query(`
      SELECT order_id,
             COUNT(*)                                       AS total_shots,
             COUNT(*) FILTER (WHERE passed = FALSE)        AS failed_shots,
             COUNT(*) FILTER (WHERE drift_flagged = TRUE)  AS drift_flags,
             ROUND(AVG(score)::numeric, 3)                 AS avg_score
      FROM   shot_qa_results
      GROUP  BY order_id
      ORDER  BY failed_shots DESC
      LIMIT  10
    `);

    return c.json({
      kpis:         kpiRes.rows[0] ?? {},
      rows:         rowsRes.rows ?? [],
      worst_orders: worstRes.rows ?? [],
      pagination:   { limit, offset, returned: rowsRes.rows?.length ?? 0 },
    });
  })

  // ─── GET /api/admin/engram/health ────────────────────────────────────────
  // Returns Engram memory layer health + memory count stats.
  .get("/engram/health", async (c) => {
    const health = await EngramClient.health();

    return c.json({
      status:        health.status,
      latencyMs:     health.latencyMs ?? null,
      ok:            health.ok,
      error:         health.error ?? null,
      configured:    EngramClient.isConfigured(),
      totalMemories: health.totalMemories ?? 0,
    });
  })

  // ─── Fix 5: GET /api/admin/qa-results/drift ──────────────────────────────
  // Returns only drift-flagged shots for the drift monitor view.
  .get("/qa-results/drift", async (c) => {
    const pool  = (db as any).$client;
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
    try {
      const res = await pool.query(`
        SELECT id, order_id, character_id, shot_index, score, method, message,
               fail_count, frame_url, created_at
        FROM   shot_qa_results
        WHERE  drift_flagged = TRUE
        ORDER  BY created_at DESC
        LIMIT  $1
      `, [limit]);
      return c.json({ rows: res.rows ?? [] });
    } catch {
      return c.json({ rows: [] });
    }
  });
