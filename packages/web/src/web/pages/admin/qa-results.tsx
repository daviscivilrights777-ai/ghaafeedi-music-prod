/**
 * /admin/qa-results — Character Consistency QA Monitor
 * Fix 5: Admin visibility into per-shot QA scores, drift flags, and worst orders.
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";

// ─── Types ─────────────────────────────────────────────────────────────────

interface QARow {
  id: number;
  order_id: string;
  character_id: string;
  shot_index: number;
  passed: boolean;
  score: number;
  method: string;
  message: string;
  fail_count: number;
  frame_url: string;
  drift_flagged: boolean;
  created_at: string;
}

interface KPIs {
  total_shots: number;
  passed_shots: number;
  failed_shots: number;
  drift_flagged: number;
  avg_score: number;
  min_score: number;
  total_orders: number;
}

interface WorstOrder {
  order_id: string;
  total_shots: number;
  failed_shots: number;
  drift_flags: number;
  avg_score: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getToken(): string {
  return localStorage.getItem("gm_auth_token") || "";
}

function scoreColor(score: number): string {
  if (score >= 0.65) return "#22C55E";
  if (score >= 0.50) return "#F59E0B";
  return "#EF4444";
}

function pct(a: number, b: number): string {
  if (!b) return "0%";
  return ((a / b) * 100).toFixed(1) + "%";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminQAResults() {
  const [, setLocation] = useLocation();

  const [kpis,        setKpis]        = useState<KPIs | null>(null);
  const [rows,        setRows]        = useState<QARow[]>([]);
  const [worstOrders, setWorstOrders] = useState<WorstOrder[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const [filterOrder, setFilterOrder] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "failed" | "drift">("all");
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);

  const fetchData = useCallback(async (orderId?: string) => {
    setLoading(true);
    setError(null);
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    const qs = orderId ? `?order_id=${encodeURIComponent(orderId)}&limit=200` : "?limit=200";

    try {
      const [mainRes, driftRes] = await Promise.all([
        fetch(`/api/admin/qa-results${qs}`, { headers }),
        fetch(`/api/admin/qa-results/drift?limit=50`, { headers }),
      ]);

      if (mainRes.status === 401 || mainRes.status === 403) {
        setLocation("/signin");
        return;
      }

      if (!mainRes.ok) throw new Error(`API ${mainRes.status}`);

      const main = await mainRes.json();
      setKpis(main.kpis ?? null);
      setRows(main.rows ?? []);
      setWorstOrders(main.worst_orders ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load QA data");
    } finally {
      setLoading(false);
    }
  }, [setLocation]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(filterOrder.trim() || undefined);
  };

  const displayRows = rows.filter(r => {
    if (activeFilter === "failed") return !r.passed;
    if (activeFilter === "drift")  return r.drift_flagged;
    return true;
  });

  // ─── KPI Card ───────────────────────────────────────────────────────────
  function KPICard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
    return (
      <div style={{
        background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)",
        borderRadius: 12, padding: "18px 22px", minWidth: 130,
      }}>
        <div style={{ fontSize: 11, color: "#9CA3AF", letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: color || "#D4AF37", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{sub}</div>}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050B1A", color: "#fff", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: "#D4AF37", letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>
          Admin › QA Monitor
        </div>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, margin: 0, color: "#fff" }}>
          Character Consistency QA
        </h1>
        <p style={{ color: "#9CA3AF", fontSize: 13, marginTop: 6 }}>
          Per-shot InsightFace / SSIM scores · Drift detection · Double-fail audit
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid #EF4444", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#FCA5A5", fontSize: 14 }}>
          {error} — <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => fetchData()}>retry</span>
        </div>
      )}

      {/* KPI Row */}
      {kpis && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
          <KPICard label="Total Shots"   value={kpis.total_shots}   />
          <KPICard label="Passed"        value={kpis.passed_shots}  sub={pct(kpis.passed_shots, kpis.total_shots)} color="#22C55E" />
          <KPICard label="Failed"        value={kpis.failed_shots}  sub={pct(kpis.failed_shots, kpis.total_shots)} color="#EF4444" />
          <KPICard label="Drift Flags"   value={kpis.drift_flagged} color="#F59E0B" />
          <KPICard label="Avg Score"     value={kpis.avg_score ?? "—"} />
          <KPICard label="Min Score"     value={kpis.min_score ?? "—"}   color={kpis.min_score < 0.5 ? "#EF4444" : "#D4AF37"} />
          <KPICard label="Orders with QA" value={kpis.total_orders} />
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* Left: main table */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Search + filter bar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
              <input
                value={filterOrder}
                onChange={e => setFilterOrder(e.target.value)}
                placeholder="Filter by Order ID…"
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,175,55,0.25)",
                  borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, width: 220,
                  outline: "none",
                }}
              />
              <button type="submit" style={{
                background: "#D4AF37", color: "#050B1A", border: "none", borderRadius: 8,
                padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}>Search</button>
              {filterOrder && (
                <button type="button" onClick={() => { setFilterOrder(""); fetchData(); }} style={{
                  background: "transparent", border: "1px solid #374151", borderRadius: 8,
                  color: "#9CA3AF", padding: "8px 12px", fontSize: 13, cursor: "pointer",
                }}>Clear</button>
              )}
            </form>

            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              {(["all", "failed", "drift"] as const).map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  padding: "6px 14px", borderRadius: 20, border: "1px solid",
                  borderColor: activeFilter === f ? "#D4AF37" : "rgba(255,255,255,0.12)",
                  background: activeFilter === f ? "rgba(212,175,55,0.15)" : "transparent",
                  color: activeFilter === f ? "#D4AF37" : "#9CA3AF",
                  fontSize: 12, cursor: "pointer", textTransform: "capitalize",
                }}>{f === "all" ? `All (${rows.length})` : f === "failed" ? `Failed (${rows.filter(r=>!r.passed).length})` : `Drift (${rows.filter(r=>r.drift_flagged).length})`}</button>
              ))}
              <button onClick={() => fetchData(filterOrder || undefined)} style={{
                padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent", color: "#9CA3AF", fontSize: 12, cursor: "pointer",
              }}>↻ Refresh</button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>Loading QA data…</div>
          ) : displayRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>
              {activeFilter === "all" ? "No QA records yet. Shots appear here once production starts." : `No ${activeFilter} records.`}
            </div>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(212,175,55,0.15)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(212,175,55,0.08)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
                    {["Order ID", "Char", "Shot", "Score", "Method", "Fails", "Status", "Drift", "Frame", "Time"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.05em", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => (
                    <tr key={row.id} style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    }}>
                      <td style={{ padding: "9px 14px", color: "#D4AF37", fontFamily: "monospace", fontSize: 12 }}>
                        <span title={row.order_id} style={{ cursor: "pointer" }} onClick={() => { setFilterOrder(row.order_id); fetchData(row.order_id); }}>
                          {row.order_id.length > 14 ? row.order_id.slice(0, 12) + "…" : row.order_id}
                        </span>
                      </td>
                      <td style={{ padding: "9px 14px", color: "#E5E7EB", fontSize: 12, fontFamily: "monospace" }}>
                        <span title={row.character_id}>{row.character_id.length > 12 ? row.character_id.slice(0, 10) + "…" : row.character_id}</span>
                      </td>
                      <td style={{ padding: "9px 14px", color: "#9CA3AF", textAlign: "center" }}>{row.shot_index + 1}</td>
                      <td style={{ padding: "9px 14px", fontWeight: 700, color: scoreColor(row.score) }}>
                        {row.score > 0 ? row.score.toFixed(3) : "—"}
                      </td>
                      <td style={{ padding: "9px 14px", color: "#6B7280", fontSize: 11 }}>{row.method}</td>
                      <td style={{ padding: "9px 14px", textAlign: "center", color: row.fail_count >= 2 ? "#EF4444" : row.fail_count === 1 ? "#F59E0B" : "#6B7280" }}>
                        {row.fail_count}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{
                          padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: row.passed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                          color: row.passed ? "#22C55E" : "#EF4444",
                        }}>{row.passed ? "PASS" : "FAIL"}</span>
                      </td>
                      <td style={{ padding: "9px 14px", textAlign: "center" }}>
                        {row.drift_flagged
                          ? <span style={{ color: "#F59E0B", fontSize: 16 }} title="Drift flagged">⚠</span>
                          : <span style={{ color: "#374151" }}>—</span>}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        {row.frame_url ? (
                          <button onClick={() => setPreviewUrl(row.frame_url)} style={{
                            background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)",
                            borderRadius: 6, color: "#D4AF37", fontSize: 11, padding: "3px 8px", cursor: "pointer",
                          }}>View</button>
                        ) : <span style={{ color: "#374151" }}>—</span>}
                      </td>
                      <td style={{ padding: "9px 14px", color: "#6B7280", fontSize: 11, whiteSpace: "nowrap" }}>
                        {new Date(row.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Worst Orders panel */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 12, padding: "18px 16px",
          }}>
            <div style={{ fontSize: 12, color: "#EF4444", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12, textTransform: "uppercase" }}>
              ⚠ Most Inconsistent Orders
            </div>
            {worstOrders.length === 0 ? (
              <div style={{ color: "#6B7280", fontSize: 13 }}>No data yet.</div>
            ) : worstOrders.map((o, i) => (
              <div key={o.order_id} style={{
                padding: "10px 0", borderBottom: i < worstOrders.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                cursor: "pointer",
              }} onClick={() => { setFilterOrder(o.order_id); fetchData(o.order_id); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#D4AF37" }}>
                    {o.order_id.length > 16 ? o.order_id.slice(0, 14) + "…" : o.order_id}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(o.avg_score) }}>
                    {o.avg_score?.toFixed(3) ?? "—"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#EF4444" }}>{o.failed_shots} fails</span>
                  {o.drift_flags > 0 && <span style={{ fontSize: 11, color: "#F59E0B" }}>{o.drift_flags} drift</span>}
                  <span style={{ fontSize: 11, color: "#6B7280" }}>{o.total_shots} shots</span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "16px", marginTop: 14,
          }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>Score Legend</div>
            {[
              { label: "≥ 0.65", desc: "Excellent match", color: "#22C55E" },
              { label: "0.50–0.65", desc: "Acceptable", color: "#F59E0B" },
              { label: "< 0.50", desc: "Fail / drift risk", color: "#EF4444" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: l.color, fontWeight: 600 }}>{l.label}</span>
                <span style={{ fontSize: 11, color: "#6B7280" }}>{l.desc}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#6B7280" }}>
              <strong style={{ color: "#F59E0B" }}>⚠ Drift</strong> = score dropped {">"}0.12 from baseline.<br/>
              <strong style={{ color: "#EF4444" }}>Fail ×2</strong> = job paused, customer notified.
            </div>
          </div>
        </div>
      </div>

      {/* Frame preview modal */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, cursor: "pointer",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
            <img
              src={previewUrl}
              alt="QA frame"
              style={{ maxWidth: "min(90vw, 640px)", maxHeight: "80vh", borderRadius: 12, border: "2px solid #D4AF37" }}
              onError={() => setPreviewUrl(null)}
            />
            <button onClick={() => setPreviewUrl(null)} style={{
              position: "absolute", top: -14, right: -14, background: "#EF4444",
              border: "none", borderRadius: "50%", width: 28, height: 28,
              color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 700, lineHeight: 1,
            }}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}
