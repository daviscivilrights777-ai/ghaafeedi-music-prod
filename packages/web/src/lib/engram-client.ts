/**
 * Engram REST Client — Ghaafeedi Music
 *
 * Thin typed wrapper around the real engram API surface.
 * Source of truth: https://github.com/Harshitk-cp/engram
 *
 * Real endpoints:
 *   POST   /v1/agents                      — register an agent (idempotent by external_id)
 *   POST   /v1/memories                    — store a memory
 *   GET    /v1/memories/recall?...         — semantic recall
 *   GET    /v1/memories?agent_id=...       — list all memories for agent
 *   GET    /v1/audit/verify                — verify SHA-256 chain
 *   DELETE /v1/anchors/:anchorId?purge=true — GDPR per-subject crypto-shred
 *   GET    /health                          — health check (no /v1 prefix!)
 *
 * Env vars:
 *   ENGRAM_BASE_URL  — e.g. https://engram-ghaafeedi.up.railway.app
 *   ENGRAM_API_KEY   — master key issued by POST /v1/setup
 *   ENGRAM_AGENT_ID  — sophia agent UUID (registered once, stored here)
 *
 * All public methods fail silently (return null/[]) so engram being
 * unreachable never breaks the main product flow.
 */

const BASE_URL  = (process.env.ENGRAM_BASE_URL  ?? "").replace(/\/$/, "");
const API_KEY   = process.env.ENGRAM_API_KEY   ?? "";
const AGENT_ID  = process.env.ENGRAM_AGENT_ID  ?? "";   // optional — used as default

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryType = "preference" | "fact" | "decision" | "constraint";

/** Raw memory shape returned by engram */
export interface EngramMemory {
  id:                 string;
  agent_id:           string;
  content:            string;
  memory_type:        MemoryType;
  confidence:         number;          // 0.0 – 1.0 (engram calls this confidence, not importance)
  tier:               "hot" | "warm" | "cold" | "archive";
  anchor_external_id?: string | null;  // the subjectId / userId we pass in
  source:             "user" | "agent" | "tool" | "derived";
  created_at:         string;          // ISO
  updated_at:         string;
  metadata?:          Record<string, unknown>;
}

export interface StoreMemoryInput {
  agentId:            string;          // sophia_${userId} or pipeline_${type}
  content:            string;
  memoryType:         MemoryType;
  /** userId — used as anchor_external_id for per-subject GDPR erasure */
  subjectExternalId?: string;
  /** 0.0–1.0, default 0.8 */
  confidence?:        number;
  source?:            "user" | "agent" | "tool" | "derived";
  metadata?:          Record<string, unknown>;
}

export interface RecallInput {
  agentId:            string;
  query:              string;
  subjectExternalId?: string;          // filter to one user's memories
  memoryType?:        MemoryType;
  limit?:             number;          // default 10
  minConfidence?:     number;          // default 0.3
}

export interface AuditVerifyResult {
  ok:      boolean;
  valid:   boolean;
  error?:  string;
}

export interface EngramHealthResult {
  ok:        boolean;
  status:    "healthy" | "degraded" | "unreachable";
  latencyMs?: number;
  error?:    string;
}

// ─── Internal fetch ───────────────────────────────────────────────────────────

