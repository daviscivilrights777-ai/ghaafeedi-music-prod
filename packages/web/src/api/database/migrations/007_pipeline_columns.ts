// ============================================================
// Migration 007 — Pipeline columns on ai_jobs
// Adds: parent_job_id, pipeline_run_id, pipeline_stage,
//       stage_outputs (JSONB)
// Run via: bun run db:migrate (or directly with drizzle-kit)
// ============================================================
import { db } from "../pg-client";
import { sql } from "drizzle-orm";

export async function up() {
  console.log("[migration:007] Adding pipeline columns to ai_jobs...");

  // parent_job_id — foreign key to self (nullable, no FK constraint to avoid cycle issues)
  await db.execute(sql`
    ALTER TABLE ai_jobs
    ADD COLUMN IF NOT EXISTS parent_job_id text,
    ADD COLUMN IF NOT EXISTS pipeline_run_id text,
    ADD COLUMN IF NOT EXISTS pipeline_stage text,
    ADD COLUMN IF NOT EXISTS stage_outputs jsonb;
  `);

  // Index for fast pipeline run lookups
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_pipeline_run_id
    ON ai_jobs (pipeline_run_id)
    WHERE pipeline_run_id IS NOT NULL;
  `);

  // Index for stage queries
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_pipeline_stage
    ON ai_jobs (pipeline_stage, status)
    WHERE pipeline_stage IS NOT NULL;
  `);

  // Index for parent job lookups (child jobs)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_parent_job_id
    ON ai_jobs (parent_job_id)
    WHERE parent_job_id IS NOT NULL;
  `);

  console.log("[migration:007] Done.");
}

export async function down() {
  console.log("[migration:007] Rolling back pipeline columns...");
  await db.execute(sql`
    DROP INDEX IF EXISTS idx_ai_jobs_pipeline_run_id;
    DROP INDEX IF EXISTS idx_ai_jobs_pipeline_stage;
    DROP INDEX IF EXISTS idx_ai_jobs_parent_job_id;
    ALTER TABLE ai_jobs
    DROP COLUMN IF EXISTS parent_job_id,
    DROP COLUMN IF EXISTS pipeline_run_id,
    DROP COLUMN IF EXISTS pipeline_stage,
    DROP COLUMN IF EXISTS stage_outputs;
  `);
  console.log("[migration:007] Rollback done.");
}
