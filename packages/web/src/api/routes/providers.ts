/**
 * Providers API Routes
 *
 * GET  /api/providers/health          — live-ping all registered adapters
 * GET  /api/providers                 — list providers from DB
 * POST /api/providers/:name/test      — admin: submit a minimal test job to a provider
 */

import { Hono } from "hono";
import { ProviderRegistry, bootstrapAdapters } from "../orchestration/adapters";
import { db } from "../database/pg-client";
import type { ProviderHealth } from "../orchestration/adapters/provider-adapter";

// Ensure adapters are bootstrapped (idempotent)
bootstrapAdapters();

async function rawQuery(query: string, params: unknown[] = []): Promise<any[]> {
  const client = (db as any).$client as import("pg").Pool;
  const result = await client.query(query, params);
  return result.rows;
}

// ─── Admin guard (simple — checks x-user-role header) ──────────────────────
async function requireAdmin(c: any, next: () => Promise<void>) {
  const role = c.req.header("x-user-role");
  if (role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
}

export const providers = new Hono();

// ─── GET /api/providers/health ──────────────────────────────────────────────
providers.get("/health", async (c) => {
  const all = ProviderRegistry.getAll();

  if (all.length === 0) {
    return c.json({
      ok: false,
      message: "No adapters registered. bootstrapAdapters() not called.",
      providers: [],
      checkedAt: new Date().toISOString(),
    }, 500);
  }

  // Ping all providers concurrently with a 12s timeout each
  const results = await Promise.allSettled(
    all.map(async (adapter) => {
      const start = Date.now();
      try {
        const health: ProviderHealth = await Promise.race([
          adapter.healthCheck(),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("Health check timeout (12s)")), 12_000)
          ),
        ]);
        return {
          name:                adapter.name,
          displayName:         adapter.displayName,
          jobTypes:            adapter.jobTypes,
          healthy:             health.healthy,
          latencyMs:           health.latencyMs ?? Date.now() - start,
          message:             health.message ?? null,
          errorRate:           health.errorRate ?? null,
          queueDepth:          health.queueDepth ?? null,
          checkedAt:           health.checkedAt?.toISOString() ?? new Date().toISOString(),
          // Balance info (FAL.ai + others that expose it)
          balanceCents:        health.balanceCents ?? null,
          balanceStatus:       health.balanceStatus ?? null,
          balanceDashboardUrl: health.balanceDashboardUrl ?? null,
        };
      } catch (err: any) {
        return {
          name:        adapter.name,
          displayName: adapter.displayName,
          jobTypes:    adapter.jobTypes,
          healthy:     false,
          latencyMs:   Date.now() - start,
          message:     err?.message ?? "Unknown error",
          errorRate:   null,
          queueDepth:  null,
          checkedAt:   new Date().toISOString(),
        };
      }
    })
  );

  const providerResults = results.map((r) =>
    r.status === "fulfilled" ? r.value : {
      name:                "unknown",
      displayName:         "Unknown",
      jobTypes:            [],
      healthy:             false,
      latencyMs:           null,
      message:             (r as PromiseRejectedResult).reason?.message ?? "Promise rejected",
      errorRate:           null,
      queueDepth:          null,
      checkedAt:           new Date().toISOString(),
      balanceCents:        null,
      balanceStatus:       null,
      balanceDashboardUrl: null,
    }
  );

  const healthyCount = providerResults.filter((p) => p.healthy).length;
  const allHealthy   = healthyCount === providerResults.length;

  return c.json({
    ok:           allHealthy,
    summary:      `${healthyCount}/${providerResults.length} providers healthy`,
    providers:    providerResults,
    checkedAt:    new Date().toISOString(),
  }, allHealthy ? 200 : 207);
});

// ─── GET /api/providers — list DB records ───────────────────────────────────
providers.get("/", async (c) => {
  try {
    const rows = await rawQuery(
      `SELECT id, name, display_name, enabled, priority, cost_per_unit, unit,
              max_concurrent, hourly_budget_cents, api_key_ref, job_types,
              created_at, updated_at
       FROM providers
       ORDER BY priority ASC`
    );

    // Merge live adapter info
    const enriched = rows.map((row) => {
      const adapter = ProviderRegistry.get(row.name);
      return {
        ...row,
        adapterRegistered: !!adapter,
        jobTypes:          adapter?.jobTypes ?? [],
      };
    });

    return c.json({ providers: enriched, total: enriched.length });
  } catch (err: any) {
    console.error("[providers] DB list error:", err);
    return c.json({ error: "Failed to list providers", detail: err?.message }, 500);
  }
});

