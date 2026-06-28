/**
 * Memory Admin Routes — Ghaafeedi Music
 *
 * GET    /api/memory/health           — engram health check (admin)
 * GET    /api/memory/:userId          — view all memories for a user (admin)
 * DELETE /api/memory/:userId          — GDPR erasure for a user (admin)
 * GET    /api/memory/:userId/audit    — audit chain verify (admin)
 *
 * All routes require admin role.
 */

import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { auth } from "../auth";
import { db } from "../database/pg-client";
import { profiles } from "../database/pg-schema";
import { eq } from "drizzle-orm";
import { EngramClient } from "../../lib/engram-client";

const app = new Hono<HonoEnv>();

// ─── Admin guard ──────────────────────────────────────────────────────────────

async function requireAdmin(c: any): Promise<string | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return null;
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1) as any[];
  if (!profile || profile.role !== "admin") return null;
  return session.user.id;
}

// ─── GET /api/memory/health ───────────────────────────────────────────────────

app.get("/health", async (c) => {
  const adminId = await requireAdmin(c);
  if (!adminId) return c.json({ error: "Forbidden" }, 403);

  const result = await EngramClient.health();
  return c.json({
    configured:    EngramClient.isConfigured(),
    engramBaseUrl: process.env.ENGRAM_BASE_URL ? "set" : "not set",
    ...result,
  });
});

// ─── GET /api/memory/:userId ──────────────────────────────────────────────────

app.get("/:userId", async (c) => {
  const adminId = await requireAdmin(c);
  if (!adminId) return c.json({ error: "Forbidden" }, 403);

  const { userId } = c.req.param();
  if (!userId) return c.json({ error: "userId required" }, 400);

  if (!EngramClient.isConfigured()) {
    return c.json({ error: "Engram not configured", configured: false }, 503);
  }

  // Pull all memories for this user across Sophia + pipeline agents
  const sophiaAgent = `sophia_${userId}`;
  const memories = await EngramClient.listByAgent(sophiaAgent, userId);

  return c.json({
    userId,
    totalMemories: memories.length,
    memories,
  });
});

// ─── DELETE /api/memory/:userId ───────────────────────────────────────────────

app.delete("/:userId", async (c) => {
  const adminId = await requireAdmin(c);
  if (!adminId) return c.json({ error: "Forbidden" }, 403);

  const { userId } = c.req.param();
  if (!userId) return c.json({ error: "userId required" }, 400);

  if (!EngramClient.isConfigured()) {
    return c.json({ error: "Engram not configured — nothing to erase" }, 503);
  }

  // Resolve engram anchor UUID from external userId
  const anchorId = await EngramClient.findAnchor(userId);
  if (!anchorId) {
    return c.json({ ok: true, userId, note: "No engram anchor found — nothing to erase" });
  }

  const ok = await EngramClient.eraseSubject(anchorId);
  if (!ok) {
    return c.json({ error: "Erasure failed or engram unreachable" }, 500);
  }

  return c.json({
    ok:     true,
    userId,
    note:   "GDPR Art.17 cryptographic erasure complete. Content is unrecoverable. Audit record retained.",
  });
});

// ─── GET /api/memory/:userId/audit ───────────────────────────────────────────

app.get("/:userId/audit", async (c) => {
  const adminId = await requireAdmin(c);
  if (!adminId) return c.json({ error: "Forbidden" }, 403);

  if (!EngramClient.isConfigured()) {
    return c.json({ error: "Engram not configured" }, 503);
  }

  // Audit verify is tenant-wide (not per-user) in engram's API
  const result = await EngramClient.verifyAudit();
  if (!result) {
    return c.json({ error: "Audit verification failed or engram unreachable" }, 500);
  }

  const { userId } = c.req.param();
  return c.json({ userId, ...result });
});

export { app as memoryAdmin };
