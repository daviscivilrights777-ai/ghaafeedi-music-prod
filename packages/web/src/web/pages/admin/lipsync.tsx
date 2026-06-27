import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import AdminLayout, { AdminTable, StatusBadge, KpiCard, SectionCard, fmtDate } from "../admin-layout";

const GOLD = "#D4AF37";

interface LipSyncJob {
  id: string;
  userId: string;
  userEmail: string | null;
  orderId: string | null;
  status: string;
  provider: string | null;
  costCents: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  retryCount: number | null;
  outputUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  productionTitle?: string | null;
}

interface LipSyncStats {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  totalCostCents: number;
  avgDurationMs: number;
}

export default function AdminLipSync() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [jobs, setJobs] = useState<LipSyncJob[]>([]);
  const [stats, setStats] = useState<LipSyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) { setLocation("/signin?redirect=/admin/lipsync"); return; }
    fetchJobs();
  }, [session, isPending]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchJobs, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/admin/lipsync", { credentials: "include" });
      if (!res.ok) { setError("Access denied"); setLoading(false); return; }
      const d = await res.json() as { jobs: LipSyncJob[]; stats: LipSyncStats };
      setJobs(d.jobs ?? []);
      setStats(d.stats ?? null);
    } catch { setError("Failed to load lip sync jobs"); }
    finally { setLoading(false); }
  }

  async function handleRetry(jobId: string) {
    setActionLoading(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await fetch(`/api/admin/lipsync/${jobId}/retry`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) { await fetchJobs(); }
    } catch {}
    setActionLoading(prev => ({ ...prev, [jobId]: false }));
  }

  async function handleCancel(jobId: string) {
    if (!confirm("Cancel this lip sync job?")) return;
    setActionLoading(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await fetch(`/api/admin/lipsync/${jobId}/cancel`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) { await fetchJobs(); }
    } catch {}
    setActionLoading(prev => ({ ...prev, [jobId]: false }));
  }

  const filtered = statusFilter ? jobs.filter(j => j.status === statusFilter) : jobs;

  const rows = filtered.map(j => ({
    id: (
      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }}>
        {j.id.slice(0, 12)}…
      </span>
    ),
    member: (
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
        {j.userEmail ?? j.userId.slice(0, 8) + "…"}
      </span>
    ),
    title: (
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", maxWidth: 120, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {j.productionTitle ?? "—"}
      </span>
    ),
    status: <StatusBadge status={j.status} />,
    provider: (
      <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: j.provider === "latentsync" ? "#F59E0B" : "rgba(255,255,255,0.4)" }}>
        {j.provider ?? "—"}
      </span>
    ),
    duration: j.durationMs ? (
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{(j.durationMs / 1000).toFixed(1)}s</span>
    ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>,
    cost: j.costCents ? (
      <span style={{ fontSize: 12, color: GOLD }}>${(j.costCents / 100).toFixed(4)}</span>
    ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>,
    retries: (
      <span style={{ fontSize: 12, color: (j.retryCount ?? 0) > 0 ? "#FBBF24" : "rgba(255,255,255,0.3)" }}>
        {j.retryCount ?? 0}
      </span>
    ),
    output: j.outputUrl ? (
      <button
        onClick={() => setPreviewUrl(j.outputUrl!)}
        style={{ fontSize: 11, color: GOLD, background: "none", border: `1px solid ${GOLD}30`, borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
      >
        ▶ Preview
      </button>
    ) : <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>,
    error: j.errorMessage ? (
      <span style={{ fontSize: 11, color: "#F87171", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", display: "block" }} title={j.errorMessage}>
        {j.errorMessage.slice(0, 40)}…
      </span>
    ) : <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>,
    created: fmtDate(j.createdAt),
    actions: (
      <div style={{ display: "flex", gap: 6 }}>
        {j.status === "failed" && (
          <button
            disabled={actionLoading[j.id]}
            onClick={() => handleRetry(j.id)}
            style={actionBtnStyle("#60A5FA")}
            title="Retry job"
          >
            {actionLoading[j.id] ? "…" : "↻"}
          </button>
        )}
        {(j.status === "queued" || j.status === "dispatched") && (
          <button
            disabled={actionLoading[j.id]}
            onClick={() => handleCancel(j.id)}
            style={actionBtnStyle("#F87171")}
            title="Cancel job"
          >
            {actionLoading[j.id] ? "…" : "✕"}
          </button>
        )}
      </div>
    ),
  }));

  return (
    <AdminLayout title="Lip Sync Monitor" subtitle="FAL.ai LatentSync job tracking & controls">
      {/* ── KPI row ── */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
          <KpiCard label="Total Jobs"  value={stats.total} />
          <KpiCard label="Queued"      value={stats.queued}    accent="#FBBF24" />
          <KpiCard label="Running"     value={stats.running}   accent="#60A5FA" />
          <KpiCard label="Completed"   value={stats.completed} accent="#34D399" />
          <KpiCard label="Failed"      value={stats.failed}    accent={stats.failed > 0 ? "#F87171" : undefined} />
          <KpiCard label="Total Cost"  value={`$${((stats.totalCostCents ?? 0) / 100).toFixed(2)}`} sub="all jobs" />
          <KpiCard label="Avg Duration" value={stats.avgDurationMs ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : "—"} />
        </div>
      )}

      {/* ── Filters + controls ── */}
      <SectionCard>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            {["queued", "dispatched", "running", "completed", "failed", "cancelled"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={fetchJobs} style={refreshBtnStyle}>↻ Refresh</button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Auto-refresh (5s)
          </label>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            {filtered.length} job{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,0.3)" }}>Loading…</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 48, color: "#F87171" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>No lip sync jobs found</div>
          </div>
        ) : (
          <AdminTable
            columns={[
              {key:"id",label:"ID"},{key:"member",label:"Member"},{key:"title",label:"Title"},
              {key:"status",label:"Status"},{key:"provider",label:"Provider"},{key:"duration",label:"Duration"},
              {key:"cost",label:"Cost"},{key:"retries",label:"Retries"},{key:"output",label:"Output"},
              {key:"error",label:"Error"},{key:"created",label:"Created"},{key:"actions",label:"Actions"},
            ]}
            rows={rows}
          />
        )}
      </SectionCard>

      {/* ── Video preview modal ── */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#07101F", border: `1px solid ${GOLD}30`,
              borderRadius: 16, padding: 24, maxWidth: 720, width: "90%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "Playfair Display, serif", color: GOLD, fontSize: 18 }}>Lip Sync Preview</span>
              <button
                onClick={() => setPreviewUrl(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <video
              src={previewUrl}
              controls
              autoPlay
              style={{ width: "100%", borderRadius: 10, background: "#000" }}
            />
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: GOLD, textDecoration: "none" }}
              >
                ↗ Open in new tab
              </a>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const selectStyle: React.CSSProperties = {
  background: "#0F1A2E",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.7)",
  padding: "6px 12px",
  borderRadius: 8,
  fontSize: 13,
  cursor: "pointer",
};

const refreshBtnStyle: React.CSSProperties = {
  background: "rgba(212,175,55,0.12)",
  border: "1px solid rgba(212,175,55,0.3)",
  color: "#D4AF37",
  padding: "6px 14px",
  borderRadius: 8,
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 600,
};

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}18`,
    border: `1px solid ${color}40`,
    color,
    padding: "3px 9px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 700,
  };
}
