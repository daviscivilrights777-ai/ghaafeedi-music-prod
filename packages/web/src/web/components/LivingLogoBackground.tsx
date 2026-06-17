import { useEffect, useRef, useCallback, useState } from "react";

/**
 * GHAAFEEDI MUSIC — LIVING LOGO MONUMENT v9 "CINEMATIC MONUMENT"
 * ══════════════════════════════════════════════════════════════════
 * MANDATE: Full-color logo. Full wordmark + tagline. Cinematic motion.
 *
 * What's here:
 *  1. Logo displayed at FULL COLOR — no pixel remapping, no opacity tricks
 *  2. Film strip scroll animation — left strip scrolls up-left, right scrolls down-right
 *  3. G-crest gold corona bloom pulsing
 *  4. Cinematic lens flare sweep across G-crest every 8s
 *  5. Ambient gold/purple particle field
 *  6. Mouse-tracked gold shimmer burst (desktop) / tap pulse (mobile)
 *  7. Full wordmark + tagline always visible on all 3 breakpoints
 *  8. CSS keyframe animation driven — performant, GPU composited
 */

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const LOGO_ASPECT = 1920 / 1088; // true image aspect ratio

// ── Types ──────────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; alpha: number;
  life: number; maxLife: number;
  gold: boolean;
}

interface ShimmerBurst {
  x: number; y: number;
  t: number; active: boolean;
}

// ── CSS injected once ──────────────────────────────────────────────────────────
const CSS = `
@keyframes gm-film-left {
  0%   { transform: translate(0px, 0px) rotate(-2deg); }
  50%  { transform: translate(-28px, -18px) rotate(-2.8deg); }
  100% { transform: translate(0px, 0px) rotate(-2deg); }
}
@keyframes gm-film-right {
  0%   { transform: translate(0px, 0px) rotate(2deg); }
  50%  { transform: translate(22px, 16px) rotate(2.6deg); }
  100% { transform: translate(0px, 0px) rotate(2deg); }
}
@keyframes gm-corona-pulse {
  0%   { transform: translate(-50%,-50%) scale(1.00); opacity: 0.55; }
  45%  { transform: translate(-50%,-50%) scale(1.18); opacity: 0.80; }
  100% { transform: translate(-50%,-50%) scale(1.00); opacity: 0.55; }
}
@keyframes gm-corona-ring {
  0%   { transform: translate(-50%,-50%) scale(0.90); opacity: 0.40; }
  50%  { transform: translate(-50%,-50%) scale(1.30); opacity: 0.10; }
  100% { transform: translate(-50%,-50%) scale(0.90); opacity: 0.40; }
}
@keyframes gm-lens-sweep {
  0%   { left: -20%; opacity: 0; }
  8%   { opacity: 0.88; }
  55%  { opacity: 0.72; }
  80%  { opacity: 0; }
  100% { left: 120%; opacity: 0; }
}
@keyframes gm-star-twinkle {
  0%, 100% { opacity: 0.12; transform: scale(1); }
  50%       { opacity: 0.55; transform: scale(1.6); }
}
@keyframes gm-tap-ring {
  0%   { transform: translate(-50%,-50%) scale(0.3); opacity: 0.9; }
  100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
}
@keyframes gm-shimmer-in {
  0%   { transform: translate(-50%,-50%) scale(0.1); opacity: 1; }
  60%  { opacity: 0.7; }
  100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0; }
}
@keyframes gm-logo-breathe {
  0%,100% { filter: brightness(1.00) saturate(1.00); }
  50%      { filter: brightness(1.10) saturate(1.12); }
}
@keyframes gm-tagline-glow {
  0%,100% { text-shadow: 0 0 18px rgba(212,175,55,0.30), 0 0 40px rgba(212,175,55,0.12); }
  50%      { text-shadow: 0 0 28px rgba(212,175,55,0.65), 0 0 60px rgba(212,175,55,0.25); }
}
@keyframes gm-particle-float {
  0%   { transform: translateY(0px) translateX(0px); opacity: var(--po); }
  33%  { transform: translateY(-18px) translateX(6px); opacity: calc(var(--po) * 1.4); }
  66%  { transform: translateY(-8px) translateX(-8px); opacity: var(--po); }
  100% { transform: translateY(0px) translateX(0px); opacity: var(--po); }
}
@keyframes gm-energy-swirl {
  0%   { transform: rotate(0deg) scale(1.0); opacity: 0.18; }
  50%  { transform: rotate(180deg) scale(1.15); opacity: 0.30; }
  100% { transform: rotate(360deg) scale(1.0); opacity: 0.18; }
}
`;

