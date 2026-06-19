import { useEffect, useState } from "react";
import { LivingLogoBackground } from "./LivingLogoBackground";
import { motion } from "framer-motion";

const TRUST_ITEMS = [
  { icon: "🔒", label: "Secure Payments" },
  { icon: "🛡️", label: "Private & Encrypted" },
  { icon: "✦",  label: "AI-Powered Creation" },
  { icon: "💬", label: "24/7 AI Concierge" },
];

// Urgency data — rotates every 8s
const URGENCY_MSGS = [
  { icon: "⚡", text: "47 stories created today", accent: "3 spots left this week" },
  { icon: "🔥", text: "12 orders in the last hour", accent: "High demand right now" },
  { icon: "✦",  text: "Songs from $19 · Films from $79", accent: "Start for free today" },
];

export function HeroSection() {
  const [urgencyIdx, setUrgencyIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setUrgencyIdx(i => (i + 1) % URGENCY_MSGS.length), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="hero-section"
      style={{
        position:       "relative",
        minHeight:      "100vh",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        overflow:       "hidden",
        paddingTop:     "clamp(64px, 10vw, 84px)",
        background:     "#01040B",
      }}
    >
      {/* ── z:0  Void base ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "#01040B",
      }} />

      {/* ── z:0  Cinematic static BG — zero loading cost ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse 120% 80% at 50% 30%, rgba(11,23,54,0.6) 0%, #01040B 70%)",
        opacity: 0.8,
      }} />

      {/* ══════════════════════════════════════════════
          LIVING LOGO MONUMENT v9 — CINEMATIC MONUMENT
          Full-color. Full motion. Film strips animate.
          Corona blooms. Lens flare sweeps. Stars twinkle.
      ══════════════════════════════════════════════ */}
      <LivingLogoBackground />

      {/* ── z:2  Edge vignette ONLY — center is clear so logo blazes through ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "radial-gradient(ellipse 85% 80% at 50% 45%, transparent 0%, transparent 45%, rgba(1,4,11,0.45) 100%)",
      }} />

      {/* ── z:3  Left text scrim — desktop/tablet: left-side darkening. mobile: full center overlay (lighter) ── */}
      <div className="hero-scrim" style={{
        position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
        background: "linear-gradient(to right, rgba(1,4,11,0.88) 0%, rgba(1,4,11,0.72) 20%, rgba(1,4,11,0.40) 38%, rgba(1,4,11,0.10) 52%, transparent 100%)",
      }} />

      {/* ── z:3  Top navbar fade ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 120,
        zIndex: 3, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(1,4,11,0.82) 0%, transparent 100%)",
      }} />

      {/* ── z:3  Bottom fade to next section ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 180,
        zIndex: 3, pointerEvents: "none",
        background: "linear-gradient(to top, #01040B 0%, transparent 100%)",
      }} />

      {/* ══════════════════════════════════════════════
          HERO TEXT — z:6
          Left-aligned, emerges from the logo monument
      ══════════════════════════════════════════════ */}
      <div
        style={{
          position:    "relative",
          zIndex:      6,
          width:       "100%",
          maxWidth:    1440,
          padding:     "0 clamp(22px,4vw,64px)",
        }}
        className="hero-content"
      >
        {/* ── BRAND EYEBROW ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
          style={{ marginBottom: 20 }}
        >
          <span style={{
            display:       "inline-block",
            fontFamily:    "'Playfair Display', serif",
            fontSize:      11,
            fontWeight:    600,
            color:         "#D4AF37",
            letterSpacing: "9px",
            textTransform: "uppercase",
            opacity:       0.85,
            textShadow:    "0 0 18px rgba(212,175,55,0.55), 0 0 40px rgba(212,175,55,0.22)",
          }}>
            GHAAFEEDI MUSIC
          </span>
        </motion.div>

        {/* ── AI pill badge ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background:   "rgba(212,175,55,0.08)",
            border:       "1px solid rgba(212,175,55,0.25)",
            borderRadius: 999, padding: "5px 14px", marginBottom: 26,
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#D4AF37", flexShrink: 0,
            boxShadow: "0 0 8px rgba(212,175,55,0.8)",
          }} />
          <span style={{
            fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600,
            color: "#D4AF37", letterSpacing: "0.18em", textTransform: "uppercase",
          }}>
            AI-Powered Emotional Storytelling
          </span>
        </motion.div>

        {/* ── Urgency badge ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.26 }}
          style={{ marginBottom: 22 }}
          key={urgencyIdx}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(212,175,55,0.10)",
            border: "1px solid rgba(212,175,55,0.32)",
            borderRadius: 999, padding: "6px 14px 6px 10px",
          }}>
            {/* Live pulse */}
            <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "#22C55E",
                animation: "urgencyRing 1.6s ease-out infinite",
              }} />
              <div style={{ position: "absolute", inset: "1.5px", borderRadius: "50%", background: "#22C55E" }} />
            </div>
            <span style={{ fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#D4AF37" }}>
              {URGENCY_MSGS[urgencyIdx].icon} {URGENCY_MSGS[urgencyIdx].text}
            </span>
            <span style={{
              fontSize: 11.5, fontFamily: "Inter, sans-serif", fontWeight: 500,
              color: "rgba(255,255,255,0.44)",
              borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: 10,
            }}>
              {URGENCY_MSGS[urgencyIdx].accent}
            </span>
          </div>
        </motion.div>

        {/* ── Headline ── */}
        <motion.h1
          initial={{ opacity: 0, y: 44 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.28 }}
          style={{
            fontFamily:    "'Playfair Display', serif",
            fontSize:      "clamp(40px, 5.6vw, 72px)",
            fontWeight:    900,
            lineHeight:    1.04,
            marginBottom:  24,
            letterSpacing: "-0.01em",
            maxWidth:      640,
            filter:        "drop-shadow(0 2px 20px rgba(1,4,11,0.98)) drop-shadow(0 0 40px rgba(1,4,11,0.85))",
          }}
        >
          <span style={{
            background:           "linear-gradient(135deg, #FFF9E6 0%, #FBE8A6 25%, #E0B84F 55%, #C9962E 80%, #FFF9E6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
            backgroundClip:       "text",
            display:              "block",
          }}>
            Turn Your Memories Into
          </span>
          <span style={{
            background:           "linear-gradient(135deg, #FFF9E6 0%, #FBE8A6 25%, #E0B84F 55%, #C9962E 80%, #FFF9E6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
            backgroundClip:       "text",
            display:              "block",
          }}>
            Cinematic Songs &amp; Films.
          </span>
          <span style={{
            color:      "#FFFFFF",
            display:    "block",
            fontSize:   "clamp(22px, 3.0vw, 44px)",
            marginTop:  10, fontWeight: 700,
            textShadow: "0 2px 20px rgba(1,4,11,0.98), 0 0 44px rgba(1,4,11,0.85)",
          }}>
            Your Story. Your Soundtrack. Your Legacy.
          </span>
        </motion.h1>

        {/* ── Subtitle ── */}
        <motion.p
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.42 }}
          style={{
            fontFamily:   "Inter, sans-serif", fontSize: 15.5,
            color:        "rgba(255,255,255,0.74)", lineHeight: 1.84,
            marginBottom: 42, maxWidth: 510, letterSpacing: "0.005em",
            textShadow:   "0 1px 14px rgba(1,4,11,0.95), 0 0 32px rgba(1,4,11,0.78)",
          }}
        >
          Upload your memories, experiences, photos, and emotions. Ghaafeedi Music transforms them into original songs, cinematic films, documentaries, and legacy experiences powered by advanced AI orchestration.
        </motion.p>

        {/* ── CTAs ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.58 }}
          className="hero-ctas"
          style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 52, flexWrap: "wrap" }}
        >
          <a
            href="/products"
            style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              background:    "linear-gradient(135deg, #FFF9E6 0%, #F1D37A 30%, #C9962E 70%, #8A6118 100%)",
              color:         "#01040B",
              fontFamily:    "Inter, sans-serif", fontWeight: 700, fontSize: 14.5,
              borderRadius:  999, padding: "14px 30px",
              textDecoration: "none",
              boxShadow:     "0 6px 32px rgba(212,175,55,0.48), 0 2px 8px rgba(212,175,55,0.20)",
              letterSpacing: "0.02em", transition: "all 0.25s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 52px rgba(212,175,55,0.75), 0 0 0 2px rgba(251,232,166,0.35)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.02)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 32px rgba(212,175,55,0.48), 0 2px 8px rgba(212,175,55,0.20)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0) scale(1)";
            }}
          >
            <span style={{ fontSize: 15 }}>⬡</span>
            Explore Products
          </a>

          <a
            href="/onboarding"
            style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              background:     "rgba(139,92,246,0.12)",
              backdropFilter: "blur(10px)",
              color:          "#fff",
              fontFamily:     "Inter, sans-serif", fontWeight: 600, fontSize: 14.5,
              borderRadius:   999, padding: "13px 30px",
              border:         "1.5px solid rgba(139,92,246,0.42)",
              textDecoration: "none", letterSpacing: "0.02em", transition: "all 0.25s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.80)";
              (e.currentTarget as HTMLElement).style.background  = "rgba(139,92,246,0.24)";
              (e.currentTarget as HTMLElement).style.transform   = "translateY(-2px) scale(1.02)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.42)";
              (e.currentTarget as HTMLElement).style.background  = "rgba(139,92,246,0.12)";
              (e.currentTarget as HTMLElement).style.transform   = "translateY(0) scale(1)";
            }}
          >
            <span style={{ fontSize: 15 }}>✦</span>
            Start Your Story
          </a>

          <a
            href="/demo"
            style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              background:     "transparent",
              backdropFilter: "blur(10px)",
              color:          "#D4AF37",
              fontFamily:     "Inter, sans-serif", fontWeight: 600, fontSize: 14.5,
              borderRadius:   999, padding: "13px 28px",
              border:         "1.5px solid rgba(212,175,55,0.38)",
              textDecoration: "none", letterSpacing: "0.02em", transition: "all 0.25s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.75)";
              (e.currentTarget as HTMLElement).style.background  = "rgba(212,175,55,0.09)";
              (e.currentTarget as HTMLElement).style.transform   = "translateY(-2px) scale(1.02)";
              (e.currentTarget as HTMLElement).style.boxShadow  = "0 0 18px rgba(212,175,55,0.18)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.38)";
              (e.currentTarget as HTMLElement).style.background  = "transparent";
              (e.currentTarget as HTMLElement).style.transform   = "translateY(0) scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow  = "none";
            }}
          >
            <span style={{ fontSize: 14, paddingLeft: 1 }}>▶</span>
            Watch Demo
          </a>
        </motion.div>

        {/* ── Trust bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.78 }}
          className="hero-trust"
          style={{ display: "flex", flexWrap: "wrap", gap: "10px 0" }}
        >
          {TRUST_ITEMS.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 7,
              paddingRight: 20,
              borderRight:  i < TRUST_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.10)" : "none",
              marginRight:  i < TRUST_ITEMS.length - 1 ? 20 : 0,
            }}>
              <span style={{ fontSize: 12 }}>{item.icon}</span>
              <span style={{
                fontFamily: "Inter, sans-serif", fontSize: 11.5,
                color: "rgba(255,255,255,0.54)", fontWeight: 500, letterSpacing: "0.02em",
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Scroll cue ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { delay: 2.2 },
          y: { repeat: Infinity, duration: 2.4, ease: "easeInOut", delay: 2.2 },
        }}
        className="hero-scroll-cue"
        style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 7, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        }}
      >
        <span style={{
          fontSize: 10, color: "rgba(255,255,255,0.24)", fontFamily: "Inter, sans-serif",
          letterSpacing: "0.18em", textTransform: "uppercase",
        }}>
          Scroll
        </span>
        <div style={{
          width: 1, height: 32,
          background: "linear-gradient(to bottom, rgba(212,175,55,0.42), transparent)",
        }} />
      </motion.div>

      <style>{`
        @keyframes urgencyRing {
          0%   { transform: scale(1); opacity: 0.85; }
          70%  { transform: scale(2.8); opacity: 0; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @media (max-width: 480px) {
          .hero-content {
            padding: 0 20px !important;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .hero-content h1 {
            text-align: center;
          }
          .hero-content p {
            text-align: center;
            max-width: 100% !important;
          }
          .hero-ctas {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100%;
            gap: 10px !important;
          }
          .hero-ctas a {
            justify-content: center !important;
            width: 100% !important;
          }
          .hero-trust {
            justify-content: center;
            gap: 8px 0 !important;
          }
          .hero-trust > div {
            padding-right: 12px !important;
            margin-right: 12px !important;
          }
          .hero-scrim {
            background: radial-gradient(ellipse 110% 90% at 50% 50%, transparent 0%, transparent 30%, rgba(1,4,11,0.72) 100%) !important;
          }
        }
        @media (min-width: 481px) and (max-width: 768px) {
          .hero-content { padding: 0 28px !important; }
          .hero-ctas a {
            flex: 1 1 auto;
            justify-content: center;
          }
        }
        /* ── Push hero text below logo on tablet/mobile ── */
        @media (max-width: 767px) {
          .hero-section { justify-content: flex-start !important; padding-bottom: 60px; min-height: auto !important; }
          .hero-content { margin-top: 310px !important; }
        }
        @media (min-width: 768px) and (max-width: 1199px) {
          .hero-section { justify-content: flex-start !important; padding-bottom: 80px; min-height: auto !important; }
          .hero-content { margin-top: 540px !important; }
        }

        /* Hide scroll cue on short mobile viewports */
        @media (max-height: 700px) {
          .hero-scroll-cue { display: none !important; }
        }
        /* Trust bar full-width row on mobile */
        @media (max-width: 480px) {
          .hero-trust {
            gap: 4px 0 !important;
            row-gap: 4px;
          }
          .hero-trust > div {
            flex: 0 0 50% !important;
            border-right: none !important;
            margin-right: 0 !important;
            padding-right: 0 !important;
          }
        }
      `}</style>
    </section>
  );
}
