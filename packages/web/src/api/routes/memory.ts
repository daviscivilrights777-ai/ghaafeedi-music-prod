/**
 * Memory Admin Routes — Ghaafeedi Music
 *
 * GET    /api/memory/health           — engram health check (admin)
 * GET    /api/memory/:userId          — search memories for a user (admin)
 * DELETE /api/memory/:userId          — forget a user's memories (admin)
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

  // Search across sophia + production namespaces
  const sophiaAgent     = `sophia_${userId}`;
  const productionAgent = `production_${userId}`;
  const revisionAgent   = `revision_${userId}`;

  const [sophiaResults, productionResults, revisionResults] = await Promise.all([
    EngramClient.search(sophiaAgent, "customer", 20),
    EngramClient.search(productionAgent, "song lyrics shots emotional", 20),
    EngramClient.search(revisionAgent, "revision", 10),
  ]);

  return c.json({
    userId,
    totalMemories: sophiaResults.length + productionResults.length + revisionResults.length,
    namespaces: {
      sophia:     sophiaResults,
      production: productionResults,
      revision:   revisionResults,
    },
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

  // Note: Engram's /forget endpoint requires memory_id.
  // For full user erasure, we search all namespaces and forget each memory.
  const namespaces = [
    `sophia_${userId}`,
    `production_${userId}`,
    `revision_${userId}`,
  ];

  let forgottenCount = 0;
  for (const ns of namespaces) {
    const results = await EngramClient.search(ns, ".", 100);
    for (const m of results) {
      const ok = await EngramClient.forget(ns, m.doc_id);
      if (ok) forgottenCount++;
    }
  }

  return c.json({
    ok:             true,
    userId,
    forgottenCount,
    note:           `Erased ${forgottenCount} memories across all namespaces.`,
  });
});

export { app as memoryAdmin };
