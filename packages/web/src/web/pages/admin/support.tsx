import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import { api } from "../../lib/api";
import AdminLayout, { AdminTable, StatusBadge, SectionCard, fmtDate } from "../admin-layout";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#F87171",
  high:   "#FB923C",
  normal: "#FBBF24",
  low:    "#94A3B8",
};

export default function AdminSupport() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) { setLocation("/signin?redirect=/admin/support"); return; }
    fetchTickets();
  }, [session, isPending]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await api.admin.support.$get();
      if (!res.ok) { setError("Access denied"); setLoading(false); return; }
      const d = await res.json() as { tickets: any[] };
      setTickets(d.tickets);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }

  const filtered = tickets.filter(t => {
    const matchStatus = !statusFilter || t.status === statusFilter;
    const matchPriority = !priorityFilter || t.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const urgent = filtered.filter(t => t.priority === "urgent" || t.priority === "high").length;
  const open = filtered.filter(t => t.status === "open").length;

  const rows = filtered.map(t => ({
    id: <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94A3B8" }}>{t.id.slice(0, 10)}…</span>,
    member: <span style={{ fontFamily: "monospace", fontSize: 12, color: "#D4AF37" }}>{t.memberId ?? "—"}</span>,
    customer: <span style={{ fontSize: 12 }}>{t.userName ?? t.userEmail ?? "—"}</span>,
    subject: <span style={{ fontSize: 13 }}>{t.subject}</span>,
    priority: (
      <span style={{
        fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
        color: PRIORITY_COLORS[t.priority] ?? "#94A3B8",
      }}>{t.priority}</span>
    ),
    status: <StatusBadge status={t.status} />,
    assignedTo: <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{t.assignedTo ?? "—"}</span>,
    created: fmtDate(t.createdAt),
  }));

  return (
    <AdminLayout title="Support" subtitle={`${open} open · ${urgent} urgent/high`}>
      <SectionCard>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            {["open", "in_progress", "resolved", "closed"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={selectStyle}>
            <option value="">All Priorities</option>
            {["urgent", "high", "normal", "low"].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button onClick={fetchTickets} style={refreshBtn}>↻ Refresh</button>
        </div>
      </SectionCard>

      {/* Urgent banner */}
      {urgent > 0 && (
        <div style={{
          background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
          borderRadius: 10, padding: "12px 18px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <span style={{ fontSize: 13, color: "#F87171", fontWeight: 600 }}>
            {urgent} urgent/high priority ticket{urgent > 1 ? "s" : ""} require attention
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 40, color: "#F87171", fontSize: 13 }}>{error}</div>
      ) : (
        <AdminTable
          columns={[
            { key: "id", label: "Ticket ID", width: 110 },
            { key: "member", label: "GM-ID", width: 120 },
            { key: "customer", label: "Customer" },
            { key: "subject", label: "Subject" },
            { key: "priority", label: "Priority", width: 80 },
            { key: "status", label: "Status", width: 100 },
            { key: "assignedTo", label: "Assigned", width: 100 },
            { key: "created", label: "Created", width: 110 },
          ]}
          rows={rows}
          emptyMsg="No tickets found"
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
