import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Link } from "wouter";
import { useState } from "react";

const FADE_UP = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as any } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.1 } } };

const TRUST_SECTIONS = [
  {
    id: "security",
    icon: "🔐",
    color: "#22C55E",
    title: "Security Overview",
    subtitle: "Enterprise-grade infrastructure protecting every interaction",
    content: [
      {
        heading: "Infrastructure Security",
        body: "Ghaafeedi Music is built on enterprise-grade cloud infrastructure with multi-region redundancy. All production systems run in isolated containers with strict network segmentation. We employ zero-trust architecture — no implicit trust at any level of our stack.",
      },
      {
        heading: "Encryption Standards",
        body: "All data in transit is encrypted via TLS 1.3. Data at rest is encrypted using AES-256. Payment data is tokenized — we never store raw card numbers. Voice samples and media files are stored in encrypted S3-compatible storage with unique customer-scoped keys.",
      },
      {
        heading: "Authentication & Access",
        body: "We use JWT-based authentication with short expiry windows and refresh token rotation. Role-based access control (RBAC) ensures team members access only what their role requires. Admin operations require 2FA and are logged to immutable audit trails.",
      },
      {
        heading: "Penetration Testing",
        body: "Our platform undergoes regular security assessments. Vulnerabilities discovered are remediated within defined SLAs based on severity: Critical (24h), High (72h), Medium (2 weeks), Low (next release cycle).",
      },
    ],
    badges: ["TLS 1.3", "AES-256", "Zero Trust", "Multi-Region"],
  },
  {
    id: "data",
    icon: "🗄️",
    color: "#38BDF8",
    title: "Data Protection",
    subtitle: "Your data belongs to you — always",
    content: [
      {
        heading: "Data Minimization",
        body: "We collect only what is strictly necessary to deliver your experience. We do not build advertising profiles, sell data to third parties, or use your personal stories to train AI models without explicit, informed, revocable consent.",
      },
      {
        heading: "Data Residency",
        body: "Customer data is processed in the United States with optional EU processing for European customers. We comply with applicable data residency requirements and will notify customers of any changes to data processing locations.",
      },
      {
        heading: "Retention & Deletion",
        body: "Active account data is retained as long as your subscription is active. On account deletion, personal data is purged within 30 days. Backups are purged within 90 days. Exported legacy packages you download are yours permanently — we have no ongoing access to downloaded files.",
      },
      {
        heading: "Third-Party Processors",
        body: "We maintain a current list of sub-processors used to deliver our service. All processors are bound by data processing agreements. We review processor security postures annually.",
      },
    ],
    badges: ["GDPR Aligned", "CCPA Compliant", "No Data Sales", "30-Day Deletion"],
  },
  {
    id: "privacy",
    icon: "👁️",
    color: "#A78BFA",
    title: "Privacy Controls",
    subtitle: "Granular control over your personal information",
    content: [
      {
        heading: "Your Privacy Dashboard",
        body: "Every Ghaafeedi Music account includes a Privacy Dashboard where you can: view all data we hold about you, download a full data export, manage consent for AI model training, control marketing communications, and request permanent account deletion.",
      },
      {
        heading: "Voice & Likeness Consent",
        body: "Voice cloning and facial likeness features require explicit, granular, revocable consent. You may withdraw consent at any time. On withdrawal, your voice model is deleted within 7 business days and can no longer be used in new productions.",
      },
      {
        heading: "Content Visibility",
        body: "All created content is private by default. You control who sees your songs, films, and legacy packages. Sharing is always opt-in, never automatic. Community features (coming soon) will have layered privacy settings.",
      },
      {
        heading: "AI Training Opt-Out",
        body: "You may opt out of any AI model improvement programs at any time without affecting your service. Your opt-out preference is cryptographically logged and cannot be inadvertently reversed by system updates.",
      },
    ],
    badges: ["Privacy Dashboard", "Consent Management", "Data Portability", "Right to Delete"],
  },
  {
    id: "ai",
    icon: "🤖",
    color: "#D4A574",
    title: "AI Transparency",
    subtitle: "Honest about what AI does and doesn't do",
    content: [
      {
        heading: "AI-Generated Content Disclosure",
        body: "All content produced through our platform is AI-assisted or AI-generated. We clearly label AI-generated elements in your production portal. We never misrepresent AI output as human-created without your knowledge.",
      },
      {
        heading: "Emotional AI & Bias",
        body: "Our emotional analysis AI is trained on diverse datasets to minimize cultural and demographic bias. We acknowledge that no AI system is perfectly unbiased. We actively audit model outputs for disparate impact and publish findings in our annual AI Transparency Report.",
      },
      {
        heading: "AI Decision Limits",
        body: "Our AI recommends — humans decide. No fully automated system makes final decisions about your personal stories, account status, or payment disputes without human review availability. You may always request human review of any AI decision.",
      },
      {
        heading: "Model Provenance",
        body: "We use commercially licensed foundation models (OpenAI, FAL.ai, Sunor.cc) and disclose the general family of models used to generate your content. We do not use models known to contain unlicensed copyrighted training data.",
      },
    ],
    badges: ["AI Labeling", "Bias Audits", "Human Review Available", "Licensed Models"],
  },
  {
    id: "rights",
    icon: "⚖️",
    color: "#F97316",
    title: "Customer Rights",
    subtitle: "Your rights are not buried in fine print",
    content: [
      {
        heading: "Right to Access",
        body: "You may request a complete export of all data associated with your account at any time from your Privacy Dashboard. Exports are delivered within 5 business days in machine-readable JSON format.",
      },
      {
        heading: "Right to Correction",
        body: "If we hold inaccurate information about you, you may correct it directly in your account settings or by contacting support. Corrections are processed within 48 hours.",
      },
      {
        heading: "Right to Deletion",
        body: "You may delete your account and request full data erasure at any time. Note: content you have shared publicly or with third parties before deletion cannot be recalled from those recipients. Locally downloaded files remain yours.",
      },
      {
        heading: "Right to Dispute",
        body: "For billing disputes, production quality concerns, or AI output complaints, you have the right to a full human review within 3 business days. Disputes unresolved after 14 days may be escalated to our executive review team. See our Refund Policy for financial dispute details.",
      },
    ],
    badges: ["Data Access", "Correction Rights", "Erasure Rights", "Dispute Process"],
  },
  {
    id: "responsible-ai",
    icon: "🌐",
    color: "#22C55E",
    title: "Responsible AI Usage",
    subtitle: "Our commitments to ethical AI deployment",
    content: [
      {
        heading: "Prohibited Uses",
        body: "Our platform may not be used to create: non-consensual deepfakes, harassment campaigns, political disinformation, fraudulent identity content, or any content that violates our Community Standards. Violations result in immediate account termination and, where applicable, law enforcement referral.",
      },
      {
        heading: "Content Moderation",
        body: "AI-generated content is subject to automated screening for prohibited categories. Human reviewers are involved in borderline cases. We maintain a Safety Team responsible for reviewing flagged content within 24 hours.",
      },
      {
        heading: "Dual-Use Safeguards",
        body: "Features like voice cloning carry heightened abuse potential. We implement: explicit consent verification, watermarking of cloned voice outputs, rate limiting, and anomaly detection for abnormal production patterns.",
      },
      {
        heading: "Accountability Chain",
        body: "Responsibility for AI safety runs from our founding team through every engineer and product manager. We maintain a designated AI Ethics Officer position responsible for quarterly policy review and annual external audit coordination.",
      },
    ],
    badges: ["Safety Team", "Content Moderation", "Voice Watermarking", "Ethics Officer"],
  },
];

