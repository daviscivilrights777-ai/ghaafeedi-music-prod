import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STATS = [
  { value: "14,200+", label: "Creations Delivered",    icon: "🎬" },
  { value: "98.4%",   label: "Average Satisfaction",   icon: "⭐" },
  { value: "6,800+",  label: "Story Transformations",  icon: "✦" },
  { value: "142",     label: "Countries Reached",      icon: "🌍" },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    location: "Atlanta, GA",
    product: "Cinematic Songs · Creator Plan",
    avatar: "M",
    color: "#8B5CF6",
    text: "I uploaded voice memos, old photos, and a paragraph about my father who passed. Within 5 days, Ghaafeedi Music sent me a 4-minute song that made my entire family cry. It was him. His energy. His love. I can't explain it — it's magic.",
    rating: 5,
    verified: true,
    recency: "3 days ago",
    helpful: 142,
  },
  {
    name: "Sophia R.",
    location: "London, UK",
    product: "5-Min Cinematic Experience · Elite",
    avatar: "S",
    color: "#D4A574",
    text: "Our 10-year anniversary film. My husband and I watched it together and couldn't believe what AI had created from our memories. The music, the visuals, the narration — it felt like a Hollywood production of our love story. Absolutely stunning.",
    rating: 5,
    verified: true,
    recency: "1 week ago",
    helpful: 98,
  },
  {
    name: "James O.",
    location: "Lagos, Nigeria",
    product: "Memorial Legacy Film · Professional",
    avatar: "J",
    color: "#06B6D4",
    text: "I created a memorial for my grandmother. Three generations of my family gathered to watch it at her remembrance. There wasn't a dry eye in the room. Ghaafeedi Music gave us something we will treasure forever. This platform changed grief for us.",
    rating: 5,
    verified: true,
    recency: "2 weeks ago",
    helpful: 217,
  },
  {
    name: "Aaliyah K.",
    location: "Dubai, UAE",
    product: "Cinematic Songs · Professional Plan",
    avatar: "A",
    color: "#10B981",
    text: "I've been through a journey of healing after a painful relationship. I shared my story — all of it — and the song they created captured every emotion I couldn't put into words. Healing through music has a whole new meaning to me now.",
    rating: 5,
    verified: true,
    recency: "5 days ago",
    helpful: 183,
  },
  {
    name: "David M.",
    location: "Toronto, Canada",
    product: "2-Min Cinematic Experience · Premium",
    avatar: "D",
    color: "#F59E0B",
    text: "I used this as a gift for my parents' golden anniversary. The short film combined 50 years of their life — photos, stories, everything — into 2 minutes that left them speechless. Worth every single penny. This is priceless.",
    rating: 5,
    verified: true,
    recency: "4 days ago",
    helpful: 76,
  },
];

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: "#D4A574", fontSize: 14 }}>★</span>
      ))}
    </div>
  );
}

