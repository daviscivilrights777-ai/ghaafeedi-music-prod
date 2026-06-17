import { db } from "./src/api/database/pg-client";
const pool = (db as any).$client;

await pool.query(`
  CREATE TABLE IF NOT EXISTS webhook_events (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source          TEXT NOT NULL,                        -- e.g. 'n8n', 'stripe', 'whop'
    event_type      TEXT NOT NULL,                        -- e.g. 'order.completed', 'job.failed'
    payload         JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'received',     -- received | processed | failed | ignored
    error           TEXT,
    related_order   TEXT REFERENCES orders(id) ON DELETE SET NULL,
    related_job     TEXT REFERENCES ai_jobs(id) ON DELETE SET NULL,
    related_user    TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_webhook_events_source      ON webhook_events(source);
  CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type  ON webhook_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_webhook_events_status      ON webhook_events(status);
  CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at  ON webhook_events(created_at DESC);
`);
console.log("✅ webhook_events created");

await pool.query(`
  CREATE TABLE IF NOT EXISTS automation_runs (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workflow_id      TEXT NOT NULL,                       -- n8n workflow ID
    workflow_name    TEXT,                                -- human-readable name
    execution_id     TEXT,                                -- n8n execution ID
    trigger_type     TEXT NOT NULL,                       -- 'order' | 'job' | 'user' | 'scheduled' | 'manual'
    trigger_ref      TEXT,                                -- order_id / job_id / user_id that triggered it
    status           TEXT NOT NULL DEFAULT 'running',     -- running | success | failed | timeout
    steps_completed  INTEGER DEFAULT 0,
    steps_total      INTEGER DEFAULT 0,
    result           JSONB,
    error            TEXT,
    duration_ms      INTEGER,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_automation_runs_workflow_id  ON automation_runs(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_automation_runs_trigger_ref  ON automation_runs(trigger_ref);
  CREATE INDEX IF NOT EXISTS idx_automation_runs_status       ON automation_runs(status);
  CREATE INDEX IF NOT EXISTS idx_automation_runs_started_at   ON automation_runs(started_at DESC);
`);
console.log("✅ automation_runs created");

await pool.end();
console.log("Done. 23 tables total.");
