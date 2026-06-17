import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import { api } from "../../lib/api";
import AdminLayout, { AdminTable, StatusBadge, SectionCard, fmtDate } from "../admin-layout";

const GOLD = "#D4AF37";

const STAGES = [
  "queued","story_submitted","media_uploaded","ai_analyzing","ai_complete",
  "music_generating","music_complete","video_generating","video_complete",
  "in_review","revision_requested","delivered","archived",
];

const STAGE_COLORS: Record<string, string> = {
  queued:            "#94A3B8",
  story_submitted:   "#60A5FA",
  media_uploaded:    "#60A5FA",
  ai_analyzing:      "#A78BFA",
  ai_complete:       "#C084FC",
  music_generating:  "#FBBF24",
  music_complete:    "#FCD34D",
  video_generating:  "#FB923C",
  video_complete:    "#F97316",
  in_review:         "#D4AF37",
  revision_requested:"#F87171",
  delivered:         "#22C55E",
  archived:          "#475569",
};

export default function AdminProductions() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [prods, setProds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editProd, setEditProd] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) { setLocation("/signin?redirect=/admin/productions"); return; }
    fetchProductions();
  }, [session, isPending]);

  async function fetchProductions() {
    setLoading(true);
    try {
      const res = await api.admin.productions.$get();
      if (!res.ok) { setError("Access denied"); setLoading(false); return; }
      const d = await res.json() as { productions: any[] };
      setProds(d.productions);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }

  async function saveProd() {
    if (!editProd) return;
    setSaving(true);
    try {
      await (api.admin.productions as any)[":id"].$patch({
        param: { id: editProd.id },
        json: { status: editProd.status, currentStage: editProd.currentStage, notes: editProd.notes },
      });
      await fetchProductions();
      setEditProd(null);
    } catch { alert("Save failed"); }
    finally { setSaving(false); }
  }

  const filtered = statusFilter ? prods.filter(p => p.status === statusFilter) : prods;

  const rows = filtered.map(p => ({
    id: <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94A3B8" }}>{p.id}</span>,
    member: <span style={{ fontFamily: "monospace", fontSize: 12, color: GOLD }}>{p.memberId ?? "—"}</span>,
    customer: <span style={{ fontSize: 12 }}>{p.userName ?? p.userEmail ?? "—"}</span>,
    product: <span style={{ fontSize: 12 }}>{p.productSlug}</span>,
    stage: (
      <span style={{
        fontSize: 11, fontWeight: 600, fontFamily: "monospace",
        color: STAGE_COLORS[p.currentStage] ?? "#94A3B8",
      }}>{p.currentStage}</span>
    ),
    status: <StatusBadge status={p.status} />,
    revisions: <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{p.revisionCount ?? 0}</span>,
    created: fmtDate(p.createdAt),
    actions: (
      <button onClick={() => setEditProd({ ...p })} style={editBtn}>Edit</button>
    ),
  }));

  return (
    <AdminLayout title="Productions" subtitle={`${filtered.length} in pipeline`}>
      <SectionCard>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            {["queued","processing","delivered","archived","failed"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={fetchProductions} style={refreshBtn}>↻ Refresh</button>
        </div>
      </SectionCard>

      {/* Stage pipeline legend */}
      <SectionCard title="Stage Pipeline">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {STAGES.map(s => (
            <span key={s} style={{
              padding: "3px 10px", borderRadius: 20,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${STAGE_COLORS[s]}33`,
              fontSize: 11, color: STAGE_COLORS[s] ?? "#94A3B8",
              fontFamily: "monospace",
            }}>{s}</span>
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
            { key: "id", label: "Prod ID", width: 130 },
            { key: "member", label: "GM-ID", width: 120 },
            { key: "customer", label: "Customer" },
            { key: "product", label: "Product" },
            { key: "stage", label: "Stage" },
            { key: "status", label: "Status", width: 90 },
            { key: "revisions", label: "Rev", width: 50 },
            { key: "created", label: "Created", width: 110 },
            { key: "actions", label: "", width: 60 },
          ]}
          rows={rows}
          emptyMsg="No productions found"
        />
      )}

      {editProd && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => setEditProd(null)}>
          <div style={{
            background: "#07101F", border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: 16, padding: 32, minWidth: 380,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 6px", fontFamily: "Playfair Display, serif", color: "#fff" }}>Edit Production</h3>
            <p style={{ margin: "0 0 22px", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{editProd.id}</p>

            <label style={labelStyle}>STAGE</label>
            <select
              value={editProd.currentStage}
              onChange={e => setEditProd({ ...editProd, currentStage: e.target.value })}
              style={{ ...selectStyle, width: "100%", marginBottom: 16 }}
            >
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label style={labelStyle}>STATUS</label>
            <select
              value={editProd.status}
              onChange={e => setEditProd({ ...editProd, status: e.target.value })}
              style={{ ...selectStyle, width: "100%", marginBottom: 16 }}
            >
              {["queued","processing","delivered","archived","failed"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label style={labelStyle}>NOTES</label>
            <textarea
              value={editProd.notes ?? ""}
              onChange={e => setEditProd({ ...editProd, notes: e.target.value })}
              rows={3}
              style={{ ...selectStyle, width: "100%", marginBottom: 24, resize: "vertical", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveProd} disabled={saving} style={saveBtn}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditProd(null)} style={cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
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
const editBtn: React.CSSProperties = {
  padding: "4px 12px", borderRadius: 6,
  border: "1px solid rgba(212,175,55,0.3)",
  background: "transparent", color: "#D4AF37",
  fontSize: 11, cursor: "pointer", fontFamily: "Inter, sans-serif",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, color: "rgba(255,255,255,0.4)",
  letterSpacing: "0.1em", marginBottom: 6,
};
const saveBtn: React.CSSProperties = {
  flex: 1, padding: "11px", background: "#D4AF37",
  border: "none", borderRadius: 8, color: "#050B1A",
  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif",
};
const cancelBtn: React.CSSProperties = {
  padding: "11px 18px", background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
  color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif",
};
