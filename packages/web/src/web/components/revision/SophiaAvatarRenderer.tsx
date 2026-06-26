// ============================================================
// SophiaAvatarRenderer — provider-agnostic Sophia avatar slot
// Providers: static | did | simli (future: ltx | heygen)
// Driven by VITE_AVATAR_PROVIDER env OR member tier prop
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from "react";

// ─── Provider Types ────────────────────────────────────────────────────────────

export type AvatarProvider = "static" | "did" | "simli" | "ltx" | "heygen";

export interface SophiaAvatarRendererProps {
  /** Override provider. Defaults to env VITE_AVATAR_PROVIDER or tier-derived */
  provider?: AvatarProvider;
  /** Member tier — used to derive provider if not overridden */
  tier?: "starter" | "premium" | "elite";
  /** Text to speak when speak() is called */
  speakText?: string;
  /** Called when avatar is ready to speak */
  onReady?: () => void;
  /** Called when speaking starts */
  onSpeakStart?: () => void;
  /** Called when speaking ends */
  onSpeakEnd?: () => void;
  /** expose speak/stop imperatively */
  onRef?: (handle: AvatarHandle) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface AvatarHandle {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isReady: boolean;
  isSpeaking: boolean;
  provider: AvatarProvider;
}

// ─── Provider resolution ───────────────────────────────────────────────────────

function resolveProvider(
  propProvider?: AvatarProvider,
  tier?: "starter" | "premium" | "elite"
): AvatarProvider {
  if (propProvider) return propProvider;
  const envProvider = (import.meta.env.VITE_AVATAR_PROVIDER || "static") as AvatarProvider;
  if (envProvider !== "static") return envProvider;
  // Tier-based upgrade
  if (tier === "elite") return "simli";
  if (tier === "premium") return "did";
  return "static";
}

// ─── Static Animated Sophia (always works, no API needed) ─────────────────────

interface StaticSophiaProps {
  isSpeaking: boolean;
  style?: React.CSSProperties;
}

const StaticSophia: React.FC<StaticSophiaProps> = ({ isSpeaking, style }) => {
  const pulseCount = isSpeaking ? [0, 1, 2, 3, 4] : [];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 60%, #071426 0%, #050B1A 100%)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Atmospheric glow */}
      <div
        style={{
          position: "absolute",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)",
          animation: isSpeaking ? "sophiaGlow 1.2s ease-in-out infinite alternate" : "sophiaGlowIdle 3s ease-in-out infinite alternate",
        }}
      />

