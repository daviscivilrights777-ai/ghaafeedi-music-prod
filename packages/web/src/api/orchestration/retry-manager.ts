/**
 * Retry Manager
 * Exponential backoff + provider failover.
 * Used internally by OrchestrationEngine — not called directly by routes.
 *
 * NOTE: The main retry/failover logic lives in OrchestrationEngine.processNextJob().
 * This class provides utility methods for external use or testing.
 */

import type { JobSpec } from "./job-queue";
import { ProviderRegistry } from "./adapters/provider-adapter";
import type { ProviderAdapter, JobHandle, ProviderJobResult } from "./adapters/provider-adapter";
import { AuditLogger } from "./audit-logger";

export interface RetryPolicy {
  maxAttempts:       number;    // default 3
  baseDelayMs:       number;    // default 1000
  maxDelayMs:        number;    // default 30_000
  backoffMultiplier: number;    // default 2.0
  jitterFactor:      number;    // 0–1, default 0.25
}

const DEFAULT_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2.0,
  jitterFactor: 0.25,
};

export type RetryResult =
  | { success: true;  result: ProviderJobResult; provider: string; attempts: number }
  | { success: false; error: Error;             provider: string; attempts: number };

function computeDelay(attempt: number, policy: RetryPolicy): number {
  const base = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
  const capped = Math.min(base, policy.maxDelayMs);
  const jitter = capped * policy.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(100, Math.round(capped + jitter));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("network error") ||
    msg.includes("service unavailable") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("too many requests")
  );
}

export class RetryManager {
  private static _instance: RetryManager;
  private logger = AuditLogger.getInstance();

  static getInstance(): RetryManager {
    if (!RetryManager._instance) RetryManager._instance = new RetryManager();
    return RetryManager._instance;
  }

  /**
   * Execute a job on a provider with retry + failover through the chain.
   */
  async execute(
    job: JobSpec,
    primaryProvider: string,
    failoverChain: string[],
    policyOverride?: Partial<RetryPolicy>
  ): Promise<RetryResult> {
    const policy = { ...DEFAULT_POLICY, ...policyOverride };
    const chain = [primaryProvider, ...failoverChain.filter((p) => p !== primaryProvider)];
    let lastError = new Error("No providers available");

    for (const providerId of chain) {
      const adapter = ProviderRegistry.get(providerId);
      if (!adapter) {
        console.warn(`[RetryManager] "${providerId}" not in registry — skipping`);
        continue;
      }

      const result = await this._tryWithRetry(job, providerId, adapter, policy);
      if (result.success) return { ...result, provider: providerId };

      lastError = result.error;
      await this.logger.providerFailover(
        job.jobId, providerId,
        chain[chain.indexOf(providerId) + 1] ?? "none",
        lastError.message
      );
    }

    return { success: false, error: lastError, provider: chain[chain.length - 1] ?? "unknown", attempts: policy.maxAttempts };
  }

  private async _tryWithRetry(
    job: JobSpec,
    providerId: string,
    adapter: ProviderAdapter,
    policy: RetryPolicy
  ): Promise<RetryResult> {
    let lastError = new Error("Unknown");

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        const health = await adapter.healthCheck();
        if (!health.healthy) throw new Error(`${providerId} health check failed: ${health.message}`);

        const handle = await adapter.dispatch(job);
        const deadline = Date.now() + 10 * 60 * 1000;

        let result = await adapter.getStatus(handle);
        while (result.status === "pending" || result.status === "processing") {
          if (Date.now() > deadline) throw new Error("Job timed out");
          await sleep(handle.pollIntervalMs ?? 3000);
          result = await adapter.getStatus(handle);
        }

        if (result.status === "complete") {
          return { success: true, result, provider: providerId, attempts: attempt };
        }
        throw new Error(result.errorMessage ?? "Provider returned failed");
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const retryable = isRetryable(lastError);
        console.warn(`[RetryManager] job=${job.jobId} provider=${providerId} attempt=${attempt}/${policy.maxAttempts} retryable=${retryable} error="${lastError.message}"`);

        if (!retryable || attempt === policy.maxAttempts) {
          return { success: false, error: lastError, provider: providerId, attempts: attempt };
        }
        await sleep(computeDelay(attempt, policy));
      }
    }

    return { success: false, error: lastError, provider: providerId, attempts: policy.maxAttempts };
  }
}
