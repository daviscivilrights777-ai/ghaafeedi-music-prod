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
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    setShowVideo(false);
    setIsLoading(true);

    // ── Step 1: Fetch TTS → ArrayBuffer → Blob → ObjectURL → play ──
    //
    // ROOT CAUSE OF ALL PRIOR FAILURES (confirmed by error log):
    //   "MEDIA_ELEMENT_ERROR: Empty src attribute" / code:4
    //   — play() fired before browser processed the streaming GET URL.
    //   — Handlers were attached AFTER play() was already called.
    //   — No canplay gate — play() hit readyState=0 (HAVE_NOTHING).
    //
    // FIX: fetch → ArrayBuffer → Blob(audio/mpeg) → createObjectURL
    //   All listeners attached BEFORE src is set.
    //   load() called after src. canplay waited before play().
    //   Blob URL is fully buffered — zero race condition possible.
    //
    // GESTURE TRUST: fetch IS inside the speak() call which is downstream
    // of the user tap — Android gesture window is already satisfied by the
    // pre-unlocked silence Audio element created in the tap handler.
    // We still reuse preUnlockedAudioRef if available (extra safety for
    // very tight gesture windows on older Android), but fall back gracefully.

    let ttsPromise: Promise<void>;
    let blobUrl: string | null = null;

    try {
      setDebugMsg("⏳ Fetching TTS...");

      // Fetch audio bytes
      const res = await fetch(`/api/sophia-mobile/tts?text=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);

      setDebugMsg("⏳ Decoding buffer...");
      const arrayBuffer = await res.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
      blobUrl = URL.createObjectURL(blob);

      setDebugMsg("🔗 Blob URL ready — wiring audio...");

      // Pick audio element: reuse pre-unlocked (Android) or create new
      const preUnlocked = preUnlockedAudioRef?.current;
      let audio: HTMLAudioElement;

      if (preUnlocked) {
        setDebugMsg("🔓 pre-unlocked element reused");
        preUnlocked.pause();
        // Clear old src first — avoids stale-state errors on some Android builds
        preUnlocked.removeAttribute("src");
        preUnlocked.load();
        preUnlocked.volume = 1.0;
        audio = preUnlocked;
        if (preUnlockedAudioRef) preUnlockedAudioRef.current = null;
      } else {
        setDebugMsg("🆕 new Audio()");
        audio = new Audio();
        audio.volume = 1.0;
      }

      audioRef.current = audio;

      // ── Wire ALL listeners BEFORE setting src ──────────────────────────
      // This is the critical ordering fix. Setting src triggers internal
      // browser state machine — listeners must be in place before that.
      ttsPromise = new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          audio.oncanplay   = null;
          audio.onplaying   = null;
          audio.onended     = null;
          audio.onerror     = null;
        };

        audio.oncanplay = () => {
          setDebugMsg("▶️ canplay → play()");
          audio.oncanplay = null; // fire once only
          audio.play().then(() => {
            setDebugMsg("▶️ PLAYING!");
            setIsLoading(false);
            onSpeakingChange(true);
          }).catch((e: Error) => {
            cleanup();
            setDebugMsg(`❌ play(): ${e.name}`);
            if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
            if (activeRef.current) onSpeakingChange(false);
            setIsLoading(false);
            reject(e);
          });
        };

        audio.onplaying = () => { setDebugMsg("▶️ PLAYING — audio confirmed!"); };

        audio.onended = () => {
          cleanup();
          setDebugMsg("✅ Done");
          if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
          if (activeRef.current) onSpeakingChange(false);
          resolve();
        };

        audio.onerror = () => {
          cleanup();
          const code = audio.error?.code ?? -1;
          const msg2 = audio.error?.message ?? "unknown";
          setDebugMsg(`❌ code:${code} ${msg2}`);
          if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
          if (activeRef.current) onSpeakingChange(false);
          setIsLoading(false);
          reject(new Error(`HTMLAudio error ${code}: ${msg2}`));
        };

        // ── Set src + load AFTER listeners are attached ────────────────
        audio.src = blobUrl!;
        audio.load();
        // canplay fires → play() called inside handler above
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDebugMsg(`❌ ${msg}`);
      if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
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