// ── Star seeds (stable, pre-generated) ────────────────────────────────────────
const STARS = Array.from({ length: 72 }, (_, i) => ({
  x:     ((i * 137.508 + 31) % 100),
  y:     ((i * 73.211  + 17) % 100),
  r:     0.8 + ((i * 11.3) % 1.6),
  delay: ((i * 0.31)  % 4.5).toFixed(2),
  dur:   (2.2 + ((i * 0.17) % 2.8)).toFixed(2),
  gold:  i % 5 === 0,
}));

// ── Ambient particles (CSS-driven) ─────────────────────────────────────────────
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  x:     10 + ((i * 83.7 + 11) % 80),
  y:     5  + ((i * 61.3 + 29) % 90),
  r:     1.2 + ((i * 7.3) % 2.4),
  delay: ((i * 0.43) % 7).toFixed(2),
  dur:   (5 + ((i * 0.29) % 6)).toFixed(2),
  op:    (0.08 + ((i * 0.03) % 0.22)).toFixed(3),
  gold:  i % 3 === 0,
}));

// ── Component ──────────────────────────────────────────────────────────────────
export function LivingLogoBackground() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const animRef       = useRef<number>(0);
  const lensTimerRef  = useRef<number>(0);
  const stateRef      = useRef({
    W: 0, H: 0,
    logoW: 0, logoH: 0, logoX: 0, logoY: 0,
    lensActive: false, lensT: 0,
    shimmer: { x: 0.5, y: 0.4, active: false, t: 0 } as ShimmerBurst,
    particles: [] as Particle[],
    mouseX: 0.5, mouseY: 0.4,
    dpr: 1,
  });

  // ── CSS inject ───────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById("gm-logo-css")) return;
    const s = document.createElement("style");
    s.id = "gm-logo-css";
    s.textContent = CSS;
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);

  // ── Canvas: lens flare + shimmer burst ───────────────────────────
  const computeLogoBounds = useCallback((W: number, H: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Navbar height: clamp(64px, 10vw, 84px)
    const navH = Math.min(Math.max(64, W * 0.10), 84);
    // Size the logo so it fills from just under navbar to near bottom of viewport
    // Available height = H - navH - small_margin
    const availH = H - navH - 16;
    // logoH = availH  →  logoW = availH * LOGO_ASPECT
    // But enforce minimum width so logo is always wide/demanding
    let logoW: number;
    const fromHeight = availH * LOGO_ASPECT;
    if (W >= 1200) {
      // Desktop: scale from height, min 110% of viewport width
      logoW = Math.max(fromHeight, W * 1.10);
    } else if (W >= 768) {
      // Tablet: 100% viewport width — full wordmark visible, demanding
      logoW = W * 1.00;
    } else {
      // Mobile: 100% viewport width — full wordmark visible, max impact
      logoW = W * 1.00;
    }
    const logoH = logoW / LOGO_ASPECT;
    const logoX = (W - logoW) / 2;
    // Pin top of logo just under navbar
    const logoY = navH + 8;
    return { logoW, logoH, logoX, logoY, dpr };
  }, []);

  const drawCanvas = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, s.W * s.dpr, s.H * s.dpr);
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    const { W, H, logoW, logoH, logoX, logoY } = s;

    // ── G-crest center ───────────────────────────────────────────
    const crestCX = logoX + logoW * 0.50;
    const crestCY = logoY + logoH * 0.28;

    // ── Lens flare sweep ─────────────────────────────────────────
    if (s.lensActive) {
      s.lensT = Math.min(s.lensT + 0.008, 1);
      const lx = logoX + logoW * (s.lensT * 1.4 - 0.15);
      const fadeIn  = Math.min(s.lensT * 10, 1);
      const fadeOut = 1 - Math.max(0, (s.lensT - 0.70) / 0.30);
      const alpha   = fadeIn * fadeOut * 0.82;
      if (alpha > 0) {
        // Main flare streak
        const streak = ctx.createLinearGradient(lx - logoW * 0.15, crestCY, lx + logoW * 0.15, crestCY);
        streak.addColorStop(0,    "rgba(255,249,230,0)");
        streak.addColorStop(0.35, `rgba(255,249,230,${alpha * 0.55})`);
        streak.addColorStop(0.50, `rgba(255,255,255,${alpha})`);
        streak.addColorStop(0.65, `rgba(255,249,230,${alpha * 0.55})`);
        streak.addColorStop(1,    "rgba(255,249,230,0)");
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = streak;
        ctx.fillRect(lx - logoW * 0.15, crestCY - 3, logoW * 0.30, 6);

        // Anamorphic horizontal flare
        const anam = ctx.createLinearGradient(lx - logoW * 0.55, crestCY, lx + logoW * 0.55, crestCY);
        anam.addColorStop(0,    "rgba(212,175,55,0)");
        anam.addColorStop(0.40, `rgba(212,175,55,${alpha * 0.22})`);
        anam.addColorStop(0.50, `rgba(255,249,230,${alpha * 0.40})`);
        anam.addColorStop(0.60, `rgba(212,175,55,${alpha * 0.22})`);
        anam.addColorStop(1,    "rgba(212,175,55,0)");
        ctx.fillStyle = anam;
        ctx.fillRect(lx - logoW * 0.55, crestCY - 1, logoW * 1.10, 2);

        // Core sparkle at flare center
        const sparkR = logoW * 0.03;
        const spark = ctx.createRadialGradient(lx, crestCY, 0, lx, crestCY, sparkR);
        spark.addColorStop(0,   `rgba(255,255,255,${alpha * 0.95})`);
        spark.addColorStop(0.30,`rgba(255,249,230,${alpha * 0.55})`);
        spark.addColorStop(0.65,`rgba(212,175,55,${alpha * 0.20})`);
        spark.addColorStop(1,   "rgba(212,175,55,0)");
        ctx.fillStyle = spark;
        ctx.beginPath();
        ctx.arc(lx, crestCY, sparkR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (s.lensT >= 1) { s.lensActive = false; s.lensT = 0; }
    }

    // ── Mouse shimmer burst ──────────────────────────────────────
    const sh = s.shimmer;
    if (sh.active) {
      sh.t = Math.min(sh.t + 0.035, 1);
      const bx = logoX + sh.x * logoW;
      const by = logoY + sh.y * logoH;
      const br = logoW * 0.14 * sh.t;
      const ba = (1 - sh.t) * 0.70;
      if (ba > 0) {
        const burst = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        burst.addColorStop(0,    `rgba(255,255,255,${ba})`);
        burst.addColorStop(0.20, `rgba(255,249,230,${ba * 0.65})`);
        burst.addColorStop(0.55, `rgba(212,175,55,${ba * 0.28})`);
        burst.addColorStop(1,    "rgba(212,175,55,0)");
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = burst;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (sh.t >= 1) { sh.active = false; sh.t = 0; }
    }

    animRef.current = requestAnimationFrame(drawCanvas);
  }, []);

  // ── Resize ────────────────────────────────────────────────────────
  const handleResize = useCallback(() => {
    const c = containerRef.current;
    const canvas = canvasRef.current;
    if (!c || !canvas) return;
    const W = c.offsetWidth;
    const H = c.offsetHeight;
    const { logoW, logoH, logoX, logoY, dpr } = computeLogoBounds(W, H);
    const s = stateRef.current;
    s.W = W; s.H = H;
    s.logoW = logoW; s.logoH = logoH;
    s.logoX = logoX; s.logoY = logoY;
    s.dpr = dpr;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
  }, [computeLogoBounds]);

  // ── Mouse ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const s = stateRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    s.mouseX = (e.clientX - rect.left) / rect.width;
    s.mouseY = (e.clientY - rect.top)  / rect.height;
  }, []);

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

  // ── Lens flare scheduler ─────────────────────────────────────────
  const scheduleLens = useCallback(() => {
    const fire = () => {
      stateRef.current.lensActive = true;
      stateRef.current.lensT = 0;
      lensTimerRef.current = window.setTimeout(fire, 8000 + Math.random() * 4000);
    };
    lensTimerRef.current = window.setTimeout(fire, 2500);
  }, []);

  // ── Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove as EventListener);
    window.addEventListener("click", handleClick as EventListener);
    scheduleLens();
    animRef.current = requestAnimationFrame(drawCanvas);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove as EventListener);
      window.removeEventListener("click", handleClick as EventListener);
      cancelAnimationFrame(animRef.current);
      clearTimeout(lensTimerRef.current);
    };
  }, [handleResize, handleMouseMove, handleClick, scheduleLens, drawCanvas]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute", inset: 0,
        zIndex: 1, overflow: "visible",
        pointerEvents: "none",
      }}
    >
      {/* ── STAR FIELD ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {STARS.map((st, i) => (
          <div key={i} style={{
            position:   "absolute",
            left:       `${st.x}%`,
            top:        `${st.y}%`,
            width:      st.r * 2 + "px",
            height:     st.r * 2 + "px",
            borderRadius: "50%",
            background: st.gold
              ? "radial-gradient(circle, #FBE8A6 0%, rgba(212,175,55,0.4) 60%, transparent 100%)"
              : "radial-gradient(circle, #fff 0%, rgba(200,210,255,0.5) 55%, transparent 100%)",
            animation:  `gm-star-twinkle ${st.dur}s ease-in-out ${st.delay}s infinite`,
          }} />
        ))}
      </div>

      {/* ── AMBIENT PARTICLES ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {PARTICLES.map((p, i) => (
          <div key={i} style={{
            position:   "absolute",
            left:       `${p.x}%`,
            top:        `${p.y}%`,
            width:      p.r * 2 + "px",
            height:     p.r * 2 + "px",
            borderRadius: "50%",
            background: p.gold
              ? `rgba(212,175,55,${p.op})`
              : `rgba(139,92,246,${p.op})`,
            // @ts-ignore
            "--po":     p.op,
            animation:  `gm-particle-float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          } as React.CSSProperties} />
        ))}
      </div>

      {/* ── DEEP PURPLE NEBULA BG ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse 70% 60% at 50% 38%, rgba(72,20,140,0.22) 0%, rgba(50,10,100,0.10) 50%, transparent 75%),
          radial-gradient(ellipse 50% 45% at 72% 60%, rgba(100,40,180,0.12) 0%, transparent 65%),
          radial-gradient(ellipse 40% 35% at 28% 58%, rgba(60,15,110,0.10) 0%, transparent 60%)
        `,
      }} />

      {/* ── LOGO WRAPPER — film strip animations applied here ── */}
      <LogoWithFilmStrips />

      {/* ── CANVAS — lens flare + shimmer burst (top layer) ── */}
      <canvas
        ref={canvasRef}
        style={{
          position:      "absolute",
          inset:         0,
          zIndex:        8,
          pointerEvents: "none",
          display:       "block",
        }}
      />
    </div>
  );
}

