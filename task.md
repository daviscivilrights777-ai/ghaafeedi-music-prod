# ACPI Implementation — Task Tracker
Updated: 2026-06-19

## Status
- [x] Phase 7 — Story Bible + Production Bible (COMPLETE, commit 33a2cca)
- [ ] Phase 8 — Clip Batch (IN PROGRESS)
- [ ] Phase 9 — Edit Assembly + QC
- [ ] Phase 10 — Delivery + Style Memory

## Phase 8 TODO
- [ ] Extend FAL.ai adapter for clip_batch job dispatch (Kling + Hailuo models)
- [ ] Handle parallel clip_batch jobs (PipelineOrchestrator.allClipsComplete check)
- [ ] Update orchestration-engine.ts: when ALL clip_batch jobs for a pipelineRunId complete → dispatch edit_assemble
- [ ] Write OpenAI story_bible handler in engine (short-circuit like sophia_intro)
- [ ] Write OpenAI production_bible handler in engine (Claude if ANTHROPIC_API_KEY, else GPT-4o)
- [ ] Write OpenAI shot_list handler in engine (Claude if ANTHROPIC_API_KEY, else GPT-4o)

## Phase 9 TODO
- [ ] packages/web/src/api/orchestration/adapters/ffmpeg-modal.adapter.ts
- [ ] OpenAI adapter: add qc_check job type handling
- [ ] Activate quality_review in engine (3rd QC fail → quality_review)
- [ ] Register ffmpeg-modal adapter in adapters/index.ts

## Phase 10 TODO
- [ ] R2 upload helper in engine (deliver job type)
- [ ] pgvector style_embeddings table + migration 008
- [ ] Signed URLs (48h expiry)
- [ ] Enhance n8n workflow 3 with delivery URL

## Key Decisions
- No Temporal/Kafka/K8s — PG+Redis job chaining
- Claude 3.5 Sonnet for production_bible + shot_list (GPT-4o fallback)
- Social Ready Clips skips pipeline — direct video job
- maxShots: Starter=1, Premium=3, Elite=6
- QC max retries = 2, then quality_review (admin)
- FFmpeg via Modal GPU (ghaafeedi_assemble.py)
- Delivery via R2, signed URLs 48h

## Environment
- Dev: tmux `dev`, port 4200
- API: port 3000 (HMR via vite dev server)
- DB: Railway PG live
- Git HEAD: 33a2cca

## Pipeline Columns (migration 007 — LIVE on Railway PG)
ai_jobs: parent_job_id, pipeline_run_id, pipeline_stage, stage_outputs (JSONB)
Indexes: idx_ai_jobs_pipeline_run_id, idx_ai_jobs_pipeline_stage, idx_ai_jobs_parent_job_id
