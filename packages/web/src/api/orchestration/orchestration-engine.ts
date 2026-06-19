/**
 * Orchestration Engine — Master Class
 * Ties together: JobQueue, JobStateMachine, CostOptimizer, RetryManager,
 * AuditLogger, EntitlementValidator, BillingEmitter, EventBus.
 */

import crypto from "crypto";
import { bootstrapAdapters, ProviderRegistry } from "./adapters/index";
import { JobQueue, type JobSpec, type JobType } from "./job-queue";
import { SophiaIntroGenerator, type SophiaIntroRequest } from "./sophia-intro-generator";
import { JobStateMachine } from "./state-machine";
import { CostOptimizer } from "./cost-optimizer";
import { AuditLogger } from "./audit-logger";
import { EntitlementValidator, type ProductType } from "./entitlement-validator";
import { BillingEmitter } from "./billing-emitter";
import { EventBus, EVENTS } from "./event-bus";
import { db } from "../database/pg-client";
import { aiJobs } from "../database/pg-schema";
import { eq } from "drizzle-orm";
import type { QueueTier } from "./redis-client";
import { n8nDispatcher } from "./n8n-dispatcher";

// --- Types ------------------------------------------------------------------

export interface JobSubmissionRequest {
  userId: string;
  productType: ProductType;
  jobType: JobType;
  orderId?: string;
  productionId?: string;
  storyId?: string;
  tier?: QueueTier;
  inputPayload: Record<string, unknown>;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface JobSubmissionResult {
  success: boolean;
  jobId?: string;
  quotaRemaining?: number;
  error?: string;
}

export interface JobStatusResult {
  jobId: string;
  status: string;
  provider?: string;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
  queuedAt?: Date;
  dispatchedAt?: Date;
  completedAt?: Date;
  retryCount?: number;
  estimatedCostCents?: number;
  actualCostCents?: number;
}

// Provider cost estimates (cents) per job type
const JOB_TYPE_COST_CENTS: Record<JobType, number> = {
  video:        800,
  song:         10,
  voice_clone:  5,
  visualization: 300,
  narration:    100,
  analysis:     2,
  image:        50,
  storyboard:   20,
  lyrics:       2,
  sophia_intro: 4, // OpenAI script (~2¢) + 2x ElevenLabs renders (~1¢ each)
};

// Subscription value per job type (what the job is worth to the customer in cents)
const JOB_VALUE_CENTS: Record<JobType, number> = {
  video:        4000,
  song:         833,
  voice_clone:  6000,
  visualization: 800,
  narration:    300,
  analysis:     50,
  image:        200,
  storyboard:   100,
  lyrics:       50,
  sophia_intro: 500, // personalized AI voiceover — high perceived value
};

let _pgAvailable = true;

export class OrchestrationEngine {
  private static _instance: OrchestrationEngine;

  private logger   = AuditLogger.getInstance();
  private entitle  = EntitlementValidator.getInstance();
  private billing  = BillingEmitter.getInstance();

  static getInstance(): OrchestrationEngine {
    if (!OrchestrationEngine._instance) {
      bootstrapAdapters();
      OrchestrationEngine._instance = new OrchestrationEngine();
    }
    return OrchestrationEngine._instance;
  }

