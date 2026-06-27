import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Link } from "wouter";

const FADE_UP = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as any } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.1 } } };

const PILLARS = [
  {
    icon: "🛡️",
    color: "#E879A0",
    gradient: "rgba(232,121,160,0.08)",
    border: "rgba(232,121,160,0.2)",
    title: "Women's Safety Initiatives",
    desc: "We are committed to developing technology and support programs that help protect women from violence, harassment, and exploitation. Future initiatives will include emergency storytelling documentation tools for survivors and awareness campaigns powered by authentic personal stories.",
    status: "Planned Initiative",
  },
  {
    icon: "💜",
    color: "#8B5CF6",
    gradient: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
    title: "Domestic Violence Awareness",
    desc: "Storytelling has the power to break silence. We plan to partner with survivor support organizations to create awareness campaigns, preserve survivor narratives with consent, and fund education programs that help communities recognize and respond to domestic violence.",
    status: "Planned Initiative",
  },
  {
    icon: "🧠",
    color: "#38BDF8",
    gradient: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.2)",
    title: "Men's Mental Health Support",
    desc: "Mental health challenges disproportionately silence men. Our platform's emotional storytelling technology has profound potential to help men process grief, trauma, and identity through music, film, and narrative — modalities that bypass traditional barriers to expression.",
    status: "In Development",
  },
  {
    icon: "🌾",
    color: "#F97316",
    gradient: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
    title: "Child Hunger Programs",
    desc: "No child should face hunger. Ghaafeedi Music plans to allocate a portion of revenue from select legacy products toward verified child nutrition programs globally. We believe prosperity in creative technology should lift the most vulnerable.",
    status: "Planned Initiative",
  },
  {
    icon: "📚",
    color: "#22C55E",
    gradient: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
    title: "Education Access",
    desc: "Creative literacy and AI education should not be gatekept by wealth. Future programs will include scholarships, free tools for underserved schools, and AI storytelling workshops that empower students to document and share their community histories.",
    status: "In Development",
  },
  {
    icon: "🔬",
    color: "#D4A574",
    gradient: "rgba(212,165,116,0.08)",
    border: "rgba(212,165,116,0.2)",
    title: "AI Science Advancement",
    desc: "We intend to contribute to open research in emotional AI, affective computing, and culturally-aware language models. Our proprietary emotional intelligence layers, developed for storytelling, will be published as research to advance the global AI science community.",
    status: "Research Phase",
  },
  {
    icon: "🏥",
    color: "#F43F5E",
    gradient: "rgba(244,63,94,0.08)",
    border: "rgba(244,63,94,0.2)",
    title: "Medical AI Innovation",
    desc: "The intersection of AI, narrative therapy, and medical care represents one of the most promising frontiers in mental health treatment. We plan to partner with hospitals and therapists to explore how our emotional storytelling models can support clinical healing.",
    status: "Planned Initiative",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    color: "#A78BFA",
    gradient: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.2)",
    title: "Family Legacy Preservation",
    desc: "Generational wisdom is disappearing as elders pass without documented stories. We are building free legacy preservation tools for seniors and low-income families, ensuring that every family — regardless of financial means — can preserve their history.",
    status: "In Development",
  },
];

