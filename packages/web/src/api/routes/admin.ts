import { Hono } from "hono";
import { db } from "../database/pg-client";
import * as schema from "../database/pg-schema";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { desc, eq, count, sql } from "drizzle-orm";

export const admin = new Hono()
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
        totalMembers:      totalMembers.count,
        activeMembers:     activeMembers.count,
        totalOrders:       totalOrders.count,
        pendingOrders:     pendingOrders.count,
        completedOrders:   completedOrders.count,
        totalRevenueCents: totalRevenue.sum ?? 0,
        activeProductions: activeProductions.count,
        aiJobsRunning:     aiJobsRunning.count,
        openTickets:       openTickets.count,
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
      .orderBy(desc(schema.aiJobs.createdAt))
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
      totalRevenueCents: total.sum ?? 0,
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
  });