  // ---------------------------------------------------------------------------
  // submitJob
  // ---------------------------------------------------------------------------
  async submitJob(req: JobSubmissionRequest): Promise<JobSubmissionResult> {
    // 1. Entitlement check
    const entitlement = await this.entitle.validate({
      userId: req.userId,
      productType: req.productType,
      orderId: req.orderId,
    });

    if (!entitlement.allowed) {
      await this.logger.log({
        action: "job.submit.denied",
        actorId: req.userId,
        actorRole: "user",
        resourceType: "job",
        payload: { reason: entitlement.reason, productType: req.productType },
        severity: "warn",
      });
      return { success: false, error: entitlement.reason ?? "Not entitled" };
    }

    // 2. Select optimal provider
    const jobSpec: JobSpec = {
      jobId:       "", // placeholder
      userId:      req.userId,
      orderId:     req.orderId,
      productionId: req.productionId,
      storyId:     req.storyId,
      jobType:     req.jobType,
      tier:        req.tier ?? entitlement.jobTier ?? "free",
      priority:    this._tierToPriority(req.tier ?? entitlement.jobTier ?? "free"),
      inputPayload: req.inputPayload,
      metadata:    req.metadata ?? {},
      enqueuedAt:  new Date().toISOString(),
    };

    let selectedProvider: string;
    try {
      const selection = await CostOptimizer.selectProvider(jobSpec);
      selectedProvider = selection.adapter.name;
    } catch {
      // Fallback to first available adapter for this job type
      const adapters = ProviderRegistry.getForJobType(req.jobType);
      selectedProvider = adapters[0]?.name ?? "openai";
    }

    // 3. Estimate cost
    const estimatedCostCents = JOB_TYPE_COST_CENTS[req.jobType] ?? 10;

    // 4. Enqueue
    const job = await JobQueue.enqueue({
      userId:      req.userId,
      orderId:     req.orderId,
      productionId: req.productionId,
      storyId:     req.storyId,
      jobType:     req.jobType,
      tier:        req.tier ?? entitlement.jobTier ?? "free",
      priority:    this._tierToPriority(req.tier ?? entitlement.jobTier ?? "free"),
      inputPayload: req.inputPayload,
      estimatedCostCents,
      metadata:    { ...req.metadata, provider: selectedProvider, webhookUrl: req.webhookUrl },
    });

    // 5. Persist initial state to PG
    if (_pgAvailable) {
      try {
        await db.insert(aiJobs).values({
          id:        job.jobId,
          userId:    req.userId,
          orderId:   req.orderId ?? null,
          productionId: req.productionId ?? null,
          storyId:   req.storyId ?? null,
          jobType:   req.jobType,
          status:    "queued",
          provider:  selectedProvider,
          inputPayload: req.inputPayload,
          estimatedCostCents,
          priority:  this._tierToPriority(req.tier ?? entitlement.jobTier ?? "free"),
          metadata:  req.metadata ?? {},
        });
      } catch (err) {
        const e = err as Error;
        if (e.message.includes("connect")) _pgAvailable = false;
        console.warn("[OrchestrationEngine] PG insert failed:", e.message);
      }
    }

    // 6. Audit + event
    await this.logger.jobCreated(job.jobId, req.userId, {
      jobType: req.jobType,
      provider: selectedProvider,
      tier: req.tier ?? entitlement.jobTier ?? "free",
    });

    await EventBus.publish(EVENTS.JOB_QUEUED as any, {
      jobId: job.jobId, userId: req.userId, jobType: req.jobType, provider: selectedProvider,
    }, { jobId: job.jobId });

    return {
      success: true,
      jobId: job.jobId,
      quotaRemaining: entitlement.quotaRemaining,
    };
  }

