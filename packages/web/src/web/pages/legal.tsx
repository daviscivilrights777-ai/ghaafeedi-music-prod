import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Link } from "wouter";

const FADE_UP = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.07 } } };

export const LEGAL_DOCS = [
  {
    slug: "privacy-policy",
    icon: "🔏",
    title: "Privacy Policy",
    desc: "How we collect, use, store, and protect your personal information.",
    category: "Data & Privacy",
    updated: "June 2026",
  },
  {
    slug: "terms-of-service",
    icon: "📋",
    title: "Terms of Service",
    desc: "The agreement governing your use of Ghaafeedi Music's platform and services.",
    category: "Legal Agreement",
    updated: "June 2026",
  },
  {
    slug: "refund-policy",
    icon: "💳",
    title: "Refund Policy",
    desc: "Eligible refunds, non-refundable services, and subscription cancellations.",
    category: "Billing",
    updated: "June 2026",
  },
  {
    slug: "cookie-policy",
    icon: "🍪",
    title: "Cookie Policy",
    desc: "What cookies we use, why, and how to manage your cookie preferences.",
    category: "Data & Privacy",
    updated: "June 2026",
  },
  {
    slug: "data-protection",
    icon: "🛡️",
    title: "Data Protection Policy",
    desc: "Technical and organizational measures protecting your personal data.",
    category: "Data & Privacy",
    updated: "June 2026",
  },
  {
    slug: "voice-cloning-consent",
    icon: "🎙️",
    title: "Voice Cloning Consent",
    desc: "Explicit consent requirements, usage terms, and your rights for voice samples.",
    category: "AI & Content",
    updated: "June 2026",
  },
  {
    slug: "user-content-policy",
    icon: "📁",
    title: "User Content Policy",
    desc: "Rights, ownership, and restrictions on content you create and upload.",
    category: "AI & Content",
    updated: "June 2026",
  },
  {
    slug: "copyright-policy",
    icon: "©️",
    title: "Copyright Policy",
    desc: "How we handle copyright in AI-generated and user-submitted content.",
    category: "AI & Content",
    updated: "June 2026",
  },
  {
    slug: "dmca-policy",
    icon: "⚖️",
    title: "DMCA Policy",
    desc: "Process for filing and responding to copyright infringement notices.",
    category: "Legal Agreement",
    updated: "June 2026",
  },
  {
    slug: "ai-generated-content",
    icon: "🤖",
    title: "AI Generated Content Policy",
    desc: "Disclosures, ownership, and permitted uses of AI-generated creative works.",
    category: "AI & Content",
    updated: "June 2026",
  },
  {
    slug: "community-standards",
    icon: "🌐",
    title: "Community Standards",
    desc: "Behavioral expectations and prohibited content for all platform users.",
    category: "Community",
    updated: "June 2026",
  },
  {
    slug: "accessibility",
    icon: "♿",
    title: "Accessibility Statement",
    desc: "Our commitment to making Ghaafeedi Music accessible to everyone.",
    category: "Accessibility",
    updated: "June 2026",
  },
];

const CATEGORIES = ["All", "Data & Privacy", "Legal Agreement", "Billing", "AI & Content", "Community", "Accessibility"];

export default function LegalPage() {
  return (
    <div style={{ background: "#0A0B0F", minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      {/* HERO */}
      <section style={{ padding: "120px 40px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 400,
          background: "radial-gradient(ellipse, rgba(212,165,116,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <motion.div initial="hidden" animate="show" variants={STAGGER} style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <motion.div variants={FADE_UP} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(212,165,116,0.08)", border: "1px solid rgba(212,165,116,0.22)",
            borderRadius: 999, padding: "7px 20px", marginBottom: 28,
          }}>
            <span style={{ color: "#D4A574", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>Legal Center</span>
          </motion.div>

          <motion.h1 variants={FADE_UP} style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(38px, 5.5vw, 72px)",
            fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: 24,
          }}>
            Our Policies,<br />
            <span style={{ color: "#D4A574" }}>Plain and Clear</span>
          </motion.h1>

          <motion.p variants={FADE_UP} style={{
            fontSize: 16, color: "rgba(255,255,255,0.52)",
            fontFamily: "Inter, sans-serif", lineHeight: 1.78,
            maxWidth: 580, margin: "0 auto",
          }}>
            12 legal documents covering every aspect of your rights, our obligations, and how we operate. Written to be understood, not just signed.
          </motion.p>
        </motion.div>
      </section>

      {/* QUICK STATS */}
      <div style={{ padding: "0 40px 60px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            {[
              { n: "12", label: "Legal Documents" },
              { n: "June 2026", label: "Last Updated" },
              { n: "Plain", label: "Language Standard" },
              { n: "24h", label: "Legal Response SLA" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "16px 28px",
                textAlign: "center", minWidth: 140,
              }}>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 24, fontWeight: 800, color: "#D4A574", marginBottom: 4,
                }}>{s.n}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DOCS GRID */}
      <div style={{ padding: "0 40px 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 22,
            }}
          >
            {LEGAL_DOCS.map((doc, i) => (
              <motion.div key={doc.slug} variants={FADE_UP}>
                <Link href={`/legal/${doc.slug}`}>
                  <a style={{
                    display: "block",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(212,165,116,0.1)",
                    borderRadius: 18, padding: "28px 26px",
                    textDecoration: "none", cursor: "pointer",
                    transition: "all 0.25s",
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.3)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(212,165,116,0.04)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.1)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <span style={{ fontSize: 28 }}>{doc.icon}</span>
                      <span style={{
                        fontSize: 10, fontFamily: "Inter, sans-serif", fontWeight: 600,
                        color: "#D4A574", letterSpacing: "0.12em", textTransform: "uppercase",
                        background: "rgba(212,165,116,0.08)",
                        border: "1px solid rgba(212,165,116,0.2)",
                        borderRadius: 999, padding: "4px 10px",
                      }}>{doc.category}</span>
                    </div>

                    <h3 style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 19, fontWeight: 700, color: "#FFFFFF", marginBottom: 10,
                    }}>{doc.title}</h3>

                    <p style={{
                      fontSize: 13, color: "rgba(255,255,255,0.48)",
                      fontFamily: "Inter, sans-serif", lineHeight: 1.68, marginBottom: 18,
                    }}>{doc.desc}</p>

                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{
                        fontSize: 11, color: "rgba(255,255,255,0.28)",
                        fontFamily: "Inter, sans-serif",
                      }}>Updated {doc.updated}</span>
                      <span style={{
                        fontSize: 12, color: "#D4A574",
                        fontFamily: "Inter, sans-serif", fontWeight: 600,
                      }}>Read →</span>
                    </div>
                  </a>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Legal notice */}
          <div style={{
            marginTop: 60,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: "28px 32px",
            display: "flex", gap: 20, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)",
                fontFamily: "Inter, sans-serif", marginBottom: 8,
              }}>Legal Disclaimer</div>
              <p style={{
                fontSize: 13, color: "rgba(255,255,255,0.4)",
                fontFamily: "Inter, sans-serif", lineHeight: 1.72,
              }}>
                The documents in this Legal Center represent our good-faith policies and commitments. They are not legal advice. For questions about your specific rights or legal matters, please consult a qualified legal professional. Contact our legal team at <a href="mailto:legal@ghaafeedimusic.com" style={{ color: "#D4A574" }}>legal@ghaafeedimusic.com</a> for platform-specific queries.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
