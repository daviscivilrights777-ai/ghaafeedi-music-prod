// ============================================================
// Ghaafeedi Music — Lip Sync Routes
// Phase 6: FAL.ai LatentSync proxy
// POST /api/lipsync        → dispatch job to Python microservice
// GET  /api/lipsync/:jobId → poll status
// ============================================================
import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { OrchestrationEngine } from "../orchestration/orchestration-engine";

export const lipsync = new Hono<HonoEnv>();

const CINEMATIC_BASE = process.env.CINEMATIC_API_URL ?? "http://localhost:8001";

// ── POST /api/lipsync ──────────────────────────────────────────────────────
// Dispatch a new lip sync job.
// Body: { jobId, orderId, userId, videoUrl, audioUrl, durationSeconds?,
//         guidanceScale?, syncConfidence?, isEliteFree? }
lipsync.post("/", async (c) => {
  try {
    const body = await c.req.json() as {
      jobId:           string;
      orderId:         string;
      userId:          string;
      videoUrl:        string;
      audioUrl:        string;
      durationSeconds?: number;
      guidanceScale?:   number;
      syncConfidence?:  number;
      isEliteFree?:     boolean;
    };

    if (!body.jobId || !body.videoUrl || !body.audioUrl) {
      return c.json({ error: "jobId, videoUrl, and audioUrl are required" }, 400);
    }

    // Proxy to Python cinematic microservice
    const res = await fetch(`${CINEMATIC_BASE}/lipsync`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        job_id:           body.jobId,
        order_id:         body.orderId  || "",
        user_id:          body.userId   || "",
        video_url:        body.videoUrl,
        audio_url:        body.audioUrl,
        duration_seconds: body.durationSeconds ?? 60,
        guidance_scale:   body.guidanceScale   ?? 2.0,
        sync_confidence:  body.syncConfidence  ?? 0.92,
        is_elite_free:    body.isEliteFree     ?? false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[lipsync] Python microservice error:", res.status, err);
      return c.json({ error: `Microservice error: ${res.status}` }, 502);
    }

    const data = await res.json();
    return c.json({ ok: true, ...data });

  } catch (err: any) {
    // Microservice may be offline (not deployed) — gracefully degrade
    if (err?.cause?.code === "ECONNREFUSED" || err?.code === "ECONNREFUSED") {
      console.warn("[lipsync] Python microservice offline — queueing via orchestration engine");

      // Fallback: submit as lip_sync job directly through orchestration engine
      try {
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const engine = OrchestrationEngine.getInstance();
        await engine.submitJob({
          userId:       (body.userId as string) || "system",
          orderId:      (body.orderId as string) || undefined,
          productType:  "lip_sync" as any,
          jobType:      "lip_sync" as any,
          inputPayload: {
            videoUrl:        body.videoUrl,
            audioUrl:        body.audioUrl,
            durationSeconds: body.durationSeconds ?? 60,
            guidanceScale:   body.guidanceScale   ?? 2.0,
            syncConfidence:  body.syncConfidence  ?? 0.92,
            isEliteFree:     body.isEliteFree     ?? false,
          },
        });
        return c.json({ ok: true, status: "queued_via_engine", note: "Python microservice offline — queued directly" });
      } catch (fallbackErr: any) {
        return c.json({ error: "Both microservice and engine fallback failed" }, 503);
      }
    }

    console.error("[lipsync] Unexpected error:", err);
    return c.json({ error: String(err?.message ?? err) }, 500);
  }
});

// ── GET /api/lipsync/:jobId ────────────────────────────────────────────────
// Poll lip sync job status.
lipsync.get("/:jobId", async (c) => {
  const jobId = c.req.param("jobId");

  try {
    const res = await fetch(`${CINEMATIC_BASE}/lipsync/status/${jobId}`);

    if (res.status === 404) {
      return c.json({ error: `Lip sync job ${jobId} not found` }, 404);
    }

    if (!res.ok) {
      return c.json({ error: `Microservice status check failed: ${res.status}` }, 502);
    }

    const data = await res.json();
    return c.json(data);

  } catch (err: any) {
    if (err?.cause?.code === "ECONNREFUSED" || err?.code === "ECONNREFUSED") {
      return c.json({ error: "Python microservice offline", status: "unknown" }, 503);
    }
    return c.json({ error: String(err?.message ?? err) }, 500);
  }
});