async function engramFetch<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 6000,
): Promise<T | null> {
  if (!BASE_URL || !API_KEY) return null;   // not configured — silent

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${API_KEY}`,
        ...((options.headers ?? {}) as Record<string, string>),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      console.warn(`[Engram] ${options.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn(`[Engram] ${path} unreachable:`, err?.message ?? err);
    }
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const EngramClient = {

  /**
   * Register an agent by external_id. Idempotent — safe to call on every
   * Sophia session start. Returns the agent UUID or null.
   */
  async ensureAgent(externalId: string, name: string): Promise<string | null> {
    const res = await engramFetch<{ id: string }>("/v1/agents", {
      method: "POST",
      body: JSON.stringify({ external_id: externalId, name }),
    });
    return res?.id ?? null;
  },

  /**
   * Store a single memory. Returns the created memory or null on failure.
   */
  async store(input: StoreMemoryInput): Promise<EngramMemory | null> {
    return engramFetch<EngramMemory>("/v1/memories", {
      method: "POST",
      body: JSON.stringify({
        agent_id:            input.agentId,
        content:             input.content,
        memory_type:         input.memoryType,
        confidence:          input.confidence ?? 0.8,
        source:              input.source ?? "agent",
        anchor_external_id:  input.subjectExternalId ?? null,
        metadata:            input.metadata ?? {},
      }),
    });
  },

  /**
   * Semantic recall — returns top-k memories relevant to query.
   * Returns [] on failure (agents degrade to DB context gracefully).
   */
  async recall(input: RecallInput): Promise<EngramMemory[]> {
    const params = new URLSearchParams({
      agent_id: input.agentId,
      query:    input.query,
      limit:    String(input.limit ?? 10),
    });
    if (input.subjectExternalId) params.set("anchor_external_id", input.subjectExternalId);
    if (input.memoryType)        params.set("memory_type", input.memoryType);
    if (input.minConfidence)     params.set("min_confidence", String(input.minConfidence));

    const res = await engramFetch<{ memories: EngramMemory[] }>(
      `/v1/memories/recall?${params.toString()}`,
    );
    return res?.memories ?? [];
  },

  /**
   * List all memories for an agent (optionally filtered to one subject).
   */
  async listByAgent(agentId: string, subjectExternalId?: string): Promise<EngramMemory[]> {
    const params = new URLSearchParams({ agent_id: agentId });
    if (subjectExternalId) params.set("anchor_external_id", subjectExternalId);

    const res = await engramFetch<{ memories: EngramMemory[] }>(
      `/v1/memories?${params.toString()}`,
    );
    return res?.memories ?? [];
  },

  /**
   * GDPR Art.17 subject erasure — crypto-shreds ALL memories for an anchor.
   * anchorId must be the engram anchor UUID (not external_id).
   * Returns true on success.
   */
  async eraseSubject(anchorId: string): Promise<boolean> {
    const res = await engramFetch<{ ok: boolean }>(
      `/v1/anchors/${anchorId}?purge=true`,
      { method: "DELETE" },
      15_000,   // longer timeout for full crypto-shred
    );
    return res?.ok === true;
  },

  /**
   * Look up an anchor UUID by external_id (userId).
   * Needed before eraseSubject — returns null if not found.
   */
  async findAnchor(externalId: string): Promise<string | null> {
    const res = await engramFetch<{ anchors: { id: string; external_id: string }[] }>(
      `/v1/anchors?external_id=${encodeURIComponent(externalId)}`,
    );
    return res?.anchors?.[0]?.id ?? null;
  },

  /**
   * Verify the tamper-evident SHA-256 audit chain for the whole tenant.
   */
  async verifyAudit(): Promise<AuditVerifyResult | null> {
    const res = await engramFetch<{ valid: boolean; error?: string }>("/v1/audit/verify");
    if (!res) return null;
    return { ok: true, valid: res.valid, error: res.error };
  },

  /**
   * Health check — call on startup and from admin panel.
   * NOTE: engram health is at /health, NOT /v1/health.
   */
  async health(): Promise<EngramHealthResult> {
    const t0 = Date.now();

    if (!BASE_URL || !API_KEY) {
      return { ok: false, status: "unreachable", error: "ENGRAM_BASE_URL or ENGRAM_API_KEY not set" };
    }

    const res = await engramFetch<{ status?: string; message?: string }>("/health", {}, 4000);
    const latencyMs = Date.now() - t0;

    if (!res) {
      return { ok: false, status: "unreachable", latencyMs, error: "No response from engram" };
    }

    const isHealthy = res.status === "ok" || res.message === "ok" || res.status === "healthy";
    return {
      ok:        isHealthy,
      status:    isHealthy ? "healthy" : "degraded",
      latencyMs,
    };
  },

  /** True if env vars are present. */
  isConfigured(): boolean {
    return Boolean(BASE_URL && API_KEY);
  },

  /** Default agent ID from env (Sophia). */
  defaultAgentId(): string {
    return AGENT_ID;
  },
};
