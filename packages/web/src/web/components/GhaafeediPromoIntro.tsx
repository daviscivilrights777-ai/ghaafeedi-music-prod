import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";

const PROMO_VIDEO_URL =
  "https://pub-bc7b203485814e1186102277ad450211.r2.dev/ghaafeedi-promo-v5-final-web.mp4";

const ENTER_BUTTON_SHOW_TIME = 279; // 4:39 — when "Enter Ghaafeedi Music" fades in
const INTRO_SEEN_KEY = "gm_intro_seen";

// Determine where to send the user after skip/enter
function useDestination() {
  const [dest, setDest] = useState<string>("/products");

  useEffect(() => {
    async function resolve() {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("gm_token") || ""}`,
          },
        });
        if (!res.ok) {
          setDest("/products");
          return;
        }
        const data = await res.json();
        const user = data?.user;
        if (!user) {
          setDest("/products");
          return;
        }
        // Check if onboarding complete
        const profileRes = await fetch("/api/members/profile", {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("gm_token") || ""}`,
          },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (profile?.onboarding_complete) {
            setDest("/dashboard");
          } else {
            setDest("/onboarding");
          }
        } else {
          setDest("/onboarding");
        }
      } catch {
        setDest("/products");
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
  const dest = useDestination();

  // Mark intro seen
  useEffect(() => {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
  }, []);

  const handleNavigate = useCallback(() => {
    setLocation(dest);
  }, [dest, setLocation]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const d = v.duration || 286;
    setProgress(t / d);
    if (t >= ENTER_BUTTON_SHOW_TIME && !showEnterBtn) {
      setShowEnterBtn(true);
      requestAnimationFrame(() => {
        setTimeout(() => setEnterVisible(true), 50);
      });
    }
  }, [showEnterBtn]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setShowEnterBtn(true);
    setEnterVisible(true);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentTime = videoRef.current?.currentTime ?? 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050B1A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
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
          padding: "18px 28px 12px",
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

      {/* Video container */}
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          position: "relative",
          background: "#000",
          lineHeight: 0,
        }}
      >
        <video
          ref={videoRef}
          src={PROMO_VIDEO_URL}
          autoPlay
          playsInline
          style={{
            width: "100%",
            display: "block",
            maxHeight: "70vh",
            objectFit: "contain",
            background: "#000",
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
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

      {/* Button row — ALWAYS below video, never overlaid */}
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
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
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,255,255,0.85)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(255,255,255,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,255,255,0.5)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(255,255,255,0.2)";
          }}
        >
          Skip Intro →
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
              background:
                "linear-gradient(135deg, #D4AF37 0%, #F4D06F 50%, #D4AF37 100%)",
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
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1.03)";
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

      {/* Tagline below buttons */}
      <p
        style={{
          color: "rgba(255,255,255,0.25)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginTop: 0,
          marginBottom: 24,
        }}
      >
        Turn Your Memories Into Cinematic Songs &amp; Films
      </p>
    </div>
  );
}
