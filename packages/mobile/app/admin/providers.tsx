/**
 * Ghaafeedi Music — Admin Providers Screen
 * Live health, balance status, enable/disable toggles, budget controls.
 */
import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Switch, Alert, Linking,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type ProviderHealth, type ProviderRecord } from "../../lib/adminApi";
import { C, T } from "../../lib/adminTheme";

// ─── Balance badge ─────────────────────────────────────────────────────────
function BalanceBadge({ status, dashUrl }: { status: string | null; dashUrl: string | null }) {
  if (!status) return null;

  const map: Record<string, { color: string; label: string }> = {
    ok:        { color: C.green,  label: "FUNDED" },
    low:       { color: C.amber,  label: "LOW" },
    exhausted: { color: C.red,    label: "EXHAUSTED" },
    unknown:   { color: C.grey,   label: "UNKNOWN" },
  };

  const entry = (map[status] ?? map.unknown)!;

  return (
    <TouchableOpacity
      onPress={() => dashUrl && Linking.openURL(dashUrl)}
      style={[s.balanceBadge, { borderColor: entry.color + "66" }]}
    >
      <View style={[s.balanceDot, { backgroundColor: entry.color }]} />
      <Text style={[s.balanceText, { color: entry.color }]}>
        {entry.label}
        {dashUrl ? "  ↗" : ""}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Health indicator ──────────────────────────────────────────────────────
function HealthDot({ healthy }: { healthy: boolean }) {
  return <View style={[s.healthDot, { backgroundColor: healthy ? C.green : C.red }]} />;
}

// ─── Provider card ─────────────────────────────────────────────────────────
function ProviderCard({
  health, record, onToggle, toggling,
}: {
  health:    ProviderHealth | undefined;
  record:    ProviderRecord;
  onToggle:  (name: string, val: boolean) => void;
  toggling:  boolean;
}) {
  const isEnabled = record.enabled;
  const latency = health?.latencyMs != null ? `${health.latencyMs}ms` : "—";

  return (
    <View style={[s.card, !isEnabled && s.cardDisabled]}>
      {/* Top row */}
      <View style={s.cardTop}>
        <View style={s.cardLeft}>
          <View style={s.nameRow}>
            {health && <HealthDot healthy={health.healthy} />}
            <Text style={T.h3} numberOfLines={1}>{record.display_name}</Text>
          </View>
          <Text style={T.muted}>{record.job_types?.join(" · ") || "—"}</Text>
        </View>
        {toggling
          ? <ActivityIndicator size="small" color={C.gold} />
          : <Switch
              value={isEnabled}
              onValueChange={(v) => onToggle(record.name, v)}
              trackColor={{ false: C.border, true: C.gold + "88" }}
              thumbColor={isEnabled ? C.gold : C.grey}
            />
        }
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statVal}>{latency}</Text>
          <Text style={s.statLabel}>Latency</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statVal}>P{record.priority}</Text>
          <Text style={s.statLabel}>Priority</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statVal}>{record.max_concurrent}</Text>
          <Text style={s.statLabel}>Max Conc.</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statVal}>
            ${((record.hourly_budget_cents ?? 0) / 100).toFixed(0)}/hr
          </Text>
          <Text style={s.statLabel}>Budget</Text>
        </View>
      </View>

      {/* Balance row (FAL.ai etc.) */}
      {health?.balanceStatus && (
        <View style={s.balanceRow}>
          <BalanceBadge status={health.balanceStatus} dashUrl={health.balanceDashboardUrl} />
          {health.balanceStatus === "exhausted" && (
            <Text style={[T.muted, { flex: 1, fontSize: 11 }]}>
              Jobs will route to overflow providers
            </Text>
          )}
        </View>
      )}

      {/* Status message */}
      {health?.message && (
        <Text style={[T.muted, { fontSize: 11, marginTop: 6 }]} numberOfLines={2}>
          {health.message}
        </Text>
      )}

      {/* Adapter not registered warning */}
      {!record.adapterRegistered && (
        <View style={[s.warnBanner]}>
          <Text style={s.warnText}>⚠ Adapter not registered — API key may be missing</Text>
        </View>
      )}
    </View>
  );
}

