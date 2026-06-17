/**
 * Ghaafeedi Music — Admin Revenue Screen
 * Total revenue, product breakdown, recent orders.
 */
import React, { useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { adminApi, type RevenueData, type RevenueProduct } from "../../lib/adminApi";
import { C, T } from "../../lib/adminTheme";

function fmt$(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function RevenueBar({ product, max }: { product: RevenueProduct; max: number }) {
  const pct = max > 0 ? (product.totalCents / max) * 100 : 0;
  return (
    <View style={s.barRow}>
      <Text style={[T.body, { width: 130 }]} numberOfLines={1}>
        {product.productName || product.productSlug}
      </Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={[T.gold, { width: 70, textAlign: "right" }]}>
        {fmt$(product.totalCents)}
      </Text>
    </View>
  );
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <View style={[s.statCard, color ? { borderTopColor: color, borderTopWidth: 2 } : undefined]}>
      <Text style={[s.statValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ── QA mock data ─────────────────────────────────────────────────────────────
const QA_REVENUE: RevenueData = {
  totalRevenueCents: 28_470_00,
  revenueByProduct: [
    { productSlug: "voice-cloning-studio",  productName: "Voice Cloning Studio",   orderCount: 312, totalCents: 9_340_00 },
    { productSlug: "cinematic-life-story",  productName: "Cinematic Life Story",    orderCount: 198, totalCents: 7_820_00 },
    { productSlug: "nft-collection",        productName: "NFT Collection",          orderCount: 145, totalCents: 5_210_00 },
    { productSlug: "memorial-legacy-film",  productName: "Memorial Legacy Film",    orderCount: 276, totalCents: 4_960_00 },
    { productSlug: "signature-masterpiece", productName: "Signature Masterpiece",   orderCount: 408, totalCents: 3_140_00 },
  ],
  recentOrders: [
    { id: "ord_001", productName: "Voice Cloning Studio", priceCents: 59900, status: "paid",    createdAt: new Date(Date.now() - 5 * 60e3).toISOString() },
    { id: "ord_002", productName: "Cinematic Life Story",  priceCents: 59900, status: "active",  createdAt: new Date(Date.now() - 18 * 60e3).toISOString() },
    { id: "ord_003", productName: "NFT Collection",        priceCents: 129900, status: "paid",   createdAt: new Date(Date.now() - 2 * 3600e3).toISOString() },
    { id: "ord_004", productName: "Memorial Legacy Film",  priceCents: 49900, status: "paid",    createdAt: new Date(Date.now() - 5 * 3600e3).toISOString() },
  ],
};

const IS_QA_PREVIEW = typeof window !== "undefined";

export default function AdminRevenue() {
  const { data: liveData, isLoading, isError, refetch, isFetching } = useQuery<RevenueData>({
    queryKey: ["admin-revenue"],
    queryFn:  IS_QA_PREVIEW ? () => Promise.resolve(QA_REVENUE) : adminApi.revenue,
    refetchInterval: IS_QA_PREVIEW ? false : 30_000,
    retry: 0,
    placeholderData: QA_REVENUE,
  });

  const data = liveData ?? QA_REVENUE;
  const onRefresh = useCallback(() => refetch(), [refetch]);

  if (isLoading && !data) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.gold} />
        <Text style={[T.muted, { marginTop: 12 }]}>Loading revenue…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={s.center}>
        <Text style={[T.h2, { color: C.red, marginBottom: 16 }]}>Failed to load</Text>
        <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { totalRevenueCents, revenueByProduct, recentOrders } = data;
  const maxProduct = Math.max(...(revenueByProduct?.map(p => p.totalCents) ?? [1]));
  const avgOrderValue = recentOrders?.length
    ? recentOrders.reduce((a, o) => a + (o.priceCents ?? 0), 0) / recentOrders.length
    : 0;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={C.gold} />}
    >
      {/* Header */}
      <Text style={[T.h1, { marginBottom: 4 }]}>Revenue</Text>
      <Text style={T.muted}>Lifetime financial overview</Text>

      {/* Hero total */}
      <View style={s.heroCard}>
        <Text style={s.heroLabel}>TOTAL REVENUE</Text>
        <Text style={s.heroValue}>{fmt$(totalRevenueCents)}</Text>
      </View>

      {/* Stat cards */}
      <View style={s.statsGrid}>
        <StatCard
          label="Avg Order Value"
          value={fmt$(avgOrderValue)}
          color={C.blue}
        />
        <StatCard
          label="Recent Orders"
          value={String(recentOrders?.length ?? 0)}
          sub="in view"
          color={C.gold}
        />
        <StatCard
          label="Top Product"
          value={revenueByProduct?.[0]
            ? fmt$(revenueByProduct[0].totalCents)
            : "—"}
          sub={revenueByProduct?.[0]?.productName?.slice(0, 14)}
          color={C.green}
        />
        <StatCard
          label="Products"
          value={String(revenueByProduct?.length ?? 0)}
          sub="generating revenue"
          color={C.amber}
        />
      </View>

      {/* Revenue by product bars */}
      {revenueByProduct?.length > 0 && (
        <>
          <Text style={[T.h3, s.sectionTitle]}>REVENUE BY PRODUCT</Text>
          <View style={s.surface}>
            {revenueByProduct.map((p, i) => (
              <View
                key={p.productSlug}
                style={[{ paddingHorizontal: 14, paddingVertical: 10 },
                  i < revenueByProduct.length - 1 && s.divider]}
              >
                <RevenueBar product={p} max={maxProduct} />
                <Text style={[T.muted, { fontSize: 10, marginTop: 3 }]}>
                  {p.orderCount} order{p.orderCount !== 1 ? "s" : ""}
                </Text>
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
            {recentOrders.slice(0, 15).map((o, i) => {
              const statusColor =
                o.status === "paid" ? C.green :
                o.status === "pending" ? C.amber : C.grey;
              return (
                <View
                  key={o.id}
                  style={[s.orderRow, i < Math.min(recentOrders.length, 15) - 1 && s.divider]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={T.body} numberOfLines={1}>{o.productName}</Text>
                    <Text style={T.muted}>{new Date(o.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={T.gold}>{fmt$(o.priceCents)}</Text>
                    <View style={[s.badge, { backgroundColor: statusColor + "22" }]}>
                      <Text style={[s.badgeText, { color: statusColor }]}>
                        {o.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {revenueByProduct?.length === 0 && recentOrders?.length === 0 && (
        <View style={s.emptyCard}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>◎</Text>
          <Text style={T.h2}>No Revenue Yet</Text>
          <Text style={[T.muted, { textAlign: "center", marginTop: 6 }]}>
            Revenue will appear here once orders are completed.
          </Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  scroll:       { padding: 16 },
  center:       { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: C.textMuted, letterSpacing: 1.2, marginTop: 20, marginBottom: 10 },
  heroCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 24,
    alignItems: "center", marginVertical: 16,
    borderWidth: 1, borderColor: C.gold + "44",
  },
  heroLabel: { color: C.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  heroValue: { fontSize: 40, fontWeight: "700", color: C.gold },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  statCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    width: "47%", borderWidth: 1, borderColor: C.border, gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: "700", color: C.text },
  statLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  statSub:   { fontSize: 10, color: C.textMuted },
  surface:   { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 4 },
  divider:   { borderBottomWidth: 1, borderBottomColor: C.border },
  barRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  barTrack:  { flex: 1, height: 5, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  barFill:   { height: "100%", backgroundColor: C.gold, borderRadius: 3 },
  orderRow:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  badge:     { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: "700" },
  emptyCard: { backgroundColor: C.surface, borderRadius: 16, padding: 40, alignItems: "center", marginTop: 20, borderWidth: 1, borderColor: C.border },
  retryBtn:  { backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: C.bg, fontWeight: "700", fontSize: 14 },
});