// ── LogoWithFilmStrips sub-component ─────────────────────────────────────────
function LogoWithFilmStrips() {
  const [dims, setDims] = useState({ W: 0, H: 0 });

  useEffect(() => {
    const update = () => setDims({ W: window.innerWidth, H: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { W, H } = dims;
  if (!W) return null;

  // Logo sizing — fill available viewport from navbar to bottom
  const navH = Math.min(Math.max(64, W * 0.10), 84);
  const availH = H - navH - 16;
  const fromHeight = availH * LOGO_ASPECT;
  let logoW: number;
  if (W >= 1200) {
    logoW = Math.max(fromHeight, W * 1.10);
  } else if (W >= 768) {
    logoW = W * 1.00;
  } else {
    logoW = W * 1.00;
  }

  const logoH = logoW / LOGO_ASPECT;
  const logoX = (W - logoW) / 2;
  // Pin top of logo just under navbar
  const logoY = navH + 8;

  // G-crest center for corona: ~28% down from top of logo
  const crestCX = W / 2;
  const crestCY = logoY + logoH * 0.28;

  // Corona size: ~22% of logoH
  const coronaR = logoH * 0.22;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>

      {/* ── CORONA BLOOM — behind logo ── */}
      {/* Outer ring — expands & fades */}
      <div style={{
        position:   "absolute",
        left:       crestCX,
        top:        crestCY,
        width:      coronaR * 2,
        height:     coronaR * 2,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,175,55,0) 40%, rgba(212,175,55,0.22) 65%, rgba(212,175,55,0) 100%)",
        border:     "1px solid rgba(212,175,55,0.18)",
        animation:  "gm-corona-ring 4.2s ease-in-out infinite",
      }} />
      {/* Inner bloom */}
      <div style={{
        position:   "absolute",
        left:       crestCX,
        top:        crestCY,
        width:      coronaR * 1.4,
        height:     coronaR * 1.4,
        borderRadius: "50%",
        background: `radial-gradient(circle,
          rgba(255,249,230,0.28) 0%,
          rgba(251,232,166,0.18) 30%,
          rgba(212,175,55,0.10) 58%,
          transparent 78%
        )`,
        filter:     "blur(18px)",
        animation:  "gm-corona-pulse 4.2s ease-in-out infinite",
      }} />

      {/* ── ENERGY SWIRL — purple tendril behind logo ── */}
      <div style={{
        position:   "absolute",
        left:       crestCX,
        top:        crestCY,
        width:      coronaR * 3.2,
        height:     coronaR * 3.2,
        borderRadius: "50%",
        background: `conic-gradient(
          from 0deg,
          rgba(120,40,200,0.0) 0deg,
          rgba(120,40,200,0.18) 60deg,
          rgba(80,20,160,0.08) 120deg,
          rgba(180,80,255,0.14) 180deg,
          rgba(100,30,180,0.06) 240deg,
          rgba(140,60,220,0.16) 300deg,
          rgba(120,40,200,0.0) 360deg
        )`,
        filter:     "blur(32px)",
        animation:  "gm-energy-swirl 12s linear infinite",
        opacity:    0.55,
      }} />

      {/* ── THE LOGO — full color, full visible, breathing animation ── */}
      <img
        src="/assets/ghaafeedi-logo-dark.png"
        alt="Ghaafeedi Music"
        style={{
          position:    "absolute",
          left:        logoX,
          top:         logoY,
          width:       logoW,
          height:      logoH,
          objectFit:   "contain",
          objectPosition: "center center",
          zIndex:      4,
          animation:   "gm-logo-breathe 6s ease-in-out infinite",
          // Natural full-color render — no opacity tricks
          filter:      "drop-shadow(0 0 60px rgba(212,175,55,0.35)) drop-shadow(0 0 120px rgba(180,120,20,0.18))",
          willChange:  "filter",
          pointerEvents: "none",
          userSelect:  "none",
        }}
      />

      {/* ── FILM STRIP LEFT — diagonal scroll up-left ── */}
      <div style={{
        position:   "absolute",
        left:       logoX + logoW * 0.04,
        top:        logoY + logoH * 0.52,
        width:      logoW * 0.26,
        height:     logoH * 0.28,
        zIndex:     5,
        animation:  "gm-film-left 13s ease-in-out infinite",
        transformOrigin: "center center",
        pointerEvents: "none",
        overflow:   "hidden",
      }}>
        {/* Film frame glow overlay — gold shimmer on sprockets */}
        <div style={{
          position:   "absolute", inset: 0,
          background: `linear-gradient(
            135deg,
            rgba(212,175,55,0.0) 0%,
            rgba(212,175,55,0.12) 25%,
            rgba(255,249,230,0.22) 50%,
            rgba(212,175,55,0.10) 75%,
            rgba(212,175,55,0.0) 100%
          )`,
          animation:  "gm-film-left 13s ease-in-out infinite reverse",
          mixBlendMode: "overlay" as const,
          borderRadius: 4,
        }} />
      </div>

      {/* ── FILM STRIP RIGHT — diagonal scroll down-right ── */}
      <div style={{
        position:   "absolute",
        left:       logoX + logoW * 0.70,
        top:        logoY + logoH * 0.50,
        width:      logoW * 0.26,
        height:     logoH * 0.28,
        zIndex:     5,
        animation:  "gm-film-right 15s ease-in-out infinite",
        transformOrigin: "center center",
        pointerEvents: "none",
        overflow:   "hidden",
      }}>
        <div style={{
          position:   "absolute", inset: 0,
          background: `linear-gradient(
            -135deg,
            rgba(212,175,55,0.0) 0%,
            rgba(212,175,55,0.10) 30%,
            rgba(255,249,230,0.18) 50%,
            rgba(212,175,55,0.08) 70%,
            rgba(212,175,55,0.0) 100%
          )`,
          animation:  "gm-film-right 15s ease-in-out infinite reverse",
          mixBlendMode: "overlay" as const,
          borderRadius: 4,
        }} />
      </div>

      {/* ── WORDMARK / TAGLINE GLOW UNDERLAY ── */}
      {/* Extra gold glow beneath the wordmark zone so text blazes */}
      <div style={{
        position:   "absolute",
        left:       logoX + logoW * 0.15,
        top:        logoY + logoH * 0.68,
        width:      logoW * 0.70,
        height:     logoH * 0.22,
        zIndex:     3,
        background: `radial-gradient(ellipse 80% 60% at 50% 50%,
          rgba(212,175,55,0.18) 0%,
          rgba(180,130,20,0.08) 50%,
          transparent 80%
        )`,
        filter:     "blur(22px)",
        animation:  "gm-corona-pulse 5s ease-in-out 0.5s infinite",
        pointerEvents: "none",
      }} />

      {/* ── TAGLINE GLOW UNDERLAY ── */}
      <div style={{
        position:   "absolute",
        left:       logoX + logoW * 0.10,
        top:        logoY + logoH * 0.86,
        width:      logoW * 0.80,
        height:     logoH * 0.10,
        zIndex:     3,
        background: `radial-gradient(ellipse 90% 70% at 50% 50%,
          rgba(212,175,55,0.14) 0%,
          rgba(180,130,20,0.06) 55%,
          transparent 80%
        )`,
        filter:     "blur(16px)",
        animation:  "gm-corona-pulse 5s ease-in-out 1.2s infinite",
        pointerEvents: "none",
      }} />

    </div>
  );
}
