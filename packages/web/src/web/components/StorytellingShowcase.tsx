import { motion } from "framer-motion";

const JOURNEY = [
  "Personalized Cinematic Songs",
  "AI Music Creation Studio",
  "Cinematic Story Videos",
  "Emotional Legacy Vault",
  "AI Dream Visualization",
  "AI Audiobook Creator",
];

const AI_STEPS = [
  { icon: "📁", label: "Upload Memories",   sub: "Photos, videos, voice, text", done: true },
  { icon: "✦",  label: "AI Analyzes Story", sub: "Emotion mapping & narrative",  done: true },
  { icon: "🎬", label: "Production Begins", sub: "Music, video, stories",        done: true },
  { icon: "👁️", label: "Your Review",       sub: "Refine everything",           done: false },
  { icon: "🏆", label: "Final Masterpiece", sub: "Delivered with love",          done: false },
];

const WAVE = [18, 28, 36, 42, 30, 48, 55, 38, 44, 52, 35, 46, 60, 42, 50, 56, 38, 44, 30, 48, 52, 36, 42, 56, 44, 60, 38, 50, 45, 36, 28, 40, 52, 44, 36, 42, 50, 60, 38, 44, 52, 36, 42, 50, 38, 44, 60, 52, 36, 42];
const EMOWAVE = [22, 38, 30, 45, 60, 42, 55, 70, 50, 65, 80, 60, 72, 90, 68, 75, 55, 60, 72, 85];

export function StorytellingShowcase() {
  return (
    <section style={{
      padding: "100px 40px",
      background: "linear-gradient(180deg, #0A0B0F 0%, #0F1419 50%, #0A0B0F 100%)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Section label */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22 }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(212,165,116,0.35))" }} />
          <span style={{ color: "#D4A574", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", whiteSpace: "nowrap" }}>YOUR STORY, BEAUTIFULLY TOLD</span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(212,165,116,0.35))" }} />
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(26px, 3vw, 42px)",
            fontWeight: 800, color: "#FFFFFF",
            textAlign: "center", marginBottom: 64,
          }}
        >
          Watch Your Emotions{" "}
          <span style={{
            background: "linear-gradient(135deg, #F8E08A, #D4A574)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>Come Alive</span>
        </motion.h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr 300px",
          gap: 28,
          alignItems: "start",
        }}
        className="storytelling-3col">

          {/* ── Left: Journey list ── */}
          <div className="storytelling-sidebar">
            <div style={{
              fontSize: 10.5, color: "#D4A574", fontFamily: "Inter, sans-serif",
              fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 18,
            }}>YOUR JOURNEY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {JOURNEY.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ x: 4, borderColor: "rgba(212,165,116,0.40)" }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(15,20,25,0.7)",
                    border: "1px solid rgba(212,165,116,0.12)",
                    borderRadius: 10, padding: "11px 15px", cursor: "pointer",
                    transition: "all 0.22s",
                    fontSize: 12.5, color: "rgba(255,255,255,0.72)", fontFamily: "Inter, sans-serif",
                  }}
                >
                  <span style={{ color: "#D4A574", fontSize: 10, flexShrink: 0 }}>▸</span>
                  {item}
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Center: Player ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            style={{
              borderRadius: 20, overflow: "hidden", position: "relative",
              border: "1px solid rgba(212,165,116,0.22)",
              boxShadow: "0 12px 48px rgba(0,0,0,0.55), 0 0 60px rgba(212,165,116,0.06)",
            }}
          >
            {/* Family photo */}
            <div style={{
              backgroundImage: "url('/images/hero-poster.png')",
              backgroundSize: "cover", backgroundPosition: "center",
              height: 360, position: "relative",
            }}>
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, rgba(10,11,15,0.12) 0%, rgba(10,11,15,0.72) 100%)",
              }} />

              {/* Play button */}
              <div style={{
                position: "absolute", bottom: 56, left: "50%", transform: "translateX(-50%)",
                width: 66, height: 66, borderRadius: "50%",
                background: "linear-gradient(135deg, #F8E08A 0%, #D4A574 55%, #9B6830 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 40px rgba(212,165,116,0.65), 0 0 80px rgba(212,165,116,0.20)",
                fontSize: 22, paddingLeft: 4,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateX(-50%) scale(1.08)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 60px rgba(212,165,116,0.85)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateX(-50%) scale(1)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(212,165,116,0.65)";
                }}
              >▶</div>

              {/* Now playing label */}
              <div style={{
                position: "absolute", top: 16, left: 16,
                background: "rgba(10,11,15,0.75)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(212,165,116,0.28)",
                borderRadius: 999, padding: "4px 12px",
                fontSize: 10.5, color: "#D4A574", fontFamily: "Inter, sans-serif", fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
                Now Playing
              </div>
            </div>

            {/* Waveform bar */}
            <div style={{
              background: "rgba(10,11,15,0.97)",
              borderTop: "1px solid rgba(212,165,116,0.14)",
              padding: "14px 18px",
              display: "flex", alignItems: "flex-end", gap: 2, height: 60,
            }}>
              {WAVE.map((h, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: 2, height: `${h}%`,
                  background: i < 22 ? "#D4A574" : "rgba(212,165,116,0.25)",
                  transition: "height 0.1s",
                }} />
              ))}
            </div>
          </motion.div>

          {/* ── Right: AI process ── */}
          <div className="storytelling-sidebar">
            <div style={{
              fontSize: 10.5, color: "#D4A574", fontFamily: "Inter, sans-serif",
              fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 18,
            }}>AI STORYTELLING PROCESS</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
              {AI_STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "rgba(15,20,25,0.65)",
                    border: `1px solid ${s.done ? "rgba(212,165,116,0.28)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 10, padding: "11px 14px",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: s.done ? "rgba(212,165,116,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${s.done ? "#D4A574" : "rgba(255,255,255,0.10)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: s.done ? 14 : 16, color: s.done ? "#D4A574" : "#fff", fontWeight: 700,
                  }}>
                    {s.done ? "✓" : s.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", fontFamily: "Inter, sans-serif" }}>{s.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Emotional journey bar */}
            <div style={{
              background: "rgba(212,165,116,0.06)",
              border: "1px solid rgba(212,165,116,0.18)",
              borderRadius: 12, padding: "16px 16px 12px",
            }}>
              <div style={{
                fontSize: 10, color: "#D4A574", fontFamily: "Inter, sans-serif",
                fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
              }}>EMOTIONAL JOURNEY</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 52 }}>
                {EMOWAVE.map((h, i) => (
                  <div key={i} style={{
                    flex: 1, borderRadius: 2, height: `${h}%`,
                    background: `linear-gradient(to top, #D4A574, #F8E08A)`,
                    opacity: 0.45 + (i / EMOWAVE.length) * 0.55,
                  }} />
                ))}
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginTop: 8, fontSize: 9.5, color: "rgba(255,255,255,0.30)",
                fontFamily: "Inter, sans-serif",
              }}>
                <span>Beginning</span><span>Peak Emotion</span><span>Legacy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
