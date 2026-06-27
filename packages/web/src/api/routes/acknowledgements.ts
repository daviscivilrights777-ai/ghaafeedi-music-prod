import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { nanoid } from "nanoid";

async function writeAuditLog(payload: {
  userId?: string;
  memberId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
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
    userAgent: payload.userAgent,
  });
}

export const acknowledgements = new Hono<HonoEnv>()
  .use("*", authMiddleware)

  // ─── POST /api/acknowledgements — record acceptance of product terms ──────
  .post("/", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const body = await c.req.json<{ productSlug: string }>();
    if (!body.productSlug) return c.json({ error: "productSlug required" }, 400);

    // Get member ID
    const [member] = await db
      .select({ memberId: schema.members.memberId })
      .from(schema.members)
      .where(eq(schema.members.userId, user.id))
      .limit(1);

    // Idempotent — return existing
    const existing = await db
      .select()
      .from(schema.acknowledgements)
      .where(
        and(
          eq(schema.acknowledgements.userId, user.id),
          eq(schema.acknowledgements.productSlug, body.productSlug)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ acknowledged: true, ack: existing[0] }, 200);
    }

    const [ack] = await db
      .insert(schema.acknowledgements)
      .values({
        id: nanoid(),
        userId: user.id,
        memberId: member?.memberId ?? null,
        productSlug: body.productSlug,
        ip: c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip"),
        userAgent: c.req.header("user-agent"),
      })
      .returning();

    await writeAuditLog({
      userId: user.id,
      memberId: member?.memberId ?? undefined,
      action: "product.acknowledged",
      entity: "acknowledgement",
      entityId: ack.id,
      metadata: { productSlug: body.productSlug },
      ip: c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip"),
      userAgent: c.req.header("user-agent"),
    });

    return c.json({ acknowledged: true, ack }, 201);
  })

  // ─── GET /api/acknowledgements/:productSlug — check if user acknowledged ──
  .get("/:productSlug", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const { productSlug } = c.req.param();

    const [ack] = await db
      .select()
      .from(schema.acknowledgements)
      .where(
        and(
          eq(schema.acknowledgements.userId, user.id),
          eq(schema.acknowledgements.productSlug, productSlug)
        )
      )
      .limit(1);

    return c.json({ acknowledged: !!ack, ack: ack ?? null }, 200);
  })

  // ─── GET /api/acknowledgements — list all user's acknowledgements ─────────
  .get("/", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const acks = await db
      .select()
      .from(schema.acknowledgements)
      .where(eq(schema.acknowledgements.userId, user.id));

    return c.json({ acknowledgements: acks }, 200);
  });
