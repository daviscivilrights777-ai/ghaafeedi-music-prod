/**
 * GHAAFEEDI MUSIC — CINEMATIC LANDING GATE
 * ══════════════════════════════════════════════════════════════════
 * Full-scroll standalone page shown before the homepage on first visit.
 * Homepage does NOT render underneath — this is the only thing on screen.
 *
 * Sections:
 *  0  — Living Logo Hero (interactive, animated)
 *  1  — What Is Ghaafeedi Music?
 *  2  — What Is AI-Generated? (2-col: What It Is / What It Is Not)
 *  3  — Revisions Per Product (table + principles)
 *  4  — Refund Policy Framework (3 tiers)
 *  5  — Why Ghaafeedi Music (vs competitors)
 *  6  — CTA → Enter Homepage
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD   = "#D4AF37";
const GOLD2  = "#F4D06F";
const GOLD3  = "#FBE8A6";
const BG     = "#050B1A";
const BG2    = "#07101F";
const BG3    = "#0B1736";
const TEXT   = "#FFFFFF";
const MUTED  = "rgba(255,255,255,0.52)";
const BORDER = "rgba(212,175,55,0.18)";

// ─── Logo aspect from actual image 1920×1088 ──────────────────────────────────
const LOGO_ASPECT = 1920 / 1088;

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as any } },
};
const stagger = { visible: { transition: { staggerChildren: 0.09 } } };

// ─── CSS injected once for canvas animations ──────────────────────────────────
const LOGO_CSS = `
@keyframes gm-sp-film-left  { 0%,100%{transform:translate(0,0)rotate(-2deg)} 50%{transform:translate(-20px,-14px)rotate(-2.6deg)} }
@keyframes gm-sp-film-right { 0%,100%{transform:translate(0,0)rotate(2deg)}  50%{transform:translate(16px,12px)rotate(2.4deg)} }
@keyframes gm-sp-corona     { 0%,100%{transform:translate(-50%,-50%)scale(1.00);opacity:.55} 45%{transform:translate(-50%,-50%)scale(1.20);opacity:.82} }
@keyframes gm-sp-ring       { 0%,100%{transform:translate(-50%,-50%)scale(0.88);opacity:.38} 50%{transform:translate(-50%,-50%)scale(1.32);opacity:.08} }
@keyframes gm-sp-breathe    { 0%,100%{filter:brightness(1.00)saturate(1.00) drop-shadow(0 0 60px rgba(212,175,55,.35)) drop-shadow(0 0 120px rgba(180,120,20,.18))} 50%{filter:brightness(1.10)saturate(1.12) drop-shadow(0 0 80px rgba(212,175,55,.55)) drop-shadow(0 0 160px rgba(180,120,20,.28))} }
@keyframes gm-sp-star       { 0%,100%{opacity:.12;transform:scale(1)} 50%{opacity:.58;transform:scale(1.6)} }
@keyframes gm-sp-pfloat     { 0%,100%{transform:translateY(0)translateX(0)} 33%{transform:translateY(-16px)translateX(5px)} 66%{transform:translateY(-6px)translateX(-7px)} }
@keyframes gm-sp-swirl      { 0%{transform:rotate(0deg)scale(1.0);opacity:.18} 50%{transform:rotate(180deg)scale(1.15);opacity:.30} 100%{transform:rotate(360deg)scale(1.0);opacity:.18} }
@keyframes gm-sp-lens       { 0%{left:-20%;opacity:0} 8%{opacity:.88} 55%{opacity:.72} 80%{opacity:0} 100%{left:120%;opacity:0} }
@keyframes gm-sp-shimmer    { 0%{transform:translate(-50%,-50%)scale(.1);opacity:1} 60%{opacity:.7} 100%{transform:translate(-50%,-50%)scale(3.5);opacity:0} }
@keyframes gm-sp-scroll-hint { 0%,100%{opacity:.30;transform:translateY(0)} 50%{opacity:.72;transform:translateY(8px)} }
@keyframes gm-sp-divider    { from{transform:scaleX(0)} to{transform:scaleX(1)} }
`;

// ─── Stars & Particles (pre-seeded, stable) ───────────────────────────────────
const STARS = Array.from({ length: 72 }, (_, i) => ({
  x: ((i * 137.508 + 31) % 100),
  y: ((i * 73.211  + 17) % 100),
  r: 0.8 + ((i * 11.3) % 1.6),
  delay: ((i * 0.31) % 4.5).toFixed(2),
  dur:   (2.2 + ((i * 0.17) % 2.8)).toFixed(2),
  gold: i % 5 === 0,
}));
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  x: 10 + ((i * 83.7 + 11) % 80),
  y: 5  + ((i * 61.3 + 29) % 90),
  r: 1.2 + ((i * 7.3) % 2.4),
  delay: ((i * 0.43) % 7).toFixed(2),
  dur:   (5 + ((i * 0.29) % 6)).toFixed(2),
  op: (0.08 + ((i * 0.03) % 0.22)).toFixed(3),
  gold: i % 3 === 0,
}));

// ─── Reusable scroll-reveal section wrapper ───────────────────────────────────
// IMPORTANT: The outer container is position:fixed with overflow-y:auto.
// Intersection Observer (used by useInView + whileInView) measures against
// the viewport by default — it NEVER fires inside a fixed scroll container.
// Solution: always render sections as visible. No scroll-triggered hiding.
function Section({
  children, id, accent = false, style,
}: {
  children: React.ReactNode;
  id?: string;
  accent?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <section
      id={id}
      style={{
        width: "100%",
        background: accent ? BG2 : "transparent",
        borderTop: accent ? `1px solid ${BORDER}` : undefined,
        borderBottom: accent ? `1px solid ${BORDER}` : undefined,
        ...style,
      }}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(64px,9vw,100px) clamp(20px,5vw,52px)",
        }}
      >
        {children}
      </motion.div>
    </section>
  );
}

// ─── Gold pill label ──────────────────────────────────────────────────────────
function Pill({ label }: { label: string }) {
  return (
    <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
      <span style={{
        display: "inline-block",
        padding: "5px 18px",
        borderRadius: 999,
        border: `1px solid rgba(212,175,55,0.35)`,
        background: "rgba(212,175,55,0.08)",
        color: GOLD2,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.14em",
        fontFamily: "Inter, sans-serif",
        textTransform: "uppercase" as const,
      }}>{label}</span>
    </motion.div>
  );
}

// ─── Section headline ─────────────────────────────────────────────────────────
function Headline({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <motion.h2 variants={fadeUp} style={{
      fontFamily: "'Playfair Display', serif",
      fontSize: "clamp(28px,4vw,46px)",
      fontWeight: 700,
      color: TEXT,
      lineHeight: 1.22,
      margin: "0 0 clamp(16px,2vw,22px)",
      textAlign: center ? "center" : "left",
    }}>{children}</motion.h2>
  );
}

// ─── Body text ────────────────────────────────────────────────────────────────
function Body({ children, center = false, muted = false, style }: {
  children: React.ReactNode; center?: boolean; muted?: boolean; style?: React.CSSProperties;
}) {
  return (
    <motion.p variants={fadeUp} style={{
      fontFamily: "Inter, sans-serif",
      fontSize: "clamp(14px,1.5vw,17px)",
      color: muted ? MUTED : "rgba(255,255,255,0.82)",
      lineHeight: 1.8,
      margin: 0,
      textAlign: center ? "center" : "left",
      ...style,
    }}>{children}</motion.p>
  );
}

// ─── Gold quote block ─────────────────────────────────────────────────────────
function Quote({ children }: { children: React.ReactNode }) {
  return (
    <motion.blockquote variants={fadeUp} style={{
      borderLeft: `3px solid ${GOLD}`,
      paddingLeft: "clamp(16px,2vw,24px)",
      margin: "clamp(24px,3vw,36px) 0",
      fontFamily: "'Playfair Display', serif",
      fontSize: "clamp(15px,1.6vw,19px)",
      fontStyle: "italic",
      color: GOLD2,
      lineHeight: 1.65,
    }}>{children}</motion.blockquote>
  );
}

// ─── Gold divider ─────────────────────────────────────────────────────────────
function Divider({ center = false }: { center?: boolean }) {
  return (
    <motion.div variants={fadeUp} style={{
      height: 1,
      width: "clamp(100px,18vw,180px)",
      background: `linear-gradient(90deg,transparent,${GOLD},${GOLD2},${GOLD},transparent)`,
      margin: center ? "clamp(20px,2.5vw,28px) auto" : "clamp(20px,2.5vw,28px) 0",
      opacity: 0.7,
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVING LOGO HERO — interactive, animated, cinematic
// ═══════════════════════════════════════════════════════════════════════════════
function LivingLogoHero({ onEnter }: { onEnter: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  const lensTimerRef = useRef<number>(0);
  const stateRef     = useRef({
    W: 0, H: 0,
    logoW: 0, logoH: 0, logoX: 0, logoY: 0,
    lensActive: false, lensT: 0,
    shimmer: { x: 0.5, y: 0.4, active: false, t: 0 },
    dpr: 1,
  });

  // inject CSS once
  useEffect(() => {
    if (document.getElementById("gm-sp-css")) return;
    const s = document.createElement("style");
    s.id = "gm-sp-css";
    s.textContent = LOGO_CSS;
    document.head.appendChild(s);
  }, []);

  // compute logo layout — centered in hero, NOT full-viewport-covering
  const computeLayout = useCallback((W: number, H: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Logo fills 80% of hero width on desktop, 90% tablet, 95% mobile
    let logoW: number;
    if (W >= 1200)     logoW = W * 0.72;
    else if (W >= 768) logoW = W * 0.86;
    else               logoW = W * 0.92;
    const logoH = logoW / LOGO_ASPECT;
    const logoX = (W - logoW) / 2;
    const logoY = (H - logoH) / 2;   // vertically centered in hero
    return { logoW, logoH, logoX, logoY, dpr };
  }, []);

  // canvas draw loop — lens flare + shimmer burst
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s   = stateRef.current;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, s.W * s.dpr, s.H * s.dpr);
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    const { W, logoW, logoH, logoX, logoY } = s;
    const crestCX = logoX + logoW * 0.500;
    const crestCY = logoY + logoH * 0.285;

    // lens flare sweep
    if (s.lensActive) {
      s.lensT = Math.min(s.lensT + 0.007, 1);
      const lx = logoX + logoW * (s.lensT * 1.4 - 0.15);
      const fadeIn  = Math.min(s.lensT * 10, 1);
      const fadeOut = 1 - Math.max(0, (s.lensT - 0.70) / 0.30);
      const alpha   = fadeIn * fadeOut * 0.85;
      if (alpha > 0) {
        const streak = ctx.createLinearGradient(lx - logoW * 0.15, crestCY, lx + logoW * 0.15, crestCY);
        streak.addColorStop(0,    "rgba(255,249,230,0)");
        streak.addColorStop(0.35, `rgba(255,249,230,${alpha * 0.55})`);
        streak.addColorStop(0.5,  `rgba(255,255,255,${alpha})`);
        streak.addColorStop(0.65, `rgba(255,249,230,${alpha * 0.55})`);
        streak.addColorStop(1,    "rgba(255,249,230,0)");
        ctx.fillStyle = streak;
        ctx.fillRect(lx - logoW * 0.15, crestCY - 3, logoW * 0.30, 6);
        const anam = ctx.createLinearGradient(lx - logoW * 0.55, crestCY, lx + logoW * 0.55, crestCY);
        anam.addColorStop(0,    "rgba(212,175,55,0)");
        anam.addColorStop(0.45, `rgba(212,175,55,${alpha * 0.22})`);
        anam.addColorStop(0.5,  `rgba(255,249,230,${alpha * 0.40})`);
        anam.addColorStop(0.55, `rgba(212,175,55,${alpha * 0.22})`);
        anam.addColorStop(1,    "rgba(212,175,55,0)");
        ctx.fillStyle = anam;
        ctx.fillRect(lx - logoW * 0.55, crestCY - 1, logoW * 1.10, 2);
        const sparkR = logoW * 0.028;
        const spark = ctx.createRadialGradient(lx, crestCY, 0, lx, crestCY, sparkR);
        spark.addColorStop(0,    `rgba(255,255,255,${alpha * 0.95})`);
        spark.addColorStop(0.30, `rgba(255,249,230,${alpha * 0.55})`);
        spark.addColorStop(0.65, `rgba(212,175,55,${alpha * 0.20})`);
        spark.addColorStop(1,    "rgba(212,175,55,0)");
        ctx.fillStyle = spark;
        ctx.beginPath(); ctx.arc(lx, crestCY, sparkR, 0, Math.PI * 2); ctx.fill();
      }
      if (s.lensT >= 1) { s.lensActive = false; s.lensT = 0; }
    }

    // shimmer burst on click/tap
    const sh = s.shimmer;
    if (sh.active) {
      sh.t = Math.min(sh.t + 0.032, 1);
      const bx = logoX + sh.x * logoW;
      const by = logoY + sh.y * logoH;
      const br = logoW * 0.13 * sh.t;
      const ba = (1 - sh.t) * 0.70;
      if (ba > 0) {
        const burst = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        burst.addColorStop(0,    `rgba(255,255,255,${ba})`);
        burst.addColorStop(0.20, `rgba(255,249,230,${ba * 0.65})`);
        burst.addColorStop(0.55, `rgba(212,175,55,${ba * 0.28})`);
        burst.addColorStop(1,    "rgba(212,175,55,0)");
        ctx.fillStyle = burst;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
      if (sh.t >= 1) { sh.active = false; sh.t = 0; }
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  const handleResize = useCallback(() => {
    const c = containerRef.current;
    const canvas = canvasRef.current;
    if (!c || !canvas) return;
    const W = c.offsetWidth;
    const H = c.offsetHeight;
    const { logoW, logoH, logoX, logoY, dpr } = computeLayout(W, H);
    const s = stateRef.current;
    Object.assign(s, { W, H, logoW, logoH, logoX, logoY, dpr });
    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
  }, [computeLayout]);

  const handleClick = useCallback((e: MouseEvent) => {
    const s = stateRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    s.shimmer = {
      x: (e.clientX - rect.left - s.logoX) / s.logoW,
      y: (e.clientY - rect.top  - s.logoY) / s.logoH,
      t: 0, active: true,
    };
  }, []);

  const scheduleLens = useCallback(() => {
    const fire = () => {
      stateRef.current.lensActive = true;
      stateRef.current.lensT = 0;
      lensTimerRef.current = window.setTimeout(fire, 7000 + Math.random() * 4000);
    };
    lensTimerRef.current = window.setTimeout(fire, 1800);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    const container = containerRef.current;
    container?.addEventListener("click", handleClick as EventListener);
    scheduleLens();
    animRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", handleResize);
      container?.removeEventListener("click", handleClick as EventListener);
      cancelAnimationFrame(animRef.current);
      clearTimeout(lensTimerRef.current);
    };
  }, [handleResize, handleClick, scheduleLens, draw]);

  // dims for CSS layout
  const [dims, setDims] = useState({ W: 0, H: 0 });
  useEffect(() => {
    const update = () => setDims({ W: window.innerWidth, H: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { W, H } = dims;
  const heroH = Math.max(520, Math.min(H * 0.88, 820));

  let logoW = 0, logoH = 0, logoX = 0, logoY = 0;
  if (W > 0) {
    if (W >= 1200)     logoW = W * 0.72;
    else if (W >= 768) logoW = W * 0.86;
    else               logoW = W * 0.92;
    logoH = logoW / LOGO_ASPECT;
    logoX = (W - logoW) / 2;
    logoY = (heroH - logoH) / 2;
  }

  const crestCX = logoX + logoW * 0.50;
  const crestCY = logoY + logoH * 0.285;
  const coronaR = logoH * 0.22;

  const [enterHov, setEnterHov] = useState(false);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: heroH,
        background: BG,
        overflow: "hidden",
        cursor: "crosshair",
      }}
    >
      {/* ── Star field ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {STARS.map((st, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${st.x}%`, top: `${st.y}%`,
            width: st.r * 2, height: st.r * 2,
            borderRadius: "50%",
            background: st.gold
              ? "radial-gradient(circle,#FBE8A6 0%,rgba(212,175,55,.4) 60%,transparent 100%)"
              : "radial-gradient(circle,#fff 0%,rgba(200,210,255,.5) 55%,transparent 100%)",
            animation: `gm-sp-star ${st.dur}s ease-in-out ${st.delay}s infinite`,
          }} />
        ))}
      </div>

      {/* ── Ambient particles ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {PARTICLES.map((p, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.r * 2, height: p.r * 2,
            borderRadius: "50%",
            background: p.gold
              ? `rgba(212,175,55,${p.op})`
              : `rgba(139,92,246,${p.op})`,
            animation: `gm-sp-pfloat ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }} />
        ))}
      </div>

      {/* ── Deep nebula ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse 70% 60% at 50% 38%,rgba(72,20,140,.20) 0%,rgba(50,10,100,.09) 50%,transparent 75%),
          radial-gradient(ellipse 45% 40% at 72% 62%,rgba(100,40,180,.11) 0%,transparent 65%),
          radial-gradient(ellipse 38% 32% at 28% 58%,rgba(60,15,110,.09) 0%,transparent 60%)
        `,
      }} />

      {W > 0 && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>

          {/* corona ring */}
          <div style={{
            position: "absolute",
            left: crestCX, top: crestCY,
            width: coronaR * 2, height: coronaR * 2,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(212,175,55,0) 40%,rgba(212,175,55,.22) 65%,rgba(212,175,55,0) 100%)",
            border: "1px solid rgba(212,175,55,.18)",
            animation: "gm-sp-ring 4.2s ease-in-out infinite",
          }} />
          {/* corona bloom */}
          <div style={{
            position: "absolute",
            left: crestCX, top: crestCY,
            width: coronaR * 1.4, height: coronaR * 1.4,
            borderRadius: "50%",
            background: `radial-gradient(circle,rgba(255,249,230,.28) 0%,rgba(251,232,166,.18) 30%,rgba(212,175,55,.10) 58%,transparent 78%)`,
            filter: "blur(18px)",
            animation: "gm-sp-corona 4.2s ease-in-out infinite",
          }} />
          {/* energy swirl */}
          <div style={{
            position: "absolute",
            left: crestCX, top: crestCY,
            width: coronaR * 3.0, height: coronaR * 3.0,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg,rgba(120,40,200,0) 0deg,rgba(120,40,200,.18) 60deg,rgba(80,20,160,.08) 120deg,rgba(180,80,255,.14) 180deg,rgba(100,30,180,.06) 240deg,rgba(140,60,220,.16) 300deg,rgba(120,40,200,0) 360deg)`,
            filter: "blur(30px)",
            animation: "gm-sp-swirl 12s linear infinite",
            opacity: 0.52,
          }} />

          {/* THE LOGO */}
          <motion.img
            src="/assets/ghaafeedi-logo-dark.webp"
            alt="Ghaafeedi Music"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] as any }}
            style={{
              position: "absolute",
              left: logoX, top: logoY,
              width: logoW, height: logoH,
              objectFit: "contain",
              objectPosition: "center center",
              zIndex: 4,
              animation: "gm-sp-breathe 6s ease-in-out 1.4s infinite",
              willChange: "filter",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />

          {/* film strip overlays */}
          <div style={{
            position: "absolute",
            left: logoX + logoW * 0.04, top: logoY + logoH * 0.52,
            width: logoW * 0.24, height: logoH * 0.26,
            zIndex: 5, animation: "gm-sp-film-left 13s ease-in-out infinite",
            transformOrigin: "center center",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(135deg,rgba(212,175,55,0) 0%,rgba(212,175,55,.12) 25%,rgba(255,249,230,.22) 50%,rgba(212,175,55,.10) 75%,rgba(212,175,55,0) 100%)`,
              mixBlendMode: "overlay" as const, borderRadius: 4,
            }} />
          </div>
          <div style={{
            position: "absolute",
            left: logoX + logoW * 0.72, top: logoY + logoH * 0.50,
            width: logoW * 0.24, height: logoH * 0.26,
            zIndex: 5, animation: "gm-sp-film-right 15s ease-in-out infinite",
            transformOrigin: "center center",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(-135deg,rgba(212,175,55,0) 0%,rgba(212,175,55,.10) 30%,rgba(255,249,230,.18) 50%,rgba(212,175,55,.08) 70%,rgba(212,175,55,0) 100%)`,
              mixBlendMode: "overlay" as const, borderRadius: 4,
            }} />
          </div>

          {/* wordmark glow */}
          <div style={{
            position: "absolute",
            left: logoX + logoW * 0.15, top: logoY + logoH * 0.68,
            width: logoW * 0.70, height: logoH * 0.22,
            zIndex: 3,
            background: `radial-gradient(ellipse 80% 60% at 50% 50%,rgba(212,175,55,.18) 0%,rgba(180,130,20,.08) 50%,transparent 80%)`,
            filter: "blur(22px)",
            animation: "gm-sp-corona 5s ease-in-out .5s infinite",
          }} />
        </div>
      )}

      {/* Canvas — lens flare + shimmer burst */}
      <canvas ref={canvasRef} style={{
        position: "absolute", inset: 0, zIndex: 8,
        pointerEvents: "none", display: "block",
      }} />

      {/* ── Bottom overlay: tagline + CTA + scroll hint ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        zIndex: 12,
        background: `linear-gradient(to top, rgba(5,11,26,0.96) 0%, rgba(5,11,26,0.78) 40%, transparent 100%)`,
        padding: "clamp(36px,5vw,56px) clamp(20px,5vw,52px) clamp(28px,4vw,44px)",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* tagline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.4 }}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(14px,2vw,20px)",
            fontStyle: "italic",
            color: `rgba(212,175,55,0.85)`,
            letterSpacing: "0.04em",
            margin: "0 0 clamp(20px,2.5vw,28px)",
            textAlign: "center",
          }}
        >
          Turn Your Memories Into Cinematic Songs &amp; Films
        </motion.p>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.85 }}
          onClick={onEnter}
          onMouseEnter={() => setEnterHov(true)}
          onMouseLeave={() => setEnterHov(false)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "0 clamp(28px,4vw,48px)", height: 52,
            borderRadius: 999, border: "none",
            background: enterHov
              ? `linear-gradient(135deg,${GOLD3} 0%,${GOLD} 100%)`
              : `linear-gradient(135deg,${GOLD} 0%,${GOLD2} 100%)`,
            color: "#05080F",
            fontSize: "clamp(13px,1.1vw,15px)",
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "all 220ms ease",
            boxShadow: enterHov
              ? `0 0 40px rgba(212,175,55,.65),0 8px 32px rgba(212,175,55,.35)`
              : `0 0 24px rgba(212,175,55,.40),0 4px 20px rgba(212,175,55,.20)`,
            transform: enterHov ? "scale(1.04)" : "scale(1)",
            marginBottom: 20,
          }}
        >
          Enter Ghaafeedi Music
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#05080F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        {/* scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 2.3 }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            animation: "gm-sp-scroll-hint 2s ease-in-out 2.5s infinite",
          }}
        >
          <span style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 10, letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.25)",
            textTransform: "uppercase" as const,
          }}>Scroll to learn more</span>
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path d="M1 1l7 7 7-7" stroke="rgba(212,175,55,0.40)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — WHAT IS GHAAFEEDI MUSIC?
// ═══════════════════════════════════════════════════════════════════════════════
function S2WhatIsGM() {
  return (
    <Section id="what-is-gm" accent>
      <Pill label="About Ghaafeedi Music" />
      <Headline>The world's first emotional storytelling studio.</Headline>
      <Divider />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
        gap: "clamp(24px,3vw,40px)",
        marginTop: "clamp(28px,3vw,44px)",
      }}>
        {[
          {
            icon: "🎬",
            title: "A Studio, Not a Tool",
            body: "Ghaafeedi Music is not a platform you operate — it is a creative studio you commission. You tell us your story. Our proprietary creative system does everything else: songwriting, vocal direction, cinematography, editing, and final delivery. You receive a finished, production-ready work.",
          },
          {
            icon: "🧠",
            title: "Emotional Intelligence at the Core",
            body: "Every production begins with emotional analysis. Our AI identifies the dominant feeling in your story — grief, love, triumph, healing, nostalgia — and uses that reading to direct every creative decision. Instrumentation, vocal tone, pacing, visual palette. All of it responds to your emotional brief.",
          },
          {
            icon: "🎵",
            title: "Songs & Films Built for You",
            body: "A song from Ghaafeedi Music is a complete production: verses that carry your narrative, a chorus built around your emotional core, and a vocal performance directed to match the feeling you described. A film is a finished cinematic work with a beginning, arc, and resolution — not a clip reel.",
          },
          {
            icon: "🛡️",
            title: "Revisions & Guarantee Behind Every Order",
            body: "Every production includes at minimum one complimentary revision. Every order is backed by our satisfaction guarantee. If we cannot meet our own standard after revisions, we do not keep your money. This is the promise that exists before any other conversation.",
          },
        ].map(card => (
          <motion.div key={card.title} variants={fadeUp} style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: "clamp(22px,2.5vw,32px)",
          }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>{card.icon}</div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(16px,1.6vw,19px)",
              fontWeight: 700,
              color: GOLD2,
              marginBottom: 12,
            }}>{card.title}</div>
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(13px,1.3vw,15px)",
              color: "rgba(255,255,255,0.72)",
              lineHeight: 1.75,
              margin: 0,
            }}>{card.body}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — WHAT IS AI-GENERATED?
// ═══════════════════════════════════════════════════════════════════════════════
function S3WhatIsAI() {
  return (
    <Section id="what-is-ai">
      <Pill label="Understanding Your Production" />
      <Headline>What "AI-generated" actually means — in plain English.</Headline>
      <Divider />
      <Body muted>
        Before you invest in your story, you deserve to know exactly what you're ordering. Not a technical explanation — a human one.
      </Body>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
        gap: "clamp(20px,3vw,36px)",
        marginTop: "clamp(32px,4vw,52px)",
      }}>
        {/* What It Is */}
        <motion.div variants={fadeUp} style={{
          background: "rgba(212,175,55,0.04)",
          border: `1px solid rgba(212,175,55,0.22)`,
          borderRadius: 18,
          padding: "clamp(24px,3vw,36px)",
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(17px,1.7vw,20px)",
            fontWeight: 700,
            color: GOLD2,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>✦</span> What It Is
          </div>
          {[
            "A real, complete, finished song — written specifically about your story. Not a loop. Not a template. A full production with verses that carry your narrative and a chorus built around your emotional core.",
            "A finished cinematic production — not a raw clip you have to edit. It has a beginning, a visual arc, and an ending. Visuals, color grade, pacing, and soundtrack work together as one piece.",
            "Every creative choice — instrumentation, vocal style, visual tone, pacing, color palette — was made in response to your specific story, not a generic genre tag.",
            "The result is unique to you. It cannot be replicated for another customer because it was built from your words, your people, your moments.",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: GOLD, marginTop: 7, flexShrink: 0,
              }} />
              <p style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(13px,1.3vw,15px)",
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.75, margin: 0,
              }}>{item}</p>
            </div>
          ))}
        </motion.div>

        {/* What It Is Not */}
        <motion.div variants={fadeUp} style={{
          background: "rgba(255,255,255,0.025)",
          border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: 18,
          padding: "clamp(24px,3vw,36px)",
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(17px,1.7vw,20px)",
            fontWeight: 700,
            color: "rgba(255,255,255,0.72)",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 22, opacity: 0.5 }}>✕</span> What It Is Not
          </div>
          {[
            "A song you get in 30 seconds by typing a genre into a box",
            "A 10-second video clip you receive and then have to build something from",
            "A template with your name inserted",
            "A product you have to edit, stitch, master, or export yourself",
            "Generic content — it cannot be, because it is built from your brief",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "rgba(255,255,255,0.25)", marginTop: 7, flexShrink: 0,
              }} />
              <p style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(13px,1.3vw,15px)",
                color: "rgba(255,255,255,0.52)",
                lineHeight: 1.75, margin: 0,
              }}>{item}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <Quote>
        "When you order from Ghaafeedi Music, you are not buying a tool. You are commissioning a production that could only be made for you."
      </Quote>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — REVISIONS PER PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════
function S4Revisions() {
  const [open, setOpen] = useState<number | null>(null);

  const products = [
    { name: "Emotional Soundtrack", tiers: [
      { tier: "Essential", revisions: "1", scope: "Mood, tempo, vocal style, lyric edits", time: "24–48 hrs" },
      { tier: "Creator",   revisions: "2", scope: "Above + instrumentation, key, length",  time: "24–48 hrs" },
      { tier: "Pro",       revisions: "3", scope: "Full creative direction change",          time: "24 hrs priority" },
    ]},
    { name: "Signature Masterpiece", tiers: [
      { tier: "Starter",  revisions: "1", scope: "Lyric refinement, mix adjustments",          time: "24–48 hrs" },
      { tier: "Premium",  revisions: "2", scope: "Full arrangement, vocal performance",        time: "24 hrs" },
      { tier: "Elite",    revisions: "3", scope: "Complete re-production if needed",            time: "Same-day priority" },
    ]},
    { name: "Cinematic Story Film", tiers: [
      { tier: "Basic",    revisions: "1", scope: "Scene order, captions, color grade", time: "48 hrs" },
      { tier: "Standard", revisions: "2", scope: "Scene additions, pacing, music sync", time: "48 hrs" },
      { tier: "Premium",  revisions: "3", scope: "Full re-cut, new visuals, audio swap", time: "24–48 hrs" },
    ]},
    { name: "Cinematic Life Story", tiers: [
      { tier: "Silver",   revisions: "1", scope: "Narrative arc adjustments",            time: "48–72 hrs" },
      { tier: "Gold",     revisions: "2", scope: "Chapter restructure, visual refresh",   time: "48 hrs" },
      { tier: "Platinum", revisions: "4", scope: "Complete rebuild on request",            time: "24–48 hrs priority" },
    ]},
    { name: "Memorial Legacy Film",   tiers: [{ tier: "All tiers", revisions: "2–3", scope: "Scene sensitivity, music tone", time: "48 hrs" }] },
    { name: "Couples Journey Film",   tiers: [{ tier: "All tiers", revisions: "1–2", scope: "Narrative balance, tone", time: "48 hrs" }] },
    { name: "Relationship Healing",   tiers: [{ tier: "All tiers", revisions: "1",   scope: "Tone, message, lyric sensitivity", time: "24 hrs" }] },
    { name: "Voice Cloning Studio",   tiers: [{ tier: "All tiers", revisions: "2",   scope: "Clone accuracy, performance style", time: "48–72 hrs" }] },
    { name: "NFT Collection",         tiers: [{ tier: "All tiers", revisions: "1",   scope: "Visual style, metadata", time: "48 hrs" }] },
    { name: "Dream AI Visualization", tiers: [{ tier: "All tiers", revisions: "1–2", scope: "Scene composition, color palette", time: "48 hrs" }] },
    { name: "Future Self Vision",     tiers: [{ tier: "All tiers", revisions: "1–2", scope: "Narrative direction, visual tone", time: "48 hrs" }] },
    { name: "Family Vault",           tiers: [{ tier: "All tiers", revisions: "2",   scope: "Organization, labels, access", time: "24 hrs" }] },
    { name: "Social Ready Clips",     tiers: [
      { tier: "Essential", revisions: "1", scope: "Caption, crop, pacing",                  time: "24 hrs" },
      { tier: "Creator",   revisions: "2", scope: "Full re-cut, caption overhaul",           time: "24 hrs" },
      { tier: "Pro",       revisions: "3", scope: "Platform-specific reformatting",           time: "Same-day" },
    ]},
    { name: "Sophia AI Companion", tiers: [{ tier: "All tiers", revisions: "Unlimited", scope: "Conversational — Sophia learns and adapts in real time", time: "Real-time" }] },
  ];

  return (
    <Section id="revisions" accent>
      <Pill label="Revision Policy" />
      <Headline>Revisions explained — every product, every tier.</Headline>
      <Divider />

      {/* Principles */}
      <motion.div variants={fadeUp} style={{
        background: "rgba(212,175,55,0.04)",
        border: `1px solid rgba(212,175,55,0.18)`,
        borderRadius: 16,
        padding: "clamp(20px,2.5vw,32px)",
        marginBottom: "clamp(28px,3vw,44px)",
      }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(15px,1.5vw,18px)",
          fontWeight: 700,
          color: GOLD2,
          marginBottom: 16,
        }}>Universal Revision Principles</div>
        {[
          "A revision is a guided change — you tell us what isn't right, in your own words, through your dashboard. We fix it. You do not need to re-brief from scratch.",
          "Every production includes at minimum one complimentary revision — no product ships without this protection.",
          "Revisions are processed within 24–48 hours of your feedback submission — you are never left waiting with no timeline.",
          "Your revision requests never expire — if you come back to your dashboard after delivery, your revision entitlement is still there.",
          "Revision = another human review, not another random generation — our team reviews your feedback and makes targeted changes.",
        ].map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
            <span style={{ color: GOLD, fontWeight: 700, flexShrink: 0, fontSize: 13, marginTop: 2 }}>{i + 1}.</span>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(13px,1.3vw,15px)", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, margin: 0 }}>{p}</p>
          </div>
        ))}
      </motion.div>

      {/* Accordion per product */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {products.map((prod, pi) => (
          <motion.div key={prod.name} variants={fadeUp}>
            <button
              onClick={() => setOpen(open === pi ? null : pi)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "clamp(14px,1.8vw,18px) clamp(16px,2vw,22px)",
                background: open === pi ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${open === pi ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: open === pi ? "12px 12px 0 0" : 12,
                cursor: "pointer",
                transition: "all 200ms ease",
                textAlign: "left" as const,
              }}
            >
              <span style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(13px,1.3vw,15px)",
                fontWeight: 600,
                color: open === pi ? GOLD2 : "rgba(255,255,255,0.85)",
              }}>{prod.name}</span>
              <svg
                width="18" height="18" viewBox="0 0 18 18" fill="none"
                style={{ transform: open === pi ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms", flexShrink: 0 }}
              >
                <path d="M4 6.5l5 5 5-5" stroke={open === pi ? GOLD : "rgba(255,255,255,0.35)"} strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
            <AnimatePresence>
              {open === pi && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{
                    background: "rgba(212,175,55,0.03)",
                    border: "1px solid rgba(212,175,55,0.18)",
                    borderTop: "none",
                    borderRadius: "0 0 12px 12px",
                    overflow: "auto",
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                      <thead>
                        <tr style={{ background: "rgba(212,175,55,0.06)" }}>
                          {["Tier", "Revisions", "Scope", "Processing"].map(h => (
                            <th key={h} style={{
                              padding: "10px 16px",
                              fontFamily: "Inter, sans-serif",
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: "0.10em",
                              textTransform: "uppercase" as const,
                              color: GOLD,
                              textAlign: "left" as const,
                              borderBottom: `1px solid rgba(212,175,55,0.12)`,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prod.tiers.map((t, ti) => (
                          <tr key={ti} style={{ borderBottom: ti < prod.tiers.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none" }}>
                            <td style={{ padding: "10px 16px", fontFamily: "Inter,sans-serif", fontSize: 13, color: GOLD2, fontWeight: 600 }}>{t.tier}</td>
                            <td style={{ padding: "10px 16px", fontFamily: "Inter,sans-serif", fontSize: 13, color: TEXT }}>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 10px",
                                borderRadius: 999,
                                background: "rgba(212,175,55,0.12)",
                                border: "1px solid rgba(212,175,55,0.22)",
                                color: GOLD2,
                                fontWeight: 600,
                                fontSize: 12,
                              }}>{t.revisions}</span>
                            </td>
                            <td style={{ padding: "10px 16px", fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(255,255,255,0.72)" }}>{t.scope}</td>
                            <td style={{ padding: "10px 16px", fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.50)", whiteSpace: "nowrap" as const }}>{t.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <motion.p variants={fadeUp} style={{
        fontFamily: "Inter, sans-serif",
        fontSize: "clamp(12px,1.2vw,14px)",
        color: MUTED,
        lineHeight: 1.7,
        marginTop: "clamp(20px,2.5vw,28px)",
        padding: "14px 18px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: `1px solid rgba(255,255,255,0.05)`,
      }}>
        All revision counts are per order. They do not expire after delivery. Submit your feedback through your dashboard at any time — your production team is notified immediately and your timeline starts from that moment.
      </motion.p>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — REFUND POLICY FRAMEWORK
// ═══════════════════════════════════════════════════════════════════════════════
function S5Refunds() {
  const tiers = [
    {
      badge: "Full Refund",
      badgeColor: "#22C55E",
      badgeBg: "rgba(34,197,94,0.10)",
      badgeBorder: "rgba(34,197,94,0.30)",
      items: [
        "Ghaafeedi Music delivers a production that does not meet our quality standard — and after exhausting all included revisions, we still cannot bring it to that standard",
        "Your production was not delivered within the stated window and no revised timeline was communicated",
        "A technical error on our side resulted in a fundamentally incorrect production (wrong name, wrong occasion, wrong story entirely — not a matter of preference)",
        "You submitted your brief and the project was never initiated on our end",
      ],
    },
    {
      badge: "Partial Refund",
      badgeColor: "#F4D06F",
      badgeBg: "rgba(244,208,111,0.08)",
      badgeBorder: "rgba(244,208,111,0.28)",
      items: [
        "A section of the film did not render to the visual quality standard described and cannot be individually re-rendered within the revision scope",
        "A lyrical element was misinterpreted and the revision process was not able to fully correct it to your satisfaction, but the rest of the production meets standard",
        "Delivery was delayed beyond the stated window, production was completed, but the delay caused a specific documented impact (e.g., a missed event date)",
      ],
    },
    {
      badge: "No Refund",
      badgeColor: "rgba(255,255,255,0.45)",
      badgeBg: "rgba(255,255,255,0.03)",
      badgeBorder: "rgba(255,255,255,0.08)",
      items: [
        "The production was completed and delivered to the standard of your brief, and all included revisions were used or declined",
        "Creative preferences changed after the production was delivered — the production matched the brief but your taste changed",
        "You did not use your included revisions and are requesting a refund without giving us the opportunity to revise",
        "The brief was vague or incomplete and the production matched what was provided",
        "Social Ready Clips and other short-form digital deliverables that have been downloaded and/or published",
      ],
    },
  ];

  return (
    <Section id="refunds">
      <Pill label="Refund Policy" />
      <Headline>Three-tier refund framework — stated clearly, in full.</Headline>
      <Divider />
      <Body muted style={{ marginBottom: "clamp(24px,3vw,36px)" }}>
        Creating cinematic productions involves real creative resource allocation from the moment your brief is submitted. Your production begins immediately and is custom-built for you. This is why our refund policy is tiered — not to protect us from you, but to reflect the reality of what a custom creative production is.
      </Body>

      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px,2vw,24px)" }}>
        {tiers.map((tier) => (
          <motion.div key={tier.badge} variants={fadeUp} style={{
            background: tier.badgeBg,
            border: `1px solid ${tier.badgeBorder}`,
            borderRadius: 16,
            padding: "clamp(22px,2.5vw,32px)",
          }}>
            <div style={{
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: 999,
              background: tier.badgeBg,
              border: `1px solid ${tier.badgeBorder}`,
              color: tier.badgeColor,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.10em",
              textTransform: "uppercase" as const,
              marginBottom: 18,
            }}>{tier.badge}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tier.items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: tier.badgeColor, marginTop: 7, flexShrink: 0,
                  }} />
                  <p style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "clamp(13px,1.3vw,15px)",
                    color: "rgba(255,255,255,0.75)",
                    lineHeight: 1.75, margin: 0,
                  }}>{item}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <Quote>
        "We want to be direct with you: not every situation qualifies for a full refund. But every situation qualifies for our attention. If you are not happy with what we delivered, your first step is always your dashboard. Tell us what's wrong. Our team reviews every case personally."
      </Quote>

      <motion.div variants={fadeUp} style={{
        background: "rgba(212,175,55,0.05)",
        border: `1px solid rgba(212,175,55,0.18)`,
        borderRadius: 12,
        padding: "clamp(16px,2vw,24px)",
        marginTop: "clamp(16px,2vw,24px)",
      }}>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(14px,1.4vw,17px)",
          fontStyle: "italic",
          color: GOLD2,
          lineHeight: 1.65,
          margin: 0,
        }}>
          "We have never kept a customer's money for a production we could not stand behind. That is not a policy — it is who we are."
        </p>
      </motion.div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — WHY GHAAFEEDI MUSIC
// ═══════════════════════════════════════════════════════════════════════════════
function S6WhyGM() {
  const rows = [
    ["What other platforms sell", "What Ghaafeedi Music delivers"],
    ["Access to generation tools", "A completed, production-ready creative work"],
    ["You write the prompt", "You tell us your story — we handle everything else"],
    ["Raw clips and tracks, no delivery", "A finished song or film, ready to share"],
    ["Credit-based subscriptions", "One order, one finished production, no credit math"],
    ["You are the creative director", "We are your creative studio — you are the storyteller"],
    ["No revision workflow", "Structured revisions with 24–48hr turnaround"],
    ["No quality guarantee", "If we can't meet our standard after revisions, you get a refund"],
  ];

  return (
    <Section id="why-us" accent>
      <Pill label="Why Ghaafeedi Music" />
      <Headline>Every other platform gives you a tool. We give you a finished story.</Headline>
      <Divider />

      {/* Comparison table */}
      <motion.div variants={fadeUp} style={{ overflowX: "auto", marginTop: "clamp(24px,3vw,40px)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr>
              <th style={{ padding: "12px 16px", textAlign: "left" as const, fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.35)", borderBottom: `1px solid rgba(255,255,255,0.07)`, width: "50%" }}>Other Platforms</th>
              <th style={{ padding: "12px 16px", textAlign: "left" as const, fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: GOLD, borderBottom: `1px solid rgba(212,175,55,0.18)`, width: "50%" }}>Ghaafeedi Music</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map(([left, right], i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent" }}>
                <td style={{ padding: "13px 16px", fontFamily: "Inter,sans-serif", fontSize: "clamp(12px,1.2vw,14px)", color: "rgba(255,255,255,0.45)", borderBottom: `1px solid rgba(255,255,255,0.05)`, lineHeight: 1.5 }}>{left}</td>
                <td style={{ padding: "13px 16px", fontFamily: "Inter,sans-serif", fontSize: "clamp(12px,1.2vw,14px)", color: "rgba(255,255,255,0.82)", borderBottom: `1px solid rgba(212,175,55,0.07)`, lineHeight: 1.5, borderLeft: `1px solid rgba(212,175,55,0.12)` }}>{right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Competitor section */}
      <motion.div variants={fadeUp} style={{ marginTop: "clamp(40px,5vw,64px)" }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(18px,2vw,22px)",
          fontWeight: 700,
          color: TEXT,
          marginBottom: 18,
        }}>How we compare to other platforms</div>
        <Body>
          Platforms like Suno, Udio, Runway, and HiggsField are excellent platforms for their intended audiences. Suno generates music from genre prompts. Runway generates video clips from text descriptions. HiggsField aggregates multiple video generation models for creative professionals. They serve creators, marketers, and technical users who want raw generation capability.
        </Body>
        <Body style={{ marginTop: 16 }}>
          What they do not offer — and have not attempted to offer — is a service that begins with your emotional story and ends with a finished production built around it. They are tools. Powerful, impressive tools. But tools.
        </Body>
        <Body style={{ marginTop: 16 }}>
          Even if you subscribed to several of these platforms simultaneously, you would still need to: write your own story framework, produce your own lyrics, direct each video clip individually, sync audio to visual yourself, handle all editing and post-production, and manage revisions manually. You would have access to generation capability and no finished product.
        </Body>
        <Body style={{ marginTop: 16 }}>
          At Ghaafeedi Music, one brief produces one finished cinematic production — song, film, or both — delivered to you, with a revision process if anything needs refining, and a satisfaction guarantee behind it.
        </Body>
      </motion.div>

      {/* Emotional storytelling argument */}
      <motion.div variants={fadeUp} style={{
        marginTop: "clamp(32px,4vw,52px)",
        background: "rgba(212,175,55,0.04)",
        border: `1px solid rgba(212,175,55,0.18)`,
        borderRadius: 16,
        padding: "clamp(24px,3vw,36px)",
      }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(17px,1.7vw,20px)",
          fontWeight: 700,
          color: GOLD2,
          marginBottom: 16,
        }}>The emotional storytelling dimension</div>
        <Body>
          There is one dimension where no comparison is even possible: emotional storytelling. No platform on the market — tool, service, or studio — has built a system designed specifically to receive a human story, extract its emotional architecture, and use that emotional reading to direct a full creative production. Not one.
        </Body>
        <Body style={{ marginTop: 14 }}>
          Ghaafeedi Music built this from the ground up. The emotional intelligence layer — the analysis of grief, love, triumph, nostalgia, healing, celebration, gratitude and their combinations — is not a feature added to a generation tool. It is the foundation the entire production system was built on.
        </Body>
        <Body style={{ marginTop: 14 }}>
          This is why a song made at Ghaafeedi Music about loss sounds different from a song about healing — not because the genre changed, but because the emotional brief was different, and the production responded at every level: lyrics, instrumentation, vocal performance, pacing, and resolution.
        </Body>
      </motion.div>

      <Quote>
        "Ghaafeedi Music is not in the AI content market. It is in the emotional legacy market. No competitor is building here. This category belongs to the people whose stories deserve more than a prompt."
      </Quote>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — CTA
// ═══════════════════════════════════════════════════════════════════════════════
function S7CTA({ onEnter }: { onEnter: () => void }) {
  const [hov1, setHov1] = useState(false);
  const [hov2, setHov2] = useState(false);

  return (
    <Section id="cta" style={{ textAlign: "center" as const }}>
      <Pill label="Your Story Is Ready" />
      <Headline center>Your story is ready to be told.</Headline>
      <Divider center />
      <Body center muted style={{ maxWidth: 560, margin: "0 auto clamp(32px,4vw,48px)" }}>
        Every production starts with a brief. Every brief starts with a question:{" "}
        <em style={{ color: GOLD2, fontFamily: "'Playfair Display', serif" }}>What do you want to remember?</em>
      </Body>

      <motion.div variants={fadeUp} style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={onEnter}
          onMouseEnter={() => setHov1(true)}
          onMouseLeave={() => setHov1(false)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "0 clamp(32px,4vw,52px)", height: 56,
            borderRadius: 999, border: "none",
            background: hov1
              ? `linear-gradient(135deg,${GOLD3} 0%,${GOLD} 100%)`
              : `linear-gradient(135deg,${GOLD} 0%,${GOLD2} 100%)`,
            color: "#05080F",
            fontSize: "clamp(14px,1.2vw,16px)",
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "all 220ms ease",
            boxShadow: hov1
              ? `0 0 48px rgba(212,175,55,.70),0 8px 36px rgba(212,175,55,.38)`
              : `0 0 28px rgba(212,175,55,.40),0 4px 22px rgba(212,175,55,.22)`,
            transform: hov1 ? "scale(1.04)" : "scale(1)",
          }}
        >
          Enter Ghaafeedi Music
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#05080F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <a
          href="/products"
          onMouseEnter={() => setHov2(true)}
          onMouseLeave={() => setHov2(false)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "0 clamp(24px,3vw,40px)", height: 56,
            borderRadius: 999,
            border: `1px solid rgba(212,175,55,${hov2 ? "0.55" : "0.28"})`,
            background: hov2 ? "rgba(212,175,55,0.08)" : "transparent",
            color: hov2 ? GOLD2 : "rgba(255,255,255,0.65)",
            fontSize: "clamp(13px,1.1vw,15px)",
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.06em",
            cursor: "pointer",
            transition: "all 200ms ease",
            textDecoration: "none",
          }}
        >
          Explore All Products
        </a>
      </motion.div>

      {/* Trust strip */}
      <motion.div variants={fadeUp} style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "clamp(10px,1.5vw,20px)",
        flexWrap: "wrap",
        marginTop: "clamp(28px,3vw,40px)",
      }}>
        {[
          "✦ No commitment until checkout",
          "🔒 Your story stays private",
          "⭐ Revisions with every order",
          "✦ Satisfaction guaranteed",
        ].map((item, i) => (
          <React.Fragment key={item}>
            {i > 0 && <div style={{ width: 3, height: 3, borderRadius: "50%", background: `rgba(212,175,55,0.35)` }} />}
            <span style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(10px,0.9vw,12px)",
              color: "rgba(255,255,255,0.32)",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap" as const,
            }}>{item}</span>
          </React.Fragment>
        ))}
      </motion.div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
interface SplashLandingPageProps {
  onComplete: () => void;
}

export function SplashLandingPage({ onComplete }: SplashLandingPageProps) {
  const [exiting, setExiting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while splash is active; unlock on unmount
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Forward wheel events from document to the splash scroll container
  // (required because position:fixed divs don't receive wheel by default
  // when the cursor is outside a scrollable child)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const handleEnter = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onComplete, 500);
  }, [exiting, onComplete]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="splash-landing"
          ref={scrollRef}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            overflowY: "scroll",
            overflowX: "hidden",
            background: BG,
            fontFamily: "Inter, sans-serif",
            color: TEXT,
            WebkitOverflowScrolling: "touch" as const,
          }}
        >
          {/* S0 — Living Logo Hero */}
          <LivingLogoHero onEnter={handleEnter} />

          {/* S1 — What Is Ghaafeedi Music */}
          <S2WhatIsGM />

          {/* S2 — What Is AI-Generated */}
          <S3WhatIsAI />

          {/* S3 — Revisions */}
          <S4Revisions />

          {/* S4 — Refund Framework */}
          <S5Refunds />

          {/* S5 — Why Ghaafeedi Music */}
          <S6WhyGM />

          {/* S6 — CTA */}
          <S7CTA onEnter={handleEnter} />

          {/* Minimal footer */}
          <div style={{
            borderTop: `1px solid ${BORDER}`,
            padding: "clamp(20px,2.5vw,28px) clamp(20px,5vw,52px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.22)" }}>
              © 2026 Ghaafeedi Music. All rights reserved.
            </span>
            <div style={{ display: "flex", gap: "clamp(12px,2vw,24px)", flexWrap: "wrap" }}>
              {[
                ["Privacy Policy", "/legal/privacy-policy"],
                ["Terms of Service", "/legal/terms-of-service"],
                ["Revisions & Guarantee", "/revisions"],
                ["Contact", "/contact"],
              ].map(([label, href]) => (
                <a key={label} href={href} style={{
                  fontFamily: "Inter,sans-serif", fontSize: 12,
                  color: "rgba(255,255,255,0.28)",
                  textDecoration: "none",
                  transition: "color 150ms",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD2)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
                >{label}</a>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
