import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { nanoid } from "nanoid";

function generateProductionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "PROD-";
  for (let i = 0; i < 9; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function writeAuditLog(payload: {
  userId?: string;
  memberId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  await db.insert(schema.auditLogs).values({
    id: nanoid(),
    userId: payload.userId,
    memberId: payload.memberId,
    action: payload.action,
    entity: payload.entity,
    entityId: payload.entityId,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
    ip: payload.ip,
  });
}

export const productions = new Hono()
  .use("*", authMiddleware)

  // ─── GET /api/productions — list user's productions ──────────────────────
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const prods = await db
      .select()
      .from(schema.productions)
      .where(eq(schema.productions.userId, user.id))
      .orderBy(desc(schema.productions.createdAt));

    return c.json({ productions: prods }, 200);
  })

  // ─── GET /api/productions/:id ─────────────────────────────────────────────
  .get("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();

    const [prod] = await db
      .select()
      .from(schema.productions)
      .where(eq(schema.productions.id, id))
      .limit(1);

    if (!prod) return c.json({ error: "Not found" }, 404);
    if (prod.userId !== user.id) return c.json({ error: "Forbidden" }, 403);

    // Include linked order + story
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, prod.orderId))
      .limit(1);

    const storyList = prod.storyId
      ? await db.select().from(schema.stories).where(eq(schema.stories.id, prod.storyId)).limit(1)
      : [];

    const jobs = await db
      .select()
      .from(schema.aiJobs)
      .where(eq(schema.aiJobs.productionId, prod.id))
      .orderBy(desc(schema.aiJobs.createdAt));

    return c.json({
      production: {
        ...prod,
        order: order ?? null,
        story: storyList[0] ?? null,
        aiJobs: jobs,
        deliverableKeys: prod.deliverableKeys ? JSON.parse(prod.deliverableKeys) : [],
      }
    }, 200);
  })

  // ─── POST /api/productions — create a new production from an order ────────
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json<{ orderId: string; maxRevisions?: number }>();
    if (!body.orderId) return c.json({ error: "orderId required" }, 400);

    // Verify order belongs to user
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, body.orderId))
      .limit(1);

    if (!order) return c.json({ error: "Order not found" }, 404);
    if (order.userId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const [member] = await db
      .select({ memberId: schema.members.memberId })
      .from(schema.members)
      .where(eq(schema.members.userId, user.id))
      .limit(1);

    // Estimate delivery: 7 business days default
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);

    const prodId = generateProductionId();
    const [prod] = await db
      .insert(schema.productions)
      .values({
        id: prodId,
        orderId: body.orderId,
        userId: user.id,
        memberId: member?.memberId ?? null,
        productSlug: order.productSlug,
        status: "queued",
        currentStage: "queued",
        maxRevisions: body.maxRevisions ?? 1,
        estimatedDeliveryAt: deliveryDate,
      })
      .returning();

    await writeAuditLog({
      userId: user.id,
      memberId: member?.memberId ?? undefined,
      action: "production.created",
      entity: "production",
      entityId: prod.id,
      metadata: { orderId: body.orderId, productSlug: order.productSlug },
      ip: c.req.header("x-forwarded-for"),
    });

    return c.json({ production: prod }, 201);
  })

  // ─── PATCH /api/productions/:id/stage — advance production stage ──────────
  .patch("/:id/stage", requireAuth, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();
    const body = await c.req.json<{ stage: string; notes?: string }>();

    const [prod] = await db
      .select()
      .from(schema.productions)
      .where(eq(schema.productions.id, id))
      .limit(1);

    if (!prod) return c.json({ error: "Not found" }, 404);
    if (prod.userId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const [updated] = await db
      .update(schema.productions)
      .set({
        currentStage: body.stage,
        status: body.stage === "delivered" ? "delivered" : "processing",
        notes: body.notes ?? prod.notes,
        deliveredAt: body.stage === "delivered" ? new Date() : prod.deliveredAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.productions.id, id))
      .returning();

    await writeAuditLog({
      userId: user.id,
      memberId: prod.memberId ?? undefined,
      action: "production.stage_updated",
      entity: "production",
      entityId: prod.id,
      metadata: { from: prod.currentStage, to: body.stage },
      ip: c.req.header("x-forwarded-for"),
    });

    return c.json({ production: updated }, 200);
  });
