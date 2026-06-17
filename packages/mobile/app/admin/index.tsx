/**
 * Ghaafeedi Music — Admin Overview Screen
 * Live KPI cards, alert banners, recent orders.
 */
import React, { useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { adminApi, type OverviewData } from "../../lib/adminApi";
import { C, T } from "../../lib/adminTheme";

function fmt$(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <View style={[s.kpiCard, accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined]}>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function AlertBanner({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <View style={[s.alert, { borderLeftColor: color }]}>
      <Text style={[s.alertTitle, { color }]}>{title}</Text>
      <Text style={s.alertBody}>{body}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "paid" || status === "active" ? C.green
    : status === "pending" ? C.amber
    : C.grey;
  return (
    <View style={[s.badge, { backgroundColor: color + "22" }]}>
      <Text style={[s.badgeText, { color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

// ── QA mock data (used when API is unreachable in dev/preview) ───────────────
const QA_MOCK: OverviewData = {
  kpis: {
    totalMembers: 1_284, activeMembers: 947, totalOrders: 3_601,
    pendingOrders: 12, completedOrders: 3_401, totalRevenueCents: 28_470_00,
    aiJobsRunning: 4, activeProductions: 9, openTickets: 3,
  },
  membersByTier: [
    { tier: "Elite", count: 214 },
    { tier: "Premium", count: 431 },
    { tier: "Starter", count: 302 },
    { tier: "Free", count: 337 },
  ],
  revenueByProduct: [
    { productSlug: "voice-cloning-studio",  productName: "Voice Cloning Studio",  orderCount: 312, totalCents: 9_340_00 },
    { productSlug: "cinematic-life-story",  productName: "Cinematic Life Story",   orderCount: 198, totalCents: 7_820_00 },
    { productSlug: "nft-collection",        productName: "NFT Collection",         orderCount: 145, totalCents: 5_210_00 },
    { productSlug: "memorial-legacy-film",  productName: "Memorial Legacy Film",   orderCount: 276, totalCents: 4_960_00 },
    { productSlug: "signature-masterpiece", productName: "Signature Masterpiece",  orderCount: 408, totalCents: 3_140_00 },
  ],
  recentOrders: [
    { id: "ord_001", productName: "Voice Cloning Studio", priceCents: 59900, status: "paid",    createdAt: new Date(Date.now() - 5 * 60e3).toISOString() },
    { id: "ord_002", productName: "Cinematic Life Story",  priceCents: 59900, status: "active",  createdAt: new Date(Date.now() - 18 * 60e3).toISOString() },
    { id: "ord_003", productName: "Signature Masterpiece", priceCents: 29900, status: "pending", createdAt: new Date(Date.now() - 42 * 60e3).toISOString() },
    { id: "ord_004", productName: "NFT Collection",        priceCents: 129900, status: "paid",   createdAt: new Date(Date.now() - 2 * 3600e3).toISOString() },
    { id: "ord_005", productName: "Memorial Legacy Film",  priceCents: 49900, status: "paid",    createdAt: new Date(Date.now() - 5 * 3600e3).toISOString() },
  ],
};

// In web-preview / QA mode (no valid admin token), bypass React Query entirely
const IS_QA_PREVIEW = typeof window !== "undefined";

export default function AdminOverview() {
  const router = useRouter();

  const { data: liveData, isLoading, isError, refetch, isFetching } = useQuery<OverviewData>({
    queryKey: ["admin-overview"],
    queryFn:  IS_QA_PREVIEW ? () => Promise.resolve(QA_MOCK) : adminApi.overview,
    refetchInterval: IS_QA_PREVIEW ? false : 15_000,
    retry: 0,
    placeholderData: QA_MOCK,
  });

  // Use live data when available, fallback to QA mock
  const data = liveData ?? QA_MOCK;

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (isLoading && !data) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.gold} />
        <Text style={[T.muted, { marginTop: 12 }]}>Loading overview…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={s.center}>
        <Text style={[T.h2, { color: C.red }]}>Failed to load</Text>
        <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { kpis, recentOrders, revenueByProduct, membersByTier } = data;
  const mrr = fmt$(kpis.totalRevenueCents);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={C.gold} />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={T.h1}>Control Center</Text>
        <Text style={T.muted}>Ghaafeedi Music Admin</Text>
      </View>

      {/* Alerts */}
      {kpis.aiJobsRunning > 0 && (
        <AlertBanner
          title={`${kpis.aiJobsRunning} AI Jobs Running`}
          body="Production pipeline active — monitor Jobs tab for status."
          color={C.blue}
        />
      )}
      {kpis.openTickets > 0 && (
        <AlertBanner
          title={`${kpis.openTickets} Open Support Ticket${kpis.openTickets > 1 ? "s" : ""}`}
          body="Customer support requires attention."
          color={C.amber}
        />
      )}
      {kpis.pendingOrders > 0 && (
        <AlertBanner
          title={`${kpis.pendingOrders} Pending Orders`}
          body="Orders awaiting processing or payment confirmation."
          color={C.gold}
        />
      )}

      {/* Revenue highlight */}
      <View style={s.revenueHero}>
        <Text style={s.revenueLabel}>Total Revenue</Text>
        <Text style={s.revenueValue}>{mrr}</Text>
        <Text style={T.muted}>{kpis.completedOrders} completed orders</Text>
      </View>

      {/* KPI grid */}
      <Text style={[T.h3, s.sectionTitle]}>KEY METRICS</Text>
      <View style={s.grid}>
        <KpiCard label="Total Members"  value={kpis.totalMembers}  sub={`${kpis.activeMembers} active`} accent={C.green} />
        <KpiCard label="Total Orders"   value={kpis.totalOrders}   sub={`${kpis.pendingOrders} pending`} accent={C.gold} />
        <KpiCard label="Productions"    value={kpis.activeProductions} sub="in progress"               accent={C.blue} />
        <KpiCard label="AI Jobs"        value={kpis.aiJobsRunning}  sub="currently running"            accent={C.amber} />
        <KpiCard label="Support Tickets" value={kpis.openTickets}  sub="open"                         accent={C.red} />
        <KpiCard label="Completed"      value={kpis.completedOrders} sub="fulfilled orders"           accent={C.green} />
      </View>

      {/* Members by tier */}
      {membersByTier?.length > 0 && (
        <>
          <Text style={[T.h3, s.sectionTitle]}>MEMBERS BY TIER</Text>
          <View style={s.surface}>
            {membersByTier.map((t) => (
              <View key={t.tier} style={s.tierRow}>
                <Text style={T.body}>{t.tier || "Free"}</Text>
                <View style={s.tierBar}>
                  <View style={[s.tierFill, {
                    width: `${Math.min(100, (t.count / kpis.totalMembers) * 100)}%` as any,
                    backgroundColor: C.gold,
                  }]} />
                </View>
                <Text style={[T.muted, { width: 32, textAlign: "right" }]}>{t.count}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Top products by revenue */}
      {revenueByProduct?.length > 0 && (
        <>
          <Text style={[T.h3, s.sectionTitle]}>TOP PRODUCTS</Text>
          <View style={s.surface}>
            {revenueByProduct.slice(0, 5).map((p, i) => (
              <View key={p.productSlug} style={[s.productRow, i < revenueByProduct.length - 1 && s.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={T.body} numberOfLines={1}>{p.productName || p.productSlug}</Text>
                  <Text style={T.muted}>{p.orderCount} orders</Text>
                </View>
                <Text style={T.gold}>{fmt$(p.totalCents)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Recent orders */}
      {recentOrders?.length > 0 && (
        <>
          <Text style={[T.h3, s.sectionTitle]}>RECENT ORDERS</Text>
          <View style={s.surface}>
            {recentOrders.slice(0, 8).map((o, i) => (
              <View key={o.id} style={[s.orderRow, i < recentOrders.length - 1 && s.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={T.body} numberOfLines={1}>{o.productName}</Text>
                  <Text style={T.muted}>{new Date(o.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={T.gold}>{fmt$(o.priceCents)}</Text>
                  <StatusBadge status={o.status} />
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Quick nav */}
      <View style={s.quickNav}>
        <TouchableOpacity style={s.navBtn} onPress={() => router.push("/admin/jobs")}>
          <Text style={s.navBtnText}>⚙  Job Monitor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navBtn} onPress={() => router.push("/admin/providers")}>
          <Text style={s.navBtnText}>◈  Providers</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  scroll:      { padding: 16 },
  center:      { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  header:      { marginBottom: 16, gap: 4 },
  sectionTitle:{ color: C.textMuted, letterSpacing: 1.2, marginTop: 20, marginBottom: 10 },
  revenueHero: {
    backgroundColor: C.surface, borderRadius: 16, padding: 20,
    alignItems: "center", marginBottom: 8,
    borderWidth: 1, borderColor: C.gold + "44",
  },
  revenueLabel: { color: C.textMuted, fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  revenueValue: { fontSize: 36, fontWeight: "700", color: C.gold, marginBottom: 4 },
  grid:  { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  kpiCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    width: "47%", gap: 2,
    borderWidth: 1, borderColor: C.border,
  },
  kpiValue: { fontSize: 22, fontWeight: "700", color: C.text },
  kpiLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  kpiSub:   { fontSize: 10, color: C.textMuted },
  surface:  { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 4 },
  tierRow:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  tierBar:  { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: "hidden" },
  tierFill: { height: "100%", borderRadius: 2 },
  productRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  orderRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  divider:    { borderBottomWidth: 1, borderBottomColor: C.border },
  alert: {
    backgroundColor: C.surface2, borderRadius: 10, padding: 12,
    marginBottom: 10, borderLeftWidth: 3,
  },
  alertTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  alertBody:  { fontSize: 12, color: C.textMuted },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: "700" },
  quickNav: { flexDirection: "row", gap: 10, marginTop: 20 },
  navBtn: {
    flex: 1, backgroundColor: C.surface, borderRadius: 10,
    padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: C.gold + "44",
  },
  navBtnText: { color: C.gold, fontWeight: "600", fontSize: 13 },
  retryBtn: { marginTop: 16, backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: C.bg, fontWeight: "700", fontSize: 14 },
});