// ── QA mock data — mirrors exact shape of live API responses ──────────────────
// ProviderHealth: matches GET /api/providers/health shape
const MOCK_HEALTH = {
  ok: false,
  summary: "3/5 providers healthy",
  checkedAt: new Date().toISOString(),
  providers: [
    {
      name: "fal_ai_kling", displayName: "FAL.ai (Kling)", jobTypes: ["video"],
      healthy: false, latencyMs: null, message: "Balance exhausted — top up to restore video generation",
      balanceStatus: "exhausted" as const, balanceCents: 0, balanceDashboardUrl: "https://fal.ai/dashboard/billing",
      checkedAt: new Date().toISOString(),
    },
    {
      name: "sunor_cc", displayName: "Sunor.cc", jobTypes: ["song"],
      healthy: true, latencyMs: 412, message: null,
      balanceStatus: "ok" as const, balanceCents: 5000, balanceDashboardUrl: null,
      checkedAt: new Date().toISOString(),
    },
    {
      name: "elevenlabs", displayName: "ElevenLabs", jobTypes: ["narration", "voice-clone"],
      healthy: true, latencyMs: 238, message: null,
      balanceStatus: "ok" as const, balanceCents: 12000, balanceDashboardUrl: null,
      checkedAt: new Date().toISOString(),
    },
    {
      name: "openai", displayName: "OpenAI", jobTypes: ["analysis", "lyrics", "storyboard"],
      healthy: true, latencyMs: 195, message: null,
      balanceStatus: "ok" as const, balanceCents: 35000, balanceDashboardUrl: null,
      checkedAt: new Date().toISOString(),
    },
    {
      name: "modal", displayName: "Modal", jobTypes: ["video"],
      healthy: false, latencyMs: null, message: "Not configured — overflow only",
      balanceStatus: null, balanceCents: null, balanceDashboardUrl: null,
      checkedAt: new Date().toISOString(),
    },
  ],
};

// ProviderRecord: matches GET /api/providers shape (snake_case from DB + adapterRegistered)
const MOCK_LIST = {
  total: 5,
  providers: [
    {
      id: "prov_001", name: "fal_ai_kling",  display_name: "FAL.ai (Kling)",
      enabled: true,  priority: 1, cost_per_unit: 8,    unit: "per-minute",
      max_concurrent: 10, hourly_budget_cents: 0,
      job_types: ["video"], adapterRegistered: true,
    },
    {
      id: "prov_002", name: "sunor_cc",      display_name: "Sunor.cc",
      enabled: true,  priority: 2, cost_per_unit: 5,    unit: "per-song",
      max_concurrent: 5,  hourly_budget_cents: 2500,
      job_types: ["song"], adapterRegistered: true,
    },
    {
      id: "prov_003", name: "elevenlabs",    display_name: "ElevenLabs",
      enabled: true,  priority: 3, cost_per_unit: 3,    unit: "per-1k-chars",
      max_concurrent: 8,  hourly_budget_cents: 1000,
      job_types: ["narration", "voice-clone"], adapterRegistered: true,
    },
    {
      id: "prov_004", name: "openai",        display_name: "OpenAI",
      enabled: true,  priority: 4, cost_per_unit: 1,    unit: "per-1k-tokens",
      max_concurrent: 20, hourly_budget_cents: 5000,
      job_types: ["analysis", "lyrics", "storyboard"], adapterRegistered: true,
    },
    {
      id: "prov_005", name: "modal",         display_name: "Modal",
      enabled: false, priority: 5, cost_per_unit: 6,    unit: "per-minute",
      max_concurrent: 0,  hourly_budget_cents: 0,
      job_types: ["video"], adapterRegistered: false,
    },
  ],
};

