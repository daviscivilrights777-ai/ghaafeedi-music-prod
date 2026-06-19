/**
 * GHAAFEEDI MUSIC — ENTRY GATE
 * ══════════════════════════════════════════════════════════════════
 * Shown on every visit to "/". Two choices:
 *   A) "Watch Our Story" → full SplashLandingPage (all 6 sections) → homepage
 *   B) "Go to Homepage"  → skip straight to homepage
 *
 * No localStorage. No one-time gate. Always presented.
 * After either path completes, homepage renders normally.
 */
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOLD  = "#D4AF37";
const GOLD2 = "#F4D06F";
const GOLD3 = "#FBE8A6";
const BG    = "#050B1A";
const BG2   = "#07101F";
const TEXT  = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.55)";

// ─── CSS injected once ────────────────────────────────────────────────────────
const CSS = `
@keyframes eg-breathe { 0%,100%{filter:brightness(1)drop-shadow(0 0 48px rgba(212,175,55,.30))drop-shadow(0 0 100px rgba(180,120,20,.14))} 50%{filter:brightness(1.08)drop-shadow(0 0 68px rgba(212,175,55,.52))drop-shadow(0 0 140px rgba(180,120,20,.24))} }
@keyframes eg-star    { 0%,100%{opacity:.10;transform:scale(1)} 50%{opacity:.55;transform:scale(1.7)} }
@keyframes eg-float   { 0%,100%{transform:translateY(0)translateX(0)} 40%{transform:translateY(-14px)translateX(4px)} 70%{transform:translateY(-5px)translateX(-6px)} }
@keyframes eg-ring    { 0%,100%{transform:translate(-50%,-50%)scale(0.90);opacity:.32} 50%{transform:translate(-50%,-50%)scale(1.28);opacity:.07} }
@keyframes eg-corona  { 0%,100%{transform:translate(-50%,-50%)scale(1.00);opacity:.48} 45%{transform:translate(-50%,-50%)scale(1.18);opacity:.76} }
@keyframes eg-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes eg-pulse-border { 0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.0), inset 0 0 0 1.5px rgba(212,175,55,.35)} 50%{box-shadow:0 0 22px 4px rgba(212,175,55,.18), inset 0 0 0 1.5px rgba(212,175,55,.65)} }
@keyframes eg-btn-glow { 0%,100%{box-shadow:0 0 28px rgba(212,175,55,.28),0 4px 24px rgba(0,0,0,.55)} 50%{box-shadow:0 0 52px rgba(212,175,55,.52),0 4px 32px rgba(0,0,0,.65)} }
`;

// ─── Stable stars & particles (deterministic, no hydration mismatch) ──────────
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: ((i * 137.508 + 31) % 100),
  y: ((i * 73.211  + 17) % 100),
  r: 0.7 + ((i * 11.3) % 1.5),
  delay: ((i * 0.31) % 4.5).toFixed(2),
  dur:   (2.4 + ((i * 0.19) % 2.6)).toFixed(2),
  gold:  i % 6 === 0,
}));

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  x: 8 + ((i * 83.7 + 11) % 84),
  y: 6 + ((i * 61.3 + 29) % 88),
  r: 1.0 + ((i * 7.3) % 2.2),
  delay: ((i * 0.43) % 6).toFixed(2),
  dur:   (5 + ((i * 0.31) % 6)).toFixed(2),
  op: (0.07 + ((i * 0.03) % 0.20)).toFixed(3),
  gold: i % 3 === 0,
}));

