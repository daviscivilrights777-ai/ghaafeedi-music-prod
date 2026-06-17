import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import { api } from "../../lib/api";
import AdminLayout, { AdminTable, StatusBadge, TierBadge, SectionCard, fmtDate } from "../admin-layout";

const GOLD = "#D4AF37";
const TIERS = ["", "free", "starter", "premium", "elite", "enterprise"];
const STATUSES = ["", "active", "suspended", "vip"];

export default function AdminMembers() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editMember, setEditMember] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) { setLocation("/signin?redirect=/admin/members"); return; }
    fetchMembers();
  }, [session, isPending]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await api.admin.members.$get();
      if (!res.ok) { setError("Access denied"); setLoading(false); return; }
      const d = await res.json() as { members: any[] };
      setMembers(d.members);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }

  async function saveMember() {
    if (!editMember) return;
    setSaving(true);
    try {
      await (api.admin.members as any)[":memberId"].$patch({
        param: { memberId: editMember.memberId },
        json: { tier: editMember.tier, status: editMember.status },
      });
      await fetchMembers();
      setEditMember(null);
    } catch { alert("Save failed"); }
    finally { setSaving(false); }
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.userEmail?.toLowerCase().includes(q) || m.userName?.toLowerCase().includes(q) || m.memberId?.toLowerCase().includes(q);
    const matchTier = !tierFilter || m.tier === tierFilter;
    const matchStatus = !statusFilter || m.status === statusFilter;
    return matchSearch && matchTier && matchStatus;
  });

  const rows = filtered.map(m => ({
    memberId: <span style={{ fontFamily: "monospace", fontSize: 12, color: GOLD }}>{m.memberId}</span>,
    name: m.userName ?? "—",
    email: <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{m.userEmail ?? "—"}</span>,
    tier: <TierBadge tier={m.tier} />,
    status: <StatusBadge status={m.status} />,
    joined: fmtDate(m.joinedAt),
    actions: (
      <button
        onClick={() => setEditMember({ ...m })}
        style={{
          padding: "4px 12px", borderRadius: 6, border: `1px solid rgba(212,175,55,0.3)`,
          background: "transparent", color: GOLD, fontSize: 11, cursor: "pointer",
          fontFamily: "Inter, sans-serif",
        }}
      >Edit</button>
    ),
  }));

  return (
    <AdminLayout title="Members" subtitle={`${filtered.length} members`}>
      {/* Filters */}
      <SectionCard>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, GM-ID…"
            style={inputStyle}
          />
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={selectStyle}>
            {TIERS.map(t => <option key={t} value={t}>{t || "All Tiers"}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            {STATUSES.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
          </select>
          <button onClick={fetchMembers} style={refreshBtn}>↻ Refresh</button>
        </div>
      </SectionCard>

      {loading ? (
        <Loader />
      ) : error ? (
        <Err msg={error} />
      ) : (
        <AdminTable
          columns={[
            { key: "memberId", label: "Member ID", width: 140 },
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "tier", label: "Tier", width: 100 },
            { key: "status", label: "Status", width: 90 },
            { key: "joined", label: "Joined", width: 120 },
            { key: "actions", label: "", width: 80 },
          ]}
          rows={rows}
          emptyMsg="No members match your filters"
        />
      )}

      {/* Edit modal */}
      {editMember && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => setEditMember(null)}>
          <div style={{
            background: "#07101F", border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: 16, padding: 32, minWidth: 340,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 6px", fontFamily: "Playfair Display, serif", color: "#fff" }}>Edit Member</h3>
            <p style={{ margin: "0 0 22px", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{editMember.memberId} · {editMember.userEmail}</p>

            <label style={labelStyle}>TIER</label>
            <select
              value={editMember.tier}
              onChange={e => setEditMember({ ...editMember, tier: e.target.value })}
              style={{ ...selectStyle, width: "100%", marginBottom: 16 }}
            >
              {["free", "starter", "premium", "elite", "enterprise"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <label style={labelStyle}>STATUS</label>
            <select
              value={editMember.status}
              onChange={e => setEditMember({ ...editMember, status: e.target.value })}
              style={{ ...selectStyle, width: "100%", marginBottom: 24 }}
            >
              {["active", "suspended", "vip"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveMember} disabled={saving} style={saveBtn}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditMember(null)} style={cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 14px", background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(212,175,55,0.18)", borderRadius: 8,
  color: "#fff", fontSize: 13, fontFamily: "Inter, sans-serif",
  outline: "none", minWidth: 240,
};
const selectStyle: React.CSSProperties = {
  padding: "9px 12px", background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(212,175,55,0.18)", borderRadius: 8,
  color: "#fff", fontSize: 12, fontFamily: "Inter, sans-serif",
  outline: "none", cursor: "pointer",
};
const refreshBtn: React.CSSProperties = {
  padding: "9px 16px", background: "rgba(212,175,55,0.1)",
  border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8,
  color: "#D4AF37", fontSize: 12, cursor: "pointer",
  fontFamily: "Inter, sans-serif",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, color: "rgba(255,255,255,0.4)",
  letterSpacing: "0.1em", marginBottom: 6,
};
const saveBtn: React.CSSProperties = {
  flex: 1, padding: "11px", background: "#D4AF37",
  border: "none", borderRadius: 8, color: "#050B1A",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
  fontFamily: "Inter, sans-serif",
};
const cancelBtn: React.CSSProperties = {
  padding: "11px 18px", background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
  color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer",
  fontFamily: "Inter, sans-serif",
};

function Loader() {
  return <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>;
}
function Err({ msg }: { msg: string }) {
  return <div style={{ textAlign: "center", padding: 40, color: "#F87171", fontSize: 13 }}>{msg}</div>;
}
