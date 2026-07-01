import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { db } from "../database/pg-client";
import * as schema from "../database/pg-schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { nanoid } from "nanoid";
import { sendWelcomeEmail } from "../lib/welcome-email";

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
  } as any);
}

export const members = new Hono<HonoEnv>()
  .use("*", authMiddleware)

  // ─── POST /api/members/create — called server-side after signup ───────────
  .post("/create", requireAuth, async (c) => {
    const user = c.get("user") as any;
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
      entityId: member!.id,
      ip: c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip"),
      userAgent: c.req.header("user-agent"),
    });

    // Google OAuth / any first-time member creation path — send welcome email
    // with permanent Member ID (email-signup path sends its own via /complete-signup).
    if (user.email) {
      sendWelcomeEmail({
        to: user.email,
        fullName: user.name ?? "Member",
        memberId,
      }).catch(() => {});
    }

    return c.json({ member }, 201);
  })

  // ─── POST /api/members/complete-signup — enterprise sign-up finalization ──
  // Called once, right after account creation on /create-account. Idempotent
  // on the member record. Saves full profile, records consent, sends the
  // welcome email with the member's permanent GM-XXXXXXXX ID.
  .post("/complete-signup", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const body = await c.req.json().catch(() => ({})) as {
      phone?: string; streetAddress?: string; city?: string; state?: string; zip?: string;
      country?: string; dateOfBirth?: string; referralSource?: string;
      consentAccepted?: boolean;
    };

    // Idempotent member creation
    const existing = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.userId, user.id))
      .limit(1);

    let memberId: string;
    if (existing.length > 0) {
      memberId = existing[0]!.memberId;
    } else {
      memberId = await generateUniqueMemberId();
      await db
        .insert(schema.members)
        .values({ id: nanoid(), userId: user.id, memberId, status: "active", tier: "free" });

      await writeAuditLog({
        userId: user.id,
        memberId,
        action: "member.created",
        entity: "member",
        entityId: memberId,
        ip: c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip"),
        userAgent: c.req.header("user-agent"),
      });
    }

    const now = new Date();
    await db
      .insert(schema.profiles)
      .values({
        userId: user.id,
        fullName: user.name ?? null,
        phone: body.phone ?? null,
        country: body.country ?? null,
        streetAddress: body.streetAddress ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        zip: body.zip ?? null,
        dateOfBirth: body.dateOfBirth ?? null,
        referralSource: body.referralSource ?? null,
        consentAcceptedAt: body.consentAccepted ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.profiles.userId,
        set: {
          fullName: user.name ?? undefined,
          phone: body.phone ?? undefined,
          country: body.country ?? undefined,
          streetAddress: body.streetAddress ?? undefined,
          city: body.city ?? undefined,
          state: body.state ?? undefined,
          zip: body.zip ?? undefined,
          dateOfBirth: body.dateOfBirth ?? undefined,
          referralSource: body.referralSource ?? undefined,
          ...(body.consentAccepted ? { consentAcceptedAt: now } : {}),
          updatedAt: now,
        },
      });

    if (user.email) {
      sendWelcomeEmail({
        to: user.email,
        fullName: user.name ?? "Member",
        memberId,
      }).catch(() => {});
    }

    return c.json({ memberId }, 200);
  })

  // ─── GET /api/members/me ─────────────────────────────────────────────────
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user") as any;
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

  // ─── GET /api/members/consent-status ────────────────────────────────────
  .get("/consent-status", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const [profile] = await db
      .select({ consentAcceptedAt: schema.profiles.consentAcceptedAt })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1);
    return c.json({ consentAccepted: !!profile?.consentAcceptedAt, consentAcceptedAt: profile?.consentAcceptedAt ?? null });
  })

  // ─── POST /api/members/accept-consent ────────────────────────────────────
  .post("/accept-consent", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const now = new Date();
    // Upsert: create profile row if it doesn't exist, update consent timestamp if it does
    await db
      .insert(schema.profiles)
      .values({ userId: user.id, consentAcceptedAt: now, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.profiles.userId,
        set: { consentAcceptedAt: now, updatedAt: now },
      });
    return c.json({ ok: true, consentAcceptedAt: now.toISOString() });
  })

  // ─── GET /api/members/orders ─────────────────────────────────────────────
  .get("/orders", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const userOrders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, user.id))
      .orderBy(desc(schema.orders.createdAt));

    return c.json({ orders: userOrders }, 200);
  })

  // ─── GET /api/members/productions ────────────────────────────────────────
  .get("/productions", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const prods = await db
      .select()
      .from(schema.productions)
      .where(eq(schema.productions.userId, user.id))
      .orderBy(desc(schema.productions.createdAt));

    return c.json({ productions: prods }, 200);
  });
