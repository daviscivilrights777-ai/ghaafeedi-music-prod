import { createMiddleware } from "hono/factory";
import { auth } from "../auth";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
});

export const requireAuth = createMiddleware(async (c, next) => {
  // Local QA bypass — only works when GM_ADMIN_QA_KEY env is set
  const qaKey = process.env.GM_ADMIN_QA_KEY;
  if (qaKey && c.req.header("X-Admin-QA-Key") === qaKey) {
    return next();
  }
  if (!c.get("user")) return c.json({ message: "Unauthorized" }, 401);
  return next();
});

export const requireAdmin = createMiddleware(async (c, next) => {
  // Local QA bypass — only works when GM_ADMIN_QA_KEY env is set
  const qaKey = process.env.GM_ADMIN_QA_KEY;
  if (qaKey && c.req.header("X-Admin-QA-Key") === qaKey) {
    return next();
  }
  const user = c.get("user") as { id: string } | null;
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  // Check role in profiles table
  const [profile] = await db
    .select({ role: schema.profiles.role })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1);
  if (!profile || profile.role !== "admin") {
    return c.json({ message: "Forbidden" }, 403);
  }
  return next();
});
