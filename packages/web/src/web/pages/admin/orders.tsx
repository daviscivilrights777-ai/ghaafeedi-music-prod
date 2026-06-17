import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import { api } from "../../lib/api";
import AdminLayout, { AdminTable, StatusBadge, SectionCard, fmt$, fmtDate } from "../admin-layout";

const GOLD = "#D4AF37";
const STATUSES = ["", "pending", "processing", "completed", "failed", "refunded"];

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editOrder, setEditOrder] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) { setLocation("/signin?redirect=/admin/orders"); return; }
    fetchOrders();
  }, [session, isPending]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await api.admin.orders.$get();
      if (!res.ok) { setError("Access denied"); setLoading(false); return; }
      const d = await res.json() as { orders: any[] };
      setOrders(d.orders);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }

  async function saveOrder() {
    if (!editOrder) return;
    setSaving(true);
    try {
      await (api.admin.orders as any)[":id"].$patch({
        param: { id: editOrder.id },
        json: { status: editOrder.status, notes: editOrder.notes },
      });
      await fetchOrders();
      setEditOrder(null);
    } catch { alert("Save failed"); }
    finally { setSaving(false); }
  }

  const filtered = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;

  // Totals
  const totalRevenue = filtered.filter(o => o.status === "completed").reduce((s, o) => s + o.priceCents, 0);

  const rows = filtered.map(o => ({
    id: <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94A3B8" }}>{o.id}</span>,
    member: <span style={{ fontFamily: "monospace", fontSize: 12, color: GOLD }}>{o.memberId ?? "—"}</span>,
    customer: <span style={{ fontSize: 12 }}>{o.userName ?? o.userEmail ?? "—"}</span>,
    product: <span style={{ fontSize: 12 }}>{o.productName}</span>,
    amount: <span style={{ fontWeight: 600, color: "#fff" }}>{fmt$(o.priceCents)}</span>,
    provider: <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{o.paymentProvider ?? "—"}</span>,
    status: <StatusBadge status={o.status} />,
    date: fmtDate(o.createdAt),
    actions: (
      <button onClick={() => setEditOrder({ ...o })} style={editBtn}>Edit</button>
    ),
  }));

  return (
    <AdminLayout title="Orders" subtitle={`${filtered.length} orders · ${fmt$(totalRevenue)} completed revenue`}>
      <SectionCard>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            {STATUSES.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
          </select>
          <button onClick={fetchOrders} style={refreshBtn}>↻ Refresh</button>
        </div>
      </SectionCard>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 40, color: "#F87171", fontSize: 13 }}>{error}</div>
      ) : (
        <AdminTable
          columns={[
            { key: "id", label: "Order ID", width: 130 },
            { key: "member", label: "GM-ID", width: 120 },
            { key: "customer", label: "Customer" },
            { key: "product", label: "Product" },
            { key: "amount", label: "Amount", width: 90 },
            { key: "provider", label: "Provider", width: 80 },
            { key: "status", label: "Status", width: 100 },
            { key: "date", label: "Date", width: 110 },
            { key: "actions", label: "", width: 60 },
          ]}
          rows={rows}
          emptyMsg="No orders found"
        />
      )}

      {editOrder && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => setEditOrder(null)}>
          <div style={{
            background: "#07101F", border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: 16, padding: 32, minWidth: 360,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 6px", fontFamily: "Playfair Display, serif", color: "#fff" }}>Edit Order</h3>
            <p style={{ margin: "0 0 22px", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{editOrder.id} · {fmt$(editOrder.priceCents)}</p>

            <label style={labelStyle}>STATUS</label>
            <select
              value={editOrder.status}
              onChange={e => setEditOrder({ ...editOrder, status: e.target.value })}
              style={{ ...selectStyle, width: "100%", marginBottom: 16 }}
            >
              {["pending", "processing", "completed", "failed", "refunded"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label style={labelStyle}>NOTES</label>
            <textarea
              value={editOrder.notes ?? ""}
              onChange={e => setEditOrder({ ...editOrder, notes: e.target.value })}
              rows={3}
              style={{
                ...selectStyle, width: "100%", marginBottom: 24,
                resize: "vertical", boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveOrder} disabled={saving} style={saveBtn}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditOrder(null)} style={cancelBtn}>Cancel</button>
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
  color: "#D4AF37", fontSize: 12, cursor: "pointer",
  fontFamily: "Inter, sans-serif",
};
const editBtn: React.CSSProperties = {
  padding: "4px 12px", borderRadius: 6,
  border: "1px solid rgba(212,175,55,0.3)",
  background: "transparent", color: "#D4AF37",
  fontSize: 11, cursor: "pointer",
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
