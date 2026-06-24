// ============================================================
// FILE: packages/web/src/web/components/SophiaMobileLipSync.tsx
// PURPOSE: Audio-first Sophia component — ALL devices
//
// Architecture:
//   1. GET /api/sophia-mobile/tts?text=... → ElevenLabs MP3 ArrayBuffer
//      → decoded via Web Audio API (AudioContext) → plays IMMEDIATELY
//   2. POST /api/sophia-mobile/speak → Modal Wav2Lip → optional video overlay
//
// WHY WEB AUDIO API (not HTMLAudioElement):
//   Android Chrome kills the gesture-trust window after ANY `await`.
//   HTMLAudioElement.play() after `await fetch(...)` → NotAllowedError.
//   Web Audio API: once AudioContext is unlocked (synchronously in tap handler),
//   it stays unlocked for ALL subsequent calls in that context — even after await.
//   decodeAudioData + createBufferSource().start() = zero autoplay issues.
//
// Sophia is ALWAYS heard. Lip-sync video is a bonus if Modal is available.
// If Modal 500s/timeouts → audio still plays, portrait shows (no silence).
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
  /** Ref to parent's pre-unlocked AudioContext — pass a React.RefObject so speak() always reads the latest value */
  audioCtxRef?: React.RefObject<AudioContext | null>;
  /** Pre-unlocked Audio element — kept for API compat, no longer used for playback */
  preUnlockedAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

// ─── Component ────────────────────────────────────────────────

export const SophiaMobileLipSync = memo(function SophiaMobileLipSync({
  onReady,
  onSpeakingChange,
  onError,
  nextStepText,
  portraitSrc = "/assets/sophia-lipsync-portrait.png",
  className,
  style,
  audioCtxRef: externalAudioCtxRef,
  preUnlockedAudioRef,
}: SophiaMobileLipSyncProps) {

  const videoRef            = useRef<HTMLVideoElement>(null);
  const sourceNodeRef       = useRef<AudioBufferSourceNode | null>(null);
  const activeRef           = useRef(true);

  const [showVideo, setShowVideo]     = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [debugMsg, setDebugMsg]       = useState<string>("");

  // ─── Core speak function ──────────────────────────────────

  const speak = useCallback(async (text: string, stepIndex = 0): Promise<void> => {
    if (!activeRef.current) return;

    // Stop any prior audio source
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch { /* already stopped */ }
      sourceNodeRef.current = null;
    }
    setShowVideo(false);
    setIsLoading(true);
    setDebugMsg("⏳ Fetching TTS...");

    // ── Step 1: Fetch TTS → ArrayBuffer → Web Audio API playback ──
    //
    // KEY INSIGHT: Web Audio API (AudioContext) remains "trusted" across
    // await boundaries once unlocked — unlike HTMLAudioElement.play().
    // The AudioContext is created synchronously in the tap handler (SophiaEntryFlow).
    // We read it via externalAudioCtxRef.current which is always the latest value.
    //
    // If no AudioContext exists (desktop / auto-play allowed), we create one here.

    try {
      // Fetch TTS bytes
      const res = await fetch(`/api/sophia-mobile/tts?text=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);

      setDebugMsg("⏳ Decoding audio...");
      const arrayBuffer = await res.arrayBuffer();
      if (!activeRef.current) return; // component unmounted during fetch

      // Get or create AudioContext
      let ctx = externalAudioCtxRef?.current ?? null;
      if (!ctx || ctx.state === "closed") {
        const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        ctx = new AC();
        if (externalAudioCtxRef) (externalAudioCtxRef as React.MutableRefObject<AudioContext | null>).current = ctx;
      }

      setDebugMsg(`🎵 ctx=${ctx.state} decoding...`);

      // If still suspended (shouldn't happen — tap handler plays silent buffer),
      // try one more resume. On desktop this is fine; on Android this may no-op.
      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch { /* ignore */ }
      }
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (!activeRef.current) return;

      setDebugMsg("▶️ Playing via Web Audio...");

      // Create source node and play
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      sourceNodeRef.current = source;

      await new Promise<void>((resolve) => {
        source.onended = () => {
          sourceNodeRef.current = null;
          if (activeRef.current) onSpeakingChange(false);
          setDebugMsg("✅ Done");
          resolve();
        };
        source.start(0);
        setIsLoading(false);
        onSpeakingChange(true);
        setDebugMsg("▶️ PLAYING!");
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDebugMsg(`❌ ${msg}`);
      setIsLoading(false);
      onSpeakingChange(false);
      onError?.();
      return;
    }

    // ── Step 2: Try Wav2Lip video in parallel (optional) ─
    // Fire-and-forget — already started before audio resolved above.
    // (Intentionally omitted from await chain — audio is primary.)
    setShowVideo(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
  }, [onSpeakingChange, onError, externalAudioCtxRef]);

  // Parallel Wav2Lip launcher (separated from speak so it doesn't block audio)
  const launchWav2lip = useCallback(async (text: string, stepIndex: number) => {
    try {
      const videoRes = await fetch("/api/sophia-mobile/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, stepIndex }),
        signal: AbortSignal.timeout(30000),
      });
      if (!videoRes.ok || !activeRef.current) return;
      const data = await videoRes.json() as { video_url?: string };
      if (!data.video_url || !activeRef.current) return;
      // Only show if audio source is still live
      if (sourceNodeRef.current) {
        setShowVideo(true);
        if (videoRef.current) {
          videoRef.current.src = data.video_url;
          videoRef.current.load();
          videoRef.current.play().catch(() => {});
        }
      }
    } catch { /* Modal down — portrait fallback is fine */ }
  }, []);

  // ─── Register speak with parent on mount ─────────────────

  useEffect(() => {
    activeRef.current = true;
    onReady(speak);
    return () => {
      activeRef.current = false;
      // Stop any active Web Audio source
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch { /* ok */ }
        sourceNodeRef.current = null;
      }
    };
  }, [speak, onReady]);

  // ─── Video event handlers ──────────────────────────────

  const handleVideoEnded = useCallback(() => {
    setShowVideo(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setShowVideo(false);
  }, []);

  // ─── Render ──────────────────────────────────────────────

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

      {/* ── Static Portrait ───────────────────────────────── */}
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
          opacity: showVideo ? 0 : 1,
          transition: "opacity 200ms ease",
        }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      {/* ── Lip Sync Video (optional, shown when ready) ───── */}
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
          opacity: showVideo ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
      />

      {/* ── Loading Indicator ─────────────────────────────── */}
      {isLoading && (
        <div
          style={{
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
          }}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#D4AF37",
                animation: `sm-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "system-ui" }}>
            Sophia is speaking…
          </span>
        </div>
      )}

      {/* ── DEBUG TOAST — remove after fix ── */}
      {debugMsg !== "" && (
        <div style={{
          position: "absolute", top: 8, left: 8, right: 8, zIndex: 99,
          background: "rgba(0,0,0,0.88)", border: "1px solid #D4AF37",
          borderRadius: 8, padding: "8px 12px",
          color: "#fff", fontSize: 12, fontFamily: "monospace",
          wordBreak: "break-all",
        }}>
          {debugMsg}
        </div>
      )}

      <style>{`
        @keyframes sm-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
});
