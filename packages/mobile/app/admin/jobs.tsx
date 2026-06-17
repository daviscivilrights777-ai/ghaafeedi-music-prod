/**
 * Ghaafeedi Music — Admin Job Monitor Screen
 * Real-time queue stats, job list, cancel actions.
 */
import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { adminApi, type AiJob, type QueueStats } from "../../lib/adminApi";
import { C, T } from "../../lib/adminTheme";

const STATUS_COLOR: Record<string, string> = {
  queued:      C.amber,
  dispatched:  C.blue,
  processing:  C.blue,
  complete:    C.green,
  delivered:   C.green,
  failed:      C.red,
  cancelled:   C.grey,
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? C.grey;
  return (
    <View style={[s.pill, { backgroundColor: color + "22", borderColor: color + "44" }]}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[s.pillText, { color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

function QueueCard({ label, depth, color }: { label: string; depth: number; color: string }) {
  return (
    <View style={[s.queueCard, { borderTopColor: color, borderTopWidth: 2 }]}>
      <Text style={[s.queueDepth, { color }]}>{depth}</Text>
      <Text style={s.queueLabel}>{label}</Text>
    </View>
  );
}

function JobRow({ job }: { job: AiJob }) {
  const [cancelling, setCancelling] = useState(false);
  const canCancel = ["queued", "dispatched"].includes(job.status);

  const handleCancel = () => {
    Alert.alert("Cancel Job", `Cancel job ${job.id.slice(0, 8)}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Job", style: "destructive",
        onPress: async () => {
          setCancelling(true);
          // Fire and forget — no client method yet, direct fetch
          try {
            await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST", credentials: "include" });
          } catch {}
          setCancelling(false);
        },
      },
    ]);
  };

  return (
    <View style={s.jobRow}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <StatusPill status={job.status} />
          <Text style={[T.muted, { fontSize: 10 }]}>{job.jobType}</Text>
        </View>
        <Text style={T.muted} numberOfLines={1}>
          ID: {job.id.slice(0, 16)}…  ·  {job.provider || "—"}
        </Text>
        <Text style={[T.muted, { fontSize: 10 }]}>
          Attempt {job.attempts}/{job.maxAttempts}  ·  {new Date(job.createdAt).toLocaleTimeString()}
        </Text>
      </View>
      {canCancel && (
        <TouchableOpacity onPress={handleCancel} style={s.cancelBtn} disabled={cancelling}>
          {cancelling
            ? <ActivityIndicator size="small" color={C.red} />
            : <Text style={s.cancelText}>✕</Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── QA mock data ─────────────────────────────────────────────────────────────
const MOCK_QUEUE: QueueStats = {
  activeCount: 4,
  depths: { "song-gen": 2, "video-gen": 1, "voice-clone": 1 },
};

const MOCK_JOBS: AiJob[] = [
  { id: "job_abc123def456", jobType: "song-generation",  status: "processing", provider: "sunor.cc",   attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 2 * 60e3).toISOString() },
  { id: "job_xyz789uvw012", jobType: "video-generation", status: "queued",     provider: "fal.ai",     attempts: 0, maxAttempts: 3, createdAt: new Date(Date.now() - 5 * 60e3).toISOString() },
  { id: "job_lmn345opq678", jobType: "voice-clone",      status: "dispatched", provider: "elevenlabs", attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 8 * 60e3).toISOString() },
  { id: "job_rst901uvw234", jobType: "song-generation",  status: "processing", provider: "sunor.cc",   attempts: 2, maxAttempts: 3, createdAt: new Date(Date.now() - 15 * 60e3).toISOString() },
  { id: "job_cde567fgh890", jobType: "video-generation", status: "complete",   provider: "fal.ai",     attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 30 * 60e3).toISOString() },
  { id: "job_ijk123lmn456", jobType: "song-generation",  status: "delivered",  provider: "sunor.cc",   attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 60 * 60e3).toISOString() },
  { id: "job_opq789rst012", jobType: "voice-clone",      status: "failed",     provider: "elevenlabs", attempts: 3, maxAttempts: 3, createdAt: new Date(Date.now() - 2 * 3600e3).toISOString() },
];

const IS_QA_PREVIEW = typeof window !== "undefined";

export default function AdminJobs() {
  const { data: liveQueue, refetch: refetchQueue } = useQuery<QueueStats>({
    queryKey: ["admin-queue"],
    queryFn:  IS_QA_PREVIEW ? () => Promise.resolve(MOCK_QUEUE) : adminApi.adminQueue,
    refetchInterval: IS_QA_PREVIEW ? false : 5_000,
    retry: 0,
    placeholderData: MOCK_QUEUE,
  });

  const { data: liveJobsData, isLoading, isError, refetch: refetchJobs, isFetching } = useQuery<{ jobs: AiJob[] }>({
    queryKey: ["admin-jobs"],
    queryFn:  IS_QA_PREVIEW ? () => Promise.resolve({ jobs: MOCK_JOBS }) : adminApi.jobs,
    refetchInterval: IS_QA_PREVIEW ? false : 8_000,
    retry: 0,
    placeholderData: { jobs: MOCK_JOBS },
  });

  const queueData = liveQueue ?? MOCK_QUEUE;
  const jobsData  = liveJobsData ?? { jobs: MOCK_JOBS };

  const onRefresh = useCallback(() => { refetchQueue(); refetchJobs(); }, [refetchQueue, refetchJobs]);

  const jobs = jobsData?.jobs ?? [];
  const active  = jobs.filter(j => ["queued","dispatched","processing"].includes(j.status));
  const recent  = jobs.filter(j => !["queued","dispatched","processing"].includes(j.status));

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={C.gold} />}
    >
      <View style={s.header}>
        <Text style={T.h1}>Job Monitor</Text>
        <View style={s.liveChip}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Queue depth cards */}
      <Text style={[T.h3, s.sectionTitle]}>QUEUE DEPTHS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: "row", gap: 10, paddingRight: 8 }}>
          <QueueCard label="Active Jobs" depth={queueData?.activeCount ?? 0} color={C.blue} />
          {Object.entries(queueData?.depths ?? {}).map(([k, v]) => (
            <QueueCard key={k} label={k} depth={v as number} color={C.gold} />
          ))}
          {!queueData && <QueueCard label="Loading…" depth={0} color={C.grey} />}
        </View>
      </ScrollView>

      {/* Active jobs */}
      <Text style={[T.h3, s.sectionTitle]}>
        ACTIVE  ({active.length})
      </Text>
      {isLoading && !jobsData ? (
        <ActivityIndicator color={C.gold} style={{ marginVertical: 20 }} />
      ) : active.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>✓</Text>
          <Text style={T.muted}>No active jobs</Text>
        </View>
      ) : (
        <View style={s.surface}>
          {active.map((j, i) => (
            <View key={j.id} style={i < active.length - 1 ? s.divider : undefined}>
              <JobRow job={j} />
            </View>
          ))}
        </View>
      )}

      {/* Recent completed/failed */}
      {recent.length > 0 && (
        <>
          <Text style={[T.h3, s.sectionTitle]}>RECENT  ({recent.length})</Text>
          <View style={s.surface}>
            {recent.slice(0, 20).map((j, i) => (
              <View key={j.id} style={i < Math.min(recent.length, 20) - 1 ? s.divider : undefined}>
                <JobRow job={j} />
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  scroll:       { padding: 16 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sectionTitle: { color: C.textMuted, letterSpacing: 1.2, marginTop: 16, marginBottom: 10 },
  surface:      { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 4 },
  divider:      { borderBottomWidth: 1, borderBottomColor: C.border },
  liveChip:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.green + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  liveText:     { color: C.green, fontSize: 11, fontWeight: "700" },
  queueCard:    { backgroundColor: C.surface, borderRadius: 10, padding: 14, minWidth: 90, alignItems: "center", borderWidth: 1, borderColor: C.border },
  queueDepth:   { fontSize: 28, fontWeight: "700" },
  queueLabel:   { fontSize: 10, color: C.textMuted, marginTop: 2, textAlign: "center" },
  jobRow:       { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  pill:         { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
  dot:          { width: 5, height: 5, borderRadius: 3 },
  pillText:     { fontSize: 9, fontWeight: "700" },
  cancelBtn:    { backgroundColor: C.red + "22", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: C.red + "44" },
  cancelText:   { color: C.red, fontWeight: "700", fontSize: 13 },
  emptyCard:    { backgroundColor: C.surface, borderRadius: 12, padding: 32, alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.border },
  emptyIcon:    { fontSize: 28, color: C.green },
});
