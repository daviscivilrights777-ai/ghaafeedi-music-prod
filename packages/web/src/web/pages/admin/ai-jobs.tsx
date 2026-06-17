import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import { api } from "../../lib/api";
import AdminLayout, { AdminTable, StatusBadge, KpiCard, SectionCard, fmtDate } from "../admin-layout";

const PROVIDER_COLORS: Record<string, string> = {
  openai:  "#10A37F",
  sunorcc: "#8B5CF6",
  fal:     "#F59E0B",
  modal:   "#3B82F6",
  vastai:  "#EC4899",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  emotion_analysis: "Emotion Analysis",
  lyrics:          "Lyrics Gen",
  script:          "Script",
  storyboard:      "Storyboard",
  music_gen:       "Music Gen",
  video_gen:       "Video Gen",
  image_gen:       "Image Gen",
};

export default function AdminAiJobs() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) { setLocation("/signin?redirect=/admin/ai-jobs"); return; }
    fetchJobs();
  }, [session, isPending]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  async function fetchJobs() {
    try {
      const res = await api.admin["ai-jobs"].$get();
      if (!res.ok) { setError("Access denied"); setLoading(false); return; }
      const d = await res.json() as { jobs: any[] };
      setJobs(d.jobs);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }

  const filtered = statusFilter ? jobs.filter(j => j.status === statusFilter) : jobs;

  // KPIs
  const running = filtered.filter(j => j.status === "running").length;
  const queued = filtered.filter(j => j.status === "queued").length;
  const failed = filtered.filter(j => j.status === "failed").length;
  const totalCost = filtered.reduce((s, j) => s + (j.costCents ?? 0), 0);
  const avgDuration = filtered.filter(j => j.durationMs).reduce((s, j, i, a) => s + j.durationMs / a.length, 0);

  const rows = filtered.map(j => ({
    id: <span style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }}>{j.id.slice(0, 12)}…</span>,
    type: (
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
        {JOB_TYPE_LABELS[j.type] ?? j.type}
      </span>
    ),
    provider: (
      <span style={{
        fontSize: 11, fontWeight: 600, fontFamily: "monospace",
        color: PROVIDER_COLORS[j.provider] ?? "rgba(255,255,255,0.4)",
      }}>{j.provider ?? "—"}</span>
    ),
    status: <StatusBadge status={j.status} />,
    duration: j.durationMs ? (
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{(j.durationMs / 1000).toFixed(1)}s</span>
    ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>,
    cost: j.costCents ? (
      <span style={{ fontSize: 12, color: "#D4AF37" }}>${(j.costCents / 100).toFixed(4)}</span>
    ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>,
    error: j.errorMessage ? (
      <span style={{ fontSize: 11, color: "#F87171", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
        {j.errorMessage.slice(0, 50)}
      </span>
    ) : <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>,
    created: fmtDate(j.createdAt),
  }));

  return (
    <AdminLayout title="AI Job Monitor" subtitle="Real-time GPU & AI pipeline status">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Running" value={running} accent="#60A5FA" />
        <KpiCard label="Queued" value={queued} accent="#FBBF24" />
        <KpiCard label="Failed" value={failed} accent={failed > 0 ? "#F87171" : undefined} />
        <KpiCard label="Total Cost" value={`$${(totalCost / 100).toFixed(2)}`} sub="this batch" />
        <KpiCard label="Avg Duration" value={avgDuration ? `${(avgDuration / 1000).toFixed(1)}s` : "—"} />
      </div>

      <SectionCard>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            {["queued", "running", "completed", "failed"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={fetchJobs} style={refreshBtn}>↻ Refresh</button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Auto-refresh (5s)
          </label>
          {autoRefresh && (
            <span style={{
              fontSize: 11, color: "#22C55E", padding: "3px 8px",
              background: "rgba(34,197,94,0.1)", borderRadius: 20,
            }}>● LIVE</span>
          )}
        </div>
      </SectionCard>

      {/* Provider breakdown */}
      <SectionCard title="Jobs by Provider">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {Object.entries(
            jobs.reduce((acc: Record<string, number>, j) => {
              const p = j.provider ?? "unknown";
              acc[p] = (acc[p] ?? 0) + 1;
              return acc;
            }, {})
          ).map(([p, cnt]) => (
            <div key={p} style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 22, fontWeight: 700,
                fontFamily: "Playfair Display, serif",
                color: PROVIDER_COLORS[p] ?? "rgba(255,255,255,0.4)",
              }}>{cnt}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{p}</div>
            </div>
          ))}
          {jobs.length === 0 && (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>No jobs yet</span>
          )}
        </div>
      </SectionCard>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 40, color: "#F87171", fontSize: 13 }}>{error}</div>
      ) : (
        <AdminTable
          columns={[
            { key: "id", label: "Job ID", width: 120 },
            { key: "type", label: "Type" },
            { key: "provider", label: "Provider", width: 90 },
            { key: "status", label: "Status", width: 90 },
            { key: "duration", label: "Duration", width: 80 },
            { key: "cost", label: "Cost", width: 80 },
            { key: "error", label: "Error" },
            { key: "created", label: "Created", width: 110 },
          ]}
          rows={rows}
          emptyMsg="No AI jobs found"
        />
      )}
    </AdminLayout>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "9px 12px", background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(212,175,55,0.18)", borderRadius: 8,
  color: "#fff", fontSize: 12, fontFamily: "Inter, sans-serif",
  outline: "none", cursor: "pointer",
};
const refreshBtn: React.CSSProperties = {
  padding: "9px 16px", background: "rgba(212,175,55,0.1)",
  border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8,
  color: "#D4AF37", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif",
};