export default function TrustPage() {
  const [activeSection, setActiveSection] = useState("security");
  const active = TRUST_SECTIONS.find(s => s.id === activeSection)!;

  return (
    <div style={{ background: "#0A0B0F", minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      {/* HERO */}
      <section style={{ padding: "120px 40px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 500,
          background: "radial-gradient(ellipse, rgba(34,197,94,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <motion.div initial="hidden" animate="show" variants={STAGGER} style={{ maxWidth: 780, margin: "0 auto", position: "relative" }}>
          <motion.div variants={FADE_UP} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.22)",
            borderRadius: 999, padding: "7px 20px", marginBottom: 32,
          }}>
            <span style={{ color: "#22C55E", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>Trust Center</span>
          </motion.div>

          <motion.h1 variants={FADE_UP} style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(40px, 6vw, 78px)",
            fontWeight: 800, color: "#FFFFFF", lineHeight: 1.08, marginBottom: 24,
          }}>
            Trust is Not a Feature.<br />
            <span style={{ color: "#D4A574" }}>It's Our Foundation.</span>
          </motion.h1>

          <motion.p variants={FADE_UP} style={{
            fontSize: 16.5, color: "rgba(255,255,255,0.55)",
            fontFamily: "Inter, sans-serif", lineHeight: 1.78,
            maxWidth: 620, margin: "0 auto",
          }}>
            We handle your most personal memories. Here is everything you need to know about how we protect, respect, and serve you.
          </motion.p>
        </motion.div>
      </section>

      {/* TRUST BADGES ROW */}
      <div style={{ padding: "0 40px 60px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center",
          }}>
            {[
              { icon: "🔒", label: "TLS 1.3 Encrypted" },
              { icon: "🛡️", label: "PCI DSS Compliant" },
              { icon: "🇺🇸", label: "US Data Processing" },
              { icon: "⚙️", label: "SOC 2 Aligned" },
              { icon: "✅", label: "GDPR Aligned" },
              { icon: "🔏", label: "No Data Sales" },
            ].map((b, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 9,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 12, padding: "12px 20px",
              }}>
                <span style={{ fontSize: 18 }}>{b.icon}</span>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.62)", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{ padding: "0 40px 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 40 }} className="trust-layout">

          {/* SIDEBAR NAV */}
          <div style={{ width: 260, flexShrink: 0 }} className="trust-sidebar">
            <div style={{
              position: "sticky", top: 100,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 18, padding: "12px",
            }}>
              {TRUST_SECTIONS.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: "14px 16px",
                  borderRadius: 12, border: "none", cursor: "pointer",
                  background: activeSection === s.id ? "rgba(212,165,116,0.1)" : "transparent",
                  borderLeft: activeSection === s.id ? "2px solid #D4A574" : "2px solid transparent",
                  textAlign: "left", transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <span style={{
                    fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 600,
                    color: activeSection === s.id ? "#D4A574" : "rgba(255,255,255,0.55)",
                  }}>{s.title}</span>
                </button>
              ))}

              <div style={{ margin: "16px 0 8px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                <Link href="/legal">
                  <a style={{
                    display: "block", padding: "12px 16px",
                    background: "rgba(212,165,116,0.06)", borderRadius: 10,
                    textDecoration: "none", fontSize: 12.5,
                    color: "#D4A574", fontFamily: "Inter, sans-serif",
                    fontWeight: 600, textAlign: "center",
                    border: "1px solid rgba(212,165,116,0.2)",
                  }}>View Legal Center →</a>
                </Link>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as any }}
            style={{ flex: 1 }}
          >
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 22, padding: "48px 44px", marginBottom: 28,
            }}>
              <div style={{ fontSize: 44, marginBottom: 20 }}>{active.icon}</div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 800,
                color: "#FFFFFF", marginBottom: 12,
              }}>{active.title}</h2>
              <p style={{
                fontSize: 15.5, color: "rgba(255,255,255,0.52)",
                fontFamily: "Inter, sans-serif", lineHeight: 1.68, marginBottom: 28,
              }}>{active.subtitle}</p>

              {/* Badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 40 }}>
                {active.badges.map((b, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600,
                    color: active.color, letterSpacing: "0.08em",
                    background: `${active.color}18`,
                    border: `1px solid ${active.color}44`,
                    borderRadius: 999, padding: "5px 14px",
                  }}>{b}</span>
                ))}
              </div>

              {/* Content blocks */}
              {active.content.map((block, i) => (
                <div key={i} style={{
                  marginBottom: 32,
                  paddingBottom: 32,
                  borderBottom: i < active.content.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                  <h3 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 20, fontWeight: 700, color: "#FFFFFF", marginBottom: 12,
                  }}>{block.heading}</h3>
                  <p style={{
                    fontSize: 14.5, color: "rgba(255,255,255,0.58)",
                    fontFamily: "Inter, sans-serif", lineHeight: 1.84,
                  }}>{block.body}</p>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div style={{
              display: "flex", gap: 14, flexWrap: "wrap",
            }}>
              <Link href="/contact">
                <a style={{
                  background: "linear-gradient(135deg, #F8E08A, #D4A574)",
                  color: "#0A0B0F", fontFamily: "Inter, sans-serif",
                  fontWeight: 700, fontSize: 13, letterSpacing: "0.06em",
                  padding: "13px 28px", borderRadius: 10, border: "none",
                  cursor: "pointer", textDecoration: "none", display: "inline-block",
                }}>Ask a Question</a>
              </Link>
              <Link href="/legal">
                <a style={{
                  background: "transparent", color: "#D4A574",
                  fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13,
                  padding: "13px 28px", borderRadius: 10,
                  border: "1px solid rgba(212,165,116,0.3)",
                  cursor: "pointer", textDecoration: "none", display: "inline-block",
                }}>Read Legal Docs</a>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />

      <style>{`
        @media (max-width: 900px) {
          .trust-layout { flex-direction: column !important; }
          .trust-sidebar { width: 100% !important; position: static !important; }
        }
      `}</style>
    </div>
  );
}
