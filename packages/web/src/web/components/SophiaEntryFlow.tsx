/**
 * GHAAFEEDI MUSIC — SOPHIA ENTRY FLOW  (Simli lip-sync + ElevenLabs TTS)
 * ══════════════════════════════════════════════════════════════════════════
 * Sophia-guided Q&A with real-time lip-synced video (Simli WebRTC)
 * and ElevenLabs TTS narration.
 *
 * Flow:
 *   Step 0 — Sophia intro (typewriter + lip sync)
 *   Step 1 — Q: What brings you here today? (4 options)
 *   Step 2 — Q: Who is this for? (4 options)
 *   Step 3 — Q: What matters most? (4 options)
 *   Step 4 — Personalized summary → "Enter Ghaafeedi Music" CTA
 *
 * Simli: WebRTC livekit transport, Sophia custom face 9c402979-2e74-47f5-a4ed-ae235b092dc9 (fallback: Zahra afdb6a3e)
 * TTS:   ElevenLabs PCM16 via /api/simli/tts, sendAudioData → Simli
 * Fallback: static portrait + breathing if Simli WebRTC unavailable
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD   = "#D4AF37";
const GOLD2  = "#F4D06F";
const BG     = "#050B1A";
const TEXT   = "#FFFFFF";
const BORDER = "rgba(212,175,55,0.18)";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const INJECT_CSS = `
@keyframes sef-portrait-glow {
  0%,100% { box-shadow: 0 0 0 1.5px rgba(212,175,55,.28), 0 0 40px rgba(212,175,55,.12); }
  50%      { box-shadow: 0 0 0 1.5px rgba(212,175,55,.55), 0 0 64px rgba(212,175,55,.26); }
}
@keyframes sef-ring {
  0%,100% { transform: translate(-50%,-50%) scale(0.88); opacity:.22; }
  50%      { transform: translate(-50%,-50%) scale(1.30); opacity:.05; }
}
@keyframes sef-star {
  0%,100% { opacity:.10; transform:scale(1);   }
  50%      { opacity:.50; transform:scale(1.7); }
}
@keyframes sef-float {
  0%,100% { transform:translateY(0) translateX(0);        }
  40%      { transform:translateY(-12px) translateX(4px); }
  70%      { transform:translateY(-4px) translateX(-5px); }
}
@keyframes sef-cursor {
  0%,100% { opacity:1; }
  50%      { opacity:0; }
}
@keyframes sef-pulse-btn {
  0%,100% { box-shadow:0 0 28px rgba(212,175,55,.22),0 4px 20px rgba(0,0,0,.55); }
  50%      { box-shadow:0 0 48px rgba(212,175,55,.48),0 4px 28px rgba(0,0,0,.65); }
}
@keyframes sef-bar-wave {
  0%,100% { height:8px;  }
  50%      { height:18px; }
}
@keyframes sef-opt-in {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0);    }
}
@keyframes sef-video-glow {
  0%,100% { box-shadow: 0 0 0 1.5px rgba(212,175,55,.28), 0 0 40px rgba(212,175,55,.12), inset 0 0 30px rgba(212,175,55,.04); }
  50%      { box-shadow: 0 0 0 1.5px rgba(212,175,55,.65), 0 0 72px rgba(212,175,55,.30), inset 0 0 40px rgba(212,175,55,.08); }
}
@keyframes sef-simli-speaking {
  0%,100% { box-shadow: 0 0 0 2px rgba(212,175,55,.55), 0 0 50px rgba(212,175,55,.28); }
  50%      { box-shadow: 0 0 0 3px rgba(212,175,55,.85), 0 0 80px rgba(212,175,55,.50); }
}
@keyframes sef-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes sef-breathe {
  0%,100% { transform:scale(1.00); }
  50%      { transform:scale(1.02); }
}
.sef-opt {
  width:100%;
  padding:clamp(12px,1.7vw,17px) clamp(16px,2.2vw,24px);
  background:rgba(255,255,255,.034);
  border:1.5px solid rgba(212,175,55,.20);
  border-radius:12px;
  cursor:pointer;
  text-align:left;
  transition:background 170ms, border-color 170ms, transform 130ms, box-shadow 170ms;
  display:flex;
  align-items:center;
  gap:12px;
  font-family:Inter,sans-serif;
  font-size:clamp(13px,1.38vw,15px);
  font-weight:500;
  color:rgba(255,255,255,.85);
}
.sef-opt:hover {
  background:rgba(212,175,55,.10);
  border-color:rgba(212,175,55,.55);
  transform:translateY(-2px);
  box-shadow:0 4px 22px rgba(212,175,55,.12);
  color:#fff;
}
.sef-opt.sel {
  background:rgba(212,175,55,.14);
  border-color:rgba(212,175,55,.68);
  color:${GOLD2};
  box-shadow:0 0 0 1px rgba(212,175,55,.28),0 4px 26px rgba(212,175,55,.16);
}
`;

// ─── Seeded background elements ───────────────────────────────────────────────
const STARS = Array.from({ length: 55 }, (_, i) => ({
  x: ((i * 137.508 + 31) % 100),
  y: ((i * 73.211  + 17) % 100),
  r: 0.7 + ((i * 11.3) % 1.4),
  delay: ((i * 0.31) % 4.5).toFixed(2),
  dur: (2.4 + ((i * 0.19) % 2.6)).toFixed(2),
  gold: i % 7 === 0,
}));
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: 8 + ((i * 83.7 + 11) % 84),
  y: 6 + ((i * 61.3 + 29) % 88),
  r: 1.0 + ((i * 7.3) % 2.0),
  delay: ((i * 0.43) % 6).toFixed(2),
  dur: (5 + ((i * 0.31) % 6)).toFixed(2),
  op: (0.06 + ((i * 0.03) % 0.18)).toFixed(3),
  gold: i % 3 === 0,
}));

// ─── Q&A script ──────────────────────────────────────────────────────────────
type OptionKey = string;
interface Option { key: OptionKey; icon: string; label: string; sub: string }
interface Step { id: number; line: string; opts?: Option[] }

const STEPS: Step[] = [
  {
    id: 0,
    line: "Hi, I'm Sophia — your AI Emotional Concierge at Ghaafeedi Music. Before you explore, let me take 30 seconds to understand you. I'll show you exactly what's possible for your story.",
  },
  {
    id: 1,
    line: "What brings you to Ghaafeedi Music today?",
    opts: [
      { key: "preserve",  icon: "🎞️", label: "Preserve a memory or moment",      sub: "Someone or something I never want to forget" },
      { key: "celebrate", icon: "✨", label: "Celebrate a person or milestone",   sub: "Birthday, anniversary, graduation, reunion" },
      { key: "heal",      icon: "💛", label: "Process loss or heal emotionally",  sub: "Grief, breakup, life transition" },
      { key: "legacy",    icon: "🏛️", label: "Create a lasting legacy",           sub: "For my family, children, or future generations" },
    ],
  },
  {
    id: 2,
    line: "Who is this story for?",
    opts: [
      { key: "me",      icon: "🙋",   label: "For myself",                   sub: "My own healing or reflection" },
      { key: "partner", icon: "💑",   label: "For a partner or spouse",       sub: "Romance, wedding, relationship milestone" },
      { key: "family",  icon: "👨‍👩‍👧", label: "For family",                   sub: "Parents, children, grandparents" },
      { key: "gift",    icon: "🎁",   label: "As a gift for someone special", sub: "A meaningful, one-of-a-kind present" },
    ],
  },
  {
    id: 3,
    line: "What matters most to you in this experience?",
    opts: [
      { key: "song",   icon: "🎵", label: "A cinematic song in my voice or style", sub: "Original music built from my story" },
      { key: "film",   icon: "🎬", label: "A full cinematic film or video",         sub: "Visual storytelling with narration" },
      { key: "both",   icon: "🌟", label: "Both — the full experience",             sub: "Song + film together" },
      { key: "unsure", icon: "🤔", label: "I'm not sure yet — show me everything",  sub: "Let Sophia guide me" },
    ],
  },
];

function buildSummary(a: Record<number, OptionKey>): string {
  const whyMap: Record<string, string> = {
    preserve:  "preserve a memory that means everything to you",
    celebrate: "celebrate someone or a milestone that deserves to be remembered forever",
    heal:      "process something deeply personal and find healing through it",
    legacy:    "build a legacy that will outlive us all",
  };
  const whoMap: Record<string, string> = {
    me:      "for yourself",
    partner: "for the person you love",
    family:  "for your family",
    gift:    "as a gift for someone who deserves it",
  };
  const whatMap: Record<string, string> = {
    song:   "and I know a cinematic song will carry that emotion perfectly.",
    film:   "and a full cinematic film will bring that story to life visually.",
    both:   "and the full Ghaafeedi experience — song and film — is made for exactly this.",
    unsure: "I'll walk you through everything once you're inside.",
  };
  const why  = whyMap[a[1]] ?? "create something meaningful";
  const who  = whoMap[a[2]] ?? "for someone who matters";
  const what = whatMap[a[3]] ?? "Let's find the perfect experience together.";
  return `You're here to ${why} — ${who} — ${what} This is exactly what Ghaafeedi Music was built for. Let's create something extraordinary.`;
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 26) {
  const [out, setOut]   = useState("");
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOut("");
    setDone(false);
    let i = 0;
    const tick = () => {
      i++;
      setOut(text.slice(0, i));
      if (i < text.length) {
        const ch = text[i];
        const pause = [".","!","?"].includes(ch) ? speed*8 : ch === "," ? speed*4 : speed;
        timer.current = setTimeout(tick, pause);
      } else {
        setDone(true);
      }
    };
    timer.current = setTimeout(tick, speed);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [text]);

  return { out, done };
}

// ─── StarField ────────────────────────────────────────────────────────────────
function StarField() {
  return (
    <>
      <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none" }}>
        {STARS.map((s, i) => (
          <div key={i} style={{
            position:"absolute", left:`${s.x}%`, top:`${s.y}%`,
            width:s.r*2, height:s.r*2, borderRadius:"50%",
            background: s.gold ? "rgba(212,175,55,0.78)" : "rgba(255,255,255,0.70)",
            animation:`sef-star ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
        ))}
      </div>
      <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none" }}>
        {PARTICLES.map((p, i) => (
          <div key={i} style={{
            position:"absolute", left:`${p.x}%`, top:`${p.y}%`,
            width:p.r*2, height:p.r*2, borderRadius:"50%",
            background: p.gold ? `rgba(212,175,55,${p.op})` : `rgba(255,255,255,${p.op})`,
            animation:`sef-float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }} />
        ))}
      </div>
    </>
  );
}

// ─── Simli lip-sync avatar ────────────────────────────────────────────────────
type SimliStatus = "idle" | "connecting" | "ready" | "speaking" | "error";

interface SimliAvatarProps {
  sessionToken: string | null;
  audioData: Uint8Array | null;    // queued PCM16 chunk to send
  onSpeakingChange: (speaking: boolean) => void;
  onReady: () => void;
  onError: () => void;
  onAudioConsumed: () => void;     // called after sendAudioData
}

function SimliAvatar({
  sessionToken,
  audioData,
  onSpeakingChange,
  onReady,
  onError,
  onAudioConsumed,
}: SimliAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  const [status, setStatus] = useState<SimliStatus>("idle");
  const [speaking, setSpeaking] = useState(false);
  const startedRef = useRef(false);

  // Init SimliClient when sessionToken arrives
  useEffect(() => {
    if (!sessionToken || startedRef.current) return;
    if (!videoRef.current || !audioRef.current) return;
    startedRef.current = true;
    setStatus("connecting");

    let cancelled = false;

    (async () => {
      try {
        const { SimliClient } = await import("simli-client");
        const client = new SimliClient(
          sessionToken,
          videoRef.current!,
          audioRef.current!,
          null, // iceServers — null = use Simli defaults
          undefined, // logLevel
          "livekit", // transport
        );
        clientRef.current = client;

        client.on("start", () => {
          if (cancelled) return;
          setStatus("ready");
          onReady();
        });
        client.on("speaking", () => {
          if (cancelled) return;
          setSpeaking(true);
          onSpeakingChange(true);
        });
        client.on("silent", () => {
          if (cancelled) return;
          setSpeaking(false);
          onSpeakingChange(false);
        });
        client.on("error", (detail: string) => {
          if (cancelled) return;
          console.error("[Simli] error:", detail);
          setStatus("error");
          onError();
        });
        client.on("startup_error", (msg: string) => {
          if (cancelled) return;
          console.error("[Simli] startup_error:", msg);
          setStatus("error");
          onError();
        });

        await client.start();
      } catch (err) {
        if (!cancelled) {
          console.error("[Simli] init failed:", err);
          setStatus("error");
          onError();
        }
      }
    })();

    return () => {
      cancelled = true;
      clientRef.current?.stop().catch(() => {});
    };
  }, [sessionToken]);

  // Send audio whenever new chunk arrives
  useEffect(() => {
    if (!audioData || !clientRef.current || status !== "ready") return;
    try {
      clientRef.current.sendAudioData(audioData);
    } catch (err) {
      console.warn("[Simli] sendAudioData error:", err);
    }
    onAudioConsumed();
  }, [audioData, status]);

  const isLoading = status === "idle" || status === "connecting";

  return (
    <div style={{
      position:"relative",
      width:"clamp(90px,12vw,140px)",
      height:"clamp(140px,19vw,220px)",
      flexShrink:0,
      borderRadius:14,
      overflow:"hidden",
    }}>
      {/* Glow ring */}
      <div style={{
        position:"absolute", inset:-3, borderRadius:17, zIndex:0,
        background:"transparent",
        border: speaking
          ? "2px solid rgba(212,175,55,0.85)"
          : "1.5px solid rgba(212,175,55,0.28)",
        animation: speaking
          ? "sef-simli-speaking 1.4s ease-in-out infinite"
          : "sef-video-glow 5s ease-in-out infinite",
        transition:"border-color 400ms",
        pointerEvents:"none",
      }} />

      {/* Outer pulse ring */}
      <div style={{
        position:"absolute", left:"50%", top:"50%",
        width:"170%", height:"170%", borderRadius:"50%",
        background:"transparent",
        border:"1px solid rgba(212,175,55,0.10)",
        animation:"sef-ring 4.8s ease-in-out infinite",
        transform:"translate(-50%,-50%)",
        pointerEvents:"none", zIndex:0,
      }} />

      {/* Loading overlay — shows portrait while Simli connects */}
      {isLoading && (
        <div style={{
          position:"absolute", inset:0, zIndex:4,
          borderRadius:14, overflow:"hidden",
          animation:"sef-breathe 3s ease-in-out infinite",
        }}>
          <img
            src="/assets/prod-sophia-portrait.webp"
            alt="Sophia"
            style={{
              width:"100%", height:"100%",
              objectFit:"cover", objectPosition:"center top",
              filter:"brightness(0.95) saturate(1.05)",
              display:"block",
            }}
          />
          {/* Connecting indicator */}
          <div style={{
            position:"absolute", bottom:8, left:"50%",
            transform:"translateX(-50%)",
            background:"rgba(5,11,26,0.75)",
            borderRadius:20, padding:"3px 10px",
            display:"flex", alignItems:"center", gap:5,
          }}>
            <div style={{
              width:5, height:5, borderRadius:"50%",
              background:"#22C55E",
              animation:"sef-bar-wave 1.0s ease-in-out infinite",
            }} />
            <span style={{
              fontSize:9, color:"rgba(255,255,255,0.65)",
              letterSpacing:"0.08em", fontFamily:"Inter,sans-serif",
              textTransform:"uppercase",
            }}>
              {status === "connecting" ? "Connecting…" : "Loading…"}
            </span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {status === "error" && (
        <div style={{
          position:"absolute", inset:0, zIndex:4,
          borderRadius:14, overflow:"hidden",
        }}>
          <img
            src="/assets/prod-sophia-portrait.webp"
            alt="Sophia"
            style={{
              width:"100%", height:"100%",
              objectFit:"cover", objectPosition:"center top",
              filter:"brightness(0.92) saturate(0.95)",
              display:"block",
              animation:"sef-breathe 3.5s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* Simli video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        style={{
          position:"absolute", inset:0, zIndex:3,
          width:"100%", height:"100%",
          objectFit:"cover", borderRadius:14,
          opacity: (status === "ready" || status === "speaking") ? 1 : 0,
          transition:"opacity 600ms ease",
          background:"transparent",
        }}
      />
      {/* Hidden Simli audio element */}
      <audio ref={audioRef} autoPlay style={{ display:"none" }} />

      {/* Speaking bars */}
      <div style={{
        position:"absolute", bottom:8, left:"50%",
        transform:"translateX(-50%)",
        display:"flex", gap:3, alignItems:"flex-end", height:20,
        opacity: speaking ? 1 : 0,
        transition:"opacity 400ms ease",
        pointerEvents:"none", zIndex:5,
      }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            width:3, borderRadius:2,
            background:GOLD2,
            animation: speaking
              ? `sef-bar-wave ${0.55+i*0.11}s ease-in-out ${i*0.09}s infinite`
              : "none",
            height:"8px",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Fallback static portrait (used if Simli not available) ──────────────────
function SophiaAvatarFallback({ speaking }: { speaking: boolean }) {
  return (
    <div style={{
      position:"relative",
      width:"clamp(90px,12vw,136px)",
      height:"clamp(140px,19vw,213px)",
      flexShrink:0,
    }}>
      <div style={{
        position:"absolute", left:"50%", top:"50%",
        width:"170%", height:"170%", borderRadius:"50%",
        background:"transparent",
        border:"1px solid rgba(212,175,55,0.10)",
        animation:"sef-ring 4.8s ease-in-out infinite",
        transform:"translate(-50%,-50%)",
        pointerEvents:"none",
      }} />
      <div style={{
        position:"absolute", inset:"-10px", borderRadius:"16px",
        background:"radial-gradient(circle, rgba(212,175,55,0.16) 0%, transparent 70%)",
        filter:"blur(18px)",
        opacity: speaking ? 0.88 : 0.42,
        transition:"opacity 600ms ease",
        pointerEvents:"none",
      }} />
      <img
        src="/assets/prod-sophia-portrait.webp"
        alt="Sophia"
        style={{
          width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"center top",
          borderRadius:"13px",
          animation:"sef-portrait-glow 5s ease-in-out infinite",
          filter: speaking
            ? "brightness(1.08) saturate(1.15) contrast(1.08)"
            : "brightness(1.00) saturate(1.00) contrast(1.00)",
          transition:"filter 600ms ease",
          display:"block", userSelect:"none",
        }}
      />
      <div style={{
        position:"absolute", bottom:8, left:"50%",
        transform:"translateX(-50%)",
        display:"flex", gap:3, alignItems:"flex-end", height:20,
        opacity: speaking ? 1 : 0,
        transition:"opacity 400ms ease",
        pointerEvents:"none",
      }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            width:3, borderRadius:2,
            background:GOLD2,
            animation: speaking
              ? `sef-bar-wave ${0.55+i*0.11}s ease-in-out ${i*0.09}s infinite`
              : "none",
            height:"8px",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Speech bubble with typewriter ───────────────────────────────────────────
function SpeechBubble({
  text,
  onDone,
  speed = 26,
}: { text: string; onDone: () => void; speed?: number }) {
  const { out, done } = useTypewriter(text, speed);

  useEffect(() => {
    if (done) {
      const t = setTimeout(onDone, 380);
      return () => clearTimeout(t);
    }
  }, [done, onDone]);

  return (
    <div style={{
      background:"rgba(11,23,54,0.72)",
      border:`1px solid ${BORDER}`,
      borderRadius:"0 16px 16px 16px",
      padding:"clamp(14px,2vw,20px) clamp(16px,2.2vw,24px)",
      backdropFilter:"blur(12px)",
      WebkitBackdropFilter:"blur(12px)",
      maxWidth:500,
      minHeight:72,
    }}>
      <p style={{
        fontFamily:"'Playfair Display',serif",
        fontSize:"clamp(14px,1.55vw,17px)",
        fontStyle:"italic",
        color:TEXT,
        lineHeight:1.65,
        margin:0,
      }}>
        {out}
        {!done && (
          <span style={{
            display:"inline-block", width:2, height:"1em",
            background:GOLD2, marginLeft:3, verticalAlign:"middle",
            animation:"sef-cursor 0.9s ease-in-out infinite",
          }} />
        )}
      </p>
    </div>
  );
}

// ─── Option grid ──────────────────────────────────────────────────────────────
function OptionGrid({
  opts,
  selected,
  onSelect,
}: { opts: Option[]; selected: OptionKey|null; onSelect:(k:OptionKey)=>void }) {
  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"repeat(auto-fit, minmax(min(100%,230px),1fr))",
      gap:"clamp(8px,1.1vw,11px)",
      width:"100%",
      maxWidth:600,
    }}>
      {opts.map((o, i) => (
        <button
          key={o.key}
          className={`sef-opt${selected===o.key?" sel":""}`}
          onClick={() => onSelect(o.key)}
          style={{
            opacity:0,
            animation:`sef-opt-in 0.32s ease-out ${i*0.08}s forwards`,
          }}
        >
          <span style={{ fontSize:"clamp(17px,1.9vw,21px)", flexShrink:0 }}>{o.icon}</span>
          <span>
            <span style={{ display:"block" }}>{o.label}</span>
            <span style={{
              fontSize:"clamp(11px,0.95vw,12px)",
              color:"rgba(255,255,255,0.40)",
              fontWeight:400, marginTop:2, display:"block",
            }}>{o.sub}</span>
          </span>
          {selected===o.key && (
            <span style={{
              marginLeft:"auto", flexShrink:0,
              width:18, height:18, borderRadius:"50%",
              background:GOLD,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1.5" stroke="#050B1A" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function Dots({ cur, total }: { cur: number; total: number }) {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width:  i===cur ? 20 : 6,
          height: 6, borderRadius:3,
          background: i===cur ? GOLD : i<cur ? "rgba(212,175,55,.38)" : "rgba(255,255,255,.15)",
          transition:"width 300ms ease, background 300ms ease",
        }} />
      ))}
    </div>
  );
}

// ─── Continue / Enter buttons ─────────────────────────────────────────────────
function ContinueBtn({ onClick, disabled, label }: { onClick:()=>void; disabled:boolean; label:string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:"clamp(13px,1.8vw,17px) clamp(36px,5vw,58px)",
        background: disabled
          ? "rgba(212,175,55,0.14)"
          : hov
            ? "linear-gradient(135deg,#E8C84A 0%,#D4AF37 40%,#B8950A 100%)"
            : "linear-gradient(135deg,#D4AF37 0%,#B8950A 50%,#96760A 100%)",
        border: disabled ? "1.5px solid rgba(212,175,55,0.18)" : "none",
        borderRadius:12, cursor: disabled?"not-allowed":"pointer",
        fontFamily:"'Playfair Display',serif",
        fontSize:"clamp(14px,1.55vw,17px)", fontWeight:700,
        color: disabled ? "rgba(212,175,55,0.38)" : "#050B1A",
        letterSpacing:"0.03em",
        transition:"background 200ms, transform 140ms",
        transform:(!disabled&&hov)?"translateY(-2px) scale(1.012)":"none",
        animation: disabled ? "none" : "sef-pulse-btn 3.5s ease-in-out infinite",
        display:"flex", alignItems:"center", gap:10,
      }}
    >
      {label}
      {!disabled && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M5 12H19M13 6L19 12L13 18" stroke="#050B1A" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

function EnterBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:"clamp(16px,2.2vw,22px) clamp(44px,6vw,80px)",
        background: hov
          ? "linear-gradient(135deg,#FFD966 0%,#E8C84A 35%,#D4AF37 70%,#B8950A 100%)"
          : "linear-gradient(135deg,#D4AF37 0%,#C09B20 50%,#A08012 100%)",
        border:"none", borderRadius:14, cursor:"pointer",
        fontFamily:"'Playfair Display',serif",
        fontSize:"clamp(16px,1.9vw,20px)", fontWeight:700,
        color:"#050B1A", letterSpacing:"0.04em",
        transition:"background 200ms, transform 140ms, box-shadow 200ms",
        transform: hov ? "translateY(-3px) scale(1.015)" : "none",
        animation:"sef-pulse-btn 3s ease-in-out infinite",
        boxShadow: hov
          ? "0 8px 40px rgba(212,175,55,0.52), 0 2px 12px rgba(0,0,0,0.55)"
          : "0 4px 28px rgba(212,175,55,0.32), 0 2px 12px rgba(0,0,0,0.55)",
        display:"flex", alignItems:"center", gap:12,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="#050B1A" stroke="#050B1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Enter Ghaafeedi Music
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M5 12H19M13 6L19 12L13 18" stroke="#050B1A" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
interface SophiaEntryFlowProps {
  onComplete: () => void;
}

type SimliMode = "pending" | "active" | "fallback";

export function SophiaEntryFlow({ onComplete }: SophiaEntryFlowProps) {
  const [step,     setStep]     = useState(0);
  const [spoken,   setSpoken]   = useState(false);
  const [answers,  setAnswers]  = useState<Record<number, OptionKey>>({});
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [exiting,  setExiting]  = useState(false);

  // Simli state
  const [userStarted,     setUserStarted]     = useState(false);  // lazy-init: only true after user clicks "Talk to Sophia"
  const [simliMode,       setSimliMode]       = useState<SimliMode>("pending");
  const [sessionToken,    setSessionToken]    = useState<string | null>(null);
  const [simliReady,      setSimliReady]      = useState(false);
  const [simliFailed,     setSimliFailed]     = useState(false);
  const [simlySpeaking,   setSimlySpeaking]   = useState(false);
  const [audioChunk,      setAudioChunk]      = useState<Uint8Array | null>(null);
  const [sophiaFaceReady, setSophiaFaceReady] = useState(false); // true when custom Sophia face is active
  const [simliInitializing, setSimliInitializing] = useState(false); // loading state while fetching token
  const ttsInFlight = useRef(false);

  const isIntro   = step === 0;
  const isSummary = step === 4;
  const curStep   = STEPS[Math.min(step, STEPS.length - 1)];
  const speechLine = isSummary ? buildSummary(answers) : (curStep?.line ?? "");

  // CSS
  useEffect(() => {
    if (document.getElementById("sef-css")) return;
    const el = document.createElement("style");
    el.id = "sef-css";
    el.textContent = INJECT_CSS;
    document.head.appendChild(el);
  }, []);

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Reset spoken flag on step change
  useEffect(() => {
    setSpoken(false);
    setSelected(null);
  }, [step]);

  // ── Step 1: Fetch Simli session token — only when user explicitly starts ────
  // Lazy-init: no Simli credits burned until user clicks "Talk to Sophia"
  useEffect(() => {
    if (!userStarted) return;
    let cancelled = false;
    setSimliInitializing(true);
    (async () => {
      try {
        const res = await fetch("/api/simli/token", { method: "POST" });
        if (!res.ok) throw new Error(`Simli token ${res.status}`);
        const data = (await res.json()) as { session_token?: string; face_ready?: boolean; error?: string };
        if (cancelled) return;
        if (data.session_token) {
          setSessionToken(data.session_token);
          if (data.face_ready) setSophiaFaceReady(true);
          setSimliMode("active");
        } else {
          throw new Error(data.error ?? "no token");
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[SEF] Simli token fetch failed, using fallback:", err);
          setSimliMode("fallback");
          setSimliFailed(true);
        }
      } finally {
        if (!cancelled) setSimliInitializing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userStarted]);

  // ── Step 2: Fetch TTS audio per step (once Simli is ready) ─────────────────
  useEffect(() => {
    // Wait until Simli WebRTC is ready before sending audio
    // Also guard: user must have explicitly started the session
    if (!userStarted || simliMode !== "active" || !simliReady || !speechLine) return;

    let cancelled = false;
    ttsInFlight.current = true;

    (async () => {
      try {
        const res = await fetch("/api/simli/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: speechLine }),
        });
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        const buf = await res.arrayBuffer();
        if (!cancelled) {
          setAudioChunk(new Uint8Array(buf));
        }
      } catch (err) {
        console.warn("[SEF] TTS failed:", err);
        // graceful: typewriter + static avatar still work
      } finally {
        if (!cancelled) ttsInFlight.current = false;
      }
    })();

    return () => { cancelled = true; ttsInFlight.current = false; };
  // step is the trigger — new step = new TTS call
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, simliReady, simliMode]);

  const handleSpoken = useCallback(() => setSpoken(true), []);

  const handleSelect = (k: OptionKey) => setSelected(k);

  const handleContinue = () => {
    if (!isIntro && !selected) return;
    const newAnswers = selected ? { ...answers, [step]: selected } : answers;
    setAnswers(newAnswers);
    setStep(s => s + 1);
  };

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      try { sessionStorage.setItem("gm_entry_done", "1"); } catch {}
      onComplete();
    }, 520);
  };

  const canContinue = spoken && (isIntro || isSummary || !!selected);

  // Which avatar to show
  const useSimli = simliMode === "active" && !simliFailed;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="sef-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            position:"fixed", inset:0, zIndex:99999,
            background:`radial-gradient(ellipse 120% 90% at 50% 20%, #0D1B3E 0%, #050B1A 55%, #020610 100%)`,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            fontFamily:"Inter,sans-serif", color:TEXT,
            overflow:"hidden",
            padding:"clamp(16px,3vw,32px) clamp(16px,4vw,40px)",
          }}
        >
          <StarField />

          {/* ── Top bar ── */}
          <div style={{
            position:"absolute",
            top:"clamp(14px,2.5vw,26px)",
            left:0, right:0,
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center",
            padding:"0 clamp(20px,4vw,40px)",
            zIndex:10,
          }}>
            <span style={{
              fontFamily:"'Playfair Display',serif",
              fontSize:"clamp(12px,1.3vw,15px)", fontWeight:700,
              color:GOLD, letterSpacing:"0.06em", textTransform:"uppercase",
            }}>
              Ghaafeedi Music
            </span>
            <div style={{ display:"flex", alignItems:"center", gap:18 }}>
              {step > 0 && !isSummary && <Dots cur={step - 1} total={3} />}
              {!isSummary && (
                <button
                  onClick={handleEnter}
                  style={{
                    background:"none", border:"none", cursor:"pointer",
                    fontSize:"clamp(11px,0.95vw,12px)",
                    color:"rgba(255,255,255,0.28)",
                    fontFamily:"Inter,sans-serif",
                    letterSpacing:"0.10em", textTransform:"uppercase",
                    padding:"6px 0", transition:"color 160ms",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color="rgba(255,255,255,0.58)")}
                  onMouseLeave={e => (e.currentTarget.style.color="rgba(255,255,255,0.28)")}
                >
                  Skip →
                </button>
              )}
            </div>
          </div>

          {/* ── Step card ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${step}`}
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-14 }}
              transition={{ duration:0.42, ease:[0.22,1,0.36,1] }}
              style={{
                display:"flex", flexDirection:"column",
                alignItems:"center",
                gap:"clamp(18px,2.8vw,30px)",
                width:"100%", maxWidth:660,
                position:"relative", zIndex:5,
              }}
            >
              {/* Sophia row */}
              <div style={{
                display:"flex", alignItems:"flex-start",
                gap:"clamp(12px,2vw,22px)",
                width:"100%",
              }}>
                {/* Avatar — lazy-init: show prompt until user starts */}
                {!userStarted ? (
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <SophiaAvatarFallback speaking={false} />
                    {/* Talk to Sophia overlay button */}
                    <button
                      onClick={() => setUserStarted(true)}
                      style={{
                        position:"absolute", inset:0,
                        background:"rgba(5,11,26,0.55)",
                        border:`1.5px solid ${GOLD}`,
                        borderRadius:"50%",
                        cursor:"pointer",
                        display:"flex", flexDirection:"column",
                        alignItems:"center", justifyContent:"center",
                        gap:4,
                        backdropFilter:"blur(4px)",
                        transition:"background 0.2s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,55,0.18)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(5,11,26,0.55)")}
                    >
                      <span style={{ fontSize:18 }}>🎙</span>
                      <span style={{
                        fontSize:9, fontWeight:700, color:GOLD,
                        letterSpacing:"0.10em", textTransform:"uppercase",
                        fontFamily:"Inter,sans-serif", lineHeight:1.2,
                        textAlign:"center", padding:"0 6px",
                      }}>
                        Talk to<br/>Sophia Live
                      </span>
                    </button>
                  </div>
                ) : simliInitializing ? (
                  <div style={{
                    flexShrink:0, width:72, height:72, borderRadius:"50%",
                    border:`1.5px solid ${GOLD}`,
                    background:"rgba(5,11,26,0.8)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <div style={{
                      width:20, height:20, borderRadius:"50%",
                      border:`2px solid ${GOLD}`,
                      borderTopColor:"transparent",
                      animation:"sef-spin 0.8s linear infinite",
                    }} />
                  </div>
                ) : useSimli ? (
                  <SimliAvatar
                    sessionToken={sessionToken}
                    audioData={audioChunk}
                    onSpeakingChange={setSimlySpeaking}
                    onReady={() => setSimliReady(true)}
                    onError={() => {
                      setSimliFailed(true);
                      setSimliMode("fallback");
                    }}
                    onAudioConsumed={() => setAudioChunk(null)}
                  />
                ) : (
                  <SophiaAvatarFallback speaking={!spoken} />
                )}

                <div style={{ flex:1, paddingTop:4 }}>
                  {/* Badge */}
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6, marginBottom:8 }}>
                    <div style={{
                      width:7, height:7, borderRadius:"50%",
                      background:"#22C55E",
                      boxShadow:"0 0 6px rgba(34,197,94,0.8)",
                    }} />
                    <span style={{
                      fontSize:11, fontWeight:600,
                      color:GOLD2, letterSpacing:"0.12em",
                      textTransform:"uppercase",
                    }}>
                      Sophia · AI Concierge
                    </span>
                    {useSimli && simliReady && (
                      <span style={{
                        fontSize:9, color:"rgba(255,255,255,0.30)",
                        fontFamily:"Inter,sans-serif",
                        letterSpacing:"0.08em", marginLeft:4,
                        textTransform:"uppercase",
                      }}>
                        · {sophiaFaceReady ? "✦ Sophia AI" : "Live"}
                      </span>
                    )}
                  </div>
                  {speechLine && (
                    <SpeechBubble
                      key={`speech-${step}`}
                      text={speechLine}
                      onDone={handleSpoken}
                      speed={isSummary ? 21 : 26}
                    />
                  )}
                </div>
              </div>

              {/* Options */}
              {!isIntro && !isSummary && curStep?.opts && spoken && (
                <motion.div
                  initial={{ opacity:0, y:10 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ duration:0.32 }}
                  style={{ width:"100%" }}
                >
                  <OptionGrid opts={curStep.opts} selected={selected} onSelect={handleSelect} />
                </motion.div>
              )}

              {/* CTA */}
              {canContinue && (
                <motion.div
                  initial={{ opacity:0, y:8 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ duration:0.30, delay:0.08 }}
                  style={{ width:"100%", display:"flex", justifyContent:"center" }}
                >
                  {isSummary
                    ? <EnterBtn onClick={handleEnter} />
                    : <ContinueBtn
                        onClick={handleContinue}
                        disabled={!isIntro && !selected}
                        label={isIntro ? "Let's Begin" : "Continue"}
                      />
                  }
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom trust strip */}
          <div style={{
            position:"absolute", bottom:"clamp(12px,2vw,22px)",
            left:0, right:0, zIndex:5,
            display:"flex", justifyContent:"center",
            alignItems:"center", gap:"clamp(8px,1.2vw,16px)",
            flexWrap:"wrap", padding:"0 20px",
          }}>
            {["Luxury AI Production","·","Emotional Storytelling","·","Cinematic Quality"].map((t,i) => (
              <span key={i} style={{
                fontSize:"clamp(9px,0.72vw,11px)",
                color:"rgba(255,255,255,0.18)",
                letterSpacing:"0.12em", textTransform:"uppercase",
                fontFamily:"Inter,sans-serif", whiteSpace:"nowrap",
              }}>{t}</span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
