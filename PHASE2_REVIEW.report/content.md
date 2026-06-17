# Ghaafeedi Music — Pre-Phase 2 Infrastructure Review
### Complete Provisioning, Deployment, Scalability, Security & Cost Analysis
**Prepared for:** Lawrence Davis, Founder  
**Date:** June 16, 2026  
**Classification:** Internal — Founder Eyes Only  
**Status:** Awaiting Approval Before Phase 2 Implementation Proceeds

---

## Executive Summary

Ghaafeedi Music's Phase 1 orchestration engine is architecturally sound. Before Phase 2 provider integrations begin, this review documents everything required to deploy, secure, and operate the platform at production scale. Nine domains are covered: PostgreSQL, Redis, Infisical, environment variables, schema review, provider roadmap, cost projections across four scaling scenarios, Android-first operations, and enterprise readiness.

**Key findings:**
- Infrastructure costs are $302/mo at launch, scaling to $36,330/mo at 100K users — well within gross margin tolerance (88–99% product margins)
- PostgreSQL on Railway covers 0–10K users; beyond that, a dedicated managed cluster (Supabase, Neon, or AWS RDS) is recommended
- Upstash Redis free tier covers launch; paid tier required above 1K active users
- FAL.ai and Suno dominate the cost structure — failover routing is the single most important cost-control mechanism
- Infisical Cloud (Pro) is sufficient; self-hosted adds operational burden not warranted before 10K users
- Android-first admin is fully viable via Railway dashboard, Upstash console, Infisical mobile, and the custom Admin Panel built in Phase 1
- No single points of failure exist at launch if the retry/failover chains are wired correctly in Phase 2

---

## Key Findings

- **PostgreSQL:** Railway Hobby ($20–50/mo) for launch; migrate to dedicated instance at 5K+ users. PgBouncer required above 1K concurrent connections.
- **Redis:** Upstash free → Pay-as-You-Go → Fixed 1GB plan. Never self-host Redis; operational overhead not worth it at this scale.
- **Infisical:** Cloud Pro at $18/identity covers all needs. Three environments (dev/staging/prod) with strict RBAC. Self-hosted only warranted at enterprise compliance requirements.
- **AI Providers:** FAL.ai + Suno account for 65%+ of all variable costs. Cost-per-job optimization in the orchestration router is critical ROI.
- **Cost control levers:** Route to Modal/Vast.ai for overflow instead of scaling FAL.ai; use Suno API third-party resellers only for non-commercial test jobs.
- **Security posture:** Currently solid for launch. TLS everywhere, PCI DSS-compliant payment flow, CSRF protection, rate limiting, audit log chain. Gaps exist in secret rotation cadence and multi-region failover.

---

## 1. PostgreSQL Production Deployment

### Recommendation
**Use Railway PostgreSQL for launch through ~5,000 users, then migrate to Neon or Supabase for 5K–100K+.**

Railway PostgreSQL is fast to provision, cost-effective at small scale, and directly accessible from the same Railway project as the API server. For the orchestration engine, the critical requirement is low-latency reads on `ai_jobs` (polling), fast appends to `audit_logs`, and reliable writes to `billing_events`.

### Railway Deployment Plan

```
Step 1: Add PostgreSQL plugin to existing Railway project
Step 2: Set DATABASE_URL environment variable in Railway
Step 3: Run drizzle-kit push against Railway PG (not Turso)
Step 4: Seed routing_rules table with provider config
Step 5: Enable Railway automated backups (daily, 7-day retention)
Step 6: Set connection limit to 20 (Hobby plan cap)
```

**Railway plan sizing:**

| Scale          | Plan         | vCPU  | RAM   | Storage | Est. Cost |
|----------------|--------------|-------|-------|---------|-----------|
| 0–100 users    | Hobby        | 0.5   | 512MB | 1GB     | $15–20/mo |
| 100–1K users   | Pro (1x)     | 1     | 1GB   | 5GB     | $25–50/mo |
| 1K–5K users    | Pro (2x)     | 2     | 2GB   | 20GB    | $60–120/mo |
| 5K+ users      | Migrate out  | —     | —     | —       | See below |

### Database Sizing Recommendations

At 100K users with full job history:
- `ai_jobs` table: ~2.5M rows/year → ~4GB raw + indexes → ~10GB total
- `audit_logs`: append-only, ~5M rows/year → ~8GB
- `billing_events`: ~500K rows/year → ~1GB
- `provider_usage`: ~2.5M rows/year → ~3GB
- **Total year 1 at 100K:** ~30GB  
- **Recommendation:** Start with 5GB storage, monitor growth monthly, resize before 80% full

### Backup Strategy

| Level        | Method                        | Frequency  | Retention |
|--------------|-------------------------------|------------|-----------|
| L1 Daily     | Railway automated pg_dump     | Daily 2am  | 7 days    |
| L2 Weekly    | Manual pg_dump → S3/Backblaze | Sunday     | 12 weeks  |
| L3 Pre-migration | Full dump + schema        | On demand  | Forever   |
| L4 PITR      | Barman (Railway template)     | Continuous | 7 days    |

