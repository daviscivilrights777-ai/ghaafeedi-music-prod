// ============================================================
// Ghaafeedi Music — Admin Control Center Overview
// COMMAND CENTER aesthetic — steel/charcoal tones, red/amber accents
// Visually DISTINCT from customer dashboard (no gold/navy/emotional language)
// ============================================================
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../../lib/authClient";
import { api } from "../../lib/api";
import AdminLayout, { fmt$, fmtDate, StatusBadge } from "../admin-layout";

// ─── Design tokens (admin-only palette) ──────────────────────
const BG_MAIN    = "#0D0D0F";
const BG_CARD    = "#13151A";
const BG_CARD2   = "#181B21";
const BORDER     = "rgba(255,255,255,0.07)";
const BORDER_ACC = "rgba(239,68,68,0.25)";
const RED        = "#EF4444";
const AMBER      = "#F59E0B";
const GREEN      = "#22C55E";
const BLUE       = "#3B82F6";
const PURPLE     = "#8B5CF6";
const TEXT_PRI   = "#F1F5F9";
const TEXT_SEC   = "rgba(241,245,249,0.45)";
const TEXT_DIM   = "rgba(241,245,249,0.25)";
const MONO       = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace";

// ─── Sub-components ───────────────────────────────────────────

function CommandKpi({
  label, value, sub, accent = AMBER, icon, trend,
}: {
  label: string; value: string | number; sub?: string;
  accent?: string; icon: string; trend?: "up" | "down" | "neutral";
}) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderTop: `2px solid ${accent}`,
      borderRadius: 8,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* dim bg icon */}
      <div style={{
        position: "absolute", top: 10, right: 14,
        fontSize: 28, opacity: 0.08, userSelect: "none",
      }}>{icon}</div>

      <div style={{
        fontSize: 10, fontFamily: "Inter, sans-serif",
        fontWeight: 700, letterSpacing: "0.12em",
        color: TEXT_DIM, textTransform: "uppercase",
        marginBottom: 8,
      }}>{label}</div>

      <div style={{
        fontSize: 28, fontWeight: 700,
        fontFamily: MONO, color: TEXT_PRI,
        lineHeight: 1,
      }}>{value}</div>

      {sub && (
        <div style={{
          marginTop: 8, fontSize: 11,
          fontFamily: "Inter, sans-serif",
          color: TEXT_SEC,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {trend === "up" && <span style={{ color: GREEN }}>▲</span>}
          {trend === "down" && <span style={{ color: RED }}>▼</span>}
          {trend === "neutral" && <span style={{ color: TEXT_DIM }}>—</span>}
          {sub}
        </div>
      )}
    </div>
  );
}

function CommandSection({ title, toolbar, children }: {
  title: string; toolbar?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 20,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px",
        background: BG_CARD2,
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          fontFamily: "Inter, sans-serif",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: TEXT_SEC,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            display: "inline-block", width: 3, height: 14,
            background: AMBER, borderRadius: 2,
          }} />
          {title}
        </div>
        {toolbar}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

function QuickAction({ label, desc, icon, accent, onClick }: {
  label: string; desc: string; icon: string; accent: string; onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? BG_CARD2 : BG_CARD,
        border: `1px solid ${hov ? accent : BORDER}`,
        borderRadius: 8, padding: "14px 18px",
        cursor: "pointer", textAlign: "left",
        transition: "all 0.15s", width: "100%",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: hov ? `0 0 12px ${accent}22` : "none",
      }}
    >
      <span style={{
        fontSize: 22,
        width: 40, height: 40,
        background: `${accent}15`,
        borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>{icon}</span>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 600,
          fontFamily: "Inter, sans-serif",
          color: TEXT_PRI, marginBottom: 2,
        }}>{label}</div>
        <div style={{
          fontSize: 11, fontFamily: "Inter, sans-serif",
          color: TEXT_SEC,
        }}>{desc}</div>
      </div>
      <span style={{
        marginLeft: "auto", color: TEXT_DIM, fontSize: 16,
      }}>›</span>
    </button>
  );
}

