/**
 * Engram REST Client — Ghaafeedi Music
 *
 * Verified against live endpoint: https://engram-memory-production.up.railway.app
 *
 * Real endpoints (NO /v1 prefix):
 *   POST /store          — { agent_id, text, metadata? } → { success, memory_id, category }
 *   POST /search         — { agent_id, query, limit? }   → { results: SearchResult[] }
 *   POST /forget         — { agent_id, memory_id }       → { success }
 *   GET  /dashboard/stats                                → DashboardStats
 *   GET  /health                                         → { status, tiers, uptime_seconds }
 *
 * Env vars:
 *   ENGRAM_BASE_URL  — e.g. https://engram-memory-production.up.railway.app
 *   ENGRAM_API_KEY   — api key (sent as Bearer token)
 *
 * All public methods fail silently (return null/[]) — engram being
 * unreachable NEVER breaks the main product flow.
 */

const BASE_URL = (process.env.ENGRAM_BASE_URL ?? "").replace(/\/$/, "");
const API_KEY  = process.env.ENGRAM_API_KEY  ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoreResult {
  success:   boolean;
  memory_id: string;
  category:  string;
  conflicts: unknown[];
}

export interface SearchResult {
  doc_id:          string;
  content_preview: string;
  score:           number;
  confidence:      "high" | "medium" | "low";
  category:        string;
  created_at:      number; // unix timestamp
}

export interface SearchResponse {
  query:        string;
  total_results: number;
  tiers_used:   string[];
  results:      SearchResult[];
}

export interface DashboardStats {
  total_memories: number;
  categories:     Record<string, number>;
  tiers:          { hot: number; total: number };
  graph:          Record<string, number>;
  growth:         { hour: string; count: number }[];
  uptime_seconds: number;
}

export interface EngramHealthResult {
  ok:         boolean;
  status:     "healthy" | "degraded" | "unreachable";
  latencyMs?: number;
  totalMemories?: number;
  error?:     string;
}

// ─── Internal fetch ───────────────────────────────────────────────────────────

async function engramFetch<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 6000,
): Promise<T | null> {
  if (!BASE_URL) return null; // not configured — silent

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers ?? {}) as Record<string, string>),
    };
    if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
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
   * Store a memory.
   * @param agentId  e.g. "production_userId" / "sophia_userId"
   * @param text     The memory content (natural language)
   * @param metadata Optional structured context
   */
  async store(
    agentId: string,
    text: string,
    metadata?: Record<string, unknown>,
  ): Promise<StoreResult | null> {
    return engramFetch<StoreResult>("/store", {
      method: "POST",
      body: JSON.stringify({ agent_id: agentId, text, metadata: metadata ?? {} }),
    });
  },

  /**
   * Semantic search over an agent's memories.
   */
  async search(
    agentId: string,
    query: string,
    limit = 10,
  ): Promise<SearchResult[]> {
    const res = await engramFetch<SearchResponse>("/search", {
      method: "POST",
      body: JSON.stringify({ agent_id: agentId, query, limit }),
    });
    return res?.results ?? [];
  },

  /**
   * Delete a specific memory by ID.
   */
  async forget(agentId: string, memoryId: string): Promise<boolean> {
    const res = await engramFetch<{ success: boolean }>("/forget", {
      method: "POST",
      body: JSON.stringify({ agent_id: agentId, memory_id: memoryId }),
    });
    return res?.success === true;
  },

  /**
   * Dashboard stats — total memories, categories, growth.
   * Used by admin panel health card.
   */
  async stats(): Promise<DashboardStats | null> {
    return engramFetch<DashboardStats>("/dashboard/stats", {}, 4000);
  },

  /**
   * Health check — call on startup and from admin panel.
   */
  async health(): Promise<EngramHealthResult> {
    const t0 = Date.now();

    if (!BASE_URL) {
      return { ok: false, status: "unreachable", error: "ENGRAM_BASE_URL not set" };
    }

    const res = await engramFetch<{ status?: string; tiers?: unknown; uptime_seconds?: number }>(
      "/health",
      {},
      4000,
    );
    const latencyMs = Date.now() - t0;

    if (!res) {
      return { ok: false, status: "unreachable", latencyMs, error: "No response" };
    }

    const isHealthy = res.status === "healthy";

    // also grab stats for total_memories
    const statsRes = await engramFetch<DashboardStats>("/dashboard/stats", {}, 3000);

    return {
      ok:             isHealthy,
      status:         isHealthy ? "healthy" : "degraded",
      latencyMs,
      totalMemories:  statsRes?.total_memories ?? 0,
    };
  },

  isConfigured(): boolean {
    return Boolean(BASE_URL);
  },
};