export function SocialProof() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % TESTIMONIALS.length), 8000);
    return () => clearInterval(id);
  }, []);

  function prev() { setActive(a => (a - 1 + TESTIMONIALS.length) % TESTIMONIALS.length); }
  function next() { setActive(a => (a + 1) % TESTIMONIALS.length); }

  return (
    <section style={{
      padding: "96px 40px 108px",
      background: "linear-gradient(180deg, #0A0B0F 0%, #0F1419 50%, #0A0B0F 100%)",
      borderTop: "1px solid rgba(212,165,116,0.08)",
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
              background: "rgba(212,165,116,0.08)",
              border: "1px solid rgba(212,165,116,0.22)",
              borderRadius: 999, padding: "5px 16px", marginBottom: 24,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D4A574" }} />
            <span style={{ fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#D4A574", letterSpacing: "0.20em", textTransform: "uppercase" }}>
              Real Stories
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(32px, 4vw, 52px)",
              fontWeight: 800, color: "#fff",
              lineHeight: 1.12, marginBottom: 16,
            }}
          >
            Real Stories.{" "}
            <span style={{
              background: "linear-gradient(135deg, #F8E08A, #D4A574, #C4925A)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Real Transformations.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: 15.5, color: "rgba(255,255,255,0.50)", fontFamily: "Inter, sans-serif", maxWidth: 460, margin: "0 auto", lineHeight: 1.78 }}
          >
            Thousands of families, couples, and individuals have transformed their most precious memories into timeless art.
          </motion.p>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20, marginBottom: 72,
        }} className="stats-grid">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              style={{
                background: "linear-gradient(145deg, rgba(15,20,25,0.95), rgba(10,11,15,0.90))",
                border: "1px solid rgba(212,165,116,0.12)",
                borderRadius: 18,
                padding: "28px 22px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(28px, 3vw, 38px)",
                fontWeight: 800,
                background: "linear-gradient(135deg, #F8E08A, #D4A574)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                lineHeight: 1, marginBottom: 8,
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.48)", fontFamily: "Inter, sans-serif", lineHeight: 1.4 }}>
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Testimonial carousel */}
        <div style={{ position: "relative" }}>
          {/* Prev / Next arrows */}
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            style={{
              position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
              zIndex: 10, background: "rgba(212,165,116,0.10)",
              border: "1px solid rgba(212,165,116,0.28)", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#D4A574", fontSize: 18, transition: "all 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(212,165,116,0.22)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.55)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(212,165,116,0.10)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.28)"; }}
          >‹</button>
          <button
            onClick={next}
            aria-label="Next testimonial"
            style={{
              position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
              zIndex: 10, background: "rgba(212,165,116,0.10)",
              border: "1px solid rgba(212,165,116,0.28)", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#D4A574", fontSize: 18, transition: "all 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(212,165,116,0.22)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.55)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(212,165,116,0.10)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.28)"; }}
          >›</button>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              style={{
                background: "linear-gradient(145deg, rgba(15,20,25,0.98), rgba(10,11,15,0.95))",
                border: "1px solid rgba(212,165,116,0.14)",
                borderRadius: 24,
                padding: "clamp(28px, 5vw, 48px) clamp(24px, 5vw, 56px)",
                maxWidth: 860, margin: "0 auto",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Quote mark */}
              <div style={{
                position: "absolute", top: 24, right: 40,
                fontFamily: "'Playfair Display', serif",
                fontSize: 120, lineHeight: 1,
                color: "rgba(212,165,116,0.07)",
                userSelect: "none",
              }}>"</div>

              {/* Stars + verified + recency row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                <Stars count={TESTIMONIALS[active]!.rating} />
                {TESTIMONIALS[active]!.verified && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "rgba(34,197,94,0.10)",
                    border: "1px solid rgba(34,197,94,0.28)",
                    borderRadius: 999, padding: "3px 10px",
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#22C55E">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      <path d="M9 12l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: 10.5, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#22C55E", letterSpacing: "0.06em" }}>
                      VERIFIED PURCHASE
                    </span>
                  </div>
                )}
                <span style={{
                  fontSize: 11.5, fontFamily: "Inter, sans-serif",
                  color: "rgba(255,255,255,0.32)", marginLeft: "auto",
                }}>
                  {TESTIMONIALS[active]!.recency}
                </span>
              </div>

              {/* Quote */}
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(17px, 2.2vw, 22px)",
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.72, marginBottom: 28,
                fontStyle: "italic",
                position: "relative", zIndex: 1,
              }}>
                "{TESTIMONIALS[active]!.text}"
              </p>

              {/* Author + helpful */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${TESTIMONIALS[active]!.color}60, ${TESTIMONIALS[active]!.color}30)`,
                    border: `2px solid ${TESTIMONIALS[active]!.color}50`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 20, fontWeight: 700, color: TESTIMONIALS[active]!.color,
                    flexShrink: 0,
                  }}>
                    {TESTIMONIALS[active]!.avatar}
                  </div>
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>
                      {TESTIMONIALS[active]!.name}
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "rgba(255,255,255,0.42)", marginTop: 2 }}>
                      {TESTIMONIALS[active]!.location} · {TESTIMONIALS[active]!.product}
                    </div>
                  </div>
                </div>
                {/* Helpful count */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 999, padding: "5px 13px",
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                  <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                    {TESTIMONIALS[active]!.helpful} found helpful
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 28 }}>
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  width: i === active ? 28 : 8,
                  height: 8, borderRadius: 999,
                  background: i === active ? "#D4A574" : "rgba(255,255,255,0.18)",
                  border: "none", cursor: "pointer",
                  transition: "all 0.3s ease", padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 540px) { .stats-grid { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
    </section>
  );
}
