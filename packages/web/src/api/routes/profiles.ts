import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { db } from "../database/pg-client";
import * as schema from "../database/pg-schema";
import { requireAuth } from "../middleware/auth";
import { eq } from "drizzle-orm";

export const profiles = new Hono<HonoEnv>()
  // GET /api/profile/me
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user") as any;

    const rows = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
    let profile = rows[0];

    if (!profile) {
      const [created] = await db
        .insert(schema.profiles)
        .values({ userId: user.id })
        .returning();
      profile = created;
    }

    return c.json({ profile, user }, 200);
  })

  // PATCH /api/profile/me
  .patch("/me", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const body = await c.req.json();

    const allowed = [
      "bio", "phone", "country", "timezone", "fullName",
      "onboardingStep", "onboardingComplete", "avatarUrl",
      "language", "storyS", "emotionalProfile",
    ];
    const updates: Record<string, any> = {};
    for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
    // support legacy "avatarKey" field name from frontend
    if (body.avatarKey !== undefined) updates.avatarUrl = body.avatarKey;
    updates.updatedAt = new Date();

    const existing = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));

    if (existing.length === 0) {
      const [p] = await db
        .insert(schema.profiles)
        .values({ userId: user.id, ...updates })
        .returning();
      return c.json({ profile: p }, 200);
    }

    const [p] = await db
      .update(schema.profiles)
      .set(updates)
      .where(eq(schema.profiles.userId, user.id))
      .returning();

    return c.json({ profile: p }, 200);
  });
