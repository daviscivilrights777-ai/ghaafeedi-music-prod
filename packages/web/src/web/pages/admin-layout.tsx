import { GhaafeediLogo } from "../components/GhaafeediLogo";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { authClient } from "../lib/authClient";

const GOLD = "#D4AF37";
const GOLD2 = "#F0D060";
const NAVY = "#0B1736";
const BG = "#050B1A";
const SIDEBAR_BG = "#07101F";

const NAV_ITEMS = [
  { path: "/admin",            label: "Overview",     icon: "◈" },
  { path: "/admin/members",    label: "Members",      icon: "◉" },
  { path: "/admin/orders",     label: "Orders",       icon: "◎" },
  { path: "/admin/productions",label: "Productions",  icon: "⬡" },
  { path: "/admin/ai-jobs",    label: "AI Jobs",      icon: "◇" },
  { path: "/admin/revenue",    label: "Revenue",      icon: "◈" },
  { path: "/admin/support",    label: "Support",      icon: "◉" },
  { path: "/admin/audit-logs", label: "Audit Logs",   icon: "≡" },
];

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: Props) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = authClient.useSession();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BG, fontFamily: "Inter, sans-serif" }}>
      {/* Sidebar */}
      <div style={{
        width: collapsed ? 64 : 220,
        minHeight: "100vh",
        background: SIDEBAR_BG,
        borderRight: `1px solid rgba(212,175,55,0.12)`,
        display: "flex", flexDirection: "column",
        transition: "width 0.25s ease",
        flexShrink: 0,
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? "20px 14px" : "22px 20px",
          borderBottom: "1px solid rgba(212,175,55,0.1)",
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer",
        }} onClick={() => setCollapsed(c => !c)}>
          <GhaafeediLogo variant={collapsed ? "navbar" : "footer"} />
          {!collapsed && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginTop: 2 }}>ADMIN</div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "16px 0", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const active = item.path === "/admin"
              ? location === "/admin"
              : location.startsWith(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={e => { e.preventDefault(); setLocation(item.path); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: collapsed ? "11px 0" : "11px 20px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  textDecoration: "none",
                  background: active ? "rgba(212,175,55,0.1)" : "transparent",
                  borderLeft: active ? `3px solid ${GOLD}` : "3px solid transparent",
                  marginBottom: 2,
                  transition: "all 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.05)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{
                  fontSize: 14,
                  color: active ? GOLD : "rgba(255,255,255,0.45)",
                  transition: "color 0.15s",
                }}>{item.icon}</span>
                {!collapsed && (
                  <span style={{
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    color: active ? GOLD : "rgba(255,255,255,0.6)",
                    transition: "color 0.15s",
                  }}>{item.label}</span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Bottom: user + sign out */}
        {!collapsed && (
          <div style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(212,175,55,0.1)",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4, letterSpacing: "0.06em" }}>SIGNED IN AS</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session?.user?.email ?? "admin"}
            </div>
            <a href="/" style={{
              fontSize: 11, color: "rgba(255,255,255,0.35)",
              textDecoration: "none", letterSpacing: "0.05em",
            }}>← Back to site</a>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div style={{
        flex: 1,
        marginLeft: collapsed ? 64 : 220,
        transition: "margin-left 0.25s ease",
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Top header */}
        <div style={{
          padding: "24px 36px 20px",
          borderBottom: "1px solid rgba(212,175,55,0.08)",
          background: "rgba(7,16,31,0.6)",
          backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 40,
        }}>
          <h1 style={{
            margin: 0, fontFamily: "Playfair Display, serif",
            fontSize: 22, fontWeight: 700, color: "#FFFFFF",
          }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif" }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "28px 36px", overflowX: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

export function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: "rgba(11,23,54,0.7)",
      border: `1px solid ${accent ? accent + "33" : "rgba(212,175,55,0.15)"}`,
      borderRadius: 14, padding: "20px 24px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: accent ?? `linear-gradient(90deg, ${GOLD}, transparent)`,
        borderRadius: "14px 14px 0 0",
      }} />
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 8 }}>
        {label.toUpperCase()}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 700, fontFamily: "Playfair Display, serif",
        color: accent ?? GOLD, lineHeight: 1.1, marginBottom: sub ? 4 : 0,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{sub}</div>}
    </div>
  );
}

