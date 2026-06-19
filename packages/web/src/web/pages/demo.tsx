import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

/* ─── GOLD SYSTEM ─── */
const G_PRIMARY   = "#F3D37A";
const G_SECONDARY = "#D4A23A";
const G_ACCENT    = "#FFF2C2";
const G_DEEP      = "#9B6E1A";
const G_GLOW_MAX  = "rgba(243,211,122,0.70)";
const G_GLOW_MID  = "rgba(243,211,122,0.32)";
const G_GLOW_LOW  = "rgba(243,211,122,0.13)";
const BG          = "#01040B";
const WHITE       = "#FFFFFF";

const HERO_VIDEO = "https://pub-bc7b203485814e1186102277ad450211.r2.dev/GHAAFEEDI_MUSIC_DEMO_FULL.mp4";
const GALAXY_BG  = "/assets/galaxy-bg.png";

const CARDS = [
  { id:"voice",        title:"Voice Cloning Studio",      badge:"AI VOICE",    tagline:"Your voice. Immortalized.",         img:"/assets/prod-voice-cloning.webp"           },
  { id:"relationship", title:"Relationship Healing",       badge:"AI STORY",    tagline:"Emotions turned to music.",          img:"/assets/prod-relationship-healing.webp"    },
  { id:"memorial",     title:"Memorial Legacy Film",       badge:"AI FILM",     tagline:"A life worth remembering.",          img:"/assets/prod-memorial-legacy.webp"         },
  { id:"couples",      title:"Couples Journey Film",       badge:"AI STORY",    tagline:"Your love story, on screen.",        img:"/assets/prod-couples-journey.webp"         },
  { id:"cinematic",    title:"Cinematic Story Film",       badge:"AI CINEMATIC",tagline:"One chapter. Cinematic forever.",   img:"/assets/prod-cinematic-story-film.webp"    },
  { id:"dream",        title:"Dream AI Visualization",     badge:"AI VISUAL",   tagline:"Your visions rendered in 4K.",      img:"/assets/prod-dream-visualization.webp"     },
  { id:"future",       title:"Future Self Vision",         badge:"AI TRANSFORM",tagline:"See your highest potential.",       img:"/assets/prod-future-self.webp"             },
  { id:"soundtrack",   title:"Emotional Soundtrack",       badge:"AI MUSIC",    tagline:"Music born from your story.",       img:"/assets/prod-emotional-soundtrack.webp"    },
];

