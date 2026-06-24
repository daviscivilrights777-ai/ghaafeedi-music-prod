// ============================================================
// FILE: packages/web/src/web/components/SophiaMobileLipSync.tsx
//
// Architecture:
//   - Audio: POST /api/sophia/tts (server proxy → ElevenLabs)
//     Key stays server-side. No VITE_ env vars needed.
//   - Video: Portrait image always visible.
//     D-ID is disabled (free trial credits exhausted).
//     Lip-sync video upgrade: Phase 9 (Wav2Lip on Modal GPU).
//
// Works on ALL devices: desktop, iOS, Android.
// ============================================================

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  memo,
} from "react";

// ─── Config ───────────────────────────────────────────────────
const SOPHIA_PORTRAIT =
  "https://pub-bc7b203485814e1186102277ad450211.r2.dev/sophia-lipsync-portrait.png";

// ─── Props ────────────────────────────────────────────────────
interface SophiaMobileLipSyncProps {
  onReady:          (speak: (text: string, stepIndex?: number) => Promise<void>) => void;
  onSpeakingChange: (speaking: boolean) => void;
  onError?:         () => void;
  nextStepText?:    string;
  portraitSrc?:     string;
  className?:       string;
  style?:           React.CSSProperties;
  audioCtxRef?:     React.RefObject<AudioContext | null>;
  preUnlockedAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

// ─── Component ────────────────────────────────────────────────

export const SophiaMobileLipSync = memo(function SophiaMobileLipSync({
  onReady,
  onSpeakingChange,
  onError,
  portraitSrc,
  className,
  style,
  audioCtxRef: externalAudioCtxRef,
}: SophiaMobileLipSyncProps) {

  const sourceNodeRef  = useRef<AudioBufferSourceNode | null>(null);
  const activeRef      = useRef(true);
  const [isLoading, setIsLoading] = useState(false);

  const portrait = portraitSrc ?? SOPHIA_PORTRAIT;

  // ── Core speak: fetch audio from server proxy, play via Web Audio ──
  const speak = useCallback(async (text: string, _stepIndex = 0): Promise<void> => {
    if (!activeRef.current) return;

    // Stop prior audio
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch { /**/ }
      sourceNodeRef.current = null;
    }

    setIsLoading(true);
    onSpeakingChange(false);

    // Fetch TTS audio from server proxy — no API key in browser
    let arrayBuffer: ArrayBuffer;
    try {
      const res = await fetch("https://sophia-tts.daviscivilrights777.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`TTS proxy ${res.status}: ${errText}`);
      }

      arrayBuffer = await res.arrayBuffer();
    } catch (err) {
      console.error("[Sophia] TTS fetch failed:", err);
      setIsLoading(false);
      onSpeakingChange(false);
      onError?.();
      return;
    }

    if (!activeRef.current) return;

    // Decode + play via Web Audio API
    try {
      let ctx = externalAudioCtxRef?.current ?? null;
      if (!ctx || ctx.state === "closed") {
        const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        ctx = new AC();
        if (externalAudioCtxRef)
          (externalAudioCtxRef as React.MutableRefObject<AudioContext | null>).current = ctx;
      }
      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch { /**/ }
      }

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (!activeRef.current) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      sourceNodeRef.current = source;

      await new Promise<void>(resolve => {
        source.onended = () => {
          sourceNodeRef.current = null;
          if (activeRef.current) onSpeakingChange(false);
          resolve();
        };
        source.start(0);
        setIsLoading(false);
        onSpeakingChange(true);
      });

    } catch (err) {
      console.error("[Sophia] Audio decode/play failed:", err);
      setIsLoading(false);
      onSpeakingChange(false);
      onError?.();
    }
  }, [onSpeakingChange, onError, externalAudioCtxRef]);

  // ── Register with parent ──
  useEffect(() => {
    activeRef.current = true;
    onReady(speak);
    return () => {
      activeRef.current = false;
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch { /**/ }
        sourceNodeRef.current = null;
      }
    };
  }, [speak, onReady]);

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
      {/* Static portrait */}
      <img
        src={portrait}
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

      {/* Audio loading indicator */}
      {isLoading && (
        <div style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(0,0,0,0.62)",
          backdropFilter: "blur(8px)",
          borderRadius: 20,
          padding: "6px 14px",
          zIndex: 10,
          whiteSpace: "nowrap",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#D4AF37",
              animation: `sophia-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          <span style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 12,
            fontFamily: "Inter, system-ui",
          }}>
            Sophia is speaking…
          </span>
        </div>
      )}

      <style>{`
        @keyframes sophia-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
});
