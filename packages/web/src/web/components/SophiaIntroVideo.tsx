import { useEffect, useRef, useState, useCallback } from "react";

interface SophiaIntroVideoProps {
  onComplete?: () => void;
}

export function SophiaIntroVideo({ onComplete }: SophiaIntroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [showCta, setShowCta] = useState(false);
  const [showUnmute, setShowUnmute] = useState(true);
  const [ctaBorderDraw, setCtaBorderDraw] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [progress, setProgress] = useState(0);

  const VIDEO_URL = "/assets/sophia-intro.mp4";
  const POSTER_URL = "/assets/sophia-intro-poster.png";
  const VIDEO_DURATION = 182; // seconds (3:30)
  const CTA_TRIGGER = 170; // show CTA at 3:20 (200s)

  // Auto-play muted on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.play().catch(() => {
      // Autoplay blocked — show unmute prompt
    });
  }, []);

  // Time update handler
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const t = video.currentTime;
    setProgress((t / VIDEO_DURATION) * 100);

    // Show CTA at 100s
    if (t >= CTA_TRIGGER && !showCta) {
      setShowCta(true);
      setTimeout(() => setCtaBorderDraw(true), 100);
    }
  }, [showCta]);

  // Video ended
  const handleEnded = useCallback(() => {
    setShowCta(true);
    setTimeout(() => setCtaBorderDraw(true), 100);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted) {
      setShowUnmute(false);
    }
  }, []);

  // Enter Ghaafeedi Music
  const handleEnter = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        poster={POSTER_URL}
        muted
        playsInline
        autoPlay
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => setVideoError(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Gradient overlay — subtle vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "2px",
          background: "rgba(255,255,255,0.1)",
          width: "100%",
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #D4AF37, #F4D27A)",
            transition: "width 0.5s linear",
          }}
        />
      </div>

      {/* Logo watermark — top left */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 24,
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 10,
          opacity: 0.85,
        }}
      >
        <img
          src="/assets/ghaafeedi-logo-transparent.png"
          alt="Ghaafeedi Music"
          style={{ height: 32, objectFit: "contain" }}
        />
      </div>

      {/* Unmute button — top right */}
      {showUnmute && (
        <button
          onClick={toggleMute}
          style={{
            position: "absolute",
            top: 20,
            right: 24,
            zIndex: 10,
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 40,
            padding: "8px 18px",
            color: "#fff",
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            letterSpacing: "0.02em",
            transition: "background 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(212,175,55,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.12)";
          }}
        >
          {muted ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
              🔊 Tap for sound
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              Sound on
            </>
          )}
        </button>
      )}

      {/* Video error fallback */}
      {videoError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            background: "radial-gradient(ellipse at center, #0B1736 0%, #050B1A 100%)",
            zIndex: 5,
          }}
        >
          <img
            src="/assets/ghaafeedi-logo-transparent.png"
            alt="Ghaafeedi Music"
            style={{ height: 64, objectFit: "contain" }}
          />
          <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
            Welcome to Ghaafeedi Music
          </p>
          <button
            onClick={handleEnter}
            style={ctaStyle(true)}
          >
            Enter Ghaafeedi Music →
          </button>
        </div>
      )}

      {/* CTA — bottom center, appears at 100s with border-draw animation */}
      {showCta && !videoError && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            animation: "fadeSlideUp 0.8s ease forwards",
          }}
        >
          <button
            onClick={handleEnter}
            className={ctaBorderDraw ? "cta-border-drawn" : ""}
            style={ctaStyle(ctaBorderDraw)}
          >
            Enter Ghaafeedi Music →
          </button>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 12,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Your story begins here
          </p>
        </div>
      )}

      {/* Skip button — bottom right */}
      {!showCta && !videoError && (
        <button
          onClick={handleEnter}
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            zIndex: 10,
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "8px 12px",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)";
          }}
        >
          Skip intro
        </button>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes borderDraw {
          from { box-shadow: 0 0 0 0 rgba(212,175,55,0), inset 0 0 0 0 rgba(212,175,55,0); }
          to { box-shadow: 0 0 30px 4px rgba(212,175,55,0.5), inset 0 0 0 2px rgba(212,175,55,0.8); }
        }
        .cta-border-drawn {
          animation: borderDraw 1.2s ease forwards !important;
        }
      `}</style>
    </div>
  );
}

function ctaStyle(active: boolean): React.CSSProperties {
  return {
    background: active
      ? "linear-gradient(135deg, #D4AF37 0%, #F4D27A 50%, #D4AF37 100%)"
      : "rgba(212,175,55,0.15)",
    border: "1px solid rgba(212,175,55,0.6)",
    borderRadius: 50,
    padding: "16px 48px",
    color: active ? "#050B1A" : "#D4AF37",
    fontSize: 16,
    fontFamily: "Playfair Display, serif",
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.4s ease",
    boxShadow: active ? "0 0 40px rgba(212,175,55,0.4)" : "none",
    whiteSpace: "nowrap",
  };
}
