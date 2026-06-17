import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import { api } from "../../lib/api";
import AdminLayout, { AdminTable, SectionCard, fmtDate } from "../admin-layout";

const ACTION_COLORS: Record<string, string> = {
  "account.created":        "#22C55E",
  "account.signin":         "#60A5FA",
  "member.created":         "#D4AF37",
  "product.acknowledged":   "#A78BFA",
  "product.purchased":      "#22C55E",
  "payment.completed":      "#22C55E",
  "payment.failed":         "#F87171",
  "payment.refunded":       "#FB923C",
  "production.created":     "#60A5FA",
  "production.delivered":   "#22C55E",
  "ai.job_started":         "#FBBF24",
  "ai.job_completed":       "#22C55E",
  "account.suspended":      "#F87171",
};

export default function AdminAuditLogs() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) { setLocation("/signin?redirect=/admin/audit-logs"); return; }
    fetchLogs();
  }, [session, isPending]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await api.admin["audit-logs"].$get();
      if (!res.ok) { setError("Access denied"); setLoading(false); return; }
      const d = await res.json() as { logs: any[] };
      setLogs(d.logs);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }

  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.memberId?.toLowerCase().includes(q) ||
      l.entity?.toLowerCase().includes(q) ||
      l.entityId?.toLowerCase().includes(q)
    );
  });

  const rows = filtered.map(l => ({
    time: <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{
      l.createdAt ? new Date(l.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"
    }</span>,
    action: (
      <span style={{
        fontSize: 11, fontFamily: "monospace", fontWeight: 600,
        color: ACTION_COLORS[l.action] ?? "rgba(255,255,255,0.5)",
      }}>{l.action}</span>
    ),
    member: <span style={{ fontFamily: "monospace", fontSize: 11, color: "#D4AF37" }}>{l.memberId ?? "—"}</span>,
    entity: <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{l.entity ?? "—"}</span>,
    entityId: <span style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }}>{l.entityId ? l.entityId.slice(0, 14) + "…" : "—"}</span>,
    ip: <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{l.ip ?? "—"}</span>,
    meta: l.metadata ? (
      <span style={{
        fontSize: 10, color: "rgba(255,255,255,0.25)",
        maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", display: "block",
        whiteSpace: "nowrap",
      }}>{l.metadata.slice(0, 60)}</span>
    ) : <span style={{ color: "rgba(255,255,255,0.1)" }}>—</span>,
  }));

  return (
    <AdminLayout title="Audit Logs" subtitle={`${filtered.length} events`}>
      <SectionCard>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by action, GM-ID, entity…"
            style={inputStyle}
          />
          <button onClick={fetchLogs} style={refreshBtn}>↻ Refresh</button>
        </div>
      </SectionCard>

      {/* Action legend */}
      <SectionCard title="Action Types">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(ACTION_COLORS).map(([action, color]) => (
            <span key={action} style={{
              padding: "2px 8px", borderRadius: 20, fontSize: 10,
              background: color + "18", color, fontFamily: "monospace",
              border: `1px solid ${color}30`,
            }}>{action}</span>
          ))}
        </div>
      </SectionCard>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 40, color: "#F87171", fontSize: 13 }}>{error}</div>
      ) : (
        <AdminTable
          columns={[
            { key: "time", label: "Time", width: 150 },
            { key: "action", label: "Action" },
            { key: "member", label: "GM-ID", width: 120 },
            { key: "entity", label: "Entity", width: 100 },
            { key: "entityId", label: "Entity ID", width: 130 },
            { key: "ip", label: "IP", width: 100 },
            { key: "meta", label: "Metadata" },
          ]}
          rows={rows}
          emptyMsg="No audit logs found"
        />
      )}
    </AdminLayout>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 14px", background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(212,175,55,0.18)", borderRadius: 8,
  color: "#fff", fontSize: 13, fontFamily: "Inter, sans-serif",
  outline: "none", minWidth: 280,
};
const refreshBtn: React.CSSProperties = {
  padding: "9px 16px", background: "rgba(212,175,55,0.1)",
  border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8,
  color: "#D4AF37", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif",
};