export function AdminTable({ columns, rows, emptyMsg = "No records found." }: {
  columns: { key: string; label: string; width?: string | number }[];
  rows: Record<string, React.ReactNode>[];
  emptyMsg?: string;
}) {
  return (
    <div style={{
      background: "rgba(7,16,31,0.85)",
      border: "1px solid rgba(212,175,55,0.12)",
      borderRadius: 14, overflow: "hidden",
    }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(212,175,55,0.06)", borderBottom: "1px solid rgba(212,175,55,0.12)" }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  padding: "12px 16px", textAlign: "left",
                  fontSize: 11, color: "rgba(255,255,255,0.45)",
                  fontWeight: 600, letterSpacing: "0.08em",
                  width: col.width,
                }}>{col.label.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{
                  padding: "40px 16px", textAlign: "center",
                  color: "rgba(255,255,255,0.25)", fontSize: 13,
                }}>{emptyMsg}</td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={i} style={{
                borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.03)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding: "12px 16px", fontSize: 13,
                    color: "rgba(255,255,255,0.75)",
                    maxWidth: 220, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:     { bg: "rgba(34,197,94,0.15)",  color: "#22C55E" },
    completed:  { bg: "rgba(34,197,94,0.15)",  color: "#22C55E" },
    delivered:  { bg: "rgba(34,197,94,0.15)",  color: "#22C55E" },
    running:    { bg: "rgba(59,130,246,0.15)", color: "#60A5FA" },
    processing: { bg: "rgba(59,130,246,0.15)", color: "#60A5FA" },
    queued:     { bg: "rgba(212,175,55,0.15)", color: "#D4AF37" },
    pending:    { bg: "rgba(212,175,55,0.15)", color: "#D4AF37" },
    open:       { bg: "rgba(212,175,55,0.15)", color: "#D4AF37" },
    failed:     { bg: "rgba(239,68,68,0.15)",  color: "#F87171" },
    cancelled:  { bg: "rgba(239,68,68,0.15)",  color: "#F87171" },
    suspended:  { bg: "rgba(239,68,68,0.15)",  color: "#F87171" },
    resolved:   { bg: "rgba(148,163,184,0.15)",color: "#94A3B8" },
    archived:   { bg: "rgba(148,163,184,0.15)",color: "#94A3B8" },
  };
  const style = map[status.toLowerCase()] ?? { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" };
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: "3px 9px", borderRadius: 20, fontSize: 11,
      fontWeight: 600, letterSpacing: "0.04em",
    }}>{status}</span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    elite:      { bg: "rgba(212,175,55,0.2)",  color: "#D4AF37" },
    enterprise: { bg: "rgba(212,175,55,0.2)",  color: "#D4AF37" },
    premium:    { bg: "rgba(168,85,247,0.15)", color: "#C084FC" },
    starter:    { bg: "rgba(59,130,246,0.15)", color: "#60A5FA" },
    free:       { bg: "rgba(255,255,255,0.06)",color: "rgba(255,255,255,0.4)" },
  };
  const style = map[tier?.toLowerCase()] ?? map["free"];
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: "3px 9px", borderRadius: 20, fontSize: 11,
      fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
    }}>{tier}</span>
  );
}

export function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(7,16,31,0.85)",
      border: "1px solid rgba(212,175,55,0.12)",
      borderRadius: 14, padding: "22px 24px", marginBottom: 24,
    }}>
      {title && (
        <div style={{
          fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)",
          letterSpacing: "0.05em", marginBottom: 18,
          borderBottom: "1px solid rgba(212,175,55,0.08)", paddingBottom: 12,
        }}>{title}</div>
      )}
      {children}
    </div>
  );
}

export function fmt$(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(d: Date | string | number | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}
