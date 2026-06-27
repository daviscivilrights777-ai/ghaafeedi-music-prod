// ============================================================
// Ghaafeedi Music — ADMIN LAYOUT
// Command Center aesthetic — completely distinct from customer dashboard
// Palette: steel/charcoal BG, red + amber accents, monospace data
// NO gold/navy/emotional language — pure operations interface
// ============================================================
import { GhaafeediLogo } from "../components/GhaafeediLogo";
import { useState } from "react";
import { useLocation } from "wouter";
import { authClient, clearToken } from "../lib/authClient";

// ─── Admin-only design tokens ─────────────────────────────────
const BG_ROOT    = "#0D0D0F";       // near-black steel
const BG_SIDEBAR = "#0A0A0C";       // slightly deeper sidebar
const BG_HEADER  = "#111114";       // header strip
const BG_CARD    = "#13151A";       // card surface
const BG_CARD2   = "#18191F";       // elevated card
const BORDER     = "rgba(255,255,255,0.06)";
const BORDER_ACC = "rgba(239,68,68,0.20)";
const RED        = "#EF4444";
const AMBER      = "#F59E0B";
const GREEN      = "#22C55E";
const BLUE       = "#3B82F6";
const PURPLE     = "#8B5CF6";
const TEXT_PRI   = "#F1F5F9";
const TEXT_SEC   = "rgba(241,245,249,0.50)";
const TEXT_DIM   = "rgba(241,245,249,0.25)";
const MONO       = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace";

