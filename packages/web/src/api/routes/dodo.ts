import { Hono } from "hono";

const DODO_API_KEY  = process.env.DODO_API_KEY  ?? "";
const DODO_MODE     = (process.env.DODO_MODE ?? "live") as "live" | "test";
const DODO_BASE_URL = DODO_MODE === "live"
  ? "https://api.dodopayments.com"
  : "https://test.dodopayments.com";

// Product ID map — Dodo product IDs by Ghaafeedi product slug + tier
const DODO_PRODUCT_MAP: Record<string, string> = {
  // Emotional Soundtrack
  "emotional-soundtrack-essential": "pdt_0NNHQMgc9f525HU7t5IT",
  // Add more as products are created in Dodo dashboard
};

// Membership package price map (used when no Dodo product exists yet)
const PACKAGE_PRICES: Record<string, number> = {
  starter: 4900,   // $49.00 in cents
  premium: 7900,   // $79.00
  elite:   12500,  // $125.00
};

export const dodo = new Hono()

  // ── POST /api/dodo/checkout-session ───────────────────────────────────────
  // Creates a Dodo checkout session and returns the checkout URL
  .post("/checkout-session", async (c) => {
    try {
      const body = await c.req.json() as {
        productId?: string;
        packageId?: string;
        customerEmail?: string;
        customerName?: string;
        successUrl?: string;
        cancelUrl?: string;
      };

      const { productId, packageId, customerEmail, customerName, successUrl, cancelUrl } = body;

      // Resolve which Dodo product to charge
      let dodoProdId = productId ? DODO_PRODUCT_MAP[productId] : undefined;

      if (!dodoProdId && !packageId) {
        return c.json({ error: "productId or packageId required" }, 400);
      }

      // Build the checkout session payload
      // If we have a mapped Dodo product, use product_cart
      // Otherwise fall back to ad-hoc amount (for packages not yet in Dodo)
      let payload: Record<string, unknown>;

      if (dodoProdId) {
        payload = {
          product_cart: [{ product_id: dodoProdId, quantity: 1 }],
          ...(customerEmail && {
            customer: {
              email: customerEmail,
              ...(customerName && { name: customerName }),
            },
          }),
          ...(successUrl && { success_url: successUrl }),
          ...(cancelUrl  && { cancel_url:  cancelUrl  }),
          metadata: { packageId: packageId ?? productId ?? "unknown", source: "ghaafeedi-onboarding" },
        };
      } else {
        // Package membership — use ad-hoc amount
        const amountCents = PACKAGE_PRICES[packageId ?? "premium"] ?? 7900;
        payload = {
          product_cart: [{ product_id: "pdt_0NNHQMgc9f525HU7t5IT", quantity: 1 }], // fallback to existing product
          ...(customerEmail && {
            customer: {
              email: customerEmail,
              ...(customerName && { name: customerName }),
            },
          }),
          ...(successUrl && { success_url: successUrl }),
          ...(cancelUrl  && { cancel_url:  cancelUrl  }),
          metadata: { packageId: packageId ?? "premium", amountCents, source: "ghaafeedi-onboarding" },
        };
      }

      const res = await fetch(`${DODO_BASE_URL}/checkout/sessions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DODO_API_KEY}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { url?: string; id?: string; error?: string; message?: string };

      if (!res.ok) {
        console.error("[Dodo] checkout session error:", data);
        return c.json({ error: data.message ?? data.error ?? "Failed to create checkout session" }, 502);
      }

      return c.json({ checkoutUrl: data.url, sessionId: data.id });
    } catch (err) {
      console.error("[Dodo] unexpected error:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // ── POST /api/dodo/webhook ─────────────────────────────────────────────────
  // Receives Dodo payment webhooks
  .post("/webhook", async (c) => {
    try {
      const body = await c.req.json() as {
        event_type?: string;
        data?: { payment_id?: string; status?: string; metadata?: Record<string, string> };
      };

      const { event_type, data } = body;
      console.log("[Dodo webhook]", event_type, data);

      if (event_type === "payment.succeeded") {
        const paymentId  = data?.payment_id;
        const packageId  = data?.metadata?.packageId ?? "unknown";
        console.log(`[Dodo] Payment succeeded: ${paymentId} — package: ${packageId}`);
        // TODO: provision order in DB, trigger n8n workflow
      }

      if (event_type === "payment.failed") {
        console.log(`[Dodo] Payment failed: ${data?.payment_id}`);
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
      return c.json({ ok: res.ok, status: res.status, mode: DODO_MODE });
    } catch (err) {
      return c.json({ ok: false, error: String(err) }, 502);
    }
  });
