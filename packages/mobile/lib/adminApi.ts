/**
 * Ghaafeedi Music — Admin API client (mobile)
 * Direct fetch wrappers — typed, no hono client needed for admin routes.
 */

import Constants from "expo-constants";

const BASE =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:4200";

// ─── Auth token (stored after login) ─────────────────────────────────────────
let _token = "";
export const setAdminToken = (t: string) => { _token = t; };
export const getAdminToken = () => _token;

// Local QA bypass key — only active in dev builds
const QA_KEY = process.env.EXPO_PUBLIC_GM_ADMIN_QA_KEY ?? "";

function buildHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  if (QA_KEY)  h["X-Admin-QA-Key"] = QA_KEY;
  return h;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OverviewKPIs {
  totalMembers:      number;
  activeMembers:     number;
  totalOrders:       number;
  pendingOrders:     number;
  completedOrders:   number;
  totalRevenueCents: number;
  activeProductions: number;
  aiJobsRunning:     number;
  openTickets:       number;
}

export interface OverviewData {
  kpis:             OverviewKPIs;
  recentOrders:     Order[];
  revenueByProduct: RevenueProduct[];
  membersByTier:    TierCount[];
}

export interface Order {
  id:          string;
  status:      string;
  productName: string;
  priceCents:  number;
  createdAt:   string;
}

export interface RevenueProduct {
  productSlug: string;
  productName: string;
  totalCents:  number;
  orderCount:  number;
}

export interface TierCount {
  tier:  string;
  count: number;
}

export interface ProviderHealth {
  name:                string;
  displayName:         string;
  jobTypes:            string[];
  healthy:             boolean;
  latencyMs:           number | null;
  message:             string | null;
  balanceCents:        number | null;
  balanceStatus:       "ok" | "low" | "exhausted" | "unknown" | null;
  balanceDashboardUrl: string | null;
  checkedAt:           string;
}

export interface ProviderHealthResponse {
  ok:        boolean;
  summary:   string;
  providers: ProviderHealth[];
  checkedAt: string;
}

export interface ProviderRecord {
  id:                  string;
  name:                string;
  display_name:        string;
  enabled:             boolean;
  priority:            number;
  cost_per_unit:       number;
  unit:                string;
  max_concurrent:      number;
  hourly_budget_cents: number;
  job_types:           string[];
  adapterRegistered:   boolean;
}

export interface AiJob {
  id:         string;
  status:     string;
  jobType:    string;
  provider:   string;
  userId:     string;
  createdAt:  string;
  updatedAt:  string;
  attempts:   number;
  maxAttempts: number;
}

export interface QueueStats {
  depths:      Record<string, number>;
  activeCount: number;
}

export interface RevenueData {
  totalRevenueCents: number;
  revenueByProduct:  RevenueProduct[];
  recentOrders:      Order[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const adminApi = {
  overview:     () => get<OverviewData>("/api/admin/overview"),
  providers:    () => get<{ providers: ProviderRecord[] }>("/api/providers"),
  providerHealth: () => get<ProviderHealthResponse>("/api/providers/health"),
  jobs:         () => get<{ jobs: AiJob[] }>("/api/jobs"),
  adminQueue:   () => get<QueueStats>("/api/jobs/admin/queue"),
  revenue:      () => get<RevenueData>("/api/admin/revenue"),

  toggleProvider: (name: string, enabled: boolean) =>
    patch<{ success: boolean }>(`/api/admin/providers/${name}`, { enabled }),

  setBudget: (name: string, hourly_budget_cents: number) =>
    patch<{ success: boolean }>(`/api/admin/providers/${name}`, { hourly_budget_cents }),
};
