import { motion } from "framer-motion";

const ITEMS = [
  {
    color: "#8B5CF6", colorDim: "rgba(139,92,246,",
    emoji: "♪",
    title: "Cinematic Songs",
    sub: "Turn Stories Into Timeless Music",
  },
  {
    color: "#D4A574", colorDim: "rgba(212,165,116,",
    emoji: "🎙",
    title: "AI Music Studio",
    sub: "Create & Produce Original Songs",
  },
  {
    color: "#EC4899", colorDim: "rgba(236,72,153,",
    emoji: "💬",
    title: "Sophia Companion",
    sub: "AI That Listens & Understands You",
  },
  {
    color: "#06B6D4", colorDim: "rgba(6,182,212,",
    emoji: "✦",
    title: "Dream Visualization",
    sub: "Turn Imagination Into Cinema",
  },
  {
    color: "#10B981", colorDim: "rgba(16,185,129,",
    emoji: "🏛",
    title: "Family Legacy Vault",
    sub: "Preserve Generations of Memories",
  },
  {
    color: "#F59E0B", colorDim: "rgba(245,158,11,",
    emoji: "❤",
    title: "Emotion Soundtracks",
    sub: "Match Feelings With Perfect Music",
  },
  {
    color: "#8B5CF6", colorDim: "rgba(139,92,246,",
    emoji: "📖",
    title: "AI Audiobook Creator",
    sub: "AI-Narrated Stories From Your Life",
  },
  {
    color: "#D4A574", colorDim: "rgba(212,165,116,",
    emoji: "⬡",
    title: "Ghaafeedi Label",
    sub: "Professional Distribution for Artists",
  },
];

export function EcosystemSection() {
  return (
    <section style={{ padding: "96px 40px", background: "#0A0B0F" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22 }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(212,165,116,0.35))" }} />
          <span style={{
            color: "#D4A574", fontSize: 11, fontFamily: "Inter, sans-serif",
            fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", whiteSpace: "nowrap",
          }}>THE GHAAFEEDI ECOSYSTEM</span>
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
            textAlign: "center", marginBottom: 60,
          }}
        >
          Everything You Need to{" "}
          <span style={{
            background: "linear-gradient(135deg, #F8E08A, #D4A574)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>Tell Your Story</span>
        </motion.h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}>
          {ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.055 }}
              whileHover={{ y: -7, boxShadow: `0 16px 36px ${item.colorDim}0.25)` }}
              style={{
                background: "#0F1419",
                border: `1px solid ${item.colorDim}0.20)`,
                borderRadius: 16,
                padding: "24px 16px",
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", cursor: "pointer",
                transition: "all 0.28s",
              }}
            >
              {/* Icon */}
              <div style={{
                width: 58, height: 58, borderRadius: "50%",
                background: `radial-gradient(circle, ${item.colorDim}0.28), ${item.colorDim}0.08))`,
                border: `1.5px solid ${item.colorDim}0.40)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: item.color, fontSize: 22,
                marginBottom: 14,
                boxShadow: `0 0 22px ${item.colorDim}0.18)`,
              }}>{item.emoji}</div>

              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 13, fontWeight: 700, color: "#fff",
                marginBottom: 7, lineHeight: 1.28,
              }}>{item.title}</div>
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.45)",
                fontFamily: "Inter, sans-serif", lineHeight: 1.48,
              }}>{item.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
