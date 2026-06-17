/**
 * Billing Emitter
 * Writes billing_events to PG and updates LTV counters in Redis.
 */

import { db } from "../database/pg-client";
import { billingEvents, profiles } from "../database/pg-schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getRedis, REDIS_KEYS } from "./redis-client";
import { AuditLogger } from "./audit-logger";
import type { ProductType } from "./entitlement-validator";

export type BillingEventType =
  | "job_cost"
  | "subscription_renewal"
  | "refund"
  | "credit"
  | "addon";

export interface BillingEmitInput {
  userId: string;
  orderId?: string;
  jobId?: string;
  eventType: BillingEventType;
  amountCents: number;
  provider?: string;
  externalRef?: string;
  meta?: Record<string, unknown>;
}

let _pgAvailable = true;
let _redisAvailable = true;

export class BillingEmitter {
  private static _instance: BillingEmitter;
  private logger = AuditLogger.getInstance();

  static getInstance(): BillingEmitter {
    if (!BillingEmitter._instance) BillingEmitter._instance = new BillingEmitter();
    return BillingEmitter._instance;
  }

  async emit(input: BillingEmitInput): Promise<string | null> {
    console.log(
      `[BillingEmitter] ${input.eventType} user=${input.userId} amount=${input.amountCents}¢ provider=${input.provider ?? "n/a"}`
    );

    let eventId: string | null = null;

    if (_pgAvailable) {
      try {
        const rows = await db.insert(billingEvents).values({
          id:          crypto.randomUUID(),
          userId:      input.userId,
          orderId:     input.orderId ?? null,
          jobId:       input.jobId ?? null,
          eventType:   input.eventType,
          amountCents: input.amountCents,
          provider:    input.provider ?? null,
          externalRef: input.externalRef ?? null,
          metadata:    input.meta ?? {},
        }).returning({ id: billingEvents.id });

        eventId = rows[0]?.id ?? null;

        // Update LTV in profiles table
        if (input.amountCents > 0 && input.eventType !== "refund" && input.eventType !== "credit") {
          await db.update(profiles)
            .set({
              ltvCents: sql`${profiles.ltvCents} + ${input.amountCents}`,
              updatedAt: new Date(),
            })
            .where(eq(profiles.userId, input.userId));
        }
      } catch (err) {
        const e = err as Error;
        if (e.message.includes("connect") || e.message.includes("POSTGRES")) {
          _pgAvailable = false;
          console.warn("[BillingEmitter] PG unavailable");
        } else {
          console.error("[BillingEmitter] PG write failed:", e.message);
        }
      }
    }

    // Update Redis LTV counter
    await this._updateRedisLTV(input);

    await this.logger.log({
      action: `billing.${input.eventType}`,
      actorId: "billing-emitter",
      actorRole: "system",
      resourceType: "order",
      resourceId: input.orderId ?? input.jobId ?? "n/a",
      payload: { amountCents: input.amountCents, provider: input.provider },
    });

    return eventId;
  }

  async getUserLTV(userId: string): Promise<number> {
    // Try Redis first
    if (_redisAvailable) {
      try {
        const redis = getRedis();
        const val = await redis.hget(REDIS_KEYS.ltv(userId), "totalCents");
        if (val !== null) return parseInt(String(val), 10);
      } catch {
        _redisAvailable = false;
      }
    }

    // Fallback to PG
    if (_pgAvailable) {
      try {
        const rows = await db.select({ ltvCents: profiles.ltvCents })
          .from(profiles)
          .where(eq(profiles.userId, userId))
          .limit(1);
        return rows[0]?.ltvCents ?? 0;
      } catch {
        return 0;
      }
    }

    return 0;
  }

  async getRevenueSummary(from: Date, to: Date): Promise<{
    totalRevenueCents: number;
    eventCount: number;
  }> {
    if (!_pgAvailable) return { totalRevenueCents: 0, eventCount: 0 };

    try {
      const rows = await db.select({
        total: sql<number>`SUM(${billingEvents.amountCents})::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(billingEvents)
      .where(and(
        gte(billingEvents.createdAt, from),
        lte(billingEvents.createdAt, to),
      ));

      return {
        totalRevenueCents: rows[0]?.total ?? 0,
        eventCount: rows[0]?.count ?? 0,
      };
    } catch (err) {
      console.error("[BillingEmitter] getRevenueSummary:", (err as Error).message);
      return { totalRevenueCents: 0, eventCount: 0 };
    }
  }

  private async _updateRedisLTV(input: BillingEmitInput): Promise<void> {
    if (!_redisAvailable || input.amountCents <= 0) return;
    if (input.eventType === "refund" || input.eventType === "credit") return;

    try {
      const redis = getRedis();
      const key = REDIS_KEYS.ltv(input.userId);
      await redis.hincrby(key, "totalCents", input.amountCents);
      await redis.hincrby(key, "jobCount", 1);
      await redis.expire(key, 90 * 24 * 3600);
    } catch (err) {
      const e = err as Error;
      if (e.message.includes("connect") || e.message.includes("UPSTASH")) {
        _redisAvailable = false;
      }
    }
  }
}