  // ---------------------------------------------------------------------------
  // processNextJob — dequeue + execute one job
  // ---------------------------------------------------------------------------
  async processNextJob(): Promise<boolean> {
    const job = await JobQueue.dequeue();
    if (!job) return false;

    const provider = (job.metadata?.provider as string) ?? "openai";
    const webhookUrl = job.metadata?.webhookUrl as string | undefined;
    const startMs = Date.now();

    console.log(`[OrchestrationEngine] Processing job=${job.jobId} type=${job.jobType} provider=${provider} tier=${job.tier}`);

    // Transition → dispatched
    try {
      await JobStateMachine.transition(job.jobId, "dispatched", { provider });
    } catch (err) {
      console.warn(`[OrchestrationEngine] transition to dispatched failed: ${(err as Error).message} — requeueing`);
      await JobQueue.requeue(job);
      return true;
    }

    await this.logger.jobStarted(job.jobId, provider);

    // ── sophia_intro short-circuit ────────────────────────────────────────────
    // This job type is fully self-contained (OpenAI + ElevenLabs inside
    // SophiaIntroGenerator). No generic adapter needed.
    if (job.jobType === "sophia_intro") {
      try {
        const introReq = job.inputPayload as unknown as SophiaIntroRequest;
        const result = await SophiaIntroGenerator.generate(introReq);

        await JobStateMachine.transition(job.jobId, "complete", {
          provider: "openai+elevenlabs",
          outputPayload: result as unknown as Record<string, unknown>,
          actualCostCents: JOB_TYPE_COST_CENTS.sophia_intro,
        });

        await this._updateJobInPg(job.jobId, {
          status: "complete",
          outputPayload: result as unknown as Record<string, unknown>,
          actualCostCents: JOB_TYPE_COST_CENTS.sophia_intro,
          retryCount: 0,
          completedAt: new Date(),
          durationSeconds: Math.round((Date.now() - startMs) / 1000),
        });

        await this.billing.emit({
          userId:      job.userId,
          orderId:     job.orderId,
          jobId:       job.jobId,
          eventType:   "job_cost",
          amountCents: JOB_VALUE_CENTS.sophia_intro,
          provider:    "openai+elevenlabs",
          meta:        { durationMs: Date.now() - startMs },
        });

        await this.logger.jobCompleted(job.jobId, "openai+elevenlabs", Date.now() - startMs, JOB_TYPE_COST_CENTS.sophia_intro / 100);

        await EventBus.publish(EVENTS.JOB_COMPLETE as any, {
          jobId: job.jobId, userId: job.userId, provider: "openai+elevenlabs",
          outputPayload: result as unknown as Record<string, unknown>,
        }, { jobId: job.jobId });

        console.log(`[OrchestrationEngine] sophia_intro job=${job.jobId} COMPLETE in ${Date.now() - startMs}ms`);
      } catch (err) {
        const errMsg = (err as Error).message;
        await JobStateMachine.transition(job.jobId, "failed", { errorMessage: errMsg });
        await this._updateJobInPg(job.jobId, { status: "failed", errorMessage: errMsg, retryCount: 1, completedAt: new Date() });
        await this.logger.jobFailed(job.jobId, "openai+elevenlabs", errMsg, 1);
        console.error(`[OrchestrationEngine] sophia_intro job=${job.jobId} FAILED:`, errMsg);
      }
      return true;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Get adapter
    const adapter = ProviderRegistry.get(provider);
    if (!adapter) {
      await JobStateMachine.transition(job.jobId, "failed", { errorMessage: `Adapter "${provider}" not found` });
      await this.logger.jobFailed(job.jobId, provider, `Adapter not found`, 1);
      return true;
    }

    // Dispatch
    let attempt = 0;
    let succeeded = false;
    let lastError = "";
    let outputPayload: Record<string, unknown> = {};
    let actualProvider = provider;

    const FAILOVER_ORDER = this._getFailoverChain(job.jobType, provider);

    for (const tryProvider of FAILOVER_ORDER) {
      attempt++;
      const tryAdapter = ProviderRegistry.get(tryProvider);
      if (!tryAdapter) continue;

      try {
        await JobStateMachine.transition(
          job.jobId,
          attempt === 1 ? "processing" : "failover_dispatch",
          { provider: tryProvider }
        ).catch(() => {}); // ignore if already in processing

        const handle = await tryAdapter.dispatch(job);

        // Poll until terminal state (with timeout 10 min)
        const deadline = Date.now() + 10 * 60 * 1000;
        let result = await tryAdapter.getStatus(handle);

        while (result.status === "pending" || result.status === "processing") {
          if (Date.now() > deadline) throw new Error("Job timed out after 10 minutes");
          await this._sleep(handle.pollIntervalMs ?? 3000);
          result = await tryAdapter.getStatus(handle);
        }

        if (result.status === "complete") {
          succeeded = true;
          actualProvider = tryProvider;
          outputPayload = {
            outputUrl:  result.outputUrl,
            outputUrls: result.outputUrls,
            ...result.metadata,
          };
          if (result.costCents !== undefined) {
            // Use actual cost if reported
          }
          break;
        } else {
          throw new Error(result.errorMessage ?? "Provider returned failed status");
        }
      } catch (err) {
        lastError = (err as Error).message;
        console.warn(`[OrchestrationEngine] job=${job.jobId} provider=${tryProvider} attempt=${attempt} error=${lastError}`);
        if (tryProvider !== FAILOVER_ORDER[FAILOVER_ORDER.length - 1]) {
          await this.logger.providerFailover(job.jobId, tryProvider, FAILOVER_ORDER[attempt] ?? "none", lastError);
        }
      }
    }

    const durationMs = Date.now() - startMs;

    if (succeeded) {
      await JobStateMachine.transition(job.jobId, "complete", {
        provider: actualProvider,
        outputPayload,
        actualCostCents: JOB_TYPE_COST_CENTS[job.jobType],
      });

      await this._updateJobInPg(job.jobId, {
        status: "complete",
        outputPayload,
        actualCostCents: JOB_TYPE_COST_CENTS[job.jobType],
        retryCount: attempt - 1,
        completedAt: new Date(),
        durationSeconds: Math.round(durationMs / 1000),
      });

      // Billing
      await this.billing.emit({
        userId:      job.userId,
        orderId:     job.orderId,
        jobId:       job.jobId,
        eventType:   "job_cost",
        amountCents: JOB_VALUE_CENTS[job.jobType] ?? 100,
        provider:    actualProvider,
        meta:        { durationMs, attempts: attempt },
      });

      // Increment song quota
      if (job.jobType === "song") {
        await this.entitle.incrementSongUsage(job.userId);
      }

      await this.logger.jobCompleted(job.jobId, actualProvider, durationMs, (JOB_TYPE_COST_CENTS[job.jobType] ?? 10) / 100);

      await EventBus.publish(EVENTS.JOB_COMPLETE as any, {
        jobId: job.jobId, userId: job.userId, provider: actualProvider, outputPayload,
      }, { jobId: job.jobId });

      // Automation 3: notify n8n → customer delivery email
      n8nDispatcher.jobComplete({
        jobId:         job.jobId,
        userId:        job.userId,
        jobType:       job.jobType,
        productName:   job.productType ?? job.jobType,
        deliveryUrl:   outputPayload?.url ?? outputPayload?.audioUrl ?? outputPayload?.videoUrl ?? undefined,
        customerEmail: job.inputPayload?.customerEmail as string ?? "",
        customerName:  job.inputPayload?.customerName as string ?? "",
      }).catch(() => {});

      if (webhookUrl) {
        this._fireWebhook(webhookUrl, { jobId: job.jobId, status: "complete", outputPayload }).catch(console.error);
      }

      console.log(`[OrchestrationEngine] job=${job.jobId} COMPLETE in ${durationMs}ms via ${actualProvider}`);
    } else {
      await JobStateMachine.transition(job.jobId, "failed", { errorMessage: lastError, retryCount: attempt });

      await this._updateJobInPg(job.jobId, {
        status: "failed",
        errorMessage: lastError,
        retryCount: attempt,
        completedAt: new Date(),
      });

      await this.logger.jobFailed(job.jobId, actualProvider, lastError, attempt);

      await EventBus.publish(EVENTS.JOB_FAILED as any, {
        jobId: job.jobId, userId: job.userId, error: lastError,
      }, { jobId: job.jobId });

      // Automation 2: notify n8n → admin alert + retry notice
      n8nDispatcher.jobFailed({
        jobId:       job.jobId,
        userId:      job.userId,
        jobType:     job.jobType,
        provider:    actualProvider,
        attempt,
        maxAttempts: job.maxAttempts,
        error:       lastError,
        willRetry:   attempt < job.maxAttempts,
        customerEmail: job.inputPayload?.customerEmail as string ?? "",
      }).catch(() => {});

      if (webhookUrl) {
        this._fireWebhook(webhookUrl, { jobId: job.jobId, status: "failed", error: lastError }).catch(console.error);
      }

      console.error(`[OrchestrationEngine] job=${job.jobId} FAILED after ${attempt} attempts`);
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // cancelJob
  // ---------------------------------------------------------------------------
  async cancelJob(jobId: string, cancelledBy: string): Promise<boolean> {
    try {
      await JobStateMachine.transition(jobId, "cancelled");
    } catch {
      return false;
    }

    await this._updateJobInPg(jobId, { status: "cancelled", completedAt: new Date() });
    await this.logger.jobCancelled(jobId, cancelledBy);
    await EventBus.publish(EVENTS.JOB_CANCELLED as any, { jobId, cancelledBy }, { jobId });
    return true;
  }

  // ---------------------------------------------------------------------------
  // getJobStatus
  // ---------------------------------------------------------------------------
  async getJobStatus(jobId: string): Promise<JobStatusResult | null> {
    const status = await JobStateMachine.getState(jobId);
    if (!status) return null;

    const result: JobStatusResult = { jobId, status };

    if (_pgAvailable) {
      try {
        const rows = await db.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1);
        const row = rows[0];
        if (row) {
          result.provider = row.provider ?? undefined;
          result.outputPayload = row.outputPayload as Record<string, unknown> | undefined;
          result.errorMessage = row.errorMessage ?? undefined;
          result.queuedAt = row.queuedAt ?? undefined;
          result.dispatchedAt = row.dispatchedAt ?? undefined;
          result.completedAt = row.completedAt ?? undefined;
          result.retryCount = row.retryCount ?? undefined;
          result.estimatedCostCents = row.estimatedCostCents ?? undefined;
          result.actualCostCents = row.actualCostCents ?? undefined;
        }
      } catch { /* non-critical */ }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Admin helpers
  // ---------------------------------------------------------------------------
  async getQueueDepths(): Promise<Record<QueueTier, number>> {
    const depths = await JobQueue.depths();
    return depths as Record<QueueTier, number>;
  }

  async getActiveJobCount(): Promise<number> {
    return JobQueue.totalDepth();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _tierToPriority(tier: QueueTier): number {
    const map: Record<QueueTier, number> = { elite: 1, premium: 2, starter: 3, free: 4 };
    return map[tier] ?? 5;
  }

  private _getFailoverChain(jobType: JobType, primary: string): string[] {
    const chain = [primary];
    const ALL_FALLBACKS: Partial<Record<JobType, string[]>> = {
      video:        ["fal-ai", "fal-ai-hailuo", "modal", "vast-ai"],
      song:         ["sunor_cc"],
      voice_clone:  ["elevenlabs"],
      narration:    ["elevenlabs", "openai"],
      analysis:     ["openai"],
      lyrics:       ["openai"],
      image:        ["fal-ai", "modal", "vast-ai"],
      visualization: ["fal-ai", "modal"],
      storyboard:   ["openai"],
      sophia_intro: ["openai", "elevenlabs"], // script=openai, audio=elevenlabs (handled internally)
    };
    const fallbacks = ALL_FALLBACKS[jobType] ?? ["openai"];
    for (const f of fallbacks) {
      if (!chain.includes(f)) chain.push(f);
    }
    return chain;
  }

  private async _updateJobInPg(jobId: string, patch: Partial<{
    status: string;
    provider: string;
    outputPayload: Record<string, unknown>;
    errorMessage: string;
    retryCount: number;
    completedAt: Date;
    durationSeconds: number;
    actualCostCents: number;
  }>): Promise<void> {
    if (!_pgAvailable) return;
    try {
      await db.update(aiJobs)
        .set({
          ...(patch.status        !== undefined && { status: patch.status }),
          ...(patch.provider      !== undefined && { provider: patch.provider }),
          ...(patch.outputPayload !== undefined && { outputPayload: patch.outputPayload }),
          ...(patch.errorMessage  !== undefined && { errorMessage: patch.errorMessage }),
          ...(patch.retryCount    !== undefined && { retryCount: patch.retryCount }),
          ...(patch.completedAt   !== undefined && { completedAt: patch.completedAt }),
          ...(patch.durationSeconds !== undefined && { durationSeconds: patch.durationSeconds }),
          ...(patch.actualCostCents !== undefined && { actualCostCents: patch.actualCostCents }),
        })
        .where(eq(aiJobs.id, jobId));
    } catch (err) {
      const e = err as Error;
      if (e.message.includes("connect")) _pgAvailable = false;
    }
  }

  private async _fireWebhook(url: string, body: Record<string, unknown>): Promise<void> {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Ghaafeedi-Event": "job.update" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      console.error("[OrchestrationEngine] webhook failed:", (err as Error).message);
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
