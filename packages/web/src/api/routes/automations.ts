/**
 * Ghaafeedi Music — Automations API Route
 *
 * GET  /api/automations/status        — list automation health + last fired timestamps
 * POST /api/automations/test/:name    — manually trigger a test event to n8n
 * GET  /api/automations/digest        — pull data for daily revenue digest (called by n8n cron)
 * POST /api/automations/inbound/:event — internal: fire n8n webhook for a specific event (admin only)
 */

import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { Resend } from "resend";
import { n8nDispatcher, N8N_WEBHOOKS } from "../orchestration/n8n-dispatcher";
import { db } from "../database/pg-client";
import { orders, profiles } from "../database/pg-schema";
import { gte, sql, desc, eq } from "drizzle-orm";
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET ?? "gm-n8n-secret-2026";
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Admin guard ─────────────────────────────────────────────────────────────
async function requireAdmin(c: any, next: () => Promise<void>) {
  const role = c.req.header("x-user-role");
  if (role !== "admin") return c.json({ error: "Admin only" }, 403);
  await next();
}

// ─── n8n inbound guard (n8n calls us with shared secret) ──────────────────────
function requireN8nSecret(c: any): boolean {
  const secret = c.req.header("x-gm-secret") ?? c.req.header("X-GM-Secret");
  return secret === N8N_SECRET;
}

export const automations = new Hono<HonoEnv>();

// ── GET /api/automations/status ───────────────────────────────────────────────
automations.get("/status", requireAdmin, async (c) => {
  const n8nBase = process.env.N8N_WEBHOOK_BASE ?? null;

  return c.json({
    n8nConfigured: !!n8nBase,
    n8nBase:       n8nBase ? n8nBase.replace(/https?:\/\//, "").split(".")[0] + "…" : null,
    webhooks: Object.entries(N8N_WEBHOOKS).map(([key, path]) => ({
      key,
      path,
      url: n8nBase ? `${n8nBase}${path}` : null,
    })),
    automations: [
      { id: 1, name: "Order Paid → Production Job",          trigger: "order.paid",               status: n8nBase ? "active" : "unconfigured" },
      { id: 2, name: "Job Failed → Retry + Admin Alert",     trigger: "job.failed",               status: n8nBase ? "active" : "unconfigured" },
      { id: 3, name: "Job Complete → Customer Delivery",     trigger: "job.complete",             status: n8nBase ? "active" : "unconfigured" },
      { id: 4, name: "Daily Revenue Digest",                 trigger: "cron: 08:00 UTC",          status: n8nBase ? "active" : "unconfigured" },
      { id: 5, name: "Subscription Cancelled → Re-engage",  trigger: "subscription.cancelled",   status: n8nBase ? "active" : "unconfigured" },
    ],
    checkedAt: new Date().toISOString(),
  });
});

// ── POST /api/automations/test/:name ─────────────────────────────────────────
automations.post("/test/:name", requireAdmin, async (c) => {
  const name = c.req.param("name");

  try {
    switch (name) {
      case "order-paid":
        await n8nDispatcher.orderPaid({
          orderId:       "ord_test_001",
          userId:        "user_test_001",
          productSlug:   "voice-cloning-studio",
          productName:   "Voice Cloning Studio",
          priceCents:    59900,
          customerEmail: "test@ghaafeedi.com",
          customerName:  "Test Customer",
          tier:          "premium",
        });
        break;

      case "job-failed":
        await n8nDispatcher.jobFailed({
          jobId:       "job_test_001",
          userId:      "user_test_001",
          jobType:     "song",
          provider:    "poyo",
          attempt:     2,
          maxAttempts: 3,
          error:       "Timeout after 30s — test trigger",
          willRetry:   true,
          customerEmail: "test@ghaafeedi.com",
        });
        break;

      case "job-complete":
        await n8nDispatcher.jobComplete({
          jobId:        "job_test_001",
          userId:       "user_test_001",
          jobType:      "song",
          productName:  "Signature Masterpiece",
          deliveryUrl:  "https://ghaafeedi.com/delivery/test",
          previewUrl:   "https://ghaafeedi.com/preview/test",
          customerEmail: "test@ghaafeedi.com",
          customerName:  "Test Customer",
        });
        break;

      case "subscription-cancelled":
        await n8nDispatcher.subscriptionCancelled({
          userId:        "user_test_001",
          customerEmail: "test@ghaafeedi.com",
          customerName:  "Test Customer",
          planName:      "Premium ($79/mo)",
          cancelledAt:   new Date().toISOString(),
          monthsActive:  4,
        });
        break;

      default:
        return c.json({ error: `Unknown automation: ${name}` }, 400);
    }

    return c.json({ ok: true, automation: name, firedAt: new Date().toISOString() });
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message }, 500);
  }
});