// ─── POST /api/providers/:name/test — admin test job ────────────────────────
providers.post("/:name/test", requireAdmin, async (c) => {
  const providerName = c.req.param("name");
  const adapter = ProviderRegistry.get(providerName);

  if (!adapter) {
    return c.json({ error: `Adapter '${providerName}' not found. Registered: ${ProviderRegistry.list().join(", ")}` }, 404);
  }

  // Build a minimal test JobSpec per provider
  const baseJob = {
    id:           `test-${Date.now()}`,
    userId:       "admin-test",
    productType:  "analysis" as any,
    jobType:      adapter.jobTypes[0],
    priority:     5,
    inputPayload: {} as Record<string, unknown>,
    createdAt:    new Date(),
    updatedAt:    new Date(),
    attempts:     0,
    maxAttempts:  1,
    status:       "pending" as const,
  };

  // Per-provider test payloads
  switch (providerName) {
    case "openai":
      baseJob.jobType = "analysis";
      baseJob.inputPayload = {
        userPrompt:   "Say hello from Ghaafeedi Music orchestration test. Reply in 5 words.",
        systemPrompt: "You are a test echo bot.",
      };
      break;

    case "sunor_cc":
      baseJob.jobType = "song";
      baseJob.inputPayload = {
        lyrics:    "This is a test song for Ghaafeedi Music. Just a silent probe.",
        title:     "Orchestration Test Track",
        genre:     "ambient",
        instrumental: true,
      };
      break;

    case "fal_ai_kling":
    case "fal_ai_hailuo":
      baseJob.jobType = "video";
      baseJob.inputPayload = {
        prompt:   "A single gold particle floating in dark space. 2 seconds. Test probe.",
        duration: 2,
      };
      break;

    case "elevenlabs":
      baseJob.jobType = "narration";
      baseJob.inputPayload = {
        text: "Ghaafeedi Music orchestration test. System online.",
      };
      break;

    case "modal":
      baseJob.jobType = "video";
      baseJob.inputPayload = {
        prompt:   "Test probe: dark cinematic frame.",
        duration: 2,
      };
      break;

    case "vast_ai":
      baseJob.jobType = "video";
      baseJob.inputPayload = {
        prompt:   "Test probe: single frame render.",
        duration: 2,
      };
      break;

    default:
      baseJob.inputPayload = { prompt: "orchestration test probe" };
  }

  const start = Date.now();

  try {
    // 1) Estimate cost
    const cost = await adapter.estimateCost(baseJob);

    // 2) Dispatch (real API call — uses live keys)
    const handle = await adapter.dispatch(baseJob);

    const elapsed = Date.now() - start;

    return c.json({
      ok:          true,
      provider:    providerName,
      displayName: adapter.displayName,
      jobType:     baseJob.jobType,
      cost,
      handle,
      elapsedMs:   elapsed,
      note:        "Real dispatch — this IS a live API call. Check provider dashboard for the job.",
    });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return c.json({
      ok:          false,
      provider:    providerName,
      displayName: adapter.displayName,
      jobType:     baseJob.jobType,
      error:       err?.message ?? "Dispatch failed",
      elapsedMs:   elapsed,
    }, 500);
  }
});

// ─── GET /api/providers/:name — single provider detail ──────────────────────
providers.get("/:name", async (c) => {
  const providerName = c.req.param("name");

  try {
    const rows = await rawQuery(
      `SELECT id, name, display_name, enabled, priority, cost_per_unit, unit,
              max_concurrent, hourly_budget_cents, api_key_ref, job_types,
              created_at, updated_at
       FROM providers WHERE name = $1 LIMIT 1`,
      [providerName]
    );

    if (rows.length === 0) {
      return c.json({ error: `Provider '${providerName}' not found in DB` }, 404);
    }

    const row     = rows[0];
    const adapter = ProviderRegistry.get(providerName);

    return c.json({
      ...row,
      adapterRegistered: !!adapter,
      jobTypes:          adapter?.jobTypes ?? [],
      displayName:       adapter?.displayName ?? row.display_name,
    });
  } catch (err: any) {
    return c.json({ error: "DB error", detail: err?.message }, 500);
  }
});
