/**
 * GHAAFEEDI MUSIC — SOPHIA ENTRY FLOW
 * ══════════════════════════════════════════════════════════════════
 * Cinematic, conversion-focused entry experience powered by:
 *   • Simli WebRTC — real-time lip sync (Zahra face, Mediterranean)
 *   • ElevenLabs TTS — Sophia's voice (PCM16 via /api/simli/tts)
 *   • 5-act guided conversation — emotional hook → pain → reveal → close
 *
 * Architecture:
 *   1. /api/simli/token  → session_token (server-side key protection)
 *   2. /api/simli/tts    → PCM16 audio ArrayBuffer per script line
 *   3. SimliClient.sendAudioData() → lip-synced video stream
 *   4. On completion → onComplete(path) where path = "onboarding" | "products" | "home"
 *
 * Free tier budget: ~2-3 min/session × 50 min/mo = 16-25 sessions
 * Optimization: audio fetched once per line, reused if user replays
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimliClient } from "simli-client";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD   = "#D4AF37";
const GOLD2  = "#F4D06F";
const GOLD3  = "#FBE8A6";
const BG     = "#050B1A";
const BG2    = "#07101F";
const BG3    = "#0B1736";
const TEXT   = "#FFFFFF";
const MUTED  = "rgba(255,255,255,0.55)";
const BORDER = "rgba(212,175,55,0.22)";

// ─── Script ───────────────────────────────────────────────────────────────────
// Each act has: text Sophia speaks + choices customer can make
type ChoiceKey = "loss" | "love" | "milestone" | "legacy";
type Path = "onboarding" | "products" | "home";

interface Act {
  id: string;
  text: string;
  subtext?: string;
  choices?: { key: string; label: string; icon: string }[];
}

const ACT_0: Act = {
  id: "intro",
  text: "Welcome. I'm Sophia — your personal AI Emotional Concierge at Ghaafeedi Music. Before you step inside, I want to make sure this experience means something to you. May I ask you something personal?",
  choices: [
    { key: "yes", label: "Yes, I'm ready", icon: "✦" },
    { key: "skip", label: "Skip to homepage", icon: "→" },
  ],
};

const ACT_1: Act = {
  id: "hook",
  text: "Think about one person, one moment, one feeling you never want to forget. What comes to mind right now?",
  choices: [
    { key: "loss",      label: "Someone I've lost",          icon: "🕯" },
    { key: "love",      label: "A relationship — past or present", icon: "♡" },
    { key: "milestone", label: "A milestone worth celebrating", icon: "✦" },
    { key: "legacy",    label: "A legacy I want to leave",    icon: "∞" },
  ],
};

const ACT_2_MAP: Record<string, Act> = {
  loss: {
    id: "pain-loss",
    text: "Grief is the price of love. But their story doesn't have to fade. Most people wait — and one day realize the voice, the laugh, the way they said your name… is gone. We change that.",
    subtext: "At Ghaafeedi Music, we turn what you remember into something that lasts forever.",
  },
  love: {
    id: "pain-love",
    text: "Whether it's love found, love lost, or love still being written — that story deserves to be heard. Not just by you. By everyone who should know what it meant.",
    subtext: "We capture the emotion behind your relationship in music and film that moves people to tears.",
  },
  milestone: {
    id: "pain-milestone",
    text: "Milestones happen once. Most are captured in a blurry photo or a forgotten video. You deserve a cinematic production — something that actually feels as significant as the moment was.",
    subtext: "We build the kind of tribute that makes everyone in the room go completely silent.",
  },
  legacy: {
    id: "pain-legacy",
    text: "The people who come after you will want to know who you were — your voice, your values, the moments that shaped you. Most people never leave that behind. You're different.",
    subtext: "We create legacy films and memory archives that your family will treasure for generations.",
  },
};

const ACT_3_MAP: Record<string, Act> = {
  loss: {
    id: "reveal-loss",
    text: "We create Memorial Legacy Films, Emotional Soundtracks, and Signature Songs that honor the person you lost — built entirely from your memories, your words, your love.",
    choices: [
      { key: "memorial",  label: "Memorial Legacy Film  — from $399", icon: "🎬" },
      { key: "song",      label: "Signature Song  — from $99",         icon: "🎵" },
      { key: "soundtrack",label: "Emotional Soundtrack  — from $19/mo",icon: "🎼" },
    ],
  },
  love: {
    id: "reveal-love",
    text: "We create Couples Journey Films, Relationship Healing Songs, and Cinematic Story Films that capture the full arc of your relationship — the joy, the pain, and everything in between.",
    choices: [
      { key: "couples",   label: "Couples Journey Film  — from $149",  icon: "🎬" },
      { key: "healing",   label: "Relationship Healing Song  — from $69",icon: "🎵" },
      { key: "story",     label: "Cinematic Story Film  — from $79",    icon: "✦" },
    ],
  },
  milestone: {
    id: "reveal-milestone",
    text: "We create Cinematic Life Story Films, Social Ready Clips, and Signature Songs that turn your milestone into a moment everyone remembers — built by our AI production team.",
    choices: [
      { key: "life",      label: "Cinematic Life Story  — from $499",   icon: "🎬" },
      { key: "social",    label: "Social Ready Clips  — from $49",      icon: "📱" },
      { key: "song",      label: "Signature Song  — from $99",          icon: "🎵" },
    ],
  },
  legacy: {
    id: "reveal-legacy",
    text: "We create Family Vault archives, Future Self Vision films, and Voice Cloning experiences that preserve exactly who you are — so the people you love can always hear your voice.",
    choices: [
      { key: "vault",     label: "Family Vault  — from $199",           icon: "∞" },
      { key: "future",    label: "Future Self Vision  — from $79",      icon: "✦" },
      { key: "voice",     label: "Voice Cloning Studio  — from $299",   icon: "🎙" },
    ],
  },
};

const ACT_4: Act = {
  id: "close",
  text: "You've already taken the hardest step — deciding this memory matters. The rest? We handle everything. Your story. Your voice. Your legacy. Let's begin.",
  choices: [
    { key: "onboarding", label: "Start My Story",          icon: "✦" },
    { key: "products",   label: "Explore All Experiences", icon: "→" },
    { key: "home",       label: "Enter Homepage",          icon: "⌂" },
  ],
};

// ─── Stable star/particle seeds ───────────────────────────────────────────────
const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: ((i * 137.508 + 31) % 100),
  y: ((i * 73.211  + 17) % 100),
  r: 0.6 + ((i * 11.3) % 1.8),
  delay: ((i * 0.29) % 5).toFixed(2),
  dur:   (2.2 + ((i * 0.21) % 3.2)).toFixed(2),
  gold:  i % 5 === 0,
}));

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes sef-star     { 0%,100%{opacity:.09;transform:scale(1)} 50%{opacity:.60;transform:scale(1.8)} }
@keyframes sef-breathe  { 0%,100%{filter:brightness(1.00) drop-shadow(0 0 40px rgba(212,175,55,.30)) drop-shadow(0 0 80px rgba(212,175,55,.12))} 50%{filter:brightness(1.08) drop-shadow(0 0 60px rgba(212,175,55,.55)) drop-shadow(0 0 120px rgba(212,175,55,.24))} }
@keyframes sef-ring     { 0%,100%{transform:translate(-50%,-50%)scale(0.88);opacity:.28} 50%{transform:translate(-50%,-50%)scale(1.30);opacity:.06} }
@keyframes sef-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes sef-glow-btn { 0%,100%{box-shadow:0 0 24px rgba(212,175,55,.22)} 50%{box-shadow:0 0 42px rgba(212,175,55,.48)} }
@keyframes sef-scan     { 0%{top:-100%} 100%{top:200%} }
@keyframes sef-type-cur { 0%,49%{opacity:1} 50%,100%{opacity:0} }
@keyframes sef-card-in  { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes sef-pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
@keyframes sef-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }

.sef-cursor::after {
  content: "▋";
  display: inline-block;
  margin-left: 2px;
  animation: sef-type-cur 1s step-end infinite;
  color: ${GOLD2};
  font-size: 0.85em;
}
.sef-choice-btn {
  transition: all 0.2s ease;
  border: 1.5px solid rgba(212,175,55,0.25);
  background: rgba(212,175,55,0.06);
  border-radius: 14px;
  cursor: pointer;
  color: #fff;
  font-family: Inter, sans-serif;
}
.sef-choice-btn:hover {
  border-color: rgba(212,175,55,0.65);
  background: rgba(212,175,55,0.14);
  transform: translateY(-2px);
  box-shadow: 0 4px 24px rgba(212,175,55,0.18);
}
.sef-choice-btn.primary {
  background: linear-gradient(135deg, #D4AF37 0%, #B8950A 60%, #96760A 100%);
  border-color: transparent;
  animation: sef-glow-btn 3s ease-in-out infinite;
}
.sef-choice-btn.primary:hover {
  background: linear-gradient(135deg, #E8C84A 0%, #D4AF37 50%, #B8950A 100%);
  transform: translateY(-3px) scale(1.015);
}
`;

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 28, active = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    setDisplayed("");
    setDone(false);
    if (!text) { setDone(true); return; }

    let i = 0;
    const tick = () => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i < text.length) {
        const ch = text[i];
        const delay = ch === "." || ch === "!" || ch === "?" ? speed * 8
                    : ch === "," ? speed * 4
                    : speed;
        setTimeout(tick, delay);
      } else {
        setDone(true);
      }
    };
    const t = setTimeout(tick, 180);
    return () => clearTimeout(t);
  }, [text, active]);

  return { displayed, done };
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6,
          height: 6,
          borderRadius: 3,
          background: i === current ? GOLD : i < current ? "rgba(212,175,55,0.40)" : "rgba(255,255,255,0.15)",
          transition: "all 0.4s ease",
        }} />
      ))}
    </div>
  );
}

// ─── Star field ───────────────────────────────────────────────────────────────
function Stars() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {STARS.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.r * 2, height: s.r * 2,
          borderRadius: "50%",
          background: s.gold ? `rgba(212,175,55,0.75)` : "rgba(255,255,255,0.70)",
          animation: `sef-star ${s.dur}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Simli video panel ────────────────────────────────────────────────────────
interface SimliPanelProps {
  sessionToken: string | null;
  onReady: (client: SimliClient) => void;
  speaking: boolean;
}

function SimliPanel({ sessionToken, onReady, speaking }: SimliPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const clientRef = useRef<SimliClient | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!sessionToken || !videoRef.current || !audioRef.current) return;
    if (readyRef.current) return;

    (async () => {
      try {
        const client = new SimliClient(
          sessionToken,
          videoRef.current!,
          audioRef.current!,
          null,         // no ICE (use Livekit mode — more reliable through firewalls)
          undefined,    // default log level
          "livekit",
        );
        await client.start();
        clientRef.current = client;
        readyRef.current = true;
        onReady(client);
      } catch (err) {
        console.error("[Simli] init error:", err);
      }
    })();

    return () => {
      clientRef.current?.close?.();
    };
  }, [sessionToken]);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      aspectRatio: "9/16",
      maxWidth: 320,
      borderRadius: 24,
      overflow: "hidden",
      background: "linear-gradient(180deg, #0B1736 0%, #050B1A 100%)",
      boxShadow: speaking
        ? `0 0 0 2px ${GOLD}, 0 0 40px rgba(212,175,55,0.35), 0 20px 60px rgba(0,0,0,0.7)`
        : `0 0 0 1px rgba(212,175,55,0.20), 0 20px 60px rgba(0,0,0,0.6)`,
      transition: "box-shadow 0.4s ease",
      flexShrink: 0,
    }}>
      {/* Video stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      <audio ref={audioRef} autoPlay style={{ display: "none" }} />

      {/* Sophia name badge */}
      <div style={{
        position: "absolute",
        bottom: 16, left: 16, right: 16,
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(5,11,26,0.75)",
        backdropFilter: "blur(8px)",
        borderRadius: 10,
        padding: "8px 12px",
        border: `1px solid rgba(212,175,55,0.20)`,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: speaking ? "#22C55E" : GOLD,
          boxShadow: speaking ? "0 0 8px #22C55E" : `0 0 8px ${GOLD}`,
          flexShrink: 0,
          animation: speaking ? "sef-pulse 1s ease-in-out infinite" : "none",
        }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "'Playfair Display', serif" }}>
            Sophia
          </div>
          <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {speaking ? "Speaking…" : "AI Emotional Concierge"}
          </div>
        </div>
      </div>

      {/* Scan line — cinematic effect */}
      {speaking && (
        <div style={{
          position: "absolute",
          left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, rgba(212,175,55,0.45), transparent)`,
          animation: "sef-scan 2.5s linear infinite",
          pointerEvents: "none",
        }} />
      )}
    </div>
  );
}

// ─── Fallback panel (when Simli not ready) ────────────────────────────────────
function FallbackPanel({ speaking }: { speaking: boolean }) {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      aspectRatio: "9/16",
      maxWidth: 320,
      borderRadius: 24,
      overflow: "hidden",
      background: "linear-gradient(180deg, #0B1736 0%, #050B1A 100%)",
      boxShadow: speaking
        ? `0 0 0 2px ${GOLD}, 0 0 40px rgba(212,175,55,0.35), 0 20px 60px rgba(0,0,0,0.7)`
        : `0 0 0 1px rgba(212,175,55,0.20), 0 20px 60px rgba(0,0,0,0.6)`,
      transition: "box-shadow 0.4s ease",
      flexShrink: 0,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      {/* Sophia portrait */}
      <img
        src="/assets/prod-sophia-portrait.webp"
        alt="Sophia"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          filter: "brightness(0.88) saturate(1.3) contrast(1.1)",
          animation: "sef-breathe 6s ease-in-out infinite",
        }}
      />

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(5,11,26,0.80) 0%, rgba(5,11,26,0.10) 50%, transparent 100%)",
      }} />

      {/* Gold ring glow */}
      <div style={{
        position: "absolute",
        top: "38%", left: "50%",
        width: 160, height: 160,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)",
        transform: "translate(-50%,-50%)",
        animation: "sef-ring 5s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Speaking wave bars */}
      {speaking && (
        <div style={{
          position: "absolute", bottom: 72, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 3, alignItems: "center", height: 24,
        }}>
          {[1,1.6,2.2,1.8,1.2,2.0,1.5,1.1,1.9,1.4].map((h, i) => (
            <div key={i} style={{
              width: 3, borderRadius: 3,
              height: 4 + h * 6,
              background: GOLD2,
              opacity: 0.8,
              animation: `sef-pulse ${0.4 + i * 0.07}s ease-in-out ${i * 0.05}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Name badge */}
      <div style={{
        position: "absolute",
        bottom: 16, left: 16, right: 16,
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(5,11,26,0.78)",
        backdropFilter: "blur(8px)",
        borderRadius: 10,
        padding: "8px 12px",
        border: `1px solid rgba(212,175,55,0.22)`,
        zIndex: 2,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: speaking ? "#22C55E" : GOLD,
          boxShadow: speaking ? "0 0 8px #22C55E" : `0 0 8px ${GOLD}`,
          flexShrink: 0,
          animation: speaking ? "sef-pulse 1s ease-in-out infinite" : "none",
        }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "'Playfair Display', serif" }}>
            Sophia
          </div>
          <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {speaking ? "Speaking…" : "AI Emotional Concierge"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface SophiaEntryFlowProps {
  onComplete: (path: Path) => void;
}

export function SophiaEntryFlow({ onComplete }: SophiaEntryFlowProps) {
  // Simli state
  const [sessionToken, setSessionToken]       = useState<string | null>(null);
  const [simliReady, setSimliReady]            = useState(false);
  const [simliClient, setSimliClient]          = useState<SimliClient | null>(null);
  const [simliError, setSimliError]            = useState(false);

  // Flow state
  const [act, setAct]                          = useState<"intro" | "act1" | "act2" | "act3" | "act4">("intro");
  const [choiceKey, setChoiceKey]              = useState<ChoiceKey | null>(null);
  const [speaking, setSpeaking]                = useState(false);
  const [choicesVisible, setChoicesVisible]    = useState(false);
  const [exiting, setExiting]                  = useState(false);

  // Typewriter
  const currentAct = act === "intro" ? ACT_0
    : act === "act1" ? ACT_1
    : act === "act2" && choiceKey ? ACT_2_MAP[choiceKey]
    : act === "act3" && choiceKey ? ACT_3_MAP[choiceKey]
    : ACT_4;

  const fullText = `${currentAct.text}${currentAct.subtext ? " " + currentAct.subtext : ""}`;
  const { displayed, done: typeDone } = useTypewriter(fullText, 24, true);

  // Reveal choices after typewriter completes
  useEffect(() => {
    if (typeDone && currentAct.choices) {
      const t = setTimeout(() => setChoicesVisible(true), 350);
      return () => clearTimeout(t);
    }
    setChoicesVisible(false);
  }, [typeDone, act, choiceKey]);

  // ── Fetch Simli session token on mount ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/simli/token", { method: "POST" });
        if (!res.ok) throw new Error(`token ${res.status}`);
        const data = await res.json() as { session_token?: string; error?: string };
        if (data.session_token) {
          setSessionToken(data.session_token);
        } else {
          setSimliError(true);
        }
      } catch (err) {
        console.warn("[Sophia] Simli token fetch failed, using fallback:", err);
        setSimliError(true);
      }
    })();
  }, []);

  // ── Speak a line via Simli + ElevenLabs ──────────────────────────────────
  const audioCache = useRef<Record<string, ArrayBuffer>>({});

  const speak = useCallback(async (text: string) => {
    if (!simliClient || !simliReady || simliError) return;
    try {
      setSpeaking(true);
      let buf = audioCache.current[text];
      if (!buf) {
        const res = await fetch("/api/simli/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        buf = await res.arrayBuffer();
        audioCache.current[text] = buf;
      }
      const pcm = new Uint8Array(buf);
      // Send in chunks (6000 bytes ≈ 187ms of PCM16 @ 16kHz)
      const CHUNK = 6000;
      for (let i = 0; i < pcm.length; i += CHUNK) {
        simliClient.sendAudioData(pcm.slice(i, i + CHUNK));
        await new Promise<void>((r) => setTimeout(r, 40));
      }
      // Silence padding to flush
      simliClient.sendAudioData(new Uint8Array(6000).fill(0));
      await new Promise<void>((r) => setTimeout(r, 800));
    } catch (err) {
      console.warn("[Sophia] speak error:", err);
    } finally {
      setSpeaking(false);
    }
  }, [simliClient, simliReady, simliError]);

  // ── Auto-speak when act changes ───────────────────────────────────────────
  useEffect(() => {
    if (simliReady && !simliError && fullText) {
      speak(currentAct.text);
    }
  }, [act, simliReady, choiceKey]);

  // ── Handle choices ────────────────────────────────────────────────────────
  const handleChoice = useCallback((key: string) => {
    if (speaking) return;

    if (act === "intro") {
      if (key === "skip") { onComplete("home"); return; }
      setChoicesVisible(false);
      setAct("act1");
      return;
    }

    if (act === "act1") {
      setChoiceKey(key as ChoiceKey);
      setChoicesVisible(false);
      setAct("act2");
      return;
    }

    if (act === "act2") {
      setChoicesVisible(false);
      setAct("act3");
      return;
    }

    if (act === "act3") {
      // Product choice — move to close
      setChoicesVisible(false);
      setAct("act4");
      return;
    }

    if (act === "act4") {
      setExiting(true);
      setTimeout(() => onComplete(key as Path), 500);
      return;
    }
  }, [act, speaking, onComplete]);

  // ── Act 2: auto-advance after typewriter done (no choices) ───────────────
  useEffect(() => {
    if (act === "act2" && typeDone && !currentAct.choices) {
      const t = setTimeout(() => {
        setChoicesVisible(false);
        setAct("act3");
      }, 2800);
      return () => clearTimeout(t);
    }
  }, [act, typeDone]);

  // CSS injection
  useEffect(() => {
    if (document.getElementById("sef-css")) return;
    const tag = document.createElement("style");
    tag.id = "sef-css";
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Act progress ──────────────────────────────────────────────────────────
  const actIndex = { intro: 0, act1: 1, act2: 2, act3: 3, act4: 4 }[act];

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="sophia-entry"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: `radial-gradient(ellipse 120% 90% at 50% 20%, #0D1B3E 0%, #050B1A 60%, #020610 100%)`,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            fontFamily: "Inter, sans-serif", color: TEXT,
            overflow: "hidden",
            padding: "clamp(16px,3vw,32px)",
          }}
        >
          <Stars />

          {/* ── Background glow orbs ── */}
          <div style={{
            position: "absolute", top: "10%", left: "15%",
            width: 400, height: 400, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(11,23,54,0.6) 0%, transparent 70%)",
            filter: "blur(60px)", pointerEvents: "none", zIndex: 0,
          }} />
          <div style={{
            position: "absolute", bottom: "10%", right: "12%",
            width: 350, height: 350, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)",
            filter: "blur(50px)", pointerEvents: "none", zIndex: 0,
          }} />

          {/* ── Main content wrapper ── */}
          <div style={{
            position: "relative", zIndex: 2,
            width: "100%", maxWidth: 900,
            display: "flex",
            flexDirection: "row",
            gap: "clamp(24px,4vw,52px)",
            alignItems: "flex-start",
            justifyContent: "center",
          }}>

            {/* ── LEFT: Sophia avatar ── */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }}
              style={{
                flexShrink: 0,
                width: "clamp(160px,28vw,300px)",
              }}
            >
              {sessionToken && !simliError ? (
                <SimliPanel
                  sessionToken={sessionToken}
                  onReady={(client) => { setSimliClient(client); setSimliReady(true); }}
                  speaking={speaking}
                />
              ) : (
                <FallbackPanel speaking={speaking} />
              )}
            </motion.div>

            {/* ── RIGHT: Dialogue + choices ── */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22,1,0.36,1] }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "clamp(16px,2.5vw,28px)",
                minWidth: 0,
              }}
            >
              {/* Progress */}
              <ProgressDots current={actIndex} total={5} />

              {/* Act label */}
              <div style={{
                fontSize: "clamp(9px,0.85vw,11px)",
                color: `rgba(212,175,55,0.55)`,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontFamily: "Inter, sans-serif",
              }}>
                {act === "intro" ? "Welcome" :
                 act === "act1" ? "Tell Me About You" :
                 act === "act2" ? "Your Story Matters" :
                 act === "act3" ? "What We Create" : "Let's Begin"}
              </div>

              {/* Sophia speech bubble */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={act + (choiceKey ?? "")}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
                  style={{
                    background: "rgba(11,23,54,0.70)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 18,
                    padding: "clamp(18px,2.5vw,28px) clamp(20px,3vw,32px)",
                    backdropFilter: "blur(12px)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Gold top accent line */}
                  <div style={{
                    position: "absolute", top: 0, left: 24, right: 24, height: 1.5,
                    background: `linear-gradient(90deg, transparent, ${GOLD2}, transparent)`,
                    opacity: 0.5,
                  }} />

                  <p style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(15px,1.8vw,20px)",
                    lineHeight: 1.65,
                    color: TEXT,
                    margin: 0,
                    letterSpacing: "0.01em",
                  }}
                    className={!typeDone ? "sef-cursor" : ""}
                  >
                    {displayed}
                  </p>

                  {currentAct.subtext && typeDone && (
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "clamp(12px,1.2vw,14px)",
                        color: `rgba(212,175,55,0.80)`,
                        margin: "14px 0 0",
                        lineHeight: 1.6,
                        fontStyle: "italic",
                      }}
                    >
                      {currentAct.subtext}
                    </motion.p>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Choices */}
              <AnimatePresence>
                {choicesVisible && currentAct.choices && (
                  <motion.div
                    key={act + "-choices"}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.45, ease: [0.22,1,0.36,1] }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "clamp(8px,1.2vw,12px)",
                    }}
                  >
                    {currentAct.choices.map((c, i) => (
                      <motion.button
                        key={c.key}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.35 }}
                        className={`sef-choice-btn${i === 0 ? " primary" : ""}`}
                        onClick={() => handleChoice(c.key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "clamp(12px,1.6vw,16px) clamp(16px,2vw,22px)",
                          textAlign: "left",
                          width: "100%",
                          fontSize: "clamp(13px,1.35vw,15px)",
                          fontWeight: i === 0 ? 600 : 500,
                          color: i === 0 ? "#050B1A" : TEXT,
                          letterSpacing: "0.01em",
                        }}
                      >
                        <span style={{
                          fontSize: "clamp(14px,1.4vw,16px)",
                          flexShrink: 0,
                          opacity: 0.9,
                          color: i === 0 ? "#050B1A" : GOLD2,
                        }}>
                          {c.icon}
                        </span>
                        {c.label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Auto-advance indicator for act2 */}
              {act === "act2" && typeDone && !currentAct.choices && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    color: `rgba(212,175,55,0.55)`,
                    fontSize: 12, letterSpacing: "0.10em",
                    textTransform: "uppercase",
                  }}
                >
                  <div style={{
                    width: 20, height: 2, borderRadius: 1,
                    background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                    animation: "sef-shimmer 2s linear infinite",
                    backgroundSize: "200% auto",
                  }} />
                  Continuing…
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* ── Brand footer ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            style={{
              position: "absolute",
              bottom: "clamp(12px,2vw,20px)",
              left: 0, right: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              zIndex: 3,
            }}
          >
            {["Luxury AI Production", "·", "Emotional Storytelling", "·", "Cinematic Quality"].map((t, i) => (
              <span key={i} style={{
                fontSize: "clamp(8px,0.75vw,10px)",
                color: "rgba(255,255,255,0.20)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                fontFamily: "Inter, sans-serif",
              }}>{t}</span>
            ))}
          </motion.div>

          {/* ── Skip link (always available) ── */}
          {act !== "intro" && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.4 }}
              onClick={() => onComplete("home")}
              style={{
                position: "absolute",
                top: "clamp(12px,2vw,20px)",
                right: "clamp(16px,2.5vw,28px)",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.28)",
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                zIndex: 5,
                transition: "color 0.2s",
                fontFamily: "Inter, sans-serif",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.60)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
            >
              Skip →
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SophiaEntryFlow;
