import { motion } from "framer-motion";

const TRUST = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    color: "#10B981",
    title: "Secure Payments",
    sub: "Bank-grade encryption on every transaction. TLS 1.3, PCI DSS compliant.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    color: "#D4A574",
    title: "Private Data Storage",
    sub: "Your memories stay yours — always. We never sell or share your personal data.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 11h8M12 7v8"/>
      </svg>
    ),
    color: "#06B6D4",
    title: "Encrypted Uploads",
    sub: "All files encrypted at rest and in transit. Your uploads are completely private.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    color: "#8B5CF6",
    title: "AI-Powered Creation",
    sub: "Cutting-edge AI orchestration produces genuinely original, emotionally resonant work.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M12 12h.01"/>
      </svg>
    ),
    color: "#F59E0B",
    title: "Customer Ownership",
    sub: "You own 100% of your creations. Full commercial rights transferred on delivery.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    color: "#D4A574",
    title: "24/7 AI Concierge",
    sub: "Sophia is always here — product guidance, order tracking, and creative support.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    color: "#10B981",
    title: "Enterprise Security",
    sub: "SOC 2-aligned infrastructure. Rate limiting, CSRF protection, zero double-charges.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    color: "#8B5CF6",
    title: "Transparent Pricing",
    sub: "No hidden fees. No surprise charges. What you see is exactly what you pay.",
  },
];

export function TrustFeatures() {
  return (
    <section style={{
      padding: "96px 40px 108px",
      background: "linear-gradient(180deg, #0A0B0F 0%, #0F1419 50%, #0A0B0F 100%)",
      borderTop: "1px solid rgba(212,165,116,0.08)",
      borderBottom: "1px solid rgba(212,165,116,0.08)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.22)",
              borderRadius: 999, padding: "5px 16px", marginBottom: 24,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981" }} />
            <span style={{ fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#10B981", letterSpacing: "0.20em", textTransform: "uppercase" }}>
              Why Trust Ghaafeedi Music
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(32px, 4vw, 50px)",
              fontWeight: 800, color: "#fff",
              lineHeight: 1.14, marginBottom: 16,
            }}
          >
            Your Story Deserves{" "}
            <span style={{
              background: "linear-gradient(135deg, #F8E08A, #D4A574, #C4925A)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Complete Trust</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontSize: 15.5, color: "rgba(255,255,255,0.50)",
              fontFamily: "Inter, sans-serif",
              maxWidth: 480, margin: "0 auto", lineHeight: 1.78,
            }}
          >
            Every safeguard in place so you can share your most personal memories with complete confidence.
          </motion.p>
        </div>

        {/* 4×2 grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
        }} className="trust-grid">
          {TRUST.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              style={{
                background: "linear-gradient(145deg, rgba(15,20,25,0.95), rgba(10,11,15,0.90))",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18,
                padding: "28px 22px",
                transition: "all 0.3s ease",
                cursor: "default",
              }}
              whileHover={{
                y: -5,
                borderColor: `${item.color}35`,
                boxShadow: `0 16px 48px ${item.color}15`,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: `linear-gradient(135deg, ${item.color}18, ${item.color}06)`,
                border: `1.5px solid ${item.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: item.color, marginBottom: 18,
                boxShadow: `0 0 20px ${item.color}15`,
              }}>
                {item.icon}
              </div>

              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 17, fontWeight: 700,
                color: "#fff", marginBottom: 8, lineHeight: 1.25,
              }}>
                {item.title}
              </h3>
              <p style={{
                fontFamily: "Inter, sans-serif", fontSize: 13,
                color: "rgba(255,255,255,0.48)", lineHeight: 1.72,
              }}>
                {item.sub}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Trust link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          style={{ textAlign: "center", marginTop: 44 }}
        >
          <a href="/trust" style={{
            fontSize: 13, color: "#D4A574", fontFamily: "Inter, sans-serif",
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
            borderBottom: "1px solid rgba(212,165,116,0.30)",
            paddingBottom: 2, transition: "all 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#D4A574"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.30)"}
          >
            View Full Trust Center
            <span style={{ fontSize: 15 }}>→</span>
          </a>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 1100px) { .trust-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 540px)  { .trust-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
