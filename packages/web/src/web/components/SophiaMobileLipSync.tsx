// ============================================================
// FILE: packages/web/src/web/components/SophiaMobileLipSync.tsx
// PURPOSE: Audio-first Sophia component — ALL devices
//
// Architecture:
//   1. GET /api/sophia-mobile/tts?text=... → ElevenLabs MP3
//      → decoded via Web Audio API → plays IMMEDIATELY
//   2. POST /api/did/speak → D-ID REST API → talking-head video
//      (fires in parallel, overlays portrait once ready)
//
// D-ID replaced Wav2Lip/Modal — REST only, works on all devices.
// Audio is primary; D-ID video is bonus overlay that appears
// 5-15s after speak() fires (D-ID processing time).
//
// Static portrait always visible; video fades in on top when ready.
// ============================================================

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  memo,
} from "react";

// ─── Props ────────────────────────────────────────────────────

interface SophiaMobileLipSyncProps {
  onReady: (speak: (text: string, stepIndex?: number) => Promise<void>) => void;
  onSpeakingChange: (speaking: boolean) => void;
  onError?: () => void;
  nextStepText?: string;
  portraitSrc?: string;
  className?: string;
  style?: React.CSSProperties;
  audioCtxRef?: React.RefObject<AudioContext | null>;
  preUnlockedAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

// ─── Component ────────────────────────────────────────────────

export const SophiaMobileLipSync = memo(function SophiaMobileLipSync({
  onReady,
  onSpeakingChange,
  onError,
  nextStepText: _nextStepText,
  portraitSrc = "/assets/sophia-lipsync-portrait.png",
  className,
  style,
  audioCtxRef: externalAudioCtxRef,
  preUnlockedAudioRef: _preUnlockedAudioRef,
}: SophiaMobileLipSyncProps) {

  const videoRef        = useRef<HTMLVideoElement>(null);
  const sourceNodeRef   = useRef<AudioBufferSourceNode | null>(null);
  const activeRef       = useRef(true);
  const currentTextRef  = useRef<string>("");

  const [showVideo, setShowVideo]   = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [didStatus, setDidStatus]   = useState<"idle" | "loading" | "playing" | "error">("idle");

  // ─── D-ID video launcher (parallel to audio) ──────────────

  const launchDIDVideo = useCallback(async (text: string) => {
    setDidStatus("loading");
    try {
      const res = await fetch("/api/did/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(90000),
      });

      if (!res.ok || !activeRef.current) {
        setDidStatus("error");
        return;
      }

      const data = await res.json() as { video_url?: string; fallback?: string; error?: string };

      if (!data.video_url || !activeRef.current) {
        setDidStatus("error");
        return;
      }

      // Only show video if this text is still the current one
      if (currentTextRef.current !== text) return;

      console.log(`[D-ID] Video ready: ${data.video_url}`);
      setDidStatus("playing");
      setShowVideo(true);

      if (videoRef.current) {
        videoRef.current.src = data.video_url;
        videoRef.current.load();
        videoRef.current.play().catch(() => {
          setShowVideo(false);
          setDidStatus("error");
        });
      }
    } catch (err) {
      if (activeRef.current) {
        console.warn("[D-ID] Video generation failed — portrait fallback active:", err);
        setDidStatus("error");
      }
    }
  }, []);

  // ─── Core speak function ──────────────────────────────────

  const speak = useCallback(async (text: string, _stepIndex = 0): Promise<void> => {
    if (!activeRef.current) return;

    currentTextRef.current = text;

    // Stop any prior audio source
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch { /* already stopped */ }
      sourceNodeRef.current = null;
    }

    // Reset video
    setShowVideo(false);
    setDidStatus("idle");
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }

    setIsLoading(true);

    // ── Fire D-ID in parallel (don't await — let audio play first) ──
    launchDIDVideo(text).catch(() => {});

    // ── Step 1: Fetch TTS bytes ──────────────────────────────
    let arrayBuffer: ArrayBuffer;
    try {
      const res = await fetch(`/api/sophia-mobile/tts?text=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
      arrayBuffer = await res.arrayBuffer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Sophia] TTS fetch failed:", msg);
      setIsLoading(false);
      onSpeakingChange(false);
      onError?.();
      return;
    }

    if (!activeRef.current) return;

    // ── Step 2: Decode + play via Web Audio API ──────────────
    try {
      let ctx = externalAudioCtxRef?.current ?? null;
      if (!ctx || ctx.state === "closed") {
        const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        ctx = new AC();
        if (externalAudioCtxRef) (externalAudioCtxRef as React.MutableRefObject<AudioContext | null>).current = ctx;
      }

      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch { /* ignore */ }
      }

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (!activeRef.current) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      sourceNodeRef.current = source;

      await new Promise<void>((resolve) => {
        source.onended = () => {
          sourceNodeRef.current = null;
          if (activeRef.current) {
            onSpeakingChange(false);
            // Hide D-ID video when audio ends (sync visual + audio)
            setShowVideo(false);
            setDidStatus("idle");
          }
          resolve();
        };
        source.start(0);
        setIsLoading(false);
        onSpeakingChange(true);
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Sophia] Audio playback failed:", msg);
      setIsLoading(false);
      onSpeakingChange(false);
      onError?.();
    }
  }, [onSpeakingChange, onError, externalAudioCtxRef, launchDIDVideo]);

  // ─── Register speak with parent ───────────────────────────

  useEffect(() => {
    activeRef.current = true;
    onReady(speak);
    return () => {
      activeRef.current = false;
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch { /* ok */ }
        sourceNodeRef.current = null;
      }
    };
  }, [speak, onReady]);

  // ─── Video event handlers ─────────────────────────────────

  const handleVideoEnded = useCallback(() => {
    setShowVideo(false);
    setDidStatus("idle");
  }, []);

  const handleVideoError = useCallback(() => {
    setShowVideo(false);
    setDidStatus("error");
  }, []);

  // ─── Render ───────────────────────────────────────────────

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#0a0a0f",
        overflow: "hidden",
        borderRadius: "inherit",
        ...style,
      }}
    >
      {/* ── Static Portrait (always visible underneath) ──── */}
      <img
        src={portraitSrc}
        alt="Sophia"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
          zIndex: 1,
        }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      {/* ── D-ID Talking Head Video (fades in when ready) ── */}
      <video
        ref={videoRef}
        playsInline
        muted={false}
        crossOrigin="anonymous"
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
          zIndex: 2,
          opacity: showVideo ? 1 : 0,
          transition: "opacity 400ms ease",
        }}
      />

      {/* ── D-ID Processing Indicator ─────────────────────── */}
      {didStatus === "loading" && (
        <div style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(212,175,55,0.12)",
          border: "1px solid rgba(212,175,55,0.30)",
          borderRadius: 20,
          padding: "5px 12px",
          backdropFilter: "blur(8px)",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#D4AF37",
              animation: `did-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          <span style={{
            color: "rgba(212,175,55,0.85)",
            fontSize: 11,
            fontFamily: "Inter, system-ui",
            letterSpacing: "0.04em",
          }}>
            HD Sync
          </span>
        </div>
      )}

      {/* ── Audio Loading Indicator ───────────────────────── */}
      {isLoading && (
        <div style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          borderRadius: 20,
          padding: "6px 14px",
          zIndex: 10,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#D4AF37",
              animation: `did-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "system-ui" }}>
            Sophia is speaking…
          </span>
        </div>
      )}

      <style>{`
        @keyframes did-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
});
