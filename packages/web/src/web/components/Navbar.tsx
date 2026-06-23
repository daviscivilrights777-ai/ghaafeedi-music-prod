import { useState, useEffect } from "react";
import { GhaafeediLogo } from "./GhaafeediLogo";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { authClient } from "../lib/authClient";

const GOLD   = "#D4AF37";
const GOLD_L = "#F4D67A";
const NAVY   = "#0B1736";
const BG     = "#080810";

// ── Dashboard sections ────────────────────────────────────────────────────────
const DASH_ITEMS = [
  { id: "overview",     label: "Overview",       desc: "Your snapshot & stats",           icon: OverviewIcon    },
  { id: "productions",  label: "Productions",    desc: "Track active AI jobs",             icon: ProductionsIcon },
  { id: "deliverables", label: "Deliverables",   desc: "Download your finished files",     icon: DeliverablesIcon},
  { id: "memberships",  label: "Memberships",    desc: "Plans, tiers & renewal dates",     icon: MembershipIcon  },
  { id: "billing",      label: "Billing",        desc: "Invoices, payments & credits",     icon: BillingIcon     },
  { id: "revisions",    label: "Revisions",      desc: "Request edits on your orders",     icon: RevisionsIcon   },
  { id: "support",      label: "Support",        desc: "Open a ticket or chat with us",    icon: SupportIcon     },
  { id: "referrals",    label: "Referrals",      desc: "Earn credits by sharing",          icon: ReferralsIcon   },
  { id: "settings",     label: "Settings",       desc: "Profile, password & preferences",  icon: SettingsIcon    },
];

// ── SVG icon components ───────────────────────────────────────────────────────
function OverviewIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function ProductionsIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
}
function DeliverablesIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
function MembershipIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
function BillingIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function RevisionsIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function SupportIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function ReferralsIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}
function SettingsIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function ProductsNavIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ transition: "transform 0.22s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function SignOutIcon({ c }: { c: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

