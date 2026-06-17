import { GhaafeediLogo } from "../components/GhaafeediLogo";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useSession, signOut, clearToken } from "../lib/authClient";

// ─── CSS ───────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap');

  .gm-root {
    background: #020612;
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
    font-family: 'Inter', sans-serif;
  }

  @keyframes titleMetalPulse {
    0%,100% {
      text-shadow:
        0 1px 0 #fffA, 0 -1px 0 #0005,
        0 0 8px #D4AF37aa, 0 0 18px #FFC24D55;
      filter: drop-shadow(0 0 10px #D4AF3799);
    }
    50% {
      text-shadow:
        0 1px 0 #fffC, 0 -1px 0 #0007,
        0 0 12px #FFC24Dcc, 0 0 26px #D4AF3777;
      filter: drop-shadow(0 0 16px #FFC24Daa);
    }
  }
  @keyframes titleShimmer {
    0%   { background-position: 0% center; }
    50%  { background-position: 100% center; }
    100% { background-position: 0% center; }
  }
  .gm-title {
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    background: linear-gradient(130deg,
      #FFF8E7 0%, #FFE499 6%, #FFC24D 13%, #F4D06F 22%,
      #FFFBF0 32%, #D4AF37 42%, #FFF8E7 50%, #FFC24D 58%,
      #F4D06F 66%, #C8960A 74%, #E8C84A 82%, #FFFBF0 90%, #D4AF37 100%
    );
    background-size: 280% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: titleMetalPulse 5.5s ease-in-out infinite, titleShimmer 9s ease-in-out infinite;
    letter-spacing: -0.02em;
    line-height: 1.0;
  }

  /* ── SOPHIA: THE SUN ── */
  @keyframes sophiaSun {
    0%,100% {
      filter:
        drop-shadow(0 0 40px #FFC24Dff)
        drop-shadow(0 0 90px #D4AF37ee)
        drop-shadow(0 0 180px #D4AF3799)
        drop-shadow(0 0 320px #FFC24D44);
    }
    50% {
      filter:
        drop-shadow(0 0 60px #FFC24Dff)
        drop-shadow(0 0 130px #FFC24Dee)
        drop-shadow(0 0 260px #D4AF37bb)
        drop-shadow(0 0 480px #FFC24D55);
    }
  }
  @keyframes sophiaPulse {
    0%,100% { transform: scale(1.000); }
    33%      { transform: scale(1.018); }
    66%      { transform: scale(0.996); }
  }
  @keyframes sophiaFloat {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-6px); }
  }
  .sophia-wrapper {
    animation: sophiaSun 5.5s ease-in-out infinite, sophiaPulse 7s ease-in-out infinite, sophiaFloat 8s ease-in-out infinite;
    position: absolute;
    z-index: 20;
    overflow: visible;
  }

  /* ── ORBIT PARTICLES ── */
  @keyframes orbitCW  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
  @keyframes orbitCCW { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
  @keyframes orbitDot { 0%,100%{opacity:0.9;transform:scale(1);}50%{opacity:0.4;transform:scale(0.6);} }
  .orbit-ring { position:absolute; pointer-events:none; border-radius:50%; }
  .orbit-cw   { animation: orbitCW  var(--dur,18s) linear infinite; }
  .orbit-ccw  { animation: orbitCCW var(--dur,24s) linear infinite; }

  /* ── RINGS ── */
  @keyframes ringRotate  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes ringRotateR { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

  /* ── HEX CARD breathing ── */
  @keyframes hexBreathe {
    0%,100% { filter: brightness(1.00) saturate(1.00) contrast(1.00); }
    50%      { filter: brightness(1.05) saturate(1.08) contrast(1.02); }
  }
  @keyframes hexShimmer {
    0%   { opacity: 0; transform: translateX(-120%) skewX(-20deg); }
    40%  { opacity: 0.55; }
    100% { opacity: 0; transform: translateX(220%) skewX(-20deg); }
  }
  .hex-card {
    position: absolute;
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.36s cubic-bezier(0.34,1.56,0.64,1), filter 0.36s ease, box-shadow 0.36s ease;
    will-change: transform, filter;
    animation: hexBreathe 5s ease-in-out infinite;
  }
  .hex-card::after {
    content: '';
    position: absolute; inset: 0; z-index: 10; pointer-events: none;
    background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
    opacity: 0;
    transition: opacity 0.6s ease;
  }
  .hex-card:hover::after {
    opacity: 1;
    animation: hexShimmer 0.7s ease forwards;
  }
  .hex-card:hover {
    transform: scale(1.12) translateY(-10px) !important;
    filter: brightness(1.40) saturate(1.55) contrast(1.10) !important;
    z-index: 99 !important;
    animation: none !important;
  }
  .hex-sophia-clip {
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    overflow: hidden;
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
  }

  /* ── GOLD LIGHT RAYS ── */
  @keyframes rayRotate  { from { transform: rotate(0deg); }  to { transform: rotate(360deg); } }
  @keyframes rayRotateR { from { transform: rotate(0deg); }  to { transform: rotate(-360deg); } }
  .sophia-rays       { position:absolute; pointer-events:none; z-index:0; animation: rayRotate  52s linear infinite; transform-origin:center center; }
  .sophia-rays-inner { position:absolute; pointer-events:none; z-index:0; animation: rayRotateR 28s linear infinite; transform-origin:center center; }

  /* ── MEMBER ── */
  @keyframes memberShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .member-glow { box-shadow: 0 0 0 2.5px #9333EA, 0 0 20px 8px #7C3AED88, 0 0 42px 16px #7C3AED33; }
  .member-badge {
    background: linear-gradient(90deg, #7C3AED, #9333EA, #A855F7, #9333EA, #7C3AED);
    background-size: 200% auto;
    animation: memberShimmer 3s linear infinite;
    padding: 3px 9px; border-radius: 8px;
    font-size: 7.5px; font-weight: 700; color: #fff;
    letter-spacing: 0.07em; text-transform: uppercase;
    white-space: nowrap; border: 1px solid #A855F766;
  }

  /* ── FILTER PILLS ── */
  .filter-pill {
    height: 46px; padding: 0 24px; border-radius: 23px;
    border: 1px solid rgba(212,175,55,0.40);
    background: rgba(212,175,55,0.06);
    color: rgba(212,175,55,0.8);
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.22s ease;
    white-space: nowrap; letter-spacing: 0.06em; text-transform: uppercase;
    backdrop-filter: blur(6px);
  }
  .filter-pill:hover  { border-color:rgba(212,175,55,0.75); color:#FFC24D; background:rgba(212,175,55,0.12); box-shadow:0 0 18px rgba(212,175,55,0.25); }
  .filter-pill.active { background:linear-gradient(135deg,#D4AF37,#FFC24D); color:#020817; border-color:transparent; font-weight:700; box-shadow:0 4px 22px rgba(212,175,55,0.60); }

  /* ── GOLD BORDER SHIMMER ── */
  @keyframes borderShimmer {
    0%   { background-position: 0% center; }
    100% { background-position: 200% center; }
  }
  .hex-border-shimmer {
    background: linear-gradient(135deg, #FFF8E7 0%, #FFC24D 25%, #F4D06F 50%, #D4AF37 75%, #FFF8E7 100%);
    background-size: 200% auto;
    animation: borderShimmer 3.5s linear infinite;
  }

  /* ── PARTICLE FLOAT ── */
  @keyframes floatUp {
    0%   { transform: translateY(0px) scale(1);   opacity: 0; }
    15%  { opacity: 1; }
    85%  { opacity: 0.6; }
    100% { transform: translateY(-180px) scale(0.3); opacity: 0; }
  }

  /* ── ATMOSPHERIC DRIFT ── */
  @keyframes atmDrift1 {
    0%,100% { transform: translate(0px,0px) scale(1); opacity: 0.6; }
    33%      { transform: translate(12px,-18px) scale(1.08); opacity: 0.9; }
    66%      { transform: translate(-8px,10px) scale(0.94); opacity: 0.5; }
  }
  @keyframes atmDrift2 {
    0%,100% { transform: translate(0px,0px) scale(1); opacity: 0.5; }
    40%      { transform: translate(-14px,12px) scale(1.12); opacity: 0.8; }
    70%      { transform: translate(10px,-8px) scale(0.92); opacity: 0.4; }
  }
  @keyframes atmDrift3 {
    0%,100% { transform: translate(0px,0px); opacity: 0.7; }
    50%      { transform: translate(8px,-22px); opacity: 0.35; }
  }

  /* ── PREMIUM CARD GLASS REFLECTION ── */
  .hex-glass {
    position: absolute; inset: 0; pointer-events: none; z-index: 6;
    background: linear-gradient(
      135deg,
      rgba(255,255,255,0.00) 0%,
      rgba(255,255,255,0.00) 35%,
      rgba(255,255,255,0.07) 50%,
      rgba(255,255,255,0.12) 54%,
      rgba(255,255,255,0.04) 62%,
      rgba(255,255,255,0.00) 75%
    );
  }

  /* ── SOPHIA CONNECTION ENERGY ── */
  @keyframes connPulse {
    0%,100% { opacity: 0.12; }
    50%      { opacity: 0.30; }
  }

  /* ── MEMBER GLOW UPGRADE ── */
  .member-glow {
    box-shadow: 0 0 0 2.5px #9333EA, 0 0 22px 10px #7C3AED99, 0 0 48px 18px #7C3AED33;
    animation: hexBreathe 5s ease-in-out infinite, memberPulse 3.5s ease-in-out infinite;
  }
  @keyframes memberPulse {
    0%,100% { box-shadow: 0 0 0 2.5px #9333EA, 0 0 22px 10px #7C3AED99, 0 0 48px 18px #7C3AED33; }
    50%      { box-shadow: 0 0 0 2.5px #A855F7, 0 0 32px 14px #9333EAbb, 0 0 64px 24px #7C3AED44; }
  }
`;

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
interface Product {
  id: string; title: string; subtitle: string;
  price: string; category: string; image: string;
  memberOnly?: boolean; isSophia?: boolean;
}
const ALL_PRODUCTS: Product[] = [
  { id:"sophia-ai",            title:"Sophia AI",              subtitle:"Emotional Companion",      price:"From $29/mo", category:"AI",     image:"/assets/prod-sophia-ai.png",            isSophia:true },
  { id:"voice-cloning-studio",  title:"Voice Cloning Studio",   subtitle:"Your Voice. Immortalized.", price:"From $299",   category:"Studio", image:"/assets/prod-voice-cloning.png" },
  { id:"signature-masterpiece",title:"Signature Masterpiece",  subtitle:"Your Story in Music",       price:"From $99",    category:"Music",  image:"/assets/prod-signature-masterpiece.png" },
  { id:"emotional-soundtrack", title:"Emotional Soundtrack",   subtitle:"Feel Every Moment",         price:"From $19/mo", category:"Music",  image:"/assets/prod-emotional-soundtrack.png" },
  { id:"cinematic-story-film", title:"Cinematic Story Film",   subtitle:"Your Life. The Movie.",     price:"From $79",    category:"Video",  image:"/assets/prod-cinematic-story-film.png" },
  { id:"dream-ai-visualization",title:"Dream AI Visualization", subtitle:"See Your Dreams",           price:"From $79",    category:"AI",     image:"/assets/prod-dream-visualization.png" },
  { id:"future-self-vision",   title:"Future Self Vision",     subtitle:"Meet Tomorrow's You",       price:"From $79",    category:"AI",     image:"/assets/prod-future-self.png" },
  { id:"nft-collection",       title:"NFT Collection",         subtitle:"Own Your Legacy",           price:"From $299",   category:"NFT",    image:"/assets/prod-nft-collection.png",       memberOnly:true },
  { id:"memorial-legacy-film",  title:"Memorial Legacy Film",   subtitle:"Honor & Remember",          price:"From $399",   category:"Video",  image:"/assets/prod-memorial-legacy.png" },
  { id:"family-vault",         title:"Family Vault",           subtitle:"Generations of Memory",     price:"From $199",   category:"Legacy", image:"/assets/prod-family-vault.png" },
  { id:"couples-journey-film",  title:"Couples Journey Film",   subtitle:"Your Love Story",           price:"From $149",   category:"Video",  image:"/assets/prod-couples-journey.png" },
  { id:"relationship-healing", title:"Relationship Healing",   subtitle:"Heal Through Music",        price:"From $69",    category:"Music",  image:"/assets/prod-relationship-healing.png", memberOnly:true },
  { id:"cinematic-life-story", title:"Cinematic Life Story",   subtitle:"Epic. Personal. Yours.",    price:"From $499",   category:"Video",  image:"/assets/prod-cinematic-life-story.png", memberOnly:true },
  { id:"social-ready-clips",    title:"Social Ready Clips",     subtitle:"Share Your Journey",        price:"From $49",    category:"Video",  image:"/assets/prod-social-clips.png" },
];
const CATEGORIES = ["All","AI","Music","Video","Studio","Legacy","NFT"];

// ─── GALAXY CANVAS — performance-safe ────────────────────────────────────────
// Mobile: CSS gradient background only (no canvas). Tablet: reduced canvas.
// Desktop: full cinematic canvas. This prevents OOM crashes on mobile webviews.
function GalaxyCanvas({ isMobile, isTablet }: { isMobile: boolean; isTablet: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const activeRef = useRef(true);

  useEffect(() => {
    // Mobile: no canvas — use CSS background only (crash prevention)
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reduced counts for tablet
    const STAR_COUNT  = isTablet ? 1200 : 3000;
    const DUST_COUNT  = isTablet ? 180  : 420;
    const SPARK_MAX   = isTablet ? 50   : 100;
    const SPARK_RATE  = isTablet ? 0.3  : 0.4;
    // Cap canvas height to prevent huge GPU texture allocations
    const MAX_CANVAS_H = isTablet ? 4000 : 6000;

    type Star  = { x:number; y:number; r:number; a:number; tw:number; warm:boolean; layer:number };
    type Dust  = { x:number; y:number; vx:number; vy:number; r:number; a:number };
    type Spark = { x:number; y:number; vx:number; vy:number; life:number; max:number };

    let stars: Star[]  = [];
    let dust:  Dust[]  = [];
    let sparks: Spark[] = [];
    let W = 0, H = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    function init() {
      W = window.innerWidth;
      H = Math.min(Math.max(document.body.scrollHeight || 3200, window.innerHeight * 2.8), MAX_CANVAS_H);
      canvas!.width  = W;
      canvas!.height = H;

      stars = Array.from({length: STAR_COUNT}, () => {
        const layer = Math.floor(Math.random()*4);
        return {
          x: Math.random()*W, y: Math.random()*H,
          r: layer===3?Math.random()*3.0+1.0:layer===2?Math.random()*1.8+0.5:layer===1?Math.random()*1.0+0.2:Math.random()*0.4+0.08,
          a: layer===3?Math.random()*0.70+0.55:layer===2?Math.random()*0.50+0.35:layer===1?Math.random()*0.38+0.22:Math.random()*0.22+0.08,
          tw: Math.random()*Math.PI*2, warm: Math.random()<0.35, layer,
        };
      });
      dust = Array.from({length: DUST_COUNT}, () => ({
        x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-0.5)*0.20, vy:Math.random()*0.14+0.03,
        r:Math.random()*2.0+0.25, a:Math.random()*0.60+0.10,
      }));
    }

    // Debounced resize — prevents storm on navigation/orientation change
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(init, 250);
    }

    function draw(t: number) {
      if (!activeRef.current) return;
      const time = t * 0.001;
      ctx!.clearRect(0,0,W,H);

      // ── deep space bg ──
      const bg = ctx!.createLinearGradient(0,0,0,H);
      bg.addColorStop(0.00,"#010510"); bg.addColorStop(0.15,"#030A1C");
      bg.addColorStop(0.35,"#02081A"); bg.addColorStop(0.60,"#020816");
      bg.addColorStop(0.85,"#020710"); bg.addColorStop(1.00,"#010408");
      ctx!.fillStyle=bg; ctx!.fillRect(0,0,W,H);

      // ── top deep blue radial ──
      const topR = ctx!.createRadialGradient(W*0.5,0,0,W*0.5,0,H*0.50);
      topR.addColorStop(0,"rgba(22,12,85,0.50)"); topR.addColorStop(0.4,"rgba(14,8,60,0.26)"); topR.addColorStop(1,"rgba(0,0,0,0)");
      ctx!.fillStyle=topR; ctx!.fillRect(0,0,W,H);

      // ── nebula clouds ──
      const nebs = [
        {cx:W*0.50,cy:H*0.15,rx:W*0.62,ry:H*0.30,c:"rgba(88,38,200,0.18)"},
        {cx:W*0.20,cy:H*0.28,rx:W*0.42,ry:H*0.22,c:"rgba(64,22,160,0.14)"},
        {cx:W*0.80,cy:H*0.35,rx:W*0.40,ry:H*0.20,c:"rgba(48,28,175,0.12)"},
        {cx:W*0.50,cy:H*0.50,rx:W*0.70,ry:H*0.30,c:"rgba(212,175,55,0.028)"},
        {cx:W*0.28,cy:H*0.64,rx:W*0.33,ry:H*0.18,c:"rgba(100,28,240,0.10)"},
        {cx:W*0.72,cy:H*0.72,rx:W*0.34,ry:H*0.17,c:"rgba(55,18,150,0.08)"},
        {cx:W*0.50,cy:H*0.07,rx:W*0.72,ry:H*0.13,c:"rgba(212,175,55,0.032)"},
      ];
      for (const n of nebs) {
        ctx!.save();
        ctx!.translate(n.cx,n.cy); ctx!.scale(1,n.ry/n.rx);
        const g=ctx!.createRadialGradient(0,0,0,0,0,n.rx);
        g.addColorStop(0,n.c); g.addColorStop(1,"rgba(0,0,0,0)");
        ctx!.fillStyle=g; ctx!.beginPath(); ctx!.arc(0,0,n.rx,0,Math.PI*2); ctx!.fill(); ctx!.restore();
      }

      // ── gold swirls ──
      for (let sw=0;sw<5;sw++) {
        const ang0=(sw/5)*Math.PI*2+time*(sw%2===0?0.032:-0.022);
        ctx!.beginPath(); ctx!.moveTo(W*0.5,H*0.18);
        for (let i=0;i<=80;i++) {
          const f=i/80, ang=ang0+f*Math.PI*3.0*(sw%2===0?1:-1);
          const rad=(W*0.08+f*W*0.40)*(1+Math.sin(time*0.28+sw)*0.05);
          ctx!.lineTo(W*0.5+Math.cos(ang)*rad,H*0.18+Math.sin(ang)*rad*0.38);
        }
        const swA=Math.max(0,(0.030-sw*0.004)*(Math.sin(time*0.44+sw)*0.28+0.72));
        ctx!.strokeStyle=`rgba(212,175,55,${swA})`; ctx!.lineWidth=1.3; ctx!.stroke();
      }

      const scx=W*0.5, scy=H*0.18;

      // ── sophia gold atmosphere ──
      for (const hz of [
        {r:W*0.08,a:0.34,col:"255,194,77"},{r:W*0.16,a:0.18,col:"212,175,55"},
        {r:W*0.28,a:0.08,col:"212,175,55"},{r:W*0.46,a:0.035,col:"212,175,55"},
        {r:W*0.65,a:0.015,col:"255,194,77"},
      ]) {
        const pulse=Math.sin(time*0.9+hz.r)*0.08+1;
        const g=ctx!.createRadialGradient(scx,scy,0,scx,scy,hz.r*pulse);
        g.addColorStop(0,`rgba(${hz.col},${hz.a})`);
        g.addColorStop(0.45,`rgba(${hz.col},${hz.a*0.35})`);
        g.addColorStop(1,"rgba(0,0,0,0)");
        ctx!.fillStyle=g; ctx!.beginPath(); ctx!.arc(scx,scy,hz.r*pulse,0,Math.PI*2); ctx!.fill();
      }

      // ── energy rings ──
      for (const ring of [
        {r:W*0.07,a:0.68,spd:0.030,w:3.2,col:"#FFC24D"},
        {r:W*0.12,a:0.48,spd:-0.020,w:2.6,col:"#F4D06F"},
        {r:W*0.19,a:0.28,spd:0.014,w:1.8,col:"#D4AF37"},
        {r:W*0.28,a:0.14,spd:-0.009,w:1.4,col:"#FFC24D"},
        {r:W*0.40,a:0.08,spd:0.006,w:1.1,col:"#D4AF37"},
        {r:W*0.55,a:0.045,spd:-0.004,w:0.8,col:"#9333EA"},
        {r:W*0.72,a:0.025,spd:0.003,w:0.6,col:"#7C3AED"},
      ]) {
        const pulse=Math.sin(time*0.85+ring.spd*600)*0.05+1;
        const rr=ring.r*pulse;
        const aInt=Math.round(ring.a*255).toString(16).padStart(2,"0");
        const aLow=Math.round(ring.a*0.10*255).toString(16).padStart(2,"0");
        ctx!.beginPath(); ctx!.arc(scx,scy,rr,0,Math.PI*2);
        const rg=ctx!.createRadialGradient(scx,scy,rr*0.87,scx,scy,rr);
        rg.addColorStop(0,`${ring.col}00`);
        rg.addColorStop(0.65,`${ring.col}${aLow}`);
        rg.addColorStop(0.88,`${ring.col}${aInt}`);
        rg.addColorStop(1,`${ring.col}00`);
        ctx!.strokeStyle=rg as unknown as string;
        ctx!.lineWidth=ring.w; ctx!.stroke();
      }

      // ── volumetric light shafts ──
      for (const shaft of [
        {angDeg:-22,a:0.09,w:W*0.016},{angDeg:14,a:0.07,w:W*0.012},
        {angDeg:-50,a:0.055,w:W*0.009},{angDeg:42,a:0.055,w:W*0.009},
        {angDeg:0,a:0.11,w:W*0.020},
      ]) {
        const ang=(shaft.angDeg*Math.PI)/180, len=H*0.52;
        const ex=scx+Math.cos(ang)*len, ey=scy+Math.sin(ang)*len;
        const shP=Math.sin(time*0.7+shaft.angDeg)*0.2+0.8;
        const sg=ctx!.createLinearGradient(scx,scy,ex,ey);
        sg.addColorStop(0,`rgba(212,175,55,${shaft.a*shP})`);
        sg.addColorStop(0.4,`rgba(212,175,55,${shaft.a*0.35*shP})`);
        sg.addColorStop(1,"rgba(0,0,0,0)");
        ctx!.save();
        const px=Math.cos(ang+Math.PI/2)*shaft.w, py=Math.sin(ang+Math.PI/2)*shaft.w;
        ctx!.beginPath();
        ctx!.moveTo(scx+px,scy+py); ctx!.lineTo(ex+px*0.1,ey+py*0.1);
        ctx!.lineTo(ex-px*0.1,ey-py*0.1); ctx!.lineTo(scx-px,scy-py);
        ctx!.closePath(); ctx!.fillStyle=sg; ctx!.fill(); ctx!.restore();
      }

      // ── stars ──
      for (const s of stars) {
        const layerSpd=s.layer===3?2.0:s.layer===2?1.5:s.layer===1?0.9:0.5;
        const tw=Math.sin(time*layerSpd+s.tw)*0.30+0.70;
        ctx!.beginPath(); ctx!.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx!.fillStyle=s.warm?`rgba(255,222,140,${s.a*tw})`:`rgba(205,218,255,${s.a*tw})`;
        ctx!.fill();
      }

      // ── gold dust ──
      for (const d of dust) {
        d.x+=d.vx; d.y+=d.vy;
        if(d.y>H){d.y=-4;d.x=Math.random()*W;}
        if(d.x<0)d.x=W; if(d.x>W)d.x=0;
        ctx!.beginPath(); ctx!.arc(d.x,d.y,d.r,0,Math.PI*2);
        ctx!.fillStyle=`rgba(212,175,55,${d.a})`; ctx!.fill();
      }

      // ── sparks from Sophia ──
      if(sparks.length<SPARK_MAX && Math.random()<SPARK_RATE){
        const ang=Math.random()*Math.PI*2, spd=Math.random()*1.6+0.3;
        sparks.push({x:scx+(Math.random()-0.5)*W*0.28,y:scy+(Math.random()-0.5)*H*0.055,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd*0.4,life:0,max:Math.random()*90+55});
      }
      for(let i=sparks.length-1;i>=0;i--){
        const sp=sparks[i]; sp.x+=sp.vx; sp.y+=sp.vy; sp.life++;
        if(sp.life>=sp.max){sparks.splice(i,1);continue;}
        const pr=sp.life/sp.max, al=pr<0.25?pr/0.25:(1-pr)/0.75;
        ctx!.beginPath(); ctx!.arc(sp.x,sp.y,1.4,0,Math.PI*2);
        ctx!.fillStyle=`rgba(255,194,77,${al*0.82})`; ctx!.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    init();
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, isTablet]);

  // Mobile: no canvas — pure CSS bg
  if (isMobile) return null;

  return (
    <canvas ref={canvasRef} style={{
      position:"fixed", inset:0, width:"100%", height:"100%",
      pointerEvents:"none", zIndex:0,
    }} />
  );
}

// ─── SOPHIA LIGHT RAYS ───────────────────────────────────────────────────────
function SophiaLightRays({ size, reduced }: { size: number; reduced?: boolean }) {
  const svgSize = size * (reduced ? 4.0 : 5.0);
  const cx = svgSize / 2;
  const numLong = reduced ? 12 : 16;
  const longRays = Array.from({length: numLong}, (_, i) => {
    const ang = (i / numLong) * Math.PI * 2;
    const inner = size * 0.55;
    const outer = size * (reduced ? 1.70 : 2.10) + (i%4===0 ? size*0.55 : i%2===0 ? size*0.25 : 0);
    return {
      x1:cx+Math.cos(ang)*inner, y1:cx+Math.sin(ang)*inner,
      x2:cx+Math.cos(ang)*outer, y2:cx+Math.sin(ang)*outer,
      opacity:i%4===0?0.30:i%2===0?0.18:0.10, width:i%4===0?2.8:1.4,
    };
  });
  const shortRays = reduced ? [] : Array.from({length:20},(_, i) => {
    const ang=(i/20)*Math.PI*2, inner=size*0.52, outer=size*1.15;
    return {x1:cx+Math.cos(ang)*inner,y1:cx+Math.sin(ang)*inner,x2:cx+Math.cos(ang)*outer,y2:cx+Math.sin(ang)*outer};
  });
  const hexH=size*1.1547, offsetX=-(svgSize-size)/2, offsetY=-(svgSize-hexH)/2;

  return (
    <>
      <svg className="sophia-rays"
        style={{position:"absolute",left:offsetX,top:offsetY,zIndex:1}}
        width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}
      >
        <defs>
          <filter id="rayGlow2">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cx} r={size*0.68} fill="none"
          stroke="rgba(255,194,77,0.20)" strokeWidth={size*0.09} filter="url(#rayGlow2)"/>
        {longRays.map((r,i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
            stroke="#FFC24D" strokeWidth={r.width} opacity={r.opacity} filter="url(#rayGlow2)"/>
        ))}
      </svg>
      {!reduced && (
        <svg className="sophia-rays-inner"
          style={{position:"absolute",left:offsetX,top:offsetY,zIndex:1}}
          width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}
        >
          {shortRays.map((r,i) => (
            <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="#F4D06F" strokeWidth={1.0} opacity={0.10}/>
          ))}
        </svg>
      )}
    </>
  );
}

// ─── SOPHIA ORBIT PARTICLES ──────────────────────────────────────────────────
// CSS-only orbiting — zero RAF overhead
function SophiaOrbitParticles({ size, reduced }: { size: number; reduced?: boolean }) {
  const hexH  = size * 1.1547;
  const cx    = size / 2;
  const cy    = hexH / 2;

  // Orbit rings: radius, num particles, speed, color
  const orbits = reduced ? [
    { r: size*0.78, n:6,  dur:14, col:"#FFC24D", dotR:3.5 },
    { r: size*1.02, n:8,  dur:22, col:"#F4D06F", dotR:2.2 },
    { r: size*1.30, n:5,  dur:34, col:"#D4AF37", dotR:1.8 },
  ] : [
    { r: size*0.72, n:8,  dur:11, col:"#FFC24D", dotR:4.0 },
    { r: size*0.94, n:12, dur:18, col:"#F4D06F", dotR:2.8 },
    { r: size*1.18, n:10, dur:28, col:"#D4AF37", dotR:2.2 },
    { r: size*1.46, n:7,  dur:44, col:"#9333EA", dotR:1.6 },
    { r: size*1.78, n:5,  dur:68, col:"#7C3AED", dotR:1.2 },
  ];

  return (
    <div style={{position:"absolute",left:0,top:0,width:size,height:hexH,pointerEvents:"none",zIndex:3,overflow:"visible"}}>
      {orbits.map((o, oi) => (
        // Rotating ring container — pure CSS rotation
        <div key={oi} style={{
          position:"absolute",
          left: cx - o.r,
          top:  cy - o.r,
          width:  o.r*2,
          height: o.r*2,
          borderRadius:"50%",
          animation:`${oi%2===0?"orbitCW":"orbitCCW"} ${o.dur}s linear infinite`,
        }}>
          {Array.from({length:o.n},(_,i) => {
            const ang = (i/o.n)*Math.PI*2;
            const px  = o.r + Math.cos(ang)*o.r - o.dotR;
            const py  = o.r + Math.sin(ang)*o.r - o.dotR;
            const bigDot = i % Math.max(2,Math.floor(o.n/3)) === 0;
            return (
              <div key={i} style={{
                position:"absolute",
                left: px, top: py,
                width:  bigDot ? o.dotR*2.4 : o.dotR*2,
                height: bigDot ? o.dotR*2.4 : o.dotR*2,
                borderRadius:"50%",
                background: o.col,
                boxShadow:`0 0 ${o.dotR*4}px ${o.col}cc, 0 0 ${o.dotR*8}px ${o.col}55`,
                opacity: bigDot ? 0.95 : 0.55,
                animation:`orbitDot ${1.2+(i*0.3+oi*0.7)%3.5}s ease-in-out ${(i*0.2)%2}s infinite`,
              }}/>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── SOPHIA RINGS ─────────────────────────────────────────────────────────────
function SophiaRings({ size, reduced }: { size: number; reduced?: boolean }) {
  const svgSize = size * (reduced ? 3.2 : 4.0);
  const cx = svgSize / 2;
  const hexH = size * 1.1547;
  const offsetX = -(svgSize - size) / 2;
  const offsetY = -(svgSize - hexH) / 2;

  const rings = reduced ? [
    {r:size*0.54,stroke:"#FFC24D",opacity:1.00,w:4.0,dur:"9s", dir:1, dash:"0"},
    {r:size*0.66,stroke:"#F4D06F",opacity:0.80,w:2.8,dur:"15s",dir:-1,dash:"6 5"},
    {r:size*0.82,stroke:"#D4AF37",opacity:0.55,w:2.0,dur:"22s",dir:1, dash:"3 8"},
    {r:size*1.00,stroke:"#FFC24D",opacity:0.32,w:1.5,dur:"32s",dir:-1,dash:"0"},
    {r:size*1.20,stroke:"#9333EA",opacity:0.16,w:1.0,dur:"45s",dir:1, dash:"0"},
  ] : [
    {r:size*0.54,stroke:"#FFC24D",opacity:1.00,w:4.2,dur:"8s", dir:1, dash:"0"},
    {r:size*0.64,stroke:"#F4D06F",opacity:0.85,w:3.0,dur:"12s",dir:-1,dash:"8 5"},
    {r:size*0.76,stroke:"#D4AF37",opacity:0.65,w:2.2,dur:"18s",dir:1, dash:"3 8"},
    {r:size*0.90,stroke:"#FFC24D",opacity:0.42,w:1.7,dur:"25s",dir:-1,dash:"0"},
    {r:size*1.08,stroke:"#D4AF37",opacity:0.26,w:1.3,dur:"35s",dir:1, dash:"5 10"},
    {r:size*1.28,stroke:"#9333EA",opacity:0.16,w:1.0,dur:"48s",dir:-1,dash:"0"},
    {r:size*1.52,stroke:"#7C3AED",opacity:0.09,w:0.8,dur:"65s",dir:1, dash:"0"},
    {r:size*1.80,stroke:"#4C1D95",opacity:0.05,w:0.6,dur:"90s",dir:-1,dash:"0"},
  ];

  const dotCount  = reduced ? 20 : 36;
  const outerDots = reduced ? 0  : 20;

  return (
    <svg
      style={{position:"absolute",left:offsetX,top:offsetY,pointerEvents:"none",zIndex:2,overflow:"visible"}}
      width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}
    >
      <defs>
        <radialGradient id="sophiaHaze3" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFC24D" stopOpacity="0.52"/>
          <stop offset="28%"  stopColor="#FFC24D" stopOpacity="0.22"/>
          <stop offset="60%"  stopColor="#D4AF37" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="sophiaInnerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFF8E7" stopOpacity="0.18"/>
          <stop offset="50%"  stopColor="#FFC24D" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#FFC24D" stopOpacity="0"/>
        </radialGradient>
        <filter id="ringBloom3">
          <feGaussianBlur stdDeviation={reduced ? "5" : "7"} result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="dotGlow2">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Core haze */}
      <circle cx={cx} cy={cx} r={size*0.90} fill="url(#sophiaHaze3)" />
      <circle cx={cx} cy={cx} r={size*0.60} fill="url(#sophiaInnerGlow)" />

      {/* Fine lace inner rings */}
      {[size*0.50,size*0.58,size*0.66,size*0.76,size*0.88].slice(0,reduced?3:5).map((r,i) => (
        <circle key={`lc${i}`} cx={cx} cy={cx} r={r}
          fill="none" stroke="#FFC24D" strokeWidth={0.8}
          opacity={0.30-i*0.04} filter="url(#softGlow)"/>
      ))}

      {/* Energy rings — each rotates independently */}
      {rings.map((ring,i) => (
        <g key={i}>
          <animateTransform attributeName="transform" attributeType="XML" type="rotate"
            from={`0 ${cx} ${cx}`} to={`${ring.dir*360} ${cx} ${cx}`}
            dur={ring.dur} repeatCount="indefinite"/>
          <circle cx={cx} cy={cx} r={ring.r}
            fill="none" stroke={ring.stroke} strokeWidth={ring.w}
            strokeDasharray={ring.dash} opacity={ring.opacity} filter="url(#ringBloom3)"/>
          {/* Bright node on each ring */}
          {!reduced && (
            <circle cx={cx + ring.r} cy={cx}
              r={ring.w*1.8} fill={ring.stroke} opacity={ring.opacity*1.5}
              filter="url(#dotGlow2)"/>
          )}
        </g>
      ))}

      {/* Inner halo dots */}
      {Array.from({length:dotCount}).map((_,i) => {
        const ang=(i/dotCount)*Math.PI*2, pr=size*0.80, big=i%3===0;
        return (
          <circle key={`dot${i}`} cx={cx+Math.cos(ang)*pr} cy={cx+Math.sin(ang)*pr}
            r={big?4.8:2.6} fill="#FFC24D" opacity={big?1.0:0.60} filter="url(#dotGlow2)">
            <animate attributeName="opacity"
              values={`${big?1.0:0.60};0.05;${big?1.0:0.60}`}
              dur={`${1.0+(i%8)*0.28}s`} repeatCount="indefinite"/>
          </circle>
        );
      })}

      {/* Outer halo dots */}
      {Array.from({length:outerDots}).map((_,i) => {
        const ang=(i/outerDots)*Math.PI*2, or=size*1.10;
        return (
          <circle key={`od${i}`} cx={cx+Math.cos(ang)*or} cy={cx+Math.sin(ang)*or}
            r={2.2} fill="#D4AF37" opacity={0.40}>
            <animate attributeName="opacity" values="0.40;0.06;0.40"
              dur={`${1.8+(i%6)*0.45}s`} repeatCount="indefinite"/>
          </circle>
        );
      })}
    </svg>
  );
}

// ─── SINGLE HEX CARD ─────────────────────────────────────────────────────────
function HexCard({ product, size, left, top }: { product:Product; size:number; left:number; top:number }) {
  const [, nav] = useLocation();
  const hexH = size * 1.1547;
  const stagger = (left * 0.003 + top * 0.002) % 5;

  return (
    <div
      className={`hex-card${product.memberOnly?" member-glow":""}`}
      style={{ left, top, width:size, height:hexH, zIndex:10, animationDelay:`${stagger}s` }}
      onClick={() => nav(`/products/${product.id}`)}
    >
      {/* Image */}
      <img src={product.image} alt={product.title} style={{
        width:"100%", height:"100%", objectFit:"cover",
        filter:"contrast(1.45) saturate(1.75) brightness(1.08)",
        display:"block",
      }}/>
      {/* Bottom gradient */}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(1,4,16,0.97) 0%,rgba(1,4,16,0.58) 28%,rgba(1,4,16,0.08) 52%,transparent 78%)"}}/>
      {/* Top edge vignette */}
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 0%,rgba(1,4,16,0.08) 0%,transparent 55%)"}}/>
      {/* Glass reflection highlight */}
      <div className="hex-glass"/>
      {/* Sophia connection pulse */}
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 50%,rgba(212,175,55,0.07) 0%,transparent 65%)",animation:"connPulse 4s ease-in-out infinite",animationDelay:`${stagger}s`}}/>
      {/* Border shimmer */}
      <div className="hex-border-shimmer" style={{position:"absolute",inset:-2,clipPath:"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",zIndex:-1}}/>
      {product.memberOnly && (
        <div style={{position:"absolute",top:"19%",left:0,right:0,display:"flex",justifyContent:"center"}}>
          <span className="member-badge">Members Only</span>
        </div>
      )}
      <div style={{position:"absolute",bottom:"11%",left:0,right:0,textAlign:"center",padding:"0 7%"}}>
        <div style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:size>200?"15px":size>160?"13.5px":"12px",
          fontWeight:700,color:"#FFFFFF",
          textShadow:"0 2px 14px rgba(0,0,0,1),0 1px 0 rgba(0,0,0,1),0 0 28px rgba(0,0,0,1)",
          lineHeight:1.15,letterSpacing:"0.01em",
        }}>{product.title}</div>
        <div style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:size>200?"10px":size>160?"9px":"8.5px",
          color:"rgba(255,255,255,0.52)",marginTop:"2px",fontWeight:400,
          textShadow:"0 1px 8px rgba(0,0,0,0.9)",
          letterSpacing:"0.05em",textTransform:"uppercase",
        }}>{product.subtitle}</div>
        <div style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:size>200?"12.5px":size>160?"11px":"10px",
          color:"#FFC24D",marginTop:"5px",fontWeight:700,
          textShadow:"0 0 10px rgba(212,175,55,1),0 0 20px rgba(212,175,55,0.65),0 2px 8px rgba(0,0,0,1)",
        }}>{product.price}</div>
      </div>
    </div>
  );
}

// ─── SOPHIA HEX ──────────────────────────────────────────────────────────────
function SophiaHex({ size, left, top, reduced }: { size:number; left:number; top:number; reduced?:boolean }) {
  const [, nav] = useLocation();
  const hexH  = size * 1.1547;
  const border = size > 320 ? 11 : size > 220 ? 9 : 7;

  return (
    <div className="sophia-wrapper" style={{left, top, width:size, height:hexH}}>
      <SophiaLightRays size={size} reduced={reduced} />
      <SophiaRings size={size} reduced={reduced} />
      <SophiaOrbitParticles size={size} reduced={reduced} />

      <div style={{position:"absolute",inset:-(border+12),zIndex:1,
        clipPath:"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        background:"rgba(255,194,77,0.22)",filter:"blur(8px)"}}/>
      <div style={{position:"absolute",inset:-(border+5),zIndex:1,
        clipPath:"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        background:"rgba(212,175,55,0.35)",filter:"blur(4px)"}}/>
      <div style={{position:"absolute",inset:-border,zIndex:2,
        clipPath:"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        background:"linear-gradient(135deg,#FFF8E7 0%,#FFC24D 18%,#F4D06F 36%,#FFFDE0 50%,#D4AF37 66%,#FFC24D 82%,#FFF8E7 100%)"}}/>

      <div className="hex-sophia-clip" style={{zIndex:3}} onClick={()=>nav("/products/sophia-ai")}>
        <img src="/assets/prod-sophia-portrait.png" alt="Sophia AI" style={{
          width:"100%",height:"100%",objectFit:"cover",
          objectPosition:"center 12%",
          filter:"contrast(1.38) saturate(1.40) brightness(1.10)",
          display:"block",
        }}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(1,4,16,0.85) 0%,rgba(1,4,16,0.18) 28%,rgba(1,4,16,0.04) 46%,transparent 64%)"}}/>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 0%,rgba(212,175,55,0.04) 0%,transparent 55%)"}}/>
        <div style={{position:"absolute",bottom:"11%",left:0,right:0,textAlign:"center",padding:"0 8%"}}>
          <div style={{
            fontFamily:"'Playfair Display',serif",
            fontSize:size>330?"22px":size>220?"17px":"14px",
            fontWeight:700,color:"#FFC24D",
            textShadow:"0 0 22px #D4AF37ee,0 0 50px #FFC24Daa,0 1px 0 rgba(0,0,0,0.9)",
            letterSpacing:"0.05em",
          }}>Sophia AI</div>
          <div style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:size>330?"12px":size>220?"10.5px":"9.5px",
            color:"#F4D06F",marginTop:"4px",
            letterSpacing:"0.10em",textTransform:"uppercase",
            textShadow:"0 0 14px rgba(212,175,55,0.8),0 0 30px rgba(212,175,55,0.4)",
            fontWeight:600,
          }}>Emotional Companion</div>
        </div>
      </div>
    </div>
  );
}

// ─── DESKTOP LAYOUT ───────────────────────────────────────────────────────────
function DesktopHoneycomb({ vw }: { vw: number }) {
  const budget     = vw - 80;
  const sophiaScale = 1.82;
  let hexSize = Math.min(Math.floor((budget - 4*38)/(4+sophiaScale)), 232);
  hexSize = Math.max(hexSize, 160);
  const hexH       = hexSize * 1.1547;
  const sophiaSize = Math.round(hexSize * sophiaScale);
  const sophiaH    = sophiaSize * 1.1547;
  const gap        = Math.max(20, Math.min(38, Math.floor((budget - sophiaSize - 4*hexSize)/4)));
  const gridW      = sophiaSize + 4*hexSize + 4*gap;

  const s = ALL_PRODUCTS.filter(p => !p.isSophia);
  const row0TotalW = 4*hexSize+3*gap, row0X=(gridW-row0TotalW)/2, row0Y=20;
  const sophiaX=gridW/2-sophiaSize/2, sophiaY=row0Y+hexH+gap*1.6;
  const sophiaMidY=sophiaY+sophiaH/2, flankerY=sophiaMidY-hexH/2;
  const fl1X=sophiaX-gap-hexSize, fl2X=fl1X-gap-hexSize;
  const fr1X=sophiaX+sophiaSize+gap, fr2X=fr1X+hexSize+gap;
  const row2TotalW=4*hexSize+3*gap, row2X=(gridW-row2TotalW)/2;
  const row2Y=sophiaY+sophiaH+gap*1.6;
  const row3Y=row2Y+hexH+gap*1.2, row3X=gridW/2-hexSize/2;
  const gridH=row3Y+hexH+80;

  return (
    <div style={{position:"relative",width:gridW,height:gridH,margin:"0 auto",overflow:"visible"}}>
      {s.slice(0,4).map((p,i)=><HexCard key={p.id} product={p} size={hexSize} left={row0X+i*(hexSize+gap)} top={row0Y}/>)}
      <HexCard key={s[4].id} product={s[4]} size={hexSize} left={fl2X} top={flankerY}/>
      <HexCard key={s[5].id} product={s[5]} size={hexSize} left={fl1X} top={flankerY}/>
      <SophiaHex size={sophiaSize} left={sophiaX} top={sophiaY}/>
      <HexCard key={s[6].id} product={s[6]} size={hexSize} left={fr1X} top={flankerY}/>
      <HexCard key={s[7].id} product={s[7]} size={hexSize} left={fr2X} top={flankerY}/>
      {s.slice(8,12).map((p,i)=><HexCard key={p.id} product={p} size={hexSize} left={row2X+i*(hexSize+gap)} top={row2Y}/>)}
      <HexCard key={s[12].id} product={s[12]} size={hexSize} left={row3X} top={row3Y}/>
    </div>
  );
}

// ─── TABLET LAYOUT ────────────────────────────────────────────────────────────
function TabletHoneycomb() {
  const hexSize=178, hexH=hexSize*1.1547, sophiaScale=1.72;
  const sophiaSize=Math.round(hexSize*sophiaScale), sophiaH=sophiaSize*1.1547;
  const gap=26, gridW=840;
  const s=ALL_PRODUCTS.filter(p=>!p.isSophia);
  const row3W=3*hexSize+2*gap, rowX=(gridW-row3W)/2, row0Y=16;
  const sophiaX=gridW/2-sophiaSize/2, sophiaY=row0Y+hexH+gap*1.5;
  const sophiaMidY=sophiaY+sophiaH/2, flankerY=sophiaMidY-hexH/2;
  const fl1X=sophiaX-gap-hexSize, fr1X=sophiaX+sophiaSize+gap;
  const row2Y=sophiaY+sophiaH+gap*1.5, row3Y=row2Y+hexH+gap;
  const row4W=2*hexSize+gap, row4X=(gridW-row4W)/2, row4Y=row3Y+hexH+gap;
  const gridH=row4Y+hexH+60;

  return (
    <div style={{position:"relative",width:gridW,height:gridH,margin:"0 auto",overflow:"visible"}}>
      {s.slice(0,3).map((p,i)=><HexCard key={p.id} product={p} size={hexSize} left={rowX+i*(hexSize+gap)} top={row0Y}/>)}
      <HexCard key={s[3].id} product={s[3]} size={hexSize} left={fl1X} top={flankerY}/>
      <SophiaHex size={sophiaSize} left={sophiaX} top={sophiaY} reduced/>
      <HexCard key={s[4].id} product={s[4]} size={hexSize} left={fr1X} top={flankerY}/>
      {s.slice(5,8).map((p,i)=><HexCard key={p.id} product={p} size={hexSize} left={rowX+i*(hexSize+gap)} top={row2Y}/>)}
      {s.slice(8,11).map((p,i)=><HexCard key={p.id} product={p} size={hexSize} left={rowX+i*(hexSize+gap)} top={row3Y}/>)}
      <HexCard key={s[11].id} product={s[11]} size={hexSize} left={row4X} top={row4Y}/>
      <HexCard key={s[12].id} product={s[12]} size={hexSize} left={row4X+hexSize+gap} top={row4Y}/>
    </div>
  );
}

// ─── MOBILE LAYOUT — no canvas, CSS bg only ───────────────────────────────────
function MobileLayout() {
  const [, nav] = useLocation();
  const hexSize=155, hexH=hexSize*1.1547;
  const sophiaSize=Math.round(hexSize*1.55), sophiaH=sophiaSize*1.1547;
  const surround=ALL_PRODUCTS.filter(p=>!p.isSophia);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,padding:"0 12px 60px"}}>
      <div style={{position:"relative",width:sophiaSize,height:sophiaH,flexShrink:0,marginBottom:12}}>
        <SophiaHex size={sophiaSize} left={0} top={0} reduced/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(2,${hexSize}px)`,gap:"20px",justifyContent:"center"}}>
        {surround.map(p => (
          <div key={p.id}
            className={`hex-card${p.memberOnly?" member-glow":""}`}
            style={{width:hexSize,height:hexH,position:"relative"}}
            onClick={()=>nav(`/products/${p.id}`)}
          >
            <img src={p.image} alt={p.title} style={{
              width:"100%",height:"100%",objectFit:"cover",
              filter:"contrast(1.42) saturate(1.70) brightness(1.10)",display:"block",
            }}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(1,4,16,0.96) 0%,rgba(1,4,16,0.45) 38%,transparent 65%)"}}/>
            <div className="hex-border-shimmer" style={{position:"absolute",inset:-2,clipPath:"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",zIndex:-1}}/>
            {p.memberOnly && (
              <div style={{position:"absolute",top:"20%",left:0,right:0,display:"flex",justifyContent:"center"}}>
                <span className="member-badge">Members Only</span>
              </div>
            )}
            <div style={{position:"absolute",bottom:"14%",left:0,right:0,textAlign:"center",padding:"0 8%"}}>
              <div style={{fontSize:"12px",fontWeight:700,color:"#FFF",textShadow:"0 2px 10px rgba(0,0,0,1),0 1px 0 rgba(0,0,0,0.9),0 0 20px rgba(0,0,0,0.9)",lineHeight:1.2}}>{p.title}</div>
              <div style={{fontSize:"10.5px",color:"#FFC24D",marginTop:"4px",fontWeight:700,textShadow:"0 0 8px rgba(212,175,55,0.95),0 0 18px rgba(212,175,55,0.55),0 2px 6px rgba(0,0,0,0.95)"}}>{p.price}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FLOATING PARTICLES — desktop only ───────────────────────────────────────
function FloatingParticles({ show }: { show: boolean }) {
  if (!show) return null;
  // 3 large atmospheric drift blobs
  const blobs = [
    { left:"18%", top:"25%", w:340, h:220, color:"rgba(212,175,55,0.06)", anim:"atmDrift1 28s ease-in-out infinite" },
    { left:"62%", top:"55%", w:280, h:180, color:"rgba(255,194,77,0.05)", anim:"atmDrift2 22s ease-in-out 4s infinite" },
    { left:"38%", top:"72%", w:400, h:160, color:"rgba(180,140,40,0.04)",  anim:"atmDrift3 34s ease-in-out 10s infinite" },
  ];
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1,overflow:"hidden"}}>
      {/* Atmospheric drift blobs */}
      {blobs.map((b,i)=>(
        <div key={`blob-${i}`} style={{
          position:"absolute",left:b.left,top:b.top,
          width:b.w,height:b.h,borderRadius:"50%",
          background:`radial-gradient(ellipse at 50% 50%,${b.color} 0%,transparent 70%)`,
          filter:"blur(32px)",
          animation:b.anim,
        }}/>
      ))}
      {/* Gold star particles */}
      {Array.from({length:32},(_,i) => {
        const left=(i*31.7+7)%100, delay=(i*1.13)%9;
        const dur=6+(i*0.77)%8, size=1.2+(i%4)*0.7, top=15+(i*27.3)%78;
        return (
          <div key={i} style={{
            position:"absolute",left:`${left}%`,top:`${top}%`,
            width:size,height:size,borderRadius:"50%",
            background:i%3===0?"#FFC24D":i%3===1?"#D4AF37":"#F4D06F",
            boxShadow:`0 0 ${size*3}px rgba(212,175,55,0.8)`,
            opacity:0,animation:`floatUp ${dur}s ease-out ${delay}s infinite`,
          }}/>
        );
      })}
    </div>
  );
}

// ─── MOBILE CSS BACKGROUND (replaces canvas) ─────────────────────────────────
function MobileBg() {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
      background:`
        radial-gradient(ellipse 80% 40% at 50% 0%, rgba(88,38,200,0.28) 0%, transparent 70%),
        radial-gradient(ellipse 60% 30% at 20% 30%, rgba(64,22,160,0.18) 0%, transparent 70%),
        radial-gradient(ellipse 50% 25% at 80% 40%, rgba(48,28,175,0.15) 0%, transparent 70%),
        radial-gradient(ellipse 90% 35% at 50% 55%, rgba(212,175,55,0.025) 0%, transparent 70%),
        radial-gradient(ellipse 40% 20% at 50% 8%,  rgba(212,175,55,0.045) 0%, transparent 70%),
        linear-gradient(180deg, #010510 0%, #030A1C 15%, #02081A 35%, #020816 60%, #020710 85%, #010408 100%)
      `,
    }}/>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [activeCat, setActiveCat] = useState("All");
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  const [, nav] = useLocation();
  const { data: session } = useSession();
  const handleSignOut = async () => { await signOut(); clearToken(); nav("/"); };

  useEffect(() => {
    // Debounced resize
    let t: ReturnType<typeof setTimeout>;
    const fn = () => { clearTimeout(t); t = setTimeout(() => setVw(window.innerWidth), 150); };
    window.addEventListener("resize", fn);
    return () => { window.removeEventListener("resize", fn); clearTimeout(t); };
  }, []);

  const isDesktop = vw >= 1100;
  const isTablet  = vw >= 700 && vw < 1100;
  const isMobile  = vw < 700;
  const titleSize = isDesktop
    ? "clamp(96px,9.8vw,148px)"
    : isTablet ? "clamp(70px,9.0vw,104px)"
    : "clamp(44px,11vw,66px)";

  return (
    <div className="gm-root">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* Background — canvas for desktop/tablet, CSS-only for mobile */}
      {isMobile
        ? <MobileBg />
        : <GalaxyCanvas isMobile={isMobile} isTablet={isTablet} />
      }
      <FloatingParticles show={isDesktop} />

      <div style={{position:"relative",zIndex:10}}>

        {/* NAV */}
        <nav style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:isDesktop?"26px 60px":"18px 22px",
          borderBottom:"1px solid rgba(212,175,55,0.14)",
          backdropFilter:"blur(18px)",background:"rgba(1,4,16,0.60)",
          boxShadow:"0 1px 40px rgba(0,0,0,0.5)",
        }}>
          <button onClick={()=>nav("/")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center"}}>
            <GhaafeediLogo variant="page" />
          </button>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {session?.user && (
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:"rgba(255,255,255,0.45)",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {session.user.name || session.user.email}
              </span>
            )}
            <button onClick={()=>nav("/")} style={{
              background:"rgba(212,175,55,0.08)",border:"1px solid rgba(212,175,55,0.35)",
              color:"#D4AF37",padding:"10px 22px",borderRadius:24,cursor:"pointer",
              fontSize:13,fontWeight:500,fontFamily:"'Inter',sans-serif",
              letterSpacing:"0.05em",textTransform:"uppercase",backdropFilter:"blur(8px)",
            }}>← Back</button>
            {session?.user ? (
              <button onClick={handleSignOut} style={{
                background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.18)",
                color:"rgba(255,255,255,0.65)",padding:"10px 20px",borderRadius:24,cursor:"pointer",
                fontSize:13,fontWeight:500,fontFamily:"'Inter',sans-serif",
                letterSpacing:"0.05em",textTransform:"uppercase",backdropFilter:"blur(8px)",
              }}>Sign Out</button>
            ) : (
              <button onClick={()=>nav("/signin")} style={{
                background:"rgba(212,175,55,0.08)",border:"1px solid rgba(212,175,55,0.35)",
                color:"#D4AF37",padding:"10px 20px",borderRadius:24,cursor:"pointer",
                fontSize:13,fontWeight:500,fontFamily:"'Inter',sans-serif",
                letterSpacing:"0.05em",textTransform:"uppercase",backdropFilter:"blur(8px)",
              }}>Sign In</button>
            )}
          </div>
        </nav>

        {/* HERO */}
        <div style={{textAlign:"center",padding:isDesktop?"80px 40px 40px":isTablet?"56px 28px 30px":"28px 18px 16px"}}>
          <div style={{
            display:"inline-flex",alignItems:"center",gap:10,
            background:"rgba(212,175,55,0.08)",border:"1px solid rgba(212,175,55,0.26)",
            padding:"7px 20px",borderRadius:22,marginBottom:24,
            backdropFilter:"blur(10px)",boxShadow:"0 0 24px rgba(212,175,55,0.15)",
          }}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#FFC24D",boxShadow:"0 0 12px #FFC24D,0 0 24px #FFC24D66",display:"inline-block"}}/>
            <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:600,color:"#D4AF37",letterSpacing:"0.14em",textTransform:"uppercase"}}>Memory Nexus · 15 Experiences</span>
          </div>
          <h1 className="gm-title" style={{fontSize:titleSize,margin:"0 0 16px"}}>Memory Nexus</h1>
          <p style={{
            fontFamily:"'Inter',sans-serif",fontSize:isDesktop?"17px":"14px",
            color:"rgba(255,255,255,0.58)",maxWidth:560,margin:"0 auto 16px",
            lineHeight:1.70,fontWeight:300,textShadow:"0 1px 12px rgba(0,0,0,0.8)",
          }}>
            Select your experience. Each creation is a unique emotional artifact,
            crafted by AI, powered by your story.
          </p>
        </div>

        {/* FILTER PILLS */}
        <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",padding:isDesktop?"0 40px 56px":"0 18px 36px"}}>
          {CATEGORIES.map(c => (
            <button key={c} className={`filter-pill${activeCat===c?" active":""}`} onClick={()=>setActiveCat(c)}>{c}</button>
          ))}
        </div>

        {/* HONEYCOMB */}
        <div style={{width:"100%",boxSizing:"border-box",padding:isDesktop?"0 20px 100px":isTablet?"0 16px 72px":"0 0 52px",overflow:"visible"}}>
          {isDesktop && <DesktopHoneycomb vw={vw} />}
          {isTablet  && <TabletHoneycomb />}
          {isMobile  && <MobileLayout />}
        </div>

        {/* BOTTOM CTA */}
        <div style={{textAlign:"center",padding:isDesktop?"18px 40px 80px":"16px 22px 58px",borderTop:"1px solid rgba(212,175,55,0.12)"}}>
          <p style={{fontFamily:"'Inter',sans-serif",fontSize:14,color:"rgba(255,255,255,0.40)",marginBottom:20,textShadow:"0 1px 8px rgba(0,0,0,0.8)"}}>
            Members unlock exclusive experiences. Start your journey today.
          </p>
          <button onClick={()=>nav("/onboarding")} style={{
            padding:"18px 60px",borderRadius:32,
            background:"linear-gradient(135deg,#B8860B 0%,#D4AF37 25%,#FFC24D 50%,#F4D06F 68%,#FFC24D 82%,#D4AF37 100%)",
            color:"#020817",border:"none",cursor:"pointer",
            fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:800,
            letterSpacing:"0.10em",textTransform:"uppercase",
            boxShadow:"0 6px 28px rgba(212,175,55,0.60),0 0 50px rgba(212,175,55,0.28),0 2px 0 rgba(255,255,255,0.12) inset,0 -1px 0 rgba(0,0,0,0.3) inset",
            transition:"all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
            position:"relative",
          }}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform="translateY(-4px) scale(1.04)";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 16px 52px rgba(212,175,55,0.75),0 0 80px rgba(212,175,55,0.40),0 2px 0 rgba(255,255,255,0.15) inset,0 -1px 0 rgba(0,0,0,0.3) inset"}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform="translateY(0) scale(1)";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 6px 28px rgba(212,175,55,0.60),0 0 50px rgba(212,175,55,0.28),0 2px 0 rgba(255,255,255,0.12) inset,0 -1px 0 rgba(0,0,0,0.3) inset"}}
          >✦ Begin My Journey ✦</button>
        </div>
      </div>
    </div>
  );
}