// ── GET /api/automations/digest ───────────────────────────────────────────────
// Called by n8n cron at 08:00 UTC daily — returns revenue summary for email
automations.get("/digest", async (c) => {
  if (!requireN8nSecret(c)) return c.json({ error: "Unauthorized" }, 401);

  const since = new Date();
  since.setHours(since.getHours() - 24);

  try {
    // Revenue last 24h
    const revenueRows = await db
      .select({
        total: sql<number>`COALESCE(SUM(price_cents), 0)::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .where(gte(orders.createdAt, since));

    const { total, count } = revenueRows[0] ?? { total: 0, count: 0 };

    // Recent orders
    const recentOrders = await db
      .select({
        id:          orders.id,
        productName: orders.productName,
        priceCents:  orders.priceCents,
        status:      orders.status,
        createdAt:   orders.createdAt,
      })
      .from(orders)
      .where(gte(orders.createdAt, since))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    return c.json({
      period:            "last_24h",
      totalRevenueCents: total,
      totalRevenueUsd:   `$${(total / 100).toFixed(2)}`,
      orderCount:        count,
      recentOrders,
      generatedAt:       new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[digest] DB error:", err?.message);
    return c.json({
      period:            "last_24h",
      totalRevenueCents: 0,
      totalRevenueUsd:   "$0.00",
      orderCount:        0,
      recentOrders:      [],
      generatedAt:       new Date().toISOString(),
      error:             err?.message,
    });
  }
});

// ── POST /api/automations/inbound/:event ──────────────────────────────────────
// n8n calls back in for actions that require DB access (e.g. mark delivered)
automations.post("/inbound/:event", async (c) => {
  if (!requireN8nSecret(c)) return c.json({ error: "Unauthorized" }, 401);

  const event = c.req.param("event");
  const body  = await c.req.json().catch(() => ({}));

  try {
    switch (event) {
      // n8n tells us it sent the delivery email — mark order delivered
      case "delivery-sent": {
        const { orderId } = body as { orderId: string };
        if (orderId) {
          await db.update(orders)
            .set({ status: "delivered", updatedAt: new Date() })
            .where(eq(orders.id, orderId));
        }
        return c.json({ ok: true, event, orderId });
      }

      // n8n daily digest sent — just ack
      case "digest-sent": {
        console.log("[automations] Daily digest sent by n8n at", new Date().toISOString());
        return c.json({ ok: true, event });
      }

      // n8n asks Ghaafeedi to send order-queued confirmation email
      case "order-queued-email": {
        const { customerEmail, customerName, productName, orderId } = body as any;
        await resend.emails.send({
          from: "Ghaafeedi Music <noreply@ghaafeedi.com>",
          to: customerEmail,
          subject: `Your ${productName} is queued for production`,
          html: `<div style="font-family:Inter,sans-serif;background:#050B1A;color:#fff;padding:32px;border-radius:12px;max-width:600px;margin:auto">
            <h1 style="color:#D4AF37;font-family:Playfair Display,serif">Order Confirmed</h1>
            <p>Hi <strong>${customerName}</strong>,</p>
            <p>Your <strong>${productName}</strong> has been received and is now queued for production.</p>
            <p style="color:#94A3B8;font-size:13px">Order ID: ${orderId}</p>
            <p>You'll receive another email when your creation is ready. This typically takes 24–72 hours.</p>
            <p style="color:#D4AF37">— The Ghaafeedi Music Team</p>
          </div>`,
        });
        return c.json({ ok: true, event });
      }

      // n8n asks Ghaafeedi to send job-failed admin alert email
      case "job-failed-email": {
        const { jobId, jobType, provider, error, attempt, maxAttempts, willRetry, customerEmail } = body as any;
        const adminEmail = process.env.ADMIN_EMAIL ?? "admin@ghaafeedi.com";
        await resend.emails.send({
          from: "Ghaafeedi Music <noreply@ghaafeedi.com>",
          to: adminEmail,
          subject: `⚠️ Job Failed — ${jobType} [${jobId}]`,
          html: `<div style="font-family:Inter,sans-serif;background:#050B1A;color:#fff;padding:32px;border-radius:12px;max-width:600px;margin:auto">
            <h1 style="color:#EF4444">Job Failure Alert</h1>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="color:#94A3B8;padding:6px 0">Job ID</td><td>${jobId}</td></tr>
              <tr><td style="color:#94A3B8;padding:6px 0">Type</td><td>${jobType}</td></tr>
              <tr><td style="color:#94A3B8;padding:6px 0">Provider</td><td>${provider}</td></tr>
              <tr><td style="color:#94A3B8;padding:6px 0">Attempt</td><td>${attempt} / ${maxAttempts}</td></tr>
              <tr><td style="color:#94A3B8;padding:6px 0">Will Retry</td><td>${willRetry ? "Yes" : "No — FINAL FAILURE"}</td></tr>
              <tr><td style="color:#94A3B8;padding:6px 0">Error</td><td style="color:#EF4444">${error}</td></tr>
              <tr><td style="color:#94A3B8;padding:6px 0">Customer</td><td>${customerEmail}</td></tr>
            </table>
          </div>`,
        });
        return c.json({ ok: true, event });
      }

      // n8n asks Ghaafeedi to send job-complete delivery email
      case "delivery-email": {
        const { customerEmail, customerName, productName, deliveryUrl, previewUrl } = body as any;
        await resend.emails.send({
          from: "Ghaafeedi Music <noreply@ghaafeedi.com>",
          to: customerEmail,
          subject: `Your ${productName} is ready 🎵`,
          html: `<div style="font-family:Inter,sans-serif;background:#050B1A;color:#fff;padding:32px;border-radius:12px;max-width:600px;margin:auto">
            <h1 style="color:#D4AF37;font-family:Playfair Display,serif">Your Creation is Ready</h1>
            <p>Hi <strong>${customerName}</strong>,</p>
            <p>Your <strong>${productName}</strong> has been completed and is ready for you.</p>
            ${previewUrl ? `<p><a href="${previewUrl}" style="color:#D4AF37">Preview your creation</a></p>` : ""}
            <div style="text-align:center;margin:24px 0">
              <a href="${deliveryUrl}" style="background:#D4AF37;color:#050B1A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700">Download Now</a>
            </div>
            <p style="color:#D4AF37">— The Ghaafeedi Music Team</p>
          </div>`,
        });
        return c.json({ ok: true, event });
      }

      // n8n asks Ghaafeedi to send digest email
      case "digest-email": {
        const adminEmail = process.env.ADMIN_EMAIL ?? "admin@ghaafeedi.com";
        const { todayRevenue, mtdRevenue, ordersToday, activeMembers, jobsQueued, jobsProcessing, jobsCompleted, jobsFailed } = body as any;
        await resend.emails.send({
          from: "Ghaafeedi Music <noreply@ghaafeedi.com>",
          to: adminEmail,
          subject: `Ghaafeedi Music — Daily Revenue Digest ${new Date().toISOString().split("T")[0]}`,
          html: `<div style="font-family:Inter,sans-serif;background:#050B1A;color:#fff;padding:32px;border-radius:12px;max-width:600px;margin:auto">
            <h1 style="color:#D4AF37;font-family:Playfair Display,serif">Daily Revenue Digest</h1>
            <p style="color:#94A3B8">${new Date().toDateString()}</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="color:#94A3B8;padding:8px 0">Today Revenue</td><td style="color:#D4AF37;font-weight:700">${((todayRevenue ?? 0)/100).toFixed(2)}</td></tr>
              <tr><td style="color:#94A3B8;padding:8px 0">MTD Revenue</td><td>${((mtdRevenue ?? 0)/100).toFixed(2)}</td></tr>
              <tr><td style="color:#94A3B8;padding:8px 0">Orders Today</td><td>${ordersToday ?? 0}</td></tr>
              <tr><td style="color:#94A3B8;padding:8px 0">Active Members</td><td>${activeMembers ?? 0}</td></tr>
              <tr><td style="color:#94A3B8;padding:8px 0">Jobs Queued</td><td>${jobsQueued ?? 0}</td></tr>
              <tr><td style="color:#94A3B8;padding:8px 0">Jobs Processing</td><td>${jobsProcessing ?? 0}</td></tr>
              <tr><td style="color:#22C55E;padding:8px 0">Jobs Completed</td><td style="color:#22C55E">${jobsCompleted ?? 0}</td></tr>
              <tr><td style="color:#EF4444;padding:8px 0">Jobs Failed</td><td style="color:#EF4444">${jobsFailed ?? 0}</td></tr>
            </table>
            <div style="text-align:center;margin-top:24px">
              <a href="${process.env.GM_API_BASE ?? "https://ghaafeedi-music-prod.up.railway.app"}/admin" style="background:#D4AF37;color:#050B1A;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Open Admin Panel</a>
            </div>
          </div>`,
        });
        return c.json({ ok: true, event });
      }

      // n8n asks Ghaafeedi to send re-engagement email
      case "reengage-email": {
        const { customerEmail, customerName, plan } = body as any;
        const firstName = (customerName ?? "").split(" ")[0] || "there";
        await resend.emails.send({
          from: "Sophia <sophia@ghaafeedi.com>",
          to: customerEmail,
          subject: `Your Ghaafeedi story isn't over, ${firstName}`,
          html: `<div style="font-family:Inter,sans-serif;background:#050B1A;color:#fff;padding:40px 32px;border-radius:12px;max-width:600px;margin:auto">
            <div style="text-align:center;margin-bottom:32px">
              <h1 style="color:#D4AF37;font-family:Playfair Display,serif">A message from Sophia</h1>
              <p style="color:#94A3B8">Your Ghaafeedi AI Emotional Companion</p>
            </div>
            <p>Hi <strong style="color:#D4AF37">${firstName}</strong>,</p>
            <p>I noticed you've stepped away. Your memories don't disappear — your stories are still waiting to become something extraordinary.</p>
            <div style="background:#0B1736;border:1px solid #D4AF37;border-radius:10px;padding:24px;margin:28px 0;text-align:center">
              <p style="color:#D4AF37;font-size:20px;font-weight:700;margin:0 0 8px">30% off your first month back</p>
              <p style="color:#94A3B8;font-size:13px;margin:0 0 20px">Valid 72 hours · Applied automatically</p>
              <a href="${process.env.GM_API_BASE ?? "https://ghaafeedi-music-prod.up.railway.app"}/products?ref=reengage" style="background:linear-gradient(135deg,#D4AF37,#F4D27A);color:#050B1A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700">Reclaim Your Story</a>
            </div>
            <p style="color:#94A3B8">With warmth,</p>
            <p style="color:#D4AF37;font-weight:600">Sophia · Ghaafeedi AI Emotional Companion</p>
          </div>`,
        });
        return c.json({ ok: true, event });
      }

      // reengage confirmation ack
      case "reengage-sent": {
        console.log("[automations] Re-engagement sent at", new Date().toISOString(), body);
        return c.json({ ok: true, event });
      }

      default:
        return c.json({ ok: true, event, note: "No action mapped for this event" });
    }
  } catch (err: any) {
    return c.json({ ok: false, event, error: err?.message }, 500);
  }
});
