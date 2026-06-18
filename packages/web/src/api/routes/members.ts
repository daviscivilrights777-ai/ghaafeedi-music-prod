import { Hono } from "hono";
import { db } from "../database/pg-client";
import * as schema from "../database/pg-schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { nanoid } from "nanoid";

// ─── Generate unique GM-XXXXXXXX member ID ────────────────────────────────────
function generateMemberId(): string {
  // 8-digit numeric, zero-padded
  const num = Math.floor(Math.random() * 100_000_000).toString().padStart(8, "0");
  return `GM-${num}`;
}

async function generateUniqueMemberId(): Promise<string> {
  // Retry up to 10 times to avoid collision (1 in 100M chance per attempt)
  for (let i = 0; i < 10; i++) {
    const mid = generateMemberId();
    const existing = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.memberId, mid))
      .limit(1);
    if (existing.length === 0) return mid;
  }
  // Fallback: UUID-derived
  return `GM-${nanoid(8).replace(/[^0-9]/g, "0").padEnd(8, "0")}`;
}

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

export const members = new Hono()
  .use("*", authMiddleware)

  // ─── POST /api/members/create — called server-side after signup ───────────
  .post("/create", requireAuth, async (c) => {
    const user = c.get("user")!;
    // Idempotent — return existing if already created
    const existing = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.userId, user.id))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ member: existing[0] }, 200);
    }

    const memberId = await generateUniqueMemberId();
    const [member] = await db
      .insert(schema.members)
      .values({ id: nanoid(), userId: user.id, memberId, status: "active", tier: "free" })
      .returning();

    await writeAuditLog({
      userId: user.id,
      memberId,
      action: "member.created",
      entity: "member",
      entityId: member.id,
      ip: c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip"),
      userAgent: c.req.header("user-agent"),
    });

    return c.json({ member }, 201);
  })

  // ─── GET /api/members/me ─────────────────────────────────────────────────
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [member] = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.userId, user.id))
      .limit(1);

    if (!member) {
      return c.json({ member: null }, 200);
    }

    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1);

    // Active subscriptions
    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, user.id));

    const activeSubs = subs.filter(s => s.status === "active");

    return c.json({
      member: {
        ...member,
        profile: profile ?? null,
        email: user.email,
        name: user.name,
        subscriptions: activeSubs,
      }
    }, 200);
  })

  // ─── GET /api/members/orders ─────────────────────────────────────────────
  .get("/orders", requireAuth, async (c) => {
    const user = c.get("user")!;
    const userOrders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, user.id))
      .orderBy(desc(schema.orders.createdAt));

    return c.json({ orders: userOrders }, 200);
  })

  // ─── GET /api/members/productions ────────────────────────────────────────
  .get("/productions", requireAuth, async (c) => {
    const user = c.get("user")!;
    const prods = await db
      .select()
      .from(schema.productions)
      .where(eq(schema.productions.userId, user.id))
      .orderBy(desc(schema.productions.createdAt));

    return c.json({ productions: prods }, 200);
  });