// ─── Screen ────────────────────────────────────────────────────────────────
export default function AdminProviders() {
  const queryClient = useQueryClient();
  const [togglingSet, setTogglingSet] = useState<Set<string>>(new Set());

  const IS_QA_PREVIEW = typeof window !== "undefined";

  const { data: liveHealthData, refetch: refetchHealth, isFetching: fetchingHealth } =
    useQuery({
      queryKey: ["admin-provider-health"],
      queryFn:  IS_QA_PREVIEW ? () => Promise.resolve(MOCK_HEALTH) : adminApi.providerHealth,
      refetchInterval: IS_QA_PREVIEW ? false : 30_000,
      retry: 0,
      placeholderData: MOCK_HEALTH,
    });

  const { data: liveListData, refetch: refetchList, isFetching: fetchingList } =
    useQuery({
      queryKey: ["admin-provider-list"],
      queryFn:  IS_QA_PREVIEW ? () => Promise.resolve(MOCK_LIST) : adminApi.providers,
      refetchInterval: IS_QA_PREVIEW ? false : 60_000,
      retry: 0,
      placeholderData: MOCK_LIST,
    });

  const healthData = liveHealthData ?? MOCK_HEALTH;
  const listData   = liveListData   ?? MOCK_LIST;

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      adminApi.toggleProvider(name, enabled),
    onMutate: ({ name }) => {
      setTogglingSet(s => new Set(s).add(name));
    },
    onSettled: (_, __, { name }) => {
      setTogglingSet(s => { const n = new Set(s); n.delete(name); return n; });
      queryClient.invalidateQueries({ queryKey: ["admin-provider-list"] });
    },
    onError: (_, { name }) => {
      Alert.alert("Error", `Failed to toggle provider ${name}`);
    },
  });

  const onRefresh = useCallback(() => { refetchHealth(); refetchList(); }, [refetchHealth, refetchList]);

  const records  = listData?.providers ?? [];
  const healths  = healthData?.providers ?? [];
  const healthMap = new Map(healths.map(h => [h.name, h]));

  const healthyCount  = healths.filter(h => h.healthy).length;
  const exhaustedCount = healths.filter(h => h.balanceStatus === "exhausted").length;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      refreshControl={
        <RefreshControl
          refreshing={fetchingHealth || fetchingList}
          onRefresh={onRefresh}
          tintColor={C.gold}
        />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={T.h1}>AI Providers</Text>
        <Text style={T.muted}>
          {healthData ? `${healthyCount}/${healths.length} healthy` : "Loading…"}
        </Text>
      </View>

      {/* Summary banner */}
      {exhaustedCount > 0 && (
        <View style={[s.alertBanner, { borderLeftColor: C.red }]}>
          <Text style={[s.alertTitle, { color: C.red }]}>
            {exhaustedCount} provider{exhaustedCount > 1 ? "s" : ""} balance exhausted
          </Text>
          <Text style={s.alertBody}>
            Video generation routing to overflow. Top up FAL.ai to restore primary pipeline.
          </Text>
        </View>
      )}

      {/* Summary chips */}
      <View style={s.summaryRow}>
        <View style={[s.summaryChip, { borderColor: C.green + "44" }]}>
          <Text style={[s.chipVal, { color: C.green }]}>{healthyCount}</Text>
          <Text style={s.chipLabel}>Healthy</Text>
        </View>
        <View style={[s.summaryChip, { borderColor: C.amber + "44" }]}>
          <Text style={[s.chipVal, { color: C.amber }]}>{records.filter(r => !r.enabled).length}</Text>
          <Text style={s.chipLabel}>Disabled</Text>
        </View>
        <View style={[s.summaryChip, { borderColor: C.red + "44" }]}>
          <Text style={[s.chipVal, { color: C.red }]}>{exhaustedCount}</Text>
          <Text style={s.chipLabel}>Exhausted</Text>
        </View>
        <View style={[s.summaryChip, { borderColor: C.grey + "44" }]}>
          <Text style={[s.chipVal, { color: C.grey }]}>{records.filter(r => !r.adapterRegistered).length}</Text>
          <Text style={s.chipLabel}>No Adapter</Text>
        </View>
      </View>

      {/* Provider cards */}
      {records.length === 0 ? (
        <ActivityIndicator color={C.gold} style={{ marginTop: 40 }} />
      ) : (
        records.map((rec) => (
          <ProviderCard
            key={rec.name}
            record={rec}
            health={healthMap.get(rec.name)}
            onToggle={(name, val) => toggleMutation.mutate({ name, enabled: val })}
            toggling={togglingSet.has(rec.name)}
          />
        ))
      )}

      {/* Refresh hint */}
      <Text style={[T.muted, { textAlign: "center", marginTop: 16, fontSize: 11 }]}>
        Health checks every 30s · Pull to refresh
      </Text>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { padding: 16 },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  cardDisabled: { opacity: 0.55 },
  cardTop:  { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  cardLeft: { flex: 1, gap: 4 },
  nameRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  healthDot:{ width: 8, height: 8, borderRadius: 4 },
  statsRow: { flexDirection: "row", gap: 0, backgroundColor: C.bg, borderRadius: 10, padding: 10, marginBottom: 8 },
  stat:     { flex: 1, alignItems: "center" },
  statVal:  { fontSize: 14, fontWeight: "700", color: C.text },
  statLabel:{ fontSize: 9, color: C.textMuted, marginTop: 2 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  balanceBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1,
  },
  balanceDot:  { width: 6, height: 6, borderRadius: 3 },
  balanceText: { fontSize: 11, fontWeight: "700" },
  warnBanner:  { backgroundColor: C.amber + "18", borderRadius: 8, padding: 8, marginTop: 8 },
  warnText:    { color: C.amber, fontSize: 11 },
  summaryRow:  { flexDirection: "row", gap: 8, marginBottom: 16 },
  summaryChip: { flex: 1, backgroundColor: C.surface, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1 },
  chipVal:     { fontSize: 20, fontWeight: "700" },
  chipLabel:   { fontSize: 9, color: C.textMuted, marginTop: 2 },
  alertBanner: { backgroundColor: C.surface2, borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 3 },
  alertTitle:  { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  alertBody:   { fontSize: 12, color: C.textMuted },
});
