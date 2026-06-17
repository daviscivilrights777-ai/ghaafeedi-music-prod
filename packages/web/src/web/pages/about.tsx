import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Link } from "wouter";

const FADE_UP = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] } },
};

const STAGGER = { show: { transition: { staggerChildren: 0.12 } } };

const VALUES = [
  {
    icon: "✦",
    title: "Memory as Legacy",
    desc: "Every life holds stories worth preserving. We build the technology to make that possible for everyone.",
  },
  {
    icon: "◈",
    title: "Emotional Intelligence",
    desc: "Our AI is trained to understand nuance, grief, joy, and love — not just text. Emotion first, always.",
  },
  {
    icon: "⬡",
    title: "Radical Privacy",
    desc: "Your memories belong to you. We never sell data, never train on your content without consent.",
  },
  {
    icon: "∿",
    title: "Human-AI Harmony",
    desc: "AI amplifies human creativity. Every output is shaped by your voice, not replaced by ours.",
  },
  {
    icon: "⟡",
    title: "Cinematic Quality",
    desc: "We refuse to ship mediocre. Every song, film, and experience meets professional production standards.",
  },
  {
    icon: "♾",
    title: "Generational Impact",
    desc: "We're building tools for parents to leave messages for children not yet born. Legacy that outlasts hardware.",
  },
];

const MILESTONES = [
  { year: "2023", event: "Ghaafeedi Music founded — vision to democratize cinematic storytelling" },
  { year: "2024", event: "First AI song engine deployed — 500+ beta users, 97% satisfaction" },
  { year: "2025", event: "Cinematic film pipeline launched — 14 products, enterprise AI stack" },
  { year: "2026", event: "Global expansion — Trust Center, Voice Cloning Studio, Legacy Vault released" },
];

