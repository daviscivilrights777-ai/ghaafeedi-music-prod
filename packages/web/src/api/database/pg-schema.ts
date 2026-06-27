// ============================================================
// Ghaafeedi Music — PostgreSQL Schema (Enterprise Orchestration)
// Replaces Turso/SQLite schema. All 18 tables from Part 1 spec.
// ============================================================

import {
  pgTable, text, integer, boolean, timestamp, jsonb,
  uuid, bigserial, inet, decimal, index, uniqueIndex
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Helpers ─────────────────────────────────────────────────
const now = () => sql`now()`;

// ═══════════════════════════════════════════════════════════════
// AUTH TABLES (Better-Auth compatible, PostgreSQL versions)
// ═══════════════════════════════════════════════════════════════

export const user = pgTable("user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image:         text("image"),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const session = pgTable("session", {
  id:          text("id").primaryKey(),
  expiresAt:   timestamp("expires_at", { withTimezone: true }).notNull(),
  token:       text("token").notNull().unique(),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  ipAddress:   text("ip_address"),
  userAgent:   text("user_agent"),
  userId:      text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id:                     text("id").primaryKey(),
  accountId:              text("account_id").notNull(),
  providerId:             text("provider_id").notNull(),
  userId:                 text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken:            text("access_token"),
  refreshToken:           text("refresh_token"),
  idToken:                text("id_token"),
  accessTokenExpiresAt:   timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt:  timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope:                  text("scope"),
  password:               text("password"),
  createdAt:              timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:              timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════════
// CORE PLATFORM TABLES
// ═══════════════════════════════════════════════════════════════

// ─── Profiles ────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  userId:            text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  fullName:          text("full_name"),
  bio:               text("bio"),
  phone:             text("phone"),
  country:           text("country"),
  timezone:          text("timezone").default("UTC"),
  language:          text("language").default("en"),
  avatarUrl:         text("avatar_url"),
  role:              text("role").notNull().default("customer"), // customer | admin | support | owner
  onboardingStep:    integer("onboarding_step").default(0),
  onboardingComplete: boolean("onboarding_complete").default(false),
  storyS:            text("story_summary"),
  emotionalProfile:  jsonb("emotional_profile"),
  sophiaSessionCount: integer("sophia_session_count").default(0),
  mfaEnabled:        boolean("mfa_enabled").default(false),
  mfaSecret:         text("mfa_secret"), // encrypted at app layer
  verified:          boolean("verified").default(false),
  ltvCents:          integer("ltv_cents").default(0),
  createdAt:         timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Enterprise Members ───────────────────────────────────────
export const members = pgTable("members", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  memberId:  text("member_id").notNull().unique(), // GM-XXXXXXXX — immutable
  status:    text("status").notNull().default("active"), // active | suspended | vip
  tier:      text("tier").notNull().default("free"),     // free | starter | premium | elite
  joinedAt:  timestamp("joined_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Subscriptions ────────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id:                   text("id").primaryKey(),
  userId:               text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  memberId:             text("member_id"),
  plan:                 text("plan").notNull(),    // starter | premium | elite | sophia_ai
  status:               text("status").notNull().default("active"), // active | paused | cancelled | past_due
  provider:             text("provider").notNull(), // whop | stripe | dodo | autumn
  providerSubId:        text("provider_sub_id"),
  currentPeriodStart:   timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd:     timestamp("current_period_end", { withTimezone: true }),
  quotaSongs:           integer("quota_songs").default(0),
  quotaUsed:            integer("quota_used").default(0),
  renewalAt:            timestamp("renewal_at", { withTimezone: true }),
  cancelAtPeriodEnd:    boolean("cancel_at_period_end").default(false),
  cancelledAt:          timestamp("cancelled_at", { withTimezone: true }),
  metadata:             jsonb("metadata").default({}),
  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Orders ───────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id:              text("id").primaryKey(),          // ORD-XXXXXXXXX
  userId:          text("user_id").notNull().references(() => user.id),
  memberId:        text("member_id"),
  productSlug:     text("product_slug").notNull(),
  productName:     text("product_name").notNull(),
  tier:            text("tier").notNull(),
  priceCents:      integer("price_cents").notNull(),
  currency:        text("currency").default("USD"),
  status:          text("status").notNull().default("pending"),
  // pending | paid | processing | delivered | refunded | cancelled
  paymentProvider: text("payment_provider"),        // dodo | autumn | whop
  paymentId:       text("payment_id"),
  dodoOrderId:     text("dodo_order_id"),
  notes:           text("notes"),
  metadata:        jsonb("metadata").default({}),
  addons:          jsonb("addons").default([]),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  deliveredAt:     timestamp("delivered_at", { withTimezone: true }),
  refundedAt:      timestamp("refunded_at", { withTimezone: true }),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── AI Jobs ──────────────────────────────────────────────────
export const aiJobs = pgTable("ai_jobs", {
  id:               text("id").primaryKey(),        // UUID v7
  orderId:          text("order_id").references(() => orders.id),
  userId:           text("user_id").notNull().references(() => user.id),
  productionId:     text("production_id"),
  storyId:          text("story_id"),
  jobType:          text("job_type").notNull(),
  // song | video | voice_clone | visualization | narration | analysis | image
  status:           text("status").notNull().default("queued"),
  // queued | dispatched | processing | complete | failed | cancelled
  // | retry | failover_dispatch | quality_review | delivery
  provider:         text("provider"),               // fal_ai | modal | vast_ai | poyo | elevenlabs | openai
  providerJobId:    text("provider_job_id"),
  inputPayload:     jsonb("input_payload"),
  outputPayload:    jsonb("output_payload"),
  estimatedCostCents: integer("estimated_cost_cents"),
  actualCostCents:  integer("actual_cost_cents"),
  retryCount:       integer("retry_count").default(0),
  errorMessage:     text("error_message"),
  priority:         integer("priority").default(5), // 1=highest (elite), 10=lowest
  queuedAt:         timestamp("queued_at", { withTimezone: true }).defaultNow(),
  dispatchedAt:     timestamp("dispatched_at", { withTimezone: true }),
  completedAt:      timestamp("completed_at", { withTimezone: true }),
  durationSeconds:  integer("duration_seconds"),
  metadata:         jsonb("metadata").default({}),
  // ── Pipeline columns (Phase 7+) ──────────────────────────
  parentJobId:      text("parent_job_id"),           // job that spawned this stage
  pipelineRunId:    text("pipeline_run_id"),          // shared across all jobs in a production run
  pipelineStage:    text("pipeline_stage"),           // story_bible | production_bible | shot_list | clip_batch | edit_assemble | qc_check | deliver
  stageOutputs:     jsonb("stage_outputs"),           // structured output from this stage (StoryBible/ProductionBible/etc.)
});

// ─── Productions ──────────────────────────────────────────────
export const productions = pgTable("productions", {
  id:                  text("id").primaryKey(),      // PROD-XXXXXXXXX
  orderId:             text("order_id").notNull().references(() => orders.id),
  userId:              text("user_id").notNull().references(() => user.id),
  memberId:            text("member_id"),
  productSlug:         text("product_slug").notNull(),
  status:              text("status").notNull().default("queued"),
  currentStage:        text("current_stage").notNull().default("queued"),
  storyId:             text("story_id"),
  deliverableKeys:     jsonb("deliverable_keys").default([]),
  revisionCount:       integer("revision_count").default(0),
  maxRevisions:        integer("max_revisions").default(1),
  estimatedDeliveryAt: timestamp("estimated_delivery_at", { withTimezone: true }),
  deliveredAt:         timestamp("delivered_at", { withTimezone: true }),
  notes:               text("notes"),
  metadata:            jsonb("metadata").default({}),
  createdAt:           timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Stories ──────────────────────────────────────────────────
export const stories = pgTable("stories", {
  id:           text("id").primaryKey(),
  userId:       text("user_id").notNull().references(() => user.id),
  memberId:     text("member_id"),
  orderId:      text("order_id").references(() => orders.id),
  productionId: text("production_id"),
  title:        text("title"),
  storyText:    text("story_text").notNull(),
  emotion:      text("emotion"),
  style:        text("style"),
  mood:         text("mood"),
  goals:        text("goals"),
  aiAnalysis:   jsonb("ai_analysis"),
  lyrics:       text("lyrics"),
  script:       text("script"),
  storyboard:   jsonb("storyboard"),
  status:       text("status").notNull().default("draft"),
  // draft | analyzing | analyzed | in_production | complete
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Assets ───────────────────────────────────────────────────
export const assets = pgTable("assets", {
  id:           text("id").primaryKey(),
  jobId:        text("job_id").references(() => aiJobs.id),
  userId:       text("user_id").notNull().references(() => user.id),
  orderId:      text("order_id").references(() => orders.id),
  productionId: text("production_id"),
  storyId:      text("story_id"),
  assetType:    text("asset_type").notNull(),
  // song | video | voice_model | image | document | photo
  origin:       text("origin").notNull().default("generated"), // generated | uploaded
  s3Bucket:     text("s3_bucket").notNull(),
  s3Key:        text("s3_key").notNull(),
  cdnUrl:       text("cdn_url"),
  fileSizeBytes: integer("file_size_bytes"),
  mimeType:     text("mime_type"),
  filename:     text("filename"),
  encrypted:    boolean("encrypted").default(true),
  checksumMd5:  text("checksum_md5"),
  metadata:     jsonb("metadata").default({}),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt:    timestamp("expires_at", { withTimezone: true }), // null = permanent vault
});

// ─── Provider Configuration ───────────────────────────────────
export const providers = pgTable("providers", {
  id:              text("id").primaryKey(),
  name:            text("name").unique().notNull(),
  // fal_ai_kling | fal_ai_hailuo | modal | vast_ai | poyo | elevenlabs | openai
  displayName:     text("display_name"),
  enabled:         boolean("enabled").default(true),
  jobTypes:        jsonb("job_types").default([]),  // string array
  priority:        integer("priority").default(100), // lower = higher priority
  costPerUnit:     decimal("cost_per_unit", { precision: 10, scale: 6 }),
  unit:            text("unit"),    // per_second | per_song | per_char | per_request
  maxConcurrent:   integer("max_concurrent").default(20),
  hourlyBudgetCents: integer("hourly_budget_cents"),
  apiKeyRef:       text("api_key_ref"), // vault secret name — NOT the key itself
  webhookUrl:      text("webhook_url"),
  config:          jsonb("config").default({}),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Routing Rules ────────────────────────────────────────────
export const routingRules = pgTable("routing_rules", {
  id:             text("id").primaryKey(),
  name:           text("name").notNull(),
  priority:       integer("priority").notNull(), // lower = evaluated first
  conditions:     jsonb("conditions").notNull(), // {job_type, tier, user_segment, ...}
  targetProvider: text("target_provider"),
  enabled:        boolean("enabled").default(true),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Billing Events ───────────────────────────────────────────
export const billingEvents = pgTable("billing_events", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").references(() => user.id),
  orderId:     text("order_id").references(() => orders.id),
  jobId:       text("job_id").references(() => aiJobs.id),
  eventType:   text("event_type").notNull(),
  // job_cost | subscription_renewal | refund | credit | addon
  amountCents: integer("amount_cents").notNull(),
  provider:    text("provider"),
  externalRef: text("external_ref"),
  metadata:    jsonb("metadata").default({}),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Audit Logs (append-only, tamper-evident) ─────────────────
export const auditLogs = pgTable("audit_logs", {
  id:           bigserial("id", { mode: "number" }).primaryKey(),
  actorId:      text("actor_id"),   // user_id or 'system'
  actorRole:    text("actor_role"),
  action:       text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId:   text("resource_id"),
  ipAddress:    text("ip_address"),
  userAgent:    text("user_agent"),
  payload:      jsonb("payload"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  prevHash:     text("prev_hash"),  // hash chain
  logHash:      text("log_hash"),   // SHA-256(prevHash + row content)
});

// ─── Acknowledgements ─────────────────────────────────────────
export const acknowledgements = pgTable("acknowledgements", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull().references(() => user.id),
  memberId:    text("member_id"),
  productSlug: text("product_slug").notNull(),
  statement:   text("statement"),
  agreedAt:    timestamp("agreed_at", { withTimezone: true }).defaultNow(),
  ipAddress:   text("ip_address"),
  signature:   text("signature"), // HMAC of userId+statement+agreedAt
});

// ─── Voice Assets ─────────────────────────────────────────────
export const voiceAssets = pgTable("voice_assets", {
  id:                 text("id").primaryKey(),
  userId:             text("user_id").notNull().references(() => user.id),
  orderId:            text("order_id").references(() => orders.id),
  elevenlabsVoiceId:  text("elevenlabs_voice_id").unique(),
  label:              text("label"),
  status:             text("status").default("training"),
  // training | ready | suspended
  consentLogId:       integer("consent_log_id"),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastUsedAt:         timestamp("last_used_at", { withTimezone: true }),
});

// ─── Notification Templates ───────────────────────────────────
export const notificationTemplates = pgTable("notification_templates", {
  id:        text("id").primaryKey(),
  name:      text("name").unique().notNull(),
  channel:   text("channel").notNull(), // email | sms | push
  subject:   text("subject"),
  bodyHtml:  text("body_html"),
  bodyText:  text("body_text"),
  variables: jsonb("variables").default([]), // string array
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  updatedBy: text("updated_by").references(() => user.id),
});

// ─── Support Tickets ──────────────────────────────────────────
export const tickets = pgTable("tickets", {
  id:         text("id").primaryKey(),
  userId:     text("user_id").notNull().references(() => user.id),
  memberId:   text("member_id"),
  subject:    text("subject").notNull(),
  body:       text("body").notNull(),
  status:     text("status").notNull().default("open"),
  // open | in_progress | resolved | closed
  priority:   text("priority").notNull().default("normal"),
  assignedTo: text("assigned_to"),
  messages:   jsonb("messages").default([]),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Sophia AI Conversations ──────────────────────────────────
export const conversations = pgTable("conversations", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull().references(() => user.id),
  title:     text("title"),
  messages:  jsonb("messages").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// These are defined inline via Drizzle index() on the table defs above.
// For complex/partial indexes, use a migration SQL file.
// Key indexes to create in migration:
//   ai_jobs(user_id, status)
//   ai_jobs(provider, status)
//   ai_jobs(queued_at) WHERE status = 'queued'
//   orders(user_id, status)
//   assets(user_id, asset_type)
//   billing_events(user_id, created_at DESC)
//   audit_logs(actor_id, created_at DESC)
//   subscriptions(user_id) WHERE status = 'active'

// ═══════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════

export type User = typeof user.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type AiJob = typeof aiJobs.$inferSelect;
export type Production = typeof productions.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type RoutingRule = typeof routingRules.$inferSelect;
export type BillingEvent = typeof billingEvents.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Acknowledgement = typeof acknowledgements.$inferSelect;
export type VoiceAsset = typeof voiceAssets.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;

// ─── Revision Requests ───────────────────────────────────────
// Line 2 AI Songs + Music Video revision intake.
// One row per submitted revision request. Tracks eligibility,
// payload, admin actions, and dispatched retake job.
export const revisionRequests = pgTable("revision_requests", {
  id:               text("id").primaryKey(),          // REV-XXXXXXXXX
  userId:           text("user_id").notNull().references(() => user.id),
  orderId:          text("order_id").notNull().references(() => orders.id),
  productionId:     text("production_id"),            // PROD-XXXXXXXXX
  productSlug:      text("product_slug").notNull(),
  tier:             text("tier").notNull(),           // starter|premium|elite
  revisionRound:    integer("revision_round").notNull().default(1), // 1|2|3
  maxRevisions:     integer("max_revisions").notNull().default(1),
  windowClosesAt:   timestamp("window_closes_at", { withTimezone: true }), // 7 days from delivery
  avatarProvider:   text("avatar_provider"),          // static|simli|did|ltx|heygen
  status:           text("status").notNull().default("pending"), // pending|approved|in_progress|complete|rejected
  requestPayload:   jsonb("request_payload").default({}),  // RevisionJobPayload
  retakeDirective:  jsonb("retake_directive").default({}), // Sophia's structured GPT-4o output
  adminNotes:       text("admin_notes"),
  dispatchedJobId:  text("dispatched_job_id"),        // ai_jobs.id once dispatched
  beforeUrl:        text("before_url"),               // original clip/song URL
  afterUrl:         text("after_url"),                // retake output URL
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type RevisionRequest = typeof revisionRequests.$inferSelect;
export type InsertRevisionRequest = typeof revisionRequests.$inferInsert;

export type InsertAiJob = typeof aiJobs.$inferInsert;
export type InsertOrder = typeof orders.$inferInsert;
export type InsertProduction = typeof productions.$inferInsert;
export type InsertBillingEvent = typeof billingEvents.$inferInsert;
export type InsertProvider = typeof providers.$inferInsert;
export type InsertRoutingRule = typeof routingRules.$inferInsert;
