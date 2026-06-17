import { motion } from "framer-motion";

const STEPS = [
  {
    num: "01",
    color: "#D4A574",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
    title: "Share Your Story",
    desc: "Upload your memories, photos, voice recordings, and experiences. Tell us about the emotions, people, and moments you want immortalized.",
    badge: "Step 01",
    time: "~2 min",
  },
  {
    num: "02",
    color: "#8B5CF6",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    title: "AI Analysis",
    desc: "Advanced emotional analysis, story mapping, and creative orchestration. Our AI reads the heart of your story — not just the words.",
    badge: "Step 02",
    time: "Instant",
  },
  {
    num: "03",
    color: "#06B6D4",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
      </svg>
    ),
    title: "Song & Film Creation",
    desc: "Original music, custom lyrics, and cinematic production generated just for you. Every note, every scene crafted from your true story.",
    badge: "Step 03",
    time: "3–14 days",
  },
  {
    num: "04",
    color: "#10B981",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    title: "Receive Your Legacy",
    desc: "Delivered through your private dashboard — yours to keep, share, and cherish forever. A living monument to your story.",
    badge: "Step 04",
    time: "Forever yours",
  },
];

export function HowItWorks() {
  return (
    <section style={{
      padding: "100px 40px 112px",
      background: "linear-gradient(180deg, #0A0B0F 0%, #0F1419 50%, #0A0B0F 100%)",
      borderTop: "1px solid rgba(212,165,116,0.07)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(212,165,116,0.08)",
              border: "1px solid rgba(212,165,116,0.22)",
              borderRadius: 999, padding: "5px 16px", marginBottom: 24,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D4A574" }} />
            <span style={{ fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#D4A574", letterSpacing: "0.20em", textTransform: "uppercase" }}>
              How It Works
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(34px, 4.2vw, 54px)",
              fontWeight: 800, color: "#fff",
              lineHeight: 1.12, marginBottom: 18,
            }}
          >
            From Memory to{" "}
            <span style={{
              background: "linear-gradient(135deg, #F8E08A, #D4A574, #C4925A)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Masterpiece</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontSize: 16, color: "rgba(255,255,255,0.55)",
              fontFamily: "Inter, sans-serif", maxWidth: 520,
              margin: "0 auto", lineHeight: 1.78,
            }}
          >
            A simple 4-step journey from your raw memories to a cinematic legacy that lasts forever.
          </motion.p>
        </div>

        {/* Steps grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          position: "relative",
        }} className="how-it-works-grid">

          {/* Connector line */}
          <div style={{
            position: "absolute",
            top: 60, left: "12.5%", right: "12.5%",
            height: 1,
            background: "linear-gradient(to right, transparent, rgba(212,165,116,0.25) 20%, rgba(212,165,116,0.25) 80%, transparent)",
            zIndex: 0,
            pointerEvents: "none",
          }} className="step-connector" />

          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              style={{
                position: "relative", zIndex: 1,
                background: "linear-gradient(145deg, rgba(15,20,25,0.95), rgba(10,11,15,0.90))",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 20,
                padding: "36px 28px 32px",
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                cursor: "default",
                transition: "all 0.3s ease",
              }}
              whileHover={{ y: -6, borderColor: `rgba(${step.color === "#D4A574" ? "212,165,116" : step.color === "#8B5CF6" ? "139,92,246" : step.color === "#06B6D4" ? "6,182,212" : "16,185,129"},0.35)` }}
            >
              {/* Step number badge */}
              <div style={{
                position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                background: step.color,
                color: "#0A0B0F",
                fontSize: 10, fontFamily: "Inter, sans-serif", fontWeight: 800,
                letterSpacing: "0.14em",
                padding: "3px 12px", borderRadius: 999,
              }}>
                {step.badge}
              </div>

              {/* Icon */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: `linear-gradient(135deg, ${step.color}18, ${step.color}08)`,
                border: `1.5px solid ${step.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: step.color, marginBottom: 22,
                boxShadow: `0 0 24px ${step.color}20`,
              }}>
                {step.icon}
              </div>

              {/* Title */}
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20, fontWeight: 700,
                color: "#fff", marginBottom: 12, lineHeight: 1.25,
              }}>
                {step.title}
              </h3>

              {/* Description */}
              <p style={{
                fontFamily: "Inter, sans-serif", fontSize: 13.5,
                color: "rgba(255,255,255,0.52)", lineHeight: 1.75,
                marginBottom: 16,
              }}>
                {step.desc}
              </p>

              {/* Time estimate badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: `linear-gradient(135deg, ${step.color}14, ${step.color}06)`,
                border: `1px solid ${step.color}28`,
                borderRadius: 999, padding: "4px 12px",
                marginTop: "auto",
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={{ fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600, color: step.color, letterSpacing: "0.06em" }}>
                  {step.time}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{ textAlign: "center", marginTop: 60 }}
        >
          <a href="/onboarding" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg, #F8E08A 0%, #D4A574 55%, #9B6830 100%)",
            color: "#0A0B0F", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15,
            borderRadius: 999, padding: "15px 36px",
            textDecoration: "none",
            boxShadow: "0 8px 32px rgba(212,165,116,0.40)",
            letterSpacing: "0.03em", transition: "all 0.25s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 44px rgba(212,165,116,0.62)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(212,165,116,0.40)";
            }}
          >
            Begin Your Story
            <span style={{ fontSize: 18 }}>→</span>
          </a>
          <p style={{ marginTop: 14, fontSize: 12.5, color: "rgba(255,255,255,0.30)", fontFamily: "Inter, sans-serif" }}>
            No commitment required · Cancel anytime
          </p>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .how-it-works-grid { grid-template-columns: 1fr 1fr !important; }
          .step-connector { display: none !important; }
        }
        @media (max-width: 540px) {
          .how-it-works-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
