import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import { api } from "../../lib/api";
import AdminLayout, { KpiCard, AdminTable, StatusBadge, SectionCard, fmt$, fmtDate } from "../admin-layout";

const GOLD = "#D4AF37";

export default function AdminOverview() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) { setLocation("/signin?redirect=/admin"); return; }
    fetchOverview();
  }, [session, isPending]);

  async function fetchOverview() {
    try {
      const res = await api.admin.overview.$get();
      if (!res.ok) { setError("Access denied — admin only"); setLoading(false); return; }
      setData(await res.json());
    } catch {
      setError("Failed to load overview data");
    } finally {
      setLoading(false);
    }
  }

  if (isPending || loading) return <AdminLayout title="Overview"><LoadingState /></AdminLayout>;
  if (error) return <AdminLayout title="Overview"><ErrorState msg={error} /></AdminLayout>;

  const { kpis, tierBreakdown, recentOrders, revenueByProduct } = data;
  const mrr = fmt$(kpis.totalRevenueCents); // approximation

  return (
    <AdminLayout title="Overview" subtitle={`Platform health at a glance`}>
      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <KpiCard label="Total Revenue" value={fmt$(kpis.totalRevenueCents)} sub={`${kpis.completedOrders} completed orders`} />
        <KpiCard label="Active Members" value={kpis.activeMembers} sub={`${kpis.totalMembers} total`} />
        <KpiCard label="Active Productions" value={kpis.activeProductions} sub="In pipeline" accent="#60A5FA" />
        <KpiCard label="AI Jobs Running" value={kpis.aiJobsRunning} sub="Queued + running" accent="#A78BFA" />
        <KpiCard label="Open Tickets" value={kpis.openTickets} sub="Support queue" accent={kpis.openTickets > 5 ? "#F87171" : undefined} />
        <KpiCard label="Pending Orders" value={kpis.pendingOrders} sub="Awaiting processing" accent="#FBBF24" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Tier breakdown */}
        <SectionCard title="Members by Tier">
          {tierBreakdown.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No members yet</div>
          ) : tierBreakdown.map((t: any) => (
            <div key={t.tier} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textTransform: "capitalize" }}>{t.tier}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  width: Math.max(30, Math.min(120, (t.count / Math.max(1, kpis.totalMembers)) * 120)),
                  background: t.tier === "elite" ? GOLD : t.tier === "premium" ? "#C084FC" : t.tier === "starter" ? "#60A5FA" : "rgba(255,255,255,0.15)",
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", minWidth: 24, textAlign: "right" }}>{t.count}</span>
              </div>
            </div>
          ))}
        </SectionCard>

        {/* Revenue by product */}
        <SectionCard title="Top Products by Revenue">
          {revenueByProduct.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No revenue yet</div>
          ) : revenueByProduct.slice(0, 6).map((p: any) => (
            <div key={p.productSlug} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.productName}</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{p.count}×</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{fmt$(p.totalCents)}</span>
              </div>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* Recent orders */}
      <SectionCard title="Recent Orders">
        <AdminTable
          columns={[
            { key: "id", label: "Order ID", width: 160 },
            { key: "member", label: "Member" },
            { key: "product", label: "Product" },
            { key: "amount", label: "Amount", width: 100 },
            { key: "status", label: "Status", width: 100 },
            { key: "date", label: "Date", width: 120 },
          ]}
          rows={recentOrders.map((o: any) => ({
            id: <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94A3B8" }}>{o.id}</span>,
            member: o.memberId ?? "—",
            product: o.productName,
            amount: fmt$(o.priceCents),
            status: <StatusBadge status={o.status} />,
            date: fmtDate(o.createdAt),
          }))}
          emptyMsg="No orders yet"
        />
      </SectionCard>
    </AdminLayout>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 36, height: 36, border: "2px solid rgba(212,175,55,0.2)",
          borderTopColor: "#D4AF37", borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 14px",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Loading dashboard…</div>
      </div>
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: 12, padding: "32px 24px", textAlign: "center",
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
      <div style={{ fontSize: 14, color: "#F87171" }}>{msg}</div>
    </div>
  );
}
