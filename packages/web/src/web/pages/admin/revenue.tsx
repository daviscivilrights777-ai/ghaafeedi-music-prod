import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import { api } from "../../lib/api";
import AdminLayout, { KpiCard, SectionCard, TierBadge, fmt$ } from "../admin-layout";

const GOLD = "#D4AF37";
const GOLD2 = "#F0D060";

// Gross margin estimates per product slug
const MARGIN_MAP: Record<string, number> = {
  "sophia-ai":              91,
  "voice-cloning-studio":   97,
  "signature-masterpiece":  98,
  "emotional-soundtrack":   98,
  "cinematic-story-film":   99,
  "cinematic-life-story":   99,
  "couples-journey-film":   99,
  "memorial-legacy-film":   99,
  "dream-ai-visualization": 97,
  "future-self-vision":     97,
  "relationship-healing":   98,
  "family-vault":           99,
  "nft-collection":         99,
  "custom-ai-song-membership": 90,
};

export default function AdminRevenue() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) { setLocation("/signin?redirect=/admin/revenue"); return; }
    fetchRevenue();
  }, [session, isPending]);

  async function fetchRevenue() {
    try {
      const res = await api.admin.revenue.$get();
      if (!res.ok) { setError("Access denied"); setLoading(false); return; }
      setData(await res.json());
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }

  if (isPending || loading) {
    return <AdminLayout title="Revenue Analytics"><div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div></AdminLayout>;
  }
  if (error || !data) {
    return <AdminLayout title="Revenue Analytics"><div style={{ textAlign: "center", padding: 40, color: "#F87171", fontSize: 13 }}>{error || "No data"}</div></AdminLayout>;
  }

  const { totalRevenueCents, byProvider, byProduct, byTier, monthly } = data;

  // Estimate MRR from subscriptions in orders
  const subRevenue = byProduct
    .filter((p: any) => ["sophia-ai", "custom-ai-song-membership"].includes(p.productSlug))
    .reduce((s: number, p: any) => s + p.totalCents, 0);

  // Avg margin across products
  const avgMargin = byProduct.length === 0 ? 95 : Math.round(
    byProduct.reduce((s: number, p: any) => s + (MARGIN_MAP[p.productSlug] ?? 95), 0) / byProduct.length
  );

  // Build simple bar chart for monthly
  const maxMonthlyCents = monthly.length > 0 ? Math.max(...monthly.map((m: any) => m.totalCents)) : 1;

  return (
    <AdminLayout title="Revenue Analytics" subtitle="Gross revenue, margins, and product breakdown">
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <KpiCard label="Total Revenue" value={fmt$(totalRevenueCents)} sub="All completed orders" />
        <KpiCard label="Est. MRR" value={fmt$(subRevenue)} sub="Subscription products" accent="#A78BFA" />
        <KpiCard label="Avg Gross Margin" value={`${avgMargin}%`} sub="Across all products" accent="#22C55E" />
        <KpiCard label="Products Sold" value={byProduct.reduce((s: number, p: any) => s + p.count, 0)} />
      </div>

      {/* Monthly revenue chart */}
      {monthly.length > 0 && (
        <SectionCard title="Monthly Revenue">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, overflowX: "auto" }}>
            {monthly.map((m: any) => {
              const pct = m.totalCents / maxMonthlyCents;
              return (
                <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 48 }}>
                  <div style={{ fontSize: 10, color: GOLD, fontWeight: 600 }}>{fmt$(m.totalCents)}</div>
                  <div style={{
                    width: 36, borderRadius: "4px 4px 0 0",
                    height: Math.max(8, pct * 80),
                    background: `linear-gradient(180deg, ${GOLD2}, ${GOLD})`,
                  }} />
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>{m.month}</div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Revenue by product with margin */}
        <SectionCard title="Revenue by Product">
          {byProduct.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No revenue yet</div>
          ) : byProduct.map((p: any) => {
            const margin = MARGIN_MAP[p.productSlug] ?? 95;
            const estCogs = Math.round(p.totalCents * (1 - margin / 100));
            return (
              <div key={p.productSlug} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.productName}
                  </span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{p.count}×</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{fmt$(p.totalCents)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    flex: 1, height: 5, borderRadius: 3,
                    background: "rgba(255,255,255,0.06)", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${(p.totalCents / Math.max(1, byProduct[0].totalCents)) * 100}%`,
                      background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`,
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: "#22C55E", minWidth: 36, textAlign: "right" }}>{margin}% GM</span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                  Est. COGS: {fmt$(estCogs)}
                </div>
              </div>
            );
          })}
        </SectionCard>

        <div>
          {/* By tier */}
          <SectionCard title="Revenue by Tier">
            {byTier.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No data</div>
            ) : byTier.map((t: any) => (
              <div key={t.tier} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <TierBadge tier={t.tier} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{t.count}×</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{fmt$(t.totalCents)}</span>
                </div>
              </div>
            ))}
          </SectionCard>

          {/* By provider */}
          <SectionCard title="Revenue by Payment Provider">
            {byProvider.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No data</div>
            ) : byProvider.map((p: any) => (
              <div key={p.provider ?? "unknown"} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                  color: p.provider === "dodo" ? "#22C55E" : p.provider === "autumn" ? "#D4AF37" : "rgba(255,255,255,0.5)",
                }}>{p.provider ?? "—"}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{p.count}×</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{fmt$(p.totalCents)}</span>
                </div>
              </div>
            ))}
          </SectionCard>

          {/* Margin benchmark card */}
          <SectionCard title="Gross Margin Targets">
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
              <div>Sophia AI Starter: <span style={{ color: "#22C55E" }}>~94%</span></div>
              <div>Sophia AI Elite: <span style={{ color: "#22C55E" }}>~88%</span></div>
              <div>Song Memberships: <span style={{ color: "#22C55E" }}>~90%</span></div>
              <div>Film / Video: <span style={{ color: "#22C55E" }}>~99%</span></div>
              <div>NFT Collection: <span style={{ color: "#22C55E" }}>~99%</span></div>
              <div>Family Vault: <span style={{ color: "#22C55E" }}>~99%</span></div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <strong style={{ color: GOLD }}>Platform avg: 95–99%</strong>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </AdminLayout>
  );
}
