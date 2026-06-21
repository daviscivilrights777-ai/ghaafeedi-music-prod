import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

// ─── Duration selector configs ─────────────────────────────────────────────────
// "5-min category" → dropdown: 5 / 10 / 15 min  [Lawrence approved 2026-06-19]
const DURATION_5_TIERS = [
  {
    label: "5 Min",
    tiers: [
      { name: "ESSENTIAL", price: "$149", compareAt: "$199", sub: "5-Min Film",  revisions: "1 Revision" },
      { name: "PREMIUM",   price: "$249", compareAt: "$329", sub: "10-Min Film", revisions: "2 Revisions", highlight: true, saving: "Save $80" },
      { name: "ELITE",     price: "$399", compareAt: "$529", sub: "15-Min Film", revisions: "3 Revisions" },
    ],
  },
  {
    label: "10 Min",
    tiers: [
      { name: "ESSENTIAL", price: "$149", compareAt: "$199", sub: "5-Min Film",  revisions: "1 Revision" },
      { name: "PREMIUM",   price: "$249", compareAt: "$329", sub: "10-Min Film", revisions: "2 Revisions", highlight: true, saving: "Save $80" },
      { name: "ELITE",     price: "$399", compareAt: "$529", sub: "15-Min Film", revisions: "3 Revisions" },
    ],
  },
  {
    label: "15 Min",
    tiers: [
      { name: "ESSENTIAL", price: "$149", compareAt: "$199", sub: "5-Min Film",  revisions: "1 Revision" },
      { name: "PREMIUM",   price: "$249", compareAt: "$329", sub: "10-Min Film", revisions: "2 Revisions", highlight: true, saving: "Save $80" },
      { name: "ELITE",     price: "$399", compareAt: "$529", sub: "15-Min Film", revisions: "3 Revisions" },
    ],
  },
];

// "Cinematic Masterpiece" → dropdown: 20 / 25 / 30 min
// 20min: Essential $449 / Premium $600 / Elite $799
// 25min: Essential $549 / Premium $749 / Elite $999
// 30min: Essential $649 / Premium $899 / Elite $1,199
const DURATION_10_TIERS = [
  {
    label: "20 Min",
    tiers: [
      { name: "ESSENTIAL", price: "$449",  compareAt: "$599",  sub: "20-Min Film", revisions: "2 Revisions" },
      { name: "PREMIUM",   price: "$600",  compareAt: "$799",  sub: "20-Min Film", revisions: "3 Revisions", highlight: true, saving: "Save $199" },
      { name: "ELITE",     price: "$799",  compareAt: "$999",  sub: "20-Min Film", revisions: "4 Revisions" },
    ],
  },
  {
    label: "25 Min",
    tiers: [
      { name: "ESSENTIAL", price: "$549",  compareAt: "$749",  sub: "25-Min Film", revisions: "2 Revisions" },
      { name: "PREMIUM",   price: "$749",  compareAt: "$999",  sub: "25-Min Film", revisions: "3 Revisions", highlight: true, saving: "Save $250" },
      { name: "ELITE",     price: "$999",  compareAt: "$1,299", sub: "25-Min Film", revisions: "4 Revisions" },
    ],
  },
  {
    label: "30 Min",
    tiers: [
      { name: "ESSENTIAL", price: "$649",  compareAt: "$899",  sub: "30-Min Film", revisions: "2 Revisions" },
      { name: "PREMIUM",   price: "$899",  compareAt: "$1,199", sub: "30-Min Film", revisions: "3 Revisions", highlight: true, saving: "Save $300" },
      { name: "ELITE",     price: "$1,199", compareAt: "$1,599", sub: "30-Min Film", revisions: "4 Revisions" },
    ],
  },
];

