// ============================================================
// Ghaafeedi Music — Event Bus
// All orchestration events published here.
// Subscribers (n8n, admin dashboard, billing) listen via polling or webhooks.
// ============================================================
import { getRedis } from "./redis-client";

// ─── Event Types ──────────────────────────────────────────────
export const EVENTS = {
  // User lifecycle
  USER_CREATED:             "user.created",
  USER_VERIFIED:            "user.verified",

  // Job lifecycle
  JOB_QUEUED:               "job.queued",
  JOB_DISPATCHED:           "job.dispatched",
  JOB_PROCESSING:           "job.processing",
  JOB_COMPLETE:             "job.complete",
  JOB_FAILED:               "job.failed",
  JOB_RETRY:                "job.retry",
  JOB_FAILOVER:             "job.failover",
  JOB_CANCELLED:            "job.cancelled",
  JOB_QUALITY_REVIEW:       "job.quality_review",

  // Order lifecycle
  ORDER_CREATED:            "order.created",
  ORDER_PAID:               "order.paid",
  ORDER_ACKNOWLEDGED:       "order.acknowledged",
  ORDER_DELIVERED:          "order.delivered",
  ORDER_REFUNDED:           "order.refunded",
  ORDER_CANCELLED:          "order.cancelled",

  // Assets
  ASSETS_COMPLETE:          "assets.complete",
  ASSET_UPLOADED:           "asset.uploaded",

  // Delivery
  QUALITY_APPROVED:         "quality.approved",
  QUALITY_REJECTED:         "quality.rejected",
  DELIVERY_SENT:            "delivery.sent",

  // Billing
  BILLING_EMITTED:          "billing.emitted",
  SUBSCRIPTION_CREATED:     "subscription.created",
  SUBSCRIPTION_CANCELLED:   "subscription.cancelled",
  PAYMENT_FAILED:           "payment.failed",

  // Provider
  PROVIDER_TOGGLED:         "provider.toggled",
  PROVIDER_ERROR:           "provider.error",
  PROVIDER_BUDGET_ALERT:    "provider.budget_alert",

  // Analytics
  ANALYTICS_JOB_COMPLETE:   "analytics.job_complete",
  COST_ANOMALY:             "analytics.cost_anomaly",

  // Admin
  ADMIN_ACTION:             "admin.action",
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];

export interface GmEvent<T = unknown> {
  id:        string;
  type:      EventType;
  payload:   T;
  timestamp: string;
  userId?:   string;
  jobId?:    string;
  orderId?:  string;
}

// ─── Event Bus ────────────────────────────────────────────────
const EVENT_STREAM_KEY = "gm:events:stream";
const DLQ_KEY          = "gm:events:dlq";
const MAX_STREAM_LEN   = 10_000; // trim to last 10k events

export class EventBus {
  /**
   * Publish an event. Stored in Redis stream for durability.
   * n8n subscribes via webhook polling or Redis stream reader.
   */
  static async publish<T = unknown>(
    type: EventType,
    payload: T,
    meta?: { userId?: string; jobId?: string; orderId?: string }
  ): Promise<string> {
    const redis = getRedis();
    const event: GmEvent<T> = {
      id:        `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    // Write to Redis stream (XADD with MAXLEN trim)
    const streamId = await redis.xadd(
      EVENT_STREAM_KEY,
      { MAXLEN: MAX_STREAM_LEN } as any,
      "*",
      { event: JSON.stringify(event) }
    ) as string;

    // Also write to a per-type list for targeted consumers
    const typeKey = `gm:events:type:${type}`;
    await redis.lpush(typeKey, JSON.stringify(event));
    await redis.expire(typeKey, 48 * 60 * 60); // 48h TTL per type bucket

    return event.id;
  }

  /**
   * Read recent events from stream (for admin dashboard polling).
   */
  static async readRecent(count = 50): Promise<GmEvent[]> {
    const redis = getRedis();
    try {
      const raw = await redis.xrevrange(EVENT_STREAM_KEY, "+", "-", { COUNT: count } as any);
      if (!raw || !Array.isArray(raw)) return [];
      return (raw as any[]).map((entry: any) => {
        const data = Array.isArray(entry) ? entry[1] : entry;
        const eventStr = Array.isArray(data)
          ? data[data.indexOf("event") + 1]
          : data?.event;
        return eventStr ? JSON.parse(eventStr) : null;
      }).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Read events for a specific type (last N).
   */
  static async readByType(type: EventType, count = 20): Promise<GmEvent[]> {
    const redis = getRedis();
    const raw = await redis.lrange(`gm:events:type:${type}`, 0, count - 1);
    return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r)).filter(Boolean);
  }

  /**
   * Write to dead-letter queue (failed event processing).
   */
  static async deadLetter(event: GmEvent, error: string): Promise<void> {
    const redis = getRedis();
    await redis.lpush(DLQ_KEY, JSON.stringify({ event, error, failedAt: new Date().toISOString() }));
    await redis.ltrim(DLQ_KEY, 0, 999); // keep last 1000 dead letters
  }
}
