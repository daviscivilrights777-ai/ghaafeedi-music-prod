/**
 * Audit Logger
 * Append-only writes to audit_logs PG table with SHA-256 hash chain.
 * Degrades gracefully to console-only if PG is not provisioned.
 */

import crypto from "crypto";
import { db } from "../database/pg-client";
import { auditLogs } from "../database/pg-schema";
import { desc } from "drizzle-orm";

export type AuditSeverity = "info" | "warn" | "error" | "critical";

export interface AuditEntry {
  action: string;
  actorId: string;
  actorRole?: string;
  resourceType?: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity; // stored in payload.severity
}

let _prevHash: string | null = null;
let _prevHashLoaded = false;
let _pgAvailable = true;

export class AuditLogger {
  private static _instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!AuditLogger._instance) AuditLogger._instance = new AuditLogger();
    return AuditLogger._instance;
  }

  async log(entry: AuditEntry): Promise<number | null> {
    // Always console log
    console.log(
      `[AUDIT] ${new Date().toISOString()} severity=${entry.severity ?? "info"} actor=${entry.actorId} action=${entry.action} resource=${entry.resourceType ?? "n/a"}:${entry.resourceId ?? "n/a"}`
    );

    if (!_pgAvailable) return null;

    try {
      await this._ensurePrevHash();

      const payload = {
        ...(entry.payload ?? {}),
        severity: entry.severity ?? "info",
        userAgent: entry.userAgent,
      };

      const logHash = this._computeHash(entry, _prevHash, payload);

      const rows = await db.insert(auditLogs).values({
        actorId:      entry.actorId,
        actorRole:    entry.actorRole ?? "system",
        action:       entry.action,
        resourceType: entry.resourceType ?? null,
        resourceId:   entry.resourceId ?? null,
        ipAddress:    entry.ipAddress ?? null,
        userAgent:    entry.userAgent ?? null,
        payload,
        prevHash:     _prevHash,
        logHash,
      }).returning({ id: auditLogs.id });

      _prevHash = logHash;
      return rows[0]?.id ?? null;
    } catch (err) {
      const e = err as Error;
      if (e.message.includes("connect") || e.message.includes("POSTGRES")) {
        _pgAvailable = false;
        console.warn("[AuditLogger] PG unavailable — console-only logging");
      } else {
        console.error("[AuditLogger] write failed:", e.message);
      }
      return null;
    }
  }

  // --- Convenience wrappers ------------------------------------------------

  async jobCreated(jobId: string, userId: string, meta: Record<string, unknown>) {
    return this.log({ action: "job.created", actorId: userId, actorRole: "user", resourceType: "job", resourceId: jobId, payload: meta });
  }

  async jobStarted(jobId: string, provider: string, meta?: Record<string, unknown>) {
    return this.log({ action: "job.started", actorId: provider, actorRole: "system", resourceType: "job", resourceId: jobId, payload: meta });
  }

  async jobCompleted(jobId: string, provider: string, durationMs: number, costUsd: number) {
    return this.log({ action: "job.completed", actorId: provider, actorRole: "system", resourceType: "job", resourceId: jobId, payload: { durationMs, costUsd } });
  }

  async jobFailed(jobId: string, provider: string, error: string, attempt: number) {
    return this.log({ action: "job.failed", actorId: provider, actorRole: "system", resourceType: "job", resourceId: jobId, payload: { error, attempt }, severity: "error" });
  }

  async jobCancelled(jobId: string, cancelledBy: string) {
    return this.log({ action: "job.cancelled", actorId: cancelledBy, actorRole: "user", resourceType: "job", resourceId: jobId, severity: "warn" });
  }

  async providerFailover(jobId: string, from: string, to: string, reason: string) {
    return this.log({ action: "provider.failover", actorId: "retry-manager", actorRole: "system", resourceType: "job", resourceId: jobId, payload: { from, to, reason }, severity: "warn" });
  }

  async adminAction(adminId: string, action: string, resourceType: string, resourceId: string, meta?: Record<string, unknown>) {
    return this.log({ action: `admin.${action}`, actorId: adminId, actorRole: "admin", resourceType, resourceId, payload: meta, severity: "warn" });
  }

  async securityEvent(event: string, actorId: string, meta: Record<string, unknown>) {
    return this.log({ action: `security.${event}`, actorId, actorRole: "system", payload: meta, severity: "critical" });
  }

  // --- Private helpers -----------------------------------------------------

  private _computeHash(entry: AuditEntry, prevHash: string | null, payload: Record<string, unknown>): string {
    const data = JSON.stringify({
      action: entry.action,
      actorId: entry.actorId,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      payload,
      prevHash,
      ts: Date.now(),
    });
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private async _ensurePrevHash(): Promise<void> {
    if (_prevHashLoaded) return;
    _prevHashLoaded = true;
    try {
      const rows = await db.select({ logHash: auditLogs.logHash })
        .from(auditLogs)
        .orderBy(desc(auditLogs.id))
        .limit(1);
      _prevHash = rows[0]?.logHash ?? null;
    } catch {
      _prevHash = null;
    }
  }
}