Railway provides a [PostgreSQL + Barman template](https://railway.com/deploy/postgresql-barman--1) for Point-in-Time Recovery. Deploy this alongside the main DB at the Pro tier.

**Restore procedure (in runbook):**
1. Stop worker processes (graceful shutdown via SIGTERM)
2. Run `pg_restore` from latest backup to Railway PG
3. Verify row counts on critical tables
4. Restart workers
5. Monitor `audit_logs` for missed events; replay from event bus if needed

### Disaster Recovery

| Scenario                   | RTO    | RPO    | Recovery Action                              |
|----------------------------|--------|--------|----------------------------------------------|
| Railway DB restart         | <2min  | 0      | Auto-reconnect in pg-client.ts               |
| Railway region outage      | 15min  | <1hr   | Restore from daily backup to Neon/Supabase   |
| Accidental table drop      | 30min  | <24hrs | Restore from PITR or most recent pg_dump     |
| Full data corruption       | 2hr    | <7days | Weekly S3 backup restore                     |
| Provider cost runaway      | <1min  | 0      | Circuit breaker in orchestration engine      |

### Security Configuration

```bash
# Railway environment hardening
SSL_MODE=require                   # Enforce TLS on all connections
PGSSLMODE=require
DATABASE_URL=postgresql://...?sslmode=require

# Application-level
- All queries use parameterized statements (Drizzle ORM — no raw string concat)
- Service account (api_user) has INSERT/UPDATE/SELECT only — no DROP/ALTER
- Admin queries use separate read-only role for analytics
- IP allowlist: Railway internal network only (no public PG endpoint exposure)
```

### Connection Pooling Strategy

Railway does **not** provide native PgBouncer. Deploy PgBouncer as a separate Railway service:

```
Architecture:
  API Server → PgBouncer (Railway) → PostgreSQL (Railway)
  
PgBouncer config (pgbouncer.ini):
  pool_mode = transaction          # Best for async Hono API
  max_client_conn = 500            # Matches expected concurrent API workers
  default_pool_size = 20           # Railway Hobby PG max_connections = 100
  reserve_pool_size = 5
  server_idle_timeout = 600
```

| User Scale    | Without PgBouncer  | With PgBouncer    |
|---------------|--------------------|-------------------|
| 100 users     | Fine (20 conns max)| Fine              |
| 1,000 users   | Connection errors  | Stable (pool 20)  |
| 10,000 users  | System crash       | Stable (pool 50)  |
| 100,000 users | System crash       | Needs cluster     |

### Scaling Path: 100 → 100,000+ Users

```
Phase A (0–1K users):     Single Railway PG instance, no replica needed
Phase B (1K–5K users):    Add PgBouncer, tune queries, add indexes
Phase C (5K–10K users):   Migrate to Neon or Supabase (built-in pooling, auto-scale)
Phase D (10K–50K users):  Read replica for analytics queries; primary for writes
Phase E (50K–100K users): PG partitioning on ai_jobs/audit_logs by month
Phase F (100K+ users):    Consider Citus (horizontal sharding) or PlanetScale Postgres
```

### Monitoring & Alerting

| Metric                  | Tool                  | Alert Threshold              |
|-------------------------|-----------------------|------------------------------|
| Connection count        | Railway metrics       | >80% of max_connections      |
| Query slow log          | pg_stat_statements    | >500ms average               |
| Disk usage              | Railway metrics       | >80% storage used            |
| Replication lag         | pg_stat_replication   | >30 seconds                  |
| Dead rows (bloat)       | pg_stat_user_tables   | >20% dead tuples             |
| Backup success          | Cron + alert email    | Failure = immediate alert    |

Recommended: **Betterstack** (free tier) for uptime monitoring + Railway metric alerts.

---

## 2. Redis Infrastructure Deployment (Upstash)

### Recommendation
**Upstash Redis Pay-as-You-Go for launch, upgrade to Fixed 1GB ($20/mo) at ~500 active users.**

Upstash is the correct choice for Ghaafeedi Music: serverless Redis with REST API (no persistent TCP connection required), global low latency, and pricing that scales from $0 to predictable fixed plans.

### Deployment Plan

```
Step 1:  Create Upstash account at upstash.com
Step 2:  Create Redis database → Region: us-east-1 (matches Railway)
Step 3:  Copy UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
Step 4:  Add to Railway environment variables
Step 5:  Enable Eviction Policy: allkeys-lru (prevents memory OOM)
Step 6:  Enable TLS (default on Upstash — verify)
Step 7:  Set max memory to 256MB initially (free tier)
```

### Queue Architecture

The job queue in `job-queue.ts` uses Redis Lists with one list per tier:

```
queue:jobs:elite    → LPUSH new jobs, RPOP to dequeue (FIFO within tier)
queue:jobs:premium  → same
queue:jobs:starter  → same
queue:jobs:free     → same

Processing order in worker.ts:
  1. RPOP queue:jobs:elite    (highest priority)
  2. RPOP queue:jobs:premium
  3. RPOP queue:jobs:starter
  4. RPOP queue:jobs:free     (lowest priority)
```

**Dead Letter Queue:**
```
queue:dlq:failed    → Jobs that exhausted all retries (3 attempts)
queue:dlq:review    → Jobs flagged for manual review
```

**Monitoring keys:**
```
gm:stats:queue:depth:{tier}    → INCR/DECR on enqueue/dequeue
gm:stats:jobs:processed:total  → running counter
gm:stats:jobs:failed:total     → failed job counter
gm:lock:job:{jobId}            → distributed lock (30s TTL, prevents double-process)
```

### Job Processing Architecture

```
Worker Loop (worker.ts):
  1. Acquire distributed lock: SET gm:lock:worker:{workerId} 1 NX EX 30
  2. Poll queues in priority order (100ms interval when idle, immediate on job)
  3. Fetch job metadata from PostgreSQL (ai_jobs table)
  4. Update state: pending → processing
  5. Execute provider adapter
  6. Update state: processing → completed/failed
  7. Release lock, emit billing event
  8. Repeat

Concurrency:
  - Launch: 2 workers
  - 1K users: 4 workers  
  - 10K users: 8 workers (scale horizontally on Railway)
  - 100K users: 20+ workers across multiple Railway instances
```

### Cache Architecture

```
gm:cache:member:{userId}         TTL: 300s   → Member profile + entitlements
gm:cache:product:{productId}     TTL: 3600s  → Product config (rarely changes)
gm:cache:routing:{productType}   TTL: 60s    → Active provider routing rules
gm:cache:rate:{userId}           TTL: 60s    → Rate limiting counter
gm:cache:session:{token}         TTL: 86400s → Auth session (if needed)
```

### Priority Queue System

| Tier      | Queue Key              | Max Wait Time | Worker Priority |
|-----------|------------------------|---------------|-----------------|
| Elite     | queue:jobs:elite       | <30 seconds   | 1st polled      |
| Premium   | queue:jobs:premium     | <2 minutes    | 2nd polled      |
| Starter   | queue:jobs:starter     | <10 minutes   | 3rd polled      |
| Free/Test | queue:jobs:free        | <30 minutes   | 4th polled      |

### Failover Strategy

Upstash provides built-in multi-region replication on Pro plans. For Pay-as-You-Go:
- Enable **Read Regions** in Upstash console (global replication, +$0.03/100K reads)
- Worker retry: if Redis REST API call fails, retry 3x with 500ms backoff before erroring
- Graceful degradation: if Redis is unreachable, new job submissions return 503 with retry-after header — do not drop jobs silently

### Scalability

| Users     | Commands/Day (est.) | Upstash Plan          | Cost     |
|-----------|--------------------|-----------------------|----------|
| 100       | ~50,000            | Free (10K/day ✗ → PAYG) | $0–$2   |
| 1,000     | ~500,000           | Pay-as-You-Go         | $1–5/mo  |
| 10,000    | ~5M                | Fixed 1GB             | $20/mo   |
| 100,000   | ~50M               | Fixed 5GB             | $100/mo  |

> **Note:** Free tier is 10,000 commands/day = 300,000/month. A single job submission touches ~8–12 Redis commands. At 100 users with moderate activity, PAYG is needed from day one.

### Monitoring

- **Upstash Console:** Built-in metrics (commands/sec, memory, hit rate)
- **Alert:** Set up email alert when daily commands exceed 80% of plan limit
- **Key metric:** Queue depth per tier — if elite queue depth > 10, scale workers
- **Betterstack:** Ping `PING` command to Redis every 60s for uptime monitoring

---

## 3. Infisical Secrets Vault Deployment

### Recommendation
**Use Infisical Cloud (Pro at $18/identity/mo) — NOT self-hosted at this stage.**

Self-hosting Infisical requires Docker/Kubernetes expertise, persistent volumes, separate PostgreSQL instance, and ongoing maintenance. The operational burden is not warranted until compliance requirements force it (SOC 2, HIPAA, etc.). Cloud Pro gives version history, audit logs, RBAC, and secret rotation — everything needed.

### Complete Implementation Plan

```
Step 1:  Create Infisical account at infisical.com
Step 2:  Create organization "Ghaafeedi Music"
Step 3:  Create three projects: ghaafeedi-dev, ghaafeedi-staging, ghaafeedi-prod
Step 4:  Per project, create environments: development, staging, production
Step 5:  Add all secrets (see Section 4) to appropriate environment
Step 6:  Generate Machine Identity tokens per environment
Step 7:  Store tokens only in Railway environment variables as INFISICAL_TOKEN
Step 8:  SDK reads all other secrets at runtime via getSecret()
```

### API Key Management Architecture

```
Machine Identities (service accounts):
  gm-api-prod       → Production API server (read-only, prod secrets)
  gm-worker-prod    → Worker process (read-only, prod secrets)
  gm-admin-prod     → Admin panel (read-only, prod secrets)
  gm-api-staging    → Staging API (read-only, staging secrets)
  gm-developer      → Local dev (read-only, dev secrets)
  gm-ci             → GitHub Actions (read-only, staging for tests)

Human accounts (limited):
  Lawrence Davis    → Owner (all projects, all environments)
  Support ops       → Read-only prod viewer (support secrets only)
```

### Secret Rotation Strategy

| Secret Type       | Rotation Cadence  | Method                              |
|-------------------|-------------------|-------------------------------------|
| OpenAI API key    | Every 90 days     | Infisical secret version + redeploy |
| FAL.ai key        | Every 90 days     | Same                                |
| Suno key          | Every 60 days     | Same                                |
| Database password | Every 6 months    | Railway PG reset + Infisical update |
| JWT secret        | Every 6 months    | Rolling key rotation (2-key window) |
| Stripe keys       | Annual            | Stripe dashboard rotation           |
| ElevenLabs key    | Every 90 days     | Same                                |

**Zero-downtime rotation process:**
1. Generate new key in provider dashboard
2. Update Infisical secret (new version created, old version retained for 24h)
3. Trigger Railway redeploy (workers restart, pick up new secret from Infisical)
4. Verify new key is active in audit logs
5. Revoke old key in provider dashboard after 24h

### Dev / Staging / Production Separation

```
ghaafeedi-dev (project):
  development env → all keys point to sandbox/test accounts
  Suno: test account (no commercial rights)
  FAL.ai: test API key with spending cap $50/mo
  OpenAI: test key, $20/mo cap
  DB: local SQLite / dev PG

ghaafeedi-staging (project):  
  staging env → real keys but test data only
  FAL.ai: staging key, $100/mo cap
  Suno: staging account
  DB: Railway staging PG (separate instance)

ghaafeedi-prod (project):
  production env → live keys, no spending cap override
  DB: Railway prod PG
  Stripe: live keys
  All provider: live keys
```

### Role-Based Access Controls

| Role            | Infisical Access              | Environments Visible          |
|-----------------|-------------------------------|-------------------------------|
| Owner (Lawrence)| Full admin all projects        | Dev, Staging, Prod            |
| API Server      | Machine identity, read-only   | Prod only                     |
| Worker          | Machine identity, read-only   | Prod only                     |
| Support Staff   | Human, read-only viewer        | Prod (support subset only)    |
| CI/CD           | Machine identity, read-only   | Staging only                  |
| Developer (you) | Machine identity, read-only   | Dev + Staging                 |

### Security Best Practices

- Never commit `.env` files to git — all secrets via Infisical SDK at runtime
- All Railway environment variables contain ONLY: `INFISICAL_TOKEN`, `NODE_ENV`, `PORT` — nothing else sensitive
- Enable Infisical audit logs — every secret read is logged with timestamp + identity
- Enable IP allowlisting in Infisical for production machine identities (Railway egress IPs)
- 2FA required on all human Infisical accounts

### Mobile Administration

Infisical has no official mobile app. Android admin workflow:
- Access `app.infisical.com` via Chrome mobile (responsive web app)
- Secret rotation can be triggered from mobile browser
- For emergencies: Infisical CLI can run from Termux (Android terminal) with `infisical secrets set KEY=VALUE`

---

## 4. Environment Variable Audit — Complete Inventory

All variables below must be provisioned before production deployment. Variables marked `[INFISICAL]` are stored in Infisical and fetched at runtime. Variables marked `[RAILWAY]` are stored directly in Railway (bootstrap secrets only).

### Database

| Variable              | Description                        | Where       |
|-----------------------|------------------------------------|-------------|
| `POSTGRES_URL`        | Railway PG connection string       | [RAILWAY]   |
| `POSTGRES_POOL_URL`   | PgBouncer connection string        | [RAILWAY]   |
| `DATABASE_URL`        | Turso URL (legacy, existing routes)| [RAILWAY]   |
| `DATABASE_AUTH_TOKEN` | Turso auth token (legacy)          | [RAILWAY]   |

### Redis (Upstash)

| Variable                      | Description                  | Where       |
|-------------------------------|------------------------------|-------------|
| `UPSTASH_REDIS_REST_URL`      | Upstash REST endpoint        | [RAILWAY]   |
| `UPSTASH_REDIS_REST_TOKEN`    | Upstash auth token           | [RAILWAY]   |

### Infisical

| Variable            | Description                   | Where       |
|---------------------|-------------------------------|-------------|
| `INFISICAL_TOKEN`   | Machine identity token        | [RAILWAY]   |
| `INFISICAL_ENV`     | "production" / "staging"      | [RAILWAY]   |
| `INFISICAL_PROJECT` | Infisical project ID          | [RAILWAY]   |

### AI Providers

| Variable                | Description                  | Where        |
|-------------------------|------------------------------|--------------|
| `OPENAI_API_KEY`        | OpenAI GPT-4o key            | [INFISICAL]  |
| `FAL_AI_API_KEY`        | FAL.ai primary key           | [INFISICAL]  |
| `FAL_AI_HAILUO_KEY`     | Hailuo-specific key (if sep.)| [INFISICAL]  |
| `SUNO_API_KEY`          | Suno/Sunor.cc API key        | [INFISICAL]  |
| `SUNO_API_BASE_URL`     | Suno API base URL            | [INFISICAL]  |
| `ELEVENLABS_API_KEY`    | ElevenLabs TTS/voice key     | [INFISICAL]  |
| `MODAL_TOKEN_ID`        | Modal API token ID           | [INFISICAL]  |
| `MODAL_TOKEN_SECRET`    | Modal API token secret       | [INFISICAL]  |
| `VAST_AI_API_KEY`       | Vast.ai GPU rental key       | [INFISICAL]  |

### Payments

| Variable                      | Description                  | Where        |
|-------------------------------|------------------------------|--------------|
| `STRIPE_SECRET_KEY`           | Stripe secret key            | [INFISICAL]  |
| `STRIPE_PUBLISHABLE_KEY`      | Stripe public key            | [INFISICAL]  |
| `STRIPE_WEBHOOK_SECRET`       | Stripe webhook signing secret| [INFISICAL]  |
| `DODO_PAYMENTS_API_KEY`       | Dodo Payments API key        | [INFISICAL]  |
| `DODO_PAYMENTS_WEBHOOK_SECRET`| Dodo webhook secret          | [INFISICAL]  |
| `AUTUMN_API_KEY`              | Autumn wraps Whop/Stripe     | [INFISICAL]  |
| `WHOP_API_KEY`                | Whop API key                 | [INFISICAL]  |

### Authentication

| Variable                 | Description                       | Where        |
|--------------------------|-----------------------------------|--------------|
| `BETTER_AUTH_SECRET`     | Better Auth JWT signing secret    | [INFISICAL]  |
| `BETTER_AUTH_URL`        | App base URL for auth             | [RAILWAY]    |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID            | [INFISICAL]  |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret        | [INFISICAL]  |

### Email

| Variable           | Description              | Where        |
|--------------------|--------------------------|--------------|
| `RESEND_API_KEY`   | Resend email API key     | [INFISICAL]  |
| `FROM_EMAIL`       | Sender email address     | [RAILWAY]    |
| `SUPPORT_EMAIL`    | Support inbox            | [RAILWAY]    |

### Storage

| Variable                      | Description                  | Where        |
|-------------------------------|------------------------------|--------------|
| `R2_ACCOUNT_ID`               | Cloudflare R2 account ID     | [INFISICAL]  |
| `R2_ACCESS_KEY_ID`            | R2 access key                | [INFISICAL]  |
| `R2_SECRET_ACCESS_KEY`        | R2 secret key                | [INFISICAL]  |
| `R2_BUCKET_NAME`              | Main R2 bucket               | [RAILWAY]    |
| `R2_PUBLIC_URL`               | R2 public CDN URL            | [RAILWAY]    |
| `BACKBLAZE_KEY_ID`            | Backblaze B2 for backups     | [INFISICAL]  |
| `BACKBLAZE_APP_KEY`           | Backblaze B2 app key         | [INFISICAL]  |

### Application

| Variable            | Description                    | Where       |
|---------------------|--------------------------------|-------------|
| `NODE_ENV`          | production / development       | [RAILWAY]   |
| `PORT`              | API port (default 3000)        | [RAILWAY]   |
| `APP_URL`           | Public app URL                 | [RAILWAY]   |
| `CORS_ORIGIN`       | Allowed CORS origins           | [RAILWAY]   |
| `RATE_LIMIT_MAX`    | Max requests per minute        | [RAILWAY]   |

### Monitoring (Future)

| Variable               | Description               | Where        |
|------------------------|---------------------------|--------------|
| `BETTERSTACK_TOKEN`    | Betterstack uptime token  | [INFISICAL]  |
| `SENTRY_DSN`           | Sentry error tracking     | [INFISICAL]  |
| `AXIOM_API_TOKEN`      | Axiom log drain token     | [INFISICAL]  |

**Total: 48 environment variables across 11 categories.**

---

## 5. Database Schema Review

### Overview

The PostgreSQL schema (`pg-schema.ts`) defines 18 tables. The 9 requested tables are reviewed below in detail. All tables are append-optimized and audit-safe by design.

![Schema ER Diagram](/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-schema-er.png)

---

### Table: `members`

**Purpose:** Central identity record for every Ghaafeedi Music customer. Links to all downstream activity.

**Key columns:** `id` (UUID PK), `email` (unique), `tier` (enum: starter/premium/elite/admin), `status` (active/suspended/cancelled), `stripe_customer_id`, `dodo_customer_id`, `ltv_cents` (lifetime value), `created_at`, `updated_at`

**Relationships:**
- 1:many → `subscriptions` (a member can have multiple past subscriptions)
- 1:many → `orders` (all purchase history)
- 1:many → `ai_jobs` (all production jobs)
- 1:1 → `profiles` (extended metadata)

**Indexing strategy:**
```sql
CREATE UNIQUE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_tier ON members(tier);
CREATE INDEX idx_members_stripe_cid ON members(stripe_customer_id);
```

**Query optimization:** Most queries filter by `email` (login) or `id` (job lookup). Both are indexed. Avoid full table scans on `members` — always filter by indexed column.

**Scalability:** At 100K members, this table is ~100MB. No partitioning needed. Standard B-tree indexes sufficient.

**Retention:** Forever (financial records). Soft-delete via `status = 'cancelled'` — never hard-delete.

---

### Table: `ai_jobs`

**Purpose:** Every AI production job — song generation, video rendering, voice cloning, analysis. This is the highest-write-volume table after `audit_logs`.

**Key columns:** `id` (UUID PK), `member_id` (FK), `order_id` (FK nullable), `product_type` (enum), `status` (pending/processing/completed/failed/cancelled), `provider` (fal_ai/suno/elevenlabs/openai/modal/vast_ai), `priority` (1–5), `attempt_count`, `input_payload` (JSONB), `output_payload` (JSONB), `cost_cents`, `started_at`, `completed_at`, `error_message`, `created_at`

**Relationships:**
- many:1 → `members`
- many:1 → `orders` (optional — some jobs are orphaned test runs)
- 1:many → `provider_usage` (one job may span multiple provider calls on retry)
- 1:many → `audit_logs` (every state transition logged)
- 1:1 → `billing_events` (on completion)

**Indexing strategy:**
```sql
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX idx_ai_jobs_member_id ON ai_jobs(member_id);
CREATE INDEX idx_ai_jobs_provider ON ai_jobs(provider);
CREATE INDEX idx_ai_jobs_created_at ON ai_jobs(created_at DESC);
CREATE INDEX idx_ai_jobs_status_priority ON ai_jobs(status, priority DESC);
-- Composite for worker polling:
CREATE INDEX idx_ai_jobs_worker_poll ON ai_jobs(status, priority DESC, created_at ASC)
  WHERE status IN ('pending', 'processing');
```

**Query optimization:** The worker's polling query is: `SELECT * FROM ai_jobs WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 10`. The `idx_ai_jobs_worker_poll` partial index serves this at microsecond speed.

**Scalability:** High-write table. At 100K users / 500 jobs/day avg: 50M rows/year. Implement monthly partitioning at 10M rows:
```sql
CREATE TABLE ai_jobs_2026_06 PARTITION OF ai_jobs 
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

**Retention:** 2 years active. Archive to cold storage (Backblaze) after 2 years. Keep `billing_events` reference forever.

---

### Table: `subscriptions`

**Purpose:** Tracks active and historical membership subscriptions. Source of truth for entitlement validation.

**Key columns:** `id`, `member_id` (FK), `plan` (starter/premium/elite), `status` (active/past_due/cancelled), `current_period_start`, `current_period_end`, `stripe_subscription_id`, `songs_used_this_period`, `songs_limit`, `cancel_at_period_end`

**Relationships:** many:1 → `members`

**Indexing:**
```sql
CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
```

**Scalability:** Low-write, high-read. At 100K users: ~100K rows. No partitioning needed. Read replicas help at 50K+ members.

**Retention:** Forever (billing audit trail). Soft-delete via `status = 'cancelled'`.

---

### Table: `orders`

**Purpose:** Every product purchase — one-time or subscription initiation. Financial source of truth.

**Key columns:** `id`, `member_id`, `product_id`, `product_slug`, `amount_cents`, `currency`, `status` (pending/paid/refunded/failed), `payment_provider` (stripe/dodo/whop), `payment_intent_id`, `invoice_url`, `metadata` (JSONB), `paid_at`, `created_at`

**Relationships:** many:1 → `members`, 1:many → `ai_jobs`, 1:many → `billing_events`

**Indexing:**
```sql
CREATE INDEX idx_orders_member_id ON orders(member_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_payment_intent ON orders(payment_intent_id);
```

**Retention:** Forever (legal/tax requirement). 7-year minimum per IRS regulations.

---

### Table: `billing_events`

**Purpose:** Immutable ledger of every billing action — charges, refunds, credits, cost deductions. Feeds LTV calculation and revenue analytics.

**Key columns:** `id`, `member_id`, `order_id` (nullable), `job_id` (nullable), `event_type` (charge/refund/credit/cost_deduction), `amount_cents`, `currency`, `provider`, `metadata` (JSONB), `created_at`

**Design principle:** Append-only. No UPDATE or DELETE ever permitted. Every financial event is a new row.

**Indexing:**
```sql
CREATE INDEX idx_billing_events_member_id ON billing_events(member_id);
CREATE INDEX idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_created_at ON billing_events(created_at DESC);
```

**Scalability:** High-write at scale. Partition by month at 5M rows. Consider TimescaleDB extension for time-series analytics queries.

**Retention:** Forever (financial records, tax compliance).

---

### Table: `audit_logs`

**Purpose:** Cryptographic audit trail for every system event — job state changes, admin actions, payment events, auth events. Append-only hash chain.

**Key columns:** `id`, `actor_id` (member or system), `actor_type` (member/worker/admin/system), `action` (string), `resource_type`, `resource_id`, `metadata` (JSONB), `ip_address`, `prev_hash`, `hash` (SHA-256 of prev_hash + action + timestamp), `created_at`

**Design principle:** The hash chain makes tampering detectable. Each row's `hash` includes the previous row's hash — modifying any past record breaks the chain. This satisfies enterprise compliance requirements.

**Indexing:**
```sql
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

**Scalability:** Highest write volume table. Monthly partitioning is mandatory above 1M rows. Archive old partitions to Backblaze after 1 year.

**Retention:** 7 years minimum (enterprise compliance). Archive, do not delete.

---

### Table: `provider_usage`

**Purpose:** Per-job provider cost tracking. Every provider API call logs cost, duration, model used, and success status. Powers the cost optimizer.

**Key columns:** `id`, `job_id` (FK), `provider`, `model`, `duration_ms`, `cost_cents`, `tokens_used` (nullable, for LLM calls), `success`, `error_code`, `created_at`

**Indexing:**
```sql
CREATE INDEX idx_provider_usage_job_id ON provider_usage(job_id);
CREATE INDEX idx_provider_usage_provider ON provider_usage(provider);
CREATE INDEX idx_provider_usage_created_at ON provider_usage(created_at DESC);
```

**Scalability:** 1 row per provider API call. A complex job (analyze → generate → render) may produce 5–10 rows. At scale, partition monthly.

**Retention:** 2 years. Powers cost analytics and routing optimization.

---

### Table: `webhooks`

**Purpose:** Tracks all inbound webhooks from payment providers (Stripe, Dodo, Whop) and outbound webhook delivery attempts. Prevents duplicate processing.

**Key columns:** `id`, `source` (stripe/dodo/whop/fal_ai), `event_type`, `payload` (JSONB), `processed`, `processed_at`, `attempt_count`, `idempotency_key` (unique), `created_at`

**Design principle:** The `idempotency_key` (usually webhook event ID from provider) prevents double-processing. Worker checks this before acting on any webhook.

**Indexing:**
```sql
CREATE UNIQUE INDEX idx_webhooks_idempotency ON webhooks(idempotency_key);
CREATE INDEX idx_webhooks_processed ON webhooks(processed) WHERE processed = false;
CREATE INDEX idx_webhooks_source ON webhooks(source);
```

**Retention:** 90 days (debugging window). Archive processed webhooks after 30 days.

---

### Table: `profiles`

**Purpose:** Extended member metadata — preferences, onboarding state, Sophia AI conversation history summary, referral data. Non-critical but high-read.

**Key columns:** `id` (= member_id, 1:1), `display_name`, `onboarding_step`, `onboarding_completed`, `sophia_context` (JSONB, last N conversation turns), `timezone`, `notification_prefs` (JSONB), `referral_code`, `referred_by`, `created_at`, `updated_at`

**Indexing:**
```sql
CREATE UNIQUE INDEX idx_profiles_member_id ON profiles(id);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
```

**Scalability:** Low-write, high-read. At 100K users: ~100K rows, ~500MB with JSONB blobs. No partitioning needed. Consider JSONB GIN index if querying inside `sophia_context` fields.

**Retention:** Forever (user data, GDPR right-to-erasure compliance via nullification, not deletion).

---

## 6. Provider Integration Roadmap

![Provider Integration Matrix](/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-provider-matrix.png)

### Integration Order & Justification

The sequence below prioritizes: (1) revenue enablement, (2) dependencies between providers, (3) risk mitigation.

---

### Priority 1: FAL.ai

**Purpose:** Primary video generation engine. Powers Memorial Legacy Film, Cinematic Life Story, Couples Journey Film, Cinematic Story Film, Dream AI Visualization, Future Self Vision — 6 of 14 products.

**Cost structure:**
- Video generation: $0.28–$0.50/second of generated video (Hailuo 2.3: $0.28/6s = ~$0.047/sec)
- A 2-minute cinematic film at 30fps through FAL.ai: ~$2–4 in raw API cost
- Your prices: $79–$799 per film → **96–99% gross margin** on raw compute

**Operational role:** Primary renderer for all video products. Receives storyboard + audio payload, returns video file URL.

**Failure handling:**
- Timeout: 5 minutes max per job (FAL.ai SLA ~2–4 min for standard video)
- Error codes: 429 (rate limit) → exponential backoff; 5xx → retry on alternate model; 402 (payment required) → alert Lawrence immediately
- Circuit breaker: if 3 consecutive failures, disable FAL.ai for 10 minutes, route to Modal

**Fallback strategy:** `FAL.ai → Modal → Vast.ai` (cost increases ~2–3x per step)

**Usage limits:** FAL.ai has no hard rate limits for paid accounts; soft limits based on account balance. Keep $200 minimum balance.

**Long-term scalability:** FAL.ai runs on their own GPU infrastructure. At 100K users generating videos, cost scales linearly. At 10K video jobs/month, consider negotiating volume pricing directly with FAL.ai.

---

### Priority 2: Suno (via Sunor.cc API)

**Purpose:** Music generation for ALL song products — Emotional Soundtrack, Signature Masterpiece, Relationship Healing, and the song tier memberships (Starter/Premium/Elite). 8+ of 14 products depend on this.

**Cost structure:**
- Sunor.cc (third-party Suno API): ~$0.10–$0.15 per song generation call
- Direct Suno API: Not publicly available; must use resellers
- A full Signature Masterpiece (3 iterations + mastering): ~$0.30–$0.50 total cost
- Your price: $99–$599 → **99%+ gross margin**

**Operational role:** Receives lyrics + style prompt + emotion metadata, returns audio file URL.

**Failure handling:**
- Suno API calls can take 30–90 seconds. Use async polling (not long-polling).
- On failure: retry once with same prompt; if fails again, escalate to `queue:dlq:review`
- No direct failover (Suno has no equivalent alternative at same quality level)

**Fallback strategy:** ElevenLabs (voice-only backup) for urgent delivery; flag job for manual requeue. No automated music gen failover exists — this is a known single point of dependency.

**Usage limits:** Sunor.cc reseller accounts typically have rate limits of 10–20 concurrent requests. Monitor queue depth closely.

**Long-term scalability:** At 10K+ songs/month, evaluate direct Suno API partnership or negotiate enterprise tier with Sunor.cc reseller. Budget $0.15/song minimum in cost models.

---

### Priority 3: OpenAI

**Purpose:** Intelligence layer for the entire platform — emotion analysis (S5), lyrics generation, story structure, storyboard generation, Sophia AI Companion chat, admin CRM insights.

**Cost structure:**
- GPT-4o: $2.50/1M input tokens, $10/1M output tokens
- GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
- Average emotion analysis job (S5): ~2,000 tokens → $0.005–$0.025 per onboarding
- Average lyrics generation: ~3,000 tokens → $0.008–$0.04 per song
- Sophia chat session (10 turns): ~5,000 tokens → $0.012–$0.06 per session

**Operational role:** Processes every onboarding, every song brief, every Sophia conversation. Lowest latency requirement of all providers (must respond within 3–5 seconds for UX).

**Failure handling:**
- OpenAI has 99.9% uptime SLA on paid tiers
- Retry with exponential backoff on 429/500
- Client-side fallback (pre-written response) for Sophia chat if API is down
- Lyrics generation: retry 2x, then use cached template + manual review flag

**Fallback strategy:** For analysis tasks: Claude Haiku (via Anthropic API) as secondary. For Sophia chat: graceful degradation ("I'm experiencing a moment of reflection..."). Never serve empty or broken responses.

**Usage limits:** Set $200/mo hard spending cap in OpenAI dashboard. Alert at $150/mo.

**Long-term scalability:** At 100K users, OpenAI will be $2,500/mo. Optimize by: batching non-urgent analysis, using mini for simple tasks, caching frequent prompt patterns.

---

### Priority 4: ElevenLabs

**Purpose:** Voice cloning for Voice Cloning Studio product, narration for Legacy Films, and Sophia AI's voice synthesis for high-tier members.

**Cost structure:**
- Pro plan: $99/mo, $0.24/1K characters
- A 3-minute narration script (~3,600 chars): $0.86 per narration
- Voice clone + 5 songs narration package: ~$5–8 in TTS costs
- Your price: $299–$999 → **99%+ gross margin**

**Operational role:** Receives script + voice clone parameters → returns WAV/MP3 audio file.

**Failure handling:**
- ElevenLabs is highly reliable (>99.5% uptime). Failures are rare.
- On failure: retry 2x, then queue for next worker cycle
- No equivalent real-time fallback for voice cloning specifically

**Fallback strategy:** OpenAI TTS (`tts-1` model) as emergency fallback for narration. Not suitable for voice cloning — flag voice clone jobs for manual review.

**Usage limits:** Pro plan is 100K chars/mo. At 300 voice clone jobs/month (avg 500 chars each): 150K chars → need Scale plan ($330/mo). Upgrade when approaching limit.

---

### Priority 5: Modal

**Purpose:** Secondary compute platform for GPU-intensive jobs when FAL.ai is at capacity, ratelimited, or temporarily offline. Also used for custom model inference not available on FAL.ai.

**Cost structure:**
- A100 GPU: ~$2.78/hr ($0.00077/sec)
- H100 GPU: ~$3.90/hr ($0.00108/sec)
- A 2-minute video job on A100: ~$0.09 (vs $2–4 on FAL.ai)
- Modal is **dramatically cheaper** for raw compute — FAL.ai charges a large markup for convenience

**Operational role:** Overflow compute for video generation; custom model inference; batch processing jobs that are not time-sensitive.

**Failure handling:**
- Modal cold start: 5–30 seconds for container spin-up
- On failure: retry 2x, then fall back to Vast.ai
- Modal function timeouts: set 10-minute max, Ghaafeedi jobs never exceed 8 minutes

**Fallback strategy:** `Modal → Vast.ai` for secondary failure

**Long-term scalability:** At large scale, Modal becomes the PRIMARY cost optimization lever. Routing 40% of video jobs through Modal vs FAL.ai saves ~$1,800/mo at 1,000 users.

---

### Priority 6: Vast.ai

**Purpose:** Tertiary overflow GPU compute. Spot market pricing — cheapest option but least reliable.

**Cost structure:**
- H100 SXM: $1.33–$3.00/hr (market rate)
- A100 SXM4: $0.27–$2.00/hr
- At $1.50/hr H100 for a 2-minute video job: $0.05 (cheapest option)

**Operational role:** Overflow when both FAL.ai and Modal are at capacity. Never used for Elite tier jobs due to reliability concerns (Vast.ai is spot market — machines can disappear mid-job).

**Failure handling:**
- Preemption risk: Vast.ai spot instances can be reclaimed. Always save intermediate output.
- On failure/preemption: automatic re-queue on Modal
- Never use for jobs with SLA < 30 minutes

**Fallback strategy:** Jobs that fail on Vast.ai re-queue to Modal. No further fallback.

**Long-term scalability:** Primarily used for cost optimization and volume overflow. At 100K users, budget $800/mo for Vast.ai burst capacity.

---

## 7. Infrastructure Cost Analysis

![Cost by Scale](/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-cost-by-scale.png)

![Cost vs Revenue](/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-cost-vs-revenue.png)

![Scaling Milestones](/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-scaling-milestones.png)

---

### Scenario A: 100 Active Users

**Profile:** Launch phase. ~40 paying members. ~60 registered free users. 80 songs generated, 20 videos rendered.

| Service            | Plan / Usage                     | Monthly Cost |
|--------------------|----------------------------------|--------------|
| PostgreSQL         | Railway Hobby                    | $20          |
| Redis (Upstash)    | Pay-as-You-Go (~50K cmd/day)     | $0–3         |
| Infisical          | Cloud Pro (1 identity)           | $18          |
| FAL.ai             | 20 video jobs × $6 avg           | $120         |
| Suno               | 80 songs × $0.15                 | $12          |
| ElevenLabs         | 30 narrations × $0.86            | $26          |
| OpenAI             | 100 onboardings + 200 chats      | $28          |
| Modal              | 5 overflow jobs                  | $5           |
| Vast.ai            | $0 (not used at this scale)      | $0           |
| Cloudflare R2      | 10GB storage + 50GB transfer     | $5           |
| Resend Email       | 1,000 emails/mo (free tier)      | $0           |
| Better Auth        | Self-hosted (free)               | $0           |
| Betterstack        | Free tier monitoring             | $0           |
| Railway (server)   | Hobby plan                       | $5           |
| **TOTAL**          |                                  | **~$302/mo** |

**Revenue estimate:** 40 paying members × avg $180 purchase = **$7,200/mo**  
**Gross margin after infra:** ~96%

---

### Scenario B: 1,000 Active Users

**Profile:** Early growth. ~500 paying members. 800 songs, 200 videos/month. Sophia AI active.

| Service            | Plan / Usage                     | Monthly Cost |
|--------------------|----------------------------------|--------------|
| PostgreSQL         | Railway Pro (2GB)                | $50          |
| Redis (Upstash)    | Fixed 1GB                        | $20          |
| Infisical          | Cloud Pro (3 identities)         | $54          |
| FAL.ai             | 200 video jobs × $4              | $800         |
| Suno               | 800 songs × $0.15                | $120         |
| ElevenLabs         | Pro plan ($99) + overages        | $130         |
| OpenAI             | 1K onboardings + 2K chats        | $120         |
| Modal              | 50 overflow jobs                 | $35          |
| Vast.ai            | 25 burst jobs                    | $50          |
| Storage            | 100GB R2 + 500GB transfer        | $20          |
| Email (Resend)     | 10K emails (Pro $20)             | $20          |
| Auth               | $0 (self-hosted)                 | $0           |
| Monitoring         | Betterstack Starter              | $20          |
| Railway (server)   | Pro (2 workers)                  | $30          |
| PgBouncer          | Railway service                  | $10          |
| **TOTAL**          |                                  | **~$1,509/mo** |

**Revenue estimate:** 500 paying members × avg $180 = **$90,000/mo**  
**Gross margin after infra:** ~98.3%

---

### Scenario C: 10,000 Active Users

**Profile:** Scale phase. ~5,500 paying members. 8,000 songs, 2,000 videos/month.

| Service            | Plan / Usage                       | Monthly Cost  |
|--------------------|------------------------------------|---------------|
| PostgreSQL         | Neon Pro (auto-scale, 20GB)        | $200          |
| Redis (Upstash)    | Fixed 1GB + $80 overages           | $100          |
| Infisical          | Cloud Pro (10 identities)          | $180          |
| FAL.ai             | 2,000 videos × $4 avg              | $8,000        |
| Suno               | 8,000 songs × $0.15                | $1,200        |
| ElevenLabs         | Scale plan ($330) + overages       | $400          |
| OpenAI             | 10K onboardings + 20K chats        | $600          |
| Modal              | 500 overflow jobs                  | $350          |
| Vast.ai            | 200 burst jobs                     | $200          |
| Storage            | 1TB R2 + 5TB transfer              | $100          |
| Email (Resend)     | 100K emails                        | $50           |
| Auth               | Self-hosted (Railway)              | $0            |
| Monitoring         | Betterstack + Sentry               | $50           |
| Railway (servers)  | Pro (8 workers + PgBouncer)        | $120          |
| CDN (Cloudflare)   | Workers Pro                        | $5            |
| n8n automation     | Railway self-hosted                | $30           |
| **TOTAL**          |                                    | **~$11,585/mo** |

> Note: This assumes no cost optimization routing. With Modal/Vast.ai routing for 40% of video jobs: **~$7,698/mo**

**Revenue estimate:** 5,500 paying members × avg $180 = **$990,000/mo**  
**Gross margin after infra (optimized):** ~99.2%

---

### Scenario D: 100,000 Active Users

**Profile:** Enterprise scale. ~60,000 paying members. 80,000 songs, 20,000 videos/month.

| Service            | Plan / Usage                            | Monthly Cost   |
|--------------------|-----------------------------------------|----------------|
| PostgreSQL         | Neon Enterprise or AWS RDS Multi-AZ     | $800           |
| Redis (Upstash)    | Fixed 5GB ($100) + global replication   | $400           |
| Infisical          | Cloud Enterprise (50 identities)        | $900+          |
| FAL.ai             | 8,000 videos × $4 (volume discount est.)| $32,000        |
| Modal              | 8,000 overflow videos × $0.50 avg       | $4,000         |
| Vast.ai            | 4,000 burst videos × $0.25             | $1,000         |
| Suno               | 80,000 songs × $0.10 (volume)           | $8,000         |
| ElevenLabs         | Enterprise plan negotiated              | $1,000         |
| OpenAI             | 100K onboardings + 200K chats           | $2,500         |
| Storage            | 10TB R2 + CDN                           | $500           |
| Email (Resend)     | 1M emails (Scale $90)                  | $200           |
| Auth               | Self-hosted cluster                     | $0             |
| Monitoring         | Betterstack + Datadog + Sentry          | $300           |
| Railway/servers    | Multi-region deployment                 | $500           |
| n8n + ops          | Railway cluster                         | $100           |
| **TOTAL**          |                                         | **~$52,200/mo** |

> With full cost optimization routing (Modal/Vast.ai for 60% of video): **~$36,330/mo**

**Revenue estimate:** 60,000 paying members × avg $200 (upsell effect) = **$12,000,000/mo**  
**Gross margin after infra (optimized):** ~99.7%

---

## 8. Android-First Autonomous Operations

Ghaafeedi Music is designed to be fully operable from an Android device. All critical operational workflows are accessible without a desktop computer.

### Mobile Admin Workflow

The **custom Admin Panel** (built in Phase 1, at `/admin`) is fully responsive. Lawrence can:
- View real-time revenue analytics from Chrome mobile
- Manage members (view, upgrade tier, suspend, reinstate)
- View all orders with payment status and product details
- Trigger manual refunds (via Stripe dashboard link)
- Access audit logs with full filter controls

**Quick access setup:**
1. Add `https://ghaafeedi.com/admin` to Android home screen (PWA install)
2. Authenticate via Better Auth (Google login or email + 2FA)
3. Use Chrome DevTools mobile mode for bulk operations if needed

---

### Queue Management Workflow

**From Android:**
- **Upstash Console** (app.upstash.com) → view queue depths, flush stuck queues, inspect individual keys
- **Admin Panel → AI Jobs tab** → filter by status, manually cancel stuck jobs, view error messages
- **Railway Mobile** (railway.app via mobile browser) → restart worker services, view worker logs in real time

**Emergency queue drain procedure (from phone):**
```
1. Open Admin Panel → AI Jobs → filter status: "processing" older than 10 minutes
2. These are zombie jobs. Bulk-cancel them.
3. Open Upstash Console → clear stuck lock keys: gm:lock:job:*
4. Open Railway → restart worker service
5. Monitor Admin Panel for jobs resuming
```

---

### Job Monitoring Workflow

**Real-time monitoring from Android:**
- Admin Panel → Productions tab → live job feed with provider, status, duration, cost
- Admin Panel → AI Jobs tab → error breakdown by provider
- Upstash Console → queue depth metrics (graph view, mobile-friendly)
- Betterstack mobile app → uptime/downtime alerts with push notifications

**Alert setup (critical — do this before launch):**
1. Betterstack → set up uptime monitor for `/api/health` → push notification on failure
2. Railway → set up crash email alerts for worker service
3. Upstash → email alert when queue depth > 50 (Elite tier) or > 500 (any tier)
4. Sentry → mobile app for error tracking → push on new critical errors

---

### Billing Workflow

**From Android:**
- **Stripe Dashboard app** (iOS/Android) → view all charges, issue refunds, view disputes
- **Dodo Payments dashboard** → web browser mobile view
- **Admin Panel → Revenue tab** → full revenue breakdown, product-level analytics, LTV per member
- **Admin Panel → Orders tab** → search by member email, view payment status, trigger manual fulfillment

---

### Customer Support Workflow

**From Android:**
- **Admin Panel → Support tab** → view all support tickets, respond, escalate
- **Admin Panel → Members tab** → search member, view full history (orders, jobs, subscriptions)
- Email via Gmail mobile for complex issues
- Sophia AI conversation history visible in member profile (Admin Panel → Member detail)

---

### Audit Log Workflow

**From Android:**
- Admin Panel → Audit Logs tab → full hash-chain log with actor, action, timestamp, IP
- Filter by: actor, action type, date range, resource type
- Export to CSV (download to Android Downloads folder)
- Search by member ID or order ID for specific investigation

---

### Error Management Workflow

| Error Type              | Detection                     | Android Action                              |
|-------------------------|-------------------------------|---------------------------------------------|
| Worker crash            | Betterstack push alert        | Open Railway → restart worker service       |
| FAL.ai outage           | Admin Panel → AI Jobs errors  | Open cost-optimizer, manually set FAL weight=0 via DB update |
| DB connection exhausted | Sentry error alert            | Open Railway → restart API server           |
| Suno API rate limit     | Job failure spike in Admin    | Upstash: inspect queue, slow down job dispatch |
| Redis connection lost   | Worker logs (Railway)         | Upstash → check status, restart if needed  |
| Payment failure spike   | Stripe app push notification  | Stripe dashboard → check for card issues   |

---

### Provider Failover Visibility

Admin Panel → AI Jobs tab shows:
- Current primary provider per product type
- Success rate per provider (last 24h)
- Average cost per job per provider
- Circuit breaker status (open/closed) per provider

**Manual provider override (emergency):**
```sql
-- From Railway PG console (accessible via Railway mobile browser):
UPDATE routing_rules 
SET enabled = false 
WHERE provider = 'fal_ai';
-- This forces all video jobs to Modal/Vast.ai immediately
```

---

### Emergency Shutdown Procedures

**Full platform emergency shutdown (from Android):**
```
1. Railway mobile browser → API service → Pause/Stop
2. Railway mobile browser → Worker service → Pause/Stop
3. Upstash Console → Flush all queues (atomic — no new jobs will process)
4. All in-flight jobs on providers will complete; no new jobs dispatched
5. Send status email via Resend or Gmail
6. Recovery: restart Railway services in order: API first, worker second
```

**Partial shutdown (take down just video generation):**
```sql
-- Update routing_rules to disable all video providers:
UPDATE routing_rules SET enabled = false 
WHERE product_category = 'video';
-- Jobs queue up but do not dispatch; no provider costs incurred
```

---

### Infrastructure Monitoring Visibility (Android)

| Service           | Mobile Access Method              | Frequency     |
|-------------------|-----------------------------------|---------------|
| API uptime        | Betterstack app → push alerts     | Real-time     |
| Error rate        | Sentry mobile app                 | Real-time     |
| Revenue           | Admin Panel → Revenue tab         | On demand     |
| Queue depth       | Upstash Console (mobile browser)  | On demand     |
| DB health         | Railway mobile → PG metrics       | On demand     |
| Worker status     | Railway mobile → service logs     | On demand     |
| Provider costs    | Admin Panel → AI Jobs             | On demand     |
| Member growth     | Admin Panel → Overview            | Daily         |

---

## 9. Enterprise Readiness Assessment

### Current Architecture Strengths

| Strength                          | Details                                                               |
|-----------------------------------|-----------------------------------------------------------------------|
| Append-only audit trail           | Hash-chain in `audit_logs` — tamper-evident, compliance-ready        |
| No vendor lock-in                 | All providers behind `ProviderAdapter` interface — swap without rewrite |
| Stateless API design             | Hono API is horizontally scalable — add Railway replicas instantly   |
| Graceful degradation              | Circuit breakers + retry chains — no single provider failure = downtime |
| Entitlement validation            | Quota checks enforced before every job — no overrun risk             |
| Cost tracking per job             | `provider_usage` table tracks every API dollar — full cost visibility |
| Dual payment processor            | Stripe + Dodo — payment resilience                                   |
| Mobile-first admin                | Full admin panel responsive — no desktop dependency for operations   |
| Role-based access                 | customer/admin/support roles with route guards                       |
| CSRF + rate limiting              | Both implemented at API middleware layer                             |

---

### Current Architecture Limitations

| Limitation                         | Impact      | Fix Available                              |
|------------------------------------|-------------|---------------------------------------------|
| Redis Streams (xadd) uncertainty   | Medium      | Fall back to list-only event bus (done in code) |
| No PG replication yet              | Medium      | Add Railway read replica at 5K users        |
| Turso/PG split brain risk          | High        | Complete PG migration in Phase 2            |
| No distributed tracing             | Low         | Add OpenTelemetry post-launch               |
| No automated secret rotation       | Medium      | Infisical automation in Phase 3             |
| No staging environment yet         | High        | Set up before first real customer           |
| Single Railway region              | Medium      | Multi-region at 50K users                  |
| No CDN for media files             | Medium      | Cloudflare R2 + CDN in Phase 2             |
| Worker single point of failure     | Medium      | Add second worker instance at 1K users     |

---

### Security Posture

| Domain                | Current State         | Rating        |
|-----------------------|-----------------------|---------------|
| Transport security    | TLS everywhere        | ✅ Excellent  |
| Payment security      | PCI DSS, tokenized    | ✅ Excellent  |
| Auth                  | JWT, role-based       | ✅ Good       |
| Secret management     | Infisical (planned)   | 🟡 Pending    |
| Input validation      | Partial               | 🟡 Review needed |
| SQL injection         | Drizzle ORM (safe)    | ✅ Excellent  |
| CSRF                  | Implemented           | ✅ Good       |
| Rate limiting         | Implemented           | ✅ Good       |
| Audit logging         | Hash-chain            | ✅ Excellent  |
| 2FA for admin         | Not yet required      | 🟡 Add pre-launch |
| API key exposure      | Still in .env some    | 🔴 Fix in Phase 2 |
| CORS                  | Basic config          | 🟡 Tighten    |

---

### Scalability Readiness

| Component      | Ready for 100 | Ready for 1K | Ready for 10K | Ready for 100K |
|----------------|---------------|--------------|----------------|----------------|
| API server      | ✅            | ✅           | 🟡 Add replicas | 🔴 Needs cluster |
| PostgreSQL      | ✅            | ✅           | 🟡 Migrate PG  | 🔴 PG cluster |
| Redis           | ✅            | 🟡 Paid plan  | ✅ Fixed plan  | 🟡 Fixed 5GB |
| Workers         | ✅            | 🟡 Add 2nd   | 🟡 Scale to 8  | 🔴 20+ workers |
| Providers       | ✅            | ✅           | ✅             | 🟡 Volume deals |
| Storage         | ✅            | ✅           | ✅             | ✅ R2 scales |
| Auth            | ✅            | ✅           | ✅             | 🟡 Monitoring |

---

### Single Points of Failure

| SPOF                    | Risk Level | Mitigation                                     |
|-------------------------|------------|------------------------------------------------|
| Suno API (no equivalent)| 🔴 High    | Pre-generate backup stems; manual review queue |
| Railway region           | 🟡 Medium  | Daily backups; restore plan documented         |
| FAL.ai account ban       | 🟡 Medium  | Modal as immediate fallback; keep 2nd account  |
| Upstash Redis outage     | 🟡 Medium  | Graceful degradation: 503 + retry-after header |
| OpenAI API outage        | 🟡 Medium  | Claude Haiku fallback; cached prompts          |
| Single Railway worker    | 🟡 Medium  | Add second worker instance (Phase 2)           |
| Payment processors both  | 🔴 High    | Three processors: Stripe + Dodo + Whop         |

---

### Recommended Improvements Before Launch (0 → 100 users)

1. **Complete Infisical setup** — move all API keys out of `.env` into Infisical
2. **Provision PostgreSQL on Railway** — wire `pg-client.ts` into all new routes
3. **Provision Upstash Redis** — enable queue system + rate limiting
4. **Set up Betterstack uptime monitoring** — push alerts before first paying customer
5. **Create staging environment** — identical to prod, separate API keys, test Suno/FAL.ai there first
6. **Require 2FA on all admin accounts**
7. **Set OpenAI spending caps** — $200/mo hard limit in OpenAI dashboard
8. **FAL.ai and Suno: set balance alerts** — alert at $100 remaining balance
9. **Implement `/api/health` endpoint** — DB ping + Redis ping + queue depth check

---

### Recommended Improvements Before 1,000 Users

1. Deploy second worker instance (Railway — add Railway service replica)
2. Deploy PgBouncer (Railway service alongside PostgreSQL)
3. Move to Upstash Fixed 1GB plan (predictable cost)
4. Add Sentry error tracking
5. Implement automated daily DB backup to Backblaze B2
6. Add read replica to Railway PostgreSQL (or migrate to Neon/Supabase with built-in replicas)
7. Set up n8n on Railway for automated billing workflows
8. Implement Sophia AI voice (ElevenLabs) for Premium+ tier

---

### Recommended Improvements Before 10,000 Users

1. **Migrate PostgreSQL to Neon or Supabase** (built-in connection pooling, branching, auto-scale)
2. **Migrate to Phase 4 Android-first Admin Control Center** (real-time dashboards, native push alerts)
3. **Implement full cost-optimizer routing** — 40% of video jobs to Modal for cost savings
4. **Add Datadog or Axiom for log aggregation** — critical for debugging at this scale
5. **Implement PG monthly partitioning** on `ai_jobs` and `audit_logs`
6. **Add Cloudflare CDN** for all media file delivery (R2 public bucket + Cloudflare proxy)
7. **Negotiate volume pricing** with FAL.ai and Suno
8. **Implement full GDPR compliance** — right-to-erasure workflow in admin panel

---

### Recommended Improvements Before 100,000 Users

1. Multi-region deployment (Railway Pro, or migrate to Fly.io/Render for multi-region)
2. PostgreSQL cluster with streaming replication (AWS RDS Multi-AZ or Neon Enterprise)
3. Redis cluster (Upstash Fixed 5GB + global replication regions)
4. Full SOC 2 audit (requires dedicated security review, ~6 months)
5. Dedicated GPU contracts (negotiate with Modal for reserved capacity)
6. Custom Suno enterprise tier (direct API partnership, lower cost, higher limits)
7. Multi-worker pool per region (reduce video generation latency for global users)
8. Implement blue-green deployment (zero-downtime deploys at this scale are mandatory)

---

## Appendix A: Infrastructure Architecture Diagram (Text)

```
                        ┌─────────────────────────────────┐
                        │         Ghaafeedi Music         │
                        │   Web + Mobile + Admin Clients  │
                        └──────────────┬──────────────────┘
                                       │ HTTPS/TLS
                        ┌──────────────▼──────────────────┐
                        │      Hono API Server            │
                        │      (Railway — Bun runtime)    │
                        │  • Auth routes                  │
                        │  • Product routes               │
                        │  • Job submission routes        │
                        │  • Webhook handlers             │
                        └──┬───────┬──────────┬───────────┘
                           │       │          │
              ┌────────────▼─┐ ┌───▼────┐ ┌──▼──────────────┐
              │  PostgreSQL  │ │ Redis  │ │ Infisical Vault  │
              │  (Railway)   │ │Upstash │ │  (secrets)      │
              └──────────────┘ └────────┘ └─────────────────┘
                           │
              ┌────────────▼──────────────────────────────────┐
              │         Orchestration Engine                  │
              │  (worker.ts — Railway background service)     │
              │  • State machine                              │
              │  • Cost optimizer (routes to cheapest)        │
              │  • Retry manager (3 attempts, failover chain) │
              │  • Audit logger (hash-chain to PG)            │
              │  • Entitlement validator                      │
              │  • Billing emitter                            │
              └──┬──────┬──────┬─────┬──────┬────────────────┘
                 │      │      │     │      │
          ┌──────▼┐ ┌───▼──┐ ┌▼──┐ ┌▼─────┐┌▼──────┐
          │FAL.ai │ │Suno  │ │EL │ │OpenAI││Modal  │
          │(video)│ │(music│ │TTS│ │(AI)  ││(GPU)  │
          └───────┘ └──────┘ └───┘ └──────┘└───────┘
                                              └── Vast.ai (overflow)

         ┌─────────────────────────────────────────────────┐
         │              n8n Automation (Railway)            │
         │  • Billing workflows                             │
         │  • Member notification sequences                 │
         │  • Job completion triggers                       │
         └─────────────────────────────────────────────────┘
```

---

## Appendix B: Cost Summary Table

| Scenario    | Users  | Infra Cost/mo | Revenue/mo (est.) | Gross Margin |
|-------------|--------|---------------|-------------------|--------------|
| A — Launch  | 100    | $302          | $7,200            | 95.8%        |
| B — Growth  | 1,000  | $1,509        | $90,000           | 98.3%        |
| C — Scale   | 10,000 | $7,698*       | $990,000          | 99.2%        |
| D — Enterprise | 100,000 | $36,330*  | $12,000,000       | 99.7%        |

*With cost optimization routing (Modal/Vast.ai for 40–60% of video jobs)

---

## Appendix C: Phase 2 Implementation Prerequisites

Before Phase 2 (Provider Integrations) begins, the following must be complete:

| # | Item                                  | Owner    | Priority |
|---|---------------------------------------|----------|----------|
| 1 | Railway PostgreSQL provisioned        | Lawrence | P0       |
| 2 | Upstash Redis provisioned             | Lawrence | P0       |
| 3 | Infisical Cloud Pro account created   | Lawrence | P0       |
| 4 | All 48 env vars documented + loaded   | Both     | P0       |
| 5 | FAL.ai API key + balance loaded       | Lawrence | P0       |
| 6 | Suno/Sunor.cc API key + balance loaded| Lawrence | P0       |
| 7 | OpenAI API key + $200 cap set         | Lawrence | P0       |
| 8 | ElevenLabs Pro account + key          | Lawrence | P1       |
| 9 | Modal account + token                 | Lawrence | P1       |
| 10| Vast.ai account + key                 | Lawrence | P2       |
| 11| Staging environment on Railway        | Lawrence | P0       |
| 12| Betterstack uptime monitoring set up  | Both     | P1       |

---

*End of Pre-Phase 2 Infrastructure Review*  
*Prepared by: Runable AI Engineering Assistant*  
*For: Lawrence Davis, Ghaafeedi Music*  
*Date: June 16, 2026*
