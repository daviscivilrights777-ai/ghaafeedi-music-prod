// ============================================================
// Ghaafeedi Music — Provider Adapter Interface
// Every AI provider implements this contract.
// The orchestration engine ONLY talks to adapters — never to providers directly.
// ============================================================
import type { JobSpec } from "../job-queue";

// ─── Common types ─────────────────────────────────────────────
export interface CostEstimate {
  minCents:    number;
  maxCents:    number;
  estimateCents: number;
  unit:        string;  // "per_second" | "per_song" | "per_request" | "per_char"
  breakdown:   string;  // human-readable e.g. "~45s × $0.07/s = $3.15"
}

export interface JobHandle {
  externalJobId: string;
  provider:      string;
  dispatchedAt:  Date;
  webhookUrl?:   string;
  pollIntervalMs?: number;
  metadata?:     Record<string, unknown>;  // Pass-through for clip_batch shot tracking
}

export type ProviderJobStatus =
  | "pending"
  | "processing"
  | "complete"
  | "failed"
  | "cancelled";

export interface ProviderJobResult {
  status:      ProviderJobStatus;
  outputUrl?:  string;           // Primary output asset URL
  outputUrls?: string[];         // Multiple outputs (e.g. scenes)
  metadata?:   Record<string, unknown>;
  costCents?:  number;           // Actual cost if provider reports it
  durationSeconds?: number;
  errorMessage?: string;
}

export interface ProviderHealth {
  healthy:         boolean;
  latencyMs?:      number;
  errorRate?:      number;          // 0.0 – 1.0
  queueDepth?:     number;
  message?:        string;
  checkedAt:       Date;
  /** Balance info — populated when provider exposes it */
  balanceCents?:   number | null;   // null = unknown, number = cents
  balanceStatus?:  "ok" | "low" | "exhausted" | "unknown";
  balanceDashboardUrl?: string;
}

// ─── The Contract ─────────────────────────────────────────────
export interface ProviderAdapter {
  /** Unique provider identifier — matches providers.name in DB */
  readonly name: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Job types this adapter handles */
  readonly jobTypes: JobSpec["jobType"][];

  /**
   * Estimate cost before dispatching.
   * Used by Cost Optimizer to score providers.
   */
  estimateCost(job: JobSpec): Promise<CostEstimate>;

  /**
   * Dispatch job to provider. Returns a handle for tracking.
   * Must NOT block — dispatch and return immediately.
   */
  dispatch(job: JobSpec): Promise<JobHandle>;

  /**
   * Poll provider for job status.
   * Called by worker loop until terminal state.
   */
  getStatus(handle: JobHandle): Promise<ProviderJobResult>;

  /**
   * Cancel an in-flight job (best effort).
   */
  cancelJob(handle: JobHandle): Promise<void>;

  /**
   * Health check — called every 60s by monitor.
   */
  healthCheck(): Promise<ProviderHealth>;
}

// ─── Provider Registry ────────────────────────────────────────
class ProviderRegistryClass {
  private adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.name, adapter);
    console.log(`[ProviderRegistry] Registered: ${adapter.name}`);
  }

  get(name: string): ProviderAdapter | null {
    return this.adapters.get(name) ?? null;
  }

  getAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  getForJobType(jobType: JobSpec["jobType"]): ProviderAdapter[] {
    return this.getAll().filter((a) => a.jobTypes.includes(jobType));
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const ProviderRegistry = new ProviderRegistryClass();