      {/* Portrait frame */}
      <div
        style={{
          position: "relative",
          width: "220px",
          height: "280px",
          borderRadius: "120px 120px 90px 90px",
          overflow: "hidden",
          border: `2px solid rgba(212,175,55,${isSpeaking ? 0.6 : 0.25})`,
          boxShadow: isSpeaking
            ? "0 0 40px rgba(212,175,55,0.35), 0 0 80px rgba(212,175,55,0.15)"
            : "0 0 20px rgba(212,175,55,0.12)",
          transition: "box-shadow 0.3s ease",
        }}
      >
        <img
          src="/assets/sophia-poster.png"
          alt="Sophia AI"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 15%",
            filter: "brightness(0.92) contrast(1.1) saturate(1.15)",
          }}
          onError={(e) => {
            // fallback gradient portrait
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {/* Fallback portrait if image fails */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, #1a2a4a 0%, #071426 60%, #050B1A 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="30" r="22" fill="rgba(212,175,55,0.2)" stroke="rgba(212,175,55,0.5)" strokeWidth="1.5"/>
            <path d="M10 80 Q40 55 70 80" fill="rgba(212,175,55,0.15)" stroke="rgba(212,175,55,0.4)" strokeWidth="1.5"/>
          </svg>
        </div>

        {/* Speaking mouth animation overlay */}
        {isSpeaking && (
          <div
            style={{
              position: "absolute",
              bottom: "28px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "3px",
              alignItems: "flex-end",
              height: "16px",
            }}
          >
            {[0.6, 1, 0.7, 1.2, 0.5].map((h, i) => (
              <div
                key={i}
                style={{
                  width: "3px",
                  height: `${h * 8}px`,
                  background: "rgba(212,175,55,0.8)",
                  borderRadius: "2px",
                  animation: `sophiaMouth ${0.4 + i * 0.07}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Speaking pulses */}
      {pulseCount.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: `${240 + i * 40}px`,
            height: `${240 + i * 40}px`,
            borderRadius: "50%",
            border: "1px solid rgba(212,175,55,0.15)",
            animation: `sophiaPulse 2s ease-out infinite`,
            animationDelay: `${i * 0.4}s`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Provider badge */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          right: "12px",
          background: "rgba(5,11,26,0.85)",
          border: "1px solid rgba(212,175,55,0.3)",
          borderRadius: "6px",
          padding: "3px 8px",
          fontSize: "9px",
          color: "rgba(212,175,55,0.7)",
          letterSpacing: "0.08em",
          fontFamily: "Inter, sans-serif",
        }}
      >
        SOPHIA AI
      </div>

      <style>{`
        @keyframes sophiaGlow {
          from { opacity: 0.6; transform: scale(0.95); }
          to   { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes sophiaGlowIdle {
          from { opacity: 0.4; transform: scale(0.98); }
          to   { opacity: 0.7; transform: scale(1.02); }
        }
        @keyframes sophiaMouth {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.4); }
        }
        @keyframes sophiaPulse {
          0%   { opacity: 0.5; transform: scale(0.8); }
          100% { opacity: 0;   transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
};

// ─── D-ID Provider ────────────────────────────────────────────────────────────

interface DIDSophiaProps {
  onReady?: () => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onHandleReady?: (h: { speak: (t: string) => Promise<void>; stop: () => void }) => void;
  style?: React.CSSProperties;
}

const DIDSophia: React.FC<DIDSophiaProps> = ({ onReady, onSpeakStart, onSpeakEnd, onHandleReady, style }) => {
  const [status, setStatus] = useState<"connecting" | "ready" | "speaking" | "error">("connecting");
  const streamIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const DID_KEY = import.meta.env.VITE_DID_API_KEY || "";
  const SOPHIA_IMG = "/assets/sophia-poster.png";
  const ELEVEN_VOICE = "pFZP5JQG7iQjIQuC4Bku";

  const initStream = useCallback(async () => {
    try {
      const res = await fetch("https://api.d-id.com/talks/streams", {
        method: "POST",
        headers: {
          Authorization: `Basic ${DID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: window.location.origin + SOPHIA_IMG,
          driver_url: "bank://lively",
        }),
      });
      if (!res.ok) throw new Error(`D-ID stream init: ${res.status}`);
      const data = await res.json();
      streamIdRef.current = data.id;
      sessionIdRef.current = data.session_id;

      const pc = new RTCPeerConnection({ iceServers: data.ice_servers });
      peerRef.current = pc;

      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) {
          videoRef.current.srcObject = e.streams[0];
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await fetch(`https://api.d-id.com/talks/streams/${data.id}/sdp`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${DID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answer: offer, session_id: data.session_id }),
      });

      setStatus("ready");
      onReady?.();
    } catch (e) {
      console.warn("D-ID init failed, falling back:", e);
      setStatus("error");
    }
  }, [DID_KEY, onReady]);

  useEffect(() => {
    if (DID_KEY) initStream();
    else setStatus("error");
    return () => {
      peerRef.current?.close();
    };
  }, [initStream, DID_KEY]);

  const speak = useCallback(async (text: string) => {
    if (!streamIdRef.current || !sessionIdRef.current) return;
    setStatus("speaking");
    onSpeakStart?.();
    try {
      await fetch(`https://api.d-id.com/talks/streams/${streamIdRef.current}`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${DID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: {
            type: "text",
            input: text,
            provider: { type: "elevenlabs", voice_id: ELEVEN_VOICE },
          },
          session_id: sessionIdRef.current,
        }),
      });
    } finally {
      setTimeout(() => {
        setStatus("ready");
        onSpeakEnd?.();
      }, Math.max(3000, text.length * 60));
    }
  }, [DID_KEY, onSpeakEnd, onSpeakStart]);

  const stop = useCallback(() => {
    setStatus("ready");
    onSpeakEnd?.();
  }, [onSpeakEnd]);

  useEffect(() => {
    onHandleReady?.({ speak, stop });
  }, [speak, stop, onHandleReady]);

  if (status === "error") {
    return <StaticSophia isSpeaking={false} style={style} />;
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...style }}>
      {status === "connecting" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#050B1A" }}>
          <StaticSophia isSpeaking={false} />
          <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", color: "rgba(212,175,55,0.7)", fontSize: "12px", fontFamily: "Inter,sans-serif" }}>
            Connecting Sophia...
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: status === "connecting" ? "none" : "block",
        }}
      />
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const SophiaAvatarRenderer: React.FC<SophiaAvatarRendererProps> = ({
  provider: propProvider,
  tier = "starter",
  speakText,
  onReady,
  onSpeakStart,
  onSpeakEnd,
  onRef,
  className,
  style,
}) => {
  const resolvedProvider = resolveProvider(propProvider, tier);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady] = useState(resolvedProvider === "static");
  const handleRef = useRef<{ speak: (t: string) => Promise<void>; stop: () => void } | null>(null);

  // TTS for static provider (ElevenLabs REST)
  const speakStatic = useCallback(async (text: string) => {
    setIsSpeaking(true);
    onSpeakStart?.();
    try {
      const ELEVEN_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
      if (!ELEVEN_KEY) {
        await new Promise((r) => setTimeout(r, Math.max(2000, text.length * 50)));
        return;
      }
      const resp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/pFZP5JQG7iQjIQuC4Bku/stream`,
        {
          method: "POST",
          headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: { stability: 0.5, similarity_boost: 0.85 },
          }),
        }
      );
      if (!resp.ok) throw new Error("ElevenLabs TTS failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise<void>((res, rej) => {
        audio.onended = () => { URL.revokeObjectURL(url); res(); };
        audio.onerror = rej;
        audio.play();
      });
    } catch (e) {
      console.warn("Static TTS failed:", e);
      await new Promise((r) => setTimeout(r, Math.max(2000, text.length * 50)));
    } finally {
      setIsSpeaking(false);
      onSpeakEnd?.();
    }
  }, [onSpeakEnd, onSpeakStart]);

  const stopStatic = useCallback(() => {
    setIsSpeaking(false);
    onSpeakEnd?.();
  }, [onSpeakEnd]);

  // Expose handle
  useEffect(() => {
    if (resolvedProvider === "static") {
      setIsReady(true);
      onReady?.();
      const handle: AvatarHandle = {
        speak: speakStatic,
        stop: stopStatic,
        get isReady() { return true; },
        get isSpeaking() { return isSpeaking; },
        provider: "static",
      };
      onRef?.(handle);
    }
  }, [resolvedProvider]); // eslint-disable-line

  // Speak when speakText prop changes
  useEffect(() => {
    if (speakText && isReady && resolvedProvider === "static") {
      speakStatic(speakText);
    }
  }, [speakText]); // eslint-disable-line

  const defaultStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: "16px",
    overflow: "hidden",
    ...style,
  };

  if (resolvedProvider === "did") {
    return (
      <div className={className} style={defaultStyle}>
        <DIDSophia
          onReady={() => { setIsReady(true); onReady?.(); }}
          onSpeakStart={() => { setIsSpeaking(true); onSpeakStart?.(); }}
          onSpeakEnd={() => { setIsSpeaking(false); onSpeakEnd?.(); }}
          onHandleReady={(h) => {
            handleRef.current = h;
            const handle: AvatarHandle = {
              speak: h.speak,
              stop: h.stop,
              get isReady() { return isReady; },
              get isSpeaking() { return isSpeaking; },
              provider: "did",
            };
            onRef?.(handle);
          }}
        />
      </div>
    );
  }

  // Default: static
  return (
    <div className={className} style={defaultStyle}>
      <StaticSophia isSpeaking={isSpeaking} />
    </div>
  );
};

export default SophiaAvatarRenderer;