const NAV_ITEMS = [
  { path: "/admin",             label: "Overview",     icon: "⬡", accent: AMBER },
  { path: "/admin/members",     label: "Members",      icon: "◉", accent: BLUE },
  { path: "/admin/orders",      label: "Orders",       icon: "◎", accent: AMBER },
  { path: "/admin/productions", label: "Productions",  icon: "▶", accent: "#06B6D4" },
  { path: "/admin/ai-jobs",     label: "AI Jobs",      icon: "⚡", accent: PURPLE },
  { path: "/admin/lipsync",     label: "Lip Sync",     icon: "🎙", accent: "#EC4899" },
  { path: "/admin/revenue",     label: "Revenue",      icon: "▣", accent: GREEN },
  { path: "/admin/support",     label: "Support",      icon: "◈", accent: BLUE },
  { path: "/admin/audit-logs",  label: "Audit Logs",   icon: "≡", accent: "#64748B" },
];

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: Props) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    clearToken();
    window.history.replaceState(null, "", "/signin");
    setLocation("/signin");
  };

  const SidebarContent = () => (
    <>
      {/* Logo + collapse toggle */}
      <div
        style={{
          padding: collapsed ? "18px 0" : "18px 16px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          cursor: "pointer", userSelect: "none",
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <GhaafeediLogo variant="navbar" />
          {!collapsed && (
            <div style={{
              fontSize: 9, fontFamily: MONO,
              color: RED, fontWeight: 700,
              letterSpacing: "0.15em",
              background: `${RED}15`,
              border: `1px solid ${RED}30`,
              borderRadius: 3,
              padding: "2px 6px",
            }}>ADMIN</div>
          )}
        </div>
        {!collapsed && (
          <span style={{ fontSize: 12, color: TEXT_DIM }}>‹</span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        {NAV_ITEMS.map(item => {
          const active = item.path === "/admin"
            ? location === "/admin"
            : location.startsWith(item.path);
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={e => { e.preventDefault(); setLocation(item.path); setMobileOpen(false); }}
              style={{
                display: "flex", alignItems: "center",
                gap: collapsed ? 0 : 10,
                padding: collapsed ? "10px 0" : "10px 16px",
                justifyContent: collapsed ? "center" : "flex-start",
                textDecoration: "none",
                background: active ? `${item.accent}12` : "transparent",
                borderLeft: active ? `3px solid ${item.accent}` : "3px solid transparent",
                marginBottom: 1,
                transition: "all 0.13s",
                cursor: "pointer",
                position: "relative",
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = `${item.accent}08`;
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span style={{
                fontSize: 14,
                color: active ? item.accent : TEXT_DIM,
                transition: "color 0.13s",
                width: 18, textAlign: "center", flexShrink: 0,
              }}>{item.icon}</span>
              {!collapsed && (
                <span style={{
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  fontFamily: "Inter, sans-serif",
                  color: active ? TEXT_PRI : TEXT_SEC,
                  transition: "color 0.13s",
                }}>{item.label}</span>
              )}
              {/* collapsed tooltip */}
              {collapsed && (
                <span style={{
                  position: "absolute", left: "calc(100% + 8px)",
                  top: "50%", transform: "translateY(-50%)",
                  background: BG_CARD2, border: `1px solid ${BORDER}`,
                  borderRadius: 4, padding: "4px 8px",
                  fontSize: 11, fontFamily: "Inter, sans-serif",
                  color: TEXT_PRI, whiteSpace: "nowrap",
                  pointerEvents: "none", opacity: 0,
                  transition: "opacity 0.13s",
                  zIndex: 100,
                }} className="admin-nav-tooltip">{item.label}</span>
              )}
            </a>
          );
        })}
      </nav>

      {/* Bottom: session info + sign out */}
      <div style={{
        padding: collapsed ? "14px 0" : "14px 16px",
        borderTop: `1px solid ${BORDER}`,
      }}>
        {!collapsed && (
          <>
            <div style={{
              fontSize: 9, fontFamily: MONO,
              color: TEXT_DIM, letterSpacing: "0.12em",
              marginBottom: 4,
            }}>ACTIVE SESSION</div>
            <div style={{
              fontSize: 11, fontFamily: MONO,
              color: TEXT_SEC, marginBottom: 10,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {session?.user?.email ?? "ghaafeedimusiclabel@proton.me"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setLocation("/")}
                style={{
                  flex: 1, fontSize: 10, fontFamily: "Inter, sans-serif",
                  background: "none",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4, padding: "5px 0",
                  color: TEXT_DIM, cursor: "pointer",
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.color = TEXT_SEC;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = BORDER;
                  e.currentTarget.style.color = TEXT_DIM;
                }}
              >← Site</button>
              <button
                onClick={handleSignOut}
                style={{
                  flex: 1, fontSize: 10, fontFamily: "Inter, sans-serif",
                  background: `${RED}10`,
                  border: `1px solid ${RED}25`,
                  borderRadius: 4, padding: "5px 0",
                  color: RED, cursor: "pointer",
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${RED}20`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = `${RED}10`;
                }}
              >Sign Out</button>
            </div>
          </>
        )}
        {collapsed && (
          <div style={{ textAlign: "center" }}>
            <button
              onClick={handleSignOut}
              style={{
                background: `${RED}10`, border: `1px solid ${RED}25`,
                borderRadius: 6, padding: "7px 10px",
                color: RED, cursor: "pointer", fontSize: 13,
              }}
              title="Sign Out"
            >⏻</button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-mobile-bar { display: flex !important; }
          .admin-main-content { margin-left: 0 !important; }
        }
        .admin-nav-tooltip { opacity: 0; }
        .admin-nav-item:hover .admin-nav-tooltip { opacity: 1; }
      `}</style>

      <div style={{
        display: "flex", minHeight: "100vh",
        background: BG_ROOT,
        fontFamily: "Inter, sans-serif",
      }}>
        {/* Desktop Sidebar */}
        <div
          className="admin-sidebar-desktop"
          style={{
            width: collapsed ? 56 : 216,
            minHeight: "100vh",
            background: BG_SIDEBAR,
            borderRight: `1px solid ${BORDER}`,
            display: "flex", flexDirection: "column",
            transition: "width 0.22s ease",
            flexShrink: 0,
            position: "fixed", top: 0, left: 0, bottom: 0,
            zIndex: 50,
            overflowX: "hidden",
          }}
        >
          <SidebarContent />
        </div>

        {/* Mobile top bar */}
        <div
          className="admin-mobile-bar"
          style={{
            display: "none",
            position: "fixed", top: 0, left: 0, right: 0,
            height: 52, background: BG_SIDEBAR,
            borderBottom: `1px solid ${BORDER}`,
            zIndex: 60, alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GhaafeediLogo variant="navbar" />
            <div style={{
              fontSize: 9, fontFamily: MONO, color: RED, fontWeight: 700,
              letterSpacing: "0.15em", background: `${RED}15`,
              border: `1px solid ${RED}30`, borderRadius: 3, padding: "2px 6px",
            }}>ADMIN</div>
          </div>
          <button
            onClick={() => setMobileOpen(o => !o)}
            style={{
              background: "none", border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: "6px 10px",
              color: TEXT_SEC, cursor: "pointer", fontSize: 15,
            }}
          >☰</button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 70,
              background: "rgba(0,0,0,0.7)",
            }}
            onClick={() => setMobileOpen(false)}
          >
            <div
              style={{
                width: 230, height: "100%",
                background: BG_SIDEBAR,
                borderRight: `1px solid ${BORDER}`,
                display: "flex", flexDirection: "column",
              }}
              onClick={e => e.stopPropagation()}
            >
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main content */}
        <div
          className="admin-main-content"
          style={{
            flex: 1,
            marginLeft: collapsed ? 56 : 216,
            transition: "margin-left 0.22s ease",
            minHeight: "100vh",
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Sticky header */}
          <div style={{
            padding: "18px 32px 16px",
            borderBottom: `1px solid ${BORDER}`,
            background: BG_HEADER,
            position: "sticky", top: 0, zIndex: 40,
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 16,
          }}>
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: subtitle ? 2 : 0,
              }}>
                {/* Amber bar accent */}
                <div style={{
                  width: 3, height: 18,
                  background: AMBER,
                  borderRadius: 2, flexShrink: 0,
                }} />
                <h1 style={{
                  margin: 0, fontFamily: "Inter, sans-serif",
                  fontSize: 17, fontWeight: 700, color: TEXT_PRI,
                  letterSpacing: "0.01em",
                }}>{title}</h1>
              </div>
              {subtitle && (
                <p style={{
                  margin: "0 0 0 13px", fontSize: 11,
                  color: TEXT_DIM, fontFamily: MONO,
                  letterSpacing: "0.06em",
                }}>{subtitle}</p>
              )}
            </div>

            {/* Header right: live indicator */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: `${GREEN}10`,
              border: `1px solid ${GREEN}25`,
              borderRadius: 6, padding: "5px 10px",
              flexShrink: 0,
            }}>
              <span style={{
                display: "inline-block", width: 6, height: 6,
                borderRadius: "50%", background: GREEN,
                boxShadow: `0 0 6px ${GREEN}`,
                animation: "admin-pulse 2s ease-in-out infinite",
              }} />
              <span style={{
                fontSize: 10, fontFamily: MONO,
                color: GREEN, fontWeight: 700,
                letterSpacing: "0.10em",
              }}>LIVE</span>
            </div>
          </div>

          {/* Page content */}
          <div style={{
            flex: 1,
            padding: "24px 32px",
            overflowX: "hidden",
          }}>
            {children}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes admin-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────

export function KpiCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  const a = accent ?? AMBER;
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderTop: `2px solid ${a}`,
      borderRadius: 8,
      padding: "16px 20px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        fontSize: 9, fontFamily: MONO,
        fontWeight: 700, letterSpacing: "0.12em",
        color: TEXT_DIM, textTransform: "uppercase",
        marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 700,
        fontFamily: MONO, color: TEXT_PRI, lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{
          marginTop: 7, fontSize: 11,
          fontFamily: "Inter, sans-serif", color: TEXT_SEC,
        }}>{sub}</div>
      )}
    </div>
  );
}

export function AdminTable({
  columns, rows, emptyMsg = "No records found.",
}: {
  columns: { key: string; label: string; width?: string | number }[];
  rows: Record<string, React.ReactNode>[];
  emptyMsg?: string;
}) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 8, overflow: "hidden",
    }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{
              background: BG_CARD2,
              borderBottom: `1px solid ${BORDER}`,
            }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  padding: "10px 14px", textAlign: "left",
                  fontSize: 10, color: TEXT_DIM,
                  fontWeight: 700, letterSpacing: "0.10em",
                  fontFamily: MONO, width: col.width,
                }}>{col.label.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{
                  padding: "40px 16px", textAlign: "center",
                  color: TEXT_DIM, fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                }}>{emptyMsg}</td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={i} style={{
                borderBottom: i < rows.length - 1
                  ? `1px solid rgba(255,255,255,0.03)`
                  : "none",
                transition: "background 0.12s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = BG_CARD2;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding: "11px 14px", fontSize: 12,
                    color: TEXT_SEC,
                    maxWidth: 220, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFamily: "Inter, sans-serif",
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
    active:     { bg: "rgba(34,197,94,0.12)",  color: "#22C55E" },
    completed:  { bg: "rgba(34,197,94,0.12)",  color: "#22C55E" },
    delivered:  { bg: "rgba(34,197,94,0.12)",  color: "#22C55E" },
    running:    { bg: "rgba(59,130,246,0.12)", color: "#60A5FA" },
    processing: { bg: "rgba(59,130,246,0.12)", color: "#60A5FA" },
    dispatched: { bg: "rgba(59,130,246,0.12)", color: "#60A5FA" },
    queued:     { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    pending:    { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    open:       { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    failed:     { bg: "rgba(239,68,68,0.12)",  color: "#F87171" },
    cancelled:  { bg: "rgba(239,68,68,0.12)",  color: "#F87171" },
    suspended:  { bg: "rgba(239,68,68,0.12)",  color: "#F87171" },
    resolved:   { bg: "rgba(148,163,184,0.12)",color: "#94A3B8" },
    archived:   { bg: "rgba(148,163,184,0.12)",color: "#94A3B8" },
  };
  const style = map[status?.toLowerCase()] ?? { bg: "rgba(255,255,255,0.06)", color: TEXT_DIM };
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: "3px 8px", borderRadius: 4, fontSize: 10,
      fontWeight: 700, letterSpacing: "0.06em",
      fontFamily: MONO, textTransform: "uppercase",
    }}>{status}</span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    elite:      { bg: "rgba(245,158,11,0.15)",  color: AMBER },
    enterprise: { bg: "rgba(245,158,11,0.15)",  color: AMBER },
    premium:    { bg: "rgba(168,85,247,0.13)",  color: "#C084FC" },
    starter:    { bg: "rgba(59,130,246,0.13)",  color: "#60A5FA" },
    free:       { bg: "rgba(255,255,255,0.05)", color: TEXT_DIM },
  };
  const style = map[tier?.toLowerCase()] ?? map["free"]!;
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: "3px 8px", borderRadius: 4, fontSize: 10,
      fontWeight: 700, letterSpacing: "0.08em",
      fontFamily: MONO, textTransform: "uppercase",
    }}>{tier}</span>
  );
}

export function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 8, padding: "18px 20px",
      marginBottom: 20,
    }}>
      {title && (
        <div style={{
          fontSize: 10, fontWeight: 700,
          fontFamily: MONO, color: TEXT_DIM,
          letterSpacing: "0.12em", textTransform: "uppercase",
          marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            display: "inline-block", width: 3, height: 12,
            background: AMBER, borderRadius: 2,
          }} />
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function fmt$(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtDate(d: Date | string | number | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}
