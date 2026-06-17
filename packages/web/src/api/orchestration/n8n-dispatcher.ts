/**
 * Ghaafeedi Music — n8n Webhook Dispatcher
 *
 * Fires outbound HTTP POST to n8n webhook URLs on key events.
 * n8n URL is configured via N8N_WEBHOOK_BASE env var.
 *
 * Pattern: EventBus.publish() → n8nDispatcher.fire() → n8n workflow
 *
 * Failures are logged but NEVER block the main job/order flow.
 */

const N8N_BASE = process.env.N8N_WEBHOOK_BASE ?? "";
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET ?? "gm-n8n-secret-2026";

// Webhook paths — must match n8n workflow webhook trigger paths
export const N8N_WEBHOOKS = {
  orderPaid:           "/webhook/gm-order-paid",
  jobFailed:           "/webhook/gm-job-failed",
  jobComplete:         "/webhook/gm-job-complete",
  subscriptionCancelled: "/webhook/gm-subscription-cancelled",
  // Daily digest is a cron inside n8n — no inbound webhook needed
} as const;

export type N8nWebhookKey = keyof typeof N8N_WEBHOOKS;

async function fire(path: string, payload: unknown): Promise<void> {
  if (!N8N_BASE) {
    console.warn("[n8n] N8N_WEBHOOK_BASE not set — skipping dispatch to", path);
    return;
  }

  const url = `${N8N_BASE}${path}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "X-GM-Secret":   N8N_SECRET,
      },
      body: JSON.stringify({
        ...((typeof payload === "object" && payload !== null) ? payload : { data: payload }),
        _meta: {
          firedAt:  new Date().toISOString(),
          source:   "ghaafeedi-orchestration",
        },
      }),
      signal: AbortSignal.timeout(8_000), // 8s max — never block main flow
    });

    if (!res.ok) {
      console.warn(`[n8n] Webhook ${path} returned ${res.status}`);
    } else {
      console.log(`[n8n] Fired ${path} → ${res.status}`);
    }
  } catch (err: any) {
    // Never throw — n8n is non-critical path
    console.error(`[n8n] Dispatch failed for ${path}:`, err?.message ?? err);
  }
}

// ─── Typed dispatchers ────────────────────────────────────────────────────────

export const n8nDispatcher = {
  /**
   * Automation 1: Order paid → trigger production job
   */
  orderPaid(payload: {
    orderId:     string;
    userId:      string;
    productSlug: string;
    productName: string;
    priceCents:  number;
    customerEmail: string;
    customerName:  string;
    tier?:       string;
  }) {
    return fire(N8N_WEBHOOKS.orderPaid, payload);
  },

  /**
   * Automation 2: Job failed → retry notice + admin alert
   */
  jobFailed(payload: {
    jobId:       string;
    userId:      string;
    jobType:     string;
    provider:    string;
    attempt:     number;
    maxAttempts: number;
    error:       string;
    willRetry:   boolean;
    customerEmail?: string;
  }) {
    return fire(N8N_WEBHOOKS.jobFailed, payload);
  },

  /**
   * Automation 3: Song (or production) complete → customer delivery email
   */
  jobComplete(payload: {
    jobId:        string;
    userId:       string;
    jobType:      string;
    productName:  string;
    deliveryUrl?: string;
    previewUrl?:  string;
    customerEmail: string;
    customerName:  string;
  }) {
    return fire(N8N_WEBHOOKS.jobComplete, payload);
  },

  /**
   * Automation 5: Subscription cancelled → Sophia AI re-engagement
   */
  subscriptionCancelled(payload: {
    userId:          string;
    customerEmail:   string;
    customerName:    string;
    planName:        string;
    cancelledAt:     string;
    monthsActive?:   number;
  }) {
    return fire(N8N_WEBHOOKS.subscriptionCancelled, payload);
  },
};
