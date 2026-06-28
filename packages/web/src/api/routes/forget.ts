/**
 * Customer-Facing GDPR Forget Route
 *
 * DELETE /api/member/forget
 *
 * Authenticated customers can request erasure of their AI memory data.
 * This erases engram memories only — account data (orders, productions)
 * is governed by the Privacy Policy / deletion request flow.
 *
 * Returns a cryptographic erasure receipt per GDPR Art.17.
 */

import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { auth } from "../auth";
import { EngramClient } from "../../lib/engram-client";

const app = new Hono<HonoEnv>();

// ─── DELETE /api/member/forget ────────────────────────────────────────────────

app.delete("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const userId = session.user.id;

  if (!EngramClient.isConfigured()) {
    // Engram not running — nothing to erase, return success
    return c.json({
      ok:      true,
      message: "No AI memory data on record.",
      memoriesErased: 0,
      receiptHash:    null,
    });
  }

  const result = await EngramClient.eraseSubject(userId);

  if (!result) {
    return c.json({
      error: "Memory erasure service temporarily unavailable. Please contact support@ghaafeedimusic.com.",
    }, 503);
  }

  console.log(`[Forget] GDPR erasure: user=${userId} erased=${result.memoriesErased} receipt=${result.receiptHash}`);

  return c.json({
    ok:             true,
    message:        `Your AI memory data (${result.memoriesErased} memories) has been permanently erased.`,
    memoriesErased: result.memoriesErased,
    receiptHash:    result.receiptHash,
    erasedAt:       result.erasedAt,
    note:           "This covers Sophia's conversational memory. Account data (orders, productions) is subject to our Privacy Policy retention policy.",
  });
});

export { app as forgetRoutes };
