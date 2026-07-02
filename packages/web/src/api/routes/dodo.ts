import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { db } from "../database/pg-client";
import * as schema from "../database/pg-schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { Webhook } from "standardwebhooks";

// ── Env — defensively trimmed (Render env vars have bitten us before with
//    trailing newlines, e.g. BETTER_AUTH_URL). Never trust raw process.env here. ──
const DODO_API_KEY  = (process.env.DODO_API_KEY  ?? "").trim();
const DODO_MODE     = ((process.env.DODO_MODE ?? "live").trim()) as "live" | "test";
const DODO_WEBHOOK_SECRET = (process.env.DODO_WEBHOOK_SECRET ?? "").trim();
const DODO_BASE_URL = DODO_MODE === "live"
  ? "https://live.dodopayments.com"
  : "https://test.dodopayments.com";

// ── Product ID map — Dodo product IDs by Ghaafeedi product/package slug ──────
// Membership packages (S8 checkout) — all 3 created directly in Dodo, real prices.
const DODO_PRODUCT_MAP: Record<string, { productId: string; priceCents: number; name: string }> = {
  starter: { productId: "pdt_0NiH7alQMWrN8ppKIroyx", priceCents: 5900,  name: "Ghaafeedi Music - Starter Membership" },
  premium: { productId: "pdt_0NiH7ar4uNo47MUVHUEuG", priceCents: 7900,  name: "Ghaafeedi Music - Premium Membership" },
  elite:   { productId: "pdt_0NiH7axwxzloQrqGXVZWt", priceCents: 12500, name: "Ghaafeedi Music - Elite Membership" },
  // Individual products — added as Lawrence creates them in the Dodo dashboard.
  "emotional-soundtrack-essential": { productId: "pdt_0NNHQMgc9f525HU7t5IT", priceCents: 1900, name: "Emotional Soundtrack - Essential" },
};

// ── Real Dodo payment method API types (verified against Dodo docs) ──────────
// UI id -> Dodo allowed_payment_method_types value. No PayPal (paused by Dodo),
// no crypto, no generic "bank transfer" — these are not real Dodo methods.
const PAY_NOW_METHOD_MAP: Record<string, string> = {
  card:      "credit", // "credit"+"debit" both added by default below
  apple:     "apple_pay",
  google:    "google_pay",
  amazon:    "amazon_pay",
  cashapp:   "cashapp",
  revolut:   "revolut_pay",
};

// BNPL tile id -> real Dodo BNPL provider type. Klarna/Afterpay require $50.01+
// transaction (Dodo auto-hides the option below that threshold, no error thrown).
const BNPL_METHOD_MAP: Record<string, string> = {
  buynow4:  "afterpay_clearpay", // "Pay in 4" — Afterpay/Clearpay, every 2 weeks
  klarna30: "klarna",            // Klarna "Pay in 30 Days"
  financing: "klarna",           // Klarna longer-term financing plan
  sunbit:   "sunbit",            // Sunbit installment financing
};

