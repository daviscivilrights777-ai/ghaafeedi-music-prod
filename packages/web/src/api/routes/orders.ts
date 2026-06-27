import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { db } from "../database/pg-client";
import * as schema from "../database/pg-schema";
import { requireAuth } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";
import { n8nDispatcher } from "../orchestration/n8n-dispatcher";

export const orders = new Hono<HonoEnv>()
  // GET /api/orders — list user's orders
  .get("/", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const rows = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, user.id))
      .orderBy(desc(schema.orders.createdAt));
    return c.json({ orders: rows }, 200);
  })

  // POST /api/orders — create order
  .post("/", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const body = await c.req.json();
    const { productSlug, productName, tier, priceCents, notes, paymentProvider, addons } = body;

    if (!productSlug || !productName || !tier || !priceCents) {
      return c.json({ message: "Missing required fields" }, 400);
    }

    const orderId = `ORD-${crypto.randomUUID().replace(/-/g, "").slice(0, 9).toUpperCase()}`;

    const [order] = await db
      .insert(schema.orders)
      .values({
        id: orderId,
        userId: user.id,
        productSlug,
        productName,
        tier,
        priceCents: Number(priceCents),
        notes: notes ?? null,
        paymentProvider: paymentProvider ?? null,
        addons: addons ?? [],
        status: "pending",
      })
      .returning();

    // Automation 1: fire n8n on order created (treat create as paid for now;
    // swap to PATCH status→paid hook when payment webhook is live)
    n8nDispatcher.orderPaid({
      orderId:       order!.id,
      userId:        user.id,
      productSlug,
      productName,
      priceCents:    Number(priceCents),
      customerEmail: user.email ?? "",
      customerName:  user.name ?? user.email ?? "",
      tier,
    }).catch(() => {}); // fire-and-forget, never block response

    return c.json({ order }, 201);
  })

  // GET /api/orders/:id — single order
  .get("/:id", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const { id } = c.req.param();

    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    if (!order || order.userId !== user.id) return c.json({ message: "Not found" }, 404);

    return c.json({ order }, 200);
  })

  // PATCH /api/orders/:id — update order status (user can cancel pending)
  .patch("/:id", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const { id } = c.req.param();
    const body = await c.req.json() as { status?: string; notes?: string };

    const [existing] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    if (!existing || existing.userId !== user.id) return c.json({ message: "Not found" }, 404);

    // Users can only cancel their own pending orders
    const update: Record<string, any> = { updatedAt: new Date() };
    if (body.status === "cancelled" && existing.status === "pending") update.status = "cancelled";
    if (body.notes !== undefined) update.notes = body.notes;

    const [order] = await db
      .update(schema.orders)
      .set(update)
      .where(eq(schema.orders.id, id))
      .returning();

    // Automation 5: subscription cancelled re-engagement
    if (body.status === "cancelled") {
      n8nDispatcher.subscriptionCancelled({
        userId:        user.id,
        customerEmail: user.email ?? "",
        customerName:  user.name ?? user.email ?? "",
        planName:      existing.productName,
        cancelledAt:   new Date().toISOString(),
      }).catch(() => {});
    }

    return c.json({ order }, 200);
  });
