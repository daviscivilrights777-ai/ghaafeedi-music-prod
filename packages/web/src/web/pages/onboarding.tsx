import { GhaafeediLogo } from "../components/GhaafeediLogo";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useSession } from "../lib/authClient";
import { AuthGateModal } from "../components/AuthGateModal";
import { DodoPayments } from "dodopayments-checkout";

// ─── Brand tokens ────────────────────────────────────────────────────────────
const GOLD   = "#D4AF37";
const GOLD2  = "#F4D06F";
const BG_DARK = "#080810";
const BG2    = "#0D0D1A";
const WHITE  = "#FFFFFF";

const STEPS = [
  "Welcome","Who Is This For","Choose Experience","Tell Your Story",
  "AI Analysis","Preview Creation","Production Portal","Checkout","Confirmation",
];

// ─────────────────────────────────────────────────────────────────────────────
//  STARS
// ─────────────────────────────────────────────────────────────────────────────
const STAR_DATA = Array.from({ length: 150 }, (_, i) => ({
  id: i,
  top:  `${(Math.sin(i * 7.3) * 0.5 + 0.5) * 100}%`,
  left: `${(Math.cos(i * 5.1) * 0.5 + 0.5) * 100}%`,
  size: (i % 4 === 0) ? 2.5 : (i % 3 === 0) ? 1.8 : (i % 2 === 0) ? 1.2 : 0.9,
  delay: (i * 0.13) % 5,
  opacity: 0.12 + (i % 6) * 0.08,
}));

function Stars() {
  return (
    <div style={{ position:"absolute", inset:0, zIndex:1, pointerEvents:"none", overflow:"hidden" }}>
      {STAR_DATA.map(s => (
        <div key={s.id} style={{
          position:"absolute", top:s.top, left:s.left,
          width:s.size, height:s.size, borderRadius:"50%",
          background:WHITE, opacity:s.opacity,
          animation:`starTwinkle ${2.5 + s.delay}s ease-in-out infinite`,
          animationDelay:`${s.delay}s`,
        }}/>
      ))}
      <style>{`
        @keyframes starTwinkle {
          0%,100%{opacity:.05} 50%{opacity:.75}
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TRUST BADGE ROW (Figma: icon + label + sublabel, stacked)
// ─────────────────────────────────────────────────────────────────────────────
interface TrustItem {
  svg: React.ReactNode;
  label: string;
  sub: string;
}

const TRUST_ITEMS: TrustItem[] = [
  {
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z"
          stroke={GOLD} strokeWidth="1.6" fill="none"/>
        <path d="M9 12l2 2 4-4" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: "100% Secure",
    sub: "SSL Encrypted",
  },
  {
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={GOLD} strokeWidth="1.6"/>
        <path d="M9 11.5c0-1.7 1.3-3 3-3s3 1.3 3 3c0 1.2-.7 2.2-1.7 2.7l-.3 1.8H11l-.3-1.8C9.7 13.7 9 12.7 9 11.5z"
          stroke={GOLD} strokeWidth="1.4" fill="none"/>
        <circle cx="12" cy="17.5" r="0.8" fill={GOLD}/>
      </svg>
    ),
    label: "Satisfaction",
    sub: "Guaranteed",
  },
  {
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.9 6.1L22 9.3l-5 5 1.2 7.1L12 18l-6.2 3.4L7 14.3 2 9.3l7.1-1.2L12 2z"
          stroke={GOLD} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
      </svg>
    ),
    label: "Premium",
    sub: "Quality",
  },
  {
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3" stroke={GOLD} strokeWidth="1.6"/>
        <circle cx="15" cy="8" r="3" stroke={GOLD} strokeWidth="1.6"/>
        <path d="M3 20c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    label: "50,000+",
    sub: "Stories Created",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 1 — WELCOME
// ─────────────────────────────────────────────────────────────────────────────
const URGENCY_TICKER = [
  "🔴 Only 4 spots remaining this week",
  "⭐ 50,000+ stories created and counting",
  "🔒 Your story is private & secure",
];

// ─── S1 Member Dropdown (inline, only in S1 header) ────────────────────────
const S1_DASH_ITEMS = [
  { id: "overview",     label: "Overview",       desc: "Your snapshot & stats"         },
  { id: "productions",  label: "Productions",    desc: "Track active AI jobs"          },
  { id: "deliverables", label: "Deliverables",   desc: "Download your finished files"  },
  { id: "memberships",  label: "Memberships",    desc: "Plans, tiers & renewal dates"  },
  { id: "billing",      label: "Billing",        desc: "Invoices, payments & credits"  },
  { id: "revisions",    label: "Revisions",      desc: "Request edits on your orders"  },
  { id: "support",      label: "Support",        desc: "Open a ticket or chat with us" },
  { id: "referrals",    label: "Referrals",      desc: "Earn credits by sharing"       },
  { id: "settings",     label: "Settings",       desc: "Profile, password & prefs"     },
];

function S1ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function S1MemberDropdown({
  session, setLocation,
}: { session: any; setLocation: (p: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const dropRef = React.useRef<HTMLDivElement>(null);

  const name     = session?.user?.name  ?? "Member";
  const email    = session?.user?.email ?? "";
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  // click-outside close
  React.useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const go = (path: string) => { setOpen(false); setLocation(path); };

  const handleSignOut = async () => {
    setOpen(false);
    const { authClient: ac } = await import("../lib/authClient");
    await ac.signOut();
    setLocation("/signin");
  };

  return (
    <div ref={dropRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: open ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.05)",
          border: `1.5px solid ${open ? "rgba(212,175,55,0.50)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 999, padding: "5px 13px 5px 6px",
          cursor: "pointer", transition: "all 0.18s",
          boxShadow: open ? "0 0 18px rgba(212,175,55,0.22)" : "none",
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background = "rgba(212,175,55,0.09)";
            e.currentTarget.style.borderColor = "rgba(212,175,55,0.38)";
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD} 0%, #9A6F1F 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11.5, fontWeight: 700, color: "#0A0B0F",
          fontFamily: "Inter, sans-serif", flexShrink: 0,
          boxShadow: "0 0 10px rgba(212,175,55,0.32)",
        }}>
          {initials}
        </div>
        <span style={{
          fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
          color: "rgba(255,255,255,0.88)", maxWidth: 100,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {name.split(" ")[0]}
        </span>
        <span style={{ color: "rgba(255,255,255,0.40)", display: "flex", alignItems: "center" }}>
          <S1ChevronIcon open={open} />
        </span>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              width: 320,
              background: "rgba(8,8,18,0.98)",
              backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
              border: "1px solid rgba(212,175,55,0.18)", borderRadius: 16,
              boxShadow: "0 24px 64px rgba(0,0,0,0.72), 0 0 0 1px rgba(212,175,55,0.06)",
              overflow: "hidden", zIndex: 9999,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "16px 18px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(11,23,54,0.4) 100%)",
              display: "flex", alignItems: "center", gap: 11,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: `linear-gradient(135deg, ${GOLD} 0%, #9A6F1F 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#0A0B0F",
                fontFamily: "Inter, sans-serif", flexShrink: 0,
                boxShadow: "0 0 16px rgba(212,175,55,0.35)",
              }}>{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
              </div>
              <span style={{
                marginLeft: "auto", flexShrink: 0,
                fontFamily: "Inter, sans-serif", fontSize: 9, fontWeight: 700,
                color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" as const,
                background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: 4, padding: "2px 7px",
              }}>MEMBER</span>
            </div>

            {/* Browse Products CTA */}
            <div style={{ padding: "8px 10px 4px" }}>
              <button onClick={() => go("/products")} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                background: "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)",
                border: "1px solid rgba(212,175,55,0.22)", borderRadius: 10,
                padding: "9px 13px", cursor: "pointer", transition: "all 0.18s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(212,175,55,0.20) 0%, rgba(212,175,55,0.09) 100%)";
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.48)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)";
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.22)";
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: "linear-gradient(135deg, #D4AF37 0%, #9A6F1F 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0B0F" strokeWidth="1.8">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: GOLD }}>Browse Products</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.38)", marginTop: 1 }}>15 cinematic experiences</div>
                </div>
                <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {/* Section label */}
            <div style={{ padding: "6px 18px 3px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,0.22)", letterSpacing: "0.14em", textTransform: "uppercase" as const }}>My Account</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }}/>
            </div>

            {/* Dashboard items */}
            <div style={{ padding: "0 6px 4px" }}>
              {S1_DASH_ITEMS.map(item => (
                <button key={item.id} onClick={() => go(`/dashboard?tab=${item.id}`)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    background: "transparent", border: "none", borderRadius: 8,
                    padding: "8px 12px", cursor: "pointer", transition: "background 0.14s", textAlign: "left",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{item.label}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.30)", marginTop: 1 }}>{item.desc}</div>
                  </div>
                  <svg style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.22 }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
            </div>

            {/* Sign Out */}
            <div style={{ padding: "4px 6px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={handleSignOut}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  background: "transparent", border: "none", borderRadius: 8,
                  padding: "9px 12px", cursor: "pointer", transition: "background 0.14s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,80,80,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,100,100,0.8)" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 500, color: "rgba(255,100,100,0.85)" }}>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Step1Welcome({ onNext, sessionLoading, isLoggedIn, session }: { onNext: () => void; sessionLoading?: boolean; isLoggedIn?: boolean; session?: any }) {
  const [hoverStart, setHoverStart] = useState(false);
  const [hoverDemo,  setHoverDemo]  = useState(false);
  const [tickerIdx,  setTickerIdx]  = useState(0);
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % URGENCY_TICKER.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="ob-step1-root" style={{
      position:"relative", width:"100%", height:"100%",
      minHeight:"100%", overflow:"hidden",
      background:`linear-gradient(160deg, #06040f 0%, #0a0718 35%, #0d0a22 65%, #070510 100%)`,
      display:"flex", flexDirection:"column",
    }}>
      <Stars />

      {/* ── NEBULA / ATMOSPHERE LAYERS (matches Figma purple-gold cosmic bg) ── */}

      {/* Layer 1: deep purple nebula — desktop anchored center-right, mobile spans full height */}
      <div className="ob-nebula-1" style={{
        position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
        background:`
          radial-gradient(ellipse 70% 80% at 68% 52%, rgba(72,28,140,0.32) 0%, rgba(50,15,100,0.16) 40%, transparent 70%),
          radial-gradient(ellipse 45% 55% at 80% 35%, rgba(90,30,160,0.20) 0%, transparent 55%),
          radial-gradient(ellipse 55% 65% at 55% 65%, rgba(60,20,120,0.18) 0%, transparent 60%)
        `,
      }}/>

      {/* Layer 2: warm gold halo around portal zone */}
      <div className="ob-nebula-2" style={{
        position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
        background:`
          radial-gradient(ellipse 42% 55% at 72% 54%, rgba(212,175,55,0.18) 0%, rgba(180,130,20,0.06) 45%, transparent 70%),
          radial-gradient(ellipse 28% 35% at 65% 80%, rgba(212,175,55,0.12) 0%, transparent 55%)
        `,
      }}/>

      {/* Layer 3: teal/cyan aurora — left edge */}
      <div className="ob-nebula-3" style={{
        position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
        background:`
          radial-gradient(ellipse 30% 40% at 5% 45%, rgba(20,80,120,0.20) 0%, transparent 60%),
          radial-gradient(ellipse 20% 30% at 30% 85%, rgba(15,60,100,0.14) 0%, transparent 55%)
        `,
      }}/>

      {/* Layer 4: left vignette — desktop only (mobile override removes top suppression) */}
      <div className="ob-vignette" style={{
        position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
        background:`
          radial-gradient(ellipse 50% 70% at 0% 50%, rgba(4,2,12,0.72) 0%, transparent 65%),
          radial-gradient(ellipse 40% 30% at 50% 0%, rgba(4,2,12,0.50) 0%, transparent 55%),
          radial-gradient(ellipse 40% 25% at 50% 100%, rgba(4,2,12,0.40) 0%, transparent 55%)
        `,
      }}/>

      {/* ── HEADER ── */}
      <header className="ob-header" style={{
        position:"relative", zIndex:10,
        width:"100%", height:64,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 clamp(20px,4vw,60px)",
        flexShrink:0,
      }}>
        {/* 01 WELCOME */}
        <div className="ob-header-step" style={{ display:"flex", alignItems:"center", gap:10, minWidth:130 }}>
          <span style={{
            fontFamily:"Playfair Display, serif",
            fontSize:13, fontWeight:700, color:GOLD,
            letterSpacing:"0.14em",
          }}>01</span>
          <div style={{ width:22, height:1, background:`rgba(212,175,55,0.4)` }}/>
          <span style={{
            fontFamily:"Inter, sans-serif",
            fontSize:11, letterSpacing:"0.22em",
            color:"rgba(255,255,255,0.4)", textTransform:"uppercase",
          }}>WELCOME</span>
        </div>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"default" }}>
          <GhaafeediLogo variant="page" />
        </div>

        {/* Right: Sign In (logged-out) OR MemberDropdown (logged-in) */}
        <div className="ob-header-signin" style={{ minWidth:130, display:"flex", justifyContent:"flex-end", alignItems:"center" }}>
          {isLoggedIn && session ? (
            <S1MemberDropdown session={session} setLocation={setLocation} />
          ) : !isLoggedIn && (
            <a href="/signin" style={{
              fontFamily:"Inter, sans-serif", fontSize:13,
              color:"rgba(255,255,255,0.5)", textDecoration:"none",
              letterSpacing:"0.01em", transition:"color 0.2s",
              whiteSpace:"nowrap",
            }}
              onMouseEnter={e=>(e.currentTarget.style.color=WHITE)}
              onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.5)")}
            >
              <span className="ob-signin-label">Already have an account?{" "}</span>
              <span style={{ color:GOLD, fontWeight:600 }}>Sign In</span>
            </a>
          )}
        </div>
      </header>

      {/* ── HERO BODY ── */}
      <div className="ob-hero-body" style={{
        position:"relative", zIndex:5,
        flex:1, display:"flex", alignItems:"stretch",
        width:"100%", maxWidth:1440, margin:"0 auto",
        padding:"0 clamp(20px,4vw,60px)",
      }}>

        {/* ── LEFT CONTENT ── */}
        <motion.div
          initial={{ opacity:0, x:-28 }}
          animate={{ opacity:1, x:0 }}
          transition={{ duration:0.65, ease:"easeOut" }}
          className="ob-left"
          style={{
            flex:"0 0 45%", maxWidth:600,
            display:"flex", flexDirection:"column",
            justifyContent:"center",
            paddingRight:"clamp(20px,2.5vw,40px)",
          }}
        >
          {/* Headline — ALL GOLD per Figma */}
          <motion.h1
            initial={{ opacity:0, y:22 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:0.15, duration:0.65 }}
            style={{
              fontFamily:"Playfair Display, serif",
              fontSize:"clamp(42px, 4.6vw, 74px)",
              fontWeight:800, lineHeight:1.12,
              margin:"0 0 24px",
              letterSpacing:"-0.01em",
              background:`linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 55%, ${GOLD} 100%)`,
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              whiteSpace:"nowrap",
            }}
          >
            Your Story.<br/>
            Your Soundtrack.<br/>
            Your Legacy.
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity:0, y:14 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:0.28, duration:0.6 }}
            style={{
              fontFamily:"Inter, sans-serif",
              fontSize:"clamp(15px,1.15vw,18px)",
              lineHeight:1.7, color:"rgba(255,255,255,0.58)",
              margin:"0 0 32px", maxWidth:480,
            }}
          >
            Transform your memories, emotions, dreams and life experiences into
            cinematic songs and videos.
          </motion.p>

          {/* Trust indicators — vertical stacked, icon + label/sub, per Figma */}
          <motion.div
            initial={{ opacity:0, y:10 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:0.38, duration:0.55 }}
            className="ob-trust-grid"
            style={{
              display:"grid",
              gridTemplateColumns:"1fr 1fr",
              gap:"16px 32px",
              marginBottom:32,
            }}
          >
            {TRUST_ITEMS.map((t, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:38, height:38, borderRadius:10,
                  background:"rgba(212,175,55,0.08)",
                  border:"1px solid rgba(212,175,55,0.2)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0,
                }}>
                  {t.svg}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <span style={{
                    fontFamily:"Inter, sans-serif", fontSize:13,
                    fontWeight:600, color:WHITE, lineHeight:1.2,
                  }}>{t.label}</span>
                  <span style={{
                    fontFamily:"Inter, sans-serif", fontSize:11,
                    color:"rgba(255,255,255,0.38)", lineHeight:1.2,
                  }}>{t.sub}</span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons — full width, stacked vertically per Figma */}
          <motion.div
            initial={{ opacity:0, y:14 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:0.5, duration:0.6 }}
            className="ob-cta-stack"
            style={{ display:"flex", flexDirection:"column", gap:14, maxWidth:400 }}
          >
            {/* Primary */}
            <button
              onClick={sessionLoading ? undefined : onNext}
              onMouseEnter={()=>{ if (!sessionLoading) setHoverStart(true); }}
              onMouseLeave={()=>setHoverStart(false)}
              disabled={sessionLoading}
              style={{
                width:"100%", height:58,
                borderRadius:10, border:"none",
                background:sessionLoading
                  ? "rgba(212,175,55,0.35)"
                  : hoverStart
                    ? `linear-gradient(135deg,${GOLD2} 0%,${GOLD} 100%)`
                    : `linear-gradient(135deg,${GOLD} 0%,#c9a020 100%)`,
                color:BG_DARK, fontSize:16,
                fontFamily:"Inter, sans-serif", fontWeight:700,
                cursor:sessionLoading ? "not-allowed" : "pointer", letterSpacing:"0.04em",
                boxShadow:sessionLoading ? "none" : hoverStart
                  ? `0 0 42px rgba(212,175,55,0.6), 0 6px 24px rgba(0,0,0,0.45)`
                  : `0 0 20px rgba(212,175,55,0.3), 0 4px 16px rgba(0,0,0,0.4)`,
                transform:(!sessionLoading && hoverStart) ? "translateY(-2px)" : "none",
                transition:"all 0.22s ease",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                opacity: sessionLoading ? 0.7 : 1,
              }}
            >
              {sessionLoading ? (
                <>
                  <span style={{
                    display:"inline-block", width:15, height:15,
                    border:"2px solid rgba(10,6,24,0.35)", borderTopColor:"#0a0618",
                    borderRadius:"50%", animation:"obS1spin 0.75s linear infinite",
                  }}/>
                  <style>{`@keyframes obS1spin{to{transform:rotate(360deg)}}`}</style>
                  Verifying…
                </>
              ) : (
                <>
                  Start My Journey
                  <span style={{ fontSize:16, marginLeft:2 }}>→</span>
                </>
              )}
            </button>

            {/* Secondary */}
            <button
              onClick={()=>setLocation("/demo")}
              onMouseEnter={()=>setHoverDemo(true)}
              onMouseLeave={()=>setHoverDemo(false)}
              style={{
                width:"100%", height:58,
                borderRadius:10,
                border:`1.5px solid ${hoverDemo?"rgba(212,175,55,0.55)":"rgba(255,255,255,0.18)"}`,
                background:hoverDemo?"rgba(212,175,55,0.07)":"rgba(255,255,255,0.03)",
                color:WHITE, fontSize:16,
                fontFamily:"Inter, sans-serif", fontWeight:600,
                cursor:"pointer", letterSpacing:"0.03em",
                transform:hoverDemo?"translateY(-2px)":"none",
                transition:"all 0.22s ease",
                backdropFilter:"blur(8px)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:12,
                boxShadow:hoverDemo?"0 0 18px rgba(212,175,55,0.12)":"none",
              }}
            >
              <span style={{
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                width:28, height:28, borderRadius:"50%",
                background:"rgba(255,255,255,0.06)",
                border:`1px solid rgba(255,255,255,0.22)`,
                color:WHITE, fontSize:10, paddingLeft:2,
                flexShrink:0,
              }}>▶</span>
              Watch Demo
            </button>
          </motion.div>

          {/* ── URGENCY TICKER ── */}
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ delay:0.72, duration:0.5 }}
            className="ob1-ticker"
            style={{ marginTop:20, maxWidth:400 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={tickerIdx}
                initial={{ opacity:0, y:6 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-6 }}
                transition={{ duration:0.35 }}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"center",
                  gap:8,
                  padding:"8px 16px",
                  borderRadius:8,
                  background:"rgba(212,175,55,0.07)",
                  border:"1px solid rgba(212,175,55,0.22)",
                  width:"fit-content",
                }}
              >
                <span style={{
                  fontFamily:"Inter, sans-serif",
                  fontSize:"clamp(12px,0.95vw,14px)",
                  color:"rgba(255,255,255,0.78)",
                  letterSpacing:"0.01em",
                }}>{URGENCY_TICKER[tickerIdx]}</span>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* ── RIGHT VISUAL — portal image bleeds edge-to-edge ── */}
        <motion.div
          initial={{ opacity:0, scale:0.97 }}
          animate={{ opacity:1, scale:1 }}
          transition={{ delay:0.1, duration:0.9, ease:"easeOut" }}
          className="ob-right"
          style={{
            flex:"1 1 55%",
            position:"relative",
            overflow:"hidden",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}
        >
          {/* Gold + purple glow behind portal — matches Figma halo */}
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)",
            width:"95%", height:"95%",
            background:`radial-gradient(ellipse 60% 55% at 50% 50%, rgba(212,175,55,0.26) 0%, rgba(160,100,20,0.12) 35%, transparent 65%)`,
            filter:"blur(55px)", borderRadius:"50%",
            pointerEvents:"none", zIndex:1,
          }}/>
          {/* Secondary wider purple halo */}
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)",
            width:"110%", height:"110%",
            background:`radial-gradient(ellipse 70% 65% at 50% 50%, rgba(100,40,180,0.14) 0%, rgba(70,20,140,0.06) 50%, transparent 72%)`,
            filter:"blur(70px)", borderRadius:"50%",
            pointerEvents:"none", zIndex:1,
          }}/>
          <img
            src="/assets/hero-portal.png"
            alt="Ghaafeedi Music Portal"
            className="ob-portal-img"
            style={{
              width:"100%",
              height:"100%",
              objectFit:"cover",
              objectPosition:"center center",
              position:"relative", zIndex:2,
              filter:"drop-shadow(0 0 60px rgba(212,175,55,0.22)) brightness(1.05)",
            }}
          />
        </motion.div>
      </div>

      {/* ── PROGRESS DOTS ── */}
      <div style={{
        position:"relative", zIndex:10,
        width:"100%", display:"flex",
        justifyContent:"center", alignItems:"center",
        gap:8, paddingBottom:24, flexShrink:0,
      }}>
        {STEPS.map((_,i)=>(
          <div key={i} style={{
            width: i===0 ? 28 : 8,
            height:8, borderRadius:4,
            background: i===0 ? GOLD : "rgba(255,255,255,0.15)",
            transition:"all 0.3s",
            boxShadow: i===0 ? `0 0 8px rgba(212,175,55,0.55)` : "none",
          }}/>
        ))}
      </div>

      {/* Watch Demo now routes to /demo page directly */}

      {/* ── RESPONSIVE ── */}
      <style>{`
        /* TABLET 601–1100px: side-by-side, full viewport, content vertically centered */
        @media(min-width:601px) and (max-width:1100px){
          /* Nebula covers full tall portrait tablet */
          .ob-nebula-1{
            background:
              radial-gradient(ellipse 80% 70% at 65% 50%, rgba(72,28,140,0.32) 0%, rgba(50,15,100,0.16) 42%, transparent 70%),
              radial-gradient(ellipse 55% 60% at 80% 30%, rgba(90,30,160,0.20) 0%, transparent 55%),
              radial-gradient(ellipse 65% 75% at 58% 72%, rgba(60,20,120,0.18) 0%, transparent 62%)
              !important;
          }
          .ob-nebula-2{
            background:
              radial-gradient(ellipse 55% 60% at 68% 50%, rgba(212,175,55,0.18) 0%, rgba(180,130,20,0.06) 45%, transparent 70%),
              radial-gradient(ellipse 40% 40% at 62% 78%, rgba(212,175,55,0.12) 0%, transparent 55%)
              !important;
          }
          .ob-nebula-3{
            background:
              radial-gradient(ellipse 35% 45% at 3% 45%, rgba(20,80,120,0.20) 0%, transparent 60%),
              radial-gradient(ellipse 25% 35% at 20% 82%, rgba(15,60,100,0.14) 0%, transparent 55%)
              !important;
          }
          /* ── TABLET: column layout, content top ~48%, portal fills bottom ── */
          .ob-step1-root{
            height:100%!important;
            min-height:100%!important;
            max-height:100%!important;
            overflow:hidden!important;
            display:flex!important;
            flex-direction:column!important;
          }
          .ob-hero-body{
            flex:1!important;
            min-height:0!important;
            display:flex!important;
            flex-direction:column!important;
            align-items:stretch!important;
            padding:16px clamp(24px,5vw,64px) 0!important;
            gap:0!important;
            overflow:hidden!important;
          }
          .ob-left{
            flex:0 0 auto!important;
            max-width:100%!important;
            width:100%!important;
            padding-left:0!important;
            padding-right:0!important;
            justify-content:flex-start!important;
          }
          .ob-left h1{
            font-size:clamp(32px,5vw,52px)!important;
            line-height:1.1!important;
            white-space:normal!important;
          }
          .ob-left p{font-size:15px!important;max-width:100%!important;margin-bottom:14px!important;}
          .ob-trust-grid{gap:8px 16px!important;margin-bottom:14px!important;}
          .ob-cta-stack{max-width:540px!important;}
          .ob-cta-stack button{height:52px!important;font-size:15px!important;}
          /* Portal: flex:1 fills all remaining height below text */
          .ob-right{
            flex:1!important;
            min-height:0!important;
            width:calc(100% + clamp(48px,10vw,128px))!important;
            margin-left:calc(-1 * clamp(24px,5vw,64px))!important;
            margin-right:calc(-1 * clamp(24px,5vw,64px))!important;
            margin-top:16px!important;
            position:relative!important;
            overflow:hidden!important;
            height:auto!important;
          }
          .ob-right > div{position:absolute!important;}
          .ob-portal-img{
            position:absolute!important;
            top:0!important;left:0!important;
            width:100%!important;height:100%!important;
            object-fit:cover!important;
            object-position:center 35%!important;
          }
          .ob-right::after{
            content:''!important;
            position:absolute!important;inset:0!important;
            z-index:3!important;pointer-events:none!important;
            background:linear-gradient(to bottom, rgba(8,6,20,0.4) 0%, transparent 20%, transparent 78%, rgba(8,6,20,0.55) 100%)!important;
          }
        }

        /* GLOBAL reset — scoped to step1 only, does NOT affect other pages */
        .ob-step1-root ~ * { } /* isolate */

        /* MOBILE ≤600px — full-screen locked, text top 46%, portal bottom 54% */
        @media(max-width:600px){
          .ob-step1-root{
            height:100%!important;
            min-height:100%!important;
            max-height:100%!important;
            overflow:hidden!important;
            display:flex!important;
            flex-direction:column!important;
            background:linear-gradient(180deg, #080614 0%, #0c0820 40%, #100b28 70%, #080614 100%)!important;
          }
          /* Nebula layers — full coverage */
          .ob-nebula-1{
            background:
              radial-gradient(ellipse 120% 50% at 50% 30%, rgba(72,28,140,0.38) 0%, rgba(50,15,100,0.20) 45%, transparent 72%),
              radial-gradient(ellipse 100% 40% at 50% 70%, rgba(80,25,150,0.30) 0%, rgba(55,18,110,0.14) 45%, transparent 70%)
              !important;
          }
          .ob-nebula-2{
            background:
              radial-gradient(ellipse 90% 45% at 50% 72%, rgba(212,175,55,0.22) 0%, rgba(180,130,20,0.08) 45%, transparent 70%)
              !important;
          }
          .ob-nebula-3{
            background:
              radial-gradient(ellipse 60% 25% at 10% 20%, rgba(20,100,140,0.22) 0%, transparent 60%),
              radial-gradient(ellipse 50% 20% at 90% 15%, rgba(30,80,120,0.18) 0%, transparent 55%)
              !important;
          }
          .ob-vignette{
            background: radial-gradient(ellipse 50% 30% at 0% 50%, rgba(4,2,12,0.40) 0%, transparent 65%) !important;
          }
          /* Header: compact */
          .ob-header{height:50px!important;padding:0 18px!important;flex-shrink:0!important;}
          .ob-header-step{display:none!important;}
          .ob-signin-label{display:none!important;}
          /* Hero body: flex:1 fills remaining space, stacks column */
          .ob-hero-body{
            display:flex!important;
            flex:1!important;
            flex-direction:column!important;
            align-items:stretch!important;
            padding:0 20px!important;
            gap:0!important;
            overflow:hidden!important;
            min-height:0!important;
            max-width:100%!important;
            margin:0!important;
          }
          /* LEFT — text block: compact, fixed height ~46% of remaining space */
          .ob-left{
            flex:0 0 auto!important;
            max-width:100%!important;
            width:100%!important;
            padding-right:0!important;
            justify-content:flex-start!important;
            padding-top:10px!important;
          }
          .ob-left h1{
            font-size:clamp(28px,9vw,40px)!important;
            margin-bottom:8px!important;
            white-space:normal!important;
            line-height:1.1!important;
          }
          .ob-left p{font-size:13px!important;margin-bottom:10px!important;max-width:100%!important;line-height:1.5!important;}
          .ob-trust-grid{
            grid-template-columns:1fr 1fr!important;
            gap:7px 12px!important;
            margin-bottom:10px!important;
          }
          .ob-trust-grid > div > div:first-child{width:30px!important;height:30px!important;}
          .ob-trust-grid span{font-size:11px!important;}
          .ob-cta-stack{max-width:100%!important;gap:8px!important;}
          .ob-cta-stack button{height:46px!important;font-size:14px!important;}
          /* RIGHT — portal: fills all remaining space */
          .ob-right{
            flex:1!important;
            min-height:0!important;
            width:calc(100% + 40px)!important;
            margin-left:-20px!important;
            margin-right:-20px!important;
            margin-top:12px!important;
            position:relative!important;
            overflow:hidden!important;
            height:auto!important;
            padding-bottom:0!important;
          }
          .ob-right > div{position:absolute!important;}
          .ob-portal-img{
            position:absolute!important;
            top:0!important;left:0!important;
            width:100%!important;height:100%!important;
            object-fit:cover!important;
            object-position:center 40%!important;
            filter:brightness(1.08) drop-shadow(0 0 40px rgba(212,175,55,0.30))!important;
          }
          .ob-right::after{
            content:''!important;
            position:absolute!important;inset:0!important;
            z-index:3!important;pointer-events:none!important;
            background:
              linear-gradient(to bottom, rgba(8,6,20,0.45) 0%, transparent 18%, transparent 80%, rgba(8,6,20,0.65) 100%)
              !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN ONBOARDING SHELL
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2 — WHO IS THIS FOR?
// ─────────────────────────────────────────────────────────────────────────────
const WHO_OPTIONS = [
  { id:"myself",         label:"Myself",         icon:"/assets/icons/icon-myself.png" },
  { id:"relationship",   label:"Relationship",   icon:"/assets/icons/icon-relationship.png" },
  { id:"child",          label:"Child",          icon:"/assets/icons/icon-child.png" },
  { id:"family",         label:"Family",         icon:"/assets/icons/icon-family.png" },
  { id:"achievement",    label:"Achievement",    icon:"/assets/icons/icon-achievement.png" },
  { id:"future-me",      label:"Future Me",      icon:"/assets/icons/icon-future-me.png" },
  { id:"artist-project", label:"Artist Project", icon:"/assets/icons/icon-artist-project.png" },
  { id:"legacy-project", label:"Legacy Project", icon:"/assets/icons/icon-legacy-project.png" },
];

interface Step2Props {
  selected: string | null;
  onSelect: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step2WhoIsThisFor({ selected, onSelect, onNext, onBack }: Step2Props) {
  const [hovered, setHovered] = useState<string|null>(null);
  const [backHover, setBackHover]   = useState(false);
  const [nextHover, setNextHover]   = useState(false);
  const [nextLoading, setNextLoading] = useState(false);

  const handleNext = () => {
    if (!selected) return;
    setNextLoading(true);
    setTimeout(() => { setNextLoading(false); onNext(); }, 400);
  };

  return (
    <div className="ob2-root" style={{
      position:"relative", width:"100%", height:"100%",
      background:"linear-gradient(160deg,#06040f 0%,#0a0618 40%,#0c0820 70%,#06040f 100%)",
      overflow:"hidden", display:"flex", flexDirection:"column",
      fontFamily:"Inter, sans-serif",
    }}>
      {/* ── Background nebula layers ── */}
      <div style={{
        position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
        background:`
          radial-gradient(ellipse 70% 60% at 50% 30%, rgba(72,28,140,0.28) 0%, transparent 65%),
          radial-gradient(ellipse 50% 50% at 80% 70%, rgba(90,30,160,0.14) 0%, transparent 55%),
          radial-gradient(ellipse 40% 40% at 20% 80%, rgba(20,80,120,0.16) 0%, transparent 55%)
        `,
      }}/>
      <Stars/>

      {/* ── Gold top line ── */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:2, zIndex:10,
        background:`linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD2} 50%, ${GOLD} 70%, transparent 100%)`,
        opacity:0.7,
      }}/>

      {/* ── HEADER: step indicators ── */}
      <div className="ob2-header" style={{
        position:"relative", zIndex:10,
        width:"100%", display:"flex", justifyContent:"center",
        paddingTop:36, paddingBottom:0, flexShrink:0,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* Step 01 — completed */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:"50%",
              background:`linear-gradient(135deg,${GOLD},${GOLD2})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 0 12px rgba(212,175,55,0.5)`,
            }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 6.5L5.2 9.5L11 3.5" stroke="#0a0618" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:500, color:`rgba(212,175,55,0.75)` }}>01</span>
          </div>

          {/* Connector */}
          <div style={{ width:48, height:1, background:`linear-gradient(90deg,${GOLD},rgba(212,175,55,0.3))`, opacity:0.6 }}/>

          {/* Step 02 — active */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:"50%",
              border:`2px solid ${GOLD}`,
              background:`rgba(212,175,55,0.12)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 0 18px rgba(212,175,55,0.4)`,
            }}>
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:700, color:GOLD }}>02</span>
            </div>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color:GOLD }}>02</span>
          </div>

          {/* Remaining steps */}
          {[3,4,5,6,7,8,9].map(n => (
            <div key={n} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:24, height:1, background:"rgba(255,255,255,0.1)" }}/>
              <div style={{
                width:22, height:22, borderRadius:"50%",
                border:"1.5px solid rgba(255,255,255,0.15)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <span style={{ fontSize:9, fontWeight:500, color:"rgba(255,255,255,0.3)" }}>{String(n).padStart(2,"0")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="ob2-content" style={{
        position:"relative", zIndex:10, flex:1,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"0 20px", overflowY:"auto",
      }}>
        {/* Title */}
        <motion.div
          initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.6, ease:"easeOut" }}
          style={{ textAlign:"center", marginBottom:40 }}
        >
          {/* Step label */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"5px 14px", borderRadius:20,
            background:"rgba(212,175,55,0.08)",
            border:"1px solid rgba(212,175,55,0.22)",
            marginBottom:18,
          }}>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:GOLD, letterSpacing:"0.1em", textTransform:"uppercase" }}>Step 2 of 9</span>
            <span style={{ width:1, height:12, background:"rgba(212,175,55,0.3)" }}/>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.42)", letterSpacing:"0.04em" }}>~3 min to complete</span>
          </div>
          <h2 className="ob2-title" style={{
            fontFamily:"Playfair Display, serif",
            fontWeight:700, lineHeight:1.15,
            color:WHITE, margin:0,
            fontSize:"clamp(34px,3.5vw,54px)",
          }}>
            Who are we creating for today?
          </h2>
          <p style={{
            fontFamily:"Inter,sans-serif", marginTop:14,
            color:"rgba(255,255,255,0.45)", fontSize:"clamp(13px,1.1vw,16px)",
            letterSpacing:"0.02em",
          }}>
            Select one to personalise your experience
          </p>
        </motion.div>

        {/* Option Grid */}
        <motion.div
          className="ob2-grid"
          initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.65, delay:0.1, ease:"easeOut" }}
          style={{
            display:"grid",
            gridTemplateColumns:"repeat(2,1fr)",
            gap:"clamp(12px,1.2vw,20px)",
            width:"100%",
            maxWidth:620,
          }}
        >
          {WHO_OPTIONS.map((opt, i) => {
            const isSelected = selected === opt.id;
            const isHovered  = hovered === opt.id;
            return (
              <motion.button
                key={opt.id}
                initial={{ opacity:0, y:20 }}
                animate={{ opacity:1, y:0 }}
                transition={{ duration:0.4, delay:0.15 + i*0.05, ease:"easeOut" }}
                onClick={() => onSelect(opt.id)}
                onMouseEnter={() => setHovered(opt.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(opt.id)}
                onBlur={() => setHovered(null)}
                onKeyDown={(e) => { if(e.key==="Enter"||e.key===" ") { e.preventDefault(); onSelect(opt.id); }}}
                aria-pressed={isSelected}
                aria-label={opt.label}
                role="radio"
                aria-checked={isSelected}
                className="ob2-card"
                style={{
                  position:"relative",
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center",
                  gap:10,
                  padding:"18px 12px",
                  borderRadius:18,
                  border:`1.5px solid ${isSelected ? GOLD : isHovered ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.22)"}`,
                  background: isSelected
                    ? `linear-gradient(135deg,rgba(212,175,55,0.18) 0%,rgba(212,175,55,0.08) 100%)`
                    : isHovered
                    ? `rgba(212,175,55,0.07)`
                    : `rgba(12,8,28,0.72)`,
                  backdropFilter:"blur(12px)",
                  boxShadow: isSelected
                    ? `0 0 28px rgba(212,175,55,0.38), inset 0 0 20px rgba(212,175,55,0.08)`
                    : isHovered
                    ? `0 0 16px rgba(212,175,55,0.22)`
                    : `0 2px 12px rgba(0,0,0,0.35)`,
                  transform: isSelected ? "scale(1.03)" : isHovered ? "scale(1.015)" : "scale(1)",
                  transition:"all 220ms ease",
                  cursor:"pointer",
                  outline:"none",
                  minHeight:"clamp(90px,9vw,120px)",
                  WebkitTapHighlightColor:"transparent",
                }}
              >
                {/* Checkmark badge */}
                {isSelected && (
                  <div style={{
                    position:"absolute", top:10, right:10,
                    width:20, height:20, borderRadius:"50%",
                    background:`linear-gradient(135deg,${GOLD},${GOLD2})`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:`0 0 8px rgba(212,175,55,0.6)`,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="#0a0618" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <div className="ob2-icon-wrap" style={{
                  width:"clamp(44px,4.5vw,64px)",
                  height:"clamp(44px,4.5vw,64px)",
                  borderRadius:12,
                  overflow:"hidden",
                  background:"rgba(0,0,0,0.3)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0,
                  boxShadow: isSelected ? `0 0 16px rgba(212,175,55,0.4)` : "none",
                  transition:"box-shadow 220ms ease",
                }}>
                  <img
                    src={opt.icon}
                    alt={opt.label}
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                  />
                </div>

                {/* Label */}
                <span style={{
                  fontFamily:"Inter,sans-serif",
                  fontSize:"clamp(11px,1vw,14px)",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? GOLD : isHovered ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.72)",
                  letterSpacing:"0.03em",
                  textAlign:"center",
                  transition:"color 220ms ease",
                  lineHeight:1.2,
                }}>
                  {opt.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── SELECTION NUDGE ── */}
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="nudge-pick"
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
              transition={{ duration:0.3 }}
              style={{ marginTop:20, textAlign:"center" }}
            >
              <span style={{
                fontFamily:"Inter,sans-serif", fontSize:13,
                color:"rgba(255,255,255,0.45)",
                animation:"ob2nudgePulse 2s ease-in-out infinite",
                display:"inline-block",
              }}>← Select one to continue</span>
            </motion.div>
          ) : (
            <motion.div
              key="nudge-ready"
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
              transition={{ duration:0.3 }}
              style={{ marginTop:20, textAlign:"center" }}
            >
              <span style={{
                fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600,
                color:GOLD,
              }}>Great choice! Continue when ready →</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── NAVIGATION ── */}
      <div className="ob2-nav" style={{
        position:"relative", zIndex:10,
        width:"100%", flexShrink:0,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"clamp(16px,2.5vh,32px) clamp(20px,4vw,80px)",
        paddingBottom:"clamp(24px,4vh,48px)",
        maxWidth:1400, margin:"0 auto", boxSizing:"border-box",
        alignSelf:"stretch",
      }}>
        {/* Back */}
        <button
          onClick={onBack}
          onMouseEnter={() => setBackHover(true)}
          onMouseLeave={() => setBackHover(false)}
          aria-label="Go back"
          style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"0 32px", height:52,
            borderRadius:10,
            border:`1.5px solid ${backHover ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.28)"}`,
            background: backHover ? "rgba(212,175,55,0.08)" : "transparent",
            color: backHover ? GOLD : "rgba(255,255,255,0.6)",
            fontSize:14, fontWeight:500, fontFamily:"Inter,sans-serif",
            cursor:"pointer", transition:"all 200ms ease",
            letterSpacing:"0.04em",
            minWidth:120,
          }}
        >
          ← Back
        </button>

        {/* Next */}
        <button
          onClick={handleNext}
          onMouseEnter={() => setNextHover(true)}
          onMouseLeave={() => setNextHover(false)}
          disabled={!selected || nextLoading}
          aria-label="Continue to next step"
          style={{
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            padding:"0 36px", height:52,
            borderRadius:10,
            border:"none",
            background: selected
              ? nextHover
                ? `linear-gradient(135deg,${GOLD2} 0%,${GOLD} 100%)`
                : `linear-gradient(135deg,${GOLD} 0%,${GOLD2} 100%)`
              : "rgba(255,255,255,0.08)",
            color: selected ? "#0a0618" : "rgba(255,255,255,0.3)",
            fontSize:14, fontWeight:700, fontFamily:"Inter,sans-serif",
            cursor: selected ? "pointer" : "not-allowed",
            transition:"all 200ms ease",
            letterSpacing:"0.06em",
            minWidth:140,
            boxShadow: selected
              ? nextHover
                ? `0 0 28px rgba(212,175,55,0.55), 0 4px 20px rgba(212,175,55,0.3)`
                : `0 0 18px rgba(212,175,55,0.35)`
              : "none",
            opacity: nextLoading ? 0.7 : 1,
          }}
        >
          {nextLoading ? (
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation:"ob2spin 0.8s linear infinite" }}>
                <circle cx="8" cy="8" r="6" stroke="rgba(10,6,24,0.4)" strokeWidth="2" fill="none"/>
                <path d="M8 2 A6 6 0 0 1 14 8" stroke="#0a0618" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
              Loading…
            </span>
          ) : (
            <>Continue →</>
          )}
        </button>
      </div>

      <style>{`
        .ob2-root * { box-sizing:border-box; }
        @keyframes ob2spin { to { transform:rotate(360deg); } }
        @keyframes ob2nudgePulse { 0%,100%{opacity:0.45} 50%{opacity:0.85} }

        /* TABLET 601–1100px */
        @media(min-width:601px) and (max-width:1100px){
          .ob2-grid{
            max-width:540px!important;
          }
          .ob2-header{
            padding-top:28px!important;
          }
        }

        /* MOBILE ≤600px */
        @media(max-width:600px){
          .ob2-root{
            height:auto!important;
            min-height:100%!important;
            overflow-y:auto!important;
          }
          .ob2-content{
            justify-content:flex-start!important;
            padding-top:24px!important;
            padding-bottom:12px!important;
          }
          .ob2-title{
            font-size:clamp(28px,8vw,38px)!important;
          }
          .ob2-grid{
            max-width:100%!important;
            gap:12px!important;
          }
          .ob2-card{
            min-height:90px!important;
            padding:14px 8px!important;
          }
          .ob2-icon-wrap{
            width:40px!important;
            height:40px!important;
          }
          .ob2-nav{
            padding:16px 20px 32px 20px!important;
          }
          .ob2-header{
            padding-top:20px!important;
            overflow-x:auto!important;
          }
          /* Hide steps 3-9 on very small screens */
          @media(max-width:390px){
            .ob2-header > div > div:nth-child(n+4){
              display:none!important;
            }
          }
        }
      `}</style>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
//  STEP 3 — CHOOSE EXPERIENCE
// ─────────────────────────────────────────────────────────────────────────────
const EXPERIENCE_OPTIONS = [
  { id:"cinematic_song",       label:"Cinematic Song",           icon:"/assets/icons/icon-cinematic-song.png" },
  { id:"story_video",          label:"Cinematic Story Video",    icon:"/assets/icons/icon-story-video.png" },
  { id:"future_you",           label:"Future You Experience",    icon:"/assets/icons/icon-future-you.png" },
  { id:"emotional_companion",  label:"Emotional Companion",      icon:"/assets/icons/icon-emotional-companion.png" },
  { id:"legacy_documentary",   label:"Legacy Documentary",       icon:"/assets/icons/icon-legacy-documentary.png" },
  { id:"family_legacy",        label:"Family Legacy Experience", icon:"/assets/icons/icon-family-legacy.png" },
];

interface Step3Props {
  selected: string | null;
  onSelect: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step3ChooseExperience({ selected, onSelect, onNext, onBack }: Step3Props) {
  const [hovered, setHovered]       = useState<string|null>(null);
  const [backHover, setBackHover]   = useState(false);
  const [nextHover, setNextHover]   = useState(false);
  const [nextLoading, setNextLoading] = useState(false);

  const handleNext = () => {
    if (!selected) return;
    setNextLoading(true);
    setTimeout(() => { setNextLoading(false); onNext(); }, 400);
  };

  return (
    <div className="ob3-root" style={{
      position:"relative", width:"100%", height:"100%",
      background:"linear-gradient(160deg,#06040f 0%,#090518 40%,#0d0920 70%,#06040f 100%)",
      overflow:"hidden", display:"flex", flexDirection:"column",
      fontFamily:"Inter, sans-serif",
    }}>
      {/* ── Background nebula ── */}
      <div style={{
        position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
        background:`
          radial-gradient(ellipse 65% 55% at 50% 28%, rgba(72,28,140,0.30) 0%, transparent 65%),
          radial-gradient(ellipse 45% 45% at 15% 65%, rgba(20,80,120,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 50% 50% at 85% 72%, rgba(90,30,160,0.15) 0%, transparent 55%)
        `,
      }}/>
      <Stars/>

      {/* ── Gold top line ── */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:2, zIndex:10,
        background:`linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD2} 50%, ${GOLD} 70%, transparent 100%)`,
        opacity:0.7,
      }}/>

      {/* ── STEP INDICATOR ── */}
      <div className="ob3-header" style={{
        position:"relative", zIndex:10,
        width:"100%", display:"flex", justifyContent:"center",
        paddingTop:36, flexShrink:0,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* Steps 01, 02 — completed */}
          {[1,2].map(n => (
            <div key={n} style={{ display:"flex", alignItems:"center", gap:8 }}>
              {n > 1 && <div style={{ width:36, height:1, background:`linear-gradient(90deg,${GOLD},rgba(212,175,55,0.3))`, opacity:0.5 }}/>}
              <div style={{
                width:28, height:28, borderRadius:"50%",
                background:`linear-gradient(135deg,${GOLD},${GOLD2})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:`0 0 12px rgba(212,175,55,0.45)`,
              }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 6.5L5.2 9.5L11 3.5" stroke="#0a0618" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, fontWeight:500, color:`rgba(212,175,55,0.7)` }}>0{n}</span>
            </div>
          ))}

          {/* Connector */}
          <div style={{ width:36, height:1, background:`linear-gradient(90deg,${GOLD},rgba(212,175,55,0.3))`, opacity:0.5 }}/>

          {/* Step 03 — active */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:"50%",
              border:`2px solid ${GOLD}`,
              background:`rgba(212,175,55,0.12)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 0 18px rgba(212,175,55,0.4)`,
            }}>
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:700, color:GOLD }}>03</span>
            </div>
          </div>

          {/* Steps 04–09 dim */}
          {[4,5,6,7,8,9].map(n => (
            <div key={n} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:22, height:1, background:"rgba(255,255,255,0.1)" }}/>
              <div style={{
                width:22, height:22, borderRadius:"50%",
                border:"1.5px solid rgba(255,255,255,0.15)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <span style={{ fontSize:9, fontWeight:500, color:"rgba(255,255,255,0.28)" }}>{String(n).padStart(2,"0")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="ob3-content" style={{
        position:"relative", zIndex:10, flex:1,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"0 20px", overflowY:"auto",
      }}>
        {/* Title */}
        <motion.div
          initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.6, ease:"easeOut" }}
          style={{ textAlign:"center", marginBottom:40 }}
        >
          {/* Step label */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"5px 14px", borderRadius:20,
            background:"rgba(212,175,55,0.08)",
            border:"1px solid rgba(212,175,55,0.22)",
            marginBottom:18,
          }}>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:GOLD, letterSpacing:"0.1em", textTransform:"uppercase" }}>Step 3 of 9</span>
            <span style={{ width:1, height:12, background:"rgba(212,175,55,0.3)" }}/>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.42)", letterSpacing:"0.04em" }}>~2 min to complete</span>
          </div>
          <h2 className="ob3-title" style={{
            fontFamily:"Playfair Display, serif",
            fontWeight:700, lineHeight:1.15,
            color:WHITE, margin:0,
            fontSize:"clamp(36px,3.8vw,56px)",
          }}>
            Choose your experience
          </h2>
          <p style={{
            fontFamily:"Inter,sans-serif", marginTop:14,
            color:"rgba(255,255,255,0.45)", fontSize:"clamp(13px,1.1vw,16px)",
            letterSpacing:"0.02em",
          }}>
            Select the type of creation you want brought to life
          </p>
        </motion.div>

        {/* Experience Grid */}
        <motion.div
          className="ob3-grid"
          initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.65, delay:0.1, ease:"easeOut" }}
          style={{
            display:"grid",
            gridTemplateColumns:"repeat(2,1fr)",
            gap:"clamp(12px,1.2vw,20px)",
            width:"100%",
            maxWidth:660,
          }}
        >
          {EXPERIENCE_OPTIONS.map((opt, i) => {
            const isSel = selected === opt.id;
            const isHov = hovered === opt.id;
            return (
              <motion.button
                key={opt.id}
                initial={{ opacity:0, y:20 }}
                animate={{ opacity:1, y:0 }}
                transition={{ duration:0.4, delay:0.1 + i*0.04, ease:"easeOut" }}
                onClick={() => onSelect(opt.id)}
                onMouseEnter={() => setHovered(opt.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(opt.id)}
                onBlur={() => setHovered(null)}
                onKeyDown={(e) => { if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(opt.id);}}}
                aria-pressed={isSel}
                aria-label={opt.label}
                role="radio"
                aria-checked={isSel}
                className="ob3-card"
                style={{
                  position:"relative",
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center",
                  gap:10,
                  padding:"20px 14px",
                  borderRadius:20,
                  border:`1.5px solid ${isSel ? GOLD : isHov ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.2)"}`,
                  background: isSel
                    ? `linear-gradient(135deg,rgba(212,175,55,0.18) 0%,rgba(212,175,55,0.07) 100%)`
                    : isHov
                    ? `rgba(212,175,55,0.07)`
                    : `rgba(10,6,28,0.75)`,
                  backdropFilter:"blur(14px)",
                  boxShadow: isSel
                    ? `0 0 32px rgba(212,175,55,0.38), inset 0 0 24px rgba(212,175,55,0.07)`
                    : isHov
                    ? `0 0 18px rgba(212,175,55,0.2)`
                    : `0 2px 14px rgba(0,0,0,0.38)`,
                  transform: isSel ? "scale(1.03)" : isHov ? "scale(1.015)" : "scale(1)",
                  transition:"all 220ms ease",
                  cursor:"pointer",
                  outline:"none",
                  minHeight:"clamp(105px,11vw,150px)",
                  WebkitTapHighlightColor:"transparent",
                }}
              >
                {/* Checkmark */}
                {isSel && (
                  <div style={{
                    position:"absolute", top:10, right:10,
                    width:20, height:20, borderRadius:"50%",
                    background:`linear-gradient(135deg,${GOLD},${GOLD2})`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:`0 0 8px rgba(212,175,55,0.6)`,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="#0a0618" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <div className="ob3-icon-wrap" style={{
                  width:"clamp(52px,5vw,72px)",
                  height:"clamp(52px,5vw,72px)",
                  borderRadius:14,
                  overflow:"hidden",
                  background:"rgba(0,0,0,0.28)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0,
                  boxShadow: isSel ? `0 0 18px rgba(212,175,55,0.38)` : "none",
                  transition:"box-shadow 220ms ease",
                }}>
                  <img
                    src={opt.icon}
                    alt={opt.label}
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                  />
                </div>

                {/* Label */}
                <span style={{
                  fontFamily:"Inter,sans-serif",
                  fontSize:"clamp(11px,1vw,14px)",
                  fontWeight: isSel ? 700 : 500,
                  color: isSel ? GOLD : isHov ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.7)",
                  letterSpacing:"0.03em",
                  textAlign:"center",
                  transition:"color 220ms ease",
                  lineHeight:1.25,
                  maxWidth:"90%",
                }}>
                  {opt.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── SELECTION NUDGE ── */}
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="s3-nudge-pick"
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
              transition={{ duration:0.3 }}
              style={{ marginTop:20, textAlign:"center" }}
            >
              <span style={{
                fontFamily:"Inter,sans-serif", fontSize:13,
                color:"rgba(255,255,255,0.45)",
                animation:"ob2nudgePulse 2s ease-in-out infinite",
                display:"inline-block",
              }}>← Select one to continue</span>
            </motion.div>
          ) : (
            <motion.div
              key="s3-nudge-ready"
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
              transition={{ duration:0.3 }}
              style={{ marginTop:20, textAlign:"center" }}
            >
              <span style={{
                fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600,
                color:GOLD,
              }}>Great choice! Continue when ready →</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── NAVIGATION ── */}
      <div className="ob3-nav" style={{
        position:"relative", zIndex:10,
        width:"100%", flexShrink:0,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"clamp(16px,2.5vh,32px) clamp(20px,4vw,80px)",
        paddingBottom:"clamp(24px,4vh,48px)",
        maxWidth:1400, margin:"0 auto", boxSizing:"border-box",
        alignSelf:"stretch",
      }}>
        <button
          onClick={onBack}
          onMouseEnter={() => setBackHover(true)}
          onMouseLeave={() => setBackHover(false)}
          aria-label="Go back"
          style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"0 32px", height:52,
            borderRadius:10,
            border:`1.5px solid ${backHover ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.28)"}`,
            background: backHover ? "rgba(212,175,55,0.08)" : "transparent",
            color: backHover ? GOLD : "rgba(255,255,255,0.6)",
            fontSize:14, fontWeight:500, fontFamily:"Inter,sans-serif",
            cursor:"pointer", transition:"all 200ms ease",
            letterSpacing:"0.04em", minWidth:120,
          }}
        >← Back</button>

        <button
          onClick={handleNext}
          onMouseEnter={() => setNextHover(true)}
          onMouseLeave={() => setNextHover(false)}
          disabled={!selected || nextLoading}
          aria-label="Continue to next step"
          style={{
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            padding:"0 36px", height:52,
            borderRadius:10, border:"none",
            background: selected
              ? nextHover
                ? `linear-gradient(135deg,${GOLD2} 0%,${GOLD} 100%)`
                : `linear-gradient(135deg,${GOLD} 0%,${GOLD2} 100%)`
              : "rgba(255,255,255,0.08)",
            color: selected ? "#0a0618" : "rgba(255,255,255,0.3)",
            fontSize:14, fontWeight:700, fontFamily:"Inter,sans-serif",
            cursor: selected ? "pointer" : "not-allowed",
            transition:"all 200ms ease",
            letterSpacing:"0.06em", minWidth:140,
            boxShadow: selected
              ? nextHover
                ? `0 0 28px rgba(212,175,55,0.55), 0 4px 20px rgba(212,175,55,0.3)`
                : `0 0 18px rgba(212,175,55,0.35)`
              : "none",
            opacity: nextLoading ? 0.7 : 1,
          }}
        >
          {nextLoading ? (
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation:"ob3spin 0.8s linear infinite" }}>
                <circle cx="8" cy="8" r="6" stroke="rgba(10,6,24,0.4)" strokeWidth="2" fill="none"/>
                <path d="M8 2 A6 6 0 0 1 14 8" stroke="#0a0618" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
              Loading…
            </span>
          ) : <>Continue →</>}
        </button>
      </div>

      <style>{`
        .ob3-root * { box-sizing:border-box; }
        @keyframes ob3spin { to { transform:rotate(360deg); } }

        @media(min-width:601px) and (max-width:1100px){
          .ob3-root{
            height:100%!important;
            min-height:unset!important;
            overflow-y:hidden!important;
            display:flex!important;
            flex-direction:column!important;
            justify-content:flex-start!important;
          }
          .ob3-header{
            display:flex!important;
            justify-content:center!important;
            padding-top:40px!important;
            padding-bottom:0!important;
            flex-shrink:0!important;
          }
          .ob3-content{
            display:flex!important;
            flex-direction:column!important;
            align-items:center!important;
            padding:36px 20px 0!important;
            flex:1!important;
            justify-content:flex-start!important;
          }
          .ob3-grid{
            max-width:600px!important;
            gap:14px!important;
            width:100%!important;
            flex:1!important;
            grid-template-rows:repeat(3,1fr)!important;
          }
          .ob3-card{ min-height:unset!important; height:100%!important; }
          .ob3-icon-wrap{ height:64px!important; width:64px!important; }
          .ob3-nav{
            display:flex!important;
            justify-content:space-between!important;
            padding:24px 48px 60px!important;
            max-width:100%!important;
            flex-shrink:0!important;
          }
        }

        @media(max-width:600px){
          .ob3-root{ height:100%!important; min-height:unset!important; overflow-y:auto!important; }
          .ob3-content{ justify-content:flex-start!important; padding-top:20px!important; padding-bottom:8px!important; }
          .ob3-title{ font-size:clamp(26px,7.5vw,34px)!important; }
          .ob3-grid{ max-width:100%!important; gap:10px!important; }
          .ob3-card{ min-height:100px!important; padding:12px 8px!important; }
          .ob3-icon-wrap{ width:40px!important; height:40px!important; }
          .ob3-nav{ padding:12px 20px 32px 20px!important; }
          .ob3-header{ padding-top:16px!important; overflow-x:auto!important; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 4 — TELL YOUR STORY
// ─────────────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  progress: number; // 0-100
  status: "uploading" | "done" | "error";
}

interface RecordingState {
  status: "idle" | "recording" | "paused" | "completed";
  seconds: number;
  audioUrl: string | null;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
}

interface Step4Props {
  storyText: string;
  onStoryTextChange: (v: string) => void;
  recordedAudio: string | null;
  onRecordedAudio: (url: string | null) => void;
  uploadedPhotos: UploadedFile[];
  onPhotos: (f: UploadedFile[]) => void;
  uploadedVideos: UploadedFile[];
  onVideos: (f: UploadedFile[]) => void;
  uploadedVoiceNotes: UploadedFile[];
  onVoiceNotes: (f: UploadedFile[]) => void;
  uploadedDocuments: UploadedFile[];
  onDocuments: (f: UploadedFile[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const MAX_CHARS = 2000;
const UPLOAD_LIMITS = { photos: 20, videos: 10, voiceNotes: 10, documents: 20 };

// Generate stable fake upload progress for demo files
function simulateUpload(
  file: File,
  category: "photos" | "videos" | "voiceNotes" | "documents",
  existing: UploadedFile[],
  setter: (f: UploadedFile[]) => void
) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const url = URL.createObjectURL(file);
  const newFile: UploadedFile = {
    id, name: file.name, size: file.size,
    type: file.type, url, progress: 0, status: "uploading",
  };
  const updated = [...existing, newFile];
  let current = updated;
  setter(current);
  // Simulate progress
  let prog = 0;
  const interval = setInterval(() => {
    prog = Math.min(prog + Math.random() * 35 + 15, 100);
    current = current.map(f =>
      f.id === id
        ? { ...f, progress: Math.round(prog), status: (prog >= 100 ? "done" : "uploading") as UploadedFile["status"] }
        : f
    );
    setter(current);
    if (prog >= 100) clearInterval(interval);
  }, 180);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function Step4TellYourStory({
  storyText, onStoryTextChange,
  recordedAudio, onRecordedAudio,
  uploadedPhotos, onPhotos,
  uploadedVideos, onVideos,
  uploadedVoiceNotes, onVoiceNotes,
  uploadedDocuments, onDocuments,
  onNext, onBack,
}: Step4Props) {
  const [backHover, setBackHover]   = useState(false);
  const [nextHover, setNextHover]   = useState(false);
  const [nextLoading, setNextLoading] = useState(false);

  // Recording state
  const [rec, setRec] = useState<RecordingState>({
    status: "idle", seconds: 0, audioUrl: null, mediaRecorder: null, chunks: [],
  });
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Upload drag states
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Text area focus
  const [textFocus, setTextFocus] = useState(false);

  // Has content check — text requires ≥25 words strictly enforced
  const storyWordCount = storyText.trim().split(/\s+/).filter(w => w.length > 0).length;
  const storyTextValid = storyText.trim().length > 0 && storyWordCount >= 25;
  const hasContent =
    storyTextValid ||
    recordedAudio !== null ||
    uploadedPhotos.length > 0 ||
    uploadedVideos.length > 0 ||
    uploadedVoiceNotes.length > 0 ||
    uploadedDocuments.length > 0;

  // ── Recording handlers ────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        onRecordedAudio(url);
        setRec(r => ({ ...r, status: "completed", audioUrl: url, mediaRecorder: null, chunks: [] }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRec({ status: "recording", seconds: 0, audioUrl: null, mediaRecorder: mr, chunks });
      timerRef.current = setInterval(() => {
        setRec(r => ({ ...r, seconds: r.seconds + 1 }));
      }, 1000);
    } catch {
      // mic denied — show graceful state
      setRec(r => ({ ...r, status: "idle" }));
    }
  };

  const pauseRecording = () => {
    if (rec.mediaRecorder && rec.mediaRecorder.state === "recording") {
      rec.mediaRecorder.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setRec(r => ({ ...r, status: "paused" }));
    }
  };

  const resumeRecording = () => {
    if (rec.mediaRecorder && rec.mediaRecorder.state === "paused") {
      rec.mediaRecorder.resume();
      timerRef.current = setInterval(() => {
        setRec(r => ({ ...r, seconds: r.seconds + 1 }));
      }, 1000);
      setRec(r => ({ ...r, status: "recording" }));
    }
  };

  const stopRecording = () => {
    if (rec.mediaRecorder) {
      rec.mediaRecorder.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const discardRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rec.mediaRecorder && rec.mediaRecorder.state !== "inactive") {
      rec.mediaRecorder.stop();
    }
    onRecordedAudio(null);
    setRec({ status: "idle", seconds: 0, audioUrl: null, mediaRecorder: null, chunks: [] });
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Upload handlers ───────────────────────────────────────────────────────
  const handleFiles = (
    files: FileList | null,
    category: "photos" | "videos" | "voiceNotes" | "documents",
    existing: UploadedFile[],
    setter: (f: UploadedFile[]) => void,
    limit: number,
    accept: string[]
  ) => {
    if (!files) return;
    const remaining = limit - existing.length;
    Array.from(files)
      .filter(f => accept.some(a => {
        if (a.startsWith(".")) return f.name.toLowerCase().endsWith(a);
        return f.type.match(a.replace("*", ".*"));
      }))
      .slice(0, remaining)
      .forEach(f => simulateUpload(f, category, existing, setter));
  };

  const removeFile = (
    id: string,
    existing: UploadedFile[],
    setter: (f: UploadedFile[]) => void
  ) => setter(existing.filter(f => f.id !== id));

  const handleNext = () => {
    if (!hasContent) return;
    setNextLoading(true);
    setTimeout(() => { setNextLoading(false); onNext(); }, 420);
  };

  // ── Upload Category Card ─────────────────────────────────────────────────
  const UploadCard = ({
    id, label, icon, accept, files, setter, limit,
    acceptTypes,
  }: {
    id: string; label: string; icon: React.ReactNode;
    accept: string; files: UploadedFile[]; setter: (f: UploadedFile[]) => void;
    limit: number; acceptTypes: string[];
  }) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isDrag = dragOver === id;
    const hasFiles = files.length > 0;

    return (
      <div
        className="ob4-upload-card"
        onDragOver={e => { e.preventDefault(); setDragOver(id); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(null);
          handleFiles(e.dataTransfer.files, id as any, files, setter, limit, acceptTypes);
        }}
        style={{
          borderRadius: 16,
          border: `1.5px solid ${isDrag ? GOLD : hasFiles ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.22)"}`,
          background: isDrag
            ? "rgba(212,175,55,0.10)"
            : hasFiles
            ? "rgba(212,175,55,0.07)"
            : "rgba(10,6,28,0.70)",
          backdropFilter: "blur(12px)",
          boxShadow: isDrag
            ? `0 0 24px rgba(212,175,55,0.38)`
            : hasFiles
            ? `0 0 14px rgba(212,175,55,0.18)`
            : `0 2px 12px rgba(0,0,0,0.32)`,
          cursor: "pointer",
          transition: "all 200ms ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "16px 10px",
          position: "relative",
          overflow: "hidden",
          minHeight: 0,
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); }}}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          style={{ display: "none" }}
          onChange={e => handleFiles(e.target.files, id as any, files, setter, limit, acceptTypes)}
          aria-label={`Select ${label} files`}
        />

        {/* Icon */}
        <div style={{
          width: 36, height: 36,
          borderRadius: 10,
          background: hasFiles ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${hasFiles ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.10)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 200ms",
          flexShrink: 0,
        }}>
          {icon}
        </div>

        {/* Label */}
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "clamp(10px, 0.9vw, 13px)",
          fontWeight: hasFiles ? 600 : 500,
          color: hasFiles ? GOLD : "rgba(255,255,255,0.65)",
          textAlign: "center",
          lineHeight: 1.2,
          transition: "color 200ms",
        }}>{label}</span>

        {/* Count badge */}
        {hasFiles && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            minWidth: 20, height: 20, borderRadius: 10,
            background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 5px",
          }}>
            <span style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 10, fontWeight: 700,
              color: "#0a0618",
            }}>{files.length}</span>
          </div>
        )}

        {/* Limit hint */}
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 10,
          color: "rgba(255,255,255,0.25)",
          lineHeight: 1,
        }}>Max {limit}</span>
      </div>
    );
  };

  // ── File list item ────────────────────────────────────────────────────────
  const FileItem = ({
    file, onRemove
  }: { file: UploadedFile; onRemove: () => void }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 10px",
      borderRadius: 8,
      background: file.status === "error" ? "rgba(220,50,50,0.08)" : "rgba(212,175,55,0.06)",
      border: `1px solid ${file.status === "error" ? "rgba(220,50,50,0.25)" : "rgba(212,175,55,0.18)"}`,
      fontSize: 12, fontFamily: "Inter, sans-serif",
      minWidth: 0,
    }}>
      {/* Progress ring / done / error */}
      <div style={{ width: 24, height: 24, flexShrink: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {file.status === "uploading" ? (
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
            <circle cx="12" cy="12" r="9" fill="none" stroke={GOLD} strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 9 * file.progress / 100} ${2 * Math.PI * 9}`}
              strokeLinecap="round"/>
          </svg>
        ) : file.status === "done" ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke={GOLD} strokeWidth="1.5"/>
            <path d="M4.5 8L7 10.5L11.5 5.5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="#dc3232" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      {/* Name */}
      <span style={{
        flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        color: file.status === "error" ? "#dc6060" : "rgba(255,255,255,0.72)",
        fontSize: 11,
      }}>{file.name}</span>
      {/* Size */}
      <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, flexShrink: 0 }}>
        {formatFileSize(file.size)}
      </span>
      {/* Remove */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        aria-label={`Remove ${file.name}`}
        style={{
          width: 20, height: 20, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.45)", fontSize: 11,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 180ms",
          lineHeight: 1, padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#dc3232"; e.currentTarget.style.color = "#dc6060"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
      >×</button>
    </div>
  );

  const allFiles = [
    ...uploadedPhotos, ...uploadedVideos, ...uploadedVoiceNotes, ...uploadedDocuments,
  ];

  return (
    <div className="ob4-root" style={{
      position: "relative", width: "100%", height: "100%",
      background: "linear-gradient(160deg,#06040f 0%,#090518 40%,#0d0920 70%,#06040f 100%)",
      overflow: "hidden", display: "flex", flexDirection: "column",
      fontFamily: "Inter, sans-serif",
    }}>
      {/* ── Background nebula ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 65% 55% at 50% 28%, rgba(72,28,140,0.30) 0%, transparent 65%),
          radial-gradient(ellipse 45% 45% at 15% 65%, rgba(20,80,120,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 50% 50% at 85% 72%, rgba(90,30,160,0.15) 0%, transparent 55%)
        `,
      }}/>
      <Stars/>

      {/* ── Gold top line ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2, zIndex: 10,
        background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD2} 50%, ${GOLD} 70%, transparent 100%)`,
        opacity: 0.7,
      }}/>

      {/* ── STEP INDICATOR ── */}
      <div className="ob4-header" style={{
        position: "relative", zIndex: 10,
        width: "100%", display: "flex", justifyContent: "center",
        paddingTop: 32, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Steps 01, 02, 03 — completed */}
          {[1, 2, 3].map(n => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {n > 1 && <div style={{ width: 30, height: 1, background: `linear-gradient(90deg,${GOLD},rgba(212,175,55,0.3))`, opacity: 0.5 }}/>}
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 10px rgba(212,175,55,0.40)`,
              }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5L4.4 8L9 3" stroke="#0a0618" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ))}

          {/* Connector to 04 */}
          <div style={{ width: 30, height: 1, background: `linear-gradient(90deg,${GOLD},rgba(212,175,55,0.3))`, opacity: 0.5 }}/>

          {/* Step 04 — active */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `2px solid ${GOLD}`,
              background: "rgba(212,175,55,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 18px rgba(212,175,55,0.45)`,
            }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 700, color: GOLD }}>04</span>
            </div>
          </div>

          {/* Steps 05–09 dim */}
          {[5, 6, 7, 8, 9].map(n => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.1)" }}/>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.28)" }}>
                  {String(n).padStart(2, "0")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE MAIN CONTENT ── */}
      <div className="ob4-scroll" style={{
        position: "relative", zIndex: 10, flex: 1,
        overflowY: "auto", overflowX: "hidden",
        display: "flex", flexDirection: "column",
        alignItems: "center",
        padding: "0 20px",
      }}>
        <div className="ob4-inner" style={{
          width: "100%", maxWidth: 900,
          paddingTop: 36, paddingBottom: 20,
          display: "flex", flexDirection: "column", gap: 0,
        }}>

          {/* ── TITLE AREA ── */}
          <motion.div
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ textAlign: "center", marginBottom: 28 }}
          >
            {/* Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              overflow: "hidden", margin: "0 auto 18px",
              boxShadow: `0 0 32px rgba(212,175,55,0.35)`,
              border: `1.5px solid rgba(212,175,55,0.40)`,
            }}>
              <img
                src="/assets/icons/icon-tell-story.png"
                alt="Tell Your Story"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <h2 className="ob4-title" style={{
              fontFamily: "Playfair Display, serif",
              fontWeight: 700, lineHeight: 1.18,
              color: WHITE, margin: "0 0 12px",
              fontSize: "clamp(28px,3.2vw,50px)",
            }}>
              What happened in your life that deserves to be remembered forever?
            </h2>
            <p style={{
              fontFamily: "Inter, sans-serif", marginTop: 10,
              color: "rgba(255,255,255,0.42)", fontSize: "clamp(13px,1.05vw,15px)",
              letterSpacing: "0.02em", maxWidth: 560, margin: "10px auto 0",
            }}>
              Write your story, record your voice, or upload your memories — the more you share, the more personal your creation becomes.
            </p>
          </motion.div>

          {/* ── STORY TEXT BOX ── */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="ob4-story-wrap"
            style={{ marginBottom: 20, position: "relative" }}
          >
            <textarea
              className="ob4-textarea"
              value={storyText}
              onChange={e => {
                if (e.target.value.length <= MAX_CHARS) onStoryTextChange(e.target.value);
              }}
              onFocus={() => setTextFocus(true)}
              onBlur={() => setTextFocus(false)}
              placeholder="Write your story..."
              maxLength={MAX_CHARS}
              aria-label="Your story"
              style={{
                width: "100%",
                height: "clamp(160px,20vh,260px)",
                borderRadius: 20,
                border: `1.5px solid ${textFocus ? GOLD : storyText.length > 0 ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.22)"}`,
                background: textFocus
                  ? "rgba(10,6,28,0.88)"
                  : "rgba(10,6,28,0.78)",
                backdropFilter: "blur(14px)",
                color: WHITE,
                fontSize: "clamp(14px,1.05vw,16px)",
                fontFamily: "Inter, sans-serif",
                lineHeight: 1.7,
                padding: "22px 22px 46px",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
                boxShadow: textFocus
                  ? `0 0 28px rgba(212,175,55,0.30), inset 0 0 20px rgba(212,175,55,0.05)`
                  : storyText.length > 0
                  ? `0 0 16px rgba(212,175,55,0.14)`
                  : `0 2px 16px rgba(0,0,0,0.40)`,
                transition: "all 220ms ease",
                caretColor: GOLD,
              }}
            />
            {/* Character counter */}
            <div style={{
              position: "absolute", bottom: 14, right: 18,
              fontFamily: "Inter, sans-serif",
              fontSize: 12, fontWeight: 500,
              color: storyText.length > MAX_CHARS * 0.9
                ? storyText.length >= MAX_CHARS ? "#e05555" : "#e8b84b"
                : "rgba(255,255,255,0.28)",
              transition: "color 220ms",
              letterSpacing: "0.04em",
              pointerEvents: "none",
            }}>
              {storyText.length} / {MAX_CHARS.toLocaleString()}
            </div>
            {storyText.trim().length > 0 && (
              <div style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 11, fontWeight: 500,
                color: storyWordCount >= 25 ? "rgba(34,197,94,0.8)" : "rgba(212,175,55,0.60)",
                transition: "color 220ms",
                letterSpacing: "0.04em",
                pointerEvents: "none",
                marginTop: 3,
              }}>
                {storyWordCount >= 25 ? `✓ ${storyWordCount} words` : `${storyWordCount}/25 words min`}
              </div>
            )}
          </motion.div>

          {/* ── STORY ENCOURAGEMENT + AUTO-SAVE ── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:-12, marginBottom:12, padding:"0 2px" }}>
            <AnimatePresence mode="wait">
              {storyWordCount < 25 ? (
                <motion.span
                  key="enc-short"
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  transition={{ duration:0.3 }}
                  style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(212,175,55,0.72)", fontStyle:"italic" }}
                >
                  ✨ The more you share, the more cinematic your result
                </motion.span>
              ) : (
                <motion.span
                  key="enc-good"
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  transition={{ duration:0.3 }}
                  style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(212,175,55,0.72)" }}
                >
                  🔒 Your story is encrypted and private
                </motion.span>
              )}
            </AnimatePresence>
            {/* Auto-save indicator */}
            {storyText.length > 0 && (
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", display:"inline-block", boxShadow:"0 0 6px rgba(34,197,94,0.6)" }}/>
                Saved
              </span>
            )}
          </div>

          {/* ── AUDIO RECORDING ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
            className="ob4-rec-wrap"
            style={{ marginBottom: 20 }}
          >
            <div className="ob4-rec-card" style={{
              borderRadius: 18,
              border: `1.5px solid ${
                rec.status === "recording" ? GOLD
                  : rec.status === "completed" ? "rgba(212,175,55,0.55)"
                  : "rgba(212,175,55,0.20)"}`,
              background: rec.status === "recording"
                ? "rgba(212,175,55,0.08)"
                : rec.status === "completed"
                ? "rgba(212,175,55,0.06)"
                : "rgba(10,6,28,0.70)",
              backdropFilter: "blur(14px)",
              padding: "clamp(14px,2vh,18px) 20px",
              display: "flex", alignItems: "center",
              gap: 16,
              boxShadow: rec.status === "recording"
                ? `0 0 24px rgba(212,175,55,0.30)`
                : "none",
              transition: "all 220ms ease",
            }}>
              {/* Left: mic icon / waveform */}
              <div style={{
                width: 48, height: 48, flexShrink: 0,
                borderRadius: 14,
                background: rec.status === "recording"
                  ? `linear-gradient(135deg,${GOLD},${GOLD2})`
                  : "rgba(212,175,55,0.10)",
                border: rec.status !== "recording" ? `1px solid rgba(212,175,55,0.28)` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: rec.status === "recording" ? `0 0 16px rgba(212,175,55,0.50)` : "none",
                transition: "all 220ms ease",
                position: "relative", overflow: "hidden",
              }}>
                {/* Pulse ring when recording */}
                {rec.status === "recording" && (
                  <div style={{
                    position: "absolute", inset: -4,
                    borderRadius: 18,
                    border: `2px solid rgba(212,175,55,0.45)`,
                    animation: "ob4pulse 1.4s ease-in-out infinite",
                  }}/>
                )}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="2" width="6" height="12" rx="3"
                    fill={rec.status === "recording" ? "#0a0618" : GOLD}/>
                  <path d="M5 10a7 7 0 0014 0" stroke={rec.status === "recording" ? "#0a0618" : GOLD}
                    strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                  <line x1="12" y1="17" x2="12" y2="21"
                    stroke={rec.status === "recording" ? "#0a0618" : GOLD} strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="9" y1="21" x2="15" y2="21"
                    stroke={rec.status === "recording" ? "#0a0618" : GOLD} strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>

              {/* Center: label + timer / playback */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {rec.status === "idle" && (
                  <>
                    <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
                      Record your story
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12 }}>
                      Tap to record • Max 10 min
                    </div>
                  </>
                )}
                {(rec.status === "recording" || rec.status === "paused") && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                      <span style={{ color: GOLD, fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>
                        {formatTime(rec.seconds)}
                      </span>
                      {rec.status === "recording" && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
                        }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: GOLD,
                            animation: "ob4blink 1s ease-in-out infinite",
                            display: "inline-block",
                          }}/>
                          RECORDING
                        </span>
                      )}
                      {rec.status === "paused" && (
                        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, letterSpacing: "0.08em" }}>
                          PAUSED
                        </span>
                      )}
                    </div>
                    {/* Simple waveform visualizer bars */}
                    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} style={{
                          width: 3, borderRadius: 2,
                          background: `rgba(212,175,55,${0.3 + (i % 4) * 0.15})`,
                          height: rec.status === "recording"
                            ? `${8 + Math.abs(Math.sin((i + 1) * 1.3)) * 14}px`
                            : "4px",
                          transition: "height 0.15s ease",
                          animation: rec.status === "recording" ? `ob4wave${i % 4} 0.6s ease-in-out infinite` : "none",
                          animationDelay: `${i * 0.05}s`,
                        }}/>
                      ))}
                    </div>
                  </>
                )}
                {rec.status === "completed" && rec.audioUrl && (
                  <div>
                    <div style={{ color: GOLD, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      Recording saved • {formatTime(rec.seconds)}
                    </div>
                    <audio
                      controls
                      src={rec.audioUrl}
                      aria-label="Playback of your recording"
                      style={{
                        height: 32, width: "100%",
                        accentColor: GOLD,
                        filter: "invert(1) hue-rotate(25deg) brightness(0.9)",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Right: action buttons */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {rec.status === "idle" && (
                  <button
                    onClick={startRecording}
                    aria-label="Start recording"
                    style={{
                      padding: "8px 18px", borderRadius: 8,
                      border: `1.5px solid rgba(212,175,55,0.40)`,
                      background: "rgba(212,175,55,0.08)",
                      color: GOLD, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", letterSpacing: "0.04em",
                      transition: "all 180ms",
                      fontFamily: "Inter, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,175,55,0.16)"; e.currentTarget.style.borderColor = GOLD; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(212,175,55,0.08)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.40)"; }}
                  >
                    Start
                  </button>
                )}
                {rec.status === "recording" && (
                  <>
                    <button onClick={pauseRecording} aria-label="Pause recording"
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: `1px solid rgba(255,255,255,0.2)`,
                        background: "rgba(255,255,255,0.06)", color: WHITE,
                        cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>⏸</button>
                    <button onClick={stopRecording} aria-label="Stop recording"
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: `1px solid rgba(220,80,80,0.45)`,
                        background: "rgba(220,80,80,0.10)", color: "#e06060",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="2" fill="#e06060"/></svg>
                    </button>
                  </>
                )}
                {rec.status === "paused" && (
                  <>
                    <button onClick={resumeRecording} aria-label="Resume recording"
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: `1px solid rgba(212,175,55,0.40)`,
                        background: "rgba(212,175,55,0.10)", color: GOLD,
                        cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>▶</button>
                    <button onClick={stopRecording} aria-label="Stop recording"
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: `1px solid rgba(220,80,80,0.45)`,
                        background: "rgba(220,80,80,0.10)", color: "#e06060",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="2" fill="#e06060"/></svg>
                    </button>
                  </>
                )}
                {rec.status === "completed" && (
                  <button onClick={discardRecording} aria-label="Discard recording"
                    style={{
                      padding: "7px 14px", borderRadius: 8,
                      border: `1px solid rgba(220,80,80,0.35)`,
                      background: "rgba(220,80,80,0.07)", color: "#e07070",
                      cursor: "pointer", fontSize: 12, fontFamily: "Inter, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(220,80,80,0.14)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(220,80,80,0.07)"}
                  >Discard</button>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── UPLOAD SECTION ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.26, ease: "easeOut" }}
            style={{ marginBottom: 16 }}
          >
            <div style={{
              fontFamily: "Inter, sans-serif", fontSize: 12,
              fontWeight: 600, color: "rgba(255,255,255,0.38)",
              letterSpacing: "0.12em", textTransform: "uppercase",
              marginBottom: 12,
            }}>
              Add Media &amp; Documents
            </div>

            {/* 4-col upload grid */}
            <div className="ob4-upload-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "clamp(10px,1.2vw,16px)",
            }}>
              <UploadCard
                id="photos" label="Photos"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="15" rx="3" stroke={GOLD} strokeWidth="1.6"/>
                    <circle cx="8.5" cy="10.5" r="2" stroke={GOLD} strokeWidth="1.5"/>
                    <path d="M2 17l5-5 4 4 3-3 5 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                acceptTypes={[".jpg", ".jpeg", ".png", ".webp", "image/*"]}
                files={uploadedPhotos} setter={onPhotos}
                limit={UPLOAD_LIMITS.photos}
              />
              <UploadCard
                id="videos" label="Videos"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="14" height="14" rx="3" stroke={GOLD} strokeWidth="1.6"/>
                    <path d="M16 9l6-3v12l-6-3V9z" stroke={GOLD} strokeWidth="1.6" strokeLinejoin="round"/>
                  </svg>
                }
                accept="video/mp4,video/quicktime,.mp4,.mov"
                acceptTypes={[".mp4", ".mov", "video/*"]}
                files={uploadedVideos} setter={onVideos}
                limit={UPLOAD_LIMITS.videos}
              />
              <UploadCard
                id="voiceNotes" label="Voice Notes"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke={GOLD} strokeWidth="1.6"/>
                    <path d="M8 12c0 0 1-3 4-3s4 3 4 3" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="8" y1="14" x2="8" y2="17" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="12" y1="15" x2="12" y2="18" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="16" y1="14" x2="16" y2="17" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                }
                accept="audio/mpeg,audio/wav,audio/mp4,.mp3,.wav,.m4a"
                acceptTypes={[".mp3", ".wav", ".m4a", "audio/*"]}
                files={uploadedVoiceNotes} setter={onVoiceNotes}
                limit={UPLOAD_LIMITS.voiceNotes}
              />
              <UploadCard
                id="documents" label="Documents"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2h8l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
                      stroke={GOLD} strokeWidth="1.6"/>
                    <path d="M14 2v6h6" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round"/>
                    <line x1="8" y1="13" x2="16" y2="13" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round"/>
                    <line x1="8" y1="17" x2="13" y2="17" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                }
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                acceptTypes={[".pdf", ".docx", ".txt", "application/pdf", "text/plain"]}
                files={uploadedDocuments} setter={onDocuments}
                limit={UPLOAD_LIMITS.documents}
              />
            </div>

            {/* File list */}
            {allFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                style={{
                  marginTop: 14, display: "flex", flexDirection: "column", gap: 6,
                  maxHeight: 180, overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {uploadedPhotos.map(f => (
                  <FileItem key={f.id} file={f}
                    onRemove={() => removeFile(f.id, uploadedPhotos, onPhotos)}/>
                ))}
                {uploadedVideos.map(f => (
                  <FileItem key={f.id} file={f}
                    onRemove={() => removeFile(f.id, uploadedVideos, onVideos)}/>
                ))}
                {uploadedVoiceNotes.map(f => (
                  <FileItem key={f.id} file={f}
                    onRemove={() => removeFile(f.id, uploadedVoiceNotes, onVoiceNotes)}/>
                ))}
                {uploadedDocuments.map(f => (
                  <FileItem key={f.id} file={f}
                    onRemove={() => removeFile(f.id, uploadedDocuments, onDocuments)}/>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* ── VALIDATION HINT ── */}
          <AnimatePresence>
            {!hasContent && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  textAlign: "center", marginBottom: 8,
                  fontFamily: "Inter, sans-serif", fontSize: 12,
                  color: "rgba(255,255,255,0.30)",
                  letterSpacing: "0.03em",
                }}
              >
                Add a story (min 25 words), recording, or at least one file to continue
              </motion.div>
            )}
          </AnimatePresence>

        </div>{/* /ob4-inner */}
      </div>{/* /ob4-scroll */}

      {/* ── NAVIGATION ── */}
      <div className="ob4-nav" style={{
        position: "relative", zIndex: 10,
        width: "100%", flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "clamp(14px,2vh,24px) clamp(20px,4vw,80px)",
        paddingBottom: "clamp(24px,3.5vh,44px)",
        maxWidth: 1400, margin: "0 auto", boxSizing: "border-box",
        alignSelf: "stretch",
      }}>
        <button
          onClick={onBack}
          onMouseEnter={() => setBackHover(true)}
          onMouseLeave={() => setBackHover(false)}
          aria-label="Go back"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "0 32px", height: 52,
            borderRadius: 10,
            border: `1.5px solid ${backHover ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.28)"}`,
            background: backHover ? "rgba(212,175,55,0.08)" : "transparent",
            color: backHover ? GOLD : "rgba(255,255,255,0.6)",
            fontSize: 14, fontWeight: 500, fontFamily: "Inter,sans-serif",
            cursor: "pointer", transition: "all 200ms ease",
            letterSpacing: "0.04em", minWidth: 120,
          }}
        >← Back</button>

        <button
          onClick={handleNext}
          onMouseEnter={() => setNextHover(true)}
          onMouseLeave={() => setNextHover(false)}
          disabled={!hasContent || nextLoading}
          aria-label="Continue to next step"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "0 36px", height: 52,
            borderRadius: 10, border: "none",
            background: hasContent
              ? nextHover
                ? `linear-gradient(135deg,${GOLD2} 0%,${GOLD} 100%)`
                : `linear-gradient(135deg,${GOLD} 0%,${GOLD2} 100%)`
              : "rgba(255,255,255,0.08)",
            color: hasContent ? "#0a0618" : "rgba(255,255,255,0.3)",
            fontSize: 14, fontWeight: 700, fontFamily: "Inter,sans-serif",
            cursor: hasContent ? "pointer" : "not-allowed",
            transition: "all 200ms ease",
            letterSpacing: "0.06em", minWidth: 140,
            boxShadow: hasContent
              ? nextHover
                ? `0 0 28px rgba(212,175,55,0.55), 0 4px 20px rgba(212,175,55,0.3)`
                : `0 0 18px rgba(212,175,55,0.35)`
              : "none",
            opacity: nextLoading ? 0.7 : 1,
          }}
        >
          {nextLoading ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: "ob4spin 0.8s linear infinite" }}>
                <circle cx="8" cy="8" r="6" stroke="rgba(10,6,24,0.4)" strokeWidth="2" fill="none"/>
                <path d="M8 2 A6 6 0 0 1 14 8" stroke="#0a0618" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
              Loading…
            </span>
          ) : <>Continue →</>}
        </button>
      </div>

      <style>{`
        .ob4-root * { box-sizing: border-box; }
        .ob4-textarea::placeholder { color: rgba(255,255,255,0.22); }
        .ob4-scroll::-webkit-scrollbar { width: 4px; }
        .ob4-scroll::-webkit-scrollbar-track { background: transparent; }
        .ob4-scroll::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.25); border-radius: 4px; }

        @keyframes ob4spin { to { transform: rotate(360deg); } }
        @keyframes ob4pulse {
          0%,100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.15); }
        }
        @keyframes ob4blink {
          0%,100% { opacity: 1; } 50% { opacity: 0.25; }
        }
        @keyframes ob4wave0 { 0%,100%{height:8px} 50%{height:18px} }
        @keyframes ob4wave1 { 0%,100%{height:12px} 50%{height:6px} }
        @keyframes ob4wave2 { 0%,100%{height:16px} 50%{height:8px} }
        @keyframes ob4wave3 { 0%,100%{height:6px} 50%{height:20px} }

        /* TABLET */
        @media(min-width:601px) and (max-width:1100px){
          .ob4-inner { max-width:850px!important; padding-top:28px!important; }
          .ob4-upload-grid { grid-template-columns:repeat(4,1fr)!important; }
          .ob4-nav { padding:16px 48px 60px!important; }
          .ob4-header { padding-top:28px!important; }
          .ob4-br { display:none!important; }
        }

        /* MOBILE */
        @media(max-width:600px){
          .ob4-root { height:100%!important; min-height:unset!important; }
          .ob4-scroll { overflow-y:auto!important; }
          .ob4-inner { padding-top:20px!important; padding-bottom:12px!important; }
          .ob4-title { font-size:clamp(22px,7vw,30px)!important; }
          .ob4-br { display:none!important; }
          .ob4-rec-card { flex-wrap:wrap!important; gap:12px!important; }
          .ob4-upload-grid {
            grid-template-columns:repeat(2,1fr)!important;
            gap:10px!important;
          }
          .ob4-story-wrap textarea { height:180px!important; }
          .ob4-nav { padding:12px 20px 100px 20px!important; }
          .ob4-header { padding-top:16px!important; overflow-x:auto!important; }
        }
      `}</style>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
//  STEP 5 — AI EMOTIONAL ANALYSIS  (OpenAI-powered, live scoring, product recs)
// ─────────────────────────────────────────────────────────────────────────────

// ── Category config — labels/colors/icons only; scores come from OpenAI ──
const S5_CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  emotional:  { label: "Emotional Tone",     color: "#D4AF37", icon: "♥" },
  arc:        { label: "Story Arc",          color: "#F4D06F", icon: "◈" },
  memories:   { label: "Key Memories",       color: "#D4AF37", icon: "◉" },
  mood:       { label: "Mood Profile",       color: "#c9a632", icon: "≋" },
  resonance:  { label: "Cinematic Resonance",color: "#F4D06F", icon: "✦" },
};
const S5_CAT_KEYS = ["emotional","arc","memories","mood","resonance"];

// ── Product catalog mirror (for rendering rec cards) ──
const S5_PRODUCT_META: Record<string, { name: string; category: string; priceStr: string; icon: string; accent: string }> = {
  "mem-starter":           { name: "Starter Membership",    category: "Membership",    priceStr: "$49/mo",  icon: "🎵", accent: "#D4AF37" },
  "mem-premium":           { name: "Premium Membership",    category: "Membership",    priceStr: "$79/mo",  icon: "🎵", accent: "#FFC24D" },
  "mem-elite":             { name: "Elite Membership",      category: "Membership",    priceStr: "$125/mo", icon: "🎵", accent: "#FFD700" },
  "film2-essential":       { name: "2-Min Cinematic Film",  category: "Short Films",   priceStr: "$79",     icon: "🎬", accent: "#D4A574" },
  "film2-premium":         { name: "2-Min Film — Premium",  category: "Short Films",   priceStr: "$129",    icon: "🎬", accent: "#D4A574" },
  "film5-essential":       { name: "5-Min Cinematic Film",  category: "Feature Films", priceStr: "$199",    icon: "🎥", accent: "#06B6D4" },
  "film10-premium":        { name: "10-Min Legacy Film",    category: "Masterpiece",   priceStr: "$499",    icon: "🏆", accent: "#10B981" },
  "voice-cloning":         { name: "Voice Cloning Studio",  category: "Studio",        priceStr: "$297",    icon: "🎙️", accent: "#EC4899" },
  "signature-masterpiece": { name: "Signature Masterpiece", category: "Premium",       priceStr: "$4,997",  icon: "💎", accent: "#D4AF37" },
  "dream-visualization":   { name: "Dream AI Visualization",category: "AI",            priceStr: "$247",    icon: "🌌", accent: "#6366F1" },
  "future-self":           { name: "Future Self Vision",    category: "AI",            priceStr: "$197",    icon: "🔮", accent: "#8B5CF6" },
  "memorial-legacy":       { name: "Memorial Legacy Film",  category: "Video",         priceStr: "$149",    icon: "🕊️", accent: "#64748B" },
  "family-vault":          { name: "Family Vault",          category: "Legacy",        priceStr: "$19/mo",  icon: "🏛️", accent: "#22D3EE" },
  "couples-journey":       { name: "Couples Journey Film",  category: "Video",         priceStr: "$299",    icon: "💑", accent: "#F43F5E" },
  "relationship-healing":  { name: "Relationship Healing",  category: "Music",         priceStr: "$19/mo",  icon: "💚", accent: "#10B981" },
  "cinematic-life-story":  { name: "Cinematic Life Story",  category: "Video",         priceStr: "$299",    icon: "📽️", accent: "#A78BFA" },
  "sophia-ai":             { name: "Sophia AI Companion",   category: "AI",            priceStr: "$49/mo",  icon: "✨", accent: "#D4AF37" },
  "emotional-soundtrack":  { name: "Emotional Soundtrack",  category: "Music",         priceStr: "$19/mo",  icon: "🎶", accent: "#F472B6" },
  "cinematic-story-film":  { name: "Cinematic Story Film",  category: "Video",         priceStr: "$79",     icon: "🎞️", accent: "#FB923C" },
};

// ── AI Analysis result type ──
interface S5AnalysisResult {
  categories: Array<{ key: string; label: string; score: number; insight: string; reason?: string }>;
  dominantEmotion: string;
  emotionalArc: string;
  emotionalFingerprint?: string[];
  songTitle: string;
  profileSummary: string;
  recommendations: Array<{ id: string; rank: number; reason: string }>;
}

// ── Reassurance ticker ──
const S5_REASSURANCE_FETCHING = [
  "Reading the emotional frequency of your story…",
  "Mapping your unique narrative arc…",
  "Identifying cinematic moments and memory anchors…",
  "Building your personal emotional fingerprint…",
  "Almost there — this is the magic part ✨",
  "Cross-referencing with 50,000+ emotional profiles…",
];

function S5ReassuranceTicker({ phase }: { phase: "loading" | "animating" | "done" }) {
  const [idx, setIdx] = useState(0);
  React.useEffect(() => {
    if (phase === "done") return;
    const t = setInterval(() => setIdx(i => (i + 1) % S5_REASSURANCE_FETCHING.length), 2600);
    return () => clearInterval(t);
  }, [phase]);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"10px 20px", zIndex:10, position:"relative" }}>
      <AnimatePresence mode="wait">
        {phase !== "done" ? (
          <motion.p key={idx}
            initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-5 }}
            transition={{ duration:0.32 }}
            style={{ fontFamily:"Inter,sans-serif", fontSize:"clamp(11px,1vw,13px)", color:"rgba(255,255,255,0.50)", margin:0, textAlign:"center", fontStyle:"italic" }}
          >{S5_REASSURANCE_FETCHING[idx]}</motion.p>
        ) : (
          <motion.p key="done"
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.4 }}
            style={{ fontFamily:"Inter,sans-serif", fontSize:"clamp(11px,1vw,13px)", color:"#D4AF37", margin:0, textAlign:"center", fontWeight:600 }}
          >✓ Analysis complete — your emotional profile is ready</motion.p>
        )}
      </AnimatePresence>
      <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.22)", margin:0, textAlign:"center" }}>
        Powered by OpenAI · Your data never leaves our servers
      </p>
    </div>
  );
}

// ── Product recommendation card ──
function S5RecCard({ rec, productMeta, index, visible }: {
  rec: { id: string; rank: number; reason: string };
  productMeta: { name: string; category: string; priceStr: string; icon: string; accent: string } | undefined;
  index: number;
  visible: boolean;
}) {
  const [hover, setHover] = useState(false);
  if (!productMeta) return null;
  return (
    <motion.div
      initial={{ opacity:0, y:20, scale:0.94 }}
      animate={visible ? { opacity:1, y:0, scale:1 } : { opacity:0, y:20, scale:0.94 }}
      transition={{ duration:0.45, delay: index * 0.14, ease:"easeOut" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 14,
        border: `1.5px solid ${hover ? productMeta.accent + "77" : productMeta.accent + "33"}`,
        background: hover ? `${productMeta.accent}11` : "rgba(10,6,28,0.65)",
        backdropFilter: "blur(12px)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 11,
        cursor: "default",
        transition: "all 220ms ease",
        boxShadow: hover ? `0 0 18px ${productMeta.accent}33` : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Rank badge */}
      <div style={{
        position: "absolute", top: 8, right: 10,
        fontFamily: "Inter,sans-serif", fontSize: 9, fontWeight: 700,
        color: productMeta.accent, letterSpacing: "0.12em", textTransform: "uppercase",
        opacity: 0.7,
      }}>#{rec.rank} MATCH</div>

      {/* Icon */}
      <div style={{
        width: 38, height: 38, flexShrink: 0,
        borderRadius: 10,
        background: `${productMeta.accent}1a`,
        border: `1px solid ${productMeta.accent}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
        boxShadow: hover ? `0 0 12px ${productMeta.accent}44` : "none",
        transition: "box-shadow 220ms",
      }}>{productMeta.icon}</div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{
            fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700,
            color: "#fff", lineHeight: 1.2,
          }}>{productMeta.name}</span>
        </div>
        <div style={{
          fontFamily: "Inter,sans-serif", fontSize: 11,
          color: productMeta.accent, fontWeight: 600,
          marginBottom: 5, letterSpacing: "0.02em",
        }}>{productMeta.priceStr} · {productMeta.category}</div>
        <div style={{
          fontFamily: "Inter,sans-serif", fontSize: 11,
          color: "rgba(255,255,255,0.48)", lineHeight: 1.55,
        }}>{rec.reason}</div>
      </div>
    </motion.div>
  );
}

interface Step5Props {
  whoFor: string | null;
  experienceType: string | null;
  storyText: string;
  uploadedPhotos: UploadedFile[];
  uploadedVideos: UploadedFile[];
  uploadedVoiceNotes: UploadedFile[];
  uploadedDocuments: UploadedFile[];
  recordedAudio: string | null;
  onNext: (result: S5AnalysisResult) => void;
  onBack: () => void;
}

function Step5AIAnalysis({
  whoFor, experienceType, storyText,
  uploadedPhotos, uploadedVideos, uploadedVoiceNotes, uploadedDocuments, recordedAudio,
  onNext, onBack,
}: Step5Props) {

  // ── UI state ──
  const [backHover,   setBackHover]   = useState(false);
  const [nextHover,   setNextHover]   = useState(false);
  const [skipHover,   setSkipHover]   = useState(false);

  // ── Analysis state ──
  // phase: loading = fetching AI | animating = filling bars | done = complete
  const [phase,           setPhase]           = useState<"loading"|"animating"|"done">("loading");
  const [aiResult,        setAiResult]        = useState<S5AnalysisResult | null>(null);
  const [displayProgress, setDisplayProgress] = useState<Record<string,number>>(
    Object.fromEntries(S5_CAT_KEYS.map(k => [k, 0]))
  );
  const [activeCategory,  setActiveCategory]  = useState<string | null>(null);
  const [hoveredCat,      setHoveredCat]      = useState<string | null>(null);
  const [recsVisible,     setRecsVisible]     = useState(false);
  const [showRecs,        setShowRecs]        = useState(false); // toggle recs panel

  // Song generation moved to Step 6 — no song state here

  // ── Interactive eye state ──
  const [eyeGaze,   setEyeGaze]   = useState({ x: 0, y: 0 });
  const [eyePulse,  setEyePulse]  = useState(0);
  const [scanAngle, setScanAngle] = useState(0);
  const [glitchOn,  setGlitchOn]  = useState(false);
  const [eyeBlink,  setEyeBlink]  = useState(false);
  const [coreActive,setCoreActive]= useState(false);

  const coreWrapRef = React.useRef<HTMLDivElement>(null);

  // ── Compute overall progress 0-100 ──
  const overallProgress = React.useMemo(() => {
    if (!aiResult) return 0;
    const total = S5_CAT_KEYS.reduce((s, k) => s + (displayProgress[k] ?? 0), 0);
    const max   = aiResult.categories.reduce((s, c) => s + c.score, 0);
    return max > 0 ? Math.round((total / max) * 100) : 0;
  }, [displayProgress, aiResult]);

  const skipEnabled = overallProgress >= 50 || phase === "done";

  // ── Data richness labels ──
  const mediaCount = uploadedPhotos.length + uploadedVideos.length + uploadedVoiceNotes.length + uploadedDocuments.length;
  const dataPoints = [
    whoFor           ? `For: ${whoFor}`             : null,
    experienceType   ? `${experienceType}`           : null,
    storyText.trim().length > 0 ? `Story (${storyText.trim().length} chars)` : null,
    recordedAudio    ? "Voice recording"             : null,
    mediaCount > 0   ? `${mediaCount} media files`  : null,
  ].filter(Boolean) as string[];

  // ── Fetch AI analysis on mount ──
  React.useEffect(() => {
    let cancelled = false;
    setCoreActive(true);

    // Get already-owned products from localStorage if any
    let alreadyOwnedIds: string[] = [];
    try {
      const saved = localStorage.getItem("gm_order_confirmation");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.package) alreadyOwnedIds.push(`mem-${parsed.package}`);
        if (parsed?.addons) alreadyOwnedIds.push(...parsed.addons.map((a: any) => a.productId));
      }
    } catch { /* ignore */ }

    fetch("/api/onboarding/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whoFor, experienceType, storyText, mediaCount, alreadyOwnedIds }),
    })
      .then(r => r.json())
      .then((data: { success: boolean; analysis: S5AnalysisResult }) => {
        if (cancelled) return;
        const result = data.analysis;
        setAiResult(result);
        setPhase("animating");
        // Animate bars sequentially with real scores
        animateBars(result, () => {
          if (!cancelled) {
            setPhase("done");
            setTimeout(() => setRecsVisible(true), 600);
            // Kick off song generation after bars finish
          }
        });
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: generate contextual mock
        const fallback = buildClientFallback(whoFor, experienceType);
        setAiResult(fallback);
        setPhase("animating");
        animateBars(fallback, () => {
          if (!cancelled) {
            setPhase("done");
            setTimeout(() => setRecsVisible(true), 600);
          }
        });
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Animate bars based on AI scores ──
  function animateBars(result: S5AnalysisResult, onComplete: () => void) {
    const categories = result.categories;
    // Each category fills sequentially with unique timing
    // Delay between start: varies by category position + score
    let globalDelay = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    categories.forEach((cat, idx) => {
      // Start delay: stagger with variance based on score (higher score = slightly longer fill)
      const startDelay = globalDelay + 200 + idx * 50;
      globalDelay = startDelay;

      timers.push(setTimeout(() => {
        setActiveCategory(cat.key);

        // Duration varies with score: higher scores take longer to fill (feels more "real")
        const baseDuration = 800 + (cat.score / 100) * 900;
        // Non-linear steps: accelerate then decelerate at end
        const totalSteps = 55 + Math.floor(cat.score / 10);
        let step = 0;
        let current = 0;

        const iv = setInterval(() => {
          step++;
          // Easing: fast start, slow end (ease-out cubic), with tiny jitter
          const t = step / totalSteps;
          const eased = 1 - Math.pow(1 - t, 2.4); // ease-out
          const jitter = (Math.random() - 0.5) * 1.8; // ±0.9% random noise
          current = Math.min(cat.score, Math.max(0, cat.score * eased + jitter));

          setDisplayProgress(p => ({ ...p, [cat.key]: Math.round(current) }));

          if (step >= totalSteps || current >= cat.score) {
            clearInterval(iv);
            setDisplayProgress(p => ({ ...p, [cat.key]: cat.score }));
            if (idx === categories.length - 1) {
              timers.push(setTimeout(() => {
                setActiveCategory(null);
                onComplete();
              }, 400));
            }
          }
        }, baseDuration / totalSteps);

        timers.push(setTimeout(() => clearInterval(iv), baseDuration + 800));
      }, startDelay));
    });

    return () => timers.forEach(clearTimeout);
  }

  // ── Client-side fallback (no API) ──
  function buildClientFallback(who: string | null, xp: string | null): S5AnalysisResult {
    const seed = ((who ?? "").length + (xp ?? "").length + storyText.length) % 17;
    const variance = [seed % 8, (seed * 3) % 11, (seed * 5) % 9, (seed * 7) % 13, (seed * 2) % 10];
    const bases = [81, 74, 88, 69, 92];
    const emotionMap: Record<string, string> = {
      relationship: "Deep Longing", family: "Warmth & Belonging",
      child: "Pure Joy", self: "Quiet Strength", loss: "Grief & Grace",
    };
    const arcMap: Record<string, string> = {
      song: "A story that sings", film: "A story that needs to be seen",
      both: "A story that demands both music and film",
    };
    const key = Object.keys(emotionMap).find(k => (who ?? "").includes(k)) ?? "self";
    return {
      categories: [
        { key:"emotional", label:"Emotional Tone",     score: bases[0]+variance[0], insight: "Emotional depth that resonates through every word" },
        { key:"arc",       label:"Story Arc",          score: bases[1]+variance[1], insight: "A clear journey — beginning, turning point, meaning" },
        { key:"memories",  label:"Key Memories",       score: bases[2]+variance[2], insight: "Vivid anchors that hold the story together" },
        { key:"mood",      label:"Mood Profile",       score: bases[3]+variance[3], insight: "Complex emotional signature — rare and powerful" },
        { key:"resonance", label:"Cinematic Resonance",score: bases[4]+variance[4], insight: "Strong visual storytelling potential detected" },
      ],
      dominantEmotion: emotionMap[key] ?? "Deep Emotion",
      emotionalArc: arcMap[xp ?? ""] ?? "A journey from memory into meaning.",
      songTitle: "Echoes of You",
      profileSummary: "Your story carries something rare — a depth of feeling most people never put into words. This is exactly what Ghaafeedi Music was built for.",
      recommendations: [
        { id:"cinematic-life-story", rank:1, reason:"Your emotional depth demands a cinematic canvas. This product brings your full story to life." },
        { id:"mem-premium",          rank:2, reason:"For ongoing stories, Premium Membership gives you 8 songs per month at your pace." },
        { id:"sophia-ai",            rank:3, reason:"Sophia AI can guide you through the emotional process of creation, step by step." },
        { id:"film5-essential",      rank:4, reason:"A 5-minute film captures the full arc of what you shared — nothing cut, nothing lost." },
      ],
    };
  }

  // ── Eye pulse driven by overall progress ──
  React.useEffect(() => {
    setEyePulse(overallProgress / 100);
  }, [overallProgress]);

  // ── Mouse / touch tracking → eye gaze ──
  React.useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const wrap = coreWrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const clientX = "touches" in e ? (e.touches[0]?.clientX ?? cx) : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? (e.touches[0]?.clientY ?? cy) : (e as MouseEvent).clientY;
      const dx = (clientX - cx) / (rect.width * 0.7);
      const dy = (clientY - cy) / (rect.height * 0.7);
      const dist = Math.hypot(dx, dy);
      const clamp = dist > 1 ? 1 / dist : 1;
      setEyeGaze({ x: dx * clamp, y: dy * clamp });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("touchmove", onMove); };
  }, []);

  // ── Rotating scan beam ──
  React.useEffect(() => {
    let angle = 0;
    let raf: number;
    const tick = () => {
      // Speed up during loading, slow down when done
      const speed = phase === "loading" ? 0.8 : phase === "animating" ? 0.55 : 0.25;
      angle = (angle + speed) % 360;
      setScanAngle(angle);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // ── Glitch flashes during analysis ──
  React.useEffect(() => {
    if (phase === "done") return;
    const id = setInterval(() => {
      if (Math.random() < 0.28) {
        setGlitchOn(true);
        setTimeout(() => setGlitchOn(false), 90);
        setTimeout(() => { setGlitchOn(true); }, 160);
        setTimeout(() => { setGlitchOn(false); }, 240);
      }
    }, 2400);
    return () => clearInterval(id);
  }, [phase]);

  // ── Periodic blink ──
  React.useEffect(() => {
    const id = setInterval(() => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 200);
    }, 4500 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);

  const handleSkip = () => {
    if (!skipEnabled) return;
    if (!aiResult) return;
    // Fill all bars to target instantly
    const full = Object.fromEntries(aiResult.categories.map(c => [c.key, c.score]));
    setDisplayProgress(full);
    setActiveCategory(null);
    setPhase("done");
    setTimeout(() => setRecsVisible(true), 400);
  };



  // ── Derived visual values ──
  const activeCatMeta   = activeCategory ? S5_CATEGORY_META[activeCategory] : null;
  const hoveredCatMeta  = hoveredCat     ? S5_CATEGORY_META[hoveredCat]     : null;
  const eyeGlowColor    = phase === "done" ? "#D4AF37" : hoveredCatMeta?.color ?? activeCatMeta?.color ?? "#60c8ff";
  const eyeGlowIntensity = 0.35 + eyePulse * 0.65;
  const eyeGlowAmt       = Math.round(20 + eyeGlowIntensity * 60);
  const isGlitching      = glitchOn && phase !== "done";
  const pupilX = eyeGaze.x * 16;
  const pupilY = eyeGaze.y * 16;

  const activeCatResult = aiResult?.categories.find(c => c.key === activeCategory);
  const insightText = phase === "done"
    ? (aiResult?.dominantEmotion ? `${aiResult.dominantEmotion} — analysis complete` : "Analysis complete")
    : activeCategory
      ? (activeCatResult?.insight ?? "Processing…")
      : phase === "loading" ? "Connecting to emotional intelligence engine…" : "Initializing…";

  // ── Orbital particles ──
  const PARTICLES = React.useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const orbits = [95, 118, 140, 162, 185];
    const r = orbits[i % orbits.length];
    return {
      id: i, r,
      size: i % 4 === 0 ? 4.5 : i % 3 === 0 ? 3.2 : i % 2 === 0 ? 2.2 : 1.5,
      speed: 8 + (i % 6) * 1.4,
      color: i % 5 === 0 ? "#D4AF37" : i % 5 === 1 ? "#F4D06F" : i % 5 === 2 ? "#60c8ff" : i % 5 === 3 ? "#a78fff" : "#ff9f60",
      opacity: 0.28 + (i % 4) * 0.08,
      delay: -(i * 0.55),
      cw: i % 2 === 0,
    };
  }), []);

  return (
    <div ref={coreWrapRef} className="ob5-root" style={{
      position: "relative", width: "100%", height: "100%",
      background: "linear-gradient(160deg,#020B2B 0%,#04133D 45%,#060820 80%,#020B2B 100%)",
      overflow: "hidden", display: "flex", flexDirection: "column",
      fontFamily: "Inter,sans-serif",
    }}>
      {/* ── Deep space nebula background ── */}
      <div style={{
        position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
        background:`
          radial-gradient(ellipse 80% 60% at 50% 40%, rgba(72,28,140,0.22) 0%, transparent 65%),
          radial-gradient(ellipse 55% 50% at 20% 70%, rgba(10,60,140,0.20) 0%, transparent 55%),
          radial-gradient(ellipse 60% 55% at 80% 25%, rgba(80,20,160,0.15) 0%, transparent 58%),
          radial-gradient(ellipse 70% 40% at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 60%)
        `,
      }}/>
      <Stars/>

      {/* Gold accent line */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:2, zIndex:10, pointerEvents:"none",
        background:`linear-gradient(90deg,transparent 0%,${GOLD} 30%,${GOLD2} 50%,${GOLD} 70%,transparent 100%)`,
        opacity:0.75,
      }}/>

      {/* ── STEP INDICATOR ── */}
      <div className="ob5-header" style={{ position:"relative", zIndex:10, width:"100%", display:"flex", justifyContent:"center", paddingTop:28, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{ display:"flex", alignItems:"center", gap:8 }}>
              {n > 1 && <div style={{ width:26, height:1, background:`linear-gradient(90deg,${GOLD},rgba(212,175,55,0.25))`, opacity:0.55 }}/>}
              <div style={{
                width:26, height:26, borderRadius:"50%",
                background:`linear-gradient(135deg,${GOLD},${GOLD2})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:`0 0 10px rgba(212,175,55,0.45)`,
              }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5L4.4 8L9 3" stroke="#0a0618" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ))}
          <div style={{ width:26, height:1, background:`linear-gradient(90deg,${GOLD},rgba(212,175,55,0.25))`, opacity:0.55 }}/>
          <div style={{
            width:28, height:28, borderRadius:"50%",
            border:`2px solid ${GOLD}`,
            background:"rgba(212,175,55,0.12)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 0 20px rgba(212,175,55,0.50)`,
          }}>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:700, color:GOLD }}>05</span>
          </div>
          {[6,7,8,9].map(n => (
            <div key={n} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:18, height:1, background:"rgba(255,255,255,0.10)" }}/>
              <div style={{
                width:22, height:22, borderRadius:"50%",
                border:"1.5px solid rgba(255,255,255,0.13)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <span style={{ fontSize:9, fontWeight:500, color:"rgba(255,255,255,0.25)" }}>{String(n).padStart(2,"0")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="ob5-scroll" style={{
        flex:1, overflowY:"auto", overflowX:"hidden",
        display:"flex", flexDirection:"column", alignItems:"center",
        padding:"0 20px", position:"relative", zIndex:5,
      }}>
        <div className="ob5-inner" style={{
          width:"100%", maxWidth:1040,
          paddingTop:16, paddingBottom:16,
          display:"flex", flexDirection:"column", alignItems:"center",
        }}>

          {/* ── TITLE ── */}
          <motion.div
            initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, ease:"easeOut" }}
            style={{ textAlign:"center", marginBottom:16 }}
          >
            <h2 className="ob5-title" style={{
              fontFamily:"Playfair Display,serif", fontWeight:700, lineHeight:1.18,
              color:WHITE, margin:0, fontSize:"clamp(26px,3.2vw,50px)",
            }}>
              {phase === "done"
                ? (aiResult?.dominantEmotion ? `Your story speaks of ${aiResult.dominantEmotion}` : "Analysis Complete")
                : phase === "loading" ? "Connecting to emotional intelligence…"
                : "AI is reading your story…"}
            </h2>
            <p style={{
              fontFamily:"Inter,sans-serif", color:"rgba(255,255,255,0.42)",
              fontSize:"clamp(11px,0.95vw,14px)", marginTop:8, letterSpacing:"0.03em",
              minHeight:20, transition:"opacity 0.5s",
            }}>
              {phase === "done" && aiResult?.emotionalArc
                ? aiResult.emotionalArc
                : dataPoints.length > 0
                  ? `${dataPoints.length} data point${dataPoints.length > 1 ? "s" : ""} — ${dataPoints.slice(0,3).join(" · ")}${dataPoints.length > 3 ? " · ···" : ""}`
                  : "Initializing emotional intelligence engine…"}
            </p>
          </motion.div>

          {/* ── MAIN LAYOUT ── */}
          <div className="ob5-layout" style={{
            width:"100%", display:"flex",
            alignItems:"flex-start",
            justifyContent:"center",
            gap:"clamp(20px,4vw,52px)",
            flexWrap:"wrap",
          }}>

            {/* ════════════════════════════ AI EYE CORE ════════════════════════════ */}
            <motion.div
              className="ob5-core-wrap"
              initial={{ opacity:0, scale:0.80 }}
              animate={{ opacity:1, scale:1 }}
              transition={{ duration:0.9, delay:0.2, ease:"easeOut" }}
              style={{ position:"relative", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}
            >
              {/* Outer pulsing aura rings */}
              {[1,2,3].map(i => (
                <div key={i}
                  className={`ob5-aura-ring ob5-aura-${i}`}
                  style={{
                    position:"absolute", borderRadius:"50%",
                    border:`1px solid ${eyeGlowColor}${Math.round((0.22-i*0.05)*255).toString(16).padStart(2,"0")}`,
                    pointerEvents:"none",
                    animation:`ob5aura${i} ${3+i*0.9}s ease-in-out infinite`,
                    animationDelay:`${i*0.6}s`,
                    transition:"border-color 0.6s ease",
                  }}
                />
              ))}

              {/* Rotating outer data ring */}
              <div className="ob5-data-ring" style={{
                position:"absolute", borderRadius:"50%",
                border:`1px solid rgba(212,175,55,0.20)`,
                animation:"ob5rotCW 20s linear infinite",
                pointerEvents:"none",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {Array.from({length:36}).map((_,i) => (
                  <div key={i} style={{
                    position:"absolute",
                    height: i%6===0 ? 10 : i%3===0 ? 6 : 3.5,
                    width:  i%6===0 ? 2   : 1.2,
                    background: i%6===0 ? GOLD : i%3===0 ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.25)",
                    borderRadius:2,
                    transformOrigin:"center bottom",
                    transform:`rotate(${i*(360/36)}deg) translateY(-50%)`,
                  }}/>
                ))}
              </div>

              {/* Counter-rotating inner ring */}
              <div className="ob5-inner-ring" style={{
                position:"absolute", borderRadius:"50%",
                border:`1.5px solid ${eyeGlowColor}38`,
                animation:"ob5rotCCW 13s linear infinite",
                pointerEvents:"none",
                transition:"border-color 0.6s ease",
              }}/>

              {/* Rotating scan beam */}
              <div style={{ position:"absolute", inset:0, borderRadius:"50%", overflow:"hidden", pointerEvents:"none", zIndex:2 }}>
                <div style={{
                  position:"absolute", top:"50%", left:"50%",
                  width:"52%", height:1.5,
                  transformOrigin:"left center",
                  transform:`rotate(${scanAngle}deg)`,
                  background:`linear-gradient(90deg,transparent,${eyeGlowColor}99,${eyeGlowColor}22,transparent)`,
                  transition:"background 0.4s ease",
                }}/>
                <div style={{
                  position:"absolute", top:"50%", left:"50%",
                  width:"52%", height:1,
                  transformOrigin:"left center",
                  transform:`rotate(${(scanAngle+180)%360}deg)`,
                  background:"linear-gradient(90deg,transparent,rgba(96,200,255,0.40),transparent)",
                  opacity:0.5,
                }}/>
              </div>

              {/* Orbital particles */}
              {PARTICLES.map(pt => (
                <div key={pt.id} style={{
                  position:"absolute",
                  width:pt.size, height:pt.size, borderRadius:"50%",
                  background:pt.color, boxShadow:`0 0 ${pt.size*2.5}px ${pt.color}`,
                  opacity: coreActive ? pt.opacity : 0,
                  transition:"opacity 1s ease",
                  pointerEvents:"none",
                  animation: coreActive ? `ob5p${pt.id} ${pt.speed}s linear ${pt.delay}s infinite` : "none",
                  willChange:"transform",
                }}/>
              ))}

              {/* ── THE EYE ── */}
              <div className="ob5-eye-container" style={{
                borderRadius:"50%", overflow:"hidden",
                position:"relative", flexShrink:0,
                boxShadow: coreActive
                  ? `0 0 ${eyeGlowAmt}px ${eyeGlowColor}88, 0 0 ${eyeGlowAmt*2}px ${eyeGlowColor}44, 0 0 ${eyeGlowAmt*3}px rgba(72,28,140,0.35), inset 0 0 30px rgba(212,175,55,0.10)`
                  : `0 0 30px rgba(212,175,55,0.20)`,
                transition:"box-shadow 0.5s ease",
                animation: eyeBlink ? "ob5blink-eye 0.2s ease-in-out" : "ob5breathe 4.5s ease-in-out infinite",
                zIndex:3,
              }}>
                {/* Iris color overlay */}
                <div style={{
                  position:"absolute", inset:0, zIndex:4, borderRadius:"50%",
                  background:`radial-gradient(ellipse 55% 55% at 50% 50%, ${eyeGlowColor}18 0%, transparent 70%)`,
                  transition:"background 0.7s ease",
                  mixBlendMode:"screen", pointerEvents:"none",
                }}/>
                {/* Glitch overlay */}
                {isGlitching && (
                  <div style={{
                    position:"absolute", inset:0, zIndex:5, borderRadius:"50%",
                    background:"rgba(96,200,255,0.12)",
                    transform:"translateX(3px)",
                    mixBlendMode:"screen", pointerEvents:"none",
                  }}/>
                )}
                {/* Scan line */}
                <div style={{
                  position:"absolute", inset:0, zIndex:4,
                  background:`linear-gradient(180deg,transparent 0%,rgba(96,200,255,0.05) 48%,rgba(96,200,255,0.12) 50%,rgba(96,200,255,0.05) 52%,transparent 100%)`,
                  animation:"ob5scan 3.2s ease-in-out infinite",
                  borderRadius:"50%", pointerEvents:"none",
                }}/>
                {/* Shimmer */}
                <div style={{
                  position:"absolute", inset:0, zIndex:3,
                  background:`radial-gradient(ellipse 60% 60% at 50% 50%,rgba(212,175,55,0.07) 0%,transparent 70%)`,
                  animation:"ob5shimmer 3.5s ease-in-out infinite",
                  borderRadius:"50%", pointerEvents:"none",
                }}/>

                {/* Loading shimmer overlay — shows while fetching */}
                {phase === "loading" && (
                  <div style={{
                    position:"absolute", inset:0, zIndex:6, borderRadius:"50%",
                    background:"linear-gradient(135deg,transparent 30%,rgba(212,175,55,0.12) 50%,transparent 70%)",
                    animation:"ob5loadSweep 1.8s ease-in-out infinite",
                    pointerEvents:"none",
                  }}/>
                )}

                {/* Main eye image */}
                <img
                  src="/assets/ai-eye-core.png"
                  alt="AI Consciousness Eye"
                  className="ob5-eye-img"
                  style={{
                    display:"block", objectFit:"cover",
                    filter: isGlitching
                      ? "brightness(1.4) saturate(1.8) hue-rotate(15deg)"
                      : coreActive
                        ? `brightness(${phase==="loading"?0.7:1.10}) saturate(${phase==="loading"?0.8:1.15}) contrast(1.05)`
                        : "brightness(0.55) saturate(0.7)",
                    transition: isGlitching ? "none" : "filter 1.2s ease",
                    animation:"ob5eyeRotate 35s linear infinite",
                    transform:`translate(${pupilX*0.3}px,${pupilY*0.3}px) rotate(0deg)`,
                  }}
                />

                {/* Iris pupil */}
                <div style={{
                  position:"absolute",
                  top:`calc(50% + ${pupilY}px)`,
                  left:`calc(50% + ${pupilX}px)`,
                  transform:"translate(-50%,-50%)",
                  zIndex:6, pointerEvents:"none",
                  transition:"top 0.08s ease-out, left 0.08s ease-out",
                }}>
                  <div style={{
                    width:56, height:56, borderRadius:"50%",
                    border:`2px solid ${eyeGlowColor}66`,
                    boxShadow:`0 0 18px ${eyeGlowColor}55`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"border-color 0.5s, box-shadow 0.5s",
                    animation:"ob5rotCCW 6s linear infinite",
                  }}>
                    <div style={{
                      width:22, height:22, borderRadius:"50%",
                      background:`radial-gradient(circle at 38% 38%, ${eyeGlowColor}ee 0%, #000 60%)`,
                      boxShadow:`0 0 12px ${eyeGlowColor}`,
                      transition:"background 0.5s",
                    }}/>
                  </div>
                </div>
              </div>

              {/* Energy spike rays */}
              {[0,45,90,135,180,225,270,315].map((angle,i) => (
                <div key={angle} className="ob5-ray" style={{
                  position:"absolute", top:"50%", left:"50%",
                  transformOrigin:"left center",
                  transform:`translate(0,-50%) rotate(${angle}deg)`,
                  opacity: coreActive ? (i%2===0?0.55:0.25) : 0,
                  transition:"opacity 1s ease",
                  animation: coreActive ? `ob5ray ${2.8+(i%3)*0.45}s ease-in-out ${i*0.15}s infinite` : "none",
                  pointerEvents:"none", zIndex:2,
                }}>
                  <div className="ob5-ray-line" style={{
                    height:1.5,
                    background:`linear-gradient(90deg,${i%2===0?eyeGlowColor:"#60c8ff"},transparent)`,
                    borderRadius:2, transition:"background 0.5s ease",
                  }}/>
                </div>
              ))}

              {/* Processing label */}
              <div className="ob5-core-label" style={{
                position:"absolute", bottom:-34, left:"50%", transform:"translateX(-50%)",
                whiteSpace:"nowrap", fontFamily:"Inter,sans-serif",
                fontSize:10, letterSpacing:"0.20em",
                color: phase === "done" ? GOLD : "rgba(255,255,255,0.38)",
                textTransform:"uppercase", transition:"color 0.6s ease",
                animation: phase === "done" ? "none" : "ob5blink 2s ease-in-out infinite",
              }}>
                {phase === "done" ? "✓ Analysis Complete" : phase === "loading" ? "● Connecting" : "● Processing"}
              </div>

              {/* Insight bubble */}
              <AnimatePresence>
                {(activeCategory || phase === "done") && (
                  <motion.div
                    key={activeCategory ?? "done"}
                    initial={{ opacity:0, y:8, scale:0.92 }}
                    animate={{ opacity:1, y:0, scale:1 }}
                    exit={{ opacity:0, y:-6, scale:0.94 }}
                    transition={{ duration:0.35 }}
                    style={{
                      position:"absolute", top:-46, left:"50%",
                      transform:"translateX(-50%)", whiteSpace:"nowrap",
                      fontFamily:"Inter,sans-serif", fontSize:11, letterSpacing:"0.08em",
                      color: activeCatMeta?.color ?? GOLD,
                      background:"rgba(0,0,0,0.72)",
                      border:`1px solid ${activeCatMeta?.color ?? GOLD}44`,
                      backdropFilter:"blur(8px)", borderRadius:8,
                      padding:"5px 12px", pointerEvents:"none", zIndex:20,
                    }}
                  >
                    {activeCatMeta?.icon ?? "✦"} {insightText}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ════════════════════════════ ANALYSIS PANEL ════════════════════════════ */}
            <motion.div
              className="ob5-panel"
              initial={{ opacity:0, x:22 }}
              animate={{ opacity:1, x:0 }}
              transition={{ duration:0.65, delay:0.35, ease:"easeOut" }}
            >

              {/* ── Loading skeleton if no AI result yet ── */}
              {phase === "loading" && (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {S5_CAT_KEYS.map((k, i) => (
                    <div key={k}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <div style={{ height:12, width:120+i*15, borderRadius:6, background:"rgba(255,255,255,0.08)", animation:"ob5shimmer2 1.8s ease-in-out infinite", animationDelay:`${i*0.2}s` }}/>
                        <div style={{ height:12, width:36, borderRadius:6, background:"rgba(255,255,255,0.06)", animation:"ob5shimmer2 1.8s ease-in-out infinite", animationDelay:`${i*0.3}s` }}/>
                      </div>
                      <div style={{ height:9, borderRadius:999, background:"rgba(255,255,255,0.055)", animation:"ob5shimmer2 1.8s ease-in-out infinite", animationDelay:`${i*0.15}s` }}/>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Progress bars (animating + done) ── */}
              {phase !== "loading" && aiResult && (
                <div style={{ display:"flex", flexDirection:"column", gap:"clamp(10px,1.4vh,15px)" }}>
                  {aiResult.categories.map((cat) => {
                    const meta     = S5_CATEGORY_META[cat.key] ?? { label:cat.label, color:GOLD, icon:"◈" };
                    const val      = displayProgress[cat.key] ?? 0;
                    const isActive = cat.key === activeCategory;
                    const isHover  = cat.key === hoveredCat;
                    return (
                      <div
                        key={cat.key}
                        onMouseEnter={() => setHoveredCat(cat.key)}
                        onMouseLeave={() => setHoveredCat(null)}
                        style={{
                          cursor:"default", transition:"transform 0.2s",
                          transform: isHover ? "translateX(4px)" : "translateX(0)",
                        }}
                      >
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <span style={{ fontSize:13, color: val>0 ? meta.color : "rgba(255,255,255,0.20)", transition:"color 0.4s", lineHeight:1 }}>{meta.icon}</span>
                            <span style={{
                              fontFamily:"Inter,sans-serif", fontSize:"clamp(11px,0.95vw,13px)",
                              fontWeight: isActive||isHover ? 600 : 500,
                              color: val>0 ? (isActive?"#fff":"rgba(255,255,255,0.78)") : "rgba(255,255,255,0.28)",
                              transition:"color 0.4s", letterSpacing:"0.02em",
                            }}>{meta.label}</span>
                            {isActive && (
                              <span style={{ fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", color:meta.color, fontFamily:"Inter,sans-serif", animation:"ob5blink 1s ease-in-out infinite" }}>● live</span>
                            )}
                          </div>
                          <span style={{
                            fontFamily:"Inter,sans-serif", fontSize:"clamp(11px,0.95vw,13px)", fontWeight:700,
                            color: val>0 ? meta.color : "rgba(255,255,255,0.16)",
                            transition:"color 0.4s", minWidth:36, textAlign:"right", letterSpacing:"0.04em",
                          }}>{val>0 ? `${val}%` : "—"}</span>
                        </div>
                        {/* Track */}
                        <div style={{
                          height: isActive ? 11 : 9, borderRadius:999,
                          background:"rgba(255,255,255,0.055)",
                          border:"1px solid rgba(255,255,255,0.07)",
                          overflow:"hidden", position:"relative",
                          transition:"height 0.2s",
                        }}>
                          {/* Fill */}
                          <div style={{
                            position:"absolute", inset:0, borderRadius:999,
                            width:`${val}%`,
                            background:`linear-gradient(90deg,${meta.color}bb 0%,${meta.color} 55%,${GOLD2} 100%)`,
                            boxShadow: val>8 ? `0 0 10px ${meta.color}88` : "none",
                            transition:"width 0.04s linear",
                          }}/>
                          {/* Active shimmer */}
                          {isActive && val>5 && val<100 && (
                            <div style={{
                              position:"absolute", top:0, bottom:0, width:60,
                              left:`calc(${val}% - 30px)`,
                              background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)",
                              borderRadius:999,
                              animation:"ob5shine 0.5s ease-out forwards",
                            }}/>
                          )}
                        </div>
                        {/* Insight snippet */}
                        <AnimatePresence>
                          {(isHover || isActive || phase==="done") && val > 0 && (
                            <motion.div
                              initial={{ opacity:0, height:0 }}
                              animate={{ opacity:1, height:"auto" }}
                              exit={{ opacity:0, height:0 }}
                              transition={{ duration:0.22 }}
                              style={{ overflow:"hidden", fontFamily:"Inter,sans-serif", fontSize:11, color:`${meta.color}cc`, letterSpacing:"0.03em", paddingTop:4 }}
                            >{cat.insight}</motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Profile summary card — reveals on done ── */}
              <AnimatePresence>
                {phase === "done" && aiResult && (
                  <motion.div
                    initial={{ opacity:0, y:12 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ duration:0.55, delay:0.2 }}
                    style={{
                      marginTop:"clamp(14px,2vh,18px)",
                      borderRadius:16,
                      border:`1.5px solid rgba(212,175,55,0.50)`,
                      background:"rgba(212,175,55,0.07)",
                      backdropFilter:"blur(12px)",
                      padding:"clamp(12px,1.8vh,16px) clamp(14px,2vw,18px)",
                      boxShadow:`0 0 24px rgba(212,175,55,0.18)`,
                    }}
                  >
                    {/* Suggested title */}
                    {aiResult.songTitle && (
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <span style={{ fontFamily:"Inter,sans-serif", fontSize:10, fontWeight:700, color:"rgba(212,175,55,0.55)", letterSpacing:"0.16em", textTransform:"uppercase" }}>Suggested Title</span>
                        <div style={{ flex:1, height:1, background:"rgba(212,175,55,0.20)" }}/>
                      </div>
                    )}
                    {aiResult.songTitle && (
                      <div style={{ fontFamily:"Playfair Display,serif", fontSize:"clamp(15px,1.4vw,18px)", fontWeight:700, color:GOLD, marginBottom:10, fontStyle:"italic" }}>
                        "{aiResult.songTitle}"
                      </div>
                    )}
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      <div style={{
                        width:28, height:28, flexShrink:0, borderRadius:8,
                        background:"rgba(212,175,55,0.12)",
                        border:`1px solid rgba(212,175,55,0.28)`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z" stroke={GOLD} strokeWidth="1.6"/>
                          <path d="M9 12l2 2 4-4" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div style={{ fontFamily:"Inter,sans-serif", fontSize:"clamp(11px,0.88vw,12px)", color:"rgba(255,255,255,0.55)", lineHeight:1.65 }}>
                        {aiResult.profileSummary}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Product Recommendations toggle ── */}
              <AnimatePresence>
                {recsVisible && aiResult && aiResult.recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ duration:0.5, delay:0.1 }}
                    style={{ marginTop:"clamp(12px,1.8vh,16px)" }}
                  >
                    {/* Toggle header */}
                    <button
                      onClick={() => setShowRecs(r => !r)}
                      style={{
                        width:"100%", background: showRecs ? "rgba(212,175,55,0.08)" : "rgba(212,175,55,0.04)", border:`1px solid rgba(212,175,55,${showRecs?"0.35":"0.18"})`, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"10px 14px", borderRadius:12,
                        outline:"none",
                        transition:"all 220ms ease",
                      }}
                    >
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{
                          width:22, height:22, borderRadius:7,
                          background:"rgba(212,175,55,0.14)",
                          border:"1px solid rgba(212,175,55,0.30)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:11,
                        }}>✦</div>
                        <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:700, color:GOLD, letterSpacing:"0.02em" }}>
                          AI-Matched Products for You
                        </span>
                        <span style={{
                          fontFamily:"Inter,sans-serif", fontSize:10, fontWeight:600,
                          color:"rgba(212,175,55,0.6)", letterSpacing:"0.10em",
                          background:"rgba(212,175,55,0.12)", borderRadius:999, padding:"2px 8px",
                        }}>
                          {aiResult.recommendations.length} MATCHED
                        </span>
                      </div>
                      <span style={{ color:"rgba(212,175,55,0.7)", fontSize:13, transform: showRecs ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 220ms" }}>▾</span>
                    </button>

                    {/* Rec cards */}
                    <AnimatePresence>
                      {showRecs && (
                        <motion.div
                          initial={{ opacity:0, height:0 }}
                          animate={{ opacity:1, height:"auto" }}
                          exit={{ opacity:0, height:0 }}
                          transition={{ duration:0.35, ease:"easeInOut" }}
                          style={{ overflow:"hidden" }}
                        >
                          <div style={{ display:"flex", flexDirection:"column", gap:8, paddingTop:8 }}>
                            {aiResult.recommendations.map((rec, idx) => (
                              <S5RecCard
                                key={rec.id}
                                rec={rec}
                                productMeta={S5_PRODUCT_META[rec.id]}
                                index={idx}
                                visible={showRecs}
                              />
                            ))}
                          </div>
                          <p style={{
                            fontFamily:"Inter,sans-serif", fontSize:10,
                            color:"rgba(255,255,255,0.25)", textAlign:"center",
                            margin:"10px 0 0", lineHeight:1.5,
                          }}>
                            These recommendations update with every story you share.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Skip button ── */}
              {phase !== "done" && (
                <div style={{ textAlign:"center", marginTop:12 }}>
                  <button
                    onClick={handleSkip}
                    disabled={!skipEnabled}
                    onMouseEnter={() => setSkipHover(true)}
                    onMouseLeave={() => setSkipHover(false)}
                    aria-label="Skip analysis"
                    style={{
                      background: skipEnabled ? (skipHover ? "rgba(212,175,55,0.12)" : "rgba(212,175,55,0.06)") : "transparent",
                      border: skipEnabled ? `1px solid rgba(212,175,55,${skipHover?"0.55":"0.28"})` : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      fontFamily:"Inter,sans-serif", fontSize:12, letterSpacing:"0.06em",
                      color: skipEnabled
                        ? skipHover ? GOLD : "rgba(212,175,55,0.70)"
                        : "rgba(255,255,255,0.20)",
                      cursor: skipEnabled ? "pointer" : "not-allowed",
                      textDecoration:"none",
                      transition:"all 180ms ease",
                      padding:"7px 18px",
                      display:"inline-flex", alignItems:"center", gap:6,
                    }}
                  >
                    {skipEnabled ? "Skip analysis →" : `Skip available at 50% (${overallProgress}%)`}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── ANALYSIS REPORT CARD ── */}
      {phase === "done" && aiResult && (
        <div style={{
          width:"100%", maxWidth:900, margin:"0 auto",
          padding:"0 clamp(16px,3vw,48px) 24px",
          boxSizing:"border-box",
        }}>
          <motion.div
            initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, delay:0.2, ease:"easeOut" }}
          >
            {/* ── Profile Summary ── */}
            <div style={{
              borderRadius:20, overflow:"hidden",
              border:"1.5px solid rgba(212,175,55,0.28)",
              background:"linear-gradient(135deg,rgba(11,23,54,0.88) 0%,rgba(5,11,26,0.96) 100%)",
              backdropFilter:"blur(16px)",
              marginBottom:16,
            }}>
              <div style={{
                padding:"clamp(16px,2.5vh,22px) clamp(16px,2.5vw,28px)",
                borderBottom:"1px solid rgba(212,175,55,0.12)",
                display:"flex", alignItems:"flex-start", gap:14,
              }}>
                <div style={{
                  width:44, height:44, borderRadius:12, flexShrink:0,
                  background:"linear-gradient(135deg,rgba(212,175,55,0.22),rgba(212,175,55,0.06))",
                  border:"1px solid rgba(212,175,55,0.35)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20,
                }}>✦</div>
                <div style={{ flex:1 }}>
                  <p style={{
                    fontFamily:"'Playfair Display',serif",
                    fontSize:"clamp(13px,1.8vw,16px)", fontWeight:600,
                    color:"rgba(255,255,255,0.92)", margin:0,
                    lineHeight:1.65, fontStyle:"italic",
                  }}>
                    "{aiResult.profileSummary}"
                  </p>
                </div>
              </div>

              {/* Emotional fingerprint chips */}
              {aiResult.emotionalFingerprint && aiResult.emotionalFingerprint.length > 0 && (
                <div style={{
                  padding:"clamp(10px,1.5vh,14px) clamp(16px,2.5vw,28px)",
                  display:"flex", flexWrap:"wrap", gap:8, alignItems:"center",
                }}>
                  <span style={{
                    fontFamily:"Inter,sans-serif", fontSize:10, fontWeight:700,
                    color:"rgba(212,175,55,0.55)", letterSpacing:"0.12em", textTransform:"uppercase",
                    marginRight:4,
                  }}>Your Fingerprint</span>
                  {aiResult.emotionalFingerprint.map((adj, i) => (
                    <span key={i} style={{
                      fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600,
                      color:GOLD, letterSpacing:"0.06em",
                      background:"rgba(212,175,55,0.10)",
                      border:"1px solid rgba(212,175,55,0.32)",
                      borderRadius:999, padding:"3px 12px",
                    }}>{adj}</span>
                  ))}
                  {aiResult.dominantEmotion && (
                    <span style={{
                      fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600,
                      color:"rgba(96,200,255,0.85)", letterSpacing:"0.06em",
                      background:"rgba(96,200,255,0.08)",
                      border:"1px solid rgba(96,200,255,0.22)",
                      borderRadius:999, padding:"3px 12px",
                      marginLeft:4,
                    }}>{aiResult.dominantEmotion}</span>
                  )}
                </div>
              )}
            </div>

            {/* ── Per-bar score breakdown ── */}
            <div style={{
              borderRadius:20, overflow:"hidden",
              border:"1.5px solid rgba(212,175,55,0.18)",
              background:"linear-gradient(135deg,rgba(11,23,54,0.82) 0%,rgba(5,11,26,0.94) 100%)",
              backdropFilter:"blur(14px)",
              marginBottom:16,
            }}>
              {/* Header */}
              <div style={{
                padding:"clamp(12px,1.8vh,18px) clamp(16px,2.5vw,28px)",
                borderBottom:"1px solid rgba(212,175,55,0.10)",
                display:"flex", alignItems:"center", gap:10,
              }}>
                <span style={{ fontSize:16 }}>📊</span>
                <p style={{
                  fontFamily:"'Playfair Display',serif", fontSize:"clamp(13px,1.6vw,16px)",
                  fontWeight:700, color:GOLD, margin:0, letterSpacing:"0.02em",
                }}>Emotional Dimension Breakdown</p>
              </div>

              {/* Score rows */}
              <div style={{ padding:"clamp(12px,1.8vh,18px) clamp(16px,2.5vw,28px)", display:"flex", flexDirection:"column", gap:16 }}>
                {aiResult.categories.map((cat) => {
                  const meta = S5_CATEGORY_META[cat.key] ?? { color:"#D4AF37", icon:"●" };
                  return (
                    <div key={cat.key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {/* Label + score row */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:14, color:meta.color }}>{meta.icon}</span>
                          <span style={{
                            fontFamily:"Inter,sans-serif", fontSize:12, fontWeight:700,
                            color:"rgba(255,255,255,0.80)", letterSpacing:"0.05em",
                          }}>{cat.label}</span>
                        </div>
                        <span style={{
                          fontFamily:"'SF Mono',monospace", fontSize:13, fontWeight:700,
                          color:meta.color,
                        }}>{cat.score}</span>
                      </div>
                      {/* Insight line */}
                      <p style={{
                        fontFamily:"Inter,sans-serif", fontSize:11,
                        color:"rgba(255,255,255,0.50)", margin:"0 0 4px",
                        fontStyle:"italic", paddingLeft:22,
                      }}>{cat.insight}</p>
                      {/* Score bar */}
                      <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.06)", overflow:"hidden", marginLeft:22 }}>
                        <motion.div
                          initial={{ width:0 }}
                          animate={{ width:`${cat.score}%` }}
                          transition={{ duration:0.9, delay:0.1, ease:"easeOut" }}
                          style={{
                            height:"100%", borderRadius:2,
                            background:`linear-gradient(90deg,${meta.color},${meta.color}aa)`,
                          }}
                        />
                      </div>
                      {/* Reason text */}
                      {cat.reason && (
                        <p style={{
                          fontFamily:"Inter,sans-serif", fontSize:11,
                          color:"rgba(255,255,255,0.38)", margin:"2px 0 0",
                          lineHeight:1.55, paddingLeft:22,
                        }}>{cat.reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Song title + Emotional arc ── */}
            <div style={{
              borderRadius:20, overflow:"hidden",
              border:"1.5px solid rgba(212,175,55,0.22)",
              background:"linear-gradient(135deg,rgba(11,23,54,0.80) 0%,rgba(5,11,26,0.92) 100%)",
              backdropFilter:"blur(14px)",
              padding:"clamp(16px,2.5vh,22px) clamp(16px,2.5vw,28px)",
              marginBottom:16,
            }}>
              {/* Song title */}
              <div style={{ marginBottom:16 }}>
                <p style={{
                  fontFamily:"Inter,sans-serif", fontSize:9, fontWeight:700,
                  color:"rgba(212,175,55,0.55)", letterSpacing:"0.14em",
                  textTransform:"uppercase", margin:"0 0 6px",
                }}>Suggested Song Title</p>
                <p style={{
                  fontFamily:"'Playfair Display',serif",
                  fontSize:"clamp(18px,2.5vw,26px)", fontWeight:700,
                  color:WHITE, margin:0, lineHeight:1.25,
                  textShadow:"0 0 24px rgba(212,175,55,0.20)",
                }}>"{aiResult.songTitle}"</p>
              </div>
              {/* Emotional arc */}
              {aiResult.emotionalArc && (
                <div style={{
                  borderTop:"1px solid rgba(212,175,55,0.10)",
                  paddingTop:14,
                }}>
                  <p style={{
                    fontFamily:"Inter,sans-serif", fontSize:9, fontWeight:700,
                    color:"rgba(212,175,55,0.50)", letterSpacing:"0.14em",
                    textTransform:"uppercase", margin:"0 0 6px",
                  }}>Your Emotional Arc</p>
                  <p style={{
                    fontFamily:"Inter,sans-serif", fontSize:"clamp(12px,1.6vw,14px)",
                    color:"rgba(255,255,255,0.65)", margin:0, lineHeight:1.6,
                    fontStyle:"italic",
                  }}>{aiResult.emotionalArc}</p>
                </div>
              )}
            </div>

            {/* ── Bridge paragraph ── */}
            <div style={{
              borderRadius:16, padding:"clamp(12px,1.8vh,16px) clamp(16px,2.5vw,24px)",
              background:"rgba(212,175,55,0.05)",
              border:"1px solid rgba(212,175,55,0.14)",
              marginBottom:8,
            }}>
              <p style={{
                fontFamily:"Inter,sans-serif", fontSize:"clamp(11px,1.4vw,13px)",
                color:"rgba(255,255,255,0.55)", margin:0, lineHeight:1.65,
              }}>
                On the next step, you'll hear a preview of the song we're building for you — crafted from this exact emotional profile.
                Every note, lyric, and visual will be shaped by what your story revealed here.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── REASSURANCE + TRUST ── */}
      <S5ReassuranceTicker phase={phase} />

      {/* ── NAVIGATION ── */}
      <div className="ob5-nav" style={{
        position:"relative", zIndex:10,
        width:"100%", flexShrink:0,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"clamp(12px,1.8vh,22px) clamp(20px,4vw,80px)",
        paddingBottom:"clamp(22px,3.5vh,42px)",
        maxWidth:1400, margin:"0 auto", boxSizing:"border-box",
        alignSelf:"stretch",
      }}>
        <button
          onClick={onBack}
          onMouseEnter={() => setBackHover(true)}
          onMouseLeave={() => setBackHover(false)}
          style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"0 32px", height:52, borderRadius:10,
            border:`1.5px solid ${backHover?"rgba(212,175,55,0.55)":"rgba(212,175,55,0.25)"}`,
            background: backHover ? "rgba(212,175,55,0.08)" : "transparent",
            color: backHover ? GOLD : "rgba(255,255,255,0.55)",
            fontSize:14, fontWeight:500, fontFamily:"Inter,sans-serif",
            cursor:"pointer", transition:"all 200ms",
            letterSpacing:"0.04em", minWidth:120,
          }}
        >← Back</button>

        <button
          onClick={() => onNext(aiResult!)}
          onMouseEnter={() => setNextHover(true)}
          onMouseLeave={() => setNextHover(false)}
          disabled={phase !== "done"}
          style={{
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            padding:"0 36px", height:52, borderRadius:10, border:"none",
            background: phase === "done"
              ? nextHover
                ? `linear-gradient(135deg,${GOLD2} 0%,${GOLD} 100%)`
                : `linear-gradient(135deg,${GOLD} 0%,${GOLD2} 100%)`
              : "rgba(255,255,255,0.07)",
            color: phase === "done" ? "#0a0618" : "rgba(255,255,255,0.22)",
            fontSize:14, fontWeight:700, fontFamily:"Inter,sans-serif",
            cursor: phase === "done" ? "pointer" : "not-allowed",
            transition:"all 200ms", letterSpacing:"0.06em", minWidth:140,
            boxShadow: phase === "done"
              ? nextHover ? `0 0 30px rgba(212,175,55,0.60),0 4px 22px rgba(212,175,55,0.32)` : `0 0 18px rgba(212,175,55,0.38)`
              : "none",
          }}
        >Continue →</button>
      </div>

      {/* ── KEYFRAMES + RESPONSIVE ── */}
      <style>{`
        .ob5-root * { box-sizing:border-box; }
        .ob5-scroll::-webkit-scrollbar { width:3px; }
        .ob5-scroll::-webkit-scrollbar-thumb { background:rgba(212,175,55,0.18);border-radius:4px; }

        .ob5-eye-container { width:350px;height:350px; }
        .ob5-eye-img       { width:350px;height:350px; }
        .ob5-data-ring     { width:420px;height:420px; }
        .ob5-inner-ring    { width:382px;height:382px; }
        .ob5-aura-1        { width:470px;height:470px; }
        .ob5-aura-2        { width:520px;height:520px; }
        .ob5-aura-3        { width:578px;height:578px; }
        .ob5-core-wrap     { width:590px;height:590px; }
        .ob5-ray           { width:115px; }
        .ob5-ray-line      { width:115px; }
        .ob5-panel         { width:440px;max-width:440px; }

        .ob5-layout {
          flex-direction:row !important;
          flex-wrap:nowrap !important;
          align-items:flex-start !important;
        }

        @keyframes ob5rotCW  { to { transform:rotate(360deg); } }
        @keyframes ob5rotCCW { to { transform:rotate(-360deg); } }
        @keyframes ob5breathe {
          0%,100% { transform:scale(1); }
          50%     { transform:scale(1.022); }
        }
        @keyframes ob5blink-eye {
          0%   { transform:scaleY(1); }
          40%  { transform:scaleY(0.05); }
          60%  { transform:scaleY(0.05); }
          100% { transform:scaleY(1); }
        }
        @keyframes ob5shimmer {
          0%,100% { opacity:0.45; }
          50%     { opacity:1; }
        }
        @keyframes ob5shimmer2 {
          0%,100% { opacity:0.4; }
          50%     { opacity:0.8; }
        }
        @keyframes ob5scan {
          0%   { transform:translateY(-115%);opacity:0; }
          8%   { opacity:1; }
          92%  { opacity:1; }
          100% { transform:translateY(115%);opacity:0; }
        }
        @keyframes ob5eyeRotate {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes ob5aura1 {
          0%,100% { opacity:0.65;transform:scale(1); }
          50%     { opacity:0.14;transform:scale(1.07); }
        }
        @keyframes ob5aura2 {
          0%,100% { opacity:0.38;transform:scale(1); }
          50%     { opacity:0.07;transform:scale(1.10); }
        }
        @keyframes ob5aura3 {
          0%,100% { opacity:0.20;transform:scale(1); }
          50%     { opacity:0.04;transform:scale(1.14); }
        }
        @keyframes ob5blink  { 0%,100%{opacity:1} 50%{opacity:0.20} }
        @keyframes ob5shine  { from{opacity:1} to{opacity:0} }
        @keyframes s5shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @keyframes ob5loadSweep {
          0%   { transform:translateX(-100%) rotate(135deg); }
          100% { transform:translateX(200%) rotate(135deg); }
        }
        @keyframes ob5ray {
          0%,100% { opacity:var(--ob5ro,0.55);scaleX:1; }
          50%     { opacity:0.10; }
        }

        ${Array.from({length:22},(_,i)=>{
          const orbits=[95,118,140,162,185];
          const r=orbits[i%orbits.length] ?? 120;
          const cw=i%2===0;
          return `@keyframes ob5p${i} {
            0%   { transform:translate(${cw?r:0}px,${cw?0:-r}px) scale(1); }
            25%  { transform:translate(${cw?0:-r}px,${cw?r:0}px) scale(0.82); }
            50%  { transform:translate(${cw?-r:0}px,${cw?0:r}px) scale(1); }
            75%  { transform:translate(${cw?0:r}px,${cw?-r:0}px) scale(1.18); }
            100% { transform:translate(${cw?r:0}px,${cw?0:-r}px) scale(1); }
          }`;
        }).join("\n")}

        @media(min-width:601px) and (max-width:1100px){
          .ob5-eye-container { width:285px !important;height:285px !important; }
          .ob5-eye-img       { width:285px !important;height:285px !important; }
          .ob5-data-ring     { width:345px !important;height:345px !important; }
          .ob5-inner-ring    { width:316px !important;height:316px !important; }
          .ob5-aura-1        { width:385px !important;height:385px !important; }
          .ob5-aura-2        { width:425px !important;height:425px !important; }
          .ob5-aura-3        { width:472px !important;height:472px !important; }
          .ob5-core-wrap     { width:482px !important;height:482px !important; }
          .ob5-ray           { width:96px !important; }
          .ob5-ray-line      { width:96px !important; }
          .ob5-panel         { width:330px !important;max-width:330px !important; }
          .ob5-header        { padding-top:22px !important; }
          .ob5-nav           { padding:14px 48px 60px !important; }
        }

        @media(max-width:600px){
          .ob5-root   { height:100% !important;min-height:unset !important; }
          .ob5-scroll { overflow-y:auto !important; }
          .ob5-layout {
            flex-direction:column !important;
            flex-wrap:wrap !important;
            gap:18px !important;
          }
          .ob5-eye-container { width:220px !important;height:220px !important; }
          .ob5-eye-img       { width:220px !important;height:220px !important; }
          .ob5-data-ring     { width:266px !important;height:266px !important; }
          .ob5-inner-ring    { width:244px !important;height:244px !important; }
          .ob5-aura-1        { width:296px !important;height:296px !important; }
          .ob5-aura-2        { width:326px !important;height:326px !important; }
          .ob5-aura-3        { width:360px !important;height:360px !important; }
          .ob5-core-wrap     { width:365px !important;height:365px !important; }
          .ob5-ray           { width:72px !important; }
          .ob5-ray-line      { width:72px !important; }
          .ob5-panel         { width:100% !important;max-width:100% !important; }
          .ob5-title         { font-size:clamp(22px,7.5vw,32px) !important; }
          .ob5-header        { padding-top:12px !important;overflow-x:auto !important; }
          .ob5-nav           { padding:12px 20px 100px !important; }
          .ob5-inner         { padding-top:12px !important; }
        }

        @media(prefers-reduced-motion:reduce){
          .ob5-eye-container,.ob5-eye-img,.ob5-data-ring,.ob5-inner-ring,
          .ob5-aura-1,.ob5-aura-2,.ob5-aura-3 { animation:none !important; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 6 — PREVIEW YOUR CREATION  (final fidelity pass)
// ─────────────────────────────────────────────────────────────────────────────
interface Step6Props {
  whoFor: string | null;
  experienceType: string | null;
  storyText: string;
  analysisData?: { dominantEmotion: string; songTitle: string; emotionalArc?: string; emotionalFingerprint?: string[] };
  onNext: () => void;
  onBack: () => void;
}

// Cinematic gradient fallbacks per emotion slot (shown while loading or on FAL failure)
const MOOD_GRADIENT_FALLBACKS = [
  "linear-gradient(135deg,#1a0a2e 0%,#2d1b4e 40%,#4a2070 70%,#D4AF37 100%)",
  "linear-gradient(135deg,#0a1628 0%,#1a3a5c 40%,#2a6090 70%,#D4AF37 100%)",
  "linear-gradient(135deg,#1a0808 0%,#3d1a1a 40%,#6b2a2a 70%,#D4AF37 100%)",
  "linear-gradient(135deg,#0a1a0a 0%,#1a3d2a 40%,#2a6b4a 70%,#D4AF37 100%)",
];

const INCLUDED_ITEMS = [
  "Lyrics & Music",
  "Cinematic Video",
  "Unlimited Revisions",
  "High Quality Delivery",
];

function deriveEmotion(whoFor: string | null, xp: string | null): string {
  if (xp?.toLowerCase().includes("legacy"))    return "Gratitude & Legacy";
  if (xp?.toLowerCase().includes("companion")) return "Longing & Connection";
  if (whoFor === "relationship") return "Love & Devotion";
  if (whoFor === "child")        return "Joy & Wonder";
  if (whoFor === "family")       return "Warmth & Belonging";
  return "Love & Gratitude";
}

function deriveSongTitle(whoFor: string | null, xp: string | null): string {
  if (whoFor === "child")        return "Little Light of Mine";
  if (whoFor === "relationship") return "Across Every Lifetime";
  if (whoFor === "family")       return "Where We All Belong";
  if (xp?.toLowerCase().includes("legacy")) return "A Life Well Lived";
  return "Forever In My Heart";
}

const WAVEFORM = Array.from({ length: 52 }, (_, i) =>
  26 + Math.abs(Math.sin(i * 1.65 + 0.4) * 56 + Math.cos(i * 3.0) * 24)
);

const OB6_STYLES = `
  /* ─── MOBILE ≤ 768px ─────────────────────────────── */
  @media(max-width:768px){
    .ob6-page-wrap   { overflow-y: auto !important; }
    .ob6-crumb-wrap  { padding: 18px 16px 0 !important; }
    .ob6-header      { padding: 16px 16px 12px !important; }
    .ob6-h1          { font-size: 24px !important; line-height: 1.25 !important; margin-bottom: 6px !important; }
    .ob6-subtitle    { font-size: 13px !important; }
    .ob6-main-wrap   { padding: 0 12px 80px !important; }
    .ob6-card        {
      max-width: 100% !important;
      min-height: unset !important;
      padding: 22px 16px 28px !important;
      border-radius: 18px !important;
      gap: 22px !important;
    }
    .ob6-song-title  { font-size: 24px !important; margin-bottom: 8px !important; }
    .ob6-player-box  { padding: 14px 14px !important; }
    .ob6-play-btn    { width: 44px !important; height: 44px !important; font-size: 16px !important; }
    .ob6-waveform    { height: 44px !important; }
    .ob6-detail-row  { flex-direction: column !important; gap: 8px !important; }
    .ob6-detail-card { padding: 11px 13px !important; }
    .ob6-mood-section{ margin-bottom: 8px !important; }
    .ob6-mood-grid   {
      display: flex !important;
      overflow-x: auto !important;
      scroll-snap-type: x mandatory !important;
      gap: 8px !important;
      padding-bottom: 4px !important;
      padding-right: 40px !important;
      -webkit-overflow-scrolling: touch !important;
      grid-template-columns: unset !important;
    }
    .ob6-mood-thumb  {
      min-width: 152px !important; width: 152px !important;
      height: 100px !important;
      scroll-snap-align: start !important;
      flex-shrink: 0 !important;
    }
    .ob6-checklist   { gap: 16px !important; margin-bottom: 8px !important; }
    .ob6-check-icon  { width: 24px !important; height: 24px !important; font-size: 12px !important; }
    .ob6-check-label { font-size: 13px !important; }
    .ob6-cta-wrap    { padding-top: 4px !important; }
    .ob6-cta-btn     { height: 54px !important; font-size: 14px !important; border-radius: 13px !important; }
    .ob6-back-btn    { height: 54px !important; padding: 0 18px !important; font-size: 13px !important; border-radius: 13px !important; }
    .ob6-crumb-sep   { max-width: 12px !important; }
    .ob6-crumb-node  { width: 22px !important; height: 22px !important; }
    .ob6-crumb-node-active { width: 26px !important; height: 26px !important; }
  }

  /* ─── TABLET 769–1199px ──────────────────────────── */
  @media(min-width:769px) and (max-width:1199px){
    .ob6-crumb-wrap  { padding: 22px 40px 0 !important; }
    .ob6-header      { padding: 22px 40px 18px !important; }
    .ob6-h1          { font-size: 30px !important; }
    .ob6-main-wrap   { padding: 0 40px 64px !important; }
    .ob6-card        { max-width: 700px !important; min-height: 720px !important; padding: 36px 32px !important; gap: 26px !important; }
    .ob6-song-title  { font-size: 26px !important; }
    .ob6-detail-row  { flex-direction: column !important; gap: 10px !important; }
    .ob6-mood-grid   { grid-template-columns: repeat(4,1fr) !important; }
    .ob6-mood-thumb  { height: 100px !important; }
  }

  /* ─── DESKTOP ≥ 1200px ───────────────────────────── */
  @media(min-width:1200px){
    .ob6-card        { max-width: 780px !important; min-height: 780px !important; }
    .ob6-song-title  { font-size: 28px !important; }
    .ob6-mood-thumb  { height: 108px !important; }
    .ob6-player-box  { padding: 20px 22px !important; }
    .ob6-waveform    { height: 64px !important; }
  }

  /* ─── Shared interactive ─────────────────────────── */
  .ob6-mood-thumb:focus-visible  { outline: 2px solid #D4AF37 !important; outline-offset: 3px !important; }
  .ob6-play-btn:focus-visible    { outline: 2px solid #D4AF37 !important; outline-offset: 4px !important; }
  .ob6-cta-btn:hover:not(:disabled) {
    transform: scale(1.025) !important;
    box-shadow: 0 8px 36px rgba(212,175,55,0.60) !important;
  }
  .ob6-back-btn:hover {
    background: rgba(255,255,255,0.07) !important;
    border-color: rgba(255,255,255,0.32) !important;
    color: #ffffff !important;
  }

  /* ─── Keyframes ──────────────────────────────────── */
  @keyframes ob6CardFloat {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-5px); }
  }
  @keyframes ob6Pulse {
    0%,100% { box-shadow: 0 0 16px rgba(212,175,55,0.50), 0 0 0 0 rgba(212,175,55,0.0); }
    50%      { box-shadow: 0 0 36px rgba(212,175,55,0.85), 0 0 0 9px rgba(212,175,55,0.08); }
  }
  @keyframes ob6Spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes ob6WaveBar {
    0%,100% { transform: scaleY(1); }
    50%      { transform: scaleY(1.65); }
  }
  @keyframes ob6Shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
`;

function Step6PreviewCreation({ whoFor, experienceType, storyText: _st, analysisData, onNext, onBack }: Step6Props) {
  const emotion    = analysisData?.dominantEmotion ?? deriveEmotion(whoFor, experienceType);
  const songTitle  = analysisData?.songTitle       ?? deriveSongTitle(whoFor, experienceType);
  const videoStyle = experienceType
    ? experienceType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : "Cinematic / Inspirational";

  // Derive 4 emotion slots from emotionalFingerprint
  const BASE_MOODS = ["Longing", "Resilience", "Hope", "Peace"];
  const fp = analysisData?.emotionalFingerprint ?? [];
  const emotionSlots: string[] = [
    fp[0] ?? BASE_MOODS[0],
    fp[1] ?? BASE_MOODS[1],
    fp[2] ?? BASE_MOODS[2],
    fp[3] ?? BASE_MOODS[3],
  ];

  /* ── Real audio playback (song gen on mount) ── */
  interface S6SongData {
    title?: string; genre?: string; subgenre?: string; bpm?: number; key?: string;
    mood?: string[]; instruments?: string[]; vocalStyle?: string;
    lyrics?: { verse1: string; chorus: string; verse2: string; bridge: string; outroChorus: string };
    audioUrl?: string | null; audioReady?: boolean;
  }
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing,   setPlaying]   = useState(false);
  const [progress,  setProgress]  = useState(0);       // 0-1
  const [elapsed,   setElapsed]   = useState(0);       // seconds
  const [duration,  setDuration]  = useState(0);       // seconds
  const [songPhase, setSongPhase] = useState<"idle"|"loading"|"ready"|"error">("idle");
  const [songData,  setSongData]  = useState<S6SongData | null>(null);

  /* ── AI Mood Images (generate-mood-images on mount) ── */
  interface MoodImage { emotion: string; url: string | null; }
  const [moodImages,  setMoodImages]  = useState<MoodImage[]>([]);
  const [moodPhase,   setMoodPhase]   = useState<"idle"|"loading"|"done">("idle");

  // Fire BOTH on mount in parallel — song gen + mood images
  React.useEffect(() => {
    // ── Song generation ──
    if (songPhase === "idle") {
      setSongPhase("loading");
      fetch("/api/onboarding/generate-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyText: _st ?? "",
          whoFor: whoFor ?? "",
          experienceType: experienceType ?? "",
          dominantEmotion: analysisData?.dominantEmotion ?? "",
          emotionalArc: analysisData?.emotionalArc ?? "",
          suggestedTitle: analysisData?.songTitle ?? "",
        }),
      })
        .then(r => r.json())
        .then((data: any) => {
          if (data.success) { setSongData(data); setSongPhase("ready"); }
          else { setSongPhase("error"); }
        })
        .catch(() => setSongPhase("error"));
    }

    // ── Mood image generation ──
    if (moodPhase === "idle") {
      setMoodPhase("loading");
      fetch("/api/onboarding/generate-mood-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emotions: emotionSlots,
          dominantEmotion: analysisData?.dominantEmotion ?? "",
          storyText: _st ?? "",
          whoFor: whoFor ?? "",
        }),
      })
        .then(r => r.json())
        .then((data: any) => {
          if (data.success && Array.isArray(data.images)) {
            setMoodImages(data.images);
          } else {
            // Fallback: use emotion labels with no URLs (gradient fallback rendered in UI)
            setMoodImages(emotionSlots.map(e => ({ emotion: e, url: null })));
          }
          setMoodPhase("done");
        })
        .catch(() => {
          setMoodImages(emotionSlots.map(e => ({ emotion: e, url: null })));
          setMoodPhase("done");
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => {}); setPlaying(true); }
  };
  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.pause();
    setPlaying(false); setProgress(0); setElapsed(0);
  };
  const seekTo = (r: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = r * audio.duration;
    setProgress(r); setElapsed(r * audio.duration);
  };
  const DEMO_DUR = duration > 0 ? duration : 28;
  const fmt = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`;

  /* ── Mood gallery ── */
  const [selMood, setSelMood] = useState(0);
  const [hovMood, setHovMood] = useState<number|null>(null);

  /* ── Nav state ── */
  const [backHov,  setBackHov]  = useState(false);
  const [nextHov,  setNextHov]  = useState(false);
  const [nextLoad, setNextLoad] = useState(false);
  const handleNext = () => {
    if (nextLoad) return;
    setNextLoad(true);
    setTimeout(() => { setNextLoad(false); onNext(); }, 480);
  };

  const CRUMBS = ["01","02","03","04","05","06","07","08","09"];

  return (
    <div className="ob6-page-wrap" style={{
      position:"relative", width:"100%", minHeight:"100%",
      background:"linear-gradient(160deg,#060410 0%,#090818 30%,#0d0b22 60%,#060410 100%)",
      display:"flex", flexDirection:"column", alignItems:"center",
      overflowX:"hidden", overflowY:"auto",
    }}>
      <style>{OB6_STYLES}</style>
      <Stars />

      {/* Ambient glow blobs */}
      <div style={{ position:"absolute", inset:0, zIndex:1, pointerEvents:"none" }}>
        <div style={{ position:"absolute", top:"3%", left:"50%", transform:"translateX(-50%)", width:900, height:350, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(212,175,55,0.09) 0%,transparent 70%)", filter:"blur(60px)" }}/>
        <div style={{ position:"absolute", bottom:"8%", right:"5%", width:420, height:220, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(212,175,55,0.05) 0%,transparent 70%)", filter:"blur(40px)" }}/>
        <div style={{ position:"absolute", top:"40%", left:"5%", width:300, height:180, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(100,80,200,0.06) 0%,transparent 70%)", filter:"blur(40px)" }}/>
      </div>

      {/* Gold top bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, zIndex:12, pointerEvents:"none", background:`linear-gradient(90deg,transparent 0%,${GOLD} 28%,${GOLD2} 50%,${GOLD} 72%,transparent 100%)`, opacity:0.85 }}/>

      {/* ── Step progress breadcrumb ── */}
      <div className="ob6-crumb-wrap" style={{
        position:"relative", zIndex:10, width:"100%", maxWidth:1100,
        padding:"28px 80px 0",
        display:"flex", alignItems:"center", gap:0,
      }}>
        {CRUMBS.map((n, i) => {
          const sn     = i + 1;
          const done   = sn < 6;
          const active = sn === 6;
          return (
            <React.Fragment key={n}>
              <div
                className={active ? "ob6-crumb-node-active" : "ob6-crumb-node"}
                style={{
                  width: active ? 32 : 26, height: active ? 32 : 26, flexShrink:0,
                  borderRadius:"50%",
                  background: done || active
                    ? `linear-gradient(135deg,${GOLD},${GOLD2})`
                    : "rgba(255,255,255,0.06)",
                  border: sn > 6 ? "1px solid rgba(255,255,255,0.12)" : "none",
                  boxShadow: active ? `0 0 18px rgba(212,175,55,0.65)` : "none",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all .3s",
                }}
              >
                <span style={{
                  fontFamily:"Inter,sans-serif",
                  fontSize: done ? 11 : active ? 12 : 10,
                  fontWeight:800,
                  color: done || active ? "#000" : "rgba(255,255,255,0.22)",
                  lineHeight:1,
                }}>{done ? "✓" : n}</span>
              </div>
              {i < 8 && (
                <div className="ob6-crumb-sep" style={{
                  flex:1, height:1.5, maxWidth:44, margin:"0 3px",
                  background: done
                    ? `linear-gradient(90deg,rgba(212,175,55,0.85),rgba(212,175,55,0.25))`
                    : active
                      ? `linear-gradient(90deg,rgba(212,175,55,0.55),rgba(255,255,255,0.06))`
                      : "rgba(255,255,255,0.07)",
                }}/>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Header ── */}
      <motion.div
        className="ob6-header"
        initial={{ opacity:0, y:22 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45, ease:"easeOut" }}
        style={{ position:"relative", zIndex:10, textAlign:"center", padding:"28px 80px 18px", maxWidth:1100, width:"100%" }}
      >
        <div style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:700, letterSpacing:3.5, color:GOLD, textTransform:"uppercase", marginBottom:12, opacity:0.9 }}>Step 06</div>
        <h1 className="ob6-h1" style={{
          fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700,
          color:WHITE, margin:"0 0 12px", lineHeight:1.2,
          textShadow:"0 0 52px rgba(212,175,55,0.30)",
        }}>Preview Your Creation</h1>
        <p className="ob6-subtitle" style={{
          fontFamily:"Inter,sans-serif", fontSize:17,
          color:"rgba(255,255,255,0.52)", margin:0, lineHeight:1.55,
        }}>Review your personalized creation before production begins.</p>
      </motion.div>

      {/* ── Main card ── */}
      <motion.div
        className="ob6-main-wrap"
        initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.1, ease:"easeOut" }}
        style={{ position:"relative", zIndex:10, width:"100%", maxWidth:1100, padding:"0 80px 80px", display:"flex", justifyContent:"center" }}
      >
        <div className="ob6-card" style={{
          width:"100%", maxWidth:780, minHeight:780,
          background:"rgba(7,11,21,0.97)",
          border:"1px solid rgba(212,175,55,0.28)",
          borderRadius:26,
          boxShadow:"0 0 50px rgba(212,175,55,0.10), 0 48px 96px rgba(0,0,0,0.75), inset 0 1px 0 rgba(212,175,55,0.08)",
          padding:"44px 40px",
          display:"flex", flexDirection:"column", gap:30,
          animation:"ob6CardFloat 6s ease-in-out infinite",
        }}>

          {/* ── SECTION 1: Song Title + Audio Player (highest emphasis) ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {/* Label */}
            <div style={{ fontFamily:"Inter,sans-serif", fontSize:10, fontWeight:700, letterSpacing:3, color:"rgba(212,175,55,0.65)", textTransform:"uppercase", marginBottom:4 }}>Song Title</div>
            {/* Title */}
            <div className="ob6-song-title" style={{
              fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700,
              color:WHITE, lineHeight:1.25, marginBottom:16,
              textShadow:"0 0 30px rgba(212,175,55,0.18)",
            }}>{songData?.title ?? songTitle}</div>

            {/* Hidden audio element — wired to real Sunor.cc URL */}
            {songData?.audioUrl && (
              <audio
                ref={audioRef}
                src={songData.audioUrl}
                preload="auto"
                onTimeUpdate={(e) => {
                  const a = e.currentTarget;
                  setElapsed(a.currentTime);
                  if (a.duration > 0) setProgress(a.currentTime / a.duration);
                }}
                onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); }}
                onEnded={() => { setPlaying(false); setProgress(0); setElapsed(0); }}
              />
            )}

            {/* Audio Player */}
            <div className="ob6-player-box" style={{
              background:"linear-gradient(135deg,rgba(212,175,55,0.05) 0%,rgba(212,175,55,0.02) 100%)",
              border:"1px solid rgba(212,175,55,0.20)",
              borderRadius:18, padding:"20px 22px",
              display:"flex", flexDirection:"column", gap:14,
            }}>
              {/* Controls row */}
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                {/* Play/Pause button */}
                <button
                  className="ob6-play-btn"
                  onClick={songData?.audioUrl ? togglePlay : undefined}
                  disabled={songPhase === "loading" || !songData?.audioUrl}
                  aria-label={playing ? "Pause preview" : "Play preview"}
                  style={{
                    width:56, height:56, borderRadius:"50%", flexShrink:0,
                    border:`2px solid ${playing ? GOLD : "rgba(212,175,55,0.75)"}`,
                    background: playing ? "rgba(212,175,55,0.22)" : "rgba(212,175,55,0.10)",
                    color: (songPhase === "loading" || !songData?.audioUrl) ? "rgba(212,175,55,0.35)" : GOLD,
                    fontSize: songPhase === "loading" ? 14 : 20,
                    cursor: (songPhase === "loading" || !songData?.audioUrl) ? "default" : "pointer",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow: playing ? "0 0 28px rgba(212,175,55,0.65)" : "0 0 14px rgba(212,175,55,0.25)",
                    transition:"all .2s ease-out",
                    animation: playing ? "ob6Pulse 2s ease-in-out infinite" : (songPhase === "loading" ? "ob6Spin 1.2s linear infinite" : "none"),
                    outline:"none",
                  }}
                >{songPhase === "loading" ? "◌" : playing ? "⏸" : "▶"}</button>

                {/* Waveform + timestamps */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
                  <div
                    className="ob6-waveform"
                    style={{ display:"flex", alignItems:"center", gap:2, height:60, cursor:"pointer", width:"100%" }}
                    onClick={e => {
                      if (songData?.audioUrl) {
                        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
                      }
                    }}
                    aria-hidden="true"
                  >
                    {WAVEFORM.map((h, wi) => {
                      const frac   = wi / WAVEFORM.length;
                      const played = frac <= progress;
                      const active = playing && Math.abs(frac - progress) < 0.05;
                      return (
                        <div key={wi} style={{
                          flex:1, borderRadius:3,
                          height:`${Math.max(12, h * 0.78)}%`,
                          background: played
                            ? `rgba(212,175,55,${active ? 1 : 0.88})`
                            : "rgba(255,255,255,0.14)",
                          transition:"background .1s",
                          animation: active ? `ob6WaveBar ${0.24+(wi%4)*0.07}s ease-in-out infinite` : "none",
                          transformOrigin:"bottom",
                        }}/>
                      );
                    })}
                  </div>
                  {/* Time labels */}
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:500, color:"rgba(255,255,255,0.55)" }}>{fmt(elapsed)}</span>
                    <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.30)" }}>{fmt(DEMO_DUR)}</span>
                  </div>
                </div>

                {/* Restart */}
                <button
                  onClick={restart} aria-label="Restart preview"
                  style={{
                    width:34, height:34, borderRadius:"50%", flexShrink:0,
                    border:"1px solid rgba(255,255,255,0.12)", background:"transparent",
                    color:"rgba(255,255,255,0.40)", fontSize:15, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"all .15s", outline:"none",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(212,175,55,0.6)"; (e.currentTarget as HTMLElement).style.color=GOLD; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.40)"; }}
                >↩</button>
              </div>

              {/* Gold seekbar */}
              <div
                role="slider" tabIndex={0}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress*100)} aria-label="Seek audio"
                onKeyDown={e => { if (songData?.audioUrl) { if(e.key==="ArrowRight") seekTo(Math.min(1,progress+0.05)); if(e.key==="ArrowLeft") seekTo(Math.max(0,progress-0.05)); } }}
                onClick={e => { if (songData?.audioUrl) { const r=(e.currentTarget as HTMLDivElement).getBoundingClientRect(); seekTo(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))); } }}
                style={{ width:"100%", height:5, borderRadius:3, background:"rgba(255,255,255,0.10)", cursor:"pointer", position:"relative", overflow:"hidden", outline:"none" }}
              >
                <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${progress*100}%`, background:`linear-gradient(90deg,${GOLD},${GOLD2})`, borderRadius:3, transition:"width .05s linear" }}/>
              </div>

              <div style={{ fontFamily:"Inter,sans-serif", fontSize:10, color:"rgba(255,255,255,0.28)", textAlign:"center", letterSpacing:0.3 }}>
                {songPhase === "loading" && "● Composing your preview — this takes ~60 seconds…"}
                {songPhase === "error" && "Preview unavailable — your full song will be delivered after production."}
                {(songPhase === "ready" || songPhase === "idle") && "🎵 AI-composed preview · Full master delivered after production"}
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Visual Mood Gallery — AI-generated per customer emotional arc ── */}
          <div className="ob6-mood-section" style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:10, fontWeight:700, letterSpacing:3, color:"rgba(212,175,55,0.65)", textTransform:"uppercase" }}>Your Emotional Arc</div>
              {moodPhase === "loading" && (
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:GOLD, animation:"ob6Pulse 1.2s ease-in-out infinite" }}/>
                  <span style={{ fontFamily:"Inter,sans-serif", fontSize:9, color:"rgba(212,175,55,0.60)", letterSpacing:1 }}>AI GENERATING VISUALS…</span>
                </div>
              )}
              {moodPhase === "done" && (
                <span style={{ fontFamily:"Inter,sans-serif", fontSize:9, color:"rgba(212,175,55,0.50)", letterSpacing:1 }}>✦ UNIQUE TO YOUR STORY</span>
              )}
            </div>
            <div
              className="ob6-mood-grid"
              role="radiogroup" aria-label="Emotional arc mood selection"
              style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}
            >
              {emotionSlots.map((emotionLabel, mi) => {
                const isSel   = selMood === mi;
                const isHov   = hovMood === mi;
                const imgData = moodImages[mi] ?? null;
                const isLoading = moodPhase === "loading";
                const hasImage  = !!imgData?.url;
                return (
                  <div
                    key={mi}
                    className="ob6-mood-thumb"
                    role="radio" tabIndex={0}
                    aria-checked={isSel} aria-label={`${emotionLabel}${isSel ? " (selected)" : ""}`}
                    onClick={() => setSelMood(mi)}
                    onKeyDown={e => { if(e.key==="Enter"||e.key===" ") { e.preventDefault(); setSelMood(mi); }}}
                    onMouseEnter={() => setHovMood(mi)}
                    onMouseLeave={() => setHovMood(null)}
                    style={{
                      width:"100%", height:108, borderRadius:13, overflow:"hidden",
                      cursor:"pointer", position:"relative",
                      border: isSel ? `2px solid ${GOLD}` : "2px solid rgba(255,255,255,0.08)",
                      boxShadow: isSel
                        ? "0 0 22px rgba(212,175,55,0.70), 0 0 0 1px rgba(212,175,55,0.20)"
                        : isHov ? "0 0 16px rgba(212,175,55,0.35)" : "0 4px 14px rgba(0,0,0,0.60)",
                      transform: isHov && !isSel ? "scale(1.04)" : "scale(1)",
                      transition:"all .18s ease-out",
                      outline:"none",
                      background: !hasImage ? MOOD_GRADIENT_FALLBACKS[mi] : "transparent",
                    }}
                  >
                    {/* Shimmer skeleton while loading */}
                    {isLoading && (
                      <div style={{
                        position:"absolute", inset:0,
                        background:"linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(212,175,55,0.08) 50%,rgba(255,255,255,0.03) 75%)",
                        backgroundSize:"200% 100%",
                        animation:"ob6Shimmer 1.8s ease-in-out infinite",
                      }}/>
                    )}

                    {/* Real AI-generated image */}
                    {hasImage && !isLoading && (
                      <img
                        src={imgData!.url!}
                        alt={emotionLabel}
                        loading="lazy"
                        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", pointerEvents:"none" }}
                      />
                    )}

                    {/* Gradient fallback: always show emotion label overlay */}
                    {!hasImage && !isLoading && (
                      <div style={{
                        position:"absolute", inset:0,
                        display:"flex", flexDirection:"column",
                        alignItems:"center", justifyContent:"center",
                        background:"rgba(0,0,0,0.25)",
                      }}>
                        <div style={{ fontSize:20, marginBottom:4, opacity:0.85 }}>
                          {["✦","◈","⬡","◇"][mi]}
                        </div>
                      </div>
                    )}

                    {/* Always: bottom emotion label bar */}
                    <div style={{
                      position:"absolute", left:0, right:0, bottom:0,
                      background:"linear-gradient(0deg,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.40) 60%,transparent 100%)",
                      padding:"18px 7px 6px",
                      display:"flex", alignItems:"flex-end", justifyContent:"space-between",
                    }}>
                      <span style={{
                        fontFamily:"Inter,sans-serif", fontSize:9, fontWeight:700,
                        color: isSel ? GOLD : "rgba(255,255,255,0.92)",
                        letterSpacing:0.8, textTransform:"uppercase",
                        textShadow:"0 1px 4px rgba(0,0,0,0.9)",
                        lineHeight:1.2,
                        maxWidth:"80%",
                      }}>{emotionLabel}</span>
                      {isSel && (
                        <div style={{ background:"rgba(212,175,55,0.95)", borderRadius:4, width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#000", fontWeight:900, flexShrink:0 }}>✓</div>
                      )}
                    </div>

                    {/* Selected overlay tint */}
                    {isSel && (
                      <div style={{ position:"absolute", inset:0, background:"rgba(212,175,55,0.08)", pointerEvents:"none" }}/>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SECTION 3: Metadata (lower emphasis) ── */}
          <div className="ob6-detail-row" style={{ display:"flex", gap:12, alignItems:"stretch" }}>
            {[
              { label:"Emotion",       value: emotion },
              { label:"Video Style",   value: videoStyle },
              { label:"Delivery Time", value: "3–5 Days" },
            ].map(({ label, value }) => (
              <div key={label} className="ob6-detail-card" style={{
                flex:1,
                background:"rgba(212,175,55,0.03)",
                border:"1px solid rgba(212,175,55,0.12)",
                borderRadius:12, padding:"12px 14px",
                display:"flex", flexDirection:"column", justifyContent:"center", gap:5,
              }}>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:9, fontWeight:700, letterSpacing:2.2, color:"rgba(212,175,55,0.55)", textTransform:"uppercase" }}>{label}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13, fontWeight:600, color:WHITE, lineHeight:1.35 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* ── SECTION 4: Checklist (medium emphasis) ── */}
          <div style={{ display:"flex", flexDirection:"column" }}>
            <div style={{ fontFamily:"Inter,sans-serif", fontSize:10, fontWeight:700, letterSpacing:3, color:"rgba(212,175,55,0.65)", textTransform:"uppercase", marginBottom:16 }}>What's Included</div>
            <div className="ob6-checklist" style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {INCLUDED_ITEMS.map(item => (
                <div key={item} style={{ display:"flex", alignItems:"center", gap:13 }}>
                  <div className="ob6-check-icon" style={{
                    width:24, height:24, borderRadius:"50%", flexShrink:0,
                    background:"rgba(212,175,55,0.13)",
                    border:"1px solid rgba(212,175,55,0.52)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, color:GOLD, fontWeight:900,
                  }}>✓</div>
                  <span className="ob6-check-label" style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"rgba(255,255,255,0.84)", lineHeight:1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── URGENCY + SOCIAL PROOF ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, paddingBottom:4 }}>
            {/* 24h reservation badge */}
            <div style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"10px 16px", borderRadius:10,
              background:"linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.06))",
              border:"1px solid rgba(212,175,55,0.35)",
            }}>
              <span style={{ fontSize:16 }}>🎯</span>
              <div style={{ flex:1 }}>
                <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color:GOLD }}>Your creation is reserved for 24 hours</span>
                <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.4)", display:"block", marginTop:1 }}>Complete checkout to lock in your spot and today's pricing</span>
              </div>
            </div>
            {/* Social proof */}
            <p style={{
              fontFamily:"Inter,sans-serif", fontSize:12,
              color:"rgba(255,255,255,0.38)", margin:0,
              textAlign:"center",
            }}>⭐ 312 people ordered after seeing their preview this week</p>
          </div>

          {/* ── CTA Buttons ── */}
          <div className="ob6-cta-wrap" style={{ display:"flex", gap:12, paddingTop:8 }}>
            <button
              className="ob6-back-btn"
              onClick={onBack}
              onMouseEnter={() => setBackHov(true)}
              onMouseLeave={() => setBackHov(false)}
              aria-label="Back to AI Analysis"
              style={{
                flexShrink:0, padding:"0 26px", height:56, borderRadius:14,
                border:"1px solid rgba(255,255,255,0.15)",
                background: backHov ? "rgba(255,255,255,0.07)" : "transparent",
                color: backHov ? WHITE : "rgba(255,255,255,0.62)",
                fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:500,
                cursor:"pointer", transition:"all .15s ease-out",
                display:"flex", alignItems:"center", gap:7, outline:"none",
              }}
            >← Back</button>

            <button
              className="ob6-cta-btn"
              onClick={handleNext}
              onMouseEnter={() => setNextHov(true)}
              onMouseLeave={() => setNextHov(false)}
              disabled={nextLoad}
              aria-label="Continue to Production Portal"
              style={{
                flex:1, height:56, borderRadius:14,
                background: nextHov && !nextLoad
                  ? `linear-gradient(135deg,#f2cd5a,${GOLD})`
                  : `linear-gradient(135deg,${GOLD},#b49228)`,
                border:"none", color:"#000",
                fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:700,
                cursor: nextLoad ? "not-allowed" : "pointer",
                transition:"all .18s ease-out",
                boxShadow: nextLoad ? "none" : "0 6px 30px rgba(212,175,55,0.45)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:9,
                opacity: nextLoad ? 0.75 : 1, outline:"none",
              }}
            >
              {nextLoad ? (
                <>
                  <span style={{ display:"inline-block", width:15, height:15, border:"2px solid rgba(0,0,0,0.25)", borderTopColor:"#000", borderRadius:"50%", animation:"ob6Spin .7s linear infinite" }}/>
                  Preparing…
                </>
              ) : "Continue to Production →"}
            </button>
          </div>

        </div>{/* /ob6-card */}
      </motion.div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 7 — PRODUCTION PORTAL  (final fidelity pass v2)
// ─────────────────────────────────────────────────────────────────────────────

const S7_CSS = `
@keyframes ob7RingFill {
  from { stroke-dashoffset: 691.15; }
  to   { stroke-dashoffset: var(--ob7-dash-target); }
}
@keyframes ob7PulseBadge {
  0%,100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.55), 0 0 28px rgba(212,175,55,0.25); }
  50%     { box-shadow: 0 0 0 12px rgba(212,175,55,0), 0 0 52px rgba(212,175,55,0.50); }
}
@keyframes ob7PulseRow {
  0%,100% { box-shadow: inset 0 0 0 1px rgba(212,175,55,0.32), 0 0 0 rgba(212,175,55,0); }
  50%     { box-shadow: inset 0 0 0 1px rgba(212,175,55,0.85), 0 0 22px rgba(212,175,55,0.22); }
}
@keyframes ob7FeedFade {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes ob7Shimmer {
  0%   { background-position: -300% center; }
  100% { background-position:  300% center; }
}
@keyframes ob7GlowPulse {
  0%,100% { opacity:0.20; }
  50%     { opacity:0.42; }
}
@keyframes ob7BarPulse {
  0%,100% { opacity:0.72; transform:scaleY(1); }
  50%     { opacity:1;    transform:scaleY(1.22); }
}
@keyframes ob7Spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes ob7FloatParticle {
  0%   { opacity:0;   transform:translateY(0) scale(0.5); }
  15%  { opacity:0.9; }
  80%  { opacity:0.5; }
  100% { opacity:0;   transform:translateY(-140px) scale(1.2); }
}
@keyframes ob7StatusTick {
  0%   { transform:scale(0) rotate(-20deg); opacity:0; }
  60%  { transform:scale(1.3) rotate(4deg);  opacity:1; }
  100% { transform:scale(1) rotate(0deg);   opacity:1; }
}
@keyframes ob7OrbitSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes ob7OrbitSpinRev {
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
}
@keyframes ob7LeadPulse {
  0%,100% { r:8; opacity:1; }
  50%     { r:11; opacity:0.75; }
}
@keyframes ob7RingGlow {
  0%,100% { filter: drop-shadow(0 0 8px rgba(212,175,55,0.45)); }
  50%     { filter: drop-shadow(0 0 22px rgba(212,175,55,0.90)); }
}

/* ── Responsive overrides ── */
@media (min-width:1200px) {
  .ob7-card       { max-width:860px !important; min-height:820px !important; padding:52px 68px 60px !important; }
  .ob7-title      { font-size:38px !important; }
  .ob7-subtitle   { font-size:19px !important; }
  .ob7-ring-wrap  { width:280px !important; height:280px !important; }
  .ob7-ring-svg   { width:280px !important; height:280px !important; }
  .ob7-pct-num    { font-size:56px !important; }
  .ob7-pct-lbl    { font-size:12px !important; }
  .ob7-waveform   { height:80px !important; }
}
@media (min-width:768px) and (max-width:1199px) {
  .ob7-card       { max-width:720px !important; min-height:760px !important; padding:38px 44px 48px !important; }
  .ob7-title      { font-size:32px !important; }
  .ob7-subtitle   { font-size:17px !important; }
  .ob7-ring-wrap  { width:240px !important; height:240px !important; }
  .ob7-ring-svg   { width:240px !important; height:240px !important; }
  .ob7-pct-num    { font-size:48px !important; }
  .ob7-pct-lbl    { font-size:11px !important; }
  .ob7-waveform   { height:72px !important; }
  .ob7-feed-title { font-size:18px !important; }
}
@media (max-width:767px) {
  .ob7-card         { padding:24px 18px 40px !important; min-height:680px !important; border-radius:20px !important; }
  .ob7-title        { font-size:26px !important; }
  .ob7-subtitle     { font-size:15px !important; }
  .ob7-ring-wrap    { width:220px !important; height:220px !important; }
  .ob7-ring-svg     { width:220px !important; height:220px !important; }
  .ob7-pct-num      { font-size:42px !important; }
  .ob7-pct-lbl      { font-size:10px !important; }
  .ob7-waveform     { height:68px !important; }
  .ob7-checklist-row{ height:46px !important; }
  .ob7-btn-primary  { height:52px !important; }
  .ob7-btn-secondary{ height:44px !important; }
  .ob7-feed-title   { font-size:16px !important; }
  .ob7-step-dots    { gap:0 !important; transform:scale(0.88); transform-origin:center; }
}
`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Step7Props {
  whoFor: string | null;
  experienceType: string | null;
  onBack: () => void;
  onNext: () => void;
}
type StepStatus = "done" | "active" | "pending";
interface PipelineStep { id:string; label:string; detail:string; status:StepStatus; }
interface StatusFeed   { phase:string; progress:number; message:string; ts:string; }

// ── Data ──────────────────────────────────────────────────────────────────────
const PIPELINE_INIT: PipelineStep[] = [
  { id:"lyrics",   label:"Lyrics Generated",  detail:"AI-crafted personal narrative composed",      status:"done"    },
  { id:"music",    label:"Music Generated",    detail:"Melody, harmony & instrumentation mastered",  status:"done"    },
  { id:"video",    label:"Video In Progress",  detail:"Cinematic scenes rendering",                  status:"active"  },
  { id:"finalize", label:"Finalizing",         detail:"Mastering, sync & quality pass",              status:"pending" },
  { id:"delivery", label:"Ready For Delivery", detail:"Package assembled & QA passed",               status:"pending" },
];

const FEED_SEQUENCE: StatusFeed[] = [
  { phase:"Lyric Composition",   progress:100, message:"Your personal narrative has been woven into custom lyrics.",              ts:"" },
  { phase:"Music Generation",    progress:100, message:"Melody, harmony and instrumentation composed and mastered.",              ts:"" },
  { phase:"Video Rendering",     progress:78,  message:"Creating cinematic scenes and synchronizing soundtrack.",                 ts:"" },
  { phase:"Scene Color Grading", progress:62,  message:"Applying cinematic color palette and emotional tone adjustments.",        ts:"" },
  { phase:"Audio Sync",          progress:41,  message:"Synchronizing waveform to visual timeline for perfect alignment.",        ts:"" },
];
const PROGRESS_SEQUENCE = [12, 28, 45, 62, 78];
const RING_R = 120;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 753.98

function nowTs() {
  return new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

// ── Particle ──────────────────────────────────────────────────────────────────
function S7Particle({ x, delay, color }: { x:number; delay:number; color:string }) {
  return (
    <div style={{
      position:"absolute", bottom:0, left:`${x}%`,
      width:3, height:3, borderRadius:"50%",
      background:color, pointerEvents:"none",
      animation:`ob7FloatParticle ${2.5 + (x % 1.3)}s ${delay}s ease-out infinite`,
      opacity:0,
    }}/>
  );
}

// ── SVG Progress Ring ─────────────────────────────────────────────────────────
function S7Ring({ pct, animated }: { pct:number; animated:boolean }) {
  const offset = RING_CIRC * (1 - pct / 100);
  const leadAngle = (pct / 100) * 360 - 90;
  const leadRad = leadAngle * (Math.PI / 180);
  const leadX = 150 + RING_R * Math.cos(leadRad);
  const leadY = 150 + RING_R * Math.sin(leadRad);
  const transitionVal = animated ? `stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)` : "none";

  return (
    <svg
      className="ob7-ring-svg"
      viewBox="0 0 300 300"
      style={{ width:280, height:280, overflow:"visible", display:"block" }}
    >
      <defs>
        <linearGradient id="ob7GradMain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#C89B2A"/>
          <stop offset="40%"  stopColor="#D4AF37"/>
          <stop offset="70%"  stopColor="#F4D06F"/>
          <stop offset="100%" stopColor="#D4AF37"/>
        </linearGradient>
        <radialGradient id="ob7LeadGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.9"/>
          <stop offset="50%"  stopColor="#F4D06F" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
        </radialGradient>
        <filter id="ob7GlowSoft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="ob7GlowHard" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="9" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="ob7GlowLead" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="12" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Outermost orbit ring — slow spin */}
      <circle cx="150" cy="150" r="142" fill="none"
        stroke="rgba(212,175,55,0.08)" strokeWidth="1" strokeDasharray="3 9"/>

      {/* Outer dashed orbit */}
      <circle cx="150" cy="150" r="135" fill="none"
        stroke="rgba(212,175,55,0.12)" strokeWidth="0.75" strokeDasharray="6 12"/>

      {/* Track ring */}
      <circle cx="150" cy="150" r={RING_R} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth="16"/>

      {/* Wide glow shadow arc */}
      <circle cx="150" cy="150" r={RING_R} fill="none"
        stroke="rgba(212,175,55,0.22)" strokeWidth="26"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 150 150)"
        filter="url(#ob7GlowSoft)"
        style={{ transition: transitionVal }}
      />

      {/* Main arc */}
      <circle cx="150" cy="150" r={RING_R} fill="none"
        stroke="url(#ob7GradMain)" strokeWidth="15"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 150 150)"
        filter="url(#ob7GlowHard)"
        style={{
          transition: transitionVal,
          animation: "ob7RingGlow 2.5s ease-in-out infinite",
        }}
      />

      {/* Tick marks */}
      {Array.from({ length: 72 }, (_, i) => {
        const ang = (i * 5 - 90) * (Math.PI / 180);
        const isMaj = i % 6 === 0;
        const outerR = 127;
        const innerR = isMaj ? 119 : 123;
        return (
          <line key={i}
            x1={150 + outerR * Math.cos(ang)} y1={150 + outerR * Math.sin(ang)}
            x2={150 + innerR * Math.cos(ang)} y2={150 + innerR * Math.sin(ang)}
            stroke={isMaj ? "rgba(212,175,55,0.42)" : "rgba(212,175,55,0.15)"}
            strokeWidth={isMaj ? 1.5 : 0.8}
          />
        );
      })}

      {/* Inner decorative ring */}
      <circle cx="150" cy="150" r="108" fill="none"
        stroke="rgba(212,175,55,0.08)" strokeWidth="1" strokeDasharray="2 10"/>

      {/* Lead dot — glow halo */}
      {pct > 0 && pct < 100 && (
        <circle cx={leadX} cy={leadY} r="20" fill="url(#ob7LeadGlow)"
          filter="url(#ob7GlowLead)"
          style={{ transition: transitionVal, opacity:0.6 }}
        />
      )}
      {/* Lead dot — solid core */}
      {pct > 0 && pct < 100 && (
        <circle cx={leadX} cy={leadY} r="9" fill="#F4D06F"
          filter="url(#ob7GlowHard)"
          style={{
            transition: transitionVal,
            animation:"ob7LeadPulse 1.8s ease-in-out infinite",
          }}
        />
      )}
      {pct > 0 && pct < 100 && (
        <circle cx={leadX} cy={leadY} r="4" fill="#FFFFFF"
          style={{ transition: transitionVal }}
        />
      )}

      {/* Center percentage */}
      <text x="150" y="136" textAnchor="middle"
        fontFamily="Playfair Display, serif" fontWeight="700"
        fontSize="56" fill="#FFFFFF" className="ob7-pct-num"
      >{pct}%</text>
      <text x="150" y="160" textAnchor="middle"
        fontFamily="Inter, sans-serif" fontWeight="700"
        fontSize="12" fill="rgba(212,175,55,0.88)"
        letterSpacing="4" className="ob7-pct-lbl"
      >COMPLETE</text>
      <text x="150" y="178" textAnchor="middle"
        fontFamily="Inter, sans-serif" fontWeight="500"
        fontSize="9" fill="rgba(255,255,255,0.35)"
        letterSpacing="2"
      >PRODUCTION ACTIVE</text>
    </svg>
  );
}

// ── Checklist Row ─────────────────────────────────────────────────────────────
function S7ChecklistRow({ item }: { item:PipelineStep }) {
  const isDone    = item.status === "done";
  const isActive  = item.status === "active";
  const isPending = item.status === "pending";

  return (
    <div className="ob7-checklist-row" style={{
      display:"flex", alignItems:"center", gap:14, height:50,
      padding:"0 18px", borderRadius:13,
      background: isDone   ? "rgba(212,175,55,0.09)"
                : isActive ? "rgba(212,175,55,0.15)"
                :            "rgba(255,255,255,0.025)",
      border: isDone   ? "1px solid rgba(212,175,55,0.28)"
            : isActive ? "1px solid rgba(212,175,55,0.60)"
            :            "1px solid rgba(255,255,255,0.06)",
      animation: isActive ? "ob7PulseRow 2s ease-in-out infinite" : "none",
      transition:"all .35s ease",
      opacity: isPending ? 0.58 : 1,
    }}>
      {/* Icon */}
      <div style={{
        width:28, height:28, borderRadius:"50%", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: isDone   ? "rgba(212,175,55,0.28)"
                  : isActive ? "rgba(212,175,55,0.35)"
                  :            "rgba(255,255,255,0.05)",
        border: isDone   ? "1.5px solid rgba(212,175,55,0.80)"
              : isActive ? "2px solid #D4AF37"
              :            "1.5px solid rgba(255,255,255,0.14)",
        boxShadow: isActive ? "0 0 16px rgba(212,175,55,0.65), 0 0 32px rgba(212,175,55,0.25)" : "none",
      }}>
        {isDone && (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
            style={{ animation:"ob7StatusTick .35s ease-out forwards" }}>
            <polyline points="2,6.5 5.5,10 11,3" stroke="#D4AF37" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {isActive && (
          <div style={{
            width:9, height:9, borderRadius:"50%", background:"#D4AF37",
            animation:"ob7BarPulse 1.3s ease-in-out infinite",
          }}/>
        )}
        {isPending && (
          <div style={{ width:7, height:7, borderRadius:"50%", background:"rgba(255,255,255,0.20)" }}/>
        )}
      </div>

      {/* Text */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:700,
          color: isDone ? "#D4AF37" : isActive ? "#F4D06F" : "rgba(255,255,255,0.38)",
          letterSpacing:"0.2px", lineHeight:1.2,
        }}>{item.label}</div>
        {(isDone || isActive) && (
          <div style={{
            fontFamily:"Inter, sans-serif", fontSize:11,
            color:"rgba(255,255,255,0.38)", marginTop:2, lineHeight:1.2,
          }}>{item.detail}</div>
        )}
      </div>

      {/* Badge */}
      {isDone && (
        <div style={{
          fontSize:10, fontFamily:"Inter, sans-serif", fontWeight:800,
          color:"#050B1A", letterSpacing:"1.2px",
          background:"linear-gradient(135deg,#D4AF37,#F4D06F)",
          padding:"4px 10px", borderRadius:7, flexShrink:0,
          boxShadow:"0 2px 8px rgba(212,175,55,0.45)",
        }}>DONE</div>
      )}
      {isActive && (
        <div style={{
          fontSize:10, fontFamily:"Inter, sans-serif", fontWeight:800,
          color:"#050B1A", letterSpacing:"1.2px",
          background:"linear-gradient(135deg,#D4AF37,#F4D06F)",
          padding:"4px 10px", borderRadius:7, flexShrink:0,
          animation:"ob7PulseBadge 2s ease-in-out infinite",
          boxShadow:"0 0 16px rgba(212,175,55,0.70)",
        }}>LIVE</div>
      )}
    </div>
  );
}

// ── Bar Visualizer ────────────────────────────────────────────────────────────
function S7BarVisualizer({ pct, isActive }: { pct:number; isActive:boolean }) {
  const BARS = 38;
  return (
    <div className="ob7-waveform" style={{
      display:"flex", alignItems:"flex-end", gap:4, height:80, overflow:"hidden",
    }}>
      {Array.from({ length: BARS }, (_, i) => {
        const filled = (i / BARS) * 100 <= pct;
        const h = 14 + Math.sin(i * 0.68 + 0.8) * 22 + Math.cos(i * 1.15 + 0.4) * 14;
        const clampH = Math.max(8, Math.min(72, h));
        return (
          <div key={i} style={{
            flex:1, borderRadius:"3px 3px 0 0",
            height:`${clampH}px`,
            background: filled
              ? i % 4 === 0
                ? "linear-gradient(180deg,#FFFFFF 0%,#F4D06F 30%,#D4AF37 100%)"
                : "linear-gradient(180deg,#F4D06F 0%,#D4AF37 100%)"
              : "rgba(255,255,255,0.07)",
            animation: (filled && isActive && i % 3 === 0)
              ? `ob7BarPulse ${1.3 + (i % 5) * 0.18}s ${i * 0.025}s ease-in-out infinite`
              : "none",
            transition:"background .5s ease, height .8s ease",
            boxShadow: filled ? "0 -2px 8px rgba(212,175,55,0.30)" : "none",
          }}/>
        );
      })}
    </div>
  );
}

// ── Step 7 Main ───────────────────────────────────────────────────────────────
function Step7ProductionPortal({ whoFor, experienceType, onBack, onNext }: Step7Props) {
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!document.getElementById("ob7-styles")) {
      const s = document.createElement("style");
      s.id = "ob7-styles"; s.textContent = S7_CSS;
      document.head.appendChild(s);
    }
    return () => { const el = document.getElementById("ob7-styles"); if (el) el.remove(); };
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [animatedPct, setAnimatedPct] = React.useState(0);
  const [progress,    setProgress]    = React.useState(78);
  const [pipeline,    setPipeline]    = React.useState<PipelineStep[]>(PIPELINE_INIT);
  const [feedIdx,     setFeedIdx]     = React.useState(2);
  const [feed,        setFeed]        = React.useState<StatusFeed>({ ...FEED_SEQUENCE[2], ts: nowTs() });
  const [refreshing,  setRefreshing]  = React.useState(false);
  const [refreshCount,setRefreshCount]= React.useState(0);
  const [navigating,  setNavigating]  = React.useState(false);
  const [ringReady,   setRingReady]   = React.useState(false);

  const [particles] = React.useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      x: 3 + (i * 5.5) % 93,
      delay: i * 0.28,
      color: i % 3 === 0 ? "#F4D06F" : i % 3 === 1 ? "#D4AF37" : "rgba(212,175,55,0.5)",
    }))
  );

  // ── Animate in ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const target = 78;
    setProgress(target);
    let cur = 0;
    const inc = Math.ceil(target / 70);
    const t = setInterval(() => {
      cur = Math.min(cur + inc, target);
      setAnimatedPct(cur);
      if (cur >= target) clearInterval(t);
    }, 18);
    setTimeout(() => setRingReady(true), 80);
    return () => clearInterval(t);
  }, []);

  // ── Animate counter ───────────────────────────────────────────────────────
  const animateTo = React.useCallback((from: number, to: number) => {
    let cur = from;
    const diff = to - from;
    const frames = 75;
    const inc = diff / frames;
    let f = 0;
    const t = setInterval(() => {
      f++;
      cur = Math.min(Math.max(cur + inc, 0), 100);
      setAnimatedPct(Math.round(cur));
      if (f >= frames) { setAnimatedPct(to); clearInterval(t); }
    }, 16);
  }, []);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = React.useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    const nextIdx = (feedIdx + 1) % FEED_SEQUENCE.length;
    setTimeout(() => {
      const nextFeed = { ...FEED_SEQUENCE[nextIdx], ts: nowTs() };
      const nextPct  = PROGRESS_SEQUENCE[nextIdx];
      setFeedIdx(nextIdx);
      setFeed(nextFeed);
      setProgress(nextPct);
      animateTo(animatedPct, nextPct);
      const newPipeline = PIPELINE_INIT.map((step, i) => {
        if (nextPct >= 100) return { ...step, status:"done" as StepStatus };
        if (i <= 1)   return { ...step, status:"done"    as StepStatus };
        if (i === 2)  return { ...step, status: nextPct >= 55 ? "active" as StepStatus : "pending" as StepStatus };
        if (i === 3)  return { ...step, status: nextPct >= 88 ? "active" as StepStatus : "pending" as StepStatus };
        return { ...step, status:"pending" as StepStatus };
      });
      setPipeline(newPipeline);
      setRefreshCount(c => c + 1);
      setRefreshing(false);
    }, 1300);
  }, [refreshing, feedIdx, animatedPct, animateTo]);

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const handleDashboard = React.useCallback(() => {
    if (navigating) return;
    setNavigating(true);
    setTimeout(() => setLocation("/dashboard"), 420);
  }, [navigating, setLocation]);

  const deliveryLabel = experienceType?.toLowerCase().includes("elite")
    ? "24 Hours"
    : experienceType?.toLowerCase().includes("premium")
    ? "1–2 Business Days"
    : "3–5 Business Days";

  const packageLabel = whoFor === "Someone else" ? "Gift Creation" : "Personal Creation";

  return (
    <div style={{
      minHeight:"100%", overflowY:"auto", overflowX:"hidden",
      background:"#050B1A",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"0 clamp(16px,3.5vw,80px)",
      paddingTop:28, paddingBottom:80,
      position:"relative",
    }}>

      {/* ── Ambient bg ── */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{
          position:"absolute", top:"-8%", left:"50%", transform:"translateX(-50%)",
          width:"75%", height:500, borderRadius:"50%",
          background:"radial-gradient(ellipse,rgba(212,175,55,0.11) 0%,transparent 70%)",
          filter:"blur(70px)",
          animation:"ob7GlowPulse 4.5s ease-in-out infinite",
        }}/>
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse at center,transparent 38%,rgba(5,11,26,0.88) 100%)",
        }}/>
        <div style={{
          position:"absolute", inset:0, opacity:0.022,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(212,175,55,0.6) 2px,rgba(212,175,55,0.6) 3px)",
          pointerEvents:"none",
        }}/>
      </div>

      {/* ── Content ── */}
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:860, display:"flex", flexDirection:"column", alignItems:"center" }}>

        {/* ── Step progress dots ── */}
        <div className="ob7-step-dots" style={{
          display:"flex", alignItems:"center",
          marginBottom:28, flexWrap:"wrap", justifyContent:"center", gap:0,
        }}>
          {["S1","S2","S3","S4","S5","S6","S7","S8","S9"].map((lbl, i) => {
            const done = i < 6, cur = i === 6, pend = i > 6;
            return (
              <React.Fragment key={lbl}>
                {i > 0 && (
                  <div style={{
                    width: cur || i === 7 ? 30 : 22, height:1,
                    background: done ? "rgba(212,175,55,0.60)" : "rgba(255,255,255,0.10)",
                    transition:"all .4s",
                  }}/>
                )}
                <div style={{
                  width: cur ? 38 : 28, height: cur ? 38 : 28,
                  borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: done ? "rgba(212,175,55,0.24)"
                            : cur  ? "rgba(212,175,55,0.18)"
                            :        "rgba(255,255,255,0.04)",
                  border: done ? "1.5px solid rgba(212,175,55,0.70)"
                        : cur  ? "2px solid #D4AF37"
                        :        "1.5px solid rgba(255,255,255,0.13)",
                  boxShadow: cur ? "0 0 24px rgba(212,175,55,0.65), 0 0 48px rgba(212,175,55,0.22)" : "none",
                  animation: cur ? "ob7PulseBadge 2s ease-in-out infinite" : "none",
                  transition:"all .4s", flexShrink:0,
                }}>
                  {done ? (
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <polyline points="1.5,5.5 4.5,8.5 9.5,2" stroke="#D4AF37" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span style={{
                      fontFamily:"Inter, sans-serif",
                      fontSize: cur ? 12 : 9,
                      fontWeight:700,
                      color: cur ? "#D4AF37" : pend ? "rgba(255,255,255,0.25)" : "#D4AF37",
                      letterSpacing:"0.3px",
                    }}>{lbl.replace("S","")}</span>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Main card ── */}
        <div className="ob7-card" style={{
          width:"100%", maxWidth:860, minHeight:820,
          borderRadius:24,
          background:"rgba(8,12,22,0.96)",
          border:"1px solid rgba(255,194,77,0.28)",
          boxShadow:"0 0 40px rgba(255,194,77,0.18), 0 0 80px rgba(255,194,77,0.08), 0 40px 100px rgba(0,0,0,0.60)",
          padding:"52px 68px 60px",
          display:"flex", flexDirection:"column", alignItems:"center", gap:26,
          position:"relative", overflow:"hidden",
        }}>

          {/* Particles */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
            {particles.map((p, i) => <S7Particle key={i} {...p}/>)}
          </div>

          {/* Top edge glow */}
          <div style={{
            position:"absolute", top:0, left:"15%", right:"15%", height:1,
            background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.75),transparent)",
          }}/>
          {/* Corner accents */}
          <div style={{ position:"absolute", top:0, left:0, width:60, height:60,
            background:"linear-gradient(135deg,rgba(212,175,55,0.12),transparent)", borderRadius:"24px 0 60px 0" }}/>
          <div style={{ position:"absolute", top:0, right:0, width:60, height:60,
            background:"linear-gradient(225deg,rgba(212,175,55,0.12),transparent)", borderRadius:"0 24px 0 60px" }}/>

          {/* ── Header ── */}
          <div style={{ textAlign:"center", width:"100%", position:"relative" }}>
            <div style={{
              fontFamily:"Inter, sans-serif", fontSize:11, fontWeight:700,
              color:"rgba(212,175,55,0.72)", letterSpacing:"3.5px",
              marginBottom:10,
            }}>STEP 07</div>
            <h2 className="ob7-title" style={{
              fontFamily:"Playfair Display, serif", fontSize:38, fontWeight:700,
              color:"#FFFFFF", margin:0, lineHeight:1.12, letterSpacing:"-0.3px",
            }}>Production Portal</h2>
            <p className="ob7-subtitle" style={{
              fontFamily:"Inter, sans-serif", fontSize:19, fontWeight:400,
              color:"rgba(255,255,255,0.52)", margin:"10px 0 0", lineHeight:1.5,
            }}>Your creation is now in production.</p>
          </div>

          {/* ── Progress Ring + delivery ── */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, position:"relative" }}>
            {/* Outer conic glow halo */}
            <div style={{
              position:"absolute", inset:-30, borderRadius:"50%",
              background:`conic-gradient(rgba(212,175,55,0.22) ${animatedPct * 3.6}deg, transparent ${animatedPct * 3.6}deg)`,
              filter:"blur(28px)",
              transition:"background 1.4s cubic-bezier(0.22,1,0.36,1)",
              pointerEvents:"none", zIndex:0,
            }}/>
            <div className="ob7-ring-wrap" style={{
              width:280, height:280, position:"relative",
              display:"flex", alignItems:"center", justifyContent:"center", zIndex:1,
            }}>
              <S7Ring pct={animatedPct} animated={ringReady}/>
            </div>

            {/* Delivery badge */}
            <div style={{
              display:"flex", alignItems:"center", gap:10,
              background:"rgba(212,175,55,0.10)",
              border:"1px solid rgba(212,175,55,0.35)",
              borderRadius:12, padding:"9px 22px",
              boxShadow:"0 2px 16px rgba(212,175,55,0.15)",
            }}>
              <div style={{
                width:7, height:7, borderRadius:"50%", background:"#D4AF37",
                animation:"ob7BarPulse 1.8s ease-in-out infinite",
              }}/>
              <span style={{
                fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600,
                color:"rgba(212,175,55,0.88)", letterSpacing:"0.3px",
              }}>Estimated Delivery:</span>
              <span style={{
                fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:700,
                color:"#FFFFFF", letterSpacing:"0.2px",
              }}>{deliveryLabel}</span>
            </div>
          </div>

          {/* ── Waveform ── */}
          <div style={{
            width:"100%",
            background:"rgba(255,255,255,0.028)",
            border:"1px solid rgba(212,175,55,0.14)",
            borderRadius:14, padding:"16px 22px 14px",
            boxShadow:"inset 0 1px 0 rgba(212,175,55,0.08)",
          }}>
            <div style={{
              display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:"#D4AF37",
                  animation:"ob7BarPulse 1.5s ease-in-out infinite" }}/>
                <span style={{
                  fontFamily:"Inter, sans-serif", fontSize:10, fontWeight:700,
                  color:"rgba(212,175,55,0.70)", letterSpacing:"2.5px",
                }}>PRODUCTION WAVEFORM</span>
              </div>
              <span style={{
                fontFamily:"Inter, sans-serif", fontSize:11, fontWeight:600,
                color:"rgba(255,255,255,0.38)", letterSpacing:"1px",
              }}>{animatedPct}% PROCESSED</span>
            </div>
            <S7BarVisualizer pct={animatedPct} isActive={!refreshing}/>
          </div>

          {/* ── Pipeline checklist ── */}
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{
              fontFamily:"Inter, sans-serif", fontSize:10, fontWeight:700,
              color:"rgba(212,175,55,0.68)", letterSpacing:"3px", marginBottom:4,
            }}>PRODUCTION PIPELINE</div>
            {pipeline.map(item => <S7ChecklistRow key={item.id} item={item}/>)}
          </div>

          {/* ── Live status feed ── */}
          <div
            className="ob7-feed-card"
            key={refreshCount}
            style={{
              width:"100%", borderRadius:18,
              background:"linear-gradient(145deg,rgba(212,175,55,0.07),rgba(212,175,55,0.04))",
              border:"1px solid rgba(212,175,55,0.28)",
              padding:"20px 24px 18px",
              display:"flex", flexDirection:"column", gap:13,
              animation:"ob7FeedFade .35s ease-out",
              position:"relative", overflow:"hidden",
              boxShadow:"0 4px 30px rgba(212,175,55,0.10), inset 0 1px 0 rgba(212,175,55,0.15)",
            }}
          >
            {/* Shimmer sweep */}
            <div style={{
              position:"absolute", inset:0, borderRadius:18, pointerEvents:"none",
              background:"linear-gradient(110deg,transparent 30%,rgba(212,175,55,0.07) 50%,transparent 70%)",
              backgroundSize:"300% 100%",
              animation:"ob7Shimmer 3.5s linear infinite",
            }}/>

            {/* Header row */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative" }}>
              <div>
                <div style={{
                  fontFamily:"Inter, sans-serif", fontSize:10, fontWeight:700,
                  color:"rgba(212,175,55,0.68)", letterSpacing:"2.5px", marginBottom:5,
                }}>CURRENT PHASE</div>
                <div className="ob7-feed-title" style={{
                  fontFamily:"Playfair Display, serif", fontSize:20, fontWeight:700,
                  color:"#FFFFFF", lineHeight:1.2,
                }}>{feed.phase}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0, paddingLeft:16 }}>
                <div style={{
                  fontFamily:"Inter, sans-serif", fontSize:10, fontWeight:600,
                  color:"rgba(255,255,255,0.35)", marginBottom:4, letterSpacing:"1px",
                }}>PROGRESS</div>
                <div style={{
                  fontFamily:"Playfair Display, serif", fontSize:26,
                  fontWeight:700, color:"#D4AF37",
                  textShadow:"0 0 20px rgba(212,175,55,0.55)",
                }}>{feed.progress}%</div>
              </div>
            </div>

            {/* Message */}
            <p style={{
              fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:400,
              color:"rgba(255,255,255,0.58)", margin:0, lineHeight:1.65, position:"relative",
            }}>{feed.message}</p>

            {/* Full-width 8px progress bar */}
            <div style={{ position:"relative" }}>
              <div style={{
                height:8, borderRadius:4,
                background:"rgba(255,255,255,0.07)", overflow:"hidden",
              }}>
                <div style={{
                  height:"100%", borderRadius:4,
                  background:"linear-gradient(90deg,#C89B2A,#D4AF37,#F4D06F)",
                  width:`${feed.progress}%`,
                  transition:"width 1.4s cubic-bezier(0.22,1,0.36,1)",
                  boxShadow:"0 0 12px rgba(212,175,55,0.70), 0 0 4px rgba(212,175,55,0.90)",
                }}/>
              </div>
            </div>

            {/* Footer row */}
            <div style={{
              display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{
                  width:6, height:6, borderRadius:"50%", background:"#4ADE80",
                  animation:"ob7BarPulse 1.1s ease-in-out infinite",
                }}/>
                <span style={{
                  fontFamily:"Inter, sans-serif", fontSize:11,
                  color:"rgba(74,222,128,0.85)", fontWeight:700, letterSpacing:"1.5px",
                }}>LIVE</span>
              </div>
              <span style={{
                fontFamily:"Inter, sans-serif", fontSize:11, fontWeight:500,
                color:"rgba(255,255,255,0.42)", letterSpacing:"0.3px",
              }}>Updated {feed.ts || nowTs()}</span>
            </div>
          </div>

          {/* ── Package strip ── */}
          <div style={{
            width:"100%", display:"flex", alignItems:"center",
            justifyContent:"center", gap:0,
            padding:"12px 20px", borderRadius:12,
            background:"rgba(255,255,255,0.025)",
            border:"1px solid rgba(255,255,255,0.06)",
            flexWrap:"wrap",
          }}>
            {[
              { label:"Package", value: packageLabel },
              { label:"Type",    value: experienceType || "Cinematic Song" },
              { label:"For",     value: whoFor || "Myself" },
            ].map(({ label, value }, idx, arr) => (
              <React.Fragment key={label}>
                <div style={{ textAlign:"center", padding:"4px 24px" }}>
                  <div style={{
                    fontFamily:"Inter, sans-serif", fontSize:9, fontWeight:700,
                    color:"rgba(212,175,55,0.58)", letterSpacing:"2px", marginBottom:4,
                  }}>{label.toUpperCase()}</div>
                  <div style={{
                    fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:600,
                    color:"rgba(255,255,255,0.82)",
                  }}>{value}</div>
                </div>
                {idx < arr.length - 1 && (
                  <div style={{ width:1, height:32, background:"rgba(255,255,255,0.08)", flexShrink:0 }}/>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Buttons ── */}
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:12 }}>
            {/* Go To Dashboard */}
            <button
              onClick={handleDashboard}
              disabled={navigating}
              className="ob7-btn-primary"
              style={{
                width:"100%", height:56, borderRadius:14, border:"none",
                cursor: navigating ? "not-allowed" : "pointer",
                background: navigating
                  ? "rgba(212,175,55,0.25)"
                  : "linear-gradient(135deg,#C89B2A 0%,#D4AF37 35%,#F4D06F 65%,#D4AF37 100%)",
                fontFamily:"Inter, sans-serif", fontSize:16, fontWeight:700,
                color: navigating ? "rgba(255,255,255,0.35)" : "#050B1A",
                letterSpacing:"0.6px",
                boxShadow: navigating ? "none" : "0 4px 28px rgba(212,175,55,0.50), 0 1px 0 rgba(255,255,255,0.15) inset",
                transition:"all .22s ease",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              }}
              onMouseEnter={e => {
                if (!navigating) {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px) scale(1.015)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 38px rgba(212,175,55,0.68), 0 1px 0 rgba(255,255,255,0.15) inset";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0) scale(1)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 28px rgba(212,175,55,0.50), 0 1px 0 rgba(255,255,255,0.15) inset";
              }}
            >
              {navigating ? (
                <div style={{
                  width:18, height:18, borderRadius:"50%",
                  border:"2px solid rgba(255,255,255,0.25)",
                  borderTopColor:"rgba(255,255,255,0.75)",
                  animation:"ob7Spin .65s linear infinite",
                }}/>
              ) : (
                <>
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                    <rect x="1" y="1" width="6.5" height="6.5" rx="1.8" fill="#050B1A" opacity=".65"/>
                    <rect x="9.5" y="1" width="6.5" height="6.5" rx="1.8" fill="#050B1A" opacity=".65"/>
                    <rect x="1" y="9.5" width="6.5" height="6.5" rx="1.8" fill="#050B1A" opacity=".65"/>
                    <rect x="9.5" y="9.5" width="6.5" height="6.5" rx="1.8" fill="#050B1A" opacity=".65"/>
                  </svg>
                  Go To Dashboard
                </>
              )}
            </button>

            {/* Refresh Status */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="ob7-btn-secondary"
              style={{
                width:"100%", height:48, borderRadius:14,
                background:"transparent",
                border:`1.5px solid ${refreshing ? "rgba(212,175,55,0.22)" : "rgba(212,175,55,0.48)"}`,
                cursor: refreshing ? "not-allowed" : "pointer",
                fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600,
                color: refreshing ? "rgba(212,175,55,0.38)" : "rgba(212,175,55,0.92)",
                letterSpacing:"0.4px",
                transition:"all .22s ease",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              }}
              onMouseEnter={e => {
                if (!refreshing) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.09)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.80)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px rgba(212,175,55,0.20)";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.48)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              {refreshing ? (
                <>
                  <div style={{
                    width:14, height:14, borderRadius:"50%",
                    border:"1.5px solid rgba(212,175,55,0.22)",
                    borderTopColor:"rgba(212,175,55,0.72)",
                    animation:"ob7Spin .65s linear infinite",
                  }}/>
                  Refreshing…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M13.5 7.5A6 6 0 1 1 7.5 1.5" stroke="rgba(212,175,55,0.88)" strokeWidth="1.6" strokeLinecap="round"/>
                    <polyline points="7.5,1 10.5,1 10.5,4" stroke="rgba(212,175,55,0.88)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Refresh Status
                </>
              )}
            </button>

            {/* Back */}
            <button
              onClick={onBack}
              style={{
                background:"none", border:"none", cursor:"pointer",
                fontFamily:"Inter, sans-serif", fontSize:13,
                color:"rgba(255,255,255,0.28)", textDecoration:"underline",
                textUnderlineOffset:3, padding:"6px 0",
                transition:"color .2s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.58)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"}
            >← Back to Preview</button>

          {/* ── PRODUCTION READY BANNER ── */}
          <div style={{
            marginTop:24,
            padding:"14px 18px",
            borderRadius:12,
            background:"linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.07))",
            border:"1px solid rgba(212,175,55,0.40)",
            textAlign:"center",
          }}>
            <p style={{ fontFamily:"Playfair Display,serif", fontSize:15, fontWeight:700, color:GOLD, margin:"0 0 4px" }}>
              ✦ Your story is ready for production
            </p>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.48)", margin:0, lineHeight:1.5 }}>
              Complete checkout in the next step to lock in today's pricing — your spot is reserved for 24 hours.
            </p>
          </div>

          {/* Continue to Checkout CTA */}
          <button
            onClick={onNext}
            style={{
              marginTop:16,
              width:"100%",
              padding:"16px 32px",
              background:"linear-gradient(135deg,#D4AF37 0%,#F5D06B 50%,#D4AF37 100%)",
              border:"none",
              borderRadius:12,
              cursor:"pointer",
              fontFamily:"Playfair Display, serif",
              fontSize:17,
              fontWeight:700,
              color:"#050B1A",
              letterSpacing:"0.04em",
              boxShadow:"0 0 24px rgba(212,175,55,0.45), 0 4px 16px rgba(0,0,0,0.4)",
              transition:"all .25s",
              position:"relative",
              overflow:"hidden",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "0 0 40px rgba(212,175,55,0.70), 0 6px 24px rgba(0,0,0,0.5)";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "0 0 24px rgba(212,175,55,0.45), 0 4px 16px rgba(0,0,0,0.4)";
              el.style.transform = "translateY(0)";
            }}
          >
            Continue to Checkout →
          </button>
          </div>

          {/* Bottom edge glow */}
          <div style={{
            position:"absolute", bottom:0, left:"20%", right:"20%", height:1,
            background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.30),transparent)",
          }}/>
        </div>
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
//  STEP 8 — CHECKOUT & PAYMENT  (Ghaafeedi Music — v3 CINEMATIC FINAL)
//  Priority: Cinematic sales conversion first. Checkout functionality second.
// ─────────────────────────────────────────────────────────────────────────────

interface S8Package {
  id: string;
  name: string;
  price: number;
  duration: string;
  delivery: string;
  resolution: string;
  audio: string;
  revisions: string;
  features: string[];
}

const S8_PACKAGES: S8Package[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    duration: "3 Songs / Month",
    delivery: "5–7 Business Days",
    resolution: "1080p HD",
    audio: "Stereo Mix",
    revisions: "3 Revisions",
    features: ["AI Story Analysis","Script & Storyboard","Cinematic Video","Premium Music","Voiceover & Narration","High Quality Delivery"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 79,
    duration: "8 Songs / Month",
    delivery: "3–5 Business Days",
    resolution: "4K Ultra HD",
    audio: "Dolby Atmos",
    revisions: "Unlimited Revisions",
    features: ["AI Story Analysis","Script & Storyboard","Cinematic Video","Premium Music","Voiceover & Narration","Priority Delivery","Unlimited Revisions"],
  },
  {
    id: "elite",
    name: "Elite",
    price: 125,
    duration: "15 Songs / Month",
    delivery: "2–3 Business Days",
    resolution: "8K Cinema",
    audio: "Spatial Audio",
    revisions: "Unlimited Revisions",
    features: ["AI Story Analysis","Script & Storyboard","Cinematic Video","Premium Music","Voiceover & Narration","Priority Delivery","Unlimited Revisions","Dedicated Producer","White-Glove Service"],
  },
];

const S8_BNPL_OPTIONS = [
  {
    id: "buynow4",
    label: "Buy Now, Pay Later",
    sub: "4 Interest-Free Payments · 0% APR",
    badge: "MOST POPULAR",
    badgeColor: "#22C55E",
    badgeGlow: "rgba(34,197,94,0.45)",
    summaryLabel: (p: number) => `${(p/4).toFixed(2)} × 4 payments`,
    calc: (p: number) => `${(p/4).toFixed(2)}/payment`,
    detail: (p: number) => `4 payments of ${(p/4).toFixed(2)} — 0% interest · No fees`,
  },
  {
    id: "monthly",
    label: "Monthly Installments",
    sub: "3, 6 or 12 Month Plans · Choose Your Term",
    badge: "FLEXIBLE",
    badgeColor: "#14B8A6",
    badgeGlow: "rgba(20,184,166,0.45)",
    summaryLabel: (p: number, term?: number) => {
      const t = term || 6;
      return `${(p/t).toFixed(2)} × ${t} months`;
    },
    calc: (p: number) => `From ${(p/12).toFixed(2)}/mo`,
    detail: (p: number, term?: number) => {
      const t = term || 6;
      return `${(p/t).toFixed(2)}/mo × ${t} months · Low interest`;
    },
  },
  {
    id: "pay30",
    label: "Pay in 30 Days",
    sub: "Buy today · Pay full amount in 30 days",
    badge: "INTEREST FREE",
    badgeColor: "#34D399",
    badgeGlow: "rgba(52,211,153,0.45)",
    summaryLabel: (p: number) => `${p.toFixed(2)} due ${new Date(Date.now()+30*86400000).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
    calc: (p: number) => `${p.toFixed(2)} in 30 days`,
    detail: (_p: number) => "Pay nothing today · Full payment due in 30 days · No fees",
  },
  {
    id: "pay60",
    label: "Pay in 60 Days",
    sub: "Extended deferred · Maximum flexibility",
    badge: "EXTENDED",
    badgeColor: "#14B8A6",
    badgeGlow: "rgba(20,184,166,0.45)",
    summaryLabel: (p: number) => `${p.toFixed(2)} due ${new Date(Date.now()+60*86400000).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
    calc: (p: number) => `${p.toFixed(2)} in 60 days`,
    detail: (_p: number) => "Pay nothing today · Full payment due in 60 days · No fees",
  },
];


// ─── S8 CSS Animations ────────────────────────────────────────────────────────
function S8Styles() {
  return (
    <style>{`
      @keyframes s8GoldPulse {
        0%,100% { opacity:0.55; transform:scale(1); }
        50%      { opacity:1;    transform:scale(1.15); }
      }
      @keyframes s8LivePing {
        0%   { transform:scale(1);   opacity:0.9; }
        70%  { transform:scale(2.2); opacity:0; }
        100% { transform:scale(2.2); opacity:0; }
      }
      @keyframes s8FloatUp {
        0%,100% { transform:translateY(0px); }
        50%      { transform:translateY(-5px); }
      }
      @keyframes s8Shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes s8CtaShimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes s8Spin {
        from { transform:rotate(0deg); }
        to   { transform:rotate(360deg); }
      }
      @keyframes s8FadeUp {
        from { opacity:0; transform:translateY(6px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes s8CheckPop {
        0%   { transform:scale(0) rotate(-10deg); opacity:0; }
        70%  { transform:scale(1.2) rotate(3deg);  opacity:1; }
        100% { transform:scale(1)   rotate(0deg);  opacity:1; }
      }
      @keyframes s8BadgeGlow {
        0%,100% { box-shadow: 0 0 6px currentColor; }
        50%      { box-shadow: 0 0 14px currentColor; }
      }
      @keyframes s8CardSelect {
        0%   { transform:scale(1); }
        40%  { transform:scale(1.012); }
        100% { transform:scale(1); }
      }
      .s8-bnpl-card { transition: all 0.2s cubic-bezier(.4,0,.2,1); }
      .s8-bnpl-card:hover { transform:translateY(-2px) scale(1.006); }
      .s8-bnpl-card-selected { animation: s8CardSelect 0.2s ease forwards; }
      .s8-method-btn:hover { opacity:1 !important; transform:translateY(-1px); }
      .s8-pkg-card:hover { border-color:rgba(212,175,55,0.5) !important; }
    `}</style>
  );
}

// ─── Cinematic Hero Image ─────────────────────────────────────────────────────
function S8CinematicHero({ height }: { height: number }) {
  return (
    <div style={{
      width:"100%",
      height,
      borderRadius:20,
      border:"1px solid rgba(212,175,55,0.35)",
      boxShadow:"0 0 80px rgba(212,175,55,0.18), 0 32px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.1)",
      position:"relative",
      overflow:"hidden",
      marginBottom:0,
    }}>
      <img
        src="/assets/s8-hero-final.png"
        alt="Ghaafeedi Music — Cinematic Checkout"
        style={{
          width:"100%",
          height:"100%",
          objectFit:"cover",
          objectPosition:"center 35%",
          display:"block",
          borderRadius:20,
        }}
      />
      {/* Bottom vignette */}
      <div style={{
        position:"absolute",bottom:0,left:0,right:0,height:"55%",
        background:"linear-gradient(to top, rgba(5,11,26,0.98) 0%, rgba(5,11,26,0.7) 40%, transparent 100%)",
        pointerEvents:"none",borderRadius:"0 0 20px 20px",
      }}/>
      {/* Top vignette */}
      <div style={{
        position:"absolute",top:0,left:0,right:0,height:"30%",
        background:"linear-gradient(to bottom, rgba(5,11,26,0.6) 0%, transparent 100%)",
        pointerEvents:"none",borderRadius:"20px 20px 0 0",
      }}/>
      {/* Gold border shimmer */}
      <div style={{
        position:"absolute",inset:0,borderRadius:20,
        border:"1px solid rgba(212,175,55,0.2)",pointerEvents:"none",
      }}/>
    </div>
  );
}

// ─── Left Sidebar ─────────────────────────────────────────────────────────────
function S8Sidebar() {
  const trustItems = [
    { icon:"🛡️", label:"Secure Checkout", sub:"256-bit SSL encryption" },
    { icon:"✦",  label:"AI-Powered",       sub:"Emotion-driven creation" },
    { icon:"🎵", label:"Premium Audio",    sub:"Studio-grade quality" },
    { icon:"⭐", label:"5-Star Rated",     sub:"4.9 avg from 2,400+ clients" },
    { icon:"🔄", label:"Money-Back",       sub:"30-day guarantee" },
  ];
  return (
    <div style={{
      width:220, flexShrink:0,
      position:"sticky", top:24,
      display:"flex", flexDirection:"column", gap:12,
    }}>
      {/* Brand logo */}
      <div style={{
        background:"linear-gradient(135deg,rgba(11,23,54,0.95),rgba(5,11,26,0.98))",
        border:"1px solid rgba(212,175,55,0.25)",
        borderRadius:16, padding:"20px 18px", textAlign:"center",
        boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{
          width:52, height:52, borderRadius:14,
          background:"linear-gradient(135deg,#D4AF37,#B8960C)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 12px", boxShadow:"0 0 24px rgba(212,175,55,0.4)",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke="#050B1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="6" cy="18" r="3" fill="#050B1A"/>
            <circle cx="18" cy="16" r="3" fill="#050B1A"/>
          </svg>
        </div>
        <div style={{fontFamily:"Playfair Display, serif",fontSize:15,fontWeight:700,color:"#ffffff",letterSpacing:"0.02em"}}>
          Ghaafeedi Music
        </div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:11,color:"rgba(212,175,55,0.8)",marginTop:4,letterSpacing:"0.06em"}}>
          LUXURY AI MUSIC
        </div>
      </div>

      {/* Trust items */}
      <div style={{
        background:"linear-gradient(135deg,rgba(11,23,54,0.9),rgba(5,11,26,0.95))",
        border:"1px solid rgba(212,175,55,0.15)",
        borderRadius:14, padding:"16px 14px",
        display:"flex", flexDirection:"column", gap:12,
      }}>
        {trustItems.map((item, i) => (
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{
              width:28, height:28, borderRadius:8, flexShrink:0,
              background:"rgba(212,175,55,0.1)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13,
            }}>{item.icon}</div>
            <div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:11,fontWeight:600,color:"#ffffff"}}>{item.label}</div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:1}}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Social proof */}
      <div style={{
        background:"linear-gradient(135deg,rgba(11,23,54,0.85),rgba(5,11,26,0.9))",
        border:"1px solid rgba(212,175,55,0.15)",
        borderRadius:14, padding:"14px 14px",
      }}>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:"rgba(212,175,55,0.7)",letterSpacing:"0.08em",marginBottom:8}}>
          RECENT ORDERS
        </div>
        {[
          { name:"Marcus T.", loc:"New York", time:"2 min ago" },
          { name:"Priya S.",  loc:"London",   time:"8 min ago" },
          { name:"James W.",  loc:"Toronto",  time:"15 min ago" },
        ].map((o, i) => (
          <div key={i} style={{
            display:"flex", alignItems:"center", gap:8, marginBottom: i < 2 ? 8 : 0,
          }}>
            <div style={{
              width:22, height:22, borderRadius:"50%", flexShrink:0,
              background:`linear-gradient(135deg,${["#D4AF37","#22C55E","#4285F4"][i]},${["#B8960C","#16A34A","#1D4ED8"][i]})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:9, fontWeight:700, color:"#050B1A",
            }}>{o.name[0]}</div>
            <div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:"rgba(255,255,255,0.7)"}}>{o.name} <span style={{color:"rgba(255,255,255,0.35)"}}>· {o.loc}</span></div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:9,color:"rgba(212,175,55,0.6)"}}>{o.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Package Selector ────────────────────────────────────────────────────────
function S8PackageSelector({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const packages = [
    { id:"starter", label:"Starter", price:"$49/mo", sub:"3 Songs" },
    { id:"premium", label:"Premium", price:"$79/mo", sub:"8 Songs", popular:true },
    { id:"elite",   label:"Elite",   price:"$125/mo", sub:"15 Songs" },
  ];
  return (
    <div style={{
      background:"linear-gradient(135deg,rgba(11,23,54,0.85),rgba(5,11,26,0.9))",
      border:"1px solid rgba(212,175,55,0.2)",
      borderRadius:16, padding:"20px 20px", marginBottom:20,
    }}>
      <div style={{fontFamily:"Inter,sans-serif",fontSize:11,fontWeight:600,color:"rgba(212,175,55,0.7)",letterSpacing:"0.1em",marginBottom:14}}>
        SELECT YOUR MEMBERSHIP
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10}}>
        {packages.map(pkg => {
          const isSel = selected === pkg.id;
          return (
            <button key={pkg.id}
              className="s8-pkg-card"
              onClick={() => onSelect(pkg.id)}
              style={{
                background: isSel ? "rgba(212,175,55,0.12)" : "rgba(5,11,26,0.5)",
                border: isSel ? "1.5px solid #D4AF37" : "1.5px solid rgba(212,175,55,0.2)",
                borderRadius:12, padding:"12px 8px", cursor:"pointer",
                boxShadow: isSel ? "0 0 18px rgba(212,175,55,0.25)" : "none",
                transition:"all .2s",
                position:"relative", overflow:"hidden",
              }}
            >
              {pkg.popular && (
                <div style={{
                  position:"absolute", top:0, right:0,
                  background:"#D4AF37", borderRadius:"0 11px 0 8px",
                  padding:"2px 6px",
                  fontFamily:"Inter,sans-serif",fontSize:8,fontWeight:700,color:"#050B1A",letterSpacing:"0.05em",
                }}>TOP</div>
              )}
              <div style={{fontFamily:"Playfair Display, serif",fontSize:13,fontWeight:700,color: isSel ? "#D4AF37" : "#ffffff",marginBottom:3}}>
                {pkg.label}
              </div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:700,color: isSel ? "#FFC24D" : "rgba(255,255,255,0.8)"}}>
                {pkg.price}
              </div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>
                {pkg.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Active Package Hero Card ────────────────────────────────────────────────
function S8ActivePackage({ pkg, heroHeight }: { pkg: S8Package; heroHeight: number }) {
  return (
    <div style={{marginBottom:20}}>
      <S8CinematicHero height={heroHeight}/>
      <div style={{
        background:"linear-gradient(135deg,rgba(11,23,54,0.92),rgba(5,11,26,0.97))",
        border:"1px solid rgba(212,175,55,0.25)",
        borderTop:"none",
        borderRadius:"0 0 16px 16px",
        padding:"18px 20px",
        marginTop:0,
        boxShadow:"0 12px 40px rgba(0,0,0,0.5)",
      }}>
        {/* Package title row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap" as const,gap:8,marginBottom:12}}>
          <div>
            <div style={{fontFamily:"Playfair Display, serif",fontSize:20,fontWeight:700,color:"#ffffff"}}>
              {pkg.name} Membership
            </div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:12,color:"rgba(212,175,55,0.8)",marginTop:2}}>
              {pkg.duration}
            </div>
          </div>
          <div style={{textAlign:"right" as const}}>
            <div style={{fontFamily:"Playfair Display, serif",fontSize:26,fontWeight:700,color:"#D4AF37"}}>
              ${pkg.price}
              <span style={{fontFamily:"Inter,sans-serif",fontSize:13,color:"rgba(255,255,255,0.5)",fontWeight:400}}>/mo</span>
            </div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:"rgba(255,255,255,0.35)"}}>
              Billed monthly
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div style={{display:"flex",flexWrap:"wrap" as const,gap:6}}>
          {[
            pkg.delivery, pkg.resolution, pkg.audio, pkg.revisions,
          ].map((f, i) => (
            <span key={i} style={{
              fontFamily:"Inter,sans-serif",fontSize:10,fontWeight:500,
              color:"rgba(255,255,255,0.7)",
              background:"rgba(212,175,55,0.08)",
              border:"1px solid rgba(212,175,55,0.2)",
              borderRadius:20, padding:"3px 10px",
            }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}


const S8_METHODS = [
  { id: "card",   label: "Credit Card",   color: "#D4AF37", bg: "rgba(212,175,55,0.12)" },
  { id: "apple",  label: "Apple Pay",     color: "#FFFFFF", bg: "rgba(0,0,0,0.35)" },
  { id: "google", label: "Google Pay",    color: "#4285F4", bg: "rgba(66,133,244,0.12)" },
  { id: "paypal", label: "PayPal",        color: "#0070BA", bg: "rgba(0,112,186,0.12)"  },
  { id: "bank",   label: "Bank Transfer", color: "#2563EB", bg: "rgba(37,99,235,0.12)" },
  { id: "crypto", label: "Crypto",        color: "#10B981", bg: "rgba(16,185,129,0.12)" },
];

function S8MethodIcon({ id, size=22 }: { id: string; size?: number }) {
  const s = size;
  if (id === "card") return (
    <svg width={s} height={s} viewBox="0 0 32 24" fill="none">
      <rect width="32" height="24" rx="4" fill="#D4AF37"/>
      <rect y="6" width="32" height="6" fill="#B8960C"/>
      <rect x="4" y="16" width="8" height="3" rx="1.5" fill="#050B1A" opacity="0.6"/>
      <rect x="22" y="16" width="6" height="3" rx="1.5" fill="#050B1A" opacity="0.4"/>
    </svg>
  );
  if (id === "apple") return (
    /* Apple Pay — official black pill + white Apple logo + "Pay" wordmark */
    <svg width={s} height={s} viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="38" height="24" rx="4" fill="#000000"/>
      {/* Apple logo */}
      <path d="M13.2 7.6c.55-.67.92-1.6.82-2.53-.8.04-1.76.53-2.33 1.2-.51.59-.96 1.53-.84 2.43.89.07 1.8-.45 2.35-1.1z" fill="white"/>
      <path d="M14.01 8.82c-1.3-.08-2.4.74-3.02.74-.63 0-1.58-.7-2.62-.68-1.35.02-2.6.78-3.28 2-.14.24-.25.5-.33.77-.5 1.56-.2 3.4.62 4.85.41.7.9 1.46 1.53 1.44.61-.02.84-.39 1.58-.39.73 0 .94.39 1.58.38.66-.01 1.09-.69 1.5-1.39.46-.78.65-1.54.66-1.57-.04-.02-1.27-.49-1.28-1.93-.01-1.21.99-1.79 1.03-1.82-.56-.83-1.44-.92-1.75-.94z" fill="white"/>
      {/* "Pay" text */}
      <text x="20" y="16" fontFamily="Arial, Helvetica, sans-serif" fontSize="9" fontWeight="600" fill="white" letterSpacing="0.3">Pay</text>
    </svg>
  );
  if (id === "google") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M21.35 11.1H12v2.87h5.35c-.25 1.37-1.5 4.03-5.35 4.03-3.22 0-5.85-2.67-5.85-5.95S8.78 6.1 12 6.1c1.83 0 3.06.78 3.76 1.46l2.56-2.47C16.58 3.42 14.46 2.5 12 2.5 6.47 2.5 2 6.97 2 12.5S6.47 22.5 12 22.5c5.52 0 9.18-3.88 9.18-9.35 0-.63-.07-1.1-.18-1.55h-.65z" fill="none"/>
      <path d="M3.15 8.35l2.7 1.98C6.74 8.3 8.23 7.1 12 7.1c1.83 0 3.06.78 3.76 1.46l2.56-2.47C16.58 3.42 14.46 2.5 12 2.5c-3.86 0-7.16 2.21-8.85 5.85z" fill="#EA4335"/>
      <path d="M12 22.5c2.4 0 4.41-.79 5.88-2.14l-2.72-2.23c-.77.52-1.76.87-3.16.87-3.21 0-5.93-2.17-6.9-5.1L2.21 15.8C3.87 19.6 7.66 22.5 12 22.5z" fill="#34A853"/>
      <path d="M21.35 11.1H12v2.87h5.35c-.6 1.61-1.92 2.85-3.74 3.44l2.72 2.23c1.6-1.48 2.67-3.67 2.67-6.54 0-.63-.07-1.1-.18-1.55h-.47z" fill="#4285F4"/>
      <path d="M3.15 8.35C4.04 6.33 5.73 4.75 7.83 3.88L10.19 6.1C9.06 6.52 8.12 7.28 7.5 8.28L3.15 8.35z" fill="#FBBC05"/>
    </svg>
  );
  if (id === "paypal") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M7.5 21.5H4.4l2.6-16h5.6c2.3 0 3.9 1.1 3.9 3.2 0 3.5-2.9 5.3-5.9 5.3H8.6L7.5 21.5zm1.3-8.5h1.6c1.7 0 3.2-.8 3.2-2.7 0-1-.7-1.7-2.1-1.7h-1.7L8.8 13z" fill="#003087"/>
      <path d="M19 8.5c.1.5.1 1.1 0 1.7-.7 3.4-3.1 5.1-6.3 5.1h-1.8L10 21.5H7.1l2.1-12.5h5.7c2.5 0 4 1.1 4.2 3.5h-.1z" fill="#0070BA"/>
    </svg>
  );
  if (id === "bank") return (
    /* Bank Transfer — industry standard blue (#1D4ED8 / #2563EB) */
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Roof / pediment */}
      <path d="M2.5 10.5L12 3.5l9.5 7v1H2.5v-1z" fill="#1D4ED8"/>
      {/* Columns */}
      <rect x="4.5"  y="12" width="2.2" height="6" rx="0.5" fill="#2563EB"/>
      <rect x="8.9"  y="12" width="2.2" height="6" rx="0.5" fill="#2563EB"/>
      <rect x="13.3" y="12" width="2.2" height="6" rx="0.5" fill="#2563EB"/>
      <rect x="17.3" y="12" width="2.2" height="6" rx="0.5" fill="#2563EB"/>
      {/* Base */}
      <rect x="2.5" y="18.5" width="19" height="2" rx="1" fill="#1D4ED8"/>
      {/* Highlight stripe on pediment */}
      <rect x="2.5" y="10.5" width="19" height="1" rx="0.4" fill="#3B82F6" opacity="0.5"/>
    </svg>
  );
  if (id === "crypto") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth="1.5"/>
      <path d="M9 8h4.5c1.1 0 2 .9 2 2s-.9 2-2 2H9V8zm0 4h5c1.1 0 2 .9 2 2s-.9 2-2 2H9v-4zm2-5v-1m2 0v1m-2 10v1m2 0v-1" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  return null;
}

function S8DodoPaymentModule({
  bnplOption,
  onBnplSelect,
  payNowMethod,
  onMethodSelect,
  pkg,
  submitState,
  onSubmit,
  isMobile,
}: {
  bnplOption: string | null;
  onBnplSelect: (id: string) => void;
  payNowMethod: string;
  onMethodSelect: (id: string) => void;
  pkg: S8Package;
  submitState: "idle"|"loading"|"success"|"error";
  onSubmit: () => void;
  isMobile: boolean;
}) {
  const [activeTab,    setActiveTab]   = React.useState<"now"|"later">("now");
  const [cardName,     setCardName]    = React.useState("");
  const [cardNum,      setCardNum]     = React.useState("");
  const [expiry,       setExpiry]      = React.useState("");
  const [cvc,          setCvc]         = React.useState("");
  const [errors,       setErrors]      = React.useState<Record<string,string>>({});
  const [submitted,    setSubmitted]   = React.useState(false);
  const [monthlyTerm,  setMonthlyTerm] = React.useState<3|6|12>(6); // P4 — monthly term selector
  const submitLock = React.useRef(false);

  const subtotal  = pkg.price;
  const aiFee     = 9;
  const rendering = 12;
  const tax       = +(subtotal * 0.085).toFixed(2);
  const total     = subtotal + aiFee + rendering + tax;

  const selBnpl = S8_BNPL_OPTIONS.find(o => o.id === bnplOption);
  // P6 — dynamic summary amount based on selected BNPL + term
  const bnplSummaryLabel = selBnpl
    ? (selBnpl.summaryLabel as (p: number, t?: number) => string)(total, bnplOption === "monthly" ? monthlyTerm : undefined)
    : "";
  const bnplDetailLabel = selBnpl
    ? (selBnpl.detail as (p: number, t?: number) => string)(total, bnplOption === "monthly" ? monthlyTerm : undefined)
    : "";

  // ── Validation ──
  const validate = () => {
    const e: Record<string,string> = {};
    if (activeTab === "now" && payNowMethod === "card") {
      if (!cardName.trim()) e.cardName = "Cardholder name is required";
      if (!/^\d{16}$/.test(cardNum.replace(/\s/g,""))) e.cardNum = "Enter a valid 16-digit card number";
      if (!/^\d{2}\/\d{2}$/.test(expiry)) e.expiry = "Use MM/YY format";
      if (!/^\d{3,4}$/.test(cvc)) e.cvc = "Enter 3 or 4 digit CVV";
    }
    if (activeTab === "later" && !bnplOption) e.bnpl = "Select a financing option";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (!validate()) return;
    if (submitLock.current) return;
    submitLock.current = true;
    onSubmit();
    setTimeout(() => { submitLock.current = false; }, 3000);
  };

  React.useEffect(() => {
    if (submitted) validate();
  }, [cardName, cardNum, expiry, cvc, bnplOption, activeTab]);

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%", padding: "13px 16px",
    background: errors[field] ? "rgba(239,68,68,0.08)" : "rgba(5,11,26,0.7)",
    border: `1px solid ${errors[field] ? "#EF4444" : "rgba(212,175,55,0.2)"}`,
    borderRadius: 10, color: "#ffffff",
    fontFamily: "Inter,sans-serif", fontSize: 14,
    outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.2s ease",
  });

  const labelStyle: React.CSSProperties = {
    fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 600,
    color: "rgba(212,175,55,0.65)", letterSpacing: "0.1em",
    textTransform: "uppercase" as const, display: "block", marginBottom: 6,
  };

  const errStyle: React.CSSProperties = {
    fontFamily: "Inter,sans-serif", fontSize: 11, color: "#EF4444",
    marginTop: 4, display: "block",
  };

  return (
    <div style={{
      borderRadius: 20,
      border: "1px solid rgba(212,175,55,0.2)",
      background: "linear-gradient(180deg, rgba(11,23,54,0.97) 0%, rgba(5,11,26,0.99) 100%)",
      boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.12), 0 0 60px rgba(212,175,55,0.06)",
      overflow: "hidden",
    }}>

      {/* ── Dodo Branding Header ── */}
      <div style={{
        padding: "18px 24px 16px",
        borderBottom: "1px solid rgba(212,175,55,0.1)",
        background: "linear-gradient(135deg, rgba(34,197,94,0.05) 0%, rgba(20,184,166,0.04) 50%, transparent 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap" as const, gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Dodo Payments official bird logo */}
          <div style={{
            width: 54, height: 54, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(145deg, #0b2218 0%, #071812 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 22px rgba(34,197,94,0.32), 0 0 0 1.5px rgba(34,197,94,0.22), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="dodoBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#22C55E"/>
                  <stop offset="100%" stopColor="#14B8A6"/>
                </linearGradient>
                <linearGradient id="dodoWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#16a34a"/>
                  <stop offset="100%" stopColor="#0d9488"/>
                </linearGradient>
              </defs>
              {/* Body — large, plump, classic Dodo */}
              <ellipse cx="48" cy="65" rx="30" ry="27" fill="url(#dodoBodyGrad)"/>
              {/* Underbelly — lighter shade */}
              <ellipse cx="50" cy="70" rx="18" ry="16" fill="rgba(255,255,255,0.12)"/>
              {/* Head */}
              <circle cx="70" cy="35" r="16" fill="url(#dodoBodyGrad)"/>
              {/* Neck connect */}
              <path d="M58 46 Q62 38 68 36 Q65 50 55 58z" fill="url(#dodoBodyGrad)"/>
              {/* Beak — large, hooked Dodo beak */}
              <path d="M83 29 Q96 26 97 33 Q95 40 85 38 Q89 34 83 29z" fill="#14B8A6"/>
              <path d="M83 34 Q94 32 95 38 Q92 43 84 40 Q87 37 83 34z" fill="#0f766e"/>
              {/* Upper beak hook */}
              <path d="M90 27 Q97 24 97 28 Q96 31 91 30z" fill="#0d9488"/>
              {/* Eye */}
              <circle cx="74" cy="31" r="5" fill="white"/>
              <circle cx="75" cy="31" r="3" fill="#071225"/>
              <circle cx="76.2" cy="29.8" r="1.1" fill="white"/>
              {/* Wing — tiny, stubby Dodo wing */}
              <ellipse cx="28" cy="60" rx="12" ry="7" fill="url(#dodoWingGrad)" transform="rotate(-25 28 60)"/>
              <ellipse cx="28" cy="60" rx="8" ry="4.5" fill="rgba(34,197,94,0.5)" transform="rotate(-25 28 60)"/>
              {/* Tail feathers — fluffy tuft */}
              <path d="M20 53 Q10 44 13 37 Q19 48 23 51z" fill="#14B8A6"/>
              <path d="M18 58 Q7 53 9 44 Q16 54 21 56z" fill="#22C55E" opacity="0.85"/>
              <path d="M19 64 Q8 63 10 54 Q17 62 21 63z" fill="#14B8A6" opacity="0.75"/>
              <path d="M22 68 Q12 70 13 62 Q19 68 23 67z" fill="#22C55E" opacity="0.6"/>
              {/* Legs */}
              <rect x="43" y="89" width="6" height="9" rx="3" fill="#14B8A6"/>
              <rect x="54" y="89" width="6" height="9" rx="3" fill="#14B8A6"/>
              {/* Feet — 3-toed */}
              <path d="M41 97 Q36 100 33 98 Q36 94 43 95z" fill="#22C55E"/>
              <path d="M44 98 Q41 102 38 101 Q40 97 45 97z" fill="#16a34a"/>
              <path d="M55 97 Q50 100 47 99 Q50 95 56 96z" fill="#22C55E"/>
              <path d="M58 97 Q63 100 66 98 Q63 94 56 95z" fill="#22C55E"/>
              <path d="M62 98 Q66 101 69 100 Q67 97 60 97z" fill="#16a34a"/>
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em", background: "linear-gradient(90deg,#22C55E,#14B8A6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Dodo</span>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>Payments</span>
            </div>
            <div style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
              Secure payment powered by Dodo
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* P1 — Live indicator with #34D399 trust color + ping animation */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 20, padding: "4px 10px 4px 7px" }}>
            <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34D399", boxShadow: "0 0 10px rgba(52,211,153,1), 0 0 4px rgba(52,211,153,0.8)" }}/>
              <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderRadius: "50%", background: "rgba(52,211,153,0.5)", animation: "s8LivePing 1.4s ease-out infinite" }}/>
            </div>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "#34D399", fontWeight: 800, letterSpacing: "0.08em" }}>LIVE</span>
          </div>
          {/* P1 — TLS badge with #14B8A6 */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.25)", borderRadius: 8, padding: "4px 9px" }}>
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
              <rect x="0.5" y="4" width="9" height="7.5" rx="2" fill="none" stroke="#14B8A6" strokeWidth="1.2"/>
              <path d="M2 4V3a3 3 0 016 0v1" stroke="#14B8A6" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="5" cy="8" r="1.2" fill="#14B8A6"/>
            </svg>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "#14B8A6", fontWeight: 700 }}>TLS 1.3</span>
          </div>
          {/* P1 — PCI DSS badge with gold glow */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(212,175,55,0.09)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, padding: "4px 9px", boxShadow: "0 0 8px rgba(212,175,55,0.1)" }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L1.5 3v4c0 2.2 1.9 4.2 4.5 4.7C8.6 11.2 10.5 9.2 10.5 7V3L6 1z" fill="none" stroke="#D4AF37" strokeWidth="1.3"/>
              <path d="M3.5 6l1.5 1.5 3-3" stroke="#D4AF37" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "#D4AF37", fontWeight: 700 }}>PCI DSS</span>
          </div>
        </div>
      </div>

      {/* ── Tab Switch: Pay Now / Buy Now Pay Later ── */}
      <div style={{ padding: "18px 24px 0" }}>
        <div style={{
          display: "flex",
          background: "rgba(5,11,26,0.8)",
          borderRadius: 14, padding: 4,
          border: "1px solid rgba(212,175,55,0.1)",
          marginBottom: 22,
        }}>
          {(["now","later"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "12px 0",
                borderRadius: 11, border: "none",
                background: activeTab === tab
                  ? "linear-gradient(135deg, #D4AF37 0%, #F4D06F 50%, #D4AF37 100%)"
                  : "transparent",
                color: activeTab === tab ? "#050B1A" : "rgba(255,255,255,0.45)",
                fontFamily: "Inter,sans-serif", fontSize: isMobile ? 12 : 13, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.02em",
                boxShadow: activeTab === tab ? "0 4px 18px rgba(212,175,55,0.4)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {tab === "now" ? "Pay Now" : "Buy Now Pay Later"}
            </button>
          ))}
        </div>

        {/* ══════════════ BUY NOW PAY LATER TAB ══════════════ */}
        {activeTab === "later" && (
          <div style={{ animation: "s8FadeUp 0.25s ease" }}>
            <div style={{
              fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 600,
              color: "rgba(212,175,55,0.7)", letterSpacing: "0.12em",
              textTransform: "uppercase" as const, marginBottom: 14,
            }}>Choose Your Financing Plan</div>

            {errors.bnpl && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#EF4444" }}>{errors.bnpl}</span>
              </div>
            )}

            {/* ── BNPL Cards — P2: larger, P3: badges, P5: gold glow, P7: depth ── */}
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 20 }}>
              {S8_BNPL_OPTIONS.map(opt => {
                const isSel = bnplOption === opt.id;
                const cardH = isMobile ? 92 : 108; // P2 — responsive heights
                return (
                  <div key={opt.id}>
                    <div
                      className={`s8-bnpl-card${isSel ? " s8-bnpl-card-selected" : ""}`}
                      onClick={() => onBnplSelect(opt.id)}
                      style={{
                        minHeight: cardH, borderRadius: 16, padding: "0 20px", // P2
                        border: `2px solid ${isSel ? "#D4AF37" : "rgba(255,255,255,0.07)"}`,
                        background: isSel
                          ? "linear-gradient(135deg, rgba(212,175,55,0.13) 0%, rgba(17,34,85,0.95) 60%, rgba(5,11,26,0.98) 100%)"
                          : "linear-gradient(180deg, rgba(11,20,48,0.7) 0%, rgba(5,11,26,0.85) 100%)",
                        // P7 — subtle card depth
                        boxShadow: isSel
                          ? "0 0 0 1px rgba(212,175,55,0.18), 0 0 32px rgba(212,175,55,0.22), 0 12px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(212,175,55,0.1)"
                          : "0 2px 8px rgba(0,0,0,0.3), 0 6px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 14,
                        position: "relative" as const,
                        transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
                      }}
                    >
                      {/* P5 — Gold check circle */}
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${isSel ? "#D4AF37" : "rgba(255,255,255,0.18)"}`,
                        background: isSel ? "linear-gradient(135deg,#D4AF37 0%,#B8960C 100%)" : "rgba(5,11,26,0.6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: isSel ? "0 0 12px rgba(212,175,55,0.6), 0 0 4px rgba(212,175,55,0.4)" : "none",
                        transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
                      }}>
                        {isSel && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: "s8CheckPop 0.2s cubic-bezier(.4,0,.2,1)" }}>
                            <path d="M2 6l3 3 5-5" stroke="#050B1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      {/* Label + badge + sub */}
                      <div style={{ flex: 1, minWidth: 0, padding: "18px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" as const }}>
                          <span style={{
                            fontFamily: "Inter,sans-serif", fontSize: isMobile ? 13 : 14,
                            fontWeight: 700, color: isSel ? "#D4AF37" : "rgba(255,255,255,0.92)",
                            transition: "color 0.2s ease",
                          }}>{opt.label}</span>
                          {/* P3 — enhanced badge */}
                          <span style={{
                            fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 700,
                            color: "#fff",
                            background: opt.badgeColor,
                            borderRadius: 999, // P3 — pill shape
                            padding: "4px 10px",
                            height: 22, lineHeight: "14px",
                            display: "inline-flex", alignItems: "center",
                            letterSpacing: "0.06em",
                            boxShadow: `0 0 8px ${opt.badgeGlow}, 0 2px 6px rgba(0,0,0,0.3)`, // P3 — glow
                          }}>{opt.badge}</span>
                        </div>
                        <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{opt.sub}</div>
                      </div>

                      {/* P6 — Dynamic amount display */}
                      <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                        <div style={{
                          fontFamily: "Playfair Display, serif", fontSize: isMobile ? 13 : 15,
                          fontWeight: 700, color: isSel ? "#D4AF37" : "rgba(255,255,255,0.65)",
                          transition: "color 0.2s ease",
                        }}>
                          {opt.id === "monthly"
                            ? `${(total / monthlyTerm).toFixed(2)}/mo`
                            : opt.calc(total)}
                        </div>
                        {opt.id === "monthly" && (
                          <div style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                            × {monthlyTerm} months
                          </div>
                        )}
                      </div>
                    </div>

                    {/* P4 — Monthly term selector (expands when monthly is selected) */}
                    {opt.id === "monthly" && isSel && (
                      <div style={{
                        margin: "6px 2px 0",
                        background: "linear-gradient(135deg, rgba(20,184,166,0.06) 0%, rgba(5,11,26,0.8) 100%)",
                        border: "1px solid rgba(20,184,166,0.2)",
                        borderRadius: 14,
                        padding: "14px 18px",
                        animation: "s8FadeUp 0.2s ease",
                      }}>
                        <div style={{ fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(20,184,166,0.8)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>
                          Select Term
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                          {([3, 6, 12] as const).map(term => {
                            const isTerm = monthlyTerm === term;
                            return (
                              <button
                                key={term}
                                onClick={e => { e.stopPropagation(); setMonthlyTerm(term); }}
                                style={{
                                  borderRadius: 10, padding: "10px 8px",
                                  border: `1.5px solid ${isTerm ? "#14B8A6" : "rgba(255,255,255,0.1)"}`,
                                  background: isTerm ? "rgba(20,184,166,0.15)" : "rgba(5,11,26,0.6)",
                                  cursor: "pointer", textAlign: "center" as const,
                                  boxShadow: isTerm ? "0 0 12px rgba(20,184,166,0.3)" : "none",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 15, fontWeight: 700, color: isTerm ? "#14B8A6" : "rgba(255,255,255,0.7)" }}>
                                  ${(total / term).toFixed(2)}
                                </div>
                                <div style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: isTerm ? "rgba(20,184,166,0.8)" : "rgba(255,255,255,0.35)", marginTop: 2 }}>
                                  /mo × {term}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 10, textAlign: "center" as const }}>
                          Total: ${total.toFixed(2)} · Low interest · No hidden fees
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* P6 — Dynamic order summary panel when BNPL option selected */}
            {selBnpl && (
              <div style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(11,23,54,0.8) 100%)",
                border: "1px solid rgba(34,197,94,0.22)",
                borderRadius: 14, padding: "16px 20px", marginBottom: 18,
                animation: "s8FadeUp 0.2s ease",
                boxShadow: "0 4px 20px rgba(34,197,94,0.06), 0 8px 24px rgba(0,0,0,0.3)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1L1.5 3.8v3.7c0 3 2.2 5.7 5.5 6 3.3-.3 5.5-3 5.5-6V3.8L7 1z" fill="none" stroke="#22C55E" strokeWidth="1.2"/>
                        <path d="M4 7l2 2 4-4" stroke="#22C55E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#22C55E", fontWeight: 700 }}>
                        {selBnpl.label}
                      </span>
                    </div>
                    <div style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                      {bnplDetailLabel}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                    <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: "#D4AF37", lineHeight: 1 }}>
                      {bnplSummaryLabel}
                    </div>
                    <div style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                      Order total: ${total.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BNPL CTA */}
            <button
              className="s8-cta-btn"
              onClick={handleSubmit}
              disabled={submitState === "loading" || submitState === "success"}
              style={{
                width: "100%", height: 60, borderRadius: 16, border: "none",
                background: !bnplOption
                  ? "rgba(60,60,60,0.4)"
                  : submitState === "success"
                  ? "linear-gradient(135deg,#22C55E,#14B8A6)"
                  : "linear-gradient(135deg, #D4AF37 0%, #F4D06F 50%, #D4AF37 100%)",
                color: !bnplOption ? "rgba(255,255,255,0.3)" : "#050B1A",
                fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 800,
                letterSpacing: "0.03em",
                cursor: !bnplOption || submitState === "loading" || submitState === "success" ? "not-allowed" : "pointer",
                boxShadow: !bnplOption ? "none" : "0 8px 32px rgba(212,175,55,0.4)",
                animation: !bnplOption || submitState !== "idle" ? "none" : "s8CtaShimmer 3s linear infinite",
                marginBottom: 12,
                transition: "all 0.2s ease",
              }}
            >
              {submitState === "loading" ? "Processing..." : submitState === "success" ? "✓ Financing Applied!" : "Apply Financing & Continue →"}
            </button>
            <div style={{ textAlign: "center" as const, fontFamily: "Inter,sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", paddingBottom: 4 }}>
              Powered by Dodo · No hidden fees · Cancel anytime
            </div>
          </div>
        )}

        {/* ══════════════ PAY NOW TAB ══════════════ */}
        {activeTab === "now" && (
          <div style={{ animation: "s8FadeUp 0.25s ease" }}>

            {/* Payment method grid */}
            <div style={{ fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 600, color: "rgba(212,175,55,0.7)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 12 }}>
              Payment Method
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 22 }}>
              {S8_METHODS.map(m => {
                const isSel = payNowMethod === m.id;
                return (
                  <div
                    key={m.id}
                    className="s8-method-card"
                    onClick={() => onMethodSelect(m.id)}
                    style={{
                      height: 66, borderRadius: 14, position: "relative" as const,
                      border: `2px solid ${isSel ? "#D4AF37" : "rgba(255,255,255,0.07)"}`,
                      background: isSel ? m.bg : "rgba(5,11,26,0.55)",
                      boxShadow: isSel ? `0 0 18px ${m.color}33, 0 4px 16px rgba(0,0,0,0.4)` : "0 2px 8px rgba(0,0,0,0.3)",
                      display: "flex", flexDirection: "column" as const,
                      alignItems: "center", justifyContent: "center", gap: 5,
                      cursor: "pointer", transition: "all 0.15s ease",
                    }}
                  >
                    {isSel && (
                      <div style={{ position: "absolute", top: 5, right: 5, width: 14, height: 14, borderRadius: "50%", background: "#D4AF37", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="#050B1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    <S8MethodIcon id={m.id} size={22}/>
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: 9, fontWeight: 700, color: isSel ? m.color : "rgba(255,255,255,0.45)", textAlign: "center" as const, lineHeight: 1.2, letterSpacing: "0.03em" }}>{m.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Card Form */}
            {payNowMethod === "card" && (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 14, marginBottom: 20, animation: "s8FadeUp 0.2s ease" }}>
                <div>
                  <label style={labelStyle}>Cardholder Name</label>
                  <input
                    style={inputStyle("cardName")}
                    placeholder="Full name on card"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                  />
                  {errors.cardName && <span style={errStyle}>{errors.cardName}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Card Number</label>
                  <input
                    style={inputStyle("cardNum")}
                    placeholder="1234 5678 9012 3456"
                    value={cardNum}
                    maxLength={19}
                    onChange={e => setCardNum(e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim())}
                  />
                  {errors.cardNum && <span style={errStyle}>{errors.cardNum}</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Expiry Date</label>
                    <input
                      style={inputStyle("expiry")}
                      placeholder="MM/YY"
                      value={expiry}
                      maxLength={5}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g,"");
                        setExpiry(v.length >= 2 ? v.slice(0,2)+"/"+v.slice(2,4) : v);
                      }}
                    />
                    {errors.expiry && <span style={errStyle}>{errors.expiry}</span>}
                  </div>
                  <div>
                    <label style={labelStyle}>CVV</label>
                    <input
                      style={inputStyle("cvc")}
                      placeholder="•••"
                      value={cvc}
                      maxLength={4}
                      onChange={e => setCvc(e.target.value.replace(/\D/g,""))}
                    />
                    {errors.cvc && <span style={errStyle}>{errors.cvc}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Non-card placeholder */}
            {payNowMethod !== "card" && (
              <div style={{
                background: "rgba(5,11,26,0.5)", border: "1px dashed rgba(212,175,55,0.18)",
                borderRadius: 12, padding: "20px", textAlign: "center" as const, marginBottom: 20,
                animation: "s8FadeUp 0.2s ease",
              }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                  {S8_METHODS.find(m => m.id === payNowMethod)?.label} will open in a secure window
                </span>
              </div>
            )}

            {/* Order Summary */}
            <div style={{
              background: "rgba(5,11,26,0.65)", borderRadius: 12,
              border: "1px solid rgba(212,175,55,0.1)", padding: "14px 18px", marginBottom: 18,
            }}>
              {[
                { label: "Subtotal",             val: `$${subtotal.toFixed(2)}` },
                { label: "AI Processing Fee",     val: `$${aiFee.toFixed(2)}` },
                { label: "Premium Rendering",     val: `$${rendering.toFixed(2)}` },
                { label: "Tax (8.5%)",            val: `$${tax.toFixed(2)}` },
              ].map(({ label, val }, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{label}</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{val}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "rgba(212,175,55,0.12)", margin: "8px 0" }}/>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "Playfair Display,serif", fontSize: 14, fontWeight: 700, color: "#D4AF37" }}>Total</span>
                <span style={{ fontFamily: "Playfair Display,serif", fontSize: 22, fontWeight: 700, color: "#D4AF37" }}>${total.toFixed(2)}</span>
              </div>
              <div style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 5 }}>Billed monthly · Cancel anytime · Prices in USD</div>
            </div>

            {/* CTA */}
            <button
              className="s8-cta-btn"
              onClick={handleSubmit}
              disabled={submitState === "loading" || submitState === "success"}
              style={{
                width: "100%", height: 60, borderRadius: 16, border: "none",
                background: submitState === "success"
                  ? "linear-gradient(135deg,#22C55E,#14B8A6)"
                  : submitState === "loading"
                  ? "rgba(212,175,55,0.5)"
                  : "linear-gradient(135deg, #D4AF37 0%, #F4D06F 50%, #D4AF37 100%)",
                color: "#050B1A",
                fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 800,
                letterSpacing: "0.03em",
                cursor: submitState === "loading" || submitState === "success" ? "not-allowed" : "pointer",
                boxShadow: submitState === "idle" ? "0 8px 32px rgba(212,175,55,0.42), 0 0 60px rgba(212,175,55,0.12)" : "none",
                animation: submitState === "idle" ? "s8CtaShimmer 3s linear infinite" : "none",
                marginBottom: 12, transition: "all 0.2s ease",
              }}
            >
              {submitState === "loading"
                ? "Processing..."
                : submitState === "success"
                ? "✓ Order Confirmed!"
                : "Continue Secure Checkout →"}
            </button>

            {/* Enterprise Security Row */}
            <div style={{
              background: "linear-gradient(135deg, rgba(20,184,166,0.04) 0%, rgba(5,11,26,0.5) 100%)",
              border: "1px solid rgba(20,184,166,0.12)",
              borderRadius: 12, padding: "12px 16px", marginTop: 4,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
                <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
                  <path d="M6 1L1 3.5v4C1 10.5 3.2 12.7 6 13c2.8-.3 5-2.5 5-5.5v-4L6 1z" fill="none" stroke="#14B8A6" strokeWidth="1.1"/>
                  <path d="M3.5 6.5l1.8 1.8 3-3" stroke="#14B8A6" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 700, color: "#14B8A6", letterSpacing: "0.08em" }}>ENTERPRISE PAYMENT SECURITY</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[
                  { label: "TLS 1.3", sub: "End-to-end", color: "#14B8A6" },
                  { label: "PCI DSS", sub: "Compliant", color: "#22C55E" },
                  { label: "Tokenized", sub: "Card data", color: "#14B8A6" },
                  { label: "CSRF", sub: "Protected", color: "#22C55E" },
                  { label: "Rate Limit", sub: "Enforced", color: "#14B8A6" },
                  { label: "No Double", sub: "Charge", color: "#22C55E" },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: "center" as const, padding: "6px 4px", background: "rgba(5,11,26,0.4)", borderRadius: 8, border: "1px solid rgba(20,184,166,0.13)" }}>
                    <div style={{ fontFamily: "Inter,sans-serif", fontSize: 9, fontWeight: 800, color: item.color, letterSpacing: "0.04em" }}>{item.label}</div>
                    <div style={{ fontFamily: "Inter,sans-serif", fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: "Inter,sans-serif", fontSize: 9, color: "rgba(255,255,255,0.25)", textAlign: "center" as const, marginTop: 8 }}>
                Fraud monitoring · Audit logging · Server-side validation · Secure session
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 20 }}/>
      </div>
    </div>
  );
}

// ─── Order Review Panel (sticky right col) ────────────────────────────────────
function S8OrderReview({ pkg, addons, onRemoveAddon, isMobile }: { pkg: S8Package; addons: CartAddonItem[]; onRemoveAddon: (id: string) => void; isMobile: boolean }) {
  const subtotal     = pkg.price;
  const addonsTotal  = addons.reduce((sum, a) => sum + a.price, 0);
  const aiFee        = 9;
  const rendering    = 12;
  const tax          = +((subtotal + addonsTotal) * 0.085).toFixed(2);
  const total        = subtotal + addonsTotal + aiFee + rendering + tax;

  return (
    <div style={{
      width: isMobile ? "100%" : 360, flexShrink:0,
      position: isMobile ? "relative" : "sticky", top:40, alignSelf:"flex-start",
      background:"linear-gradient(180deg, rgba(11,23,54,0.97) 0%, rgba(5,11,26,0.99) 100%)",
      border:"1px solid rgba(212,175,55,0.25)",
      borderRadius:20,
      overflow:"hidden",
      boxShadow:"0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.1)",
    }}>
      {/* Panel header */}
      <div style={{padding:"22px 24px 18px",borderBottom:"1px solid rgba(212,175,55,0.12)"}}>
        <div style={{fontFamily:"Playfair Display, serif",fontSize:20,fontWeight:700,color:"#ffffff",marginBottom:2}}>Order Review</div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:12,color:"rgba(212,175,55,0.6)"}}>Cinematic Music Experience</div>
      </div>

      {/* Preview thumbnail */}
      <div style={{padding:"18px 24px 0"}}>
        <div style={{
          borderRadius:12,height:160,
          background:"linear-gradient(180deg, #010408 0%, #050B1A 30%, #0B1736 70%, #050B1A 100%)",
          border:"1px solid rgba(212,175,55,0.2)",
          position:"relative" as const,overflow:"hidden",
          boxShadow:"0 4px 20px rgba(0,0,0,0.5)",
          display:"flex",alignItems:"center",justifyContent:"center",
        }}>
          {/* Mini portal */}
          <div style={{
            width:56,height:56,borderRadius:"50%",
            border:"2px solid rgba(212,175,55,0.7)",
            boxShadow:"0 0 20px rgba(212,175,55,0.4)",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            <div style={{
              width:38,height:38,borderRadius:"50%",
              background:"radial-gradient(circle,rgba(212,175,55,0.4) 0%,transparent 70%)",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <polygon points="5,3 19,12 5,21" fill="#D4AF37" opacity="0.9"/>
              </svg>
            </div>
          </div>
          <div style={{position:"absolute",bottom:8,left:0,right:0,textAlign:"center" as const}}>
            <span style={{fontFamily:"Inter,sans-serif",fontSize:9,fontWeight:600,color:"rgba(212,175,55,0.6)",letterSpacing:"0.15em",textTransform:"uppercase" as const}}>Cinematic Preview</span>
          </div>
          {/* Mini city skyline */}
          <svg style={{position:"absolute",bottom:0,left:0,width:"100%"}} viewBox="0 0 360 40" preserveAspectRatio="none">
            <path d="M0,40 L0,28 L20,28 L20,20 L30,20 L30,14 L38,14 L38,20 L50,20 L50,26 L70,26 L70,16 L80,16 L80,10 L88,10 L88,16 L100,16 L100,24 L120,24 L120,14 L132,14 L132,8 L140,8 L140,14 L150,14 L150,22 L170,22 L170,14 L180,14 L180,22 L200,22 L200,12 L210,12 L210,6 L220,6 L220,12 L230,12 L230,20 L250,20 L250,28 L270,28 L270,18 L280,18 L280,10 L290,10 L290,18 L302,18 L302,25 L320,25 L320,15 L330,15 L330,8 L340,8 L340,15 L350,15 L350,22 L360,22 L360,40 Z" fill="rgba(11,23,54,0.95)"/>
          </svg>
        </div>

        {/* Package details */}
        <div style={{marginTop:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontFamily:"Playfair Display, serif",fontSize:16,fontWeight:700,color:"#ffffff"}}>{pkg.name} Plan</div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:12,color:"rgba(212,175,55,0.6)",marginTop:2}}>{pkg.duration}</div>
            </div>
            <div style={{background:"linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))",border:"1px solid rgba(212,175,55,0.3)",borderRadius:8,padding:"4px 10px"}}>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:11,color:"#D4AF37",fontWeight:600}}>Active</span>
            </div>
          </div>

          {/* Spec list */}
          {[
            {label:"Resolution",val:pkg.resolution},
            {label:"Audio",val:pkg.audio},
            {label:"Revisions",val:pkg.revisions},
            {label:"Delivery",val:pkg.delivery},
          ].map(({label,val},i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:"rgba(255,255,255,0.45)"}}>{label}</span>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.8)"}}>{val}</span>
            </div>
          ))}
        </div>

        {/* Add-ons list (if any) */}
        {addons.length > 0 && (
          <div style={{marginTop:16,background:"rgba(212,175,55,0.04)",border:"1px solid rgba(212,175,55,0.15)",borderRadius:12,padding:"12px 16px"}}>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:10,fontWeight:700,color:"rgba(212,175,55,0.6)",letterSpacing:"0.1em",marginBottom:10,textTransform:"uppercase" as const}}>
              Add-Ons ({addons.length})
            </div>
            {addons.map((a, i) => (
              <div key={a.productId} style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"7px 0",
                borderBottom: i < addons.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                  <span style={{fontSize:13,flexShrink:0}}>{a.icon}</span>
                  <div style={{minWidth:0}}>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.8)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                      {a.name}
                    </div>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:"rgba(255,255,255,0.35)"}}>{a.category}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontFamily:"Inter,sans-serif",fontSize:12,fontWeight:700,color:a.accent}}>{a.priceStr}</span>
                  <button
                    onClick={() => onRemoveAddon(a.productId)}
                    title="Remove add-on"
                    style={{
                      background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",
                      borderRadius:6,width:22,height:22,cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      color:"rgba(239,68,68,0.8)",fontSize:13,lineHeight:1,padding:0,
                    }}
                  >×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pricing breakdown */}
        <div style={{marginTop:20,background:"rgba(5,11,26,0.6)",borderRadius:12,padding:"16px"}}>
          {[
            {label:`${pkg.name} Membership`, val:`${subtotal.toFixed(2)}`},
            ...(addons.length > 0 ? [{label:`Add-Ons (${addons.length})`, val:`${addonsTotal.toFixed(2)}`}] : []),
            {label:"AI Fee",val:`${aiFee.toFixed(2)}`},
            {label:"Rendering",val:`${rendering.toFixed(2)}`},
            {label:"Tax (8.5%)",val:`${tax.toFixed(2)}`},
          ].map(({label,val},i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:"rgba(255,255,255,0.5)"}}>{label}</span>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:"rgba(255,255,255,0.75)"}}>{val}</span>
            </div>
          ))}
          <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.4),transparent)",margin:"10px 0"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.9)"}}>Total Amount</span>
            <span style={{fontFamily:"Playfair Display, serif",fontSize: isMobile ? 28 : 36,fontWeight:700,color:"#D4AF37",textShadow:"0 0 20px rgba(212,175,55,0.4)"}}>${total.toFixed(2)}</span>
          </div>
          {addons.length > 0 && (
            <div style={{marginTop:8,padding:"8px 10px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:8}}>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:11,color:"rgba(34,197,94,0.85)"}}>
                🎯 {addons.length} add-on{addons.length > 1 ? "s" : ""} included — all queued for production after checkout
              </span>
            </div>
          )}
          {/* Savings intelligence line */}
          <div style={{marginTop:10,padding:"9px 12px",background:"rgba(212,175,55,0.04)",border:"1px solid rgba(212,175,55,0.15)",borderRadius:8,display:"flex",alignItems:"flex-start",gap:8}}>
            <span style={{fontSize:13,flexShrink:0}}>⚖</span>
            <span style={{fontFamily:"Inter,sans-serif",fontSize:10,color:"rgba(255,255,255,0.45)",lineHeight:1.5}}>
              {pkg.name === "Starter"
                ? "Suno Pro charges $8/mo for generic songs. Ghaafeedi delivers personalized, story-driven music from $19/mo."
                : pkg.name === "Premium"
                ? "Freelance music producers charge $150–$800 per song. Your membership covers up to 8 personalized tracks per month."
                : "Studio production costs $500–$5,000 per song. Your Elite membership delivers 15 cinematic songs/mo fully produced."}
            </span>
          </div>
        </div>

        {/* Security badges */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,margin:"16px 0"}}>
          {[
            {icon:"🛡️",label:"100% Secure"},
            {icon:"🔒",label:"SSL Encrypted"},
            {icon:"⭐",label:"Satisfaction Guaranteed"},
            {icon:"💎",label:"Premium Quality"},
          ].map(({icon,label},i)=>(
            <div key={i} style={{
              display:"flex",alignItems:"center",gap:6,
              background:"rgba(5,11,26,0.5)",borderRadius:8,padding:"8px 10px",
              border:"1px solid rgba(212,175,55,0.08)",
            }}>
              <span style={{fontSize:12}}>{icon}</span>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:10,color:"rgba(255,255,255,0.5)",lineHeight:1.2}}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{height:20}}/>
    </div>
  );
}

// ─── Step 8 Header ────────────────────────────────────────────────────────────
function S8PageHeader() {
  return (
    <div style={{textAlign:"center" as const, paddingBottom:32}}>
      <div style={{
        display:"inline-flex",alignItems:"center",gap:8,
        background:"rgba(212,175,55,0.1)",border:"1px solid rgba(212,175,55,0.3)",
        borderRadius:24,padding:"6px 16px 6px 10px",marginBottom:20,
      }}>
        <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#D4AF37,#B8960C)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontFamily:"Inter,sans-serif",fontSize:11,fontWeight:700,color:"#050B1A"}}>08</span>
        </div>
        <span style={{fontFamily:"Inter,sans-serif",fontSize:11,fontWeight:600,color:"rgba(212,175,55,0.85)",letterSpacing:"0.12em",textTransform:"uppercase" as const}}>Complete Your Order</span>
      </div>
      <h1 style={{fontFamily:"Playfair Display, serif",fontSize:"clamp(28px,4vw,48px)",fontWeight:700,color:"#ffffff",margin:"0 0 12px",lineHeight:1.15}}>
        Complete Your <span style={{color:"#D4AF37"}}>Order</span>
      </h1>
      <p style={{fontFamily:"Inter,sans-serif",fontSize:15,color:"rgba(255,255,255,0.55)",margin:0}}>
        You're one step away from bringing your story to life.
      </p>
      <div style={{width:64,height:2,background:"linear-gradient(90deg,transparent,#D4AF37,transparent)",margin:"18px auto 0",borderRadius:1}}/>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ─── ADD-ON CATALOG  (all 14 products + membership tiers) ────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface AddonProduct {
  id:       string;
  name:     string;
  sub:      string;
  price:    number;       // numeric USD
  priceStr: string;       // display "$49/mo"
  category: string;
  icon:     string;       // emoji
  accent:   string;       // hex
  memberOnly?: boolean;
  isMonthly?:  boolean;   // recurring vs one-time
}

const GM_ADDON_CATALOG: AddonProduct[] = [
  // ── Membership Plans ──────────────────────────────────────────────────────
  { id:"mem-starter",  name:"Starter Membership",  sub:"3 Songs / Month",   price:49,    priceStr:"$49/mo",   category:"Membership", icon:"🎵", accent:"#D4AF37", isMonthly:true },
  { id:"mem-premium",  name:"Premium Membership",  sub:"8 Songs / Month",   price:79,    priceStr:"$79/mo",   category:"Membership", icon:"🎵", accent:"#FFC24D", isMonthly:true },
  { id:"mem-elite",    name:"Elite Membership",    sub:"15 Songs / Month",  price:125,   priceStr:"$125/mo",  category:"Membership", icon:"🎵", accent:"#FFD700", isMonthly:true },
  // ── Songs ─────────────────────────────────────────────────────────────────
  { id:"song-essential",  name:"Song — Essential", sub:"2 Songs / Month",  price:19,    priceStr:"$19/mo",   category:"Songs",      icon:"🎤", accent:"#8B5CF6", isMonthly:true },
  { id:"song-creator",    name:"Song — Creator",   sub:"5 Songs / Month",  price:39,    priceStr:"$39/mo",   category:"Songs",      icon:"🎤", accent:"#A78BFA", isMonthly:true },
  { id:"song-pro",        name:"Song — Pro",       sub:"12 Songs / Month", price:69,    priceStr:"$69/mo",   category:"Songs",      icon:"🎤", accent:"#7C3AED", isMonthly:true },
  // ── 2-Min Films ───────────────────────────────────────────────────────────
  { id:"film2-essential", name:"2-Min Film — Essential", sub:"One-Time Production", price:79,   priceStr:"$79",  category:"Short Films", icon:"🎬", accent:"#D4A574" },
  { id:"film2-premium",   name:"2-Min Film — Premium",   sub:"4K + Revisions",      price:129,  priceStr:"$129", category:"Short Films", icon:"🎬", accent:"#D4A574" },
  { id:"film2-elite",     name:"2-Min Film — Elite",     sub:"4K + Unlimited Rev.",  price:199,  priceStr:"$199", category:"Short Films", icon:"🎬", accent:"#D4A574" },
  // ── 5-Min Films ───────────────────────────────────────────────────────────
  { id:"film5-essential", name:"5-Min Film — Essential", sub:"480p · AI Story Script", price:199,  priceStr:"$199", category:"Feature Films", icon:"🎥", accent:"#06B6D4" },
  { id:"film5-premium",   name:"5-Min Film — Premium",   sub:"720p · Sophia Concierge", price:349,  priceStr:"$349", category:"Feature Films", icon:"🎥", accent:"#06B6D4" },
  { id:"film5-elite",     name:"5-Min Film — Elite",     sub:"1080p · Narration + Vault", price:599,  priceStr:"$599", category:"Feature Films", icon:"🎥", accent:"#06B6D4" },
  // ── 10-Min Films ──────────────────────────────────────────────────────────
  { id:"film10-essential",name:"10-Min Film — Essential",sub:"Documentary Grade",   price:299,  priceStr:"$299", category:"Masterpiece",  icon:"🏆", accent:"#10B981" },
  { id:"film10-premium",  name:"10-Min Film — Premium",  sub:"8K Cinema Output",   price:499,  priceStr:"$499", category:"Masterpiece",  icon:"🏆", accent:"#10B981" },
  { id:"film10-elite",    name:"10-Min Film — Elite",    sub:"Unlimited Sharing",   price:799,  priceStr:"$799", category:"Masterpiece",  icon:"🏆", accent:"#10B981" },
  // ── Standalone Products ───────────────────────────────────────────────────
  { id:"voice-cloning",        name:"Voice Cloning Studio",   sub:"Your Voice Immortalized",     price:297,  priceStr:"$297",    category:"Studio",  icon:"🎙️", accent:"#EC4899" },
  { id:"signature-masterpiece",name:"Signature Masterpiece",  sub:"Custom Music Legacy",         price:4997, priceStr:"$4,997",  category:"Premium", icon:"💎", accent:"#D4AF37" },
  { id:"dream-visualization",  name:"Dream AI Visualization", sub:"See Your Dreams",             price:247,  priceStr:"$247",    category:"AI",      icon:"🌌", accent:"#6366F1" },
  { id:"future-self",          name:"Future Self Vision",     sub:"Meet Tomorrow's You",         price:197,  priceStr:"$197",    category:"AI",      icon:"🔮", accent:"#8B5CF6" },
  { id:"nft-collection",       name:"NFT Collection",         sub:"Own Your Legacy",             price:497,  priceStr:"$497",    category:"NFT",     icon:"🖼️", accent:"#F59E0B", memberOnly:true },
  { id:"memorial-legacy",      name:"Memorial Legacy Film",   sub:"Honor & Remember",            price:149,  priceStr:"$149",    category:"Video",   icon:"🕊️", accent:"#64748B" },
  { id:"family-vault",         name:"Family Vault",           sub:"Generations of Memory",       price:19,   priceStr:"$19/mo",  category:"Legacy",  icon:"🏛️", accent:"#22D3EE", isMonthly:true },
  { id:"couples-journey",      name:"Couples Journey Film",   sub:"Your Love Story",             price:299,  priceStr:"$299",    category:"Video",   icon:"💑", accent:"#F43F5E" },
  { id:"relationship-healing", name:"Relationship Healing",   sub:"Heal Through Music",          price:19,   priceStr:"$19/mo",  category:"Music",   icon:"💚", accent:"#10B981", isMonthly:true, memberOnly:true },
  { id:"cinematic-life-story", name:"Cinematic Life Story",   sub:"Epic. Personal. Yours.",      price:299,  priceStr:"$299",    category:"Video",   icon:"📽️", accent:"#A78BFA", memberOnly:true },
  { id:"social-clips",         name:"Social Story Clips",     sub:"Share Your Journey",          price:79,   priceStr:"$79",     category:"Video",   icon:"📱", accent:"#34D399" },
  { id:"sophia-ai",            name:"Sophia AI Companion",    sub:"Emotional AI Concierge",      price:49,   priceStr:"$49/mo",  category:"AI",      icon:"✨", accent:"#D4AF37", isMonthly:true },
  { id:"emotional-soundtrack", name:"Emotional Soundtrack",   sub:"Feel Every Moment",           price:19,   priceStr:"$19/mo",  category:"Music",   icon:"🎶", accent:"#F472B6", isMonthly:true },
  { id:"cinematic-story-film", name:"Cinematic Story Film",   sub:"Your Life. The Movie.",       price:79,   priceStr:"$79",     category:"Video",   icon:"🎞️", accent:"#FB923C" },
  // ── Upgrades ──────────────────────────────────────────────────────────────
  { id:"sophia-lipsync",       name:"Sophia Lip Sync Narration", sub:"Sophia narrates your film with full lip sync — Elite members free", price:29, priceStr:"$29", category:"Upgrades", icon:"💋", accent:"#D4AF37" },
];

const GM_ADDON_CATEGORIES = ["Membership","Songs","Short Films","Feature Films","Masterpiece","AI","Studio","Music","Video","NFT","Legacy","Premium","Upgrades"];

// ─────────────────────────────────────────────────────────────────────────────
// ─── S8 ADD-ON DRAWER ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface CartAddonItem {
  productId: string;
  name:      string;
  priceStr:  string;
  price:     number;
  category:  string;
  icon:      string;
  accent:    string;
}

function S8AddOnPanel({
  primaryPkgId,
  addons,
  onAddAddon,
  onRemoveAddon,
}: {
  primaryPkgId: string;
  addons: CartAddonItem[];
  onAddAddon: (item: CartAddonItem) => void;
  onRemoveAddon: (productId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [search, setSearch] = React.useState("");

  // Exclude already-in-cart items + the primary membership if it matches
  const primaryMembershipId =
    primaryPkgId === "starter" ? "mem-starter"
    : primaryPkgId === "premium" ? "mem-premium"
    : "mem-elite";

  const addonIds = new Set([primaryMembershipId, ...addons.map(a => a.productId)]);

  const categories = ["All", ...GM_ADDON_CATEGORIES.filter(c =>
    GM_ADDON_CATALOG.some(p => p.category === c && !addonIds.has(p.id))
  )];

  const filtered = GM_ADDON_CATALOG.filter(p => {
    if (addonIds.has(p.id)) return false;
    if (activeCategory !== "All" && p.category !== activeCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{
      marginTop: 20,
      background: "linear-gradient(135deg,rgba(11,23,54,0.90),rgba(5,11,26,0.95))",
      border: `1px solid ${open ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.18)"}`,
      borderRadius: 16,
      overflow: "hidden",
      transition: "border-color .25s",
    }}>
      {/* Toggle Header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 20px", background:"transparent", border:"none", cursor:"pointer",
        }}
      >
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{
            width:36,height:36,borderRadius:10,
            background:"linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.08))",
            border:"1px solid rgba(212,175,55,0.3)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,
          }}>➕</div>
          <div style={{textAlign:"left" as const}}>
            <div style={{fontFamily:"Playfair Display, serif",fontSize:15,fontWeight:700,color:"#ffffff"}}>
              Add More Products
            </div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:11,color:"rgba(212,175,55,0.6)",marginTop:2}}>
              {addons.length === 0
                ? "Browse all 14 products & bundles — without losing your order"
                : `${addons.length} add-on${addons.length > 1 ? "s" : ""} selected`}
            </div>
          </div>
        </div>
        <div style={{
          width:28,height:28,borderRadius:"50%",
          background:"rgba(212,175,55,0.1)",border:"1px solid rgba(212,175,55,0.25)",
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"transform .25s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4.5L6 8.5L10 4.5" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* Selected addons chips (always visible when items exist) */}
      {addons.length > 0 && (
        <div style={{
          padding:"0 20px 14px",
          display:"flex",flexWrap:"wrap" as const,gap:8,
        }}>
          {addons.map(a => (
            <div key={a.productId} style={{
              display:"flex",alignItems:"center",gap:6,
              background:`rgba(${hexToRgb(a.accent)},0.15)`,
              border:`1px solid rgba(${hexToRgb(a.accent)},0.4)`,
              borderRadius:20,padding:"4px 12px 4px 8px",
            }}>
              <span style={{fontSize:12}}>{a.icon}</span>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:11,fontWeight:600,color:"#ffffff"}}>{a.name}</span>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:11,color:"rgba(255,255,255,0.5)",marginLeft:2}}>{a.priceStr}</span>
              <button
                onClick={() => onRemoveAddon(a.productId)}
                style={{
                  marginLeft:4,background:"transparent",border:"none",cursor:"pointer",
                  color:"rgba(255,255,255,0.4)",fontSize:14,lineHeight:1,padding:0,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Expanded Catalog */}
      {open && (
        <div style={{borderTop:"1px solid rgba(212,175,55,0.15)"}}>
          {/* Search + Category Filter */}
          <div style={{padding:"16px 20px 12px"}}>
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width:"100%", boxSizing:"border-box" as const,
                background:"rgba(5,11,26,0.8)",border:"1px solid rgba(212,175,55,0.2)",
                borderRadius:10,padding:"10px 14px",
                fontFamily:"Inter,sans-serif",fontSize:13,color:"#ffffff",
                outline:"none",marginBottom:12,
              }}
            />
            <div style={{display:"flex",gap:6,flexWrap:"wrap" as const}}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding:"5px 12px",borderRadius:20,cursor:"pointer",
                    fontFamily:"Inter,sans-serif",fontSize:11,fontWeight:600,
                    border: activeCategory === cat ? "1px solid #D4AF37" : "1px solid rgba(255,255,255,0.12)",
                    background: activeCategory === cat ? "rgba(212,175,55,0.15)" : "transparent",
                    color: activeCategory === cat ? "#D4AF37" : "rgba(255,255,255,0.45)",
                    transition:"all .15s",
                  }}
                >{cat}</button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div style={{
            padding:"0 20px 20px",
            display:"grid",
            gridTemplateColumns:"1fr 1fr",
            gap:10,
            maxHeight:420,
            overflowY:"auto" as const,
          }}>
            {filtered.length === 0 && (
              <div style={{
                gridColumn:"1 / -1",textAlign:"center" as const,
                padding:"32px 0",
                fontFamily:"Inter,sans-serif",fontSize:13,color:"rgba(255,255,255,0.3)",
              }}>
                {search ? "No products match your search." : "All products in this category are already in your cart!"}
              </div>
            )}
            {filtered.map(product => (
              <button
                key={product.id}
                onClick={() => onAddAddon({
                  productId: product.id,
                  name:      product.name,
                  priceStr:  product.priceStr,
                  price:     product.price,
                  category:  product.category,
                  icon:      product.icon,
                  accent:    product.accent,
                })}
                style={{
                  background:"rgba(5,11,26,0.7)",
                  border:`1px solid rgba(${hexToRgb(product.accent)},0.22)`,
                  borderRadius:12,padding:"12px",cursor:"pointer",
                  textAlign:"left" as const,
                  transition:"all .15s",
                  position:"relative" as const,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = `1px solid rgba(${hexToRgb(product.accent)},0.55)`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px rgba(${hexToRgb(product.accent)},0.2)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = `1px solid rgba(${hexToRgb(product.accent)},0.22)`;
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}}>
                  <div style={{
                    width:32,height:32,borderRadius:8,flexShrink:0,
                    background:`rgba(${hexToRgb(product.accent)},0.15)`,
                    border:`1px solid rgba(${hexToRgb(product.accent)},0.3)`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:14,
                  }}>{product.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{
                      fontFamily:"Inter,sans-serif",fontSize:11.5,fontWeight:700,
                      color:"#ffffff",lineHeight:1.3,
                      overflow:"hidden",textOverflow:"ellipsis",
                      display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as const,
                    }}>{product.name}</div>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2,lineHeight:1.2}}>
                      {product.sub}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{
                    fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:700,
                    color: product.accent,
                  }}>{product.priceStr}</span>
                  <div style={{
                    display:"flex",alignItems:"center",gap:4,
                    background:`rgba(${hexToRgb(product.accent)},0.15)`,
                    border:`1px solid rgba(${hexToRgb(product.accent)},0.4)`,
                    borderRadius:6,padding:"3px 8px",
                    fontFamily:"Inter,sans-serif",fontSize:10,fontWeight:700,
                    color: product.accent,
                  }}>
                    <span>+</span> Add
                  </div>
                </div>
                {product.memberOnly && (
                  <div style={{
                    position:"absolute" as const,top:8,right:8,
                    background:"rgba(212,175,55,0.15)",border:"1px solid rgba(212,175,55,0.35)",
                    borderRadius:4,padding:"2px 5px",
                    fontFamily:"Inter,sans-serif",fontSize:8,fontWeight:700,
                    color:"#D4AF37",letterSpacing:"0.05em",
                  }}>MEMBER</div>
                )}
              </button>
            ))}
          </div>

          {/* Info note */}
          <div style={{
            margin:"0 20px 20px",padding:"12px 16px",
            background:"rgba(212,175,55,0.06)",
            border:"1px solid rgba(212,175,55,0.15)",
            borderRadius:10,
          }}>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.6}}>
              <span style={{color:"#D4AF37",fontWeight:600}}>Your S1–S7 story details are saved.</span>
              {" "}Add-ons are queued to your order. After checkout, we'll fast-track any missing details for each product — no need to restart the process.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// hex → "r,g,b" helper (used in S8AddOnPanel)
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "212,175,55";
  return `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Step 8: Checkout & Payment ── ORCHESTRATOR ───────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const GM_CHECKOUT_STATE_KEY = "gm_checkout_state";
const GM_CHECKOUT_LOCK_KEY  = "gm_checkout_locked";

interface GmCheckoutState {
  selectedPkgId: string;
  bnplOption:    string | null;
  payNowMethod:  string;
  addons:        CartAddonItem[];
}

function genOrderId(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(100000 + Math.random() * 900000).toString();
  return `GM-${year}-${suffix}`;
}

function Step8Checkout({
  whoFor,
  experienceType,
  onBack,
  onNext,
}: {
  whoFor?:        string;
  experienceType?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  // ── Restore persisted state ────────────────────────────────────────────────
  const initState = (): GmCheckoutState => {
    try {
      const raw = localStorage.getItem(GM_CHECKOUT_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GmCheckoutState;
        // Backfill addons for older saved states
        if (!parsed.addons) parsed.addons = [];
        return parsed;
      }
    } catch { /* ignore */ }
    return { selectedPkgId: "premium", bnplOption: null, payNowMethod: "card", addons: [] };
  };

  const [selectedPkgId, setSelectedPkgId] = React.useState<string>(initState().selectedPkgId);
  const [bnplOption,    setBnplOption]    = React.useState<string | null>(initState().bnplOption);
  const [payNowMethod,  setPayNowMethod]  = React.useState<string>(initState().payNowMethod);
  const [addons,        setAddons]        = React.useState<CartAddonItem[]>(initState().addons);
  const [submitState,   setSubmitState]   = React.useState<"idle"|"loading"|"success"|"error">("idle");
  const [isMobile,      setIsMobile]      = React.useState(window.innerWidth < 640);

  const handleAddAddon    = React.useCallback((item: CartAddonItem) => {
    setAddons(prev => prev.find(a => a.productId === item.productId) ? prev : [...prev, item]);
  }, []);
  const handleRemoveAddon = React.useCallback((productId: string) => {
    setAddons(prev => prev.filter(a => a.productId !== productId));
  }, []);

  const attemptTimestamps = React.useRef<number[]>([]);
  const submitLock        = React.useRef(false);
  const saveTimer         = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Responsive listener ────────────────────────────────────────────────────
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Auto-persist every 2 s ─────────────────────────────────────────────────
  React.useEffect(() => {
    saveTimer.current = setInterval(() => {
      try {
        const s: GmCheckoutState = { selectedPkgId, bnplOption, payNowMethod, addons };
        localStorage.setItem(GM_CHECKOUT_STATE_KEY, JSON.stringify(s));
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (saveTimer.current) clearInterval(saveTimer.current); };
  }, [selectedPkgId, bnplOption, payNowMethod, addons]);

  // ── Block if already completed ─────────────────────────────────────────────
  React.useEffect(() => {
    const locked = localStorage.getItem(GM_CHECKOUT_LOCK_KEY);
    if (locked === "1") {
      // Already paid — skip straight to confirmation
      onNext();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pkg = S8_PACKAGES.find(p => p.id === selectedPkgId) ?? S8_PACKAGES[1];

  // ── Dodo overlay checkout state ────────────────────────────────────────────
  const [dodoCheckoutUrl,  setDodoCheckoutUrl]  = React.useState<string | null>(null);
  const [dodoSessionId,    setDodoSessionId]    = React.useState<string | null>(null);
  const dodoInitialized = React.useRef(false);

  // ── Initialize Dodo SDK once ───────────────────────────────────────────────
  React.useEffect(() => {
    if (dodoInitialized.current) return;
    dodoInitialized.current = true;
    DodoPayments.Initialize({
      mode: "live",
      displayType: "overlay",
      onEvent: (event) => {
        if (event.event_type === "checkout.pay_button_clicked") {
          setSubmitState("loading");
          startPolling();
        }
        if (event.event_type === "checkout.error") {
          setSubmitState("error");
          submitLock.current = false;
        }
      },
    });
    return () => { DodoPayments.Checkout.close(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll for payment confirmation ──────────────────────────────────────────
  const pollTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startPolling = React.useCallback(() => {
    if (pollTimer.current) return;
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts++;
      try {
        // Check localStorage flag set by webhook or manual trigger
        const locked = localStorage.getItem(GM_CHECKOUT_LOCK_KEY);
        if (locked === "1") {
          clearInterval(pollTimer.current!);
          pollTimer.current = null;
          onNext();
          return;
        }
        // After 90s give up
        if (attempts > 45) {
          clearInterval(pollTimer.current!);
          pollTimer.current = null;
          setSubmitState("idle");
          submitLock.current = false;
        }
      } catch { /* ignore */ }
    }, 2000);
  }, [onNext]);

  // ── Fetch Dodo checkout session ────────────────────────────────────────────
  const handleSubmit = React.useCallback(async () => {
    if (submitLock.current || submitState === "loading") return;

    // Rate limit
    const now = Date.now();
    attemptTimestamps.current = attemptTimestamps.current.filter(t => now - t < 60_000);
    if (attemptTimestamps.current.length >= 3) {
      alert("Too many payment attempts. Please wait a minute and try again.");
      return;
    }
    attemptTimestamps.current.push(now);

    submitLock.current = true;
    setSubmitState("loading");

    try {
      const res = await fetch("/api/dodo/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          successUrl: `${window.location.origin}/onboarding?step=9&payment=success`,
          cancelUrl:  `${window.location.origin}/onboarding?step=8`,
        }),
      });

      const data = await res.json() as { checkoutUrl?: string; sessionId?: string; error?: string };

      if (!res.ok || !data.checkoutUrl) {
        console.error("[Dodo] session error:", data.error);
        setSubmitState("error");
        submitLock.current = false;
        return;
      }

      setDodoCheckoutUrl(data.checkoutUrl);
      setDodoSessionId(data.sessionId ?? null);
      setSubmitState("idle");
      submitLock.current = false;

      // Open overlay checkout
      setTimeout(() => {
        DodoPayments.Checkout.open({
          checkoutUrl: data.checkoutUrl!,
          options: {
            showTimer: true,
            showSecurityBadge: true,
            payButtonText: "Complete Payment",
          },
        });
      }, 100);

    } catch (err) {
      console.error("[Dodo] fetch error:", err);
      setSubmitState("error");
      submitLock.current = false;
    }
  }, [pkg, submitState]);

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100%",
      background: "linear-gradient(180deg, #050B1A 0%, #07101F 50%, #050B1A 100%)",
      padding: isMobile ? "24px 16px 48px" : "40px 24px 80px",
      boxSizing: "border-box",
      overflowX: "hidden",
    }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display:"flex", alignItems:"center", gap:6,
          background:"transparent", border:"none", cursor:"pointer",
          fontFamily:"Inter,sans-serif", fontSize:13, color:"rgba(255,255,255,0.45)",
          marginBottom:16, padding:0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      <S8PageHeader />

      {/* Package selector */}
      <div style={{ maxWidth: 1100, margin: "0 auto 24px" }}>
        <S8PackageSelector selected={selectedPkgId} onSelect={setSelectedPkgId} />
      </div>

      {/* Main two-column layout */}
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: isMobile ? "flex" : "grid",
        gridTemplateColumns: isMobile ? undefined : "1fr 360px",
        flexDirection: isMobile ? "column" : undefined,
        gap: 24,
        alignItems: "flex-start",
      }}>
        {/* Left — active package + payment module */}
        <div style={{ minWidth: 0 }}>
          <S8ActivePackage pkg={pkg} heroHeight={220} />
          <S8AddOnPanel
            primaryPkgId={selectedPkgId}
            addons={addons}
            onAddAddon={handleAddAddon}
            onRemoveAddon={handleRemoveAddon}
          />
          <S8DodoPaymentModule
            bnplOption={bnplOption}
            onBnplSelect={setBnplOption}
            payNowMethod={payNowMethod}
            onMethodSelect={setPayNowMethod}
            pkg={pkg}
            submitState={submitState}
            onSubmit={handleSubmit}
            isMobile={isMobile}
          />

          {/* Dodo overlay opens as modal — no inline container needed */}
        </div>

        {/* Right — order review */}
        <S8OrderReview pkg={pkg} addons={addons} onRemoveAddon={handleRemoveAddon} isMobile={isMobile} />
      </div>

      {/* Error banner */}
      {submitState === "error" && (
        <div style={{
          maxWidth: 1100, margin: "16px auto 0",
          background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.4)",
          borderRadius:12, padding:"14px 20px",
          fontFamily:"Inter,sans-serif", fontSize:13, color:"#FCA5A5",
          display:"flex", alignItems:"center", gap:10,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#EF4444" strokeWidth="1.5"/>
            <path d="M8 5v3M8 11h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Payment failed. Please check your details and try again.
          <button
            onClick={() => { setSubmitState("idle"); submitLock.current = false; }}
            style={{ marginLeft:"auto", background:"transparent", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:13 }}
          >Dismiss</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Step 9: Order Confirmation ──────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const GM_ORDER_KEY     = "gm_order_confirmation";
const GM_CHECKOUT_LOCK = "gm_checkout_locked";

// ── Full production order record ──────────────────────────────────────────────
interface GmOrderRecord {
  orderId:            string;
  customerName?:      string;
  customerEmail?:     string;
  packageId?:         string;
  packageName:        string;
  packagePrice?:      number;
  total:              number | string;
  paymentMethod:      string;
  maskedCard?:        string;       // e.g. "Visa •••• 4242"
  deliveryEstimate?:  string;       // e.g. "3–5 Business Days"
  transactionRef?:    string;
  purchaseTimestamp?: string;       // ISO
  paidAt?:            string;       // ISO (alias)
  jobStatus?:         string;       // "Queued" | "In Production" | "Ready"
  status?:            string;       // "completed"
}

// ── Analytics event logger ────────────────────────────────────────────────────
function s9Track(event: string, data?: Record<string, unknown>) {
  try {
    const log = JSON.parse(sessionStorage.getItem("gm_analytics") || "[]");
    log.push({ event, ts: new Date().toISOString(), ...data });
    sessionStorage.setItem("gm_analytics", JSON.stringify(log));
  } catch (_) {}
}

// ── Sanitize display string (XSS protection) ──────────────────────────────────
function s9San(val: string | undefined | null): string {
  if (!val) return "";
  return String(val).replace(/[<>"'&]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "&": "&amp;" }[c] ?? c)
  );
}

// ── Persist order to all stores ───────────────────────────────────────────────
function s9PersistOrder(rec: GmOrderRecord) {
  const safe = JSON.stringify(rec);
  try { localStorage.setItem(GM_ORDER_KEY, safe); } catch (_) {}
  try { sessionStorage.setItem(GM_ORDER_KEY, safe); } catch (_) {}
  try { localStorage.setItem(GM_CHECKOUT_LOCK, "1"); } catch (_) {}
  try { sessionStorage.setItem(GM_CHECKOUT_LOCK, "1"); } catch (_) {}
}

// ── Read order from any available store ──────────────────────────────────────
function s9ReadOrder(): GmOrderRecord | null {
  const sources = [
    () => localStorage.getItem(GM_ORDER_KEY),
    () => sessionStorage.getItem(GM_ORDER_KEY),
  ];
  for (const src of sources) {
    try {
      const raw = src();
      if (raw) return JSON.parse(raw) as GmOrderRecord;
    } catch (_) {}
  }
  return null;
}

// ── Check checkout lock ───────────────────────────────────────────────────────
function s9IsLocked(): boolean {
  try {
    return !!(localStorage.getItem(GM_CHECKOUT_LOCK) || sessionStorage.getItem(GM_CHECKOUT_LOCK));
  } catch (_) { return false; }
}

// ── Persistence hook ──────────────────────────────────────────────────────────
function useS9Order(): GmOrderRecord | null {
  const [order, setOrder] = React.useState<GmOrderRecord | null>(null);
  React.useEffect(() => {
    const rec = s9ReadOrder();
    if (rec) setOrder(rec);
    s9Track("confirmation_viewed");
  }, []);
  return order;
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtPayMethod(m: string): string {
  const map: Record<string, string> = {
    card: "Credit / Debit Card",
    apple_pay: "Apple Pay",
    google_pay: "Google Pay",
    paypal: "PayPal",
    bank_transfer: "Bank Transfer",
    crypto: "Cryptocurrency",
    bnpl_buy_now_4x: "Buy Now, Pay Later (4×)",
    bnpl_monthly: "Monthly Installments",
    bnpl_pay_30: "Pay in 30 Days",
    bnpl_pay_60: "Pay in 60 Days",
  };
  return map[m] ?? m;
}

function fmtDate(iso?: string): string {
  if (!iso) return new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });
  try {
    return new Date(iso).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });
  } catch (_) { return iso; }
}

function fmtShort(iso?: string): string {
  if (!iso) return new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
  try { return new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }); }
  catch (_) { return iso; }
}

// ── Receipt PDF generator (pure client-side) ──────────────────────────────────
function generateReceipt(order: GmOrderRecord, displayTotal: string) {
  s9Track("receipt_downloaded");
  const ts = fmtDate(order.purchaseTimestamp || order.paidAt);
  const method = fmtPayMethod(order.paymentMethod);
  const masked = order.maskedCard ? `\nCard: ${order.maskedCard}` : "";
  const delivery = order.deliveryEstimate ?? "3–5 Business Days";
  const ref = order.transactionRef ?? order.orderId;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Ghaafeedi Music Receipt — ${order.orderId}</title>
<style>
  body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; padding: 40px; background: #fff; color: #111; }
  .logo { font-size: 26px; font-weight: 900; color: #B8860B; letter-spacing: 2px; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 32px; }
  .receipt-title { font-size: 20px; font-weight: bold; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; margin-bottom: 24px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  .label { color: #555; }
  .val { font-weight: 600; color: #111; }
  .total-row { display: flex; justify-content: space-between; padding: 14px 0; font-size: 18px; font-weight: 900; color: #B8860B; }
  .footer { margin-top: 40px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
  .badge { display: inline-block; background: #D4AF37; color: #000; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-left: 8px; }
</style>
</head>
<body>
<div class="logo">GHAAFEEDI MUSIC</div>
<div class="subtitle">AI-Powered Emotional Storytelling Platform</div>
<div class="receipt-title">Official Order Receipt <span class="badge">PAID</span></div>
<div class="row"><span class="label">Order ID</span><span class="val">${s9San(order.orderId)}</span></div>
<div class="row"><span class="label">Transaction Reference</span><span class="val">${s9San(ref)}</span></div>
<div class="row"><span class="label">Date & Time</span><span class="val">${s9San(ts)}</span></div>
<div class="row"><span class="label">Package</span><span class="val">${s9San(order.packageName)}</span></div>
<div class="row"><span class="label">Payment Method</span><span class="val">${s9San(method)}${s9San(masked)}</span></div>
<div class="row"><span class="label">Delivery Estimate</span><span class="val">${s9San(delivery)}</span></div>
<div class="row"><span class="label">Production Status</span><span class="val">${s9San(order.jobStatus ?? "Queued")}</span></div>
${order.customerEmail ? `<div class="row"><span class="label">Confirmation Email</span><span class="val">${s9San(order.customerEmail)}</span></div>` : ""}
<div class="total-row"><span>Amount Paid</span><span>${s9San(displayTotal)}</span></div>
<div class="footer">
  <p>Ghaafeedi Music | support@ghaafeedi.com | ghaafeedi.com</p>
  <p>This is an official receipt. Please retain for your records.</p>
  <p>SSL Secured • PCI DSS Compliant • Your payment is protected</p>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Ghaafeedi_Receipt_${order.orderId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ── Testimonials ──────────────────────────────────────────────────────────────
const S9_TESTIMONIALS = [
  { avatar: "/assets/s9-avatar-1.png", name: "Janelle M.", text: "I cried listening to my song. Ghaafeedi captured everything.", stars: 5 },
  { avatar: "/assets/s9-avatar-2.png", name: "Marco R.",   text: "My wife's anniversary gift. She played it on repeat for days.", stars: 5 },
  { avatar: "/assets/s9-avatar-3.png", name: "Priya K.",   text: "The AI understood my story better than I could explain it.", stars: 5 },
  { avatar: "/assets/s9-avatar-4.png", name: "David W.",   text: "A legacy piece for my grandchildren. Absolutely priceless.", stars: 5 },
  { avatar: "/assets/s9-avatar-5.png", name: "Darius T.",  text: "Exceeded every expectation. Pure emotional artistry.", stars: 5 },
  { avatar: "/assets/s9-avatar-6.png", name: "Sofia L.",   text: "I gifted this to my mother. She said it was the best gift ever.", stars: 5 },
];

// ── Timeline steps ────────────────────────────────────────────────────────────
function getTimeline(order: GmOrderRecord) {
  const base  = order.purchaseTimestamp || order.paidAt || new Date().toISOString();
  const t0    = new Date(base);
  const t1    = new Date(t0.getTime() + 60000);
  const t2    = new Date(t0.getTime() + 300000);
  const t3Est = "3–5 Business Days from " + t0.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  return [
    { label: "Order Created",       time: fmtShort(t0.toISOString()), done: true  },
    { label: "Payment Approved",    time: fmtShort(t1.toISOString()), done: true  },
    { label: "Production Started",  time: fmtShort(t2.toISOString()), done: true  },
    { label: "Estimated Delivery",  time: t3Est,                       done: false },
    { label: "Ready for Delivery",  time: "Pending",                   done: false },
  ];
}

// ── CSS keyframes ─────────────────────────────────────────────────────────────
function S9Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap');

      @keyframes s9RingDraw {
        from { stroke-dashoffset: 415; }
        to   { stroke-dashoffset: 0; }
      }
      @keyframes s9CheckPop {
        0%   { transform: scale(0.4) rotate(-15deg); opacity:0; }
        60%  { transform: scale(1.15) rotate(3deg);  opacity:1; }
        100% { transform: scale(1.0)  rotate(0deg);  opacity:1; }
      }
      @keyframes s9FadeUp {
        from { opacity:0; transform:translateY(22px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes s9CardGlow {
        0%,100% { box-shadow: 0 0 0 1px rgba(212,175,55,0.28), 0 0 50px rgba(212,175,55,0.10), 0 40px 90px rgba(0,0,0,0.70); }
        50%      { box-shadow: 0 0 0 1px rgba(212,175,55,0.46), 0 0 80px rgba(212,175,55,0.22), 0 40px 90px rgba(0,0,0,0.72); }
      }
      @keyframes s9ToastSlide {
        from { opacity:0; transform:translateX(-50%) translateY(12px); }
        to   { opacity:1; transform:translateX(-50%) translateY(0); }
      }
      @keyframes s9HeroFloat {
        0%,100% { transform:translateY(0px); }
        50%      { transform:translateY(-6px); }
      }
      @keyframes s9MemCard1 {
        0%,100% { transform:translate(0,0) rotate(-8deg); }
        50%      { transform:translate(-4px,-8px) rotate(-10deg); }
      }
      @keyframes s9MemCard2 {
        0%,100% { transform:translate(0,0) rotate(6deg); }
        50%      { transform:translate(4px,-6px) rotate(8deg); }
      }
      @keyframes s9MemCard3 {
        0%,100% { transform:translate(0,0) rotate(-4deg); }
        50%      { transform:translate(-3px,-9px) rotate(-6deg); }
      }
      @keyframes s9MemCard4 {
        0%,100% { transform:translate(0,0) rotate(5deg); }
        50%      { transform:translate(5px,-5px) rotate(7deg); }
      }
      @keyframes s9PulseRing {
        0%   { transform:scale(1);   opacity:0.5; }
        100% { transform:scale(1.8); opacity:0; }
      }
      @keyframes s9StarTwinkle {
        0%,100% { opacity:0.25; transform:scale(1);   }
        50%      { opacity:1;    transform:scale(1.35); }
      }
      @keyframes s9TLSlide {
        from { opacity:0; max-height:0; }
        to   { opacity:1; max-height:400px; }
      }
      .s9-card { animation: s9CardGlow 4s ease-in-out infinite; }
      .s9-btn-primary {
        background: linear-gradient(135deg,#D4AF37 0%,#F5CC55 50%,#C9960A 100%);
        color: #0B1736; font-family: Inter,sans-serif; font-weight: 700;
        border: none; cursor: pointer; letter-spacing: 0.5px;
        transition: opacity 0.2s, transform 0.15s;
      }
      .s9-btn-primary:hover  { opacity:0.88; transform:translateY(-1px); }
      .s9-btn-primary:active { transform:translateY(0px); }
      .s9-btn-secondary {
        background: rgba(212,175,55,0.07);
        font-family: Inter,sans-serif; font-weight: 600;
        cursor: pointer; transition: background 0.2s, transform 0.15s;
      }
      .s9-btn-secondary:hover  { background: rgba(212,175,55,0.14); transform:translateY(-1px); }
      .s9-btn-secondary:active { transform:translateY(0px); }
      .s9-btn-receipt {
        background: rgba(212,175,55,0.10);
        color: #D4AF37; font-family: Inter,sans-serif; font-weight: 600;
        border: 1px solid rgba(212,175,55,0.30); cursor: pointer;
        transition: background 0.2s, border-color 0.2s, transform 0.15s;
        display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .s9-btn-receipt:hover  { background: rgba(212,175,55,0.18); border-color: rgba(212,175,55,0.55); transform:translateY(-1px); }
      .s9-btn-receipt:active { transform:translateY(0px); }
      .s9-tl-toggle {
        background: none; border: none; cursor: pointer;
        color: rgba(255,255,255,0.55); font-family: Inter,sans-serif; font-size: 13px;
        display: flex; align-items: center; gap: 6px;
        transition: color 0.2s;
        padding: 0;
      }
      .s9-tl-toggle:hover { color: #D4AF37; }
      .s9-copy-btn {
        background: none; border: 1px solid rgba(212,175,55,0.3);
        color: #D4AF37; border-radius: 8px; padding: 4px 10px;
        font-size: 12px; font-family: Inter,sans-serif; font-weight: 600;
        cursor: pointer; transition: background 0.18s, border-color 0.18s;
        display: flex; align-items: center; gap: 5px;
      }
      .s9-copy-btn:hover { background: rgba(212,175,55,0.12); border-color: rgba(212,175,55,0.55); }
    `}</style>
  );
}

// ── Step9Props ────────────────────────────────────────────────────────────────
interface Step9Props {
  onViewOrder:  () => void;
  onDashboard:  () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── STEP 9 MAIN COMPONENT ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function Step9OrderConfirmation({ onViewOrder, onDashboard }: Step9Props) {
  const order = useS9Order();

  // ── Viewport ──────────────────────────────────────────────────────────────
  const [winW, setWinW] = React.useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );
  React.useEffect(() => {
    const fn = () => setWinW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  const isDesktop = winW >= 1024;
  const isTablet  = winW >= 768 && winW < 1024;
  const isMobile  = winW < 768;

  // ── Ring geometry ─────────────────────────────────────────────────────────
  const ringSize   = isDesktop ? 140 : isTablet ? 128 : 112;
  const ringStroke = 8;
  const ringR      = (ringSize - ringStroke) / 2;
  const ringCirc   = Math.round(2 * Math.PI * ringR);

  // ── Layout tokens ─────────────────────────────────────────────────────────
  const cardW    = isDesktop ? 480  : isTablet ? "92%"           : "calc(100% - 32px)";
  const cardMaxW = isTablet  ? 520  : isDesktop ? 480            : undefined;

  // ── Order data ────────────────────────────────────────────────────────────
  const isReturning    = !!(order && s9IsLocked());
  const isFallback     = !order;
  const displayOrderId = s9San(order?.orderId      ?? "GM-2024-89271");
  const displayPkg     = s9San(order?.packageName  ?? "Premium Song Package");
  const displayTotal   = order?.total != null ? `$${parseFloat(String(order.total)).toFixed(2)}` : "$79.00";
  const displayMethod  = fmtPayMethod(order?.paymentMethod ?? "card");
  const displayMasked  = order?.maskedCard ? s9San(order.maskedCard) : null;
  const displayDate    = fmtDate(order?.purchaseTimestamp || order?.paidAt);
  const displayEmail   = s9San(order?.customerEmail ?? "");
  const displayName    = s9San(order?.customerName  ?? "");
  const deliveryEst    = s9San(order?.deliveryEstimate ?? "3–5 Business Days");
  const jobStatus      = s9San(order?.jobStatus ?? "Queued");
  const timeline       = order ? getTimeline(order) : getTimeline({ orderId:"GM-2024-89271", packageName:"Premium Song Package", total:79, paymentMethod:"card" });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [copied,   setCopied  ] = React.useState(false);
  const [tlOpen,   setTlOpen  ] = React.useState(false);
  const [selAvatar, setSelAvatar] = React.useState<number | null>(null);
  const [receiptDone, setReceiptDone] = React.useState(false);

  // ── Copy Order ID ─────────────────────────────────────────────────────────
  const handleCopy = React.useCallback(() => {
    const val    = displayOrderId;
    const finish = () => { setCopied(true); setTimeout(() => setCopied(false), 2400); };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(val).then(finish).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = val; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy");
        document.body.removeChild(ta); finish();
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = val; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy");
      document.body.removeChild(ta); finish();
    }
  }, [displayOrderId]);

  // ── Receipt download ──────────────────────────────────────────────────────
  const handleReceipt = React.useCallback(() => {
    const rec = order ?? {
      orderId: "GM-2024-89271", packageName: "Premium Song Package",
      total: 79, paymentMethod: "card",
      deliveryEstimate: "3–5 Business Days", jobStatus: "Queued",
    } as GmOrderRecord;
    generateReceipt(rec, displayTotal);
    setReceiptDone(true);
    setTimeout(() => setReceiptDone(false), 3000);
  }, [order, displayTotal]);

  // ── GOLD / NAVY ───────────────────────────────────────────────────────────
  const GOLD  = "#D4AF37";
  const NAVY  = "#0B1736";
  const WHITE = "#FFFFFF";

  // ── CARD ROW util ─────────────────────────────────────────────────────────
  const InfoRow = ({ label, value, valueStyle, extra }: {
    label: string; value: string;
    valueStyle?: React.CSSProperties;
    extra?: React.ReactNode;
  }) => (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"11px 0", borderBottom:"1px solid rgba(212,175,55,0.10)",
    }}>
      <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"rgba(255,255,255,0.50)", fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" }}>
        {label}
      </span>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:WHITE, fontWeight:600, textAlign:"right", ...valueStyle }}>{value}</span>
        {extra}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight:"100%",
      background:"linear-gradient(180deg,#050B1A 0%,#020509 100%)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"flex-start",
      padding: isMobile ? "40px 0 80px" : "56px 0 96px",
      overflowX:"hidden", position:"relative",
    }}>
      <S9Styles />

      {/* ── AMBIENT ORB ───────────────────────────────────────────────────── */}
      <div style={{
        position:"fixed", top:"20%", left:"50%", transform:"translateX(-50%)",
        width:800, height:800, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(212,175,55,0.06) 0%,transparent 65%)",
        pointerEvents:"none", zIndex:0,
      }} />

      {/* ── RETURNING BADGE ───────────────────────────────────────────────── */}
      {isReturning && (
        <div style={{
          position:"fixed", top:20, right:20, zIndex:999,
          background:"rgba(212,175,55,0.15)", border:"1px solid rgba(212,175,55,0.45)",
          borderRadius:10, padding:"8px 16px",
          fontFamily:"Inter,sans-serif", fontSize:13, color:GOLD, fontWeight:600,
          animation:"s9FadeUp 0.4s ease both",
          backdropFilter:"blur(12px)",
        }}>
          🔖 Order Found — Restored
        </div>
      )}

      {/* ── COPY TOAST ────────────────────────────────────────────────────── */}
      {copied && (
        <div style={{
          position:"fixed", bottom:32, left:"50%",
          transform:"translateX(-50%)",
          background:"rgba(212,175,55,0.18)", border:"1px solid rgba(212,175,55,0.50)",
          backdropFilter:"blur(20px)", borderRadius:12,
          padding:"12px 24px", zIndex:9999,
          fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:600, color:GOLD,
          display:"flex", alignItems:"center", gap:8,
          animation:"s9ToastSlide 0.3s ease both",
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Order ID Copied
        </div>
      )}

      {/* ── RECEIPT DONE TOAST ────────────────────────────────────────────── */}
      {receiptDone && (
        <div style={{
          position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)",
          background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.45)",
          backdropFilter:"blur(20px)", borderRadius:12,
          padding:"12px 24px", zIndex:9999,
          fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:600, color:"#10B981",
          display:"flex", alignItems:"center", gap:8,
          animation:"s9ToastSlide 0.3s ease both",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Receipt Downloaded
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ── CARD ──────────────────────────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div
        className="s9-card"
        style={{
          position:"relative", zIndex:1,
          width:cardW, maxWidth:cardMaxW,
          borderRadius:24,
          background:"linear-gradient(160deg,rgba(18,26,52,0.97) 0%,rgba(8,12,28,0.99) 100%)",
          border:"1px solid rgba(212,175,55,0.22)",
          overflow:"hidden",
        }}
      >
        {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
        <div style={{
          width:"100%", height: isMobile ? 200 : isTablet ? 260 : 300,
          position:"relative", overflow:"hidden",
          borderRadius:"24px 24px 0 0",
          flexShrink:0,
        }}>
          <img
            src="/assets/s9-hero-confirmation.png"
            alt="Order Confirmation"
            style={{
              width:"100%", height:"100%", objectFit:"cover",
              objectPosition:"center 30%",
              display:"block",
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Hero overlay */}
          <div style={{
            position:"absolute", inset:0,
            background:"linear-gradient(to bottom, rgba(5,11,26,0.0) 0%, rgba(5,11,26,0.65) 80%, rgba(5,11,26,1) 100%)",
          }} />
          {/* Step badge */}
          <div style={{
            position:"absolute", top:18, left:20,
            background:"rgba(5,11,26,0.72)", backdropFilter:"blur(12px)",
            border:"1px solid rgba(212,175,55,0.30)", borderRadius:8,
            padding:"5px 14px",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:700, color:GOLD, letterSpacing:"0.12em" }}>09</span>
            <div style={{ width:1, height:14, background:"rgba(212,175,55,0.30)" }}/>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.70)", letterSpacing:"0.08em" }}>CONFIRMATION</span>
          </div>
          {/* Hero headline */}
          <div style={{
            position:"absolute", bottom:24, left:0, right:0, textAlign:"center",
          }}>
            <div style={{
              fontFamily:"Playfair Display,serif", fontSize: isMobile ? 16 : 20,
              fontWeight:900, color:"rgba(255,255,255,0.90)", letterSpacing:"0.22em",
              textTransform:"uppercase", textShadow:"0 2px 16px rgba(0,0,0,0.7)",
            }}>
              YOUR STORY. NOW A LEGACY.
            </div>
          </div>
        </div>

        {/* ── CARD BODY ───────────────────────────────────────────────────── */}
        <div style={{ padding: isMobile ? "28px 20px 32px" : "36px 36px 40px" }}>

          {/* ── RING + SUCCESS ────────────────────────────────────────────── */}
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            marginBottom:28, animation:"s9FadeUp 0.5s 0.1s ease both", opacity:0,
          }}>
            {/* Pulse rings */}
            <div style={{ position:"relative", width:ringSize, height:ringSize, marginBottom:16 }}>
              {[0,1].map(i => (
                <div key={i} style={{
                  position:"absolute", inset:`-${i*14}px`,
                  borderRadius:"50%", border:"1px solid rgba(212,175,55,0.25)",
                  animation:`s9PulseRing 2.4s ${i*0.8}s ease-out infinite`,
                }} />
              ))}
              {/* Ring SVG */}
              <svg width={ringSize} height={ringSize} style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}>
                <circle cx={ringSize/2} cy={ringSize/2} r={ringR}
                  fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth={ringStroke}/>
                <circle cx={ringSize/2} cy={ringSize/2} r={ringR}
                  fill="none"
                  stroke="url(#s9RingG)"
                  strokeWidth={ringStroke}
                  strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringCirc}
                  style={{ animation:`s9RingDraw 1.3s cubic-bezier(0.38,0,0.18,1) 0.2s forwards` }}
                />
                <defs>
                  <linearGradient id="s9RingG" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#F8E38A"/>
                    <stop offset="100%" stopColor="#C9960A"/>
                  </linearGradient>
                </defs>
              </svg>
              {/* Check icon */}
              <div style={{
                position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                animation:"s9CheckPop 0.55s cubic-bezier(0.34,1.56,0.64,1) 1.0s both",
              }}>
                <svg width={ringSize * 0.38} height={ringSize * 0.38} viewBox="0 0 24 24" fill="none"
                  stroke="url(#s9CheckG)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="s9CheckG" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%"   stopColor="#F8E38A"/>
                      <stop offset="100%" stopColor="#C9960A"/>
                    </linearGradient>
                  </defs>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>

            {/* Headline */}
            <div style={{
              fontFamily:"Playfair Display,serif", fontWeight:700, textAlign:"center",
              fontSize: isMobile ? 26 : 32, color:WHITE, marginBottom:8,
              animation:"s9FadeUp 0.45s 0.55s ease both", opacity:0,
            }}>
              Payment Successful!
            </div>
            <div style={{
              fontFamily:"Inter,sans-serif", fontSize:15, color:"rgba(255,255,255,0.60)",
              textAlign:"center", maxWidth:320,
              animation:"s9FadeUp 0.45s 0.65s ease both", opacity:0,
            }}>
              {displayName ? `Thank you, ${displayName}! ` : "Thank you! "}Your order has been confirmed.
            </div>

            {/* Returning user badge */}
            {isReturning && (
              <div style={{
                marginTop:10, padding:"4px 14px", borderRadius:20,
                background:"rgba(212,175,55,0.10)", border:"1px solid rgba(212,175,55,0.35)",
                fontFamily:"Inter,sans-serif", fontSize:12, color:GOLD, fontWeight:600,
              }}>
                Order Found
              </div>
            )}
          </div>

          {/* ── DELIVERY ESTIMATE CARD ────────────────────────────────────── */}
          <div style={{
            background:"rgba(212,175,55,0.07)",
            border:"1px solid rgba(212,175,55,0.25)",
            borderRadius:14, padding:"14px 18px",
            marginBottom:20,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            animation:"s9FadeUp 0.45s 0.72s ease both", opacity:0,
          }}>
            <div>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>
                Estimated Delivery
              </div>
              <div style={{ fontFamily:"Playfair Display,serif", fontSize:17, fontWeight:700, color:GOLD }}>
                {deliveryEst}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>
                Production Status
              </div>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:6,
                background:"rgba(212,175,55,0.12)", borderRadius:20, padding:"3px 12px",
              }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:GOLD, boxShadow:`0 0 6px ${GOLD}` }} />
                <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:700, color:GOLD }}>
                  {jobStatus}
                </span>
              </div>
            </div>
          </div>

          {/* ── ORDER DETAILS ROWS ────────────────────────────────────────── */}
          <div style={{
            marginBottom:20,
            animation:"s9FadeUp 0.45s 0.78s ease both", opacity:0,
          }}>
            <InfoRow label="Package"      value={displayPkg} />
            <InfoRow
              label="Amount Paid"
              value={displayTotal}
              valueStyle={{ color:GOLD, fontWeight:700, fontFamily:"Playfair Display,serif", fontSize:16, textShadow:`0 0 12px rgba(212,175,55,0.35)` }}
            />
            <InfoRow
              label="Payment"
              value={displayMasked ?? displayMethod}
            />
            <InfoRow label="Date"         value={displayDate} />
            <InfoRow
              label="Order ID"
              value={displayOrderId}
              extra={
                <button className="s9-copy-btn" onClick={handleCopy} aria-label="Copy order ID">
                  {copied
                    ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
                    : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
                  }
                </button>
              }
            />
          </div>

          {/* ── EMAIL STATUS ──────────────────────────────────────────────── */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, marginBottom:18,
            padding:"12px 16px",
            background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.20)",
            borderRadius:12,
            animation:"s9FadeUp 0.45s 0.84s ease both", opacity:0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <div>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color:"#10B981" }}>
                Confirmation Email Sent
              </div>
              {displayEmail && (
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.45)", marginTop:2 }}>
                  Confirmation sent to: {displayEmail}
                </div>
              )}
            </div>
          </div>

          {/* ── ORDER TIMELINE ────────────────────────────────────────────── */}
          <div style={{
            marginBottom:20,
            animation:"s9FadeUp 0.45s 0.88s ease both", opacity:0,
          }}>
            <button
              className="s9-tl-toggle"
              onClick={() => setTlOpen(o => !o)}
              aria-expanded={tlOpen}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: tlOpen ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.2s" }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              {tlOpen ? "Hide" : "Show"} Order Timeline
            </button>
            {tlOpen && (
              <div style={{
                marginTop:14, paddingLeft:12,
                borderLeft:"2px solid rgba(212,175,55,0.20)",
                animation:"s9FadeUp 0.3s ease both",
              }}>
                {timeline.map((step, i) => (
                  <div key={i} style={{
                    display:"flex", alignItems:"flex-start", gap:14, marginBottom: i < timeline.length-1 ? 16 : 0,
                    position:"relative",
                  }}>
                    {/* Dot */}
                    <div style={{
                      width:10, height:10, borderRadius:"50%", marginTop:3, flexShrink:0,
                      background: step.done ? GOLD : "rgba(255,255,255,0.15)",
                      border: step.done ? "none" : "1px solid rgba(255,255,255,0.25)",
                      boxShadow: step.done ? `0 0 8px rgba(212,175,55,0.5)` : "none",
                      marginLeft:-6,
                    }} />
                    <div>
                      <div style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color: step.done ? WHITE : "rgba(255,255,255,0.40)" }}>
                        {step.label}
                      </div>
                      <div style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                        {step.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── DOWNLOAD RECEIPT ──────────────────────────────────────────── */}
          <button
            className="s9-btn-receipt"
            onClick={handleReceipt}
            style={{
              width:"100%", height:50, borderRadius:12, fontSize:14,
              marginBottom:14,
              animation:"s9FadeUp 0.45s 0.92s ease both", opacity:0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {receiptDone ? "Receipt Downloaded ✓" : "Download Receipt"}
          </button>

          {/* ── PRIMARY CTA ───────────────────────────────────────────────── */}
          <button
            className="s9-btn-primary"
            onClick={() => { s9Track("order_details_clicked"); onViewOrder(); }}
            style={{
              width:"100%", height:58, borderRadius:14, fontSize:16,
              marginBottom:12,
              animation:"s9FadeUp 0.45s 0.96s ease both", opacity:0,
            }}
          >
            View Order Details
          </button>

          {/* ── SECONDARY CTA ─────────────────────────────────────────────── */}
          <button
            className="s9-btn-secondary"
            onClick={() => { s9Track("dashboard_clicked"); onDashboard(); }}
            style={{
              width:"100%", height:52, borderRadius:14, fontSize:15,
              border:"1px solid rgba(212,175,55,0.30)", color:"rgba(255,255,255,0.85)",
              marginBottom:32,
              animation:"s9FadeUp 0.45s 1.02s ease both", opacity:0,
            }}
          >
            Go To Dashboard
          </button>

          {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
          <div style={{
            borderTop:"1px solid rgba(212,175,55,0.12)", paddingTop:24, marginTop:4,
            animation:"s9FadeUp 0.45s 1.06s ease both", opacity:0,
          }}>
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:16,
            }}>
              {/* Avatar chips */}
              <div style={{ display:"flex", gap:-8, position:"relative" }}>
                {S9_TESTIMONIALS.map((t, i) => (
                  <img
                    key={i}
                    src={t.avatar}
                    alt={t.name}
                    title={t.name}
                    onClick={() => { setSelAvatar(selAvatar === i ? null : i); }}
                    style={{
                      width:36, height:36, borderRadius:"50%", objectFit:"cover",
                      border: selAvatar === i ? `2px solid ${GOLD}` : "2px solid rgba(11,23,54,0.9)",
                      marginLeft: i === 0 ? 0 : -10,
                      cursor:"pointer", zIndex: selAvatar === i ? 10 : i,
                      boxShadow: selAvatar === i ? `0 0 10px rgba(212,175,55,0.5)` : "none",
                      transition:"transform 0.2s, border-color 0.2s",
                      transform: selAvatar === i ? "scale(1.15) translateY(-3px)" : "scale(1)",
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }}
                  />
                ))}
              </div>
              <div>
                <div style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:14, color:WHITE }}>
                  150K+
                </div>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.45)" }}>
                  storytellers
                </div>
              </div>
            </div>

            {/* Selected quote */}
            {selAvatar !== null && (
              <div style={{
                background:"rgba(212,175,55,0.07)", border:"1px solid rgba(212,175,55,0.20)",
                borderRadius:12, padding:"14px 16px", marginBottom:16,
                animation:"s9FadeUp 0.25s ease both",
              }}>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"rgba(255,255,255,0.85)", fontStyle:"italic", marginBottom:8 }}>
                  "{S9_TESTIMONIALS[selAvatar].text}"
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <img src={S9_TESTIMONIALS[selAvatar].avatar} alt="" style={{ width:24, height:24, borderRadius:"50%", objectFit:"cover" }} />
                  <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color:GOLD }}>
                    {S9_TESTIMONIALS[selAvatar].name}
                  </span>
                  <span style={{ marginLeft:4 }}>{"★".repeat(5)}</span>
                </div>
              </div>
            )}

            {/* Mobile scroll cards */}
            {isMobile && (
              <div style={{
                display:"flex", gap:12, overflowX:"auto",
                paddingBottom:8, scrollbarWidth:"none",
              }}>
                {S9_TESTIMONIALS.slice(0,4).map((t,i) => (
                  <div key={i} style={{
                    flexShrink:0, width:200,
                    background:"rgba(212,175,55,0.05)", border:"1px solid rgba(212,175,55,0.15)",
                    borderRadius:12, padding:"14px",
                  }}>
                    <div style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.75)", fontStyle:"italic", marginBottom:8 }}>
                      "{t.text}"
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <img src={t.avatar} alt={t.name} style={{ width:22, height:22, borderRadius:"50%", objectFit:"cover" }} />
                      <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:GOLD }}>{t.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.35)", textAlign:"center", marginTop:8 }}>
              Tap any avatar to read their story
            </div>
          </div>

          {/* ── FOOTER ────────────────────────────────────────────────────── */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            marginTop:24,
            animation:"s9FadeUp 0.45s 1.10s ease both", opacity:0,
          }}>
            <svg width="16" height="15" viewBox="0 0 18 17" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="s9HrtG" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="#F8E38A"/>
                  <stop offset="100%" stopColor="#C9960A"/>
                </linearGradient>
              </defs>
              <path d="M9 15.5S1 10.8 1 5.8A4 4 0 019 3.5a4 4 0 018 2.3c0 5-8 9.7-8 9.7z"
                fill="url(#s9HrtG)"
                style={{ filter:"drop-shadow(0 0 5px rgba(212,175,55,0.55))" }}
              />
            </svg>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"rgba(255,255,255,0.55)" }}>
              We can't wait to create something amazing for you!
            </span>
          </div>

          {/* ── FALLBACK NOTICE ───────────────────────────────────────────── */}
          {isFallback && (
            <div style={{
              marginTop:16, padding:"10px 16px", borderRadius:10,
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
              fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.35)",
              textAlign:"center",
            }}>
              Sample order shown. Complete checkout to see your real confirmation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── S9 Order Details Modal ───────────────────────────────────────────────────
function S9OrderDetailsModal({ onClose }: { onClose: () => void }) {
  const order = useS9Order();
  const GOLD  = "#D4AF37";
  const WHITE = "#FFFFFF";

  const displayOrderId = s9San(order?.orderId      ?? "GM-2024-89271");
  const displayPkg     = s9San(order?.packageName  ?? "Premium Song Package");
  const displayTotal   = order?.total != null ? `${parseFloat(String(order.total)).toFixed(2)}` : "$79.00";
  const displayMethod  = fmtPayMethod(order?.paymentMethod ?? "card");
  const displayDate    = fmtDate(order?.purchaseTimestamp || order?.paidAt);
  const deliveryEst    = s9San(order?.deliveryEstimate ?? "3–5 Business Days");
  const jobStatus      = s9San(order?.jobStatus ?? "Queued");
  const [copied, setCopied] = React.useState(false);

  // Trap body scroll
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  React.useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const copyId = React.useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(displayOrderId).then(() => {
        setCopied(true); setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [displayOrderId]);

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Order ID",           value: displayOrderId },
    { label: "Package",            value: displayPkg },
    { label: "Amount Paid",        value: displayTotal, highlight: true },
    { label: "Payment Method",     value: displayMethod },
    { label: "Order Date",         value: displayDate },
    { label: "Delivery Estimate",  value: deliveryEst },
    { label: "Production Status",  value: jobStatus },
  ];
  if (order?.customerEmail) rows.push({ label: "Confirmation Email", value: s9San(order.customerEmail) });

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, zIndex:9999,
        background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"20px 16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:"100%", maxWidth:520,
          background:"linear-gradient(160deg,rgba(14,22,46,0.98) 0%,rgba(8,12,28,1) 100%)",
          border:"1px solid rgba(212,175,55,0.28)",
          borderRadius:20, overflow:"hidden",
          maxHeight:"90vh", overflowY:"auto",
          animation:"s9FadeUp 0.3s ease both",
        }}
      >
        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"20px 24px 16px",
          borderBottom:"1px solid rgba(212,175,55,0.12)",
        }}>
          <div style={{ fontFamily:"Playfair Display,serif", fontSize:20, fontWeight:700, color:WHITE }}>
            Order Details
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:8, width:34, height:34, cursor:"pointer", color:"rgba(255,255,255,0.60)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Status badge */}
        <div style={{ padding:"16px 24px 12px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(16,185,129,0.10)", border:"1px solid rgba(16,185,129,0.30)",
            borderRadius:20, padding:"6px 16px",
          }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 8px #10B981" }} />
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:700, color:"#10B981" }}>Payment Confirmed</span>
          </div>
        </div>

        {/* Rows */}
        <div style={{ padding:"0 24px 8px" }}>
          {rows.map(({ label, value, highlight }) => (
            <div key={label} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"12px 0", borderBottom:"1px solid rgba(212,175,55,0.08)",
            }}>
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.45)", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                {label}
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{
                  fontFamily: highlight ? "Playfair Display,serif" : "Inter,sans-serif",
                  fontSize: highlight ? 17 : 14, fontWeight:600,
                  color: highlight ? GOLD : WHITE,
                  textShadow: highlight ? `0 0 12px rgba(212,175,55,0.4)` : "none",
                }}>
                  {value}
                </span>
                {label === "Order ID" && (
                  <button
                    onClick={copyId}
                    style={{
                      background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.25)",
                      borderRadius:6, padding:"2px 10px", cursor:"pointer",
                      fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:GOLD,
                      display:"flex", alignItems:"center", gap:4,
                    }}
                  >
                    {copied
                      ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
                      : "Copy"
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div style={{ padding:"20px 24px 24px" }}>
          <button
            onClick={onClose}
            style={{
              width:"100%", height:48, borderRadius:12,
              background:"linear-gradient(135deg,#D4AF37 0%,#F4D06F 50%,#C9960A 100%)",
              border:"none", cursor:"pointer",
              fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:700, color:"#050B1A",
              letterSpacing:"0.04em",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── TASK 5: S9 CELEBRATION OVERLAY ───────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const GM_S9_CELEBRATED_KEY = "gm_s9_celebrated";

function S9CelebrationOverlay({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = React.useState(true);
  const [particles] = React.useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.2,
      size: 3 + Math.random() * 5,
      dur: 1.8 + Math.random() * 1.4,
    }))
  );

  React.useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 600);
    }, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="s9-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "radial-gradient(ellipse at center, rgba(5,4,16,0.96) 0%, rgba(3,3,10,0.98) 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Gold particles */}
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 0, x: `${p.x}vw` }}
              animate={{ opacity: [0, 1, 0], y: -220, x: `${p.x + (Math.random() - 0.5) * 10}vw` }}
              transition={{ duration: p.dur, delay: p.delay, ease: "easeOut" }}
              style={{
                position: "absolute", bottom: "10%",
                width: p.size, height: p.size,
                borderRadius: "50%",
                background: p.id % 3 === 0 ? "#D4AF37" : p.id % 3 === 1 ? "#F4D06F" : "#FFF8DC",
                boxShadow: `0 0 ${p.size * 2}px ${p.id % 3 === 0 ? "#D4AF37" : "#F4D06F"}`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Gold ring */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              width: 120, height: 120, borderRadius: "50%",
              border: "2px solid rgba(212,175,55,0.6)",
              boxShadow: "0 0 40px rgba(212,175,55,0.35), inset 0 0 20px rgba(212,175,55,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 32,
            }}
          >
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ fontSize: 48, lineHeight: 1 }}
            >✦</motion.span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "clamp(26px, 5vw, 42px)",
              fontWeight: 700, color: "#D4AF37",
              textAlign: "center", margin: "0 0 16px",
              lineHeight: 1.2, padding: "0 24px",
            }}
          >
            Your Cinematic Journey Begins
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 15, color: "rgba(255,255,255,0.55)",
              textAlign: "center", margin: 0, padding: "0 32px",
            }}
          >
            Your story is now in production
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const GM_OB_STEP_KEY = "gm_ob_step";
const MEMBER_BAR_H = 44; // px — height of member bar

export default function Onboarding() {
  const { data: session, isPending: sessionLoading } = useSession();
  const isAuthed = !!session?.user;
  const [, setLocation] = useLocation();

  // Step init: URL param > localStorage > 1
  const [step, setStep] = useState(() => {
    if (typeof window === "undefined") return 1;
    const urlStep = parseInt(new URLSearchParams(window.location.search).get("step") || "0") || 0;
    if (urlStep >= 1 && urlStep <= 9) return urlStep;
    const saved = parseInt(localStorage.getItem(GM_OB_STEP_KEY) || "1") || 1;
    return Math.min(Math.max(saved, 1), 9);
  });

  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [memberData, setMemberData] = useState<{ memberId: string; status: string; tier: string; name: string } | null>(null);

  // ── Task 4: Autosave indicator ────────────────────────────────────────────
  const [saveToast, setSaveToast] = useState(false);
  // ── Task 1: Smart resume banner ───────────────────────────────────────────
  const [resumeBanner, setResumeBanner] = useState<{ savedStep: number } | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  // ── Task 5: S9 celebration ────────────────────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  // ── Viewport for sidebar/breadcrumb ──────────────────────────────────────
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  useEffect(() => {
    const fn = () => setWinW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  const [obData, setObData] = useState<OnboardingData>({
    whoFor: null, experienceType: null, storyText: "",
    recordedAudio: null, uploadedPhotos: [], uploadedVideos: [],
    uploadedVoiceNotes: [], uploadedDocuments: [],
  });

  // Always persist step — even unauthenticated (so desktop mode flip doesn't lose it)
  useEffect(() => {
    if (step >= 1 && step <= 9) localStorage.setItem(GM_OB_STEP_KEY, String(step));
  }, [step]);

  // ── Task 4: Ctrl+S manual save ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        localStorage.setItem(GM_OB_STEP_KEY, String(step));
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2000);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step]);

  // On auth resolve: ensure member record + load member data
  useEffect(() => {
    if (sessionLoading || !isAuthed) return;
    // Resume saved step if we landed on step 1 (e.g. after Google OAuth redirect)
    const saved = parseInt(localStorage.getItem(GM_OB_STEP_KEY) || "1") || 1;
    if (saved > 1 && step === 1) {
      // Task 1: show resume banner instead of auto-jumping
      setResumeBanner({ savedStep: saved });
    }
    // Ensure member record exists
    fetch("/api/members/create", { method: "POST", headers: { "Content-Type": "application/json" } }).catch(() => {});
    // Load member data for bar
    fetch("/api/members/me")
      .then(r => r.ok ? r.json() : null)
      .then((data: { member: { memberId: string; status: string; tier: string } | null } | null) => {
        if (data?.member) {
          setMemberData({
            memberId: data.member.memberId,
            status: data.member.status,
            tier: data.member.tier,
            name: session?.user?.name ?? "",
          });
        }
      })
      .catch(() => {});
  }, [sessionLoading, isAuthed]); // eslint-disable-line

  const next = () => {
    if (step === 1 && sessionLoading) return;
    if (step === 1 && !isAuthed) { setAuthGateOpen(true); return; }
    // Task 5: trigger S9 celebration on first arrival at step 9
    if (step === 8) {
      const alreadyCelebrated = sessionStorage.getItem(GM_S9_CELEBRATED_KEY);
      if (!alreadyCelebrated) {
        sessionStorage.setItem(GM_S9_CELEBRATED_KEY, "1");
        setShowCelebration(true);
      }
    }
    setStep(s => Math.min(s + 1, 9));
  };
  // back() always stays inside onboarding — S1 is the terminal back point (never exits to / or /sophia)
  const back = () => setStep(s => Math.max(s - 1, 1));

  // ── Browser back button intercept ─────────────────────────────────────────
  // Pushes a fake history entry so browser back stays inside the onboarding flow
  useEffect(() => {
    // Push a sentinel so there's always an entry to pop back to
    window.history.pushState({ gmOb: true, step }, "", "/onboarding");

    const handlePopState = (e: PopStateEvent) => {
      // Always prevent navigating away — handle back internally
      e.preventDefault();
      // Re-push so the URL stays as /onboarding
      window.history.pushState({ gmOb: true, step }, "", "/onboarding");
      // Trigger internal back (stops at step 1)
      setStep(s => Math.max(s - 1, 1));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [step]); // re-register when step changes so the sentinel stays current
  const [orderModalOpen, setOrderModalOpen] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<S5AnalysisResult | null>(null);
  const setWhoFor         = (v: string) => setObData(d => ({ ...d, whoFor: v }));
  const setExperienceType = (v: string) => setObData(d => ({ ...d, experienceType: v }));
  const setStoryText      = (v: string) => setObData(d => ({ ...d, storyText: v }));
  const setRecordedAudio  = (v: string | null) => setObData(d => ({ ...d, recordedAudio: v }));
  const setPhotos         = (v: UploadedFile[]) => setObData(d => ({ ...d, uploadedPhotos: v }));
  const setVideos         = (v: UploadedFile[]) => setObData(d => ({ ...d, uploadedVideos: v }));
  const setVoiceNotes     = (v: UploadedFile[]) => setObData(d => ({ ...d, uploadedVoiceNotes: v }));
  const setDocuments      = (v: UploadedFile[]) => setObData(d => ({ ...d, uploadedDocuments: v }));

  const showBar = isAuthed && memberData;
  const barH = showBar ? MEMBER_BAR_H : 0;

  return (
    <div style={{ background:"#06040f", position:"fixed", inset:0, overflow:"hidden" }}>

      {/* ── TASK 5: S9 Celebration overlay ── */}
      {showCelebration && (
        <S9CelebrationOverlay onDone={() => setShowCelebration(false)} />
      )}

      {/* ── TASK 4: Ctrl+S autosave toast ── */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            key="save-toast"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed", top: showBar ? MEMBER_BAR_H + 12 : 12, right: 16,
              zIndex: 99998,
              background: "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.40)",
              borderRadius: 8, padding: "7px 14px",
              fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
              color: GOLD, letterSpacing: "0.04em",
              backdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", gap: 6,
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 14 }}>✓</span> Saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TASK 1: Smart resume banner (step 1 only, authed, dismissed on choose) ── */}
      <AnimatePresence>
        {!resumeDismissed && resumeBanner && step === 1 && (
          <motion.div
            key="resume-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            style={{
              position: "fixed",
              top: showBar ? MEMBER_BAR_H + 8 : 8,
              left: "50%", transform: "translateX(-50%)",
              zIndex: 9990,
              background: "rgba(10,9,22,0.96)",
              border: "1px solid rgba(212,175,55,0.35)",
              borderRadius: 12, padding: "12px 18px",
              fontFamily: "Inter, sans-serif",
              backdropFilter: "blur(16px)",
              display: "flex", alignItems: "center", gap: 12,
              maxWidth: "calc(100vw - 32px)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            <span style={{ fontSize: 18 }}>✦</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" }}>
              Welcome back — resume from{" "}
              <strong style={{ color: GOLD }}>
                Step {resumeBanner.savedStep}: {STEPS[resumeBanner.savedStep - 1]}?
              </strong>
            </span>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => {
                  setStep(Math.min(resumeBanner.savedStep, 9));
                  setResumeDismissed(true);
                }}
                style={{
                  background: GOLD, color: "#000", border: "none",
                  borderRadius: 6, padding: "5px 12px",
                  fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >Continue</button>
              <button
                onClick={() => {
                  localStorage.setItem(GM_OB_STEP_KEY, "1");
                  setResumeDismissed(true);
                }}
                style={{
                  background: "transparent", color: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6, padding: "5px 10px",
                  fontFamily: "Inter, sans-serif", fontSize: 11,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >Restart</button>
            </div>
            <button
              onClick={() => setResumeDismissed(true)}
              style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                fontSize: 16, cursor: "pointer", padding: "0 2px", lineHeight: 1,
              }}
            >×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PERSISTENT MEMBER BAR — responsive 3-device ── */}
      {showBar && (
        <div style={{
          position:"fixed", top:0, left:0, right:0, zIndex:9999,
          height: MEMBER_BAR_H,
          background:"linear-gradient(90deg,rgba(8,7,18,0.98) 0%,rgba(10,13,26,0.98) 50%,rgba(8,7,18,0.98) 100%)",
          borderBottom:"1px solid rgba(212,175,55,0.20)",
          backdropFilter:"blur(16px)",
          display:"flex", alignItems:"center",
          padding:"0 16px",
          boxSizing:"border-box",
          gap:0,
        }}>
          {/* Status dot + GM ID */}
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <div style={{
              width:6, height:6, borderRadius:"50%", flexShrink:0,
              background: memberData.status === "active" ? "#22C55E" : "#F59E0B",
              boxShadow: memberData.status === "active" ? "0 0 5px rgba(34,197,94,0.8)" : "0 0 5px rgba(245,158,11,0.8)",
            }}/>
            <span style={{
              fontFamily:"Inter,sans-serif", fontSize:10, fontWeight:700,
              color:GOLD, letterSpacing:"0.08em", whiteSpace:"nowrap",
            }}>{memberData.memberId}</span>
          </div>

          {/* Divider */}
          <div style={{ width:1, height:14, background:"rgba(255,255,255,0.12)", margin:"0 10px", flexShrink:0 }}/>

          {/* Name — hidden on very small screens via inline media workaround */}
          <span className="gmbar-name" style={{
            fontFamily:"Inter,sans-serif", fontSize:10,
            color:"rgba(255,255,255,0.40)", whiteSpace:"nowrap",
            overflow:"hidden", textOverflow:"ellipsis",
            maxWidth:90, flexShrink:1,
          }}>
            {memberData.name || session?.user?.email?.split("@")[0] || "Member"}
          </span>

          {/* Spacer */}
          <div style={{ flex:1 }}/>

          {/* Step pill — center */}
          <div style={{
            fontFamily:"Inter,sans-serif", fontSize:9, fontWeight:600,
            color:"rgba(255,255,255,0.35)", letterSpacing:"0.10em",
            textTransform:"uppercase", whiteSpace:"nowrap",
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:8, padding:"2px 8px", flexShrink:0,
          }}>
            {step}/9 · {STEPS[step - 1]}
          </div>

          {/* Spacer */}
          <div style={{ flex:1 }}/>

          {/* Tier badge */}
          <div style={{
            padding:"2px 8px",
            background:"rgba(212,175,55,0.10)",
            border:"1px solid rgba(212,175,55,0.22)",
            borderRadius:10, flexShrink:0,
            fontFamily:"Inter,sans-serif", fontSize:8, fontWeight:700,
            color:GOLD, letterSpacing:"0.10em", textTransform:"uppercase",
            whiteSpace:"nowrap",
          }}>
            {memberData.tier === "free" ? "FREE" : memberData.tier.toUpperCase()}
          </div>

          {/* Divider */}
          <div style={{ width:1, height:14, background:"rgba(255,255,255,0.12)", margin:"0 10px", flexShrink:0 }}/>

          {/* Dashboard link */}
          <a href="/dashboard" style={{
            fontFamily:"Inter,sans-serif", fontSize:10, fontWeight:600,
            color:GOLD, textDecoration:"none", whiteSpace:"nowrap",
            letterSpacing:"0.04em", flexShrink:0,
          }}>
            Dashboard →
          </a>

          {/* Responsive: hide name on mobile */}
          <style>{`
            @media(max-width:420px){ .gmbar-name{ display:none!important; } }
          `}</style>
        </div>
      )}
      <AuthGateModal
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        redirectTo="/onboarding"
      />
      {/* Step content area — offset by member bar height when bar is visible */}
      <div style={{
        position:"absolute",
        top: barH,
        left:0, right:0, bottom:0,
        overflow:"hidden",
        display:"flex", flexDirection:"row",
      }}>

        {/* ── TASK 2: Sidebar step rail — desktop only (≥1024px), hidden on S1 which has its own full-screen hero ── */}
        {winW >= 1024 && step > 1 && (
          <div style={{
            width: 200, flexShrink: 0,
            background: "rgba(6,4,15,0.95)",
            borderRight: "1px solid rgba(212,175,55,0.10)",
            display: "flex", flexDirection: "column",
            padding: "28px 0 24px",
            overflowY: "auto", overflowX: "hidden",
            zIndex: 10,
          }}>
            {/* Logo mark */}
            <div style={{
              fontFamily: "Playfair Display, serif",
              fontSize: 11, fontWeight: 700, color: GOLD,
              letterSpacing: "0.12em", textTransform: "uppercase",
              padding: "0 20px 20px",
              borderBottom: "1px solid rgba(212,175,55,0.08)",
              marginBottom: 16,
            }}>Onboarding</div>

            {STEPS.map((label, i) => {
              const s = i + 1;
              const isActive = s === step;
              const isDone = s < step;
              return (
                <div
                  key={s}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 20px",
                    cursor: isDone ? "pointer" : "default",
                    background: isActive ? "rgba(212,175,55,0.07)" : "transparent",
                    borderLeft: isActive ? `2px solid ${GOLD}` : "2px solid transparent",
                    transition: "all 0.2s",
                  }}
                  onClick={() => { if (isDone) setStep(s); }}
                >
                  {/* Step icon */}
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: isDone
                      ? "rgba(212,175,55,0.20)"
                      : isActive
                        ? "rgba(212,175,55,0.15)"
                        : "rgba(255,255,255,0.04)",
                    border: isDone
                      ? "1px solid rgba(212,175,55,0.50)"
                      : isActive
                        ? `1px solid ${GOLD}`
                        : "1px solid rgba(255,255,255,0.10)",
                    color: isDone ? GOLD : isActive ? GOLD : "rgba(255,255,255,0.25)",
                    boxShadow: isActive ? `0 0 8px rgba(212,175,55,0.35)` : "none",
                    position: "relative",
                  }}>
                    {isDone ? "✓" : s}
                    {isActive && (
                      <div style={{
                        position: "absolute", inset: -3,
                        borderRadius: "50%",
                        border: "1px solid rgba(212,175,55,0.25)",
                        animation: "gmPulse 2s ease-in-out infinite",
                      }}/>
                    )}
                  </div>
                  {/* Label */}
                  <span style={{
                    fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: isActive ? 600 : 400,
                    color: isDone ? "rgba(212,175,55,0.80)" : isActive ? "#FFFFFF" : "rgba(255,255,255,0.28)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    lineHeight: 1.3,
                  }}>{label}</span>
                </div>
              );
            })}

            <style>{`@keyframes gmPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:0.2;transform:scale(1.15)} }`}</style>
          </div>
        )}

        {/* Right column: breadcrumb + step content */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>

          {/* ── TASK 3: Breadcrumb — hidden mobile (<768px) and hidden on S1 (has its own full-screen header) ── */}
          {winW >= 768 && step > 1 && (
            <div style={{
              flexShrink: 0,
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px",
              borderBottom: "1px solid rgba(212,175,55,0.07)",
              background: "rgba(6,4,15,0.80)",
              backdropFilter: "blur(8px)",
              zIndex: 5,
            }}>
              {["Ghaafeedi Music", "Onboarding", STEPS[step - 1]].map((crumb, idx, arr) => (
                <React.Fragment key={idx}>
                  <span style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 10, fontWeight: idx === arr.length - 1 ? 600 : 400,
                    color: idx === arr.length - 1 ? GOLD : "rgba(255,255,255,0.30)",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}>{crumb}</span>
                  {idx < arr.length - 1 && (
                    <span style={{ color: "rgba(212,175,55,0.35)", fontSize: 9 }}>›</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Step AnimatePresence */}
          <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.35 }}
            style={{ height:"100%", overflow:"hidden", position:"absolute", inset:0 }}
          >
            <Step1Welcome onNext={next} sessionLoading={sessionLoading} isLoggedIn={!!session?.user} session={session}/>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="s2"
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.35 }}
            style={{ height:"100%", overflowY:"auto" }}
          >
            <Step2WhoIsThisFor
              selected={obData.whoFor}
              onSelect={setWhoFor}
              onNext={next}
              onBack={back}
            />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="s3"
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.35 }}
            style={{ height:"100%", overflowY:"auto" }}
          >
            <Step3ChooseExperience
              selected={obData.experienceType}
              onSelect={setExperienceType}
              onNext={next}
              onBack={back}
            />
          </motion.div>
        )}
        {step === 4 && (
          <motion.div key="s4"
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.35 }}
            style={{ height:"100%", overflow:"hidden" }}
          >
            <Step4TellYourStory
              storyText={obData.storyText}
              onStoryTextChange={setStoryText}
              recordedAudio={obData.recordedAudio}
              onRecordedAudio={setRecordedAudio}
              uploadedPhotos={obData.uploadedPhotos}
              onPhotos={setPhotos}
              uploadedVideos={obData.uploadedVideos}
              onVideos={setVideos}
              uploadedVoiceNotes={obData.uploadedVoiceNotes}
              onVoiceNotes={setVoiceNotes}
              uploadedDocuments={obData.uploadedDocuments}
              onDocuments={setDocuments}
              onNext={next}
              onBack={back}
            />
          </motion.div>
        )}
        {step === 5 && (
          <motion.div key="s5"
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.35 }}
            style={{ height:"100%", overflow:"hidden" }}
          >
            <Step5AIAnalysis
              whoFor={obData.whoFor}
              experienceType={obData.experienceType}
              storyText={obData.storyText}
              uploadedPhotos={obData.uploadedPhotos}
              uploadedVideos={obData.uploadedVideos}
              uploadedVoiceNotes={obData.uploadedVoiceNotes}
              uploadedDocuments={obData.uploadedDocuments}
              recordedAudio={obData.recordedAudio}
              onNext={(result) => { setAnalysisResult(result); next(); }}
              onBack={back}
            />
          </motion.div>
        )}
        {step === 6 && (
          <motion.div key="s6"
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.35 }}
            style={{ height:"100%", overflowY:"auto", overflowX:"hidden" }}
          >
            <Step6PreviewCreation
              whoFor={obData.whoFor}
              experienceType={obData.experienceType}
              storyText={obData.storyText}
              analysisData={analysisResult ? {
                dominantEmotion: analysisResult.dominantEmotion,
                songTitle: analysisResult.songTitle,
                emotionalArc: analysisResult.emotionalArc,
                emotionalFingerprint: analysisResult.emotionalFingerprint,
              } : undefined}
              onNext={next}
              onBack={back}
            />
          </motion.div>
        )}
        {step === 7 && (
          <motion.div key="s7"
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.35 }}
            style={{ height:"100%", overflowY:"auto", overflowX:"hidden" }}
          >
            <Step7ProductionPortal
              whoFor={obData.whoFor}
              experienceType={obData.experienceType}
              onBack={back}
              onNext={next}
            />
          </motion.div>
        )}
        {step === 8 && (
          <motion.div key="s8"
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.35 }}
            style={{ height:"100%", overflowY:"auto", overflowX:"hidden" }}
          >
            <Step8Checkout
              whoFor={obData.whoFor}
              experienceType={obData.experienceType}
              onBack={back}
              onNext={next}
            />
          </motion.div>
        )}
        {step === 9 && (
          <motion.div key="s9"
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.38 }}
          >
            <Step9OrderConfirmation
              onViewOrder={() => {
                s9Track("order_details_modal_open");
                setOrderModalOpen(true);
              }}
              onDashboard={() => {
                s9Track("dashboard_nav");
                localStorage.removeItem(GM_OB_STEP_KEY);
                setLocation("/dashboard");
              }}
            />
            {orderModalOpen && <S9OrderDetailsModal onClose={() => setOrderModalOpen(false)} />}
          </motion.div>
        )}
        {/* No steps beyond 9 — journey ends at Confirmation */}
      </AnimatePresence>
      </div>{/* end step AnimatePresence wrapper */}
        </div>{/* end right column */}
      </div>{/* end step content wrapper */}
    </div>
  );
}
