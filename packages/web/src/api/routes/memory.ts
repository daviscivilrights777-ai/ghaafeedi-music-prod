/**
 * Memory Admin Routes — Ghaafeedi Music
 *
 * GET  /api/memory/health           — engram health check
 * GET  /api/memory/:userId          — view all memories for a user (admin)
 * DELETE /api/memory/:userId        — GDPR erasure for a user (admin)
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
  const [profile] = await db.select()
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
    configured: EngramClient.isConfigured(),
    ...result,
    engramBaseUrl: process.env.ENGRAM_BASE_URL ? "set" : "not set",
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

  // Pull all memories across all agent namespaces for this user
  const memories = await EngramClient.listBySubject(userId);

  // Group by agentId for readability
  const grouped: Record<string, typeof memories> = {};
  for (const m of memories) {
    if (!grouped[m.agentId]) grouped[m.agentId] = [];
    grouped[m.agentId].push(m);
  }

  return c.json({
    userId,
    totalMemories: memories.length,
    agents: Object.keys(grouped),
    grouped,
  });
});

// ─── DELETE /api/memory/:userId (admin GDPR erasure) ─────────────────────────

app.delete("/:userId", async (c) => {
  const adminId = await requireAdmin(c);
  if (!adminId) return c.json({ error: "Forbidden" }, 403);

  const { userId } = c.req.param();
  if (!userId) return c.json({ error: "userId required" }, 400);

  if (!EngramClient.isConfigured()) {
    return c.json({ error: "Engram not configured — nothing to erase" }, 503);
  }

  const result = await EngramClient.eraseSubject(userId);
  if (!result) {
    return c.json({ error: "Erasure failed or engram unreachable" }, 500);
  }

  return c.json({
    ok:             true,
    userId,
    memoriesErased: result.memoriesErased,
    receiptHash:    result.receiptHash,
    erasedAt:       result.erasedAt,
    note:           "GDPR Art.17 cryptographic erasure receipt stored. Erasure is irreversible.",
  });
});

// ─── GET /api/memory/:userId/audit ───────────────────────────────────────────

app.get("/:userId/audit", async (c) => {
  const adminId = await requireAdmin(c);
  if (!adminId) return c.json({ error: "Forbidden" }, 403);

  const { userId } = c.req.param();

  if (!EngramClient.isConfigured()) {
    return c.json({ error: "Engram not configured" }, 503);
  }

  const result = await EngramClient.verifyAudit(userId);
  if (!result) {
    return c.json({ error: "Audit verification failed or engram unreachable" }, 500);
  }

  return c.json({ userId, ...result });
});

export { app as memoryAdmin };
