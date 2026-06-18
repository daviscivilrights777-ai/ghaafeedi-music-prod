import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD   = "#D4AF37";
const GOLD2  = "#F4D06F";
const BG     = "#050B1A";

// ─── Particle data (static so no re-computation on re-render) ─────────────────
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: (Math.sin(i * 7.391) * 0.5 + 0.5) * 100,
  y: (Math.cos(i * 4.237) * 0.5 + 0.5) * 100,
  size: i % 5 === 0 ? 2.8 : i % 3 === 0 ? 1.8 : i % 2 === 0 ? 1.2 : 0.7,
  opacity: 0.08 + (i % 7) * 0.07,
  dur: 3 + (i % 5) * 1.2,
  delay: (i * 0.19) % 5,
  driftX: ((i % 9) - 4) * 0.4,
  driftY: ((i % 7) - 3) * 0.3,
}));

interface SplashGateProps {
  onComplete: () => void;
}

export function SplashGate({ onComplete }: SplashGateProps) {
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [enterHover, setEnterHover] = useState(false);
  const [skipHover, setSkipHover]   = useState(false);
  const hasActed = useRef(false);

  // ESC key → skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line

  const handleExit = () => {
    if (hasActed.current) return;
    hasActed.current = true;
    setPhase("out");
    setTimeout(onComplete, 600);
  };

  return (
    <AnimatePresence>
      {phase === "in" && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: BG,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* ── Particle field ── */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
            {PARTICLES.map(p => (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  left: `${p.x}%`, top: `${p.y}%`,
                  width: p.size, height: p.size,
                  borderRadius: "50%",
                  background: GOLD,
                  opacity: p.opacity,
                  animation: `splashDrift ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
                }}
              />
            ))}
          </div>

          {/* ── Radial bloom behind logo ── */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -58%)",
            width: "min(700px, 90vw)", height: "min(600px, 80vw)",
            background: `
              radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,175,55,0.13) 0%, transparent 65%),
              radial-gradient(ellipse 40% 40% at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 55%)
            `,
            pointerEvents: "none", zIndex: 2,
          }} />

          {/* ── Nebula layers ── */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
            background: `
              radial-gradient(ellipse 80% 60% at 30% 20%, rgba(11,23,54,0.55) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 75% 80%, rgba(20,10,50,0.40) 0%, transparent 55%)
            `,
          }} />

          {/* ── Main content ── */}
          <div style={{
            position: "relative", zIndex: 10,
            display: "flex", flexDirection: "column",
            alignItems: "center", textAlign: "center",
            padding: "0 clamp(24px, 5vw, 80px)",
            maxWidth: 680,
            width: "100%",
          }}>

            {/* Logo — cinematic reveal */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginBottom: "clamp(20px, 3vw, 32px)" }}
            >
              <img
                src="/assets/ghaafeedi-logo-dark.png"
                alt="Ghaafeedi Music"
                style={{
                  width: "clamp(200px, 38vw, 460px)",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  filter: `
                    drop-shadow(0 0 40px rgba(212,175,55,0.55))
                    drop-shadow(0 0 80px rgba(212,175,55,0.22))
                    drop-shadow(0 0 120px rgba(212,175,55,0.10))
                  `,
                }}
              />
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.4, ease: "easeOut" }}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(15px, 2.2vw, 22px)",
                fontWeight: 400,
                fontStyle: "italic",
                color: `rgba(212,175,55,0.82)`,
                letterSpacing: "0.04em",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Turn Your Memories Into Cinematic Songs &amp; Films
            </motion.p>

            {/* Gold divider */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 1.85, ease: "easeOut" }}
              style={{
                height: 1,
                width: "clamp(160px, 28vw, 280px)",
                background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD2} 50%, ${GOLD} 70%, transparent 100%)`,
                margin: "clamp(20px, 2.5vw, 28px) auto",
                transformOrigin: "center",
                opacity: 0.7,
              }}
            />

            {/* Supporting copy */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 2.1, ease: "easeOut" }}
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(13px, 1.5vw, 16px)",
                color: "rgba(255,255,255,0.52)",
                lineHeight: 1.75,
                margin: 0,
                maxWidth: 520,
              }}
            >
              A new kind of creation studio. Your memories, your emotions,
              your story — transformed into cinematic songs and films
              that last a lifetime.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 2.65, ease: "easeOut" }}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 14,
                marginTop: "clamp(28px, 3.5vw, 40px)",
              }}
            >
              {/* Primary CTA */}
              <button
                onClick={handleExit}
                onMouseEnter={() => setEnterHover(true)}
                onMouseLeave={() => setEnterHover(false)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "0 clamp(28px, 4vw, 44px)", height: 52,
                  borderRadius: 999,
                  border: "none",
                  background: enterHover
                    ? `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 100%)`
                    : `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
                  color: "#05080F",
                  fontSize: "clamp(13px, 1.2vw, 15px)",
                  fontWeight: 700,
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  transition: "all 220ms ease",
                  boxShadow: enterHover
                    ? `0 0 40px rgba(212,175,55,0.65), 0 8px 32px rgba(212,175,55,0.35)`
                    : `0 0 24px rgba(212,175,55,0.40), 0 4px 20px rgba(212,175,55,0.20)`,
                  transform: enterHover ? "scale(1.03)" : "scale(1)",
                }}
              >
                Enter Ghaafeedi Music
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#05080F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Skip */}
              <button
                onClick={handleExit}
                onMouseEnter={() => setSkipHover(true)}
                onMouseLeave={() => setSkipHover(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: skipHover ? "rgba(255,255,255,0.60)" : "rgba(255,255,255,0.30)",
                  fontSize: "clamp(11px, 1vw, 13px)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 400,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  transition: "color 200ms ease",
                  padding: "4px 0",
                  textDecoration: "none",
                }}
              >
                Skip Introduction
              </button>
            </motion.div>

            {/* Bottom trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 3.05, ease: "easeOut" }}
              style={{
                marginTop: "clamp(28px, 3vw, 40px)",
                display: "flex", alignItems: "center", gap: "clamp(8px, 1.5vw, 16px)",
                flexWrap: "wrap", justifyContent: "center",
              }}
            >
              {[
                "50,000+ stories created",
                "Delivered in 72 hours",
                "Satisfaction guaranteed",
              ].map((item, i) => (
                <React.Fragment key={item}>
                  {i > 0 && (
                    <div style={{ width: 3, height: 3, borderRadius: "50%", background: `rgba(212,175,55,0.40)` }} />
                  )}
                  <span style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "clamp(10px, 0.9vw, 12px)",
                    color: "rgba(255,255,255,0.30)",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}>{item}</span>
                </React.Fragment>
              ))}
            </motion.div>
          </div>

          {/* Keyframes */}
          <style>{`
            @keyframes splashDrift {
              0%   { transform: translate(0, 0) scale(1); }
              100% { transform: translate(var(--dx, 4px), var(--dy, -6px)) scale(1.3); opacity: 0.04; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