const PRODUCTS = [
  {
    num: "01",
    img: "/images/card-voice-cloning-v2.png",
    accent: "#8B5CF6",
    title: "Personalized\nCinematic Songs",
    outcome: "Transform your emotions into original music that moves souls.",
    tags: ["AI Lyrics", "Cinematic Scoring", "Emotional Expression", "Premium Mix"],
    tiers: [
      { name: "ESSENTIAL", price: "$19", compareAt: "$29",  sub: "2 Songs/mo",  revisions: "1 Revision" },
      { name: "CREATOR",   price: "$39", compareAt: "$59",  sub: "5 Songs/mo",  revisions: "2 Revisions", highlight: true, saving: "Save $20" },
      { name: "PRO",       price: "$69", compareAt: "$99",  sub: "12 Songs/mo", revisions: "3 Revisions" },
    ],
    durationOptions: null,
    includes: ["Original AI lyrics", "Cinematic orchestral scoring", "Studio-quality mix & master", "Full commercial rights", "MP3 + WAV delivery"],
    delivery: "Delivery: 3–5 Business Days",
    cta: "Start Creating",
    href: "/products",
    orders: "3,241",
    rating: "4.97",
    spots: 4,
  },
  {
    num: "02",
    img: "/images/card-relationship-v2.png",
    accent: "#D4A574",
    title: "2-Min Cinematic\nExperience",
    outcome: "A powerful short film telling your story with AI visuals & original score.",
    tags: ["AI Visuals", "Custom Score", "Voice Narration", "4K Output"],
    tiers: [
      { name: "ESSENTIAL", price: "$79",  compareAt: "$119", sub: "2-Min Film",  revisions: "1 Revision" },
      { name: "PREMIUM",   price: "$129", compareAt: "$189", sub: "4-Min Film",  revisions: "2 Revisions", highlight: true, saving: "Save $60" },
      { name: "ELITE",     price: "$150", compareAt: "$219", sub: "6-Min Film",  revisions: "3 Revisions" },
    ],
    durationOptions: null,
    includes: ["AI-generated cinematic visuals", "Original custom score", "AI voice narration", "4K MP4 master file", "Private streaming link"],
    delivery: "Delivery: 5–7 Business Days",
    cta: "Create My Film",
    href: "/products",
    orders: "1,872",
    rating: "4.96",
    spots: 6,
  },
  {
    num: "03",
    img: "/images/card-memorial-v2.png",
    accent: "#06B6D4",
    title: "5-Min Cinematic\nExperience",
    outcome: "A full cinematic film with AI scenes, orchestral score, and your narrative.",
    tags: ["AI Scenes", "Orchestral Score", "AI Narration", "4K Master"],
    tiers: DURATION_5_TIERS[0]!.tiers, // default shown = 5 min
    durationOptions: DURATION_5_TIERS,
    includes: ["Full AI scene generation", "Orchestral original score", "Custom narration & script", "4K master + social cuts", "Family-share vault access"],
    delivery: "Delivery: 7–10 Business Days",
    cta: "Create My Film",
    href: "/products",
    orders: "948",
    rating: "4.98",
    spots: 3,
  },
  {
    num: "04",
    img: "/images/card-couples-v2.png",
    accent: "#10B981",
    title: "20-Min Cinematic\nMasterpiece",
    outcome: "The ultimate legacy — a documentary-grade production of your life story.",
    tags: ["Feature Length", "Documentary Grade", "Legacy Archive", "Unlimited Share"],
    tiers: DURATION_10_TIERS[0]!.tiers, // default shown = 20 min
    durationOptions: DURATION_10_TIERS,
    includes: ["Documentary-grade AI production", "Full orchestral score", "Multi-chapter narration", "Unlimited family sharing", "Legacy vault + NFT option"],
    delivery: "Delivery: 10–14 Business Days",
    cta: "Start My Legacy",
    href: "/products",
    orders: "412",
    rating: "5.0",
    spots: 2,
  },
];

function getAccentRGB(hex: string) {
  if (hex === "#8B5CF6") return "139,92,246";
  if (hex === "#D4A574") return "212,165,116";
  if (hex === "#06B6D4") return "6,182,212";
  if (hex === "#10B981") return "16,185,129";
  return "212,165,116";
}