// ── Dropdown panel ────────────────────────────────────────────────────────────
function MemberDropdown({
  session, onClose, onSignOut, setLocation,
}: {
  session: any; onClose: () => void; onSignOut: () => void; setLocation: (p: string) => void;
}) {
  const name   = session?.user?.name  ?? "Member";
  const email  = session?.user?.email ?? "";
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const go = (path: string) => { setLocation(path); onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: 340,
        background: "rgba(8,8,18,0.98)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        border: "1px solid rgba(212,175,55,0.18)",
        borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.72), 0 0 0 1px rgba(212,175,55,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
        overflow: "hidden",
        zIndex: 2000,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Member Header ──────────────────────────── */}
      <div style={{
        padding: "18px 20px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(11,23,54,0.4) 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD} 0%, #9A6F1F 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: "#0A0B0F",
            fontFamily: "Inter, sans-serif",
            flexShrink: 0,
            boxShadow: "0 0 16px rgba(212,175,55,0.35)",
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 14.5, fontWeight: 600, color: "#fff", letterSpacing: "0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {name}
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {email}
            </div>
          </div>
          {/* Member badge */}
          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            <span style={{
              fontFamily: "Inter, sans-serif", fontSize: 9.5, fontWeight: 700,
              color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase",
              background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)",
              borderRadius: 4, padding: "2px 7px",
            }}>
              MEMBER
            </span>
          </div>
        </div>
      </div>

      {/* ── Products CTA ───────────────────────────── */}
      <div style={{ padding: "10px 12px 6px" }}>
        <button
          onClick={() => go("/products")}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg, rgba(212,175,55,0.13) 0%, rgba(212,175,55,0.05) 100%)",
            border: "1px solid rgba(212,175,55,0.22)", borderRadius: 10,
            padding: "10px 14px", cursor: "pointer", transition: "all 0.18s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.10) 100%)";
            e.currentTarget.style.borderColor = "rgba(212,175,55,0.5)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(212,175,55,0.13) 0%, rgba(212,175,55,0.05) 100%)";
            e.currentTarget.style.borderColor = "rgba(212,175,55,0.22)";
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #D4AF37 0%, #9A6F1F 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <ProductsNavIcon c="#0A0B0F" />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: GOLD, letterSpacing: "0.01em" }}>
              Browse Products
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 1 }}>
              15 cinematic experiences
            </div>
          </div>
          <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* ── Divider label ──────────────────────────── */}
      <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          My Account
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
      </div>

      {/* ── Dashboard items ────────────────────────── */}
      <div style={{ padding: "0 8px 6px" }}>
        {DASH_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => go(`/dashboard?tab=${item.id}`)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 11,
                background: "transparent", border: "none",
                borderRadius: 9, padding: "9px 12px",
                cursor: "pointer", transition: "background 0.15s",
                textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* Icon chip */}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon c="rgba(212,175,55,0.75)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.88)", letterSpacing: "0.01em" }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.desc}
                </div>
              </div>
              <svg style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.25 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          );
        })}
      </div>

      {/* ── Sign Out ───────────────────────────────── */}
      <div style={{ padding: "6px 8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={onSignOut}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            background: "transparent", border: "none", borderRadius: 9,
            padding: "10px 12px", cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,100,100,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: "rgba(255,80,80,0.08)",
            border: "1px solid rgba(255,80,80,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <SignOutIcon c="rgba(255,100,100,0.8)" />
          </div>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: "rgba(255,100,100,0.85)", letterSpacing: "0.01em" }}>
            Sign Out
          </span>
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const isLoggedIn = !!session?.user;

  // scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        height: 72,
        background: scrolled ? "rgba(8,8,16,0.97)" : "rgba(8,8,16,0.78)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: scrolled ? "1px solid rgba(212,175,55,0.13)" : "1px solid transparent",
        transition: "background 0.35s ease, border-color 0.35s ease",
      }}
    >
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        height: "100%",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(20px, 4vw, 48px)",
      }}>

        {/* ── Logo ── */}
        <Link
          href="/"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 14 }}
          className="gm-navbar-brand"
        >
          <GhaafeediLogo variant="navbar" height={42} />
        </Link>

        {/* ── Right: auth area ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {sessionLoading ? null : isLoggedIn ? (

            /* ── Logged-in: go to onboarding (the hub) ── */
            <Link href="/onboarding" style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(212,175,55,0.08)",
              border: "1.5px solid rgba(212,175,55,0.28)",
              borderRadius: 999, padding: "7px 18px",
              textDecoration: "none", transition: "all 0.22s",
              color: GOLD, fontFamily: "Inter, sans-serif",
              fontSize: 13, fontWeight: 600, letterSpacing: "0.02em",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.15)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.55)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px rgba(212,175,55,0.22)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.28)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              My Journey
            </Link>

          ) : (

            /* ── Logged-out: Sign In + Get Started ── */
            <>
              <Link href="/signin" style={{
                color: GOLD, fontSize: 13.5, fontFamily: "Inter, sans-serif", fontWeight: 600,
                border: "1.5px solid rgba(212,175,55,0.40)", borderRadius: 999, padding: "8px 22px",
                textDecoration: "none", letterSpacing: "0.025em", transition: "all 0.22s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = GOLD;
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 14px rgba(212,175,55,0.28)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.40)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >Sign In</Link>

              <Link href="/signup" style={{
                background: "linear-gradient(135deg, #FFE8A3 0%, #D4AF37 55%, #9A6F1F 100%)",
                color: "#0A0B0F", fontSize: 13.5, fontFamily: "Inter, sans-serif", fontWeight: 700,
                borderRadius: 999, padding: "9px 22px",
                textDecoration: "none", letterSpacing: "0.025em",
                boxShadow: "0 4px 18px rgba(212,175,55,0.38)", transition: "all 0.22s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(212,175,55,0.60)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 18px rgba(212,175,55,0.38)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >Get Started</Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        .gm-navbar-brand:hover img {
          filter: drop-shadow(0 0 20px rgba(212,175,55,0.75)) !important;
          transform: scale(1.03);
        }
      `}</style>
    </motion.nav>
  );
}
