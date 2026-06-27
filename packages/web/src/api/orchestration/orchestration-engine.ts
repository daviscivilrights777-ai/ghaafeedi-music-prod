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
import { aiJobs, user as userTable } from "../database/pg-schema";
import { eq, sql } from "drizzle-orm";
import type { QueueTier } from "./redis-client";
import { n8nDispatcher } from "./n8n-dispatcher";
import { PipelineOrchestrator, type PipelineStage } from "./pipeline-orchestrator";
import type { StoryBible } from "./schemas/story-bible.schema";
import type { ProductionBible } from "./schemas/production-bible.schema";
import type { ShotList } from "./schemas/shot-list.schema";
import type { ProductionTier } from "./schemas/production-bible.schema";
import { deliverProduction, saveStyleEmbedding } from "./delivery";
import { sendLipSyncCompleteEmail, sendLipSyncFailedEmail } from "../lib/lipsync-email";

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
  lip_sync:     120, // FAL.ai LatentSync per clip (~$1.20 est.)
  cinematic_video: 2500, // packages/cinematic full production — GPU + GPT-4o (~$25 est.)
  // ── Pipeline stage job costs ─────────────────────────────
  story_bible:      3,   // GPT-4o-mini extraction ~3¢
  production_bible: 10,  // Claude/GPT-4o creative brief ~10¢
  shot_list:        8,   // Claude/GPT-4o shot breakdown ~8¢
  clip_batch:       40,  // Poyo.ai Seedance 2 per clip ~$0.40 (5s @ 1080p)
  edit_assemble:    50,  // Modal FFmpeg GPU assembly ~50¢
  qc_check:         5,   // OpenAI vision QC ~5¢
  deliver:          1,   // R2 upload + URL signing ~1¢
  // Line 2 — AI Song + Music Video
  ltx_retake:       40,  // LTX Studio ~$0.10/sec × avg 4s clip = ~40¢
  // ── Poyo.ai full music production stack ─────────────────────────────────
  music_video:        2,  // Poyo.ai MV @ $0.02/video (Seedance 2 Mini)
  song_extension:    10,  // Poyo.ai extend track @ $0.10
  vocal_removal:     10,  // Poyo.ai vocal remover @ $0.10
  stem_separation:   10,  // Poyo.ai stems @ $0.10 (alias)
  cover_generation:  10,  // Poyo.ai cover/style transfer @ $0.10
  vocal_add:         10,  // Poyo.ai add vocals @ $0.10
  style_boost:       10,  // Poyo.ai style boost @ $0.10
  section_replace:   10,  // Poyo.ai replace section @ $0.10
  album_art:         10,  // Poyo.ai album art @ $0.10
  timestamped_lyrics: 0,  // Poyo.ai timestamped lyrics — free
  wav_export:         0,  // Poyo.ai WAV conversion — free
  add_instrumental:   10,  // Poyo.ai add instrumental @ $0.10
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
  lip_sync:     2900, // $29 customer charge
  cinematic_video: 19900, // $199 customer charge (Premium tier baseline)
  // ── Pipeline stage values ─────────────────────────────────
  story_bible:      100,  // part of production value
  production_bible: 200,
  shot_list:        150,
  clip_batch:       500,  // per clip value toward delivery
  edit_assemble:    1000, // final assembled video is high value
  qc_check:         50,
  deliver:          200,
  // Line 2 — AI Song + Music Video
  ltx_retake:       1500, // revision round value ($15 est. per retake)
  // ── Poyo.ai full music production stack ─────────────────────────────────
  music_video:        500,  // MV deliverable — Social Ready Clips / Emotional Soundtrack visual
  song_extension:     400,  // extended track add-on value
  vocal_removal:      300,  // instrumental stem — karaoke / re-mix add-on value
  stem_separation:    300,  // stems add-on (alias)
  cover_generation:   400,  // AI cover deliverable — Relationship Healing product
  vocal_add:          400,  // vocals layer add-on
  style_boost:        200,  // quality refinement pass value
  section_replace:    300,  // surgical revision — replaces full regen retries
  album_art:          500,  // AI artwork deliverable (included in Signature Masterpiece)
  timestamped_lyrics: 100,  // sync-ready lyrics for video layers
  wav_export:         150,  // lossless audio deliverable
  add_instrumental:   300,  // instrumental add-on layer deliverable
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

    // ── Pipeline stage short-circuits ─────────────────────────────────────────
    // story_bible, production_bible, shot_list, qc_check, deliver run through
    // the OpenAI adapter synchronously. We handle them here to piggyback on
    // the pipeline advancement logic in the success path.
    const PIPELINE_STAGES = new Set(["story_bible", "production_bible", "shot_list", "qc_check", "deliver"]);
    if (PIPELINE_STAGES.has(job.jobType)) {
      const openaiAdapter = ProviderRegistry.get("openai");
      if (!openaiAdapter) {
        await JobStateMachine.transition(job.jobId, "failed", { errorMessage: "OpenAI adapter not found" });
        return true;
      }

      try {
        await JobStateMachine.transition(job.jobId, "processing", { provider: "openai" }).catch(() => {});
        const handle    = await openaiAdapter.dispatch(job);
        const result    = await openaiAdapter.getStatus(handle);

        if (result.status !== "complete") {
          throw new Error(result.errorMessage ?? `${job.jobType} stage failed`);
        }

        // Parse the JSON output from the stage
        let stageOutput: Record<string, unknown> = {};
        const content = result.metadata?.content as string || handle.webhookUrl || "";
        try {
          stageOutput = content ? JSON.parse(content) : result.metadata ?? {};
        } catch {
          stageOutput = result.metadata ?? {};
        }

        // For qc_check: check if QC passed
        if (job.jobType === "qc_check") {
          const qcResult = stageOutput as { passed?: boolean; score?: number; issues?: string[]; recommendation?: string };
          if (!qcResult.passed && (qcResult.score ?? 0) < 0.7) {
            const qcReason = `QC failed (score: ${qcResult.score?.toFixed(2) ?? "N/A"}): ${qcResult.issues?.join(", ") ?? "Unknown issues"}`;
            const pipeOrch = PipelineOrchestrator.getInstance();
            const retryCount = job.metadata?.qcRetryCount as number ?? 0;
            const action = await pipeOrch.handleQcFailed({
              jobId:         job.jobId,
              pipelineRunId: job.pipelineRunId ?? (job.metadata?.pipelineRunId as string) ?? "",
              productionId:  job.productionId ?? "",
              userId:        job.userId,
              retryCount,
              qcReason,
            });
            if (action === "quality_review") {
              await this._updateJobInPg(job.jobId, { status: "quality_review", errorMessage: qcReason, completedAt: new Date() });
            }
            console.warn(`[OrchestrationEngine] qc_check job=${job.jobId} FAILED — action=${action}`);
            return true;
          }
        }

        // For deliver: trigger R2 signed URL + n8n notification
        if (job.jobType === "deliver") {
          const r2Key = (stageOutput.r2Key as string)
            || (job.inputPayload?.r2Key as string)
            || (job.inputPayload?.outputKey as string)
            || `productions/${job.productionId ?? "unknown"}/${job.pipelineRunId ?? "pipe"}/final.mp4`;
          try {
            const delivResult = await deliverProduction({
              productionId:  job.productionId ?? "",
              userId:        job.userId,
              orderId:       job.orderId,
              pipelineRunId: job.pipelineRunId ?? (job.metadata?.pipelineRunId as string) ?? "",
              r2Key,
              productSlug:   (job.metadata?.productSlug as string) ?? "",
              customerEmail: job.inputPayload?.customerEmail as string | undefined,
              customerName:  job.inputPayload?.customerName  as string | undefined,
            });
            Object.assign(stageOutput, delivResult);
          } catch (delivErr) {
            console.warn("[OrchestrationEngine] deliverProduction failed:", (delivErr as Error).message);
          }

          // Save style genome to pgvector (best-effort)
          const storyBible = job.metadata?.storyBible as Record<string, unknown> | undefined;
          if (storyBible) {
            saveStyleEmbedding({
              productionId: job.productionId ?? "",
              userId:       job.userId,
              genome: {
                productionId:   job.productionId,
                userId:         job.userId,
                primaryEmotion: storyBible.primaryEmotion as string,
                emotionVector:  [], // built inside saveStyleEmbedding from scores
              },
              qualityScore: 0.85,
            }).catch(() => {}); // fire-and-forget
          }
        }

        // Merge orchestration metadata back into stage output
        const outputPayload: Record<string, unknown> = {
          ...stageOutput,
          productionId:   job.productionId,
          productSlug:    job.metadata?.productSlug,
          pipelineRunId:  job.pipelineRunId ?? job.metadata?.pipelineRunId,
          productionTier: job.metadata?.productionTier,
          storyBible:     job.metadata?.storyBible ?? stageOutput,       // carry forward
          productionBible: job.metadata?.productionBible ?? (job.jobType === "production_bible" ? stageOutput : undefined),
        };

        // Transition to complete
        await JobStateMachine.transition(job.jobId, "complete", {
          provider: "openai",
          outputPayload,
          actualCostCents: JOB_TYPE_COST_CENTS[job.jobType],
        });

        await this._updateJobInPg(job.jobId, {
          status:           "complete",
          outputPayload,
          actualCostCents:  JOB_TYPE_COST_CENTS[job.jobType],
          retryCount:       0,
          completedAt:      new Date(),
          durationSeconds:  Math.round((Date.now() - startMs) / 1000),
        });

        // Update stage_outputs column directly via raw sql
        if (_pgAvailable) {
          try {
            await db.execute(sql`
              UPDATE ai_jobs SET stage_outputs = ${JSON.stringify(stageOutput)}::jsonb
              WHERE id = ${job.jobId}
            `);
          } catch { /* non-critical */ }
        }

        await this.logger.jobCompleted(job.jobId, "openai", Date.now() - startMs, JOB_TYPE_COST_CENTS[job.jobType] / 100);

        await EventBus.publish(EVENTS.JOB_COMPLETE as any, {
          jobId: job.jobId, userId: job.userId, provider: "openai", outputPayload,
        }, { jobId: job.jobId });

        // ── Pipeline stage advancement ──────────────────────────────────────
        const pipelineRunId  = job.pipelineRunId  ?? (job.metadata?.pipelineRunId  as string | undefined);
        const pipelineStage  = job.pipelineStage  ?? (job.metadata?.pipelineStage  as string | undefined);
        const productSlug    = (job.metadata?.productSlug as string | undefined)    ?? "";
        const productionTier = (job.metadata?.productionTier as ProductionTier | undefined) ?? "starter";

        if (pipelineRunId && pipelineStage) {
          await db.execute(sql`UPDATE ai_jobs SET stage_outputs = ${JSON.stringify(stageOutput)}::jsonb WHERE id = ${job.jobId}`).catch(() => {});
          const pipelineOrchestrator = PipelineOrchestrator.getInstance();
          await pipelineOrchestrator.advanceStage({
            completedJobId: job.jobId,
            completedStage: pipelineStage as PipelineStage,
            pipelineRunId,
            productionId:   job.productionId ?? "",
            userId:         job.userId,
            orderId:        job.orderId,
            productSlug,
            tier:           productionTier,
            queueTier:      job.tier,
            stageOutput:    outputPayload,
            metadata:       job.metadata as Record<string, unknown>,
          });
        }
        // ───────────────────────────────────────────────────────────────────

        console.log(`[OrchestrationEngine] ${job.jobType} job=${job.jobId} COMPLETE in ${Date.now() - startMs}ms`);
      } catch (err) {
        const errMsg = (err as Error).message;
        await JobStateMachine.transition(job.jobId, "failed", { errorMessage: errMsg });
        await this._updateJobInPg(job.jobId, { status: "failed", errorMessage: errMsg, retryCount: 1, completedAt: new Date() });
        await this.logger.jobFailed(job.jobId, "openai", errMsg, 1);
        console.error(`[OrchestrationEngine] ${job.jobType} job=${job.jobId} FAILED:`, errMsg);
      }
      return true;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── cinematic_video short-circuit ────────────────────────────────────────
    // Calls the Python AIDirector via execFile to produce a full shot plan.
    // The shot plan is stored as outputPayload and the job completes.
    if (job.jobType === "cinematic_video") {
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const path = await import("node:path");
      const execFileAsync = promisify(execFile);

      const cinemaPath = path.resolve((process as any).cwd?.() ?? __dirname, "../../packages/cinematic");

      const runnerScript = `
import sys, os, json
sys.path.insert(0, '${cinemaPath}')
os.chdir('${cinemaPath}')
from dotenv import load_dotenv
load_dotenv('${cinemaPath}/.env')

from config import GhaafeediSettings, CustomerInput, EmotionalTone, VideoStyle
from agents.director import AIDirector

body = json.loads(sys.argv[1])

def to_emotion(s):
    try:
        return EmotionalTone(s.upper())
    except Exception:
        return EmotionalTone.HOPE

def to_style(s):
    try:
        return VideoStyle(s.upper())
    except Exception:
        return VideoStyle.WARM_GOLDEN

inp = CustomerInput(
    customer_id=body.get('customer_id', 'orchestration'),
    customer_story=body['customer_story'],
    primary_emotion=to_emotion(body.get('primary_emotion', 'hope')),
    secondary_emotions=[to_emotion(e) for e in body.get('secondary_emotions', [])],
    emotional_arc=body.get('emotional_arc', []),
    lyrics=body.get('lyrics', ''),
    song_file_url=body.get('song_file_url', ''),
    song_duration_seconds=float(body.get('song_duration_seconds', 180)),
    song_bpm=body.get('song_bpm'),
    song_genre=body.get('song_genre', 'pop'),
    video_script=body.get('video_script', ''),
    preferred_style=to_style(body.get('preferred_style', 'warm_golden')),
    emotional_analysis=body.get('emotional_analysis', {}),
)

settings = GhaafeediSettings()
director = AIDirector(settings)
plan = director.create_shot_plan(inp, precomputed_music_analysis=body.get('precomputed_music_analysis'))

out = {
    'order_id': plan.order_id,
    'title': plan.title,
    'total_shots': plan.total_shots,
    'total_duration_seconds': plan.total_duration_seconds,
    'visual_style': str(plan.visual_style),
    'color_palette': plan.color_palette,
    'song_bpm': plan.song_bpm,
    'beat_timestamps': plan.beat_timestamps,
    'section_markers': plan.section_markers,
    'shots': [
        {
            'shot_id': s.shot_id,
            'scene_number': s.scene_number,
            'shot_number': s.shot_number,
            'start_time_seconds': s.start_time_seconds,
            'duration_seconds': s.duration_seconds,
            'shot_type': str(s.shot_type),
            'camera_movement': str(s.camera_movement),
            'camera_angle': s.camera_angle,
            'lens_mm': s.lens_mm,
            'composition': s.composition,
            'focus_type': s.focus_type,
            'visual_prompt': s.visual_prompt,
            'negative_prompt': s.negative_prompt,
            'lighting_description': s.lighting_description,
            'color_temperature_kelvin': s.color_temperature_kelvin,
            'emotional_beat': s.emotional_beat,
            'narrative_purpose': s.narrative_purpose,
            'lyrics_section': s.lyrics_section,
            'transition_to_next': str(s.transition_to_next),
            'transition_duration_seconds': s.transition_duration_seconds,
            'music_timestamp_start': s.music_timestamp_start,
            'music_timestamp_end': s.music_timestamp_end,
            'beat_aligned': s.beat_aligned,
        }
        for s in plan.shots
    ],
}
print(json.dumps(out))
`;

      try {
        await JobStateMachine.transition(job.jobId, "processing", { provider: "openai" }).catch(() => {});

        const { stdout, stderr } = await execFileAsync(
          "python3",
          ["-c", runnerScript, JSON.stringify(job.inputPayload ?? {})],
          { timeout: 120_000, maxBuffer: 5 * 1024 * 1024, env: { ...process.env } }
        );

        if (stderr) console.warn("[OrchestrationEngine] director stderr:", stderr.slice(0, 300));

        const plan = JSON.parse(stdout.trim()) as Record<string, unknown>;
        const durationMs = Date.now() - startMs;

        await JobStateMachine.transition(job.jobId, "complete", {
          provider: "openai",
          outputPayload: plan,
          actualCostCents: JOB_TYPE_COST_CENTS.cinematic_video,
        });

        await this._updateJobInPg(job.jobId, {
          status: "complete",
          outputPayload: plan,
          actualCostCents: JOB_TYPE_COST_CENTS.cinematic_video,
          retryCount: 0,
          completedAt: new Date(),
          durationSeconds: Math.round(durationMs / 1000),
        });

        await this.billing.emit({
          userId:      job.userId,
          orderId:     job.orderId,
          jobId:       job.jobId,
          eventType:   "job_cost",
          amountCents: JOB_VALUE_CENTS.cinematic_video,
          provider:    "openai",
          meta:        { durationMs, totalShots: plan.total_shots },
        });

        await this.logger.jobCompleted(job.jobId, "openai", durationMs, JOB_TYPE_COST_CENTS.cinematic_video / 100);

        await EventBus.publish(EVENTS.JOB_COMPLETE as any, {
          jobId: job.jobId, userId: job.userId,
          provider: "openai", outputPayload: plan,
        }, { jobId: job.jobId });

        if (webhookUrl) {
          this._fireWebhook(webhookUrl, { jobId: job.jobId, status: "complete", outputPayload: plan }).catch(console.error);
        }

        console.log(`[OrchestrationEngine] ${job.jobType} job=${job.jobId} COMPLETE (${plan.total_shots} shots) in ${durationMs}ms`);

      } catch (err: unknown) {
        const errMsg = (err as Error).message ?? "Director agent error";
        console.error(`[OrchestrationEngine] ${job.jobType} job=${job.jobId} FAILED:`, errMsg);
        await JobStateMachine.transition(job.jobId, "failed", { errorMessage: errMsg });
        await this._updateJobInPg(job.jobId, {
          status: "failed", errorMessage: errMsg,
          retryCount: 1, completedAt: new Date(),
        });
        await this.logger.jobFailed(job.jobId, "openai", errMsg, 1);
      }

      return true;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── clip_batch all-complete check ─────────────────────────────────────────
    // After each clip_batch job completes, check if ALL clips for this pipeline
    // run are done → dispatch edit_assemble
    const _isClipBatch = job.jobType === "clip_batch";
    // (handled in the main success path below after adapter dispatch)
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

      // ── Pipeline stage advancement ─────────────────────────────────────────
      // If this job has a pipelineRunId + pipelineStage, advance to next stage
      const pipelineRunId  = job.pipelineRunId  ?? (job.metadata?.pipelineRunId  as string | undefined);
      const pipelineStage  = job.pipelineStage  ?? (job.metadata?.pipelineStage  as string | undefined);
      const productSlug    = (job.metadata?.productSlug as string | undefined)    ?? "";
      const productionTier = (job.metadata?.productionTier as ProductionTier | undefined) ?? "starter";

      if (pipelineRunId && pipelineStage) {
        // Persist stage outputs to PG for downstream stages to read
        if (_pgAvailable) {
          try {
            await db.update(aiJobs)
              .set({ stageOutputs: outputPayload } as any)
              .where(eq(aiJobs.id, job.jobId));
          } catch { /* non-critical */ }
        }

        // Transition parent job to pipeline stage state
        const stageStateMap: Partial<Record<string, Parameters<typeof JobStateMachine.transition>[1]>> = {
          story_bible:      "story_bible_ready",
          production_bible: "production_bible_ready",
          audio:            "audio_ready",
          shot_list:        "clips_generating",   // shot_list done → clips dispatched
          clip_batch:       "assembling",         // last clip done → assemble
          edit_assemble:    "quality_review",
          qc_check:         "delivery",
          deliver:          "complete",
        };
        const pipelineTransition = stageStateMap[pipelineStage];
        if (pipelineTransition && pipelineTransition !== "complete") {
          await JobStateMachine.transition(job.jobId, pipelineTransition, {
            provider: actualProvider,
            outputPayload,
          }).catch((e) => console.warn("[OrchestrationEngine] pipeline transition:", (e as Error).message));
        }

        // ── clip_batch: only advance when ALL clips in this run are complete ──
        if (pipelineStage === "clip_batch" && _pgAvailable) {
          try {
            type ClipRow = { id: string; status: string };
            const clipRows = await db.execute<ClipRow>(
              sql`SELECT id, status FROM ai_jobs WHERE pipeline_run_id = ${pipelineRunId} AND pipeline_stage = 'clip_batch'`
            );
            const clips = Array.isArray(clipRows) ? clipRows : (clipRows as any).rows ?? [];
            const allDone = clips.every((r: ClipRow) => r.status === "complete");
            const anyFailed = clips.some((r: ClipRow) => r.status === "failed");

            if (!allDone) {
              console.log(`[OrchestrationEngine] clip_batch job=${job.jobId} complete — ${clips.filter((r: ClipRow) => r.status === "complete").length}/${clips.length} clips done`);
              return true; // More clips pending — don't advance yet
            }
            if (anyFailed) {
              console.warn(`[OrchestrationEngine] clip_batch: some clips failed for run=${pipelineRunId}`);
              // Still advance with completed clips — edit_assemble handles partial
            }
          } catch (checkErr) {
            console.warn("[OrchestrationEngine] clip_batch all-complete check failed:", (checkErr as Error).message);
            return true; // Fail safe — don't advance
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Dispatch next pipeline stage
        try {
          const pipelineOrchestrator = PipelineOrchestrator.getInstance();
          await pipelineOrchestrator.advanceStage({
            completedJobId: job.jobId,
            completedStage: pipelineStage as PipelineStage,
            pipelineRunId,
            productionId:   job.productionId ?? "",
            userId:         job.userId,
            orderId:        job.orderId,
            productSlug,
            tier:           productionTier,
            queueTier:      job.tier,
            stageOutput:    outputPayload,
            metadata:       job.metadata as Record<string, unknown>,
          });
        } catch (pipeErr) {
          console.error("[OrchestrationEngine] pipeline advance failed:", (pipeErr as Error).message);
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      // Automation 3: notify n8n → customer delivery email
      n8nDispatcher.jobComplete({
        jobId:         job.jobId,
        userId:        job.userId,
        jobType:       job.jobType,
        productName:   (job as any).productType ?? job.jobType,
        deliveryUrl:   (outputPayload?.url ?? outputPayload?.audioUrl ?? outputPayload?.videoUrl) as string | undefined,
        customerEmail: job.inputPayload?.customerEmail as string ?? "",
        customerName:  job.inputPayload?.customerName as string ?? "",
      }).catch(() => {});

      if (webhookUrl) {
        this._fireWebhook(webhookUrl, { jobId: job.jobId, status: "complete", outputPayload }).catch(console.error);
      }

      // ── Phase 8: Lip Sync completion email ───────────────────────────────────
      if (job.jobType === "lip_sync") {
        (async () => {
          try {
            const inp = job.inputPayload as Record<string, unknown>;
            const out = (outputPayload ?? {}) as Record<string, unknown>;
            let memberEmail = (inp?.customerEmail ?? inp?.email ?? "") as string;
            let memberName  = (inp?.customerName  ?? inp?.name  ?? "Member") as string;
            // Fallback: look up user email from DB if not in payload
            if (!memberEmail && job.userId) {
              const [row] = await db.select({ email: userTable.email, name: userTable.name })
                .from(userTable).where(eq(userTable.id, job.userId)).limit(1);
              if (row) { memberEmail = row.email; memberName = row.name ?? "Member"; }
            }
            if (memberEmail) {
              await sendLipSyncCompleteEmail({
                to:               memberEmail,
                memberName,
                jobId:            job.jobId,
                orderId:          job.orderId,
                productionTitle:  (inp?.productionTitle ?? inp?.title ?? "") as string | undefined,
                outputUrl:        (out.outputUrl ?? out.output_url ?? out.r2Url ?? out.r2_url ?? "") as string | undefined,
                isEliteFree:      !!(inp?.isEliteFree),
              });
            }
          } catch (e) {
            console.warn("[OrchestrationEngine] lip_sync complete email failed:", (e as Error).message);
          }
        })();
      }
      // ─────────────────────────────────────────────────────────────────────────

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
        maxAttempts: job.maxAttempts ?? 3,
        error:       lastError,
        willRetry:   attempt < (job.maxAttempts ?? 3),
        customerEmail: job.inputPayload?.customerEmail as string ?? "",
      }).catch(() => {});

      if (webhookUrl) {
        this._fireWebhook(webhookUrl, { jobId: job.jobId, status: "failed", error: lastError }).catch(console.error);
      }

      // ── Phase 8: Lip Sync failure email ──────────────────────────────────────
      if (job.jobType === "lip_sync") {
        (async () => {
          try {
            const inp = job.inputPayload as Record<string, unknown>;
            let memberEmail = (inp?.customerEmail ?? inp?.email ?? "") as string;
            let memberName  = (inp?.customerName  ?? inp?.name  ?? "Member") as string;
            // Fallback: look up user email from DB if not in payload
            if (!memberEmail && job.userId) {
              const [row] = await db.select({ email: userTable.email, name: userTable.name })
                .from(userTable).where(eq(userTable.id, job.userId)).limit(1);
              if (row) { memberEmail = row.email; memberName = row.name ?? "Member"; }
            }
            if (memberEmail) {
              await sendLipSyncFailedEmail({
                to:              memberEmail,
                memberName,
                jobId:           job.jobId,
                orderId:         job.orderId,
                productionTitle: (inp?.productionTitle ?? inp?.title ?? "") as string | undefined,
                errorMessage:    lastError,
              });
            }
          } catch (e) {
            console.warn("[OrchestrationEngine] lip_sync failed email error:", (e as Error).message);
          }
        })();
      }
      // ─────────────────────────────────────────────────────────────────────────

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
      video:        ["poyo", "fal-ai", "fal-ai-hailuo", "modal", "vast-ai"],
      song:         ["poyo"],
      music_video:  ["poyo"],
      song_extension:     ["poyo"],
      vocal_removal:      ["poyo"],
      stem_separation:    ["poyo"],
      cover_generation:   ["poyo"],
      vocal_add:          ["poyo"],
      style_boost:        ["poyo"],
      section_replace:    ["poyo"],
      album_art:          ["poyo"],
      timestamped_lyrics: ["poyo"],
      wav_export:         ["poyo"],
      add_instrumental:   ["poyo"],
      voice_clone:  ["elevenlabs"],
      narration:    ["elevenlabs", "openai"],
      analysis:     ["openai"],
      lyrics:       ["openai"],
      image:        ["fal-ai", "modal", "vast-ai"],
      visualization: ["poyo", "fal-ai", "modal"],
      storyboard:   ["openai"],
      sophia_intro: ["openai", "elevenlabs"],
      lip_sync:     ["latentsync", "fal_ai_kling"],
      cinematic_video: ["cinematic-microservice", "fal-ai", "modal", "vast-ai"],
      // ── Pipeline stage fallbacks ──────────────────────────
      story_bible:      ["openai"],
      production_bible: ["openai"],   // Claude primary, GPT-4o fallback
      shot_list:        ["openai"],
      clip_batch:       ["poyo", "fal-ai", "modal", "vast-ai"],
      edit_assemble:    ["modal_ffmpeg"],  // FFmpeg Modal only (Phase 9)
      qc_check:         ["openai"],
      deliver:          ["internal"], // R2 direct — no fallback needed
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