export default function AboutPage() {
  return (
    <div style={{ background: "#0A0B0F", minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{
        position: "relative",
        padding: "140px 40px 100px",
        textAlign: "center",
        overflow: "hidden",
      }}>
        {/* Radial glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700, height: 700,
          background: "radial-gradient(ellipse, rgba(212,165,116,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <motion.div
          initial="hidden" animate="show" variants={STAGGER}
          style={{ maxWidth: 860, margin: "0 auto", position: "relative" }}
        >
          <motion.div variants={FADE_UP} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(212,165,116,0.08)", border: "1px solid rgba(212,165,116,0.22)",
            borderRadius: 999, padding: "7px 20px", marginBottom: 32,
          }}>
            <span style={{ color: "#D4A574", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>Our Story</span>
          </motion.div>

          <motion.h1 variants={FADE_UP} style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(42px, 6vw, 82px)",
            fontWeight: 800, color: "#FFFFFF", lineHeight: 1.08, marginBottom: 28,
          }}>
            Where Memory Meets<br />
            <span style={{ color: "#D4A574" }}>Cinematic Artistry</span>
          </motion.h1>

          <motion.p variants={FADE_UP} style={{
            fontSize: "clamp(15px, 1.8vw, 19px)",
            color: "rgba(255,255,255,0.58)",
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.76, maxWidth: 680, margin: "0 auto 48px",
          }}>
            Ghaafeedi Music is an AI-powered storytelling and cinematic media company. We transform memories, life experiences, emotions, and personal journeys into songs, films, documentaries, and legacy experiences that endure across generations.
          </motion.p>

          <motion.div variants={FADE_UP} style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/products">
              <a style={{
                background: "linear-gradient(135deg, #F8E08A, #D4A574)",
                color: "#0A0B0F", fontFamily: "Inter, sans-serif",
                fontWeight: 700, fontSize: 14, letterSpacing: "0.06em",
                padding: "14px 34px", borderRadius: 12, border: "none",
                cursor: "pointer", textDecoration: "none", display: "inline-block",
                boxShadow: "0 8px 32px rgba(212,165,116,0.32)",
              }}>Explore Our Products</a>
            </Link>
            <Link href="/contact">
              <a style={{
                background: "transparent", color: "#D4A574",
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14,
                padding: "14px 34px", borderRadius: 12,
                border: "1px solid rgba(212,165,116,0.3)",
                cursor: "pointer", textDecoration: "none", display: "inline-block",
              }}>Talk to Us</a>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── MISSION ── */}
      <section style={{ padding: "100px 40px", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}
            className="about-mission-grid"
          >
            <motion.div variants={FADE_UP}>
              <div style={{
                fontSize: 10, color: "#D4A574", fontFamily: "Inter, sans-serif",
                fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 20,
              }}>Our Mission</div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(32px, 3.5vw, 52px)", fontWeight: 800,
                color: "#FFFFFF", lineHeight: 1.14, marginBottom: 28,
              }}>
                Help People Preserve What<br />
                <span style={{ color: "#D4A574" }}>Matters Most</span>
              </h2>
              <p style={{
                fontSize: 15, color: "rgba(255,255,255,0.55)",
                fontFamily: "Inter, sans-serif", lineHeight: 1.82, marginBottom: 20,
              }}>
                Every person carries a universe of stories — triumphs that shaped them, losses that tested them, love that defined them. Our mission is to give those stories a voice, a soundtrack, and an image that can be passed down through generations.
              </p>
              <p style={{
                fontSize: 15, color: "rgba(255,255,255,0.55)",
                fontFamily: "Inter, sans-serif", lineHeight: 1.82,
              }}>
                We help people preserve memories, celebrate milestones, heal from adversity, and leave a meaningful legacy — powered by the most advanced emotional AI ever built for personal storytelling.
              </p>
            </motion.div>

            <motion.div variants={FADE_UP}>
              <div style={{
                background: "linear-gradient(135deg, rgba(212,165,116,0.08), rgba(139,92,246,0.06))",
                border: "1px solid rgba(212,165,116,0.15)",
                borderRadius: 24, padding: "48px 40px",
              }}>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22, fontStyle: "italic", color: "#D4A574",
                  lineHeight: 1.6, marginBottom: 24,
                }}>
                  "We believe every life is a masterpiece waiting to be told. Technology should give it the stage it deserves."
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, #F8E08A, #D4A574)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 900, color: "#0A0B0F",
                    fontFamily: "'Playfair Display', serif",
                  }}>G</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", fontFamily: "Inter, sans-serif" }}>Ghaafeedi Music</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", fontFamily: "Inter, sans-serif" }}>Founding Vision, 2023</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
                {[
                  { n: "14", label: "Unique Products" },
                  { n: "97%", label: "Satisfaction Rate" },
                  { n: "50K+", label: "Stories Created" },
                  { n: "120+", label: "Countries Served" },
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14, padding: "20px",
                    textAlign: "center",
                  }}>
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 28, fontWeight: 800, color: "#D4A574", marginBottom: 4,
                    }}>{stat.n}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section style={{ padding: "100px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
            style={{ textAlign: "center", marginBottom: 64 }}
          >
            <motion.div variants={FADE_UP} style={{
              fontSize: 10, color: "#D4A574", fontFamily: "Inter, sans-serif",
              fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 18,
            }}>What We Stand For</motion.div>
            <motion.h2 variants={FADE_UP} style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(30px, 3.5vw, 50px)", fontWeight: 800,
              color: "#FFFFFF", lineHeight: 1.14,
            }}>Our Core Values</motion.h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
            }}
          >
            {VALUES.map((v, i) => (
              <motion.div key={i} variants={FADE_UP} style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(212,165,116,0.12)",
                borderRadius: 20, padding: "32px 28px",
                transition: "all 0.3s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.3)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(212,165,116,0.04)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.12)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
                }}
              >
                <div style={{
                  width: 48, height: 48,
                  background: "rgba(212,165,116,0.1)",
                  border: "1px solid rgba(212,165,116,0.2)",
                  borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, color: "#D4A574", marginBottom: 20,
                }}>{v.icon}</div>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 20, fontWeight: 700, color: "#FFFFFF", marginBottom: 12,
                }}>{v.title}</h3>
                <p style={{
                  fontSize: 14, color: "rgba(255,255,255,0.52)",
                  fontFamily: "Inter, sans-serif", lineHeight: 1.76,
                }}>{v.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section style={{ padding: "80px 40px 100px", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
            style={{ textAlign: "center", marginBottom: 64 }}
          >
            <motion.div variants={FADE_UP} style={{
              fontSize: 10, color: "#D4A574", fontFamily: "Inter, sans-serif",
              fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 18,
            }}>Our Journey</motion.div>
            <motion.h2 variants={FADE_UP} style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(30px, 3.5vw, 50px)", fontWeight: 800,
              color: "#FFFFFF", lineHeight: 1.14,
            }}>Built With Purpose</motion.h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
            style={{ position: "relative" }}
          >
            {/* Vertical line */}
            <div style={{
              position: "absolute", left: 80, top: 0, bottom: 0,
              width: 1, background: "linear-gradient(to bottom, transparent, rgba(212,165,116,0.3), transparent)",
            }} />

            {MILESTONES.map((m, i) => (
              <motion.div key={i} variants={FADE_UP} style={{
                display: "flex", gap: 40, marginBottom: 48, alignItems: "flex-start",
              }}>
                <div style={{
                  minWidth: 80, textAlign: "right",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18, fontWeight: 800, color: "#D4A574",
                }}>{m.year}</div>
                <div style={{
                  position: "relative",
                  width: 12, height: 12, flexShrink: 0,
                  background: "#D4A574", borderRadius: "50%", marginTop: 6,
                  boxShadow: "0 0 16px rgba(212,165,116,0.5)",
                }} />
                <div style={{
                  flex: 1,
                  background: "rgba(212,165,116,0.04)",
                  border: "1px solid rgba(212,165,116,0.12)",
                  borderRadius: 14, padding: "18px 22px",
                }}>
                  <p style={{
                    fontSize: 14.5, color: "rgba(255,255,255,0.72)",
                    fontFamily: "Inter, sans-serif", lineHeight: 1.68,
                  }}>{m.event}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "100px 40px", textAlign: "center" }}>
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
          style={{ maxWidth: 680, margin: "0 auto" }}
        >
          <motion.h2 variants={FADE_UP} style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 800,
            color: "#FFFFFF", lineHeight: 1.14, marginBottom: 20,
          }}>
            Ready to Tell Your Story?
          </motion.h2>
          <motion.p variants={FADE_UP} style={{
            fontSize: 16, color: "rgba(255,255,255,0.52)",
            fontFamily: "Inter, sans-serif", lineHeight: 1.76, marginBottom: 40,
          }}>
            Join thousands who've transformed their memories into cinematic legacies.
          </motion.p>
          <motion.div variants={FADE_UP} style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/products">
              <a style={{
                background: "linear-gradient(135deg, #F8E08A, #D4A574)",
                color: "#0A0B0F", fontFamily: "Inter, sans-serif",
                fontWeight: 700, fontSize: 14, letterSpacing: "0.06em",
                padding: "16px 40px", borderRadius: 12, border: "none",
                cursor: "pointer", textDecoration: "none", display: "inline-block",
                boxShadow: "0 8px 32px rgba(212,165,116,0.32)",
              }}>Start Your Legacy</a>
            </Link>
            <Link href="/impact">
              <a style={{
                background: "transparent", color: "#D4A574",
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14,
                padding: "16px 40px", borderRadius: 12,
                border: "1px solid rgba(212,165,116,0.3)",
                cursor: "pointer", textDecoration: "none", display: "inline-block",
              }}>Our Social Impact</a>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 768px) {
          .about-mission-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </div>
  );
}
