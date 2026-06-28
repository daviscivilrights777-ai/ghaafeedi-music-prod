import { Link } from "wouter";

const LEGAL_DOCS = [
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    description: "The binding agreement between you and Ghaafeedi Music LLC governing all use of our services, account creation, content submissions, and intellectual property.",
    category: "Customer",
    icon: "📋",
    effective: "June 27, 2026",
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description: "How we collect, use, share, and protect your personal information including biometric data, story submissions, and payment data. Covers CCPA, BIPA, and GDPR rights.",
    category: "Customer",
    icon: "🔒",
    effective: "June 27, 2026",
  },
  {
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    description: "What content is permitted and prohibited on our platform. Zero-tolerance items, sensitive content guidelines, and enforcement procedures.",
    category: "Customer",
    icon: "✅",
    effective: "June 27, 2026",
  },
  {
    slug: "dmca-policy",
    title: "DMCA Policy",
    description: "Our Digital Millennium Copyright Act compliance procedures including takedown requests, counter-notifications, repeat infringer policy, and designated agent information.",
    category: "Customer",
    icon: "⚖️",
    effective: "June 27, 2026",
  },
  {
    slug: "music-video-rights",
    title: "Music & Video Rights",
    description: "Detailed breakdown of intellectual property rights for AI-generated music and video, copyright uncertainty disclosures, commercial licenses, and streaming platform policies.",
    category: "Rights",
    icon: "🎵",
    effective: "June 27, 2026",
  },
  {
    slug: "refund-cancellation",
    title: "Refund & Cancellation Policy",
    description: "Full cancellation windows, production-stage refund schedule, re-generation policy, and step-by-step refund request process.",
    category: "Customer",
    icon: "💳",
    effective: "June 27, 2026",
  },
  {
    slug: "coppa-compliance",
    title: "COPPA Compliance",
    description: "Our Children's Online Privacy Protection Act compliance policy covering age verification, parental consent requirements, and how we handle submissions mentioning minors.",
    category: "Customer",
    icon: "🧒",
    effective: "June 27, 2026",
  },
  {
    slug: "international-policy",
    title: "International Customer Policy",
    description: "Service availability by region, GDPR/UK GDPR compliance for European customers, Canadian PIPEDA rights, currency, VAT, and restricted regions.",
    category: "Customer",
    icon: "🌐",
    effective: "June 27, 2026",
  },
  {
    slug: "music-rights-strategy",
    title: "Music Rights Strategy",
    description: "Current AI music copyright landscape, active litigation to monitor, performing rights organization guidance, sync licensing strategy, and practical steps for customers.",
    category: "Rights",
    icon: "🎼",
    effective: "June 27, 2026",
  },
  {
    slug: "business-compliance",
    title: "Business Compliance Checklist",
    description: "Internal checklist covering LLC formation, DMCA agent registration, insurance requirements (E&O, Cyber, GL, IP), tax compliance, and recommended legal professionals.",
    category: "Internal",
    icon: "📂",
    effective: "June 27, 2026",
  },
  {
    slug: "crisis-protocol",
    title: "Crisis Response Protocol",
    description: "Internal content classification system (Levels 0–4), mandatory reporting obligations under federal and state law, crisis resource inclusion requirements, and emergency procedures.",
    category: "Internal",
    icon: "🚨",
    effective: "June 27, 2026",
  },
  {
    slug: "nda-ip-assignment",
    title: "NDA & IP Assignment",
    description: "Confidentiality, intellectual property assignment, and non-disclosure agreement for all Ghaafeedi Music employees, contractors, and service providers.",
    category: "Internal",
    icon: "🤝",
    effective: "June 27, 2026",
  },
];

function categoryStyles(cat: string) {
  if (cat === "Internal") return { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.35)", text: "#FBB924", label: "INTERNAL" };
  if (cat === "Rights")   return { bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.35)", text: "#A78BFA", label: "RIGHTS" };
  return                         { bg: "rgba(212,175,55,0.10)",  border: "rgba(212,175,55,0.35)",  text: "#D4AF37", label: "POLICY" };
}

