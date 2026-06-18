import { motion } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const PRODUCTS = [
  "Cinematic Life Story",
  "Emotional Soundtrack",
  "Sophia AI Companion",
  "Voice Cloning Studio",
  "Memorial Legacy Film",
  "Relationship Healing",
  "Family Vault",
  "NFT Collection",
  "Signature Masterpiece",
  "Cinematic Story Film",
  "Couples Journey Film",
  "Dream AI Visualization",
  "Future Self Vision",
  "Social Ready Clips",
  "Song Memberships",
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function StorytellingShowcase() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(210);
  const [loaded, setLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onMeta = () => setDuration(v.duration || 210);
    const onLoaded = () => setLoaded(true);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("canplay", onLoaded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("canplay", onLoaded);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
    resetControlsTimer();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    const bar = progressRef.current;
    if (!v || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * duration;
  };

  const toggleFullscreen = () => {
    const container = document.getElementById("gm-flagship-player");
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <section
      id="flagship-showcase"
      style={{
        padding: "80px 24px 100px",
        background: "linear-gradient(180deg, #050B1A 0%, #07101F 40%, #050B1A 100%)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseMove={resetControlsTimer}
    >
      {/* Gold radial glow behind player */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -55%)",
        width: 900,
        height: 500,
        background: "radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <div style={{
            display: "inline-block",
            padding: "6px 18px",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 20,
            color: "#D4AF37",
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 20,
            background: "rgba(212,175,55,0.05)",
          }}>
            GHAAFEEDI MUSIC · FLAGSHIP STORY
          </div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 700,
            color: "#FFFFFF",
            margin: "0 0 16px",
            lineHeight: 1.15,
          }}>
            Watch Your Story Come to Life
          </h2>

          <p style={{
            fontSize: 17,
            color: "rgba(255,255,255,0.55)",
            margin: 0,
            fontFamily: "Inter, sans-serif",
          }}>
            3.5 minutes. 15 experiences. One purpose — your legacy, immortalized.
          </p>
        </motion.div>

        {/* Video Player */}
        <motion.div
          id="gm-flagship-player"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(212,175,55,0.25)",
            boxShadow: "0 0 80px rgba(212,175,55,0.08), 0 32px 80px rgba(0,0,0,0.6)",
            background: "#000",
            cursor: "pointer",
          }}
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src="https://pub-bc7b203485814e1186102277ad450211.r2.dev/flagship-demo.mp4"
            poster="https://pub-bc7b203485814e1186102277ad450211.r2.dev/sophia-poster.png"
            muted={muted}
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />

          {/* Play overlay when paused */}
          {!playing && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.3)",
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(212,175,55,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 40px rgba(212,175,55,0.5)",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#050B1A">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}

          {/* Muted badge */}
          {muted && playing && (
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                background: "rgba(0,0,0,0.7)",
                borderRadius: 8,
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                border: "1px solid rgba(212,175,55,0.3)",
              }}
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#D4AF37">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
              <span style={{ fontSize: 11, color: "#D4AF37", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
                TAP TO UNMUTE
              </span>
            </div>
          )}

          {/* Controls bar */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "24px 16px 16px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
              opacity: showControls || !playing ? 1 : 0,
              transition: "opacity 0.3s",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div
              ref={progressRef}
              onClick={seek}
              style={{
                height: 4,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 2,
                cursor: "pointer",
                marginBottom: 12,
                position: "relative",
              }}
            >
              <div style={{
                height: "100%",
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg, #D4AF37, #F4E08A)",
                borderRadius: 2,
              }} />
              <div style={{
                position: "absolute",
                top: "50%",
                left: `${progress * 100}%`,
                transform: "translate(-50%, -50%)",
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#D4AF37",
                boxShadow: "0 0 6px rgba(212,175,55,0.8)",
              }} />
            </div>

            {/* Control buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {playing ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Mute */}
              <button
                onClick={toggleMute}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
              >
                {muted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)">
                    <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>

              {/* Time */}
              <span style={{
                fontFamily: "Inter, monospace",
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                flex: 1,
              }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                  {fullscreen ? (
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                  ) : (
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Product chips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
          }}
        >
          {PRODUCTS.map((p) => (
            <div
              key={p}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid rgba(212,175,55,0.25)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                background: "rgba(212,175,55,0.04)",
                letterSpacing: "0.02em",
                cursor: "default",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.6)";
                (e.currentTarget as HTMLDivElement).style.color = "#D4AF37";
                (e.currentTarget as HTMLDivElement).style.background = "rgba(212,175,55,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.25)";
                (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.6)";
                (e.currentTarget as HTMLDivElement).style.background = "rgba(212,175,55,0.04)";
              }}
            >
              {p}
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            marginTop: 40,
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setLocation("/onboarding")}
            style={{
              padding: "16px 40px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.05em",
              background: "linear-gradient(135deg, #D4AF37 0%, #F4E08A 50%, #D4AF37 100%)",
              color: "#050B1A",
              boxShadow: "0 4px 24px rgba(212,175,55,0.4)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(212,175,55,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "none";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(212,175,55,0.4)";
            }}
          >
            Start Your Story
          </button>

          <button
            onClick={() => setLocation("/products")}
            style={{
              padding: "16px 40px",
              borderRadius: 8,
              border: "1px solid rgba(212,175,55,0.4)",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "0.05em",
              background: "rgba(212,175,55,0.06)",
              color: "#D4AF37",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.12)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.7)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.4)";
            }}
          >
            Explore 15 Experiences
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            marginTop: 48,
            display: "flex",
            justifyContent: "center",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          {[
            { val: "3.5 Min", label: "Full Cinematic Story" },
            { val: "15", label: "Unique Experiences" },
            { val: "14+", label: "AI Models at Work" },
            { val: "100%", label: "Your Memory, Preserved" },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28,
                fontWeight: 700,
                color: "#D4AF37",
                lineHeight: 1,
              }}>{val}</div>
              <div style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
                marginTop: 6,
                letterSpacing: "0.05em",
              }}>{label}</div>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
