// ============================================================
// FILE: packages/web/src/web/components/SimliAvatar.tsx
// PURPOSE: React component wrapping SimliAvatarEngine
//
// Replaces the inline SimliAvatar component inside
// SophiaEntryFlow.tsx (~165-465).
//
// This component is now clean and simple because all the
// complex lifecycle logic lives in SimliAvatarEngine.ts
//
// RUNABLE: Replace the SimliAvatar component definition
// inside SophiaEntryFlow.tsx with an import of this file.
// ============================================================

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  memo
} from "react";
import { SimliAvatarEngine, EngineStatus, SpeakFn } from "../../lib/SimliAvatarEngine";

// ─── Props ────────────────────────────────────────────────────

interface SimliAvatarProps {
  sessionToken: string | null;
  onSpeakingChange: (speaking: boolean) => void;
  onReady: (speak: SpeakFn) => void;
  onError: () => void;
  onFrameReceived?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Status Display Map ───────────────────────────────────────

const STATUS_MESSAGES: Record<EngineStatus, string> = {
  idle:              "Initializing...",
  fetching_token:    "Connecting...",
  constructing:      "Building connection...",
  starting:          "Starting session...",
  waiting_for_track: "Establishing video...",
  waiting_for_frame: "Rendering...",
  ready:             "Ready",
  speaking:          "Speaking",
  error:             "Connection error",
};

// ─── Component ────────────────────────────────────────────────

export const SimliAvatar = memo(function SimliAvatar({
  sessionToken,
  onSpeakingChange,
  onReady,
  onError,
  onFrameReceived,
  className,
  style,
}: SimliAvatarProps) {

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const engineRef = useRef<SimliAvatarEngine | null>(null);
  const initializedRef = useRef(false);

  const [status, setStatus] = useState<EngineStatus>("idle");
  const [visible, setVisible] = useState(false);

  // Handle frame received — make video visible
  const handleFrameReceived = useCallback(() => {
    setVisible(true);
    onFrameReceived?.();
  }, [onFrameReceived]);

  // Initialize engine when token arrives
  useEffect(() => {
    if (!sessionToken) return;
    if (initializedRef.current) return;
    if (!videoRef.current || !audioRef.current) return;

    initializedRef.current = true;

    const engine = new SimliAvatarEngine(
      videoRef.current,
      audioRef.current,
      {
        onStatusChange: setStatus,
        onSpeakingChange,
        onReady,
        onError,
        onFrameReceived: handleFrameReceived,
      }
    );

    engineRef.current = engine;
    engine.initialize(sessionToken);

    return () => {
      engine.destroy();
      engineRef.current = null;
      initializedRef.current = false;
    };
  }, [sessionToken]);

  // Expose audio unlock to parent via user gesture
  const handleUserGesture = useCallback(() => {
    engineRef.current?.unlockAudio();
  }, []);

  const isReady = status === "ready" || status === "speaking";
  const isConnecting = !isReady && status !== "error";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#0a0a0f",
        ...style,
      }}
      onClick={handleUserGesture}
    >
      {/* ── Video Element ──────────────────────────────────── */}
      {/*
        CRITICAL: opacity MUST be > 0 at ALL times.
        opacity: 0 causes Chrome/Safari to throttle
        requestVideoFrameCallback, which prevents the
        SimliClient "start" event from ever firing.
        0.001 is invisible to human eye but keeps rVFC alive.
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: visible ? 1 : 0.001,
          transition: "opacity 800ms ease",
        }}
      />

      {/* ── Hidden Audio Element ───────────────────────────── */}
      {/*
        This is for Simli's internal audio output only.
        Do NOT use this for TTS MP3 playback.
        Simli manages this element internally.
      */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />

      {/* ── Loading Overlay ────────────────────────────────── */}
      {isConnecting && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10, 10, 15, 0.85)",
            backdropFilter: "blur(8px)",
            gap: "16px",
          }}
        >
          {/* Animated ring */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.1)",
              borderTopColor: "#d4a853",
              animation: "spin 1s linear infinite",
            }}
          />

          {/* Status text */}
          <p style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "14px",
            fontFamily: "system-ui",
            letterSpacing: "0.05em",
            margin: 0,
          }}>
            {STATUS_MESSAGES[status]}
          </p>
        </div>
      )}

      {/* ── Error State ────────────────────────────────────── */}
      {status === "error" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10, 10, 15, 0.9)",
          }}
        >
          <p style={{
            color: "rgba(255,100,100,0.8)",
            fontSize: "13px",
            fontFamily: "system-ui",
            textAlign: "center",
            padding: "0 24px",
          }}>
            Connection issue — audio continues
          </p>
        </div>
      )}

      {/* CSS animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});
