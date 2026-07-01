import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";

const PROMO_VIDEO_URL =
  "https://pub-bc7b203485814e1186102277ad450211.r2.dev/ghaafeedi-promo-v5-final-web.mp4";
const POSTER_URL =
  "https://pub-bc7b203485814e1186102277ad450211.r2.dev/sophia-poster.png";

const ENTER_BUTTON_SHOW_TIME = 279; // 4:39 — when "Enter Ghaafeedi Music" fades in

// Determine where to send the user after skip/enter
function useDestination() {
  const [dest, setDest] = useState<string>("/home");

  useEffect(() => {
    async function resolve() {
      try {
        const token = localStorage.getItem("gm_bearer_token") || "";
        if (!token) {
          setDest("/home");
          return;
        }
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setDest("/home"); return; }
        const data = await res.json();
        if (!data?.user) { setDest("/home"); return; }

        const profileRes = await fetch("/api/members/profile", {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setDest(profile?.onboarding_complete ? "/dashboard" : "/onboarding");
        } else {
          setDest("/onboarding");
        }
      } catch {
        setDest("/home");
      }
    }
    resolve();
  }, []);

  return dest;
}

export default function GhaafeediPromoIntro() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showEnterBtn, setShowEnterBtn] = useState(false);
  const [enterVisible, setEnterVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(286);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const dest = useDestination();

  // Navigate with replaceState so "/" never sits in the back-stack
  const handleNavigate = useCallback(() => {
    window.history.replaceState(null, "", dest);
    setLocation(dest);
  }, [dest, setLocation]);

  // Context-aware play / unmute button
  const handlePlayUnmute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) {
      // Autoplay was blocked — user gesture: play with sound
      v.muted = false;
      setIsMuted(false);
      v.play().catch(() => {
        // Browser still blocked — fall back to muted play
        v.muted = true;
        setIsMuted(true);
        v.play().catch(() => {});
      });
    } else {
      // Video is playing — just toggle mute
      const next = !isMuted;
      v.muted = next;
      setIsMuted(next);
    }
  }, [isMuted]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const d = v.duration || 286;
    setProgress(t / d);
    if (t >= ENTER_BUTTON_SHOW_TIME && !showEnterBtn) {
      setShowEnterBtn(true);
      requestAnimationFrame(() => setTimeout(() => setEnterVisible(true), 50));
    }
  }, [showEnterBtn]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setShowEnterBtn(true);
    setEnterVisible(true);
    setIsPlaying(false);
  }, []);

  const handlePlay  = useCallback(() => setIsPlaying(true),  []);
  const handlePause = useCallback(() => setIsPlaying(false), []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentTime = videoRef.current?.currentTime ?? 0;

  // Button label — context aware
  const playBtnLabel = !isPlaying
    ? "▶  Tap to Play"
    : isMuted
    ? "🔇  Unmute"
    : "🔊  Mute";

  const playBtnActive = !isMuted && isPlaying;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050B1A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "clamp(12px, 3vw, 28px)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Logo bar */}
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px 12px",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontFamily: "Playfair Display, serif",
            color: "#D4AF37",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          Ghaafeedi Music
        </span>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Video container — natural 16:9 aspect ratio, no black bars */}
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          position: "relative",
          background: "#000",
          aspectRatio: "16/9",
          lineHeight: 0,
        }}
      >
        <video
          ref={videoRef}
          src={PROMO_VIDEO_URL}
          poster={POSTER_URL}
          autoPlay
          muted={isMuted}
          playsInline
          preload="auto"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={handlePlay}
          onPause={handlePause}
        />

        {/* Gold progress bar — bottom of video */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "rgba(212,175,55,0.2)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: "#D4AF37",
              transition: "width 0.5s linear",
            }}
          />
        </div>
      </div>

      {/* Button row — below video, never overlaid */}
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 28px",
          boxSizing: "border-box",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Skip — always visible */}
        <button
          onClick={handleNavigate}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            padding: "8px 20px",
            borderRadius: 6,
            cursor: "pointer",
            letterSpacing: "0.04em",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.85)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
          }}
        >
          Skip Intro →
        </button>

        {/* Play / Unmute toggle — context-aware */}
        <button
          onClick={handlePlayUnmute}
          aria-label={playBtnLabel}
          style={{
            background: playBtnActive
              ? "rgba(212,175,55,0.22)"
              : "rgba(212,175,55,0.10)",
            border: `1px solid ${playBtnActive ? "#D4AF37" : "rgba(212,175,55,0.35)"}`,
            color: playBtnActive ? "#D4AF37" : "rgba(212,175,55,0.75)",
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            padding: "8px 18px",
            borderRadius: 6,
            cursor: "pointer",
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.2s",
            minWidth: 130,
            justifyContent: "center",
          }}
        >
          {playBtnLabel}
        </button>

        {/* Enter Ghaafeedi Music — appears at 4:39 */}
        <div
          style={{
            opacity: enterVisible ? 1 : 0,
            transform: enterVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 1.5s ease, transform 1.5s ease",
            pointerEvents: showEnterBtn ? "auto" : "none",
          }}
        >
          <button
            onClick={handleNavigate}
            style={{
              background: "linear-gradient(135deg, #D4AF37 0%, #F4D06F 50%, #D4AF37 100%)",
              border: "none",
              color: "#050B1A",
              fontSize: 16,
              fontFamily: "Playfair Display, serif",
              fontWeight: 700,
              padding: "14px 36px",
              borderRadius: 8,
              cursor: "pointer",
              letterSpacing: "0.06em",
              boxShadow: "0 0 32px rgba(212,175,55,0.5), 0 4px 20px rgba(0,0,0,0.4)",
              transition: "all 0.25s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 52px rgba(212,175,55,0.8), 0 4px 24px rgba(0,0,0,0.5)";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 32px rgba(212,175,55,0.5), 0 4px 20px rgba(0,0,0,0.4)";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            Enter Ghaafeedi Music
          </button>
        </div>
      </div>

      {/* Tagline */}
      <p
        style={{
          color: "rgba(255,255,255,0.25)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          margin: "0 0 24px",
        }}
      >
        Turn Your Memories Into Cinematic Songs &amp; Films
      </p>
    </div>
  );
}
