/**
 * Entitlement Validator
 * Checks quota, tier permissions, and payment status before a job runs.
 */

import { db } from "../database/pg-client";
import { members, subscriptions, orders } from "../database/pg-schema";
import { eq, and } from "drizzle-orm";
import { AuditLogger } from "./audit-logger";
import type { QueueTier } from "./redis-client";

export type ProductType =
  | "song"
  | "video"
  | "voice_clone"
  | "visualization"
  | "narration"
  | "analysis"
  | "image"
  | "storyboard"
  | "lyrics";

export interface EntitlementResult {
  allowed: boolean;
  reason?: string;
  quotaRemaining?: number;
  memberTier?: string;
  memberStatus?: string;
  jobTier?: QueueTier;
}

// Monthly quota caps per membership tier
const TIER_QUOTAS: Record<string, Record<ProductType | "default", number>> = {
  free: {
    song: 0, video: 0, voice_clone: 0,
    visualization: 2, narration: 2, analysis: 5,
    image: 3, storyboard: 2, lyrics: 3,
    default: 0,
  },
  starter: {
    song: 3, video: 1, voice_clone: 0,
    visualization: 3, narration: 5, analysis: 10,
    image: 5, storyboard: 3, lyrics: 10,
    default: 3,
  },
  premium: {
    song: 8, video: 3, voice_clone: 1,
    visualization: 8, narration: 15, analysis: 20,
    image: 20, storyboard: 8, lyrics: 50,
    default: 8,
  },
  elite: {
    song: 15, video: 10, voice_clone: 5,
    visualization: 999, narration: 999, analysis: 999,
    image: 100, storyboard: 50, lyrics: 999,
    default: 15,
  },
};

const TIER_TO_JOB_TIER: Record<string, QueueTier> = {
  elite: "elite",
  premium: "premium",
  starter: "starter",
  free: "free",
};

let _pgAvailable = true;

export class EntitlementValidator {
  private static _instance: EntitlementValidator;
  private logger = AuditLogger.getInstance();

  static getInstance(): EntitlementValidator {
    if (!EntitlementValidator._instance) EntitlementValidator._instance = new EntitlementValidator();
    return EntitlementValidator._instance;
  }

  async validate(opts: {
    userId: string;
    productType: ProductType;
    orderId?: string;
  }): Promise<EntitlementResult> {
    if (!_pgAvailable) {
      // Dev mode fallback
      return { allowed: true, memberTier: "dev", jobTier: "starter", quotaRemaining: 999 };
    }

    try {
      // Load member record
      const memberRows = await db.select()
        .from(members)
        .where(eq(members.userId, opts.userId))
        .limit(1);

      if (!memberRows.length) {
        return { allowed: false, reason: "No member record found. Please complete registration." };
      }

      const member = memberRows[0];
      const tier = member.tier ?? "free";
      const status = member.status ?? "inactive";

      if (status !== "active") {
        // Check one-time order path
        if (opts.orderId) {
          const orderResult = await this._validateOneTimeOrder(opts.userId, opts.orderId);
          if (orderResult.allowed) {
            return {
              ...orderResult,
              memberTier: tier,
              jobTier: TIER_TO_JOB_TIER[tier] ?? "free",
            };
          }
        }
        return {
          allowed: false,
          reason: `Member account status is "${status}". Active membership required.`,
          memberTier: tier,
          memberStatus: status,
        };
      }

      // Check monthly quota via subscription
      const subRows = await db.select()
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, opts.userId), eq(subscriptions.status, "active")))
        .limit(1);

      const sub = subRows[0];

      // For song type, check subscription quota directly
      if (opts.productType === "song" && sub) {
        const used = sub.quotaUsed ?? 0;
        const cap = sub.quotaSongs ?? TIER_QUOTAS[tier]?.song ?? 0;
        if (used >= cap) {
          return {
            allowed: false,
            reason: `Monthly song quota reached (${used}/${cap}). Upgrade or wait for renewal.`,
            quotaRemaining: 0,
            memberTier: tier,
            memberStatus: status,
          };
        }
        return {
          allowed: true,
          quotaRemaining: cap - used,
          memberTier: tier,
          memberStatus: status,
          jobTier: TIER_TO_JOB_TIER[tier] ?? "free",
        };
      }

      // General quota check from tier caps
      const cap = TIER_QUOTAS[tier]?.[opts.productType] ?? TIER_QUOTAS[tier]?.default ?? 0;
      if (cap === 0) {
        return {
          allowed: false,
          reason: `${opts.productType} not included in "${tier}" tier.`,
          memberTier: tier,
        };
      }

      return {
        allowed: true,
        quotaRemaining: cap, // simplified — real impl tracks usage_counters table
        memberTier: tier,
        memberStatus: status,
        jobTier: TIER_TO_JOB_TIER[tier] ?? "free",
      };
    } catch (err) {
      const e = err as Error;
      if (e.message.includes("connect") || e.message.includes("POSTGRES")) {
        _pgAvailable = false;
        return { allowed: true, memberTier: "dev", jobTier: "starter", quotaRemaining: 999 };
      }
      console.error("[EntitlementValidator] error:", e.message);
      const isDev = process.env.NODE_ENV !== "production";
      return { allowed: isDev, reason: isDev ? undefined : "Validation error" };
    }
  }

  getJobTier(memberTier: string): QueueTier {
    return TIER_TO_JOB_TIER[memberTier] ?? "free";
  }

  /** Increment subscription quota usage after successful song gen */
  async incrementSongUsage(userId: string): Promise<void> {
    if (!_pgAvailable) return;
    try {
      const subRows = await db.select({ id: subscriptions.id, quotaUsed: subscriptions.quotaUsed })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
        .limit(1);

      if (subRows[0]) {
        await db.update(subscriptions)
          .set({ quotaUsed: (subRows[0].quotaUsed ?? 0) + 1, updatedAt: new Date() })
          .where(eq(subscriptions.id, subRows[0].id));
      }
    } catch (err) {
      console.error("[EntitlementValidator] incrementSongUsage failed:", (err as Error).message);
    }
  }

  private async _validateOneTimeOrder(userId: string, orderId: string): Promise<EntitlementResult> {
    try {
      const orderRows = await db.select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
        .limit(1);

      if (!orderRows.length) return { allowed: false, reason: "Order not found" };
      const order = orderRows[0];

      if (order.status !== "paid" && order.status !== "processing") {
        return { allowed: false, reason: `Order status is "${order.status}"` };
      }

      return { allowed: true, memberStatus: "one_time", quotaRemaining: 1 };
    } catch {
      return { allowed: false, reason: "Order validation failed" };
    }
  }
}