export const dodo = new Hono<HonoEnv>()

  // ── POST /api/dodo/checkout-session ───────────────────────────────────────
  // Creates a Dodo checkout session and returns the checkout URL.
  .post("/checkout-session", async (c) => {
    try {
      const body = await c.req.json() as {
        productId?: string;
        packageId?: string;
        payNowMethod?: string;   // e.g. "card" | "apple" | "google" | "amazon" | "cashapp" | "revolut"
        bnplOption?: string;     // e.g. "buynow4" | "klarna30" | "financing" | "sunbit"
        customerEmail?: string;
        customerName?: string;
        userId?: string;
        memberId?: string;
        successUrl?: string;
        cancelUrl?: string;
      };

      const {
        productId, packageId, payNowMethod, bnplOption,
        customerEmail, customerName, userId, memberId, successUrl, cancelUrl,
      } = body;

      const key = productId ?? packageId;
      const mapped = key ? DODO_PRODUCT_MAP[key] : undefined;

      if (!mapped) {
        return c.json({ error: `No Dodo product configured for "${key ?? "unknown"}". Add it to DODO_PRODUCT_MAP first.` }, 400);
      }

      // Build allowed_payment_method_types from the customer's UI selection.
      // Always include credit + debit as fallback (Dodo's own recommendation —
      // BNPL/wallets simply won't show if ineligible, cards always will).
      const allowedTypes = new Set<string>(["credit", "debit"]);
      if (bnplOption && BNPL_METHOD_MAP[bnplOption]) {
        allowedTypes.add(BNPL_METHOD_MAP[bnplOption]!);
      } else if (payNowMethod && PAY_NOW_METHOD_MAP[payNowMethod] && payNowMethod !== "card") {
        allowedTypes.add(PAY_NOW_METHOD_MAP[payNowMethod]!);
      }

      const orderId = `ORD-${nanoid(10).toUpperCase()}`;

      const payload: Record<string, unknown> = {
        product_cart: [{ product_id: mapped.productId, quantity: 1 }],
        allowed_payment_method_types: Array.from(allowedTypes),
        ...(customerEmail && {
          customer: { email: customerEmail, ...(customerName && { name: customerName }) },
        }),
        ...(successUrl && { return_url: successUrl }),
        metadata: {
          orderId,
          packageId: packageId ?? productId ?? "unknown",
          userId: userId ?? "",
          memberId: memberId ?? "",
          source: "ghaafeedi-onboarding",
        },
      };

      const res = await fetch(`${DODO_BASE_URL}/checkouts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DODO_API_KEY}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { checkout_url?: string; session_id?: string; error?: string; message?: string };

      if (!res.ok) {
        console.error("[Dodo] checkout session error:", data);
        return c.json({ error: data.message ?? data.error ?? "Failed to create checkout session" }, 502);
      }

      // Pre-create a pending order row so the client can poll for its status
      // by orderId even before the webhook fires.
      if (userId) {
        await db.insert(schema.orders).values({
          id: orderId,
          userId,
          memberId: memberId ?? null,
          productSlug: key!,
          productName: mapped.name,
          tier: packageId ?? "one_time",
          priceCents: mapped.priceCents,
          currency: "USD",
          status: "pending",
          paymentProvider: "dodo",
          dodoOrderId: data.session_id ?? null,
          metadata: { checkoutSessionId: data.session_id ?? null },
        } as any).catch(err => console.error("[Dodo] failed to pre-create order row:", err));
      }

      return c.json({ checkoutUrl: data.checkout_url, sessionId: data.session_id, orderId });
    } catch (err) {
      console.error("[Dodo] unexpected error:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // ── GET /api/dodo/order-status?orderId= ───────────────────────────────────
  // Client polls this after the checkout overlay closes instead of relying on
  // a localStorage flag that nothing ever sets. Confirms real payment status.
  .get("/order-status", async (c) => {
    const orderId = c.req.query("orderId");
    if (!orderId) return c.json({ error: "orderId required" }, 400);

    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order) return c.json({ found: false }, 200);

    return c.json({
      found: true,
      status: order.status, // pending | paid | processing | delivered | refunded | cancelled
      orderId: order.id,
      productName: order.productName,
      priceCents: order.priceCents,
      currency: order.currency,
      paymentId: order.paymentId,
    });
  })

  // ── POST /api/dodo/webhook ─────────────────────────────────────────────────
  // Receives Dodo payment webhooks. Signature-verified via standardwebhooks.
  .post("/webhook", async (c) => {
    try {
      const rawBody = await c.req.text();

      // ── Verify signature (Standard Webhooks spec) ──────────────────────────
      if (DODO_WEBHOOK_SECRET) {
        const webhookId        = c.req.header("webhook-id")        ?? "";
        const webhookTimestamp = c.req.header("webhook-timestamp") ?? "";
        const webhookSignature = c.req.header("webhook-signature") ?? "";

        try {
          const wh = new Webhook(DODO_WEBHOOK_SECRET);
          wh.verify(rawBody, {
            "webhook-id": webhookId,
            "webhook-timestamp": webhookTimestamp,
            "webhook-signature": webhookSignature,
          });
        } catch (err) {
          console.error("[Dodo webhook] signature verification failed:", err);
          return c.json({ error: "Invalid signature" }, 401);
        }
      } else {
        console.warn("[Dodo webhook] DODO_WEBHOOK_SECRET not configured — skipping signature verification (INSECURE)");
      }

      const body = JSON.parse(rawBody) as {
        type?: string;
        event_type?: string;
        data?: {
          payment_id?: string;
          status?: string;
          metadata?: Record<string, string>;
        };
      };

      const eventType = body.type ?? body.event_type;
      const data = body.data;
      console.log("[Dodo webhook]", eventType, data?.payment_id);

      const orderId = data?.metadata?.orderId;

      if (eventType === "payment.succeeded" && orderId) {
        await db
          .update(schema.orders)
          .set({
            status: "paid",
            paymentId: data?.payment_id ?? null,
            updatedAt: new Date(),
          })
          .where(eq(schema.orders.id, orderId))
          .catch(err => console.error("[Dodo webhook] failed to update order to paid:", err));
        console.log(`[Dodo] Payment succeeded: ${data?.payment_id} — order: ${orderId}`);
      }

      if (eventType === "payment.failed" && orderId) {
        await db
          .update(schema.orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(schema.orders.id, orderId))
          .catch(err => console.error("[Dodo webhook] failed to update order to cancelled:", err));
        console.log(`[Dodo] Payment failed: ${data?.payment_id} — order: ${orderId}`);
      }

      if (eventType === "payment.cancelled" && orderId) {
        await db
          .update(schema.orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(schema.orders.id, orderId))
          .catch(() => {});
      }

      if (eventType === "refund.succeeded" && orderId) {
        await db
          .update(schema.orders)
          .set({ status: "refunded", refundedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.orders.id, orderId))
          .catch(() => {});
      }

      return c.json({ received: true });
    } catch (err) {
      console.error("[Dodo webhook] error:", err);
      return c.json({ error: "Webhook processing failed" }, 500);
    }
  })

  // ── GET /api/dodo/health ───────────────────────────────────────────────────
  .get("/health", async (c) => {
    try {
      const res = await fetch(`${DODO_BASE_URL}/products?page_size=1`, {
        headers: { "Authorization": `Bearer ${DODO_API_KEY}` },
      });
      return c.json({ ok: res.ok, status: res.status, mode: DODO_MODE, webhookConfigured: !!DODO_WEBHOOK_SECRET });
    } catch (err) {
      return c.json({ ok: false, error: String(err) }, 502);
    }
  });
