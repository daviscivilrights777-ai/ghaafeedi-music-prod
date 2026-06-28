/**
 * Engram.to REST Client — Ghaafeedi Music
 *
 * engram.to has a Python SDK only. This is a typed thin HTTP wrapper
 * against the REST API for use in Bun/Hono TypeScript services.
 *
 * Env vars:
 *   ENGRAM_BASE_URL  — e.g. https://your-engram-instance.railway.app
 *   ENGRAM_API_KEY   — issued by engram.to
 *
 * All methods are safe to call even if engram is unreachable — they
 * return null/false and log a warning rather than throwing.
 */

const BASE_URL = (process.env.ENGRAM_BASE_URL ?? "").replace(/\/$/, "");
const API_KEY  = process.env.ENGRAM_API_KEY ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryType = "semantic" | "episodic" | "procedural";

export interface EngramMemory {
  id:          string;
  agentId:     string;
  subjectId:   string;
  content:     string;
  memoryType:  MemoryType;
  importance:  number;          // 0.0 – 1.0
  tags:        string[];
  storedAt:    string;          // ISO timestamp
  expiresAt?:  string | null;
  auditHash?:  string | null;   // SHA-256 chain hash for GDPR
  metadata?:   Record<string, unknown>;
}

export interface StoreMemoryInput {
  agentId:    string;           // e.g. "sophia_user123"
  subjectId:  string;           // userId — for GDPR subject erasure
  content:    string;
  memoryType: MemoryType;
  importance?: number;          // default 0.7
  tags?:       string[];
  ttlDays?:    number;          // omit = permanent
  metadata?:   Record<string, unknown>;
}

export interface RecallInput {
  agentId:    string;
  subjectId:  string;
  query:      string;           // semantic similarity query
  memoryType?: MemoryType;
  limit?:      number;          // default 10
  minImportance?: number;       // filter by importance threshold
}

export interface EraseResult {
  ok:             boolean;
  memoriesErased: number;
  receiptHash:    string;       // cryptographic erasure receipt (GDPR Art.17)
  erasedAt:       string;
}

export interface AuditVerifyResult {
  ok:      boolean;
  valid:   boolean;
  chainId: string;
  errors?: string[];
}

export interface EngramHealthResult {
  ok:        boolean;
  status:    "healthy" | "degraded" | "unreachable";
  latencyMs?: number;
  version?:   string;
  error?:     string;
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function engramFetch<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 5000,
): Promise<T | null> {
  if (!BASE_URL || !API_KEY) {
    // Engram not configured — silent fallback
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        ...(options.headers as Record<string, string> ?? {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      console.warn(`[Engram] ${options.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }

    return await res.json() as T;
  } catch (err: any) {
    // timeout, network error, DNS failure — fail silently
    if (err?.name !== "AbortError") {
      console.warn(`[Engram] ${path} unreachable:`, err?.message ?? err);
    }
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const EngramClient = {
  /**
   * Store a single memory for an agent+subject pair.
   * Returns the stored memory or null on failure.
   */
  async store(input: StoreMemoryInput): Promise<EngramMemory | null> {
    return engramFetch<EngramMemory>("/v1/memories/store", {
      method: "POST",
      body: JSON.stringify({
        agent_id:    input.agentId,
        subject_id:  input.subjectId,
        content:     input.content,
        memory_type: input.memoryType,
        importance:  input.importance ?? 0.7,
        tags:        input.tags ?? [],
        ttl_days:    input.ttlDays ?? null,
        metadata:    input.metadata ?? {},
      }),
    });
  },

  /**
   * Batch store multiple memories in one request.
   * Returns count stored or 0 on failure.
   */
  async storeBatch(inputs: StoreMemoryInput[]): Promise<number> {
    if (inputs.length === 0) return 0;
    const res = await engramFetch<{ stored: number }>("/v1/memories/store/batch", {
      method: "POST",
      body: JSON.stringify({
        memories: inputs.map((m) => ({
          agent_id:    m.agentId,
          subject_id:  m.subjectId,
          content:     m.content,
          memory_type: m.memoryType,
          importance:  m.importance ?? 0.7,
          tags:        m.tags ?? [],
          ttl_days:    m.ttlDays ?? null,
          metadata:    m.metadata ?? {},
        })),
      }),
    });
    return res?.stored ?? 0;
  },

  /**
   * Semantic recall — returns top-k memories relevant to query.
   * Falls back to [] on failure (agents degrade gracefully to DB context).
   */
  async recall(input: RecallInput): Promise<EngramMemory[]> {
    const res = await engramFetch<{ memories: EngramMemory[] }>("/v1/memories/recall", {
      method: "POST",
      body: JSON.stringify({
        agent_id:       input.agentId,
        subject_id:     input.subjectId,
        query:          input.query,
        memory_type:    input.memoryType ?? null,
        limit:          input.limit ?? 10,
        min_importance: input.minImportance ?? 0.3,
      }),
    });
    return res?.memories ?? [];
  },

  /**
   * List all memories for a subject (for admin inspection / GDPR).
   * Returns [] on failure.
   */
  async listBySubject(subjectId: string, agentPrefix?: string): Promise<EngramMemory[]> {
    const params = new URLSearchParams({ subject_id: subjectId });
    if (agentPrefix) params.set("agent_prefix", agentPrefix);
    const res = await engramFetch<{ memories: EngramMemory[] }>(
      `/v1/memories?${params.toString()}`,
    );
    return res?.memories ?? [];
  },

  /**
   * GDPR Art.17 subject erasure — deletes ALL memories for a subjectId
   * across ALL agents. Returns a cryptographic erasure receipt.
   */
  async eraseSubject(subjectId: string): Promise<EraseResult | null> {
    return engramFetch<EraseResult>("/v1/subjects/erase", {
      method: "DELETE",
      body: JSON.stringify({ subject_id: subjectId }),
    }, 15_000); // longer timeout for full erasure
  },

  /**
   * Verify the audit chain for a subject (GDPR integrity check).
   */
  async verifyAudit(subjectId: string): Promise<AuditVerifyResult | null> {
    return engramFetch<AuditVerifyResult>(`/v1/audit/verify?subject_id=${subjectId}`);
  },

  /**
   * Health check — call on startup and from admin panel.
   */
  async health(): Promise<EngramHealthResult> {
    const t0 = Date.now();

    if (!BASE_URL || !API_KEY) {
      return { ok: false, status: "unreachable", error: "ENGRAM_BASE_URL or ENGRAM_API_KEY not set" };
    }

    const res = await engramFetch<{ status: string; version?: string }>("/v1/health", {}, 3000);
    const latencyMs = Date.now() - t0;

    if (!res) {
      return { ok: false, status: "unreachable", latencyMs, error: "No response from engram instance" };
    }

    return {
      ok:        res.status === "ok" || res.status === "healthy",
      status:    res.status === "ok" || res.status === "healthy" ? "healthy" : "degraded",
      latencyMs,
      version:   res.version,
    };
  },

  /** True if engram is configured (env vars present). */
  isConfigured(): boolean {
    return Boolean(BASE_URL && API_KEY);
  },
};
