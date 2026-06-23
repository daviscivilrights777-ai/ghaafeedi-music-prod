// ============================================================
// FILE: packages/web/src/web/components/SophiaMobileLipSync.tsx
// PURPOSE: Audio-first Sophia component — ALL devices
//
// Architecture:
//   1. POST /api/sophia-mobile/tts  → ElevenLabs MP3 → plays IMMEDIATELY
//   2. POST /api/sophia-mobile/speak → Modal Wav2Lip → optional video overlay
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
  /** Pre-unlocked Audio element — created + .play()'d synchronously in tap handler.
   *  speak() reuses this element (swaps .src) to bypass Android Chrome autoplay block. */
  preUnlockedAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

// ─── Audio-first speak engine ─────────────────────────────────
// Returns a speak() function that:
//   1. Fires TTS immediately → audio starts in ~300ms
//   2. In parallel, tries Modal Wav2Lip → if ready before audio ends, shows video
//   3. If Modal fails/slow → audio still played, no silence

async function fetchTTSAudio(text: string): Promise<AudioBuffer | null> {
  // Not used — we use HTMLAudioElement for simplest compat
  return null;
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

  const videoRef         = useRef<HTMLVideoElement>(null);
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const activeRef        = useRef(true);

  // No local copy needed — we read externalAudioCtxRef.current directly at call time
  // This means we always get the freshest AudioContext even if it was created after mount

  const [showVideo, setShowVideo]     = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [videoUrl, setVideoUrl]       = useState<string | null>(null);
  const [debugMsg, setDebugMsg]       = useState<string>("");

  // ─── Core speak function ──────────────────────────────────

  const speak = useCallback(async (text: string, stepIndex = 0): Promise<void> => {
    if (!activeRef.current) return;

    // Stop any prior audio/video
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setShowVideo(false);
    setIsLoading(true);

    // ── Step 1: TTS via GET src URL + pre-unlocked HTMLAudioElement ──
    //
    // ROOT CAUSE OF ALL PRIOR FAILURES:
    // Android Chrome blocks audio.play() after ANY await (fetch, arrayBuffer, etc.)
    // because the gesture trust window (~1s) expires before async work completes.
    //
    // GUARANTEED FIX:
    // 1. Parent tap handler creates Audio element + calls .play() SYNCHRONOUSLY (silence unlock)
    // 2. We reuse that trusted element — swap .src to GET TTS URL, call .load() + .play()
    // 3. No fetch, no blob, no gesture window issue — browser streams audio natively
    //
    // GET /api/sophia-mobile/tts?text=... returns audio/mpeg stream directly.
    let ttsPromise: Promise<void>;
    try {
      const ttsUrl = `/api/sophia-mobile/tts?text=${encodeURIComponent(text)}`;
      setDebugMsg(`⏳ Loading audio...`);

      // Reuse pre-unlocked audio element (Android gesture-trust preserved)
      // Fallback: create new Audio() for desktop/autoplay environments
      const preUnlocked = preUnlockedAudioRef?.current;
      let audio: HTMLAudioElement;

      if (preUnlocked) {
        setDebugMsg("🔓 pre-unlocked → src swap");
        preUnlocked.pause();
        preUnlocked.volume = 1.0;
        preUnlocked.src = ttsUrl;  // assign BEFORE load/play
        preUnlocked.load();
        audio = preUnlocked;
        if (preUnlockedAudioRef) preUnlockedAudioRef.current = null;
      } else {
        setDebugMsg("🆕 new Audio (desktop)");
        audio = new Audio(ttsUrl);
        audio.volume = 1.0;
      }

      audioRef.current = audio;
      setIsLoading(false);
      onSpeakingChange(true);
      setDebugMsg("▶️ play()...");

      ttsPromise = new Promise<void>((resolve, reject) => {
        audio.onplaying = () => { setDebugMsg("▶️ PLAYING!"); };
        audio.onended = () => {
          setDebugMsg("✅ Done");
          if (activeRef.current) onSpeakingChange(false);
          resolve();
        };
        audio.onerror = () => {
          const code = audio.error?.code ?? -1;
          const msg2 = audio.error?.message ?? "unknown";
          setDebugMsg(`❌ code:${code} ${msg2}`);
          if (activeRef.current) onSpeakingChange(false);
          reject(new Error(`HTMLAudio error ${code}`));
        };

        audio.play().then(() => {
          setDebugMsg("▶️ play() OK");
        }).catch((e: Error) => {
          setDebugMsg(`❌ play(): ${e.name} ${e.message}`);
          if (activeRef.current) onSpeakingChange(false);
          reject(e);
        });
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
    // Fire and forget — if it arrives while audio plays, show it
    const wav2lipPromise = (async () => {
      try {
        const videoRes = await fetch("/api/sophia-mobile/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, stepIndex }),
          signal: AbortSignal.timeout(30000), // Short timeout — don't wait forever
        });

        if (!videoRes.ok) return; // Modal down — silent fallback is fine

        const data = await videoRes.json() as { video_url?: string };
        if (!data.video_url || !activeRef.current) return;

        setVideoUrl(data.video_url);

        // Only show video if audio is still playing
        if (audioRef.current && !audioRef.current.ended) {
          setShowVideo(true);
          if (videoRef.current) {
            videoRef.current.src = data.video_url;
            videoRef.current.load();
            videoRef.current.play().catch(() => {});
          }
        }
      } catch {
        // Wav2Lip failed — audio already playing, no visual change needed
      }
    })();

    // Wait for audio to finish
    await ttsPromise;

    // Clean up video
    setShowVideo(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
  }, [onSpeakingChange, onError]);

  // ─── Register speak with parent on mount ─────────────────

  useEffect(() => {
    activeRef.current = true;
    onReady(speak);
    return () => {
      activeRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
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