/* ─── PARTICLE CANVAS ─── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf: number, t = 0, mx = 0, my = 0;

    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; });

    const DUST = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.0 + 0.3,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.20,
      a: Math.random() * 0.45 + 0.08,
      ph: Math.random() * Math.PI * 2,
      sp: Math.random() * 0.007 + 0.002,
    }));

    const STARS = Array.from({ length: 420 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.1,
      a: Math.random() * 0.72 + 0.10,
      sp: Math.random() * 0.003 + 0.001,
      ph: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      t += 0.005;
      const W = c.width, H = c.height;
      ctx.clearRect(0, 0, W, H);

      /* Mouse bloom */
      const bx = mx || W*0.5, by = my || H*0.38;
      const bloom = ctx.createRadialGradient(bx, by, 0, bx, by, W*0.5);
      bloom.addColorStop(0, "rgba(243,211,122,0.045)");
      bloom.addColorStop(0.5, "rgba(243,211,122,0.012)");
      bloom.addColorStop(1, "transparent");
      ctx.fillStyle = bloom; ctx.fillRect(0,0,W,H);

      /* Volumetric gold behind hero area — centered upper third */
      const pulse = 0.86 + 0.14 * Math.sin(t * 0.75);
      const cx2 = W*0.5, cy2 = H*0.29;
      const vol = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, W*0.44*pulse);
      vol.addColorStop(0,    "rgba(255,242,194,0.13)");
      vol.addColorStop(0.08, "rgba(243,211,122,0.09)");
      vol.addColorStop(0.25, "rgba(212,162,58,0.05)");
      vol.addColorStop(0.55, "rgba(155,110,26,0.02)");
      vol.addColorStop(1,    "transparent");
      ctx.fillStyle = vol; ctx.fillRect(0,0,W,H);

      /* Faint radial glow centered where play button sits (~35–40% down) */
      const py = H * 0.56;
      const playGlow = ctx.createRadialGradient(cx2, py, 0, cx2, py, W*0.18);
      playGlow.addColorStop(0,   "rgba(243,211,122,0.10)");
      playGlow.addColorStop(0.5, "rgba(243,211,122,0.03)");
      playGlow.addColorStop(1,   "transparent");
      ctx.fillStyle = playGlow; ctx.fillRect(0,0,W,H);

      /* Stars */
      STARS.forEach(s => {
        const flicker = 0.38 + 0.62 * Math.abs(Math.sin(t * s.sp * 200 + s.ph));
        ctx.beginPath();
        ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,247,214,${(s.a * flicker).toFixed(3)})`;
        ctx.fill();
        if (s.r > 1.1 && flicker > 0.80) {
          ctx.strokeStyle = `rgba(255,244,196,${(flicker*0.20).toFixed(3)})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(s.x*W - s.r*3.5, s.y*H); ctx.lineTo(s.x*W + s.r*3.5, s.y*H);
          ctx.moveTo(s.x*W, s.y*H - s.r*3.5); ctx.lineTo(s.x*W, s.y*H + s.r*3.5);
          ctx.stroke();
        }
      });

      /* Gold dust */
      DUST.forEach(p => {
        const dx = (mx - p.x)*0.000045, dy = (my - p.y)*0.000045;
        p.vx += dx; p.vy += dy; p.vx *= 0.98; p.vy *= 0.98;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W+20; if (p.x > W+20) p.x = -20;
        if (p.y < -20) p.y = H+20; if (p.y > H+20) p.y = -20;
        const alpha = p.a * (0.5 + 0.5*Math.sin(t*p.sp*300 + p.ph));
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*3.5);
        gr.addColorStop(0, `rgba(255,244,196,${(alpha*0.75).toFixed(3)})`);
        gr.addColorStop(0.5, `rgba(243,211,122,${(alpha*0.38).toFixed(3)})`);
        gr.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*3.5, 0, Math.PI*2);
        ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*0.55, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,244,196,${alpha.toFixed(3)})`; ctx.fill();
      });

      /* God rays — controlled 8 beams, ≤15% opacity */
      ctx.save();
      ctx.globalAlpha = 0.016 + 0.007*Math.sin(t*0.6);
      for (let i = 0; i < 8; i++) {
        const angle = (i/8)*Math.PI*2 + t*0.014;
        const len = W*(0.46 + 0.12*Math.sin(t*0.4 + i));
        const rayW = 0.014 + 0.005*Math.sin(t*0.8 + i*0.7);
        ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(angle);
        const rg = ctx.createLinearGradient(0,0,len,0);
        rg.addColorStop(0,   "rgba(255,242,194,0.8)");
        rg.addColorStop(0.18,"rgba(243,211,122,0.5)");
        rg.addColorStop(0.6, "rgba(212,162,58,0.15)");
        rg.addColorStop(1,   "transparent");
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.lineTo(len, -len*rayW); ctx.lineTo(len, len*rayW);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none" }} />;
}

/* ─── LUXURY PLAY BUTTON ─── */
function GoldPlay({ size, pulsing }: { size: number; pulsing: boolean }) {
  return (
    <div style={{ position:"relative", width:size, height:size, display:"flex", alignItems:"center", justifyContent:"center" }}>

      {/* Outer atmospheric glow disc — very faint, large */}
      <div style={{
        position:"absolute",
        width: size * 3.2, height: size * 3.2,
        borderRadius:"50%",
        left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        background:`radial-gradient(circle, rgba(243,211,122,0.08) 0%, rgba(243,211,122,0.03) 40%, transparent 70%)`,
        pointerEvents:"none",
        animation:"playAtmo 3.5s ease-in-out infinite",
      }}/>

      {/* Pulse rings */}
      {pulsing && <>
        <div style={{ position:"absolute", inset:-size*0.20, borderRadius:"50%", border:`1.5px solid rgba(243,211,122,0.50)`, animation:"pulse1 2.6s ease-out infinite", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", inset:-size*0.42, borderRadius:"50%", border:`1px solid rgba(243,211,122,0.25)`, animation:"pulse1 2.6s ease-out infinite 0.87s", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", inset:-size*0.66, borderRadius:"50%", border:`0.5px solid rgba(243,211,122,0.12)`, animation:"pulse1 2.6s ease-out infinite 1.74s", pointerEvents:"none" }}/>
      </>}

      {/* Multi-layer glow stack */}
      <div style={{
        position:"absolute", inset:-8, borderRadius:"50%",
        boxShadow:[
          `0 0 ${size*0.5}px ${G_GLOW_MAX}`,
          `0 0 ${size*1.0}px ${G_GLOW_MID}`,
          `0 0 ${size*1.8}px rgba(243,211,122,0.18)`,
          `0 0 ${size*3.0}px rgba(243,211,122,0.07)`,
        ].join(", "),
        pointerEvents:"none",
      }}/>

      {/* Metallic gold sphere */}
      <div style={{
        width:size, height:size, borderRadius:"50%",
        /* Luxury watch crown — warm white highlight, mid gold, deep amber base */
        background:`
          radial-gradient(circle at 32% 26%,
            #FFFAF0 0%,
            ${G_ACCENT} 8%,
            ${G_PRIMARY} 28%,
            ${G_SECONDARY} 55%,
            ${G_DEEP} 78%,
            #5A3A08 100%
          )`,
        boxShadow:[
          `inset 0 2px 6px rgba(255,255,255,0.55)`,
          `inset 0 -3px 10px rgba(0,0,0,0.70)`,
          `inset 0 1px 2px rgba(255,250,240,0.4)`,
          `0 0 ${size*0.5}px ${G_GLOW_MAX}`,
          `0 ${size*0.1}px ${size*0.5}px rgba(0,0,0,0.6)`,
        ].join(", "),
        display:"flex", alignItems:"center", justifyContent:"center",
        position:"relative", zIndex:1, flexShrink:0,
      }}>
        {/* Top specular sheen */}
        <div style={{
          position:"absolute", top:0, left:"5%", right:"5%", height:"44%",
          borderRadius:`${size/2}px ${size/2}px ${size*0.3}px ${size*0.3}px`,
          background:"linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)",
          pointerEvents:"none",
        }}/>
        {/* Side rim light — right edge cold shimmer */}
        <div style={{
          position:"absolute", top:"20%", right:"4%", width:"12%", height:"60%",
          borderRadius:"50%",
          background:"linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)",
          pointerEvents:"none",
        }}/>
        {/* Triangle play icon */}
        <svg
          width={size*0.34} height={size*0.34}
          viewBox="0 0 24 24" fill="none"
          style={{ marginLeft:size*0.07, position:"relative", zIndex:2, filter:`drop-shadow(0 1px 3px rgba(0,0,0,0.8))` }}
        >
          <polygon points="4,2 22,12 4,22" fill={BG}/>
        </svg>
      </div>
    </div>
  );
}

/* ─── MOVIE POSTER CARD ─── */
function PosterCard({ card }: { card: typeof CARDS[0] }) {
  const [hover, setHover] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position:"relative",
        aspectRatio:"2/3",
        borderRadius:16, overflow:"hidden", cursor:"pointer",
        /* Premium card shadow — deep and theatrical */
        boxShadow: hover
          ? [
              `0 0 0 1.5px rgba(243,211,122,0.65)`,
              `0 0 35px rgba(243,211,122,0.22)`,
              `0 0 80px rgba(243,211,122,0.08)`,
              `0 28px 90px rgba(0,0,0,0.95)`,
              `0 8px 32px rgba(0,0,0,0.8)`,
            ].join(", ")
          : [
              `0 0 0 1px rgba(243,211,122,0.16)`,
              `0 12px 55px rgba(0,0,0,0.85)`,
              `0 4px 20px rgba(0,0,0,0.6)`,
            ].join(", "),
        transform: hover ? "translateY(-12px) scale(1.022)" : "translateY(0) scale(1)",
        transition:"all 0.40s cubic-bezier(0.34,1.4,0.64,1)",
      }}
    >
      {/* Cinematic image */}
      <img
        src={card.img}
        alt={card.title}
        onLoad={() => setImgLoaded(true)}
        style={{
          position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"center 18%",
          /* Higher depth on hover — like a spotlight hitting the poster */
          filter:`contrast(1.42) saturate(1.60) brightness(${hover ? 0.90 : 0.68})`,
          transform: hover ? "scale(1.08)" : "scale(1.02)",
          transition:"all 0.68s cubic-bezier(0.25,0.46,0.45,0.94)",
          opacity: imgLoaded ? 1 : 0,
        }}
      />
      {!imgLoaded && <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,#060c1c 0%,#0d1628 100%)" }}/>}

      {/* Cinematic gradient — deep bottom, barely visible top */}
      <div style={{
        position:"absolute", inset:0,
        background:"linear-gradient(180deg, rgba(1,4,11,0.02) 0%, rgba(1,4,11,0.05) 35%, rgba(1,4,11,0.68) 68%, rgba(1,4,11,0.97) 100%)",
      }}/>
      {/* Side vignettes — framing */}
      <div style={{
        position:"absolute", inset:0,
        background:"linear-gradient(90deg, rgba(1,4,11,0.60) 0%, transparent 18%, transparent 82%, rgba(1,4,11,0.60) 100%)",
      }}/>
      {/* Top vignette — subtle */}
      <div style={{
        position:"absolute", inset:0,
        background:"linear-gradient(180deg, rgba(1,4,11,0.35) 0%, transparent 22%)",
      }}/>

      {/* Top gold edge accent */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:2.5, zIndex:5,
        background:`linear-gradient(90deg, transparent 0%, ${G_DEEP} 12%, ${G_SECONDARY} 28%, ${G_ACCENT} 50%, ${G_SECONDARY} 72%, ${G_DEEP} 88%, transparent 100%)`,
        opacity: hover ? 1 : 0.35, transition:"opacity 0.4s",
      }}/>
      {/* Bottom thin line */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:1, zIndex:5,
        background:`linear-gradient(90deg, transparent, rgba(243,211,122,0.25), transparent)`,
        opacity: hover ? 0.8 : 0.15, transition:"opacity 0.4s",
      }}/>

      {/* Badge */}
      <div style={{
        position:"absolute", top:15, left:15, zIndex:6,
        background:"rgba(1,4,11,0.82)", backdropFilter:"blur(14px)",
        border:`1px solid rgba(243,211,122,0.48)`,
        borderRadius:5, padding:"4px 10px",
        fontSize:9, fontWeight:700, letterSpacing:"0.20em",
        color: G_PRIMARY, fontFamily:"Inter,sans-serif", textTransform:"uppercase",
        boxShadow:`0 0 12px rgba(243,211,122,0.20), inset 0 0 8px rgba(243,211,122,0.04)`,
      }}>{card.badge}</div>

      {/* Play button — center poster */}
      <div style={{
        position:"absolute", top:"40%", left:"50%",
        transform:`translate(-50%,-50%) scale(${hover ? 1.10 : 0.82})`,
        zIndex:6, transition:"all 0.40s cubic-bezier(0.34,1.4,0.64,1)",
        opacity: hover ? 1 : 0.50,
      }}>
        <GoldPlay size={58} pulsing={hover}/>
      </div>

      {/* Bottom content */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"22px 18px 18px", zIndex:6 }}>
        <div style={{
          fontFamily:"Playfair Display,serif",
          fontSize:"clamp(15px,1.35vw,21px)",
          fontWeight:700, color: G_PRIMARY, lineHeight:1.18, marginBottom:8,
          textShadow:`0 2px 18px rgba(0,0,0,0.99), 0 0 24px rgba(243,211,122,0.40), 0 0 48px rgba(243,211,122,0.18)`,
          letterSpacing:"-0.01em",
        }}>{card.title}</div>

        {/* Gold separator — grows on hover */}
        <div style={{
          width: hover ? "82%" : "36%", height:1,
          background:`linear-gradient(90deg, ${G_SECONDARY}, rgba(243,211,122,0.2), transparent)`,
          transition:"width 0.55s ease", marginBottom:9,
        }}/>

        {/* Italic tagline — editorial feel */}
        <div style={{
          fontFamily:"Playfair Display,serif", fontStyle:"italic",
          fontSize:"clamp(11px,0.95vw,14px)",
          color:`rgba(255,247,214,${hover ? 0.62 : 0.32})`,
          letterSpacing:"0.01em",
          transition:"color 0.4s",
          lineHeight:1.4,
        }}>{card.tagline}</div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function DemoPage() {
  const [, setLocation] = useLocation();
  const videoRef  = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(86);
  const [showCtrl, setShowCtrl] = useState(true);
  const [hoverBack,  setHoverBack]  = useState(false);
  const [hoverPlay,  setHoverPlay]  = useState(false);
  const [hoverCTA1,  setHoverCTA1]  = useState(false);
  const [hoverCTA2,  setHoverCTA2]  = useState(false);
  const ctrlTimer = useRef<ReturnType<typeof setTimeout>>();
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);

  // Lazy-load video: only fetch when player enters viewport
  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVideoSrc(HERO_VIDEO);
          obs.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else         videoRef.current.play();
  };

  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    setProgress(videoRef.current.currentTime / (videoRef.current.duration || 86));
  };

  const onPlayerMove = () => {
    setShowCtrl(true);
    clearTimeout(ctrlTimer.current);
    if (playing) ctrlTimer.current = setTimeout(() => setShowCtrl(false), 2800);
  };

  const scrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = frac * (videoRef.current.duration || 86);
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`;

  return (
    <div style={{ minHeight:"100vh", background:BG, color:WHITE, fontFamily:"Inter,sans-serif", overflowX:"hidden", position:"relative" }}>

      {/* ══ KEYFRAMES ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap');

        @keyframes pulse1 {
          0%   { transform:scale(1);    opacity:0.90; }
          100% { transform:scale(1.90); opacity:0;    }
        }
        @keyframes playAtmo {
          0%,100% { opacity:0.7; transform:translate(-50%,-50%) scale(1);    }
          50%     { opacity:1.0; transform:translate(-50%,-50%) scale(1.08); }
        }
        @keyframes goldShimmer {
          0%   { background-position: 0%   center; }
          100% { background-position: 400% center; }
        }
        @keyframes goldShimmerSlow {
          0%   { background-position: 0%   center; }
          100% { background-position: 300% center; }
        }
        @keyframes bloomBreath {
          0%,100% { opacity:0.55; transform:scale(1);    }
          50%     { opacity:0.88; transform:scale(1.05); }
        }
        @keyframes titleRise {
          0%   { opacity:0; transform:translateY(40px) scale(0.98); }
          100% { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes subtitleFade {
          0%   { opacity:0; transform:translateY(18px); }
          100% { opacity:1; transform:translateY(0);    }
        }
        @keyframes lightRayPulse {
          0%,100% { opacity:0.45; }
          50%     { opacity:0.80; }
        }
        @keyframes frameGlow {
          0%,100% {
            box-shadow:
              0 0 55px  rgba(243,211,122,0.22),
              0 0 120px rgba(243,211,122,0.07),
              0 55px 150px rgba(0,0,0,0.96);
          }
          50% {
            box-shadow:
              0 0 90px  rgba(243,211,122,0.42),
              0 0 200px rgba(243,211,122,0.14),
              0 55px 150px rgba(0,0,0,0.96);
          }
        }
        @keyframes legacyGlow {
          0%,100% { box-shadow: 0 0 45px rgba(243,211,122,0.12), 0 0 100px rgba(243,211,122,0.04), inset 0 0 90px rgba(243,211,122,0.025); }
          50%     { box-shadow: 0 0 80px rgba(243,211,122,0.24), 0 0 180px rgba(243,211,122,0.08), inset 0 0 110px rgba(243,211,122,0.045); }
        }
        @keyframes beamSweep {
          0%,100% { opacity:0;   transform:translateX(-80px) skewX(-8deg); }
          30%,70% { opacity:1;   transform:translateX(0px)   skewX(-8deg); }
        }
        @keyframes ctaPrimaryBreath {
          0%,100% { box-shadow: 0 5px 32px rgba(243,211,122,0.32), 0 0 22px rgba(243,211,122,0.15); }
          50%     { box-shadow: 0 5px 50px rgba(243,211,122,0.50), 0 0 40px rgba(243,211,122,0.25); }
        }
        @keyframes eyebrowFade {
          0%   { opacity:0; letter-spacing:0.50em; }
          100% { opacity:1; letter-spacing:0.30em; }
        }

        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(243,211,122,0.25); border-radius:4px; }
      `}</style>

      {/* ══ LAYER 0: Galaxy BG ══ */}
      <div style={{
        position:"fixed", inset:0, zIndex:0,
        backgroundImage:`url(${GALAXY_BG})`,
        backgroundSize:"cover", backgroundPosition:"center top", backgroundRepeat:"no-repeat",
        filter:"brightness(0.52) saturate(0.82)",
      }}/>
      {/* Deep space ink overlay */}
      <div style={{ position:"fixed", inset:0, zIndex:0, background:"rgba(1,4,11,0.44)", pointerEvents:"none" }}/>

      {/* ══ LAYER 1: Cinematic vignettes ══ */}
      <div style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none",
        background:"radial-gradient(ellipse at 50% 0%, transparent 0%, rgba(1,4,11,0.28) 50%, rgba(1,4,11,0.72) 100%)" }}/>
      <div style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none",
        background:"linear-gradient(90deg, rgba(1,4,11,0.68) 0%, transparent 18%, transparent 82%, rgba(1,4,11,0.68) 100%)" }}/>
      <div style={{ position:"fixed", bottom:0, left:0, right:0, height:"42vh", zIndex:1, pointerEvents:"none",
        background:"linear-gradient(0deg, rgba(1,4,11,1) 0%, rgba(1,4,11,0.72) 50%, transparent 100%)" }}/>

      {/* ══ LAYER 2: Canvas ══ */}
      <ParticleCanvas />

      {/* ══ NAV ══ */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:300, height:66,
        background:"rgba(1,4,11,0.80)", backdropFilter:"blur(30px) saturate(1.5)",
        borderBottom:"1px solid rgba(243,211,122,0.11)",
        display:"flex", alignItems:"center", padding:"0 40px", justifyContent:"space-between",
      }}>
        <div onClick={() => setLocation("/")} style={{ cursor:"pointer", display:"flex", alignItems:"center" }}>
          <img
            src="/assets/ghaafeedi-logo-dark.webp"
            alt="Ghaafeedi Music"
            style={{ height:40, width:"auto", objectFit:"contain", filter:`drop-shadow(0 0 12px rgba(212,175,55,0.35))` }}
          />
        </div>
        <button
          onClick={() => setLocation("/")}
          onMouseEnter={() => setHoverBack(true)}
          onMouseLeave={() => setHoverBack(false)}
          style={{
            background: hoverBack ? "rgba(243,211,122,0.08)" : "rgba(255,255,255,0.028)",
            border:`1px solid ${hoverBack ? "rgba(243,211,122,0.6)" : "rgba(255,255,255,0.10)"}`,
            color: hoverBack ? G_PRIMARY : "rgba(255,255,255,0.45)",
            borderRadius:10, padding:"9px 22px",
            fontSize:13, fontWeight:500, fontFamily:"Inter,sans-serif",
            cursor:"pointer", transition:"all 0.22s ease", letterSpacing:"0.04em",
            backdropFilter:"blur(8px)",
          }}
        >← Back to Home</button>
      </nav>

      {/* ══ PAGE CONTENT ══ */}
      <div style={{ position:"relative", zIndex:10, paddingTop:108 }}>

        {/* ── HERO TITLE ── */}
        <div style={{ textAlign:"center", padding:"0 32px 48px" }}>

          {/* Eyebrow — animated letter-spacing expand */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"center", gap:20, marginBottom:32,
            animation:"eyebrowFade 1.4s cubic-bezier(0.16,1,0.3,1) forwards",
          }}>
            <div style={{ width:72, height:1, background:`linear-gradient(90deg,transparent,${G_SECONDARY})` }}/>
            <span style={{
              fontSize:10.5, fontWeight:600, letterSpacing:"0.30em",
              color: G_SECONDARY, textTransform:"uppercase", fontFamily:"Inter,sans-serif",
              textShadow:`0 0 16px rgba(212,162,58,0.65)`,
            }}>Full Cinematic Experience · 9 Stories · 1 Legacy</span>
            <div style={{ width:72, height:1, background:`linear-gradient(90deg,${G_SECONDARY},transparent)` }}/>
          </div>

          {/* Title block */}
          <div style={{
            position:"relative", display:"inline-block",
            animation:"titleRise 1.1s cubic-bezier(0.16,1,0.3,1) forwards",
          }}>
            {/* Cinematic light rays flanking the title */}
            <div style={{
              position:"absolute", top:-80, left:"-2%",
              width:"38%", height:320,
              background:`linear-gradient(168deg, rgba(255,242,194,0.075) 0%, rgba(255,242,194,0.03) 45%, transparent 70%)`,
              transform:"rotate(-16deg)", pointerEvents:"none",
              transformOrigin:"top center",
              animation:"lightRayPulse 5.5s ease-in-out infinite",
            }}/>
            <div style={{
              position:"absolute", top:-80, right:"-2%",
              width:"32%", height:300,
              background:`linear-gradient(192deg, rgba(255,242,194,0.055) 0%, rgba(255,242,194,0.02) 45%, transparent 70%)`,
              transform:"rotate(16deg)", pointerEvents:"none",
              transformOrigin:"top center",
              animation:"lightRayPulse 5.5s ease-in-out infinite 1.4s",
            }}/>

            {/* MAIN HEADLINE — 12-stop luxury metallic */}
            <h1 style={{
              fontFamily:"Playfair Display,serif",
              fontSize:"clamp(64px,7.2vw,104px)",
              fontWeight:700, lineHeight:0.92,
              margin:"0 auto", maxWidth:1240,
              letterSpacing:"-0.015em",
              /* Luxury watch / Rolls-Royce metallic — warm highlight → rich gold → deep amber → highlight */
              background:`linear-gradient(
                158deg,
                #FFFDF5  0%,
                ${G_ACCENT}  5%,
                ${G_PRIMARY} 14%,
                #FFE990     24%,
                ${G_PRIMARY} 33%,
                ${G_SECONDARY} 44%,
                #B87E20     52%,
                ${G_SECONDARY} 58%,
                ${G_PRIMARY} 66%,
                #FFE990     76%,
                ${G_ACCENT}  85%,
                #FFFDF5  90%,
                ${G_PRIMARY} 100%
              )`,
              backgroundSize:"400% auto",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              backgroundClip:"text",
              /* Depth: hot glow + wide diffuse + deep shadow for contrast */
              filter:[
                `drop-shadow(0 0  45px rgba(243,211,122,0.68))`,
                `drop-shadow(0 0  90px rgba(243,211,122,0.30))`,
                `drop-shadow(0 0 160px rgba(212,162,58,0.14))`,
                `drop-shadow(0 4px  2px rgba(0,0,0,0.98))`,
                `drop-shadow(0 8px 10px rgba(0,0,0,0.65))`,
              ].join(" "),
              animation:"goldShimmer 10s linear infinite",
              position:"relative", zIndex:2,
            }}>
              Your Story.<br/>Your Soundtrack.<br/>Your Legacy.
            </h1>
          </div>

          {/* Subtitle — delayed fade, editorial spacing */}
          <p style={{
            fontFamily:"Inter,sans-serif",
            fontSize:"clamp(13px,1.32vw,17px)",
            fontWeight:300,
            color:"rgba(255,247,214,0.44)",
            margin:"32px auto 0", maxWidth:510,
            lineHeight:1.75, letterSpacing:"0.035em",
            animation:"subtitleFade 1.4s 0.35s cubic-bezier(0.16,1,0.3,1) both",
          }}>
            The world's first AI-powered emotional storytelling platform.
            <br/>
            <span style={{
              color:"rgba(243,211,122,0.36)",
              fontFamily:"Playfair Display,serif",
              fontStyle:"italic",
              fontWeight:400,
              fontSize:"clamp(12px,1.2vw,15px)",
            }}>
              Your life. Turned into cinema.
            </span>
          </p>
        </div>

        {/* ── HERO VIDEO PLAYER — Theater Screen ── */}
        <div style={{ maxWidth:1288, margin:"0 auto", padding:"0 20px" }}>

          {/* Volumetric gold behind the player — like stage lighting */}
          <div style={{
            position:"absolute", left:"50%", transform:"translateX(-50%)",
            width:"72%", height:320,
            background:`radial-gradient(ellipse at 50% 30%,
              rgba(243,211,122,0.11) 0%,
              rgba(243,211,122,0.05) 40%,
              rgba(243,211,122,0.015) 65%,
              transparent 80%
            )`,
            pointerEvents:"none",
            animation:"bloomBreath 5s ease-in-out infinite",
            marginTop:-80, zIndex:0,
          }}/>

          {/* Gold frame — animated shimmer */}
          <div style={{
            borderRadius:28, padding:"2.5px",
            background:`linear-gradient(
              138deg,
              #FFFDF5 0%,
              ${G_ACCENT} 8%,
              ${G_PRIMARY} 20%,
              ${G_SECONDARY} 38%,
              ${G_DEEP} 52%,
              ${G_SECONDARY} 62%,
              ${G_PRIMARY} 76%,
              ${G_ACCENT} 88%,
              #FFFDF5 100%
            )`,
            backgroundSize:"400% 400%",
            animation:"goldShimmerSlow 6s linear infinite, frameGlow 4s ease-in-out infinite",
            position:"relative", zIndex:1,
          }}>
            <div
              ref={playerRef}
              onClick={togglePlay}
              onMouseMove={onPlayerMove}
              onMouseEnter={() => { setHoverPlay(true); setShowCtrl(true); }}
              onMouseLeave={() => { setHoverPlay(false); if(playing) setShowCtrl(false); }}
              style={{
                position:"relative", width:"100%",
                height:"clamp(240px,54.8vw,702px)",
                borderRadius:26, overflow:"hidden",
                background:"#000", cursor:"pointer",
              }}
            >
              {/* Inset theater shadow */}
              <div style={{
                position:"absolute", inset:0, zIndex:3, pointerEvents:"none",
                boxShadow:"inset 0 0 140px rgba(1,4,11,0.60)", borderRadius:26,
              }}/>

              {/* Poster image */}
              <img
                src="/assets/hero-poster.webp"
                alt="Cinematic Legacy"
                style={{
                  position:"absolute", inset:0, width:"100%", height:"100%",
                  objectFit:"cover", zIndex:1,
                  display: playing ? "none" : "block",
                  filter:"contrast(1.22) saturate(1.30) brightness(0.78)",
                }}
              />
              <video
                ref={videoRef}
                src={videoSrc}
                style={{
                  width:"100%", height:"100%", display:"block",
                  objectFit:"cover", borderRadius:24,
                  opacity: playing ? 1 : 0, transition:"opacity 0.55s ease",
                  position:"relative", zIndex:2,
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setProgress(0); }}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 86)}
                playsInline preload="none"
              />

              {/* Letterbox bars */}
              <div style={{ position:"absolute", top:0, left:0, right:0, height:"5.5%", background:"rgba(0,0,0,0.88)", zIndex:4, pointerEvents:"none", transition:"opacity 0.5s", opacity: playing && !showCtrl ? 0.2 : 0.92 }}/>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"5.5%", background:"rgba(0,0,0,0.88)", zIndex:4, pointerEvents:"none", transition:"opacity 0.5s", opacity: playing && !showCtrl ? 0.2 : 0.92 }}/>

              {/* Volumetric haze on poster — gold cloud from center */}
              {!playing && (
                <div style={{
                  position:"absolute", inset:0, zIndex:3, pointerEvents:"none",
                  background:`radial-gradient(ellipse at 50% 44%,
                    rgba(243,211,122,0.09) 0%,
                    rgba(243,211,122,0.03) 30%,
                    rgba(1,4,11,0.22) 58%,
                    rgba(1,4,11,0.68) 100%
                  )`,
                }}/>
              )}

              {/* Paused state — play button with full luxury treatment */}
              {!playing && (
                <div style={{
                  position:"absolute", inset:0, zIndex:5,
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", gap:26,
                }}>
                  <div style={{
                    transform: hoverPlay ? "scale(1.10)" : "scale(1)",
                    transition:"transform 0.35s cubic-bezier(0.34,1.4,0.64,1)",
                  }}>
                    <GoldPlay size={136} pulsing />
                  </div>
                  {/* "Experience" label — editorial */}
                  <div style={{
                    display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                  }}>
                    <div style={{
                      fontSize:10.5, letterSpacing:"0.28em", textTransform:"uppercase",
                      color:"rgba(255,247,214,0.45)", fontFamily:"Inter,sans-serif", fontWeight:500,
                      textShadow:`0 0 16px rgba(243,211,122,0.32)`,
                    }}>Begin the Experience</div>
                    {/* Thin gold underline */}
                    <div style={{
                      width:60, height:1,
                      background:`linear-gradient(90deg, transparent, ${G_SECONDARY}, transparent)`,
                      opacity:0.6,
                    }}/>
                  </div>
                </div>
              )}

              {/* Playback controls */}
              <div style={{
                position:"absolute", bottom:0, left:0, right:0, zIndex:8,
                padding:"0 32px 26px",
                background:"linear-gradient(0deg, rgba(1,4,11,0.99) 0%, rgba(1,4,11,0.72) 55%, transparent 100%)",
                opacity: showCtrl ? 1 : 0, transition:"opacity 0.4s ease",
                pointerEvents: showCtrl ? "auto" : "none",
              }}>
                {/* Scrubber */}
                <div
                  onClick={e => { e.stopPropagation(); scrub(e); }}
                  style={{ width:"100%", height:4, background:"rgba(255,255,255,0.09)", borderRadius:4, marginBottom:18, cursor:"pointer", position:"relative" }}
                >
                  <div style={{
                    width:`${progress*100}%`, height:"100%",
                    background:`linear-gradient(90deg, ${G_SECONDARY}, ${G_PRIMARY}, ${G_ACCENT})`,
                    borderRadius:4, position:"relative", transition:"width 0.1s linear",
                    boxShadow:`0 0 8px ${G_GLOW_MID}`,
                  }}>
                    <div style={{ position:"absolute", right:-7, top:"50%", transform:"translateY(-50%)", width:14, height:14, borderRadius:"50%", background:G_ACCENT, boxShadow:`0 0 10px ${G_GLOW_MAX}, 0 0 24px ${G_GLOW_MID}` }}/>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <button
                    onClick={e => { e.stopPropagation(); togglePlay(); }}
                    style={{
                      width:40, height:40, borderRadius:"50%", flexShrink:0,
                      background:`radial-gradient(circle at 32% 28%, ${G_ACCENT}, ${G_PRIMARY}, ${G_SECONDARY})`,
                      border:"none", cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow:`0 0 16px ${G_GLOW_MID}`,
                    }}
                  >
                    {playing
                      ? <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><rect x="1" y="1" width="3.5" height="12" rx="1" fill={BG}/><rect x="7.5" y="1" width="3.5" height="12" rx="1" fill={BG}/></svg>
                      : <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><polygon points="2,1 12,7 2,13" fill={BG}/></svg>
                    }
                  </button>
                  <span style={{ fontSize:12, color:"rgba(255,247,214,0.60)", fontFamily:"Inter,sans-serif", letterSpacing:"0.07em", flexShrink:0 }}>
                    {fmt(videoRef.current?.currentTime || 0)} / {fmt(duration)}
                  </span>
                  <div style={{ flex:1 }}/>
                  <div style={{
                    padding:"4px 12px", borderRadius:6,
                    border:`1px solid rgba(243,211,122,0.32)`, background:"rgba(1,4,11,0.88)",
                    fontSize:10, fontWeight:700, letterSpacing:"0.15em",
                    color: G_PRIMARY, fontFamily:"Inter,sans-serif",
                  }}>HD 1080p</div>
                  <button
                    onClick={e => { e.stopPropagation(); videoRef.current?.requestFullscreen?.(); }}
                    style={{ background:"transparent", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.45)", padding:0 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M1 1h5M1 1v5M17 1h-5M17 1v5M1 17h5M1 17v-5M17 17h-5M17 17v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Caption — italic editorial */}
          <p style={{
            textAlign:"center",
            fontFamily:"Playfair Display,serif", fontStyle:"italic",
            fontSize:"clamp(13px,1.45vw,20px)",
            color:"rgba(255,247,214,0.36)",
            margin:"22px 0 0", letterSpacing:"0.018em", lineHeight:1.5,
            textShadow:`0 0 20px rgba(243,211,122,0.18)`,
          }}>
            Watch the full cinematic journey — 9 stories, one legacy.
          </p>
        </div>

        {/* ── CATEGORY SECTION ── */}
        <div style={{ maxWidth:1288, margin:"72px auto 0", padding:"0 20px" }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:22, marginBottom:32 }}>
            <h2 style={{
              fontFamily:"Playfair Display,serif",
              fontSize:"clamp(20px,2.5vw,33px)",
              fontWeight:600, color:WHITE, margin:0,
              textShadow:`0 0 30px rgba(243,211,122,0.16)`,
              letterSpacing:"-0.01em",
            }}>Explore by Category</h2>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg, rgba(243,211,122,0.32), transparent)` }}/>
            <span style={{
              fontSize:9.5, color:"rgba(243,211,122,0.35)",
              fontFamily:"Inter,sans-serif", letterSpacing:"0.22em", textTransform:"uppercase",
            }}>4 Experiences</span>
          </div>

          {/* Poster grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px,1fr))", gap:20 }}>
            {CARDS.map(c => <PosterCard key={c.id} card={c}/>)}
          </div>
        </div>

        {/* ── LEGACY INVITATION PANEL ── */}
        <div style={{ maxWidth:1288, margin:"72px auto 0", padding:"0 20px 84px" }}>
          <div style={{
            borderRadius:24, overflow:"hidden", position:"relative",
            background:"linear-gradient(148deg, rgba(16,26,58,0.94) 0%, rgba(8,13,36,0.97) 45%, rgba(2,4,14,0.99) 100%)",
            backdropFilter:"blur(36px) saturate(1.7)",
            border:`1.5px solid rgba(243,211,122,0.24)`,
            animation:"legacyGlow 5.5s ease-in-out infinite",
          }}>

            {/* Premium top rule — 3-stop gold */}
            <div style={{
              position:"absolute", top:0, left:0, right:0, height:2,
              background:`linear-gradient(90deg,
                transparent 0%,
                ${G_DEEP} 10%,
                ${G_SECONDARY} 25%,
                ${G_ACCENT} 40%,
                ${G_PRIMARY} 50%,
                ${G_ACCENT} 60%,
                ${G_SECONDARY} 75%,
                ${G_DEEP} 90%,
                transparent 100%
              )`,
            }}/>

            {/* Sweeping light beam */}
            <div style={{
              position:"absolute", top:0, left:"-15%", width:"55%", height:"100%",
              background:"linear-gradient(108deg, transparent 0%, rgba(243,211,122,0.032) 42%, transparent 72%)",
              animation:"beamSweep 8s ease-in-out infinite", pointerEvents:"none",
            }}/>

            {/* Right ambient gold */}
            <div style={{
              position:"absolute", inset:0, pointerEvents:"none",
              background:"radial-gradient(ellipse at 78% 50%, rgba(243,211,122,0.055) 0%, transparent 58%)",
              animation:"bloomBreath 7s ease-in-out infinite 1s",
            }}/>

            {/* Corner filigree ornaments */}
            {[
              { pos:{top:0,left:0},        dir:"135deg", r:"24px 0 0 0"   },
              { pos:{top:0,right:0},       dir:"225deg", r:"0 24px 0 0"   },
              { pos:{bottom:0,left:0},     dir:"45deg",  r:"0 0 0 24px"   },
              { pos:{bottom:0,right:0},    dir:"315deg", r:"0 0 24px 0"   },
            ].map((o,i) => (
              <div key={i} style={{
                position:"absolute", ...o.pos, width:90, height:90, pointerEvents:"none",
                background:`linear-gradient(${o.dir}, rgba(243,211,122,0.10) 0%, transparent 50%)`,
                borderRadius:o.r,
              }}/>
            ))}

            {/* Content */}
            <div style={{
              position:"relative", zIndex:2,
              padding:"56px 64px",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              flexWrap:"wrap", gap:40,
            }}>
              <div style={{ maxWidth:560 }}>
                {/* Overline */}
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
                  <div style={{ width:30, height:1, background:`linear-gradient(90deg,transparent,${G_SECONDARY})` }}/>
                  <span style={{
                    fontSize:10, fontWeight:600, letterSpacing:"0.30em",
                    color: G_SECONDARY, textTransform:"uppercase", fontFamily:"Inter,sans-serif",
                    textShadow:`0 0 14px rgba(212,162,58,0.60)`,
                  }}>Your Legacy Awaits</span>
                  <div style={{ width:30, height:1, background:`linear-gradient(90deg,${G_SECONDARY},transparent)` }}/>
                </div>

                {/* CTA Headline — Rolls-Royce level */}
                <h3 style={{
                  fontFamily:"Playfair Display,serif",
                  fontSize:"clamp(30px,3.4vw,56px)",
                  fontWeight:700, lineHeight:1.05, margin:"0 0 20px",
                  letterSpacing:"-0.015em",
                  background:`linear-gradient(
                    145deg,
                    #FFFDF5  0%,
                    ${G_ACCENT}  6%,
                    ${G_PRIMARY} 22%,
                    #FFE990     38%,
                    ${G_SECONDARY} 55%,
                    ${G_PRIMARY} 70%,
                    ${G_ACCENT}  85%,
                    ${G_PRIMARY} 100%
                  )`,
                  backgroundSize:"300% auto",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                  animation:"goldShimmerSlow 12s linear infinite",
                  filter:[
                    `drop-shadow(0 0 28px rgba(243,211,122,0.58))`,
                    `drop-shadow(0 0 56px rgba(243,211,122,0.22))`,
                    `drop-shadow(0 3px 2px rgba(0,0,0,0.99))`,
                  ].join(" "),
                }}>
                  Your story deserves<br/>to live forever.
                </h3>

                {/* Subhead */}
                <p style={{
                  fontFamily:"Inter,sans-serif", fontWeight:300,
                  fontSize:"clamp(13px,1.2vw,16px)",
                  color:"rgba(255,247,214,0.50)", margin:"0 0 10px",
                  lineHeight:1.75, letterSpacing:"0.025em",
                }}>
                  Begin creating your cinematic legacy today.
                </p>
                <p style={{
                  fontFamily:"Playfair Display,serif", fontStyle:"italic",
                  fontSize:"clamp(12px,1.1vw,15px)",
                  color:"rgba(243,211,122,0.36)", margin:0,
                  lineHeight:1.6, letterSpacing:"0.01em",
                }}>
                  Powered by AI. Shaped by your emotions.
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display:"flex", flexDirection:"column", gap:14, flexShrink:0, alignItems:"stretch", minWidth:228 }}>
                <button
                  onClick={() => setLocation("/onboarding")}
                  onMouseEnter={() => setHoverCTA1(true)}
                  onMouseLeave={() => setHoverCTA1(false)}
                  style={{
                    height:64, padding:"0 42px", borderRadius:16,
                    background: hoverCTA1
                      ? `linear-gradient(138deg, #FFFDF5 0%, ${G_ACCENT} 8%, ${G_PRIMARY} 35%, ${G_SECONDARY} 100%)`
                      : `linear-gradient(138deg, ${G_PRIMARY} 0%, ${G_SECONDARY} 100%)`,
                    border:"none", color:BG,
                    fontSize:15, fontWeight:700, fontFamily:"Inter,sans-serif",
                    cursor:"pointer", letterSpacing:"0.05em",
                    transform: hoverCTA1 ? "translateY(-4px) scale(1.025)" : "none",
                    boxShadow: hoverCTA1
                      ? `0 16px 60px rgba(243,211,122,0.68), 0 0 40px rgba(243,211,122,0.38), 0 0 90px rgba(243,211,122,0.16)`
                      : undefined,
                    animation: hoverCTA1 ? undefined : "ctaPrimaryBreath 3.5s ease-in-out infinite",
                    transition:"all 0.30s cubic-bezier(0.34,1.4,0.64,1)",
                    whiteSpace:"nowrap", position:"relative", overflow:"hidden",
                  }}
                >
                  <div style={{
                    position:"absolute", top:0, left:0, right:0, height:"48%",
                    background:"linear-gradient(180deg, rgba(255,255,255,0.24) 0%, transparent 100%)",
                    borderRadius:"16px 16px 0 0", pointerEvents:"none",
                  }}/>
                  <span style={{ position:"relative", zIndex:1 }}>Begin My Legacy →</span>
                </button>

                <button
                  onClick={() => setLocation("/products")}
                  onMouseEnter={() => setHoverCTA2(true)}
                  onMouseLeave={() => setHoverCTA2(false)}
                  style={{
                    height:64, padding:"0 38px", borderRadius:16,
                    background: hoverCTA2 ? "rgba(243,211,122,0.07)" : "rgba(255,255,255,0.025)",
                    border:`1.5px solid ${hoverCTA2 ? "rgba(243,211,122,0.65)" : "rgba(243,211,122,0.24)"}`,
                    color: hoverCTA2 ? G_PRIMARY : "rgba(255,247,214,0.58)",
                    fontSize:15, fontWeight:500, fontFamily:"Inter,sans-serif",
                    cursor:"pointer", letterSpacing:"0.04em",
                    transform: hoverCTA2 ? "translateY(-3px)" : "none",
                    boxShadow: hoverCTA2 ? `0 0 30px rgba(243,211,122,0.20)` : "none",
                    transition:"all 0.26s cubic-bezier(0.34,1.4,0.64,1)",
                    whiteSpace:"nowrap", backdropFilter:"blur(12px)",
                  }}
                >Explore All Products</button>

                <div style={{
                  textAlign:"center", fontSize:10, fontWeight:300,
                  color:"rgba(255,247,214,0.24)", fontFamily:"Inter,sans-serif",
                  letterSpacing:"0.12em",
                }}>No commitment · Cancel anytime</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop:"1px solid rgba(255,255,255,0.038)",
          padding:"20px 40px", textAlign:"center",
          position:"relative", zIndex:10,
          background:"rgba(1,4,11,0.65)",
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:26, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, fontWeight:300, color:"rgba(255,255,255,0.16)", fontFamily:"Inter,sans-serif" }}>© 2026 Ghaafeedi Music. All rights reserved.</span>
            <div style={{ width:1, height:11, background:"rgba(255,255,255,0.08)" }}/>
            {[["Home","/"],["Products","/products"],["Get Started","/onboarding"]].map(([label,path]) => (
              <span key={label}
                style={{ fontSize:11, color:"rgba(243,211,122,0.28)", fontFamily:"Inter,sans-serif", cursor:"pointer", letterSpacing:"0.04em", transition:"color 0.2s" }}
                onClick={() => setLocation(path)}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(243,211,122,0.65)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(243,211,122,0.28)")}
              >{label}</span>
            ))}
          </div>
        </footer>

      </div>
    </div>
  );
}