function StarRating({ rating }: { rating: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="#D4A574">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
      <span style={{ fontSize: 11.5, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#D4A574", marginLeft: 4 }}>{rating}</span>
    </div>
  );
}

// ─── Duration pill selector ────────────────────────────────────────────────────
function DurationSelector({
  options,
  selected,
  onSelect,
  accent,
  rgb,
}: {
  options: typeof DURATION_5_TIERS;
  selected: number;
  onSelect: (i: number) => void;
  accent: string;
  rgb: string;
}) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 14,
        padding: "8px 10px",
        background: `rgba(${rgb},0.06)`,
        border: `1px solid rgba(${rgb},0.18)`,
        borderRadius: 10,
      }}
    >
      <span style={{ fontSize: 10, fontFamily: "Inter, sans-serif", fontWeight: 700, color: `rgba(${rgb},0.65)`, letterSpacing: "0.12em", textTransform: "uppercase", marginRight: 4, whiteSpace: "nowrap" }}>
        Duration
      </span>
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={e => { e.stopPropagation(); onSelect(i); }}
          style={{
            flex: 1,
            padding: "5px 0",
            borderRadius: 7,
            border: selected === i ? `1.5px solid ${accent}` : "1.5px solid transparent",
            background: selected === i ? `rgba(${rgb},0.18)` : "transparent",
            color: selected === i ? accent : "rgba(255,255,255,0.45)",
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            fontWeight: selected === i ? 700 : 500,
            cursor: "pointer",
            transition: "all 0.18s",
            letterSpacing: "0.03em",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ProductCards() {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState<number | null>(null);
  // per-card duration index (only for cards 2 & 3 which have durationOptions)
  const [durationIdx, setDurationIdx] = useState<Record<number, number>>({ 2: 0, 3: 0 });

  // Get active tiers for a card
  function getActiveTiers(cardIdx: number) {
    const p = PRODUCTS[cardIdx];
    if (!p) return [];
    if (!p.durationOptions) return p.tiers;
    const di = durationIdx[cardIdx] ?? 0;
    return p.durationOptions[di]?.tiers ?? p.tiers;
  }

  return (
    <section style={{ padding: "96px 40px 108px", background: "#0A0B0F" }}>
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
              Our Creations
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
            Experiences That{" "}
            <span style={{
              background: "linear-gradient(135deg, #F8E08A, #D4A574, #C4925A)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Last Forever</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: 15.5, color: "rgba(255,255,255,0.50)", fontFamily: "Inter, sans-serif", maxWidth: 480, margin: "0 auto", lineHeight: 1.78 }}
          >
            Every product is crafted to answer one question: how will this transform your memories into something meaningful?
          </motion.p>
        </div>

        {/* Cards grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 24,
        }} className="product-cards-grid">
          {PRODUCTS.map((p, i) => {
            const rgb = getAccentRGB(p.accent);
            const isExpanded = expanded === i;
            const activeTiers = getActiveTiers(i);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: i * 0.10 }}
                style={{
                  background: "linear-gradient(145deg, rgba(15,20,25,0.98), rgba(10,11,15,0.95))",
                  border: `1px solid rgba(${rgb},0.14)`,
                  borderRadius: 24,
                  overflow: "hidden",
                  transition: "border-color 0.35s ease, box-shadow 0.35s ease",
                  cursor: "pointer",
                }}
                whileHover={{
                  y: -6,
                  borderColor: `rgba(${rgb},0.40)`,
                  boxShadow: `0 20px 60px rgba(${rgb},0.14)`,
                }}
                onClick={() => setLocation(p.href)}
              >
                {/* Image */}
                <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
                  <img
                    src={p.img}
                    alt={p.title}
                    style={{
                      width: "100%", height: "100%", objectFit: "cover",
                      filter: "brightness(0.78) saturate(1.18)",
                      transition: "transform 0.5s ease",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "scale(1)"}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(to top, rgba(10,11,15,0.92) 0%, rgba(10,11,15,0.30) 60%, transparent 100%)`,
                  }} />

                  {/* Number badge */}
                  <div style={{
                    position: "absolute", top: 16, left: 16,
                    background: `rgba(${rgb},0.90)`,
                    color: "#fff", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 800,
                    letterSpacing: "0.14em", padding: "3px 10px", borderRadius: 999,
                  }}>
                    #{p.num}
                  </div>

                  {/* Scarcity badge */}
                  <div style={{
                    position: "absolute", top: 16, right: 16,
                    display: "flex", alignItems: "center", gap: 5,
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.38)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 999, padding: "4px 10px",
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#EF4444",
                      animation: "scarcityPulse 1.8s ease-out infinite",
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 10.5, fontFamily: "Inter, sans-serif", fontWeight: 700,
                      color: "#FCA5A5", letterSpacing: "0.04em", whiteSpace: "nowrap",
                    }}>
                      {p.spots} spots left
                    </span>
                  </div>

                  {/* Delivery badge */}
                  <div style={{
                    position: "absolute", bottom: 14, right: 14,
                    background: "rgba(10,11,15,0.85)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.65)", fontSize: 10.5,
                    fontFamily: "Inter, sans-serif", fontWeight: 500,
                    padding: "4px 10px", borderRadius: 999,
                  }}>
                    {p.delivery}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: "22px 28px 26px" }}>

                  {/* Title + social proof row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                    <h3 style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 21, fontWeight: 800,
                      color: "#fff", lineHeight: 1.22,
                      whiteSpace: "pre-line", flex: 1,
                    }}>
                      {p.title}
                    </h3>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <StarRating rating={p.rating} />
                      <div style={{
                        fontSize: 11, fontFamily: "Inter, sans-serif",
                        color: "rgba(255,255,255,0.36)", marginTop: 3,
                      }}>
                        {p.orders} orders
                      </div>
                    </div>
                  </div>

                  {/* Outcome */}
                  <p style={{
                    fontFamily: "Inter, sans-serif", fontSize: 13.5,
                    color: "rgba(255,255,255,0.55)", lineHeight: 1.68,
                    marginBottom: 18,
                  }}>
                    {p.outcome}
                  </p>

                  {/* Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                    {p.tags.map((tag, ti) => (
                      <span key={ti} style={{
                        fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600,
                        color: `rgba(${rgb},0.90)`,
                        background: `rgba(${rgb},0.10)`,
                        border: `1px solid rgba(${rgb},0.22)`,
                        borderRadius: 999, padding: "3px 10px",
                        letterSpacing: "0.04em",
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Duration selector — only for cards with options */}
                  {p.durationOptions && (
                    <DurationSelector
                      options={p.durationOptions}
                      selected={durationIdx[i] ?? 0}
                      onSelect={di => setDurationIdx(prev => ({ ...prev, [i]: di }))}
                      accent={p.accent}
                      rgb={rgb}
                    />
                  )}

                  {/* Pricing tiers */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8, marginBottom: 16,
                  }}>
                    <AnimatePresence mode="wait">
                      {activeTiers.map((tier, ti) => (
                        <motion.div
                          key={`${i}-${durationIdx[i] ?? 0}-${ti}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18, delay: ti * 0.04 }}
                          style={{
                            background: tier.highlight
                              ? `linear-gradient(135deg, rgba(${rgb},0.18), rgba(${rgb},0.08))`
                              : "rgba(255,255,255,0.03)",
                            border: tier.highlight
                              ? `1.5px solid rgba(${rgb},0.45)`
                              : "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 12,
                            padding: "12px 8px 10px",
                            textAlign: "center",
                            position: "relative",
                          }}>
                          {tier.highlight && (
                            <div style={{
                              position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)",
                              background: p.accent, color: "#0A0B0F",
                              fontSize: 8, fontFamily: "Inter, sans-serif", fontWeight: 800,
                              letterSpacing: "0.12em", padding: "2px 8px", borderRadius: 999,
                              whiteSpace: "nowrap",
                            }}>POPULAR</div>
                          )}

                          <div style={{
                            fontSize: 9, fontFamily: "Inter, sans-serif", fontWeight: 700,
                            color: tier.highlight ? p.accent : "rgba(255,255,255,0.40)",
                            letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4,
                          }}>
                            {tier.name}
                          </div>

                          <div style={{
                            fontSize: 9.5, fontFamily: "Inter, sans-serif",
                            color: "rgba(255,255,255,0.28)",
                            textDecoration: "line-through",
                            lineHeight: 1, marginBottom: 2,
                          }}>
                            {tier.compareAt}
                          </div>

                          <div style={{
                            fontSize: 21, fontFamily: "'Playfair Display', serif", fontWeight: 800,
                            color: tier.highlight ? p.accent : "#fff",
                            lineHeight: 1, marginBottom: 3,
                          }}>
                            {tier.price}
                          </div>

                          <div style={{ fontSize: 10, fontFamily: "Inter, sans-serif", color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
                            {tier.sub}
                          </div>
                          <div style={{ fontSize: 9.5, fontFamily: "Inter, sans-serif", color: "rgba(255,255,255,0.30)", marginTop: 3 }}>
                            {tier.revisions}
                          </div>

                          {"saving" in tier && tier.saving && (
                            <div style={{
                              marginTop: 6,
                              display: "inline-block",
                              background: "rgba(34,197,94,0.15)",
                              border: "1px solid rgba(34,197,94,0.30)",
                              borderRadius: 999, padding: "2px 7px",
                              fontSize: 9, fontFamily: "Inter, sans-serif", fontWeight: 700,
                              color: "#4ADE80", letterSpacing: "0.04em",
                            }}>
                              {tier.saving}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* What's included — expandable */}
                  <div style={{ marginBottom: 20 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setExpanded(isExpanded ? null : i); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        background: "transparent", border: "none",
                        cursor: "pointer", padding: 0, width: "100%",
                      }}
                    >
                      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, rgba(${rgb},0.20), transparent)` }} />
                      <span style={{
                        fontSize: 11.5, fontFamily: "Inter, sans-serif", fontWeight: 600,
                        color: `rgba(${rgb},0.80)`, letterSpacing: "0.05em", whiteSpace: "nowrap",
                      }}>
                        What's included
                      </span>
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ display: "inline-block", fontSize: 10, color: `rgba(${rgb},0.70)` }}
                      >▼</motion.span>
                      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, rgba(${rgb},0.20), transparent)` }} />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: "easeInOut" }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                            {p.includes.map((item, ii) => (
                              <div key={ii} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <div style={{
                                  width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                                  background: `rgba(${rgb},0.15)`,
                                  border: `1px solid rgba(${rgb},0.30)`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke={p.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                                <span style={{ fontSize: 12.5, fontFamily: "Inter, sans-serif", color: "rgba(255,255,255,0.62)", lineHeight: 1.4 }}>
                                  {item}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={e => { e.stopPropagation(); setLocation(p.href); }}
                    style={{
                      width: "100%",
                      background: "linear-gradient(135deg, #FFE8A3 0%, #D4AF37 55%, #9A6F1F 100%)",
                      border: "none",
                      borderRadius: 12, padding: "13px 0",
                      color: "#0A0B0F",
                      fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5,
                      letterSpacing: "0.05em", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      boxShadow: "0 4px 20px rgba(212,175,55,0.35)",
                      transition: "all 0.25s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 32px rgba(212,175,55,0.60)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(212,175,55,0.35)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    {p.cta}
                    <span style={{ fontSize: 16 }}>→</span>
                  </button>

                  <div style={{
                    textAlign: "center", marginTop: 10,
                    fontSize: 11, fontFamily: "Inter, sans-serif",
                    color: "rgba(255,255,255,0.28)",
                  }}>
                    No commitment · 100% ownership · Cancel anytime
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* View all */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          style={{ textAlign: "center", marginTop: 48 }}
        >
          <a href="/products" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            color: "rgba(255,255,255,0.55)", fontFamily: "Inter, sans-serif",
            fontSize: 14, textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999, padding: "11px 28px",
            transition: "all 0.25s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "#D4A574";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.40)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
            }}
          >
            View All 15 Products
            <span style={{ fontSize: 16 }}>⬡</span>
          </a>
        </motion.div>
      </div>

      <style>{`
        @keyframes scarcityPulse {
          0%   { transform: scale(1); opacity: 0.9; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @media (max-width: 900px) { .product-cards-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