export default function LegalPage() {
  const customerDocs = LEGAL_DOCS.filter(d => d.category === "Customer");
  const rightsDocs   = LEGAL_DOCS.filter(d => d.category === "Rights");
  const internalDocs = LEGAL_DOCS.filter(d => d.category === "Internal");

  return (
    <div style={{ minHeight: "100vh", background: "#050B1A", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
      {/* Top nav */}
      <div style={{ borderBottom: "1px solid rgba(212,175,55,0.15)", background: "rgba(11,23,54,0.8)", padding: "16px 24px", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/assets/ghaafeedi-logo-dark.png" alt="Ghaafeedi Music" style={{ height: 32, objectFit: "contain" }} />
          </Link>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Legal Center</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "72px 24px 48px", background: "linear-gradient(180deg, rgba(11,23,54,0.5) 0%, transparent 100%)", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 99, marginBottom: 20, background: "rgba(212,175,55,0.08)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37", display: "inline-block" }} />
          <span style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 600, color: "#D4AF37" }}>LEGAL CENTER</span>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px,5vw,56px)", fontWeight: 700, margin: "0 0 16px", background: "linear-gradient(135deg, #FFFFFF 0%, #D4AF37 60%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Trust &amp; Transparency
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.7 }}>
          All 12 Ghaafeedi Music legal documents — complete, verbatim, no paraphrasing. Your rights and our obligations, fully disclosed.
        </p>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { n: customerDocs.length, label: "Customer Policies" },
            { n: rightsDocs.length,   label: "Rights Documents" },
            { n: internalDocs.length, label: "Internal Docs" },
          ].map(({ n, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: "#D4AF37", fontWeight: 700 }}>{n}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px 80px" }}>

        {/* Customer Policies */}
        <SectionHeader icon="📋" title="Customer Policies" subtitle="Governing your use of Ghaafeedi Music services" />
        <DocGrid docs={customerDocs} />

        {/* Rights Documents */}
        <SectionHeader icon="🎵" title="Rights &amp; Licensing" subtitle="Intellectual property rights for AI-generated content" />
        <DocGrid docs={rightsDocs} />

        {/* Internal Documents */}
        <SectionHeader icon="🔐" title="Internal Documents" subtitle="Operating procedures and compliance checklists" />
        <div style={{ marginBottom: 8, padding: "10px 16px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, fontSize: 12, color: "#FBB924" }}>
          ⚠️ These documents are internal operating documents. They are published here for transparency.
        </div>
        <DocGrid docs={internalDocs} />

        {/* Footer note */}
        <div style={{ marginTop: 72, padding: "32px 24px", background: "rgba(11,23,54,0.6)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#D4AF37", marginBottom: 10 }}>Questions About These Documents?</div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 24, lineHeight: 1.7 }}>
            We believe in full transparency. If any document is unclear or you have questions about your rights, contact our legal team.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:legal@ghaafeedimusic.com" style={{ color: "#D4AF37", textDecoration: "none", fontSize: 13, border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, padding: "10px 20px" }}>legal@ghaafeedimusic.com</a>
            <a href="mailto:privacy@ghaafeedimusic.com" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 13, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 20px" }}>privacy@ghaafeedimusic.com</a>
            <a href="mailto:trust@ghaafeedimusic.com" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 13, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 20px" }}>trust@ghaafeedimusic.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 24, marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 700, color: "#FFFFFF", margin: 0 }} dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>{subtitle}</p>
    </div>
  );
}

function DocGrid({ docs }: { docs: typeof LEGAL_DOCS }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: 16,
      marginBottom: 8,
    }}>
      {docs.map((doc) => {
        const cs = categoryStyles(doc.category);
        return (
          <Link key={doc.slug} href={`/legal/${doc.slug}`} style={{ textDecoration: "none" }}>
            <div style={{
              background: "rgba(11,23,54,0.5)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "22px 20px",
              cursor: "pointer",
              transition: "all 0.2s",
              height: "100%",
              boxSizing: "border-box",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(212,175,55,0.4)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(11,23,54,0.8)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.08)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(11,23,54,0.5)"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
                <span style={{ fontSize: 24 }}>{doc.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", padding: "3px 9px", borderRadius: 99, background: cs.bg, border: `1px solid ${cs.border}`, color: cs.text, flexShrink: 0 }}>
                  {cs.label}
                </span>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: "#FFFFFF", marginBottom: 8, lineHeight: 1.3 }}>
                {doc.title}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 14 }}>
                {doc.description}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Effective {doc.effective}</span>
                <span style={{ color: "#D4AF37", fontSize: 13 }}>Read →</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