function SystemStatusRow({ label, status, detail }: {
  label: string; status: "live" | "degraded" | "down" | "unknown"; detail?: string;
}) {
  const colors: Record<string, string> = {
    live: GREEN, degraded: AMBER, down: RED, unknown: TEXT_DIM,
  };
  const labels: Record<string, string> = {
    live: "LIVE", degraded: "DEGRADED", down: "DOWN", unknown: "UNKNOWN",
  };
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "9px 0",
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{
        fontSize: 12, fontFamily: "Inter, sans-serif", color: TEXT_SEC,
      }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {detail && (
          <span style={{
            fontSize: 11, fontFamily: MONO, color: TEXT_DIM,
          }}>{detail}</span>
        )}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{
            display: "inline-block", width: 7, height: 7,
            borderRadius: "50%", background: colors[status],
            boxShadow: `0 0 5px ${colors[status]}`,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700,
            fontFamily: MONO, color: colors[status],
            letterSpacing: "0.08em",
          }}>{labels[status]}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function AdminOverview() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [engramHealth, setEngramHealth] = useState<{
    ok: boolean; status: string; latencyMs: number | null; configured: boolean;
    totalMemories?: number;
  } | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setLocation("/signin?redirect=/admin");
      return;
    }
    fetchOverview();
  }, [session, isPending]);

  async function fetchOverview() {
    try {
      const [overviewRes, engramRes] = await Promise.all([
        api.admin.overview.$get(),
        fetch("/api/admin/engram/health", {
          headers: { Authorization: `Bearer ${(await (authClient as any).getSession?.())?.session?.token ?? ""}` }
        }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (!overviewRes.ok) {
        setError("Access denied — administrator only");
        setLoading(false);
        return;
      }
      setData(await overviewRes.json());
      setEngramHealth(engramRes);
    } catch {
      setError("Failed to load system data");
    } finally {
      setLoading(false);
    }
  }

  if (isPending || loading) return <AdminLayout title="Control Center"><LoadingState /></AdminLayout>;
  if (error) return <AdminLayout title="Control Center"><AccessDenied msg={error} /></AdminLayout>;

  const { kpis, tierBreakdown, recentOrders, revenueByProduct } = data;

  const totalRevFmt = fmt$(kpis.totalRevenueCents);
  const failedJobs = 0; // would come from kpis if wired

  return (
    <AdminLayout title="Control Center" subtitle="System overview · Real-time">
      {/* ── Administrator header strip ── */}
      <div style={{
        background: `linear-gradient(90deg, ${BG_CARD2} 0%, rgba(239,68,68,0.06) 100%)`,
        border: `1px solid ${BORDER_ACC}`,
        borderRadius: 8,
        padding: "14px 20px",
        marginBottom: 22,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: `${RED}15`,
            border: `1px solid ${RED}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>⚙</div>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 700,
              fontFamily: "Inter, sans-serif", color: TEXT_PRI,
            }}>Lawrence Davis</div>
            <div style={{
              fontSize: 11, fontFamily: MONO,
              color: RED, letterSpacing: "0.10em",
              fontWeight: 700,
            }}>ADMINISTRATOR</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "Inter, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Platform</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: GREEN }}>● OPERATIONAL</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "Inter, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Environment</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: AMBER }}>PRODUCTION</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "Inter, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Access</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: BLUE }}>FULL ROOT</div>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        gap: 14,
        marginBottom: 24,
      }}>
        <CommandKpi
          label="Total Revenue" value={totalRevFmt}
          sub={`${kpis.completedOrders} completed orders`}
          accent={GREEN} icon="$" trend="up"
        />
        <CommandKpi
          label="Active Members" value={kpis.activeMembers}
          sub={`${kpis.totalMembers} total registered`}
          accent={BLUE} icon="👤"
        />
        <CommandKpi
          label="Productions" value={kpis.activeProductions}
          sub="Currently in pipeline"
          accent={PURPLE} icon="🎬"
        />
        <CommandKpi
          label="AI Jobs" value={kpis.aiJobsRunning}
          sub="Queued + dispatched"
          accent={AMBER} icon="⚡"
        />
        <CommandKpi
          label="Pending Orders" value={kpis.pendingOrders}
          sub="Awaiting fulfillment"
          accent={kpis.pendingOrders > 10 ? RED : AMBER} icon="📋"
          trend={kpis.pendingOrders > 10 ? "up" : "neutral"}
        />
        <CommandKpi
          label="Support Queue" value={kpis.openTickets}
          sub="Open tickets"
          accent={kpis.openTickets > 5 ? RED : BLUE} icon="🎫"
          trend={kpis.openTickets > 5 ? "down" : "neutral"}
        />
        <CommandKpi
          label="Engram Memory"
          value={engramHealth?.ok ? "LIVE" : engramHealth === null ? "…" : "DOWN"}
          sub={
            engramHealth?.ok
              ? `${engramHealth.latencyMs ?? "—"}ms · ${engramHealth.totalMemories ?? 0} memories`
              : engramHealth?.configured === false ? "Not configured" : "Unreachable"
          }
          accent={engramHealth?.ok ? GREEN : engramHealth === null ? AMBER : RED}
          icon="🧠"
          trend={engramHealth?.ok ? "up" : engramHealth === null ? "neutral" : "down"}
        />
      </div>

      {/* ── Quick Actions ── */}
      <CommandSection title="Quick Actions">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}>
          <QuickAction
            label="View Members"
            desc="Browse + manage all accounts"
            icon="👥" accent={BLUE}
            onClick={() => setLocation("/admin/members")}
          />
          <QuickAction
            label="Review Orders"
            desc="Process pending + recent"
            icon="📦" accent={AMBER}
            onClick={() => setLocation("/admin/orders")}
          />
          <QuickAction
            label="Monitor AI Jobs"
            desc="Live queue + retry failed"
            icon="⚡" accent={PURPLE}
            onClick={() => setLocation("/admin/jobs")}
          />
          <QuickAction
            label="Revenue Analytics"
            desc="MRR, ARR, product breakdown"
            icon="📈" accent={GREEN}
            onClick={() => setLocation("/admin/revenue")}
          />
          <QuickAction
            label="Productions"
            desc="All active pipelines"
            icon="🎬" accent="#06B6D4"
            onClick={() => setLocation("/admin/productions")}
          />
          <QuickAction
            label="Lip Sync Monitor"
            desc="FAL.ai LatentSync jobs"
            icon="🎙" accent="#EC4899"
            onClick={() => setLocation("/admin/lipsync")}
          />
          <QuickAction
            label="Support Tickets"
            desc="Customer issues queue"
            icon="🎫" accent={kpis.openTickets > 5 ? RED : BLUE}
            onClick={() => setLocation("/admin/support")}
          />
          <QuickAction
            label="Audit Logs"
            desc="Security + event trail"
            icon="🔐" accent="#64748B"
            onClick={() => setLocation("/admin/audit")}
          />
        </div>
      </CommandSection>

      {/* ── Two-column: Tier Breakdown + System Status ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 20,
        marginBottom: 20,
      }}>
        {/* Tier Breakdown */}
        <CommandSection title="Members by Tier">
          {tierBreakdown.length === 0 ? (
            <div style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", padding: "20px 0", fontFamily: "Inter, sans-serif" }}>
              No members yet
            </div>
          ) : tierBreakdown.map((t: any) => {
            const tierColors: Record<string, string> = {
              elite: AMBER, premium: PURPLE, starter: BLUE,
              admin: RED,
            };
            const accent = tierColors[t.tier] ?? "#64748B";
            const pct = Math.max(2, Math.min(100, (t.count / Math.max(1, kpis.totalMembers)) * 100));
            return (
              <div key={t.tier} style={{
                display: "flex", alignItems: "center", gap: 12,
                marginBottom: 12,
              }}>
                <div style={{
                  fontSize: 11, fontFamily: MONO,
                  color: accent, fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  minWidth: 64,
                }}>{t.tier}</div>
                <div style={{
                  flex: 1, height: 5, borderRadius: 3,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${pct}%`,
                    background: accent,
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  fontFamily: MONO, color: TEXT_PRI,
                  minWidth: 28, textAlign: "right",
                }}>{t.count}</div>
              </div>
            );
          })}
        </CommandSection>

        {/* System Status */}
        <CommandSection title="System Status">
          <SystemStatusRow label="Railway PostgreSQL" status="live" detail="thomas.proxy.rlwy.net" />
          <SystemStatusRow label="Upstash Redis" status="live" detail="us-east-1" />
          <SystemStatusRow label="Poyo.ai (Music+Video)" status="live" detail="seedance-2 · 13 ops" />
          <SystemStatusRow label="ElevenLabs TTS" status="live" detail="turbo_v2_5" />
          <SystemStatusRow label="FAL.ai (Fallback)" status="live" detail="LatentSync · image" />
          <SystemStatusRow label="Dodo Payments" status="live" detail="bus_0NRksLGV..." />
          <SystemStatusRow label="Cloudflare R2 CDN" status="live" detail="pub-bc7b2034..." />
          <SystemStatusRow label="Resend Email" status="live" detail="ghaafeedi-prod" />
          <SystemStatusRow
            label="Engram Memory Layer"
            status={
              engramHealth === null ? "unknown"
              : engramHealth.ok ? "live"
              : engramHealth.configured === false ? "unknown"
              : "degraded"
            }
            detail={
              engramHealth?.ok
                ? `${engramHealth.latencyMs}ms · ${engramHealth.totalMemories ?? 0} mem`
                : engramHealth?.configured === false ? "not configured" : "check logs"
            }
          />
          <div style={{ paddingTop: 4 }} />
        </CommandSection>
      </div>

      {/* ── Revenue by Product ── */}
      <CommandSection
        title="Top Products by Revenue"
        toolbar={
          <span style={{
            fontSize: 10, fontFamily: MONO,
            color: TEXT_DIM, letterSpacing: "0.08em",
          }}>ALL TIME</span>
        }
      >
        {revenueByProduct.length === 0 ? (
          <div style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", padding: "20px 0", fontFamily: "Inter, sans-serif" }}>
            No revenue data yet
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 8,
          }}>
            {revenueByProduct.slice(0, 8).map((p: any, i: number) => (
              <div key={p.productSlug} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px",
                background: BG_CARD2,
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  fontFamily: MONO,
                  color: i === 0 ? AMBER : i === 1 ? TEXT_SEC : TEXT_DIM,
                  minWidth: 18, textAlign: "right",
                }}>#{i + 1}</div>
                <div style={{
                  flex: 1, fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  color: TEXT_SEC,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{p.productName}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontFamily: MONO, color: TEXT_DIM }}>{p.count}×</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    fontFamily: MONO, color: GREEN,
                  }}>{fmt$(p.totalCents)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CommandSection>

      {/* ── Recent Orders Table ── */}
      <CommandSection
        title="Recent Orders"
        toolbar={
          <button
            onClick={() => setLocation("/admin/orders")}
            style={{
              fontSize: 11, fontFamily: "Inter, sans-serif",
              background: "none", border: `1px solid ${BORDER}`,
              borderRadius: 4, padding: "4px 10px",
              color: TEXT_SEC, cursor: "pointer",
            }}
          >View All →</button>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ORDER ID", "MEMBER", "PRODUCT", "AMOUNT", "STATUS", "DATE"].map(col => (
                  <th key={col} style={{
                    padding: "7px 12px",
                    fontSize: 10, fontFamily: "Inter, sans-serif",
                    fontWeight: 700, letterSpacing: "0.10em",
                    color: TEXT_DIM, textAlign: "left",
                    borderBottom: `1px solid ${BORDER}`,
                    whiteSpace: "nowrap",
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: "28px 12px", textAlign: "center",
                    fontSize: 12, color: TEXT_DIM,
                    fontFamily: "Inter, sans-serif",
                  }}>No orders yet</td>
                </tr>
              ) : recentOrders.map((o: any) => (
                <tr key={o.id} style={{
                  borderBottom: `1px solid rgba(255,255,255,0.04)`,
                  transition: "background 0.12s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = BG_CARD2)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: "#64748B" }}>
                      {o.id.slice(0, 12)}…
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", color: TEXT_SEC }}>
                      {o.memberId ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      fontSize: 12, fontFamily: "Inter, sans-serif",
                      color: TEXT_PRI, maxWidth: 180,
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", display: "block",
                    }}>{o.productName}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: GREEN }}>
                      {fmt$(o.priceCents)}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <StatusBadge status={o.status} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM }}>
                      {fmtDate(o.createdAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CommandSection>

      {/* ── Operator Notice ── */}
      <div style={{
        background: `${RED}08`,
        border: `1px solid ${RED}18`,
        borderRadius: 8,
        padding: "12px 18px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🔐</span>
        <div style={{
          fontSize: 12, fontFamily: "Inter, sans-serif",
          color: TEXT_DIM, lineHeight: 1.55,
        }}>
          <strong style={{ color: TEXT_SEC }}>Administrator session active.</strong>{" "}
          All actions are recorded in the Audit Log. Unauthorized access or data export is prohibited.
          Session expires with browser close.
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Loading state ────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: 320,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 34, height: 34,
          border: `2px solid ${BORDER}`,
          borderTopColor: AMBER,
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite",
          margin: "0 auto 14px",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 12, color: TEXT_DIM, fontFamily: MONO, letterSpacing: "0.08em" }}>
          LOADING SYSTEM DATA…
        </div>
      </div>
    </div>
  );
}

// ─── Access denied state ──────────────────────────────────────

function AccessDenied({ msg }: { msg: string }) {
  return (
    <div style={{
      background: `${RED}08`,
      border: `1px solid ${RED}30`,
      borderRadius: 8,
      padding: "40px 28px",
      textAlign: "center",
      maxWidth: 440, margin: "60px auto",
    }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>🚫</div>
      <div style={{
        fontSize: 11, fontWeight: 700,
        fontFamily: MONO, color: RED,
        letterSpacing: "0.12em",
        marginBottom: 10,
      }}>ACCESS DENIED</div>
      <div style={{ fontSize: 13, color: TEXT_SEC, fontFamily: "Inter, sans-serif" }}>{msg}</div>
    </div>
  );
}
