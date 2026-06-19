/**
 * GHAAFEEDI MUSIC — SOPHIA ENTRY FLOW  v3
 * ══════════════════════════════════════════════════════════════════════════
 * - Sophia dominates left panel — large full-body cinematic portrait
 * - Simli WebRTC lip-sync AUTO-STARTS on mount (no click gate)
 * - ElevenLabs PCM16 TTS feeds every word into Simli in real-time
 * - Welcome script: "Welcome to Ghaafeedi Music…" → closes with "Enjoy your cinematic experience"
 * - 4-question guided flow → personalized summary → Enter CTA
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD   = "#D4AF37";
const GOLD2  = "#F4D06F";
const BG     = "#050B1A";
const TEXT   = "#FFFFFF";

// ─── Sophia's 5-act script ────────────────────────────────────────────────────
// step 0 = welcome intro (auto-plays)
// steps 1-3 = guided questions
// step 4 = personalized summary + goodbye
const SOPHIA_LINES = {
  welcome: "Welcome to Ghaafeedi Music. I'm Sophia, your AI Emotional Concierge. I'm here to turn your most precious memories into cinematic songs and films. How can I help you today?",
  q1: "What brings you to Ghaafeedi Music today?",
  q2: "Beautiful. And who is this story for?",
  q3: "Perfect. What matters most to you in this experience?",
  goodbye: (summary: string) =>
    `${summary} I can't wait to see what we create together. Enjoy your cinematic experience through Ghaafeedi Music.`,
};

// ─── Q&A options ──────────────────────────────────────────────────────────────
interface Option { key: string; icon: string; label: string; sub: string }

const Q1_OPTS: Option[] = [
  { key: "preserve",  icon: "🎞️", label: "Preserve a memory or moment",     sub: "Someone or something I never want to forget" },
  { key: "celebrate", icon: "✨", label: "Celebrate a person or milestone",  sub: "Birthday, anniversary, graduation, reunion" },
  { key: "heal",      icon: "💛", label: "Process loss or heal emotionally", sub: "Grief, breakup, life transition" },
  { key: "legacy",    icon: "🏛️", label: "Create a lasting legacy",          sub: "For my family, children, or future generations" },
];
const Q2_OPTS: Option[] = [
  { key: "me",      icon: "🙋",   label: "For myself",                  sub: "My own healing or reflection" },
  { key: "partner", icon: "💑",   label: "For a partner or spouse",      sub: "Romance, wedding, relationship milestone" },
  { key: "family",  icon: "👨‍👩‍👧", label: "For family",                  sub: "Parents, children, grandparents" },
  { key: "gift",    icon: "🎁",   label: "As a gift for someone special",sub: "A meaningful, one-of-a-kind present" },
];
const Q3_OPTS: Option[] = [
  { key: "song",   icon: "🎵", label: "A cinematic song in my voice or style", sub: "Original music built from my story" },
  { key: "film",   icon: "🎬", label: "A full cinematic film or video",         sub: "Visual storytelling with narration" },
  { key: "both",   icon: "🌟", label: "Both — the full experience",             sub: "Song + film together" },
  { key: "unsure", icon: "🤔", label: "I'm not sure yet — show me everything",  sub: "Let Sophia guide me" },
];

function buildSummary(a: Record<number, string>): string {
  const whyMap: Record<string, string> = {
    preserve: "preserve a memory that means everything to you",
    celebrate: "celebrate someone or a milestone that deserves to live forever",
    heal: "find healing through something deeply personal",
    legacy: "build a legacy that will outlive us all",
  };
  const whoMap: Record<string, string> = {
    me: "for yourself",
    partner: "for the person you love",
    family: "for your family",
    gift: "as a gift for someone who truly deserves it",
  };
  const whatMap: Record<string, string> = {
    song: "A cinematic song will carry that emotion perfectly.",
    film: "A full cinematic film will bring that story to life.",
    both: "The full Ghaafeedi experience — song and film — was made for exactly this.",
    unsure: "I'll walk you through everything once you're inside.",
  };
  const why  = whyMap[a[1]] ?? "create something meaningful";
  const who  = whoMap[a[2]] ?? "for someone special";
  const what = whatMap[a[3]] ?? "Let's find the perfect experience together.";
  return `You're here to ${why} — ${who}. ${what}`;
}

// ─── CSS injected once ───────────────────────────────────────────────────────
const INJECT_CSS = `
@keyframes sef-glow-pulse {
  0%,100% { box-shadow: 0 0 40px rgba(212,175,55,0.18), 0 0 0 1.5px rgba(212,175,55,0.22); }
  50%      { box-shadow: 0 0 80px rgba(212,175,55,0.45), 0 0 0 2px rgba(212,175,55,0.55); }
}
@keyframes sef-speaking-glow {
  0%,100% { box-shadow: 0 0 50px rgba(212,175,55,0.40), 0 0 0 2px rgba(212,175,55,0.65), 0 0 120px rgba(212,175,55,0.20); }
  50%      { box-shadow: 0 0 90px rgba(212,175,55,0.70), 0 0 0 3px rgba(212,175,55,0.90), 0 0 180px rgba(212,175,55,0.35); }
}
@keyframes sef-bar {
  0%,100% { height: 6px; }
  50%      { height: 22px; }
}
@keyframes sef-star {
  0%,100% { opacity:.08; transform:scale(1); }
  50%      { opacity:.55; transform:scale(1.8); }
}
@keyframes sef-float {
  0%,100% { transform:translateY(0); }
  50%      { transform:translateY(-14px); }
}
@keyframes sef-cursor {
  0%,100% { opacity:1; }
  50%      { opacity:0; }
}
@keyframes sef-pulse-btn {
  0%,100% { box-shadow:0 0 28px rgba(212,175,55,.22), 0 4px 20px rgba(0,0,0,.55); }
  50%      { box-shadow:0 0 52px rgba(212,175,55,.52), 0 4px 28px rgba(0,0,0,.65); }
}
@keyframes sef-opt-in {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0);    }
}
@keyframes sef-spin {
  from { transform:rotate(0deg); }
  to   { transform:rotate(360deg); }
}
@keyframes sef-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes sef-breathe {
  0%,100% { transform:scale(1.00); }
  50%      { transform:scale(1.015); }
}
@keyframes sef-vignette {
  0%,100% { opacity:0.72; }
  50%      { opacity:0.58; }
}
@keyframes sef-ring-expand {
  0%   { transform:translate(-50%,-50%) scale(0.9); opacity:0.18; }
  100% { transform:translate(-50%,-50%) scale(2.2); opacity:0; }
}

.sef-opt {
  width:100%;
  padding: clamp(11px,1.5vw,15px) clamp(14px,2vw,20px);
  background: rgba(255,255,255,.03);
  border: 1.5px solid rgba(212,175,55,.18);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 160ms, border-color 160ms, transform 120ms, box-shadow 160ms;
  display: flex;
  align-items: center;
  gap: 11px;
  font-family: Inter, sans-serif;
  font-size: clamp(12px,1.3vw,14px);
  font-weight: 500;
  color: rgba(255,255,255,.82);
}
.sef-opt:hover {
  background: rgba(212,175,55,.10);
  border-color: rgba(212,175,55,.52);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(212,175,55,.12);
  color: #fff;
}
.sef-opt.sel {
  background: rgba(212,175,55,.14);
  border-color: rgba(212,175,55,.68);
  color: ${GOLD2};
  box-shadow: 0 0 0 1px rgba(212,175,55,.28), 0 4px 24px rgba(212,175,55,.16);
}
`;

// ─── Background stars ─────────────────────────────────────────────────────────
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: ((i * 137.5 + 31) % 100),
  y: ((i * 73.2  + 17) % 100),
  r: 0.6 + ((i * 11.3) % 1.5),
  delay: ((i * 0.29) % 4.8).toFixed(2),
  dur:   (2.2 + ((i * 0.21) % 2.8)).toFixed(2),
  gold:  i % 8 === 0,
}));

// ─── Typewriter ───────────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 24) {
  const [out,  setOut]  = useState("");
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setOut(""); setDone(false);
    let i = 0;
    const tick = () => {
      i++;
      setOut(text.slice(0, i));
      if (i < text.length) {
        const ch = text[i];
        const pause = [".", "!", "?"].includes(ch) ? speed * 7 : ch === "," ? speed * 3 : speed;
        timer.current = setTimeout(tick, pause);
      } else { setDone(true); }
    };
    timer.current = setTimeout(tick, speed);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [text]);
  return { out, done };
}

// ─── Simli WebRTC Avatar ──────────────────────────────────────────────────────
// Transport: "p2p" (library default) — P2P WebRTC via RTCPeerConnection.
//   Simli's own retry logic: tries p2p up to 2x, then auto-switches to livekit.
//   Our timeout: 12s — one clean P2P attempt. Audio fallback already playing.
//
// Audio pipeline: speak(text) → /api/simli/tts-stream (ElevenLabs PCM16 chunks)
//   → sendAudioData() → WebSocket signaling channel → Simli renders face.
//
// "start" event fires when first video frame arrives (requestVideoFrameCallback).
// We listen to client "start" event AND await client.start() — both paths covered.
interface SimliAvatarProps {
  sessionToken: string | null;
  onSpeakingChange: (v: boolean) => void;
  onReady: (speak: (text: string) => Promise<void>) => void;
  onError: () => void;
}

function SimliAvatar({ sessionToken, onSpeakingChange, onReady, onError }: SimliAvatarProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const audioRef    = useRef<HTMLAudioElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef   = useRef<any>(null);
  const startedRef  = useRef(false);
  const readyFiredRef = useRef(false);
  const speakingRef = useRef(false);
  const [status,   setStatus]   = useState<"idle"|"connecting"|"ready"|"error">("idle");
  const [speaking, setSpeaking] = useState(false);

  // ── speak() — streams ElevenLabs PCM directly into Simli ──────────────────
  // Reads chunked PCM stream from /api/simli/tts-stream and pipes each chunk
  // to sendAudioData() which forwards over the WebSocket signaling channel.
  const speakFn = useCallback(async (text: string) => {
    const client = clientRef.current;
    if (!client) return;
    try {
      console.log("[Simli] speak →", text.slice(0, 60) + "…");
      const res = await fetch("/api/simli/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || !res.body) {
        console.warn("[Simli] TTS stream failed:", res.status);
        return;
      }
      const reader = res.body.getReader();
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          client.sendAudioData(value);
          totalBytes += value.length;
        }
      }
      console.log("[Simli] speak done, total PCM bytes:", totalBytes);
    } catch (err) {
      console.warn("[Simli] speak error:", err);
    }
  }, []);

  // ── Notify parent once — called from "start" event OR start() resolve ─────
  const notifyReady = useCallback((client: unknown) => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    console.log("[Simli] ✅ READY — first frame received, priming buffer");
    setStatus("ready");
    // Prime Simli audio buffer (official recommendation: send silence first)
    const silence = new Uint8Array(6000);
    (client as { sendAudioData: (d: Uint8Array) => void }).sendAudioData(silence);
    onReady(speakFn);
  }, [speakFn, onReady]);

  // ── Auto-init as soon as session token is available ────────────────────────
  useEffect(() => {
    if (!sessionToken || startedRef.current) return;
    if (!videoRef.current || !audioRef.current) return;
    startedRef.current = true;
    setStatus("connecting");
    let cancelled = false;

    (async () => {
      try {
        const { SimliClient } = await import("simli-client");

        // Force "livekit" transport — P2P is broken server-side for this account.
        // wss://api.simli.ai/compose/webrtc/p2p → "SERVER ERROR IN INITIALIZATION"
        // wss://api.simli.ai/compose/webrtc/livekit → sends DESTINATION + livekit_url ✅
        const client = new SimliClient(
          sessionToken,
          videoRef.current!,
          audioRef.current!,
          null,        // iceServers — null = use STUN defaults
          undefined,   // logLevel — debug (default)
          "livekit",   // FORCED: p2p broken server-side, livekit is the only working transport
        );
        clientRef.current = client;

        // ── Simli events ──────────────────────────────────────────────────────
        client.on("start", () => {
          // Fires when first video frame arrives (requestVideoFrameCallback inside LivekitTransport)
          // Also fires for P2P on first track attachment. Belt-and-suspenders with start() resolve.
          if (!cancelled) {
            console.log("[Simli] 🎬 'start' event received");
            notifyReady(client);
          }
        });
        client.on("speaking", () => {
          if (cancelled) return;
          console.log("[Simli] 🟢 SPEAKING");
          speakingRef.current = true;
          setSpeaking(true);
          onSpeakingChange(true);
        });
        client.on("silent", () => {
          if (cancelled) return;
          console.log("[Simli] ⬛ SILENT");
          speakingRef.current = false;
          setSpeaking(false);
          onSpeakingChange(false);
        });
        client.on("ack", () => console.log("[Simli] ✓ ACK received"));
        client.on("stop", () => console.log("[Simli] ■ STOP received"));
        client.on("connection_info", (info: string) => console.log("[Simli] 🔗 connection_info:", info.slice(0, 80)));
        client.on("error", (d: string) => {
          if (cancelled) return;
          console.error("[Simli] ❌ error event:", d);
          if (!readyFiredRef.current) { setStatus("error"); onError(); }
        });
        client.on("startup_error", (m: string) => {
          if (cancelled) return;
          console.error("[Simli] ❌ startup_error:", m);
          if (!readyFiredRef.current) { setStatus("error"); onError(); }
        });
        client.on("unknown", (m: string) => console.log("[Simli] ❓ unknown msg:", m.slice(0, 100)));

        // await client.start() — resolves when first video frame renders.
        // SimliClient internal timeout = 15s, retries up to 10x (every 2s).
        // We race with 12s max — enough for one clean P2P attempt (ICE + WS + first frame).
        // Audio fallback is already playing via ttsAudioRef — user never waits.
        console.log("[Simli] calling client.start() — transport: p2p (default)…");
        await Promise.race([
          client.start(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Simli timeout 12s")), 12000)
          ),
        ]);

        if (cancelled) return;
        // start() resolved — first frame confirmed
        notifyReady(client);

      } catch (err) {
        if (!cancelled) {
          console.error("[Simli] init failed:", err);
          if (!readyFiredRef.current) { setStatus("error"); onError(); }
        }
      }
    })();

    return () => {
      cancelled = true;
      clientRef.current?.stop().catch(() => {});
    };
  // speakFn + notifyReady are stable useCallbacks — safe to include
  }, [sessionToken, speakFn, notifyReady]);

  const visible = status === "ready";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Speaking pulse rings */}
      {speaking && [0, 1].map(i => (
        <div key={i} style={{
          position: "absolute", left: "50%", top: "50%",
          width: "100%", height: "100%", borderRadius: "inherit",
          border: "2px solid rgba(212,175,55,0.45)",
          animation: `sef-ring-expand ${1.4 + i * 0.5}s ease-out ${i * 0.4}s infinite`,
          pointerEvents: "none", zIndex: 0,
        }} />
      ))}

      {/* Fallback portrait — visible while Simli loads */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        opacity: visible ? 0 : 1,
        transition: "opacity 800ms ease",
        borderRadius: "inherit", overflow: "hidden",
      }}>
        <img
          src="/assets/sophia-lipsync-portrait.png"
          alt="Sophia"
          style={{
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center 15%",
            display: "block",
            animation: "sef-breathe 3.5s ease-in-out infinite",
          }}
        />
        {/* connecting badge */}
        {status === "connecting" && (
          <div style={{
            position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
            background: "rgba(5,11,26,0.82)", border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 20, padding: "5px 14px",
            display: "flex", alignItems: "center", gap: 8,
            backdropFilter: "blur(8px)",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              border: "2px solid " + GOLD, borderTopColor: "transparent",
              animation: "sef-spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: 11, color: GOLD2, fontFamily: "Inter,sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Sophia connecting…
            </span>
          </div>
        )}
      </div>

      {/* Simli live video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute", inset: 0, zIndex: 3,
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center top",
          borderRadius: "inherit",
          // MUST be > 0: opacity:0 throttles requestVideoFrameCallback in Chrome/Safari.
          // rVFC never fires → "start" never emits → visible never becomes true → chicken-and-egg.
          // 0.001 is invisible to human eye but keeps rVFC alive in the browser.
          opacity: visible ? 1 : 0.001,
          transition: "opacity 800ms ease",
          background: "transparent",
        }}
      />
      {/* Audio must NOT be display:none — browsers block autoplay on hidden audio */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", zIndex: -1 }}
      />

      {/* Speaking bars overlay */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 4, alignItems: "flex-end", height: 28,
        opacity: speaking ? 1 : 0,
        transition: "opacity 300ms ease",
        pointerEvents: "none", zIndex: 10,
      }}>
        {[0,1,2,3,4,5,6].map(i => (
          <div key={i} style={{
            width: 4, borderRadius: 3,
            background: `linear-gradient(to top, ${GOLD}, ${GOLD2})`,
            animation: speaking ? `sef-bar ${0.45 + i * 0.09}s ease-in-out ${i * 0.07}s infinite` : "none",
            height: 6,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Option grid ──────────────────────────────────────────────────────────────
function OptionGrid({ opts, selected, onSelect }: { opts: Option[]; selected: string|null; onSelect:(k:string)=>void }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,220px),1fr))",
      gap: "clamp(7px,1vw,10px)",
      width: "100%",
    }}>
      {opts.map((o, i) => (
        <button
          key={o.key}
          className={`sef-opt${selected === o.key ? " sel" : ""}`}
          onClick={() => onSelect(o.key)}
          style={{ opacity: 0, animation: `sef-opt-in 0.30s ease-out ${i * 0.07}s forwards` }}
        >
          <span style={{ fontSize: "clamp(16px,1.8vw,20px)", flexShrink: 0 }}>{o.icon}</span>
          <span>
            <span style={{ display: "block" }}>{o.label}</span>
            <span style={{ fontSize: "clamp(10px,0.88vw,11px)", color: "rgba(255,255,255,0.38)", fontWeight: 400, marginTop: 2, display: "block" }}>
              {o.sub}
            </span>
          </span>
          {selected === o.key && (
            <span style={{
              marginLeft: "auto", flexShrink: 0,
              width: 18, height: 18, borderRadius: "50%",
              background: GOLD,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1.5" stroke="#050B1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === cur ? 22 : 6, height: 6, borderRadius: 3,
          background: i === cur ? GOLD : i < cur ? "rgba(212,175,55,.38)" : "rgba(255,255,255,.14)",
          transition: "width 300ms ease, background 300ms ease",
        }} />
      ))}
    </div>
  );
}

// ─── CTA Button ───────────────────────────────────────────────────────────────
function ContinueBtn({ onClick, disabled, label }: { onClick:()=>void; disabled:boolean; label:string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "clamp(13px,1.8vw,16px) clamp(32px,4.5vw,52px)",
        background: disabled
          ? "rgba(212,175,55,0.12)"
          : hov
            ? "linear-gradient(135deg,#FFD966 0%,#E8C84A 35%,#D4AF37 70%,#B8950A 100%)"
            : "linear-gradient(135deg,#D4AF37 0%,#B8950A 55%,#966A00 100%)",
        border: disabled ? "1.5px solid rgba(212,175,55,0.18)" : "none",
        borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Playfair Display',serif",
        fontSize: "clamp(14px,1.5vw,16px)", fontWeight: 700,
        color: disabled ? "rgba(212,175,55,0.35)" : "#050B1A",
        letterSpacing: "0.03em",
        transition: "background 180ms, transform 130ms",
        transform: (!disabled && hov) ? "translateY(-2px) scale(1.012)" : "none",
        animation: disabled ? "none" : "sef-pulse-btn 3.5s ease-in-out infinite",
        display: "flex", alignItems: "center", gap: 10,
      }}
    >
      {label}
      {!disabled && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M5 12H19M13 6L19 12L13 18" stroke="#050B1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "clamp(15px,2vw,20px) clamp(40px,5.5vw,72px)",
        background: hov
          ? "linear-gradient(135deg,#FFD966 0%,#E8C84A 35%,#D4AF37 70%,#B8950A 100%)"
          : "linear-gradient(135deg,#D4AF37 0%,#C09B20 50%,#A08012 100%)",
        border: "none", borderRadius: 14, cursor: "pointer",
        fontFamily: "'Playfair Display',serif",
        fontSize: "clamp(15px,1.8vw,19px)", fontWeight: 700,
        color: "#050B1A", letterSpacing: "0.04em",
        transition: "background 180ms, transform 130ms, box-shadow 180ms",
        transform: hov ? "translateY(-3px) scale(1.015)" : "none",
        animation: "sef-pulse-btn 3s ease-in-out infinite",
        boxShadow: hov
          ? "0 8px 40px rgba(212,175,55,0.55), 0 2px 12px rgba(0,0,0,0.5)"
          : "0 4px 28px rgba(212,175,55,0.32), 0 2px 12px rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="#050B1A" stroke="#050B1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Enter Ghaafeedi Music
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M5 12H19M13 6L19 12L13 18" stroke="#050B1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface SophiaEntryFlowProps { onComplete: () => void }

export function SophiaEntryFlow({ onComplete }: SophiaEntryFlowProps) {
  // Flow state
  const [step,     setStep]     = useState(0);       // 0=welcome, 1-3=questions, 4=summary
  const [answers,  setAnswers]  = useState<Record<number,string>>({});
  const [selected, setSelected] = useState<string|null>(null);
  const [spoken,   setSpoken]   = useState(false);   // typewriter finished for current step
  const [exiting,  setExiting]  = useState(false);

  // Simli / TTS state
  const [sessionToken,  setSessionToken]  = useState<string|null>(null);
  const [simliReady,    setSimliReady]    = useState(false);
  const [simliFailed,   setSimliFailed]   = useState(false);
  const [simliSpeaking, setSimliSpeaking] = useState(false);
  const speakRef    = useRef<((text: string) => Promise<void>) | null>(null);
  const ttsQueueRef = useRef<string|null>(null);
  // Persistent DOM audio element — avoids new Audio() autoplay blocks
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackSpeakingRef = useRef(false);

  const isIntro   = step === 0;
  const isSummary = step === 4;
  const qOpts     = [null, Q1_OPTS, Q2_OPTS, Q3_OPTS, null][step] ?? null;

  const speechLine = (() => {
    if (step === 0) return SOPHIA_LINES.welcome;
    if (step === 1) return SOPHIA_LINES.q1;
    if (step === 2) return SOPHIA_LINES.q2;
    if (step === 3) return SOPHIA_LINES.q3;
    return SOPHIA_LINES.goodbye(buildSummary(answers));
  })();

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById("sef-css3")) return;
    const el = document.createElement("style");
    el.id = "sef-css3"; el.textContent = INJECT_CSS;
    document.head.appendChild(el);
  }, []);

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Reset spoken + selection on each step change
  useEffect(() => { setSpoken(false); setSelected(null); }, [step]);

  // ── Create persistent DOM audio element on mount ─────────────────────────
  // Using a real DOM <audio> element (not new Audio()) avoids Safari/Chrome
  // autoplay blocks. We append it to the body so it stays in the DOM.
  useEffect(() => {
    const el = document.createElement("audio");
    el.id = "sophia-tts-audio";
    el.preload = "auto";
    el.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(el);
    ttsAudioRef.current = el;
    el.addEventListener("play",  () => setSimliSpeaking(true));
    el.addEventListener("ended", () => setSimliSpeaking(false));
    el.addEventListener("error", () => setSimliSpeaking(false));
    return () => { el.remove(); ttsAudioRef.current = null; };
  }, []);

  // ── playTTS: fetch MP3 from ElevenLabs and play via DOM audio element ─────
  const playTTS = useCallback(async (text: string) => {
    const el = ttsAudioRef.current;
    if (!el) return;
    try {
      // Stop any current playback
      el.pause();
      el.removeAttribute("src");
      el.load();

      const res = await fetch("/api/simli/tts-fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { console.warn("[TTS] API failed:", res.status); return; }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      el.src = url;
      el.onended = () => URL.revokeObjectURL(url);

      // play() — will work because the DOM element was created before any gesture block
      await el.play().catch(async (err) => {
        // If autoplay blocked, wait for first click then retry
        console.warn("[TTS] autoplay blocked, queuing for next gesture:", err.message);
        pendingTTSRef.current = url;
      });
    } catch (err) {
      console.warn("[TTS] error:", err);
    }
  }, []);

  // Queue for autoplay-blocked audio — drained on first user gesture
  const pendingTTSRef = useRef<string | null>(null);

  // ── Unlock audio + drain pending TTS on first user gesture ───────────────
  const audioUnlockedRef = useRef(false);
  const unlockAndPlay = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    const el = ttsAudioRef.current;
    if (!el) return;
    const pending = pendingTTSRef.current;
    if (pending) {
      pendingTTSRef.current = null;
      el.src = pending;
      el.play().catch(() => {});
    }
  }, []);

  // ── AUTO-START Simli on mount ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/simli/token", { method: "POST" });
        if (!res.ok) throw new Error(`token ${res.status}`);
        const data = (await res.json()) as { session_token?: string; error?: string };
        if (cancelled) return;
        if (data.session_token) setSessionToken(data.session_token);
        else throw new Error(data.error ?? "no token");
      } catch (err) {
        if (!cancelled) {
          console.warn("[SEF] Simli token failed:", err);
          setSimliFailed(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Fire TTS on every step change ────────────────────────────────────────
  useEffect(() => {
    playTTS(speechLine);
    // Also pipe to Simli for lip-sync if connected
    if (speakRef.current) {
      speakRef.current(speechLine).catch(() => {});
    } else {
      ttsQueueRef.current = speechLine;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleContinue = () => {
    const newAnswers = selected ? { ...answers, [step]: selected } : answers;
    setAnswers(newAnswers);
    setStep(s => s + 1);
  };

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      try { sessionStorage.setItem("gm_entry_done", "1"); } catch {}
      onComplete();
    }, 500);
  };

  const canContinue = spoken && (isIntro || isSummary || !!selected);
  const useSimli    = !!sessionToken && !simliFailed;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="sef-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          onClick={unlockAndPlay}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: `radial-gradient(ellipse 130% 100% at 40% 10%, #0E1F4A 0%, #070F28 35%, ${BG} 70%, #020610 100%)`,
            display: "flex", flexDirection: "column",
            fontFamily: "Inter,sans-serif", color: TEXT,
            overflow: "hidden",
          }}
        >
          {/* ── Stars ── */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
            {STARS.map((s, i) => (
              <div key={i} style={{
                position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
                width: s.r * 2, height: s.r * 2, borderRadius: "50%",
                background: s.gold ? "rgba(212,175,55,0.80)" : "rgba(255,255,255,0.65)",
                animation: `sef-star ${s.dur}s ease-in-out ${s.delay}s infinite`,
              }} />
            ))}
          </div>

          {/* ── Top bar ── */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "clamp(14px,2.5vw,22px) clamp(20px,4vw,40px)",
            zIndex: 20,
            borderBottom: "1px solid rgba(212,175,55,0.07)",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src="/assets/ghaafeedi-logo-transparent.png" alt="Ghaafeedi Music"
                style={{ height: 32, objectFit: "contain" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: "clamp(11px,1.1vw,14px)", fontWeight: 700,
                color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase",
              }}>Ghaafeedi Music</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {step > 0 && !isSummary && <Dots cur={step - 1} total={3} />}
              <button
                onClick={handleEnter}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "clamp(10px,0.88vw,12px)",
                  color: "rgba(255,255,255,0.28)", fontFamily: "Inter,sans-serif",
                  letterSpacing: "0.10em", textTransform: "uppercase",
                  padding: "6px 0", transition: "color 160ms",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
              >Skip →</button>
            </div>
          </div>

          {/* ── Main two-column layout ── */}
          <div className="sef-main-layout" style={{
            display: "flex",
            flexDirection: "row",
            width: "100%", height: "100%",
            paddingTop: "clamp(60px,8vw,80px)",
          }}>
            {/* ══ LEFT — Sophia full-body dominant panel ══ */}
            <div className="sef-left-panel" style={{
              position: "relative",
              width: "clamp(260px,38vw,480px)",
              minWidth: "clamp(200px,32vw,380px)",
              flexShrink: 0,
              height: "100%",
              overflow: "hidden",
            }}>
              {/* Deep background gradient behind Sophia */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(180deg, rgba(14,31,74,0.6) 0%, rgba(5,11,26,0.3) 50%, rgba(2,6,16,0.8) 100%)",
                zIndex: 1, pointerEvents: "none",
              }} />

              {/* Gold ambient glow behind her */}
              <div style={{
                position: "absolute", bottom: "-10%", left: "50%",
                transform: "translateX(-50%)",
                width: "120%", height: "60%",
                background: "radial-gradient(ellipse, rgba(212,175,55,0.18) 0%, transparent 70%)",
                filter: "blur(40px)",
                zIndex: 2, pointerEvents: "none",
                animation: simliSpeaking
                  ? "sef-glow-pulse 1.2s ease-in-out infinite"
                  : "sef-glow-pulse 4s ease-in-out infinite",
              }} />

              {/* Sophia container — full height */}
              <div style={{
                position: "absolute", inset: 0, zIndex: 3,
                borderRight: "1px solid rgba(212,175,55,0.12)",
                animation: simliSpeaking
                  ? "sef-speaking-glow 1.4s ease-in-out infinite"
                  : "sef-glow-pulse 5s ease-in-out infinite",
                transition: "animation 500ms",
              }}>
                {useSimli ? (
                  <SimliAvatar
                    sessionToken={sessionToken}
                    onSpeakingChange={setSimliSpeaking}
                    onReady={(speak) => {
                      speakRef.current = speak;
                      setSimliReady(true);
                      // Drain queued line for lip-sync (audio already playing via ttsAudioRef)
                      const queued = ttsQueueRef.current;
                      if (queued) { ttsQueueRef.current = null; speak(queued).catch(() => {}); }
                    }}
                    onError={() => {
                      setSimliFailed(true);
                      // Drain lip-sync queue to fallback audio if Simli failed
                      // (playTTS already fired — audio is playing or pending)
                      console.log("[SEF] Simli failed — falling back to audio-only mode");
                    }}
                  />
                ) : (
                  // Fallback — large static portrait
                  <div style={{ width: "100%", height: "100%", position: "relative" }}>
                    <img
                      src="/assets/sophia-lipsync-portrait.png"
                      alt="Sophia"
                      style={{
                        width: "100%", height: "100%",
                        objectFit: "cover", objectPosition: "center 15%",
                        display: "block",
                        animation: "sef-breathe 3.5s ease-in-out infinite",
                      }}
                    />
                    {/* Speaking bars on fallback */}
                    <div style={{
                      position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
                      display: "flex", gap: 4, alignItems: "flex-end", height: 28,
                      opacity: spoken && !canContinue ? 0.7 : 0,
                      transition: "opacity 400ms",
                    }}>
                      {[0,1,2,3,4,5,6].map(i => (
                        <div key={i} style={{
                          width: 4, borderRadius: 3,
                          background: `linear-gradient(to top, ${GOLD}, ${GOLD2})`,
                          animation: `sef-bar ${0.45 + i * 0.09}s ease-in-out ${i * 0.07}s infinite`,
                          height: 6,
                        }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sophia name badge — bottom of left panel */}
              <div style={{
                position: "absolute", bottom: "clamp(16px,3vw,28px)", left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                background: "rgba(5,11,26,0.78)",
                border: "1px solid rgba(212,175,55,0.28)",
                borderRadius: 24, padding: "7px 18px",
                backdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", gap: 8,
                whiteSpace: "nowrap",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: simliReady ? "#22C55E" : simliSpeaking ? "#22C55E" : "rgba(212,175,55,0.6)",
                  boxShadow: simliReady ? "0 0 8px rgba(34,197,94,0.9)" : "none",
                  transition: "all 400ms",
                }} />
                <span style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: "clamp(11px,1vw,13px)", fontWeight: 700,
                  color: GOLD2, letterSpacing: "0.06em",
                }}>
                  Sophia AI
                </span>
                <span style={{
                  fontSize: "clamp(9px,0.75vw,10px)", color: "rgba(255,255,255,0.40)",
                  fontFamily: "Inter,sans-serif", letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  {simliReady ? "• Live" : simliFailed ? "• AI" : "• Connecting"}
                </span>
              </div>
            </div>

            {/* ══ RIGHT — Dialogue + options panel ══ */}
            <div className="sef-right-panel" style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              justifyContent: "center",
              padding: "clamp(20px,4vw,48px) clamp(20px,5vw,60px)",
              gap: "clamp(18px,2.8vw,28px)",
              overflowY: "auto",
              position: "relative", zIndex: 5,
            }}>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`step-${step}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}
                  style={{ display: "flex", flexDirection: "column", gap: "clamp(16px,2.4vw,24px)" }}
                >
                  {/* Step label */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%", background: GOLD,
                      boxShadow: "0 0 8px rgba(212,175,55,0.7)",
                      animation: "sef-glow-pulse 2.5s ease-in-out infinite",
                    }} />
                    <span style={{
                      fontSize: "clamp(10px,0.88vw,11px)", fontWeight: 600,
                      color: GOLD2, letterSpacing: "0.14em", textTransform: "uppercase",
                      fontFamily: "Inter,sans-serif",
                    }}>
                      {isIntro ? "Sophia AI Concierge" : isSummary ? "Your Story" : `Question ${step} of 3`}
                    </span>
                  </div>

                  {/* Speech bubble */}
                  <SpeechBubble
                    key={`bubble-${step}`}
                    text={speechLine}
                    onDone={() => setSpoken(true)}
                    speed={isIntro ? 22 : isSummary ? 20 : 24}
                  />

                  {/* Options */}
                  {!isIntro && !isSummary && qOpts && spoken && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.30 }}
                    >
                      <OptionGrid opts={qOpts} selected={selected} onSelect={setSelected} />
                    </motion.div>
                  )}

                  {/* CTA */}
                  {canContinue && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: 0.06 }}
                      style={{ display: "flex", justifyContent: "flex-start" }}
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

              {/* Trust strip */}
              <div style={{
                position: "absolute", bottom: "clamp(10px,1.8vw,18px)",
                left: "clamp(20px,5vw,60px)", right: "clamp(20px,5vw,60px)",
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              }}>
                {["Luxury AI Production", "·", "Emotional Storytelling", "·", "Cinematic Quality"].map((t, i) => (
                  <span key={i} style={{
                    fontSize: "clamp(9px,0.7vw,10px)", color: "rgba(255,255,255,0.18)",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "Inter,sans-serif",
                  }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Mobile: collapse to stacked layout ── */}
          <style>{`
            @media (max-width: 640px) {
              .sef-main-layout { flex-direction: column !important; }
              .sef-left-panel  { width: 100% !important; height: 64vw !important; min-width: unset !important; flex-shrink: 0; }
              .sef-left-panel img { object-position: center 20% !important; }
              .sef-left-panel video { object-position: center 20% !important; }
              .sef-right-panel { flex: 1; padding: 16px 18px 60px !important; overflow-y: auto; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Speech bubble with typewriter ───────────────────────────────────────────
function SpeechBubble({ text, onDone, speed = 24 }: { text: string; onDone: () => void; speed?: number }) {
  const { out, done } = useTypewriter(text, speed);
  useEffect(() => {
    if (done) { const t = setTimeout(onDone, 300); return () => clearTimeout(t); }
  }, [done, onDone]);
  return (
    <div style={{
      background: "rgba(11,23,54,0.68)",
      border: "1px solid rgba(212,175,55,0.16)",
      borderRadius: "4px 16px 16px 16px",
      padding: "clamp(14px,2vw,20px) clamp(16px,2.2vw,24px)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      maxWidth: 520,
    }}>
      <p style={{
        fontFamily: "'Playfair Display',serif",
        fontSize: "clamp(14px,1.5vw,17px)",
        fontStyle: "italic",
        color: TEXT, lineHeight: 1.68, margin: 0,
      }}>
        {out}
        {!done && (
          <span style={{
            display: "inline-block", width: 2, height: "1em",
            background: GOLD2, marginLeft: 3, verticalAlign: "middle",
            animation: "sef-cursor 0.9s ease-in-out infinite",
          }} />
        )}
      </p>
    </div>
  );
}