export default function ImpactPage() {
  return (
    <div style={{ background: "#0A0B0F", minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      {/* HERO */}
      <section style={{ padding: "140px 40px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800, height: 600,
          background: "radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <motion.div
          initial="hidden" animate="show" variants={STAGGER}
          style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}
        >
          <motion.div variants={FADE_UP} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 999, padding: "7px 20px", marginBottom: 32,
          }}>
            <span style={{ color: "#A78BFA", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>Social Impact</span>
          </motion.div>

          <motion.h1 variants={FADE_UP} style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(40px, 6vw, 80px)",
            fontWeight: 800, color: "#FFFFFF", lineHeight: 1.08, marginBottom: 28,
          }}>
            Technology With<br />
            <span style={{ color: "#D4A574" }}>Purpose & Heart</span>
          </motion.h1>

          <motion.p variants={FADE_UP} style={{
            fontSize: "clamp(15px, 1.8vw, 18px)",
            color: "rgba(255,255,255,0.55)",
            fontFamily: "Inter, sans-serif", lineHeight: 1.80,
            maxWidth: 660, margin: "0 auto 20px",
          }}>
            We believe technology that serves personal stories must also serve humanity. Ghaafeedi Music is committed to using the power of AI storytelling to uplift, protect, and empower communities around the world.
          </motion.p>

          <motion.p variants={FADE_UP} style={{
            fontSize: 12.5, color: "rgba(255,255,255,0.32)",
            fontFamily: "Inter, sans-serif", lineHeight: 1.6,
            maxWidth: 560, margin: "0 auto 48px",
            fontStyle: "italic",
          }}>
            The initiatives below represent our planned commitments and areas of active development. We do not claim existing verified partnerships unless explicitly stated.
          </motion.p>
        </motion.div>
      </section>

      {/* PILLARS */}
      <section style={{ padding: "40px 40px 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 28,
          }}>
            {PILLARS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as any }}
                style={{
                  background: p.gradient,
                  border: `1px solid ${p.border}`,
                  borderRadius: 22, padding: "36px 30px",
                  transition: "transform 0.3s, box-shadow 0.3s",
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div style={{ fontSize: 36, marginBottom: 18 }}>{p.icon}</div>
                <div style={{
                  display: "inline-block",
                  fontSize: 10, fontFamily: "Inter, sans-serif",
                  fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                  color: p.color, background: `${p.gradient}`,
                  border: `1px solid ${p.border}`,
                  borderRadius: 999, padding: "4px 12px", marginBottom: 16,
                }}>{p.status}</div>

                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22, fontWeight: 700,
                  color: "#FFFFFF", lineHeight: 1.22, marginBottom: 14,
                }}>{p.title}</h3>

                <p style={{
                  fontSize: 14, color: "rgba(255,255,255,0.54)",
                  fontFamily: "Inter, sans-serif", lineHeight: 1.78,
                }}>{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMITMENT STATEMENT */}
      <section style={{ padding: "80px 40px", background: "rgba(212,165,116,0.03)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
          >
            <motion.div variants={FADE_UP} style={{
              width: 64, height: 64,
              background: "rgba(212,165,116,0.08)",
              border: "1px solid rgba(212,165,116,0.2)",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, margin: "0 auto 32px",
            }}>⟡</motion.div>

            <motion.h2 variants={FADE_UP} style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800,
              color: "#FFFFFF", lineHeight: 1.18, marginBottom: 24,
            }}>Our Commitment to Transparency</motion.h2>

            <motion.p variants={FADE_UP} style={{
              fontSize: 16, color: "rgba(255,255,255,0.55)",
              fontFamily: "Inter, sans-serif", lineHeight: 1.82, marginBottom: 20,
            }}>
              We are in our growth phase. These impact initiatives represent our values and direction — not yet fully funded programs with verified partnerships. As Ghaafeedi Music grows, a defined percentage of revenue will be allocated to these causes.
            </motion.p>

            <motion.p variants={FADE_UP} style={{
              fontSize: 16, color: "rgba(255,255,255,0.55)",
              fontFamily: "Inter, sans-serif", lineHeight: 1.82, marginBottom: 40,
            }}>
              We will publish an annual Impact Report detailing specific allocations, partnerships formed, and outcomes achieved. Accountability is not optional — it is core to who we are.
            </motion.p>

            <motion.div variants={FADE_UP} style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/contact">
                <a style={{
                  background: "linear-gradient(135deg, #F8E08A, #D4A574)",
                  color: "#0A0B0F", fontFamily: "Inter, sans-serif",
                  fontWeight: 700, fontSize: 14, letterSpacing: "0.06em",
                  padding: "15px 36px", borderRadius: 12, border: "none",
                  cursor: "pointer", textDecoration: "none", display: "inline-block",
                  boxShadow: "0 8px 32px rgba(212,165,116,0.28)",
                }}>Partner With Us</a>
              </Link>
              <Link href="/about">
                <a style={{
                  background: "transparent", color: "#D4A574",
                  fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14,
                  padding: "15px 36px", borderRadius: 12,
                  border: "1px solid rgba(212,165,116,0.3)",
                  cursor: "pointer", textDecoration: "none", display: "inline-block",
                }}>Our Story</a>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
