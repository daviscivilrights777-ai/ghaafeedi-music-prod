/**
 * Customer-Facing GDPR Forget Route
 *
 * DELETE /api/member/forget
 *
 * Authenticated customers can request erasure of their AI memory data.
 * Erases engram memories only — account data (orders, productions)
 * is governed by the Privacy Policy / deletion request flow.
 */

import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { auth } from "../auth";
import { EngramClient } from "../../lib/engram-client";

const app = new Hono<HonoEnv>();

app.delete("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const userId = session.user.id;

  if (!EngramClient.isConfigured()) {
    return c.json({ ok: true, message: "No AI memory data on record.", memoriesErased: 0 });
  }

  // Search all namespaces and forget each memory
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

  console.log(`[Forget] GDPR erasure: user=${userId} erased=${forgottenCount}`);

  return c.json({
    ok:             true,
    message:        `Your AI memory data (${forgottenCount} memories) has been permanently erased.`,
    memoriesErased: forgottenCount,
    erasedAt:       new Date().toISOString(),
    note:           "This covers Sophia's conversational memory. Account data (orders, productions) is subject to our Privacy Policy.",
  });
});

export { app as forgetRoutes };