// ─── Animated background canvas (lens flare burst on mount) ──────────────────
function StarField() {
  return (
    <>
      {/* Stars */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {STARS.map((st, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${st.x}%`, top: `${st.y}%`,
            width: st.r * 2, height: st.r * 2,
            borderRadius: "50%",
            background: st.gold ? `rgba(212,175,55,0.80)` : "rgba(255,255,255,0.75)",
            animation: `eg-star ${st.dur}s ease-in-out ${st.delay}s infinite`,
          }} />
        ))}
      </div>
      {/* Floating particles */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {PARTICLES.map((p, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.r * 2, height: p.r * 2,
            borderRadius: "50%",
            background: p.gold ? `rgba(212,175,55,${p.op})` : `rgba(255,255,255,${p.op})`,
            animation: `eg-float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }} />
        ))}
      </div>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface EntryGateProps {
  onWatchStory: () => void;  // → show SplashLandingPage
  onGoHome:     () => void;  // → go straight to homepage
}

export function EntryGate({ onWatchStory, onGoHome }: EntryGateProps) {
  const [exiting, setExiting]   = useState(false);
  const [choice,  setChoice]    = useState<"story" | "home" | null>(null);
  const [logoW,   setLogoW]     = useState(0);
  const [logoH,   setLogoH]     = useState(0);
  const containerRef            = useRef<HTMLDivElement>(null);
  const LOGO_ASPECT             = 1920 / 1088;

  // CSS injection
  useEffect(() => {
    if (document.getElementById("eg-css")) return;
    const tag = document.createElement("style");
    tag.id = "eg-css";
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Logo sizing
  useEffect(() => {
    const update = () => {
      const W = window.innerWidth;
      const w = W >= 1200 ? W * 0.52 : W >= 768 ? W * 0.68 : W * 0.82;
      setLogoW(w);
      setLogoH(w / LOGO_ASPECT);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const pick = (which: "story" | "home") => {
    if (exiting) return;
    setChoice(which);
    setExiting(true);
    setTimeout(() => {
      if (which === "story") onWatchStory();
      else onGoHome();
    }, 520);
  };

  const coronaR = logoH * 0.20;
  const logoX   = (typeof window !== "undefined" ? window.innerWidth : 1440) / 2;
  const logoY   = logoH * 0.285;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="entry-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          ref={containerRef}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: `radial-gradient(ellipse 110% 80% at 50% 30%, #0D1B3E 0%, #050B1A 55%, #020610 100%)`,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            fontFamily: "Inter, sans-serif", color: TEXT,
            overflow: "hidden",
          }}
        >
          <StarField />

          {/* ── Corona glow behind logo ── */}
          {logoW > 0 && (
            <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
              {/* outer pulse ring */}
              <div style={{
                position: "absolute",
                left: "50%", top: logoY + logoH * 0.285,
                width: coronaR * 3.4, height: coronaR * 3.4,
                borderRadius: "50%",
                background: "transparent",
                border: `1px solid rgba(212,175,55,0.10)`,
                animation: "eg-ring 4.5s ease-in-out infinite",
                transform: "translate(-50%,-50%)",
              }} />
              {/* inner corona */}
              <div style={{
                position: "absolute",
                left: "50%", top: logoY + logoH * 0.285,
                width: coronaR * 2, height: coronaR * 2,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(180,120,20,0.10) 45%, transparent 72%)`,
                animation: "eg-corona 5s ease-in-out infinite",
                transform: "translate(-50%,-50%)",
                filter: "blur(18px)",
              }} />
            </div>
          )}

          {/* ── Logo ── */}
          {logoW > 0 && (
            <motion.img
              src="/assets/ghaafeedi-logo-dark.webp"
              alt="Ghaafeedi Music"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: logoW, height: logoH,
                objectFit: "contain", objectPosition: "center",
                position: "relative", zIndex: 4,
                animation: "eg-breathe 6s ease-in-out 1.2s infinite",
                willChange: "filter",
                pointerEvents: "none", userSelect: "none",
                flexShrink: 0,
              }}
            />
          )}

          {/* ── Tagline ── */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(13px,1.6vw,18px)",
              fontStyle: "italic",
              color: `rgba(212,175,55,0.80)`,
              letterSpacing: "0.05em",
              textAlign: "center",
              margin: "clamp(10px,2vw,20px) 0 clamp(28px,4vw,48px)",
              position: "relative", zIndex: 5,
              maxWidth: 540,
              padding: "0 20px",
            }}
          >
            Turn Your Memories Into Cinematic Songs &amp; Films
          </motion.p>

          {/* ── Choice prompt ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.3 }}
            style={{
              fontSize: "clamp(11px,1.1vw,13px)",
              color: "rgba(255,255,255,0.38)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: "clamp(20px,3vw,32px)",
              position: "relative", zIndex: 5,
            }}
          >
            How would you like to begin?
          </motion.p>

          {/* ── Two buttons ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 1.5 }}
            style={{
              display: "flex",
              flexDirection: "column" as const,
              gap: "clamp(12px,1.8vw,18px)",
              alignItems: "center",
              position: "relative", zIndex: 6,
              width: "100%",
              maxWidth: 480,
              padding: "0 clamp(20px,5vw,40px)",
            }}
          >
            {/* PRIMARY — Watch the Story */}
            <WatchBtn onClick={() => pick("story")} />

            {/* SECONDARY — Go straight to homepage */}
            <SkipBtn onClick={() => pick("home")} />
          </motion.div>

          {/* ── Bottom brand line ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.0 }}
            style={{
              position: "absolute", bottom: "clamp(20px,3vw,32px)",
              left: 0, right: 0, zIndex: 5,
              display: "flex", justifyContent: "center", alignItems: "center",
              gap: 12,
            }}
          >
            {["Luxury AI Production", "·", "Emotional Storytelling", "·", "Cinematic Quality"].map((t, i) => (
              <span key={i} style={{
                fontSize: "clamp(9px,0.8vw,11px)",
                color: "rgba(255,255,255,0.22)",
                letterSpacing: "0.10em",
                fontFamily: "Inter, sans-serif",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Primary CTA button ───────────────────────────────────────────────────────
function WatchBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        padding: "clamp(16px,2.2vw,22px) clamp(28px,4vw,44px)",
        background: hov
          ? `linear-gradient(135deg, #E8C84A 0%, #D4AF37 40%, #B8950A 100%)`
          : `linear-gradient(135deg, #D4AF37 0%, #B8950A 50%, #96760A 100%)`,
        border: "none",
        borderRadius: 14,
        cursor: "pointer",
        animation: "eg-btn-glow 3s ease-in-out infinite",
        transition: "background 200ms ease, transform 150ms ease",
        transform: hov ? "translateY(-2px) scale(1.015)" : "translateY(0) scale(1)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      }}
    >
      {/* film icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="#050B1A" strokeWidth="1.8"/>
        <rect x="2" y="8" width="20" height="0" stroke="#050B1A" strokeWidth="1.5"/>
        <line x1="6"  y1="4" x2="6"  y2="8"  stroke="#050B1A" strokeWidth="1.5"/>
        <line x1="10" y1="4" x2="10" y2="8"  stroke="#050B1A" strokeWidth="1.5"/>
        <line x1="14" y1="4" x2="14" y2="8"  stroke="#050B1A" strokeWidth="1.5"/>
        <line x1="18" y1="4" x2="18" y2="8"  stroke="#050B1A" strokeWidth="1.5"/>
        <line x1="6"  y1="16" x2="6"  y2="20" stroke="#050B1A" strokeWidth="1.5"/>
        <line x1="10" y1="16" x2="10" y2="20" stroke="#050B1A" strokeWidth="1.5"/>
        <line x1="14" y1="16" x2="14" y2="20" stroke="#050B1A" strokeWidth="1.5"/>
        <line x1="18" y1="16" x2="18" y2="20" stroke="#050B1A" strokeWidth="1.5"/>
        <polygon points="10,9.5 10,14.5 15,12" fill="#050B1A"/>
      </svg>
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(15px,1.8vw,19px)",
        fontWeight: 700,
        color: "#050B1A",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}>
        Watch Our Story First
      </span>
    </button>
  );
}

// ─── Secondary skip button ────────────────────────────────────────────────────
function SkipBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        padding: "clamp(14px,1.9vw,19px) clamp(28px,4vw,44px)",
        background: hov ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${hov ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.16)"}`,
        borderRadius: 14,
        cursor: "pointer",
        transition: "all 200ms ease",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        animation: "eg-pulse-border 4s ease-in-out 2.5s infinite",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      }}
    >
      {/* arrow icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21M15 6L21 12L15 18" stroke={hov ? GOLD2 : "rgba(255,255,255,0.55)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{
        fontFamily: "Inter, sans-serif",
        fontSize: "clamp(13px,1.5vw,16px)",
        fontWeight: 500,
        color: hov ? GOLD2 : "rgba(255,255,255,0.60)",
        letterSpacing: "0.03em",
        transition: "color 200ms",
        whiteSpace: "nowrap",
      }}>
        Go Straight to Homepage
      </span>
    </button>
  );
}
