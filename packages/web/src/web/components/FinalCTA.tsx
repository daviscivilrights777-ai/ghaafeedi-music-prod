import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section style={{ position: "relative", overflow: "hidden", minHeight: 540 }}>
      {/* BG */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('/images/hero-poster.png')",
        backgroundSize: "cover", backgroundPosition: "center",
        zIndex: 0, filter: "brightness(0.42) saturate(1.2)",
      }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to right, rgba(10,11,15,0.97) 0%, rgba(10,11,15,0.82) 42%, rgba(10,11,15,0.55) 68%, rgba(10,11,15,0.25) 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 160, background: "linear-gradient(to bottom, #0A0B0F, transparent)", zIndex: 2 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 160, background: "linear-gradient(to top, #0A0B0F, transparent)", zIndex: 2 }} />
      <div style={{
        position: "absolute", top: "50%", left: "38%", transform: "translate(-50%,-50%)",
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(212,165,116,0.10) 0%, transparent 70%)",
        zIndex: 1,
      }} />

      <div style={{
        position: "relative", zIndex: 3,
        maxWidth: 1440, margin: "0 auto",
        padding: "100px 40px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 48, alignItems: "center",
      }} className="final-cta-grid">

        {/* Left */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(212,165,116,0.10)",
              border: "1px solid rgba(212,165,116,0.28)",
              borderRadius: 999, padding: "5px 16px", marginBottom: 24,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D4A574" }} />
            <span style={{ fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#D4A574", letterSpacing: "0.20em", textTransform: "uppercase" }}>
              Begin Your Legacy
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(34px, 4.5vw, 58px)",
              fontWeight: 900, lineHeight: 1.06, marginBottom: 22,
            }}
          >
            <span style={{
              background: "linear-gradient(135deg, #F8E08A 0%, #D4A574 40%, #C4925A 70%, #F8E08A 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              display: "block",
            }}>Your Memories</span>
            <span style={{ color: "#fff", display: "block" }}>Deserve To Live</span>
            <span style={{ color: "#fff", display: "block" }}>Forever.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.25 }}
            style={{
              fontFamily: "Inter, sans-serif", fontSize: 16,
              color: "rgba(255,255,255,0.62)", lineHeight: 1.80,
              marginBottom: 40, maxWidth: 480,
            }}
          >
            Every family has a story worth telling. Every love deserves a soundtrack. Every life moment should be preserved as the cinematic masterpiece it truly is.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.38 }}
            style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
          >
            <a href="/onboarding" style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              background: "linear-gradient(135deg, #F8E08A 0%, #D4A574 55%, #9B6830 100%)",
              color: "#0A0B0F", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15,
              borderRadius: 999, padding: "15px 34px",
              textDecoration: "none",
              boxShadow: "0 8px 32px rgba(212,165,116,0.45)",
              letterSpacing: "0.03em", transition: "all 0.25s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 48px rgba(212,165,116,0.65)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(212,165,116,0.45)";
              }}
            >
              Start Your Story
              <span style={{ fontSize: 18 }}>→</span>
            </a>

            <a href="/products" style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              background: "rgba(212,165,116,0.07)", backdropFilter: "blur(8px)",
              color: "#D4A574", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15,
              borderRadius: 999, padding: "14px 30px",
              border: "1.5px solid rgba(212,165,116,0.40)",
              textDecoration: "none", transition: "all 0.25s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.75)";
                (e.currentTarget as HTMLElement).style.background = "rgba(212,165,116,0.14)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(212,165,116,0.18)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.40)";
                (e.currentTarget as HTMLElement).style.background = "rgba(212,165,116,0.07)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              Explore Products
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.55 }}
            style={{ marginTop: 18, fontSize: 13.5, color: "rgba(255,255,255,0.38)", fontFamily: "Inter, sans-serif" }}
          >
            No commitment required · Cancel anytime · 100% ownership of your creations
          </motion.p>
        </div>

        {/* Right — stat cards */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, delay: 0.2 }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          className="final-stats-grid"
        >
          {[
            { value: "14,200+", label: "Creations Delivered",  icon: "🎬", color: "#D4A574" },
            { value: "98.4%",   label: "Satisfaction Rate",    icon: "⭐", color: "#8B5CF6" },
            { value: "6,800+",  label: "Transformations",      icon: "✦",  color: "#06B6D4" },
            { value: "24/7",    label: "AI Concierge",         icon: "💬", color: "#10B981" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "rgba(10,11,15,0.85)", backdropFilter: "blur(12px)",
              border: `1px solid ${s.color}25`,
              borderRadius: 18, padding: "24px 20px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(24px, 2.5vw, 32px)",
                fontWeight: 800,
                background: "linear-gradient(135deg, #F8E08A, #D4A574)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                lineHeight: 1, marginBottom: 7,
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.50)", fontFamily: "Inter, sans-serif" }}>
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .final-cta-grid { grid-template-columns: 1fr !important; }
          .final-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}
