// ============================================================
// FILE: packages/web/src/web/components/SophiaMobileLipSync.tsx
// PURPOSE: Drop-in replacement for static portrait on mobile
//
// USAGE in SophiaEntryFlow.tsx:
//
//   import { SophiaMobileLipSync } from "./SophiaMobileLipSync";
//
//   // Where you currently render the static portrait:
//   {isMobile ? (
//     <SophiaMobileLipSync
//       onReady={(speak) => { speakRef.current = speak; }}
//       onSpeakingChange={setSophiaSpeaking}
//       nextStepText={STEPS[step + 1]?.speech}
//     />
//   ) : (
//     <SimliAvatar ... />
//   )}
// ============================================================

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  memo,
} from "react";
import { MobileLipSyncEngine } from "../../lib/MobileLipSyncEngine";
import type { MobileEngineStatus } from "../../lib/MobileLipSyncEngine";

// ─── Props ────────────────────────────────────────────────────

interface SophiaMobileLipSyncProps {
  onReady: (speak: (text: string, stepIndex?: number) => Promise<void>) => void;
  onSpeakingChange: (speaking: boolean) => void;
  onError?: () => void;
  nextStepText?: string;        // Pre-fetch next step's video
  portraitSrc?: string;         // Fallback static portrait
  className?: string;
  style?: React.CSSProperties;
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
}: SophiaMobileLipSyncProps) {

  const engineRef = useRef<MobileLipSyncEngine | null>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);

  const [status, setStatus]               = useState<MobileEngineStatus>("idle");
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [showVideo, setShowVideo]         = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [useFallback, setUseFallback]     = useState(false);

  // ─── Initialize Engine ────────────────────────────────────

  useEffect(() => {
    const engine = new MobileLipSyncEngine({

      onStatusChange: (s: MobileEngineStatus) => {
        setStatus(s);
        setIsLoading(s === "loading");
      },

      onVideoReady: (videoUrl: string, durationSeconds: number) => {
        setCurrentVideoUrl(videoUrl);
        setShowVideo(true);
        setIsLoading(false);

        // Play the video
        if (videoRef.current) {
          videoRef.current.src = videoUrl;
          videoRef.current.load();
          videoRef.current
            .play()
            .catch(err => {
              console.warn("[SophiaMobile] Autoplay blocked:", err.message);
              // Video will play on next user gesture
            });
        }
      },

      onPlaybackStart: () => {
        onSpeakingChange(true);
      },

      onPlaybackEnd: () => {
        onSpeakingChange(false);
        setShowVideo(false);
      },

      onError: (message: string, shouldUseFallback: boolean) => {
        console.error("[SophiaMobile] Engine error:", message);
        setIsLoading(false);
        if (shouldUseFallback) {
          setUseFallback(true);
          setShowVideo(false);
        }
        onError?.();
      },
    });

    engineRef.current = engine;

    // Expose speak function to parent
    const speakFn = async (text: string, stepIndex = 0) => {
      await engine.speak(text, stepIndex);
    };

    onReady(speakFn);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // ─── Pre-fetch Next Step ─────────────────────────────────

  useEffect(() => {
    if (!nextStepText || !engineRef.current) return;
    // Pre-fetch next dialogue while current is playing
    engineRef.current.preload(nextStepText, 999);
  }, [nextStepText]);

  // ─── Video Event Handlers ────────────────────────────────

  const handleVideoPlay = useCallback(() => {
    onSpeakingChange(true);
  }, [onSpeakingChange]);

  const handleVideoEnded = useCallback(() => {
    onSpeakingChange(false);
    setShowVideo(false);
    // Revert to static portrait after clip ends
  }, [onSpeakingChange]);

  const handleVideoError = useCallback(() => {
    console.warn("[SophiaMobile] Video playback error");
    onSpeakingChange(false);
    setShowVideo(false);
    setUseFallback(true);
  }, [onSpeakingChange]);

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

      {/* ── Static Portrait (default visible) ─────────────── */}
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
          // Hide portrait when video is playing
          opacity: showVideo ? 0 : 1,
          transition: "opacity 200ms ease",
        }}
      />

      {/* ── Lip Sync Video (shown when speaking) ──────────── */}
      {/*
        crossOrigin needed for R2/CDN hosted videos
        playsInline is REQUIRED for iOS Safari
        No autoPlay attr — we call .play() programmatically
      */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        onPlay={handleVideoPlay}
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
          {/* Pulsing dots */}
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#d4a853",
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
          <span style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontFamily: "system-ui",
          }}>
            Sophia is preparing...
          </span>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
});
