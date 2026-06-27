import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { useLocation } from "wouter";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD   = "#D4AF37";
const GOLD2  = "#F4D06F";
const NAVY   = "#0B1736";
const BG     = "#050B1A";
const BG2    = "#080F22";
const TEXT   = "#FFFFFF";

// ─── Reusable animation variant ───────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as any } },
};
const stagger = { visible: { transition: { staggerChildren: 0.10 } } };

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  children,
  id,
  style,
}: {
  children: React.ReactNode;
  id?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      id={id}
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      style={{
        width: "100%",
        maxWidth: 1100,
        margin: "0 auto",
        padding: "clamp(56px, 8vw, 96px) clamp(20px, 5vw, 48px)",
        ...style,
      }}
    >
      {children}
    </motion.section>
  );
}

// ─── Gold pill label ──────────────────────────────────────────────────────────
function Pill({ children }: { children: string }) {
  return (
    <motion.div variants={fadeUp} style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
      <span style={{
        display: "inline-block",
        padding: "5px 18px",
        borderRadius: 999,
        border: `1px solid rgba(212,175,55,0.35)`,
        background: "rgba(212,175,55,0.07)",
        color: GOLD,
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}>{children}</span>
    </motion.div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({
  children,
  sub,
  center = true,
}: {
  children: React.ReactNode;
  sub?: string;
  center?: boolean;
}) {
  return (
    <>
      <motion.h2 variants={fadeUp} style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(28px, 4vw, 48px)",
        fontWeight: 700,
        color: TEXT,
        textAlign: center ? "center" : "left",
        lineHeight: 1.22,
        margin: 0,
        marginBottom: sub ? 16 : 0,
      }}>
        {children}
      </motion.h2>
      {sub && (
        <motion.p variants={fadeUp} style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "clamp(14px, 1.4vw, 17px)",
          color: "rgba(255,255,255,0.52)",
          textAlign: center ? "center" : "left",
          lineHeight: 1.7,
          maxWidth: 680,
          margin: center ? "0 auto" : "0",
        }}>{sub}</motion.p>
      )}
    </>
  );
}

// ─── Gold divider ─────────────────────────────────────────────────────────────
function GoldDivider({ width = 200 }: { width?: number }) {
  return (
    <motion.div variants={fadeUp} style={{
      height: 1,
      width,
      background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD2} 50%, ${GOLD} 70%, transparent 100%)`,
      margin: "28px auto",
      opacity: 0.55,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — HERO
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection() {
  const [, setLocation] = useLocation();
  return (
    <div style={{
      position: "relative",
      minHeight: "clamp(480px, 60vh, 680px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: `radial-gradient(ellipse 90% 70% at 50% 0%, rgba(11,23,54,0.70) 0%, ${BG} 65%)`,
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 60% 40% at 50% 30%, rgba(212,175,55,0.09) 0%, transparent 65%),
          radial-gradient(ellipse 35% 30% at 20% 80%, rgba(11,23,54,0.60) 0%, transparent 55%),
          radial-gradient(ellipse 35% 30% at 80% 75%, rgba(20,10,60,0.40) 0%, transparent 55%)
        `,
      }} />

      {/* Floating particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${(Math.sin(i * 6.11) * 0.5 + 0.5) * 100}%`,
            top:  `${(Math.cos(i * 3.77) * 0.5 + 0.5) * 100}%`,
            width: i % 4 === 0 ? 2 : 1,
            height: i % 4 === 0 ? 2 : 1,
            borderRadius: "50%",
            background: GOLD,
            opacity: 0.06 + (i % 5) * 0.05,
            animation: `revDrift ${4 + (i % 4) * 1.5}s ease-in-out ${(i * 0.3) % 4}s infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{
        position: "relative", zIndex: 2,
        textAlign: "center",
        padding: "80px clamp(20px, 5vw, 48px) 60px",
        maxWidth: 820,
        margin: "0 auto",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}
        >
          <span style={{
            padding: "5px 18px",
            borderRadius: 999,
            border: `1px solid rgba(212,175,55,0.35)`,
            background: "rgba(212,175,55,0.07)",
            color: GOLD,
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase" as const,
          }}>Quality Commitment</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] as any }}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(34px, 5.5vw, 64px)",
            fontWeight: 700,
            color: TEXT,
            lineHeight: 1.18,
            margin: 0,
            marginBottom: 22,
          }}
        >
          Revisions, AI, &amp;<br />
          <span style={{
            background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 50%, ${GOLD} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>Why Ghaafeedi Music</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(14px, 1.5vw, 18px)",
            color: "rgba(255,255,255,0.58)",
            lineHeight: 1.75,
            maxWidth: 600,
            margin: "0 auto 36px",
          }}
        >
          Everything you need to know about how we create, what "AI-generated" 
          actually means for your music and films, and the clear standards we hold ourselves to.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}
        >
          <a
            href="#revisions-per-product"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "0 28px", height: 48,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
              color: "#05080F",
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textDecoration: "none",
              boxShadow: `0 0 24px rgba(212,175,55,0.35)`,
              transition: "all 220ms ease",
            }}
          >
            See Revision Details
          </a>
          <a
            href="#why-us"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "0 28px", height: 48,
              borderRadius: 999,
              border: `1px solid rgba(212,175,55,0.30)`,
              background: "rgba(212,175,55,0.06)",
              color: GOLD,
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textDecoration: "none",
              transition: "all 220ms ease",
            }}
          >
            Why Choose Us
          </a>
        </motion.div>
      </div>

      <style>{`
        @keyframes revDrift {
          0%   { transform: translate(0, 0); }
          100% { transform: translate(5px, -8px); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — WHAT IS AI-GENERATED?
// ─────────────────────────────────────────────────────────────────────────────
const AI_POINTS = [
  {
    icon: "🎵",
    title: "Your Story Drives Everything",
    body: "Every song and film begins with you — your memories, your words, your emotions. Our system reads what you share and builds a creative brief unique to your story. No generic output. No recycled templates.",
  },
  {
    icon: "✍️",
    title: "Human-Guided, AI-Executed",
    body: "Lyrics are crafted from your narrative using language models trained on emotional storytelling. Melodies, chord progressions, and arrangements are composed to match the emotional fingerprint we extract from your input.",
  },
  {
    icon: "🎬",
    title: "Film & Visuals Are Story-Specific",
    body: "Visual scenes, color grading, pacing, and cinematographic style are all derived from your story brief. Two people with similar stories will receive meaningfully different films.",
  },
  {
    icon: "🔒",
    title: "You Own the Output",
    body: "Every deliverable is created exclusively for you. We do not resell, reuse, or repurpose your content. Your song, your film — locked to your account and transferred fully upon delivery.",
  },
];

function WhatIsAI() {
  return (
    <Section id="what-is-ai">
      <Pill>Understanding AI Creation</Pill>
      <SectionHeading
        sub="When we say AI-generated, here's exactly what that means — and what it doesn't mean."
      >
        What Does "AI-Generated" Actually Mean?
      </SectionHeading>
      <GoldDivider />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 24,
        marginTop: 48,
      }}>
        {AI_POINTS.map((pt) => (
          <motion.div
            key={pt.title}
            variants={fadeUp}
            style={{
              background: `linear-gradient(135deg, rgba(11,23,54,0.60) 0%, rgba(8,15,34,0.80) 100%)`,
              border: `1px solid rgba(212,175,55,0.14)`,
              borderRadius: 16,
              padding: "28px 24px",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 14 }}>{pt.icon}</div>
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(16px, 1.4vw, 20px)",
              fontWeight: 700,
              color: TEXT,
              margin: "0 0 10px",
              lineHeight: 1.3,
            }}>{pt.title}</h3>
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(13px, 1.1vw, 15px)",
              color: "rgba(255,255,255,0.54)",
              lineHeight: 1.7,
              margin: 0,
            }}>{pt.body}</p>
          </motion.div>
        ))}
      </div>

      {/* Comparison: Other platforms vs Ghaafeedi */}
      <motion.div variants={fadeUp} style={{ marginTop: 56 }}>
        <h3 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(20px, 2vw, 28px)",
          fontWeight: 700,
          color: TEXT,
          textAlign: "center",
          margin: "0 0 32px",
        }}>How This Differs From General AI Platforms</h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          maxWidth: 820,
          margin: "0 auto",
        }}>
          {/* Other platforms */}
          <div style={{
            background: "rgba(30,10,10,0.45)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "24px 22px",
          }}>
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 16px",
            }}>General AI Music &amp; Video Platforms</p>
            {[
              "Prompt-to-output: type a genre, get a song",
              "No emotional context or personal story",
              "Mass-produced, non-exclusive output",
              "No human creative direction layer",
              "No revisions — regenerate and hope",
              "Your output may resemble others'",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ color: "rgba(255,80,80,0.70)", fontSize: 14, flexShrink: 0, marginTop: 1 }}>✕</span>
                <span style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(12px, 1vw, 14px)",
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.6,
                }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Ghaafeedi */}
          <div style={{
            background: "rgba(10,23,54,0.55)",
            border: `1px solid rgba(212,175,55,0.22)`,
            borderRadius: 14,
            padding: "24px 22px",
            boxShadow: `0 0 30px rgba(212,175,55,0.06)`,
          }}>
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: `rgba(212,175,55,0.70)`,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 16px",
            }}>Ghaafeedi Music</p>
            {[
              "Story-first: your memory drives every decision",
              "Emotional analysis informs melody, tone, and visuals",
              "100% exclusive — created only for you",
              "Creative direction layer in every production",
              "Structured revision rounds per product",
              "No two outputs from our system are the same",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ color: GOLD, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(12px, 1vw, 14px)",
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.6,
                }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — REVISIONS PER PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
const REVISION_PRODUCTS = [
  {
    name: "Emotional Soundtrack",
    category: "Song Membership",
    icon: "🎵",
    tiers: [
      { name: "Essential", price: "$19/mo", revisions: "1 round", notes: "Melody, tempo, and key adjustment" },
      { name: "Creator",   price: "$39/mo", revisions: "2 rounds", notes: "+ Lyric refinement pass" },
      { name: "Pro",       price: "$69/mo", revisions: "3 rounds", notes: "+ Full arrangement re-instrumentation" },
    ],
    scope: "Each revision round covers: lyric edits, key/tempo changes, genre style shift, or re-instrumentation. Structural changes (new verse, chorus) count as one revision.",
  },
  {
    name: "Signature Masterpiece",
    category: "Premium Song",
    icon: "🎼",
    tiers: [
      { name: "Essential", price: "$99", revisions: "2 rounds", notes: "Full lyric + melody revisions" },
      { name: "Premium",   price: "$299", revisions: "3 rounds", notes: "+ Production style revision" },
      { name: "Elite",     price: "$599", revisions: "4 rounds", notes: "+ Orchestration overhaul" },
    ],
    scope: "Covers complete structural rewrites, genre pivots, and instrumental layering changes across revision rounds.",
  },
  {
    name: "Relationship Healing",
    category: "Emotional Song",
    icon: "💛",
    tiers: [
      { name: "Starter", price: "$69",  revisions: "1 round", notes: "Lyric and emotional tone" },
      { name: "Deep",    price: "$129", revisions: "2 rounds", notes: "+ Melody and key shift" },
      { name: "Full",    price: "$199", revisions: "3 rounds", notes: "+ Full production revision" },
    ],
    scope: "Revisions focused on emotional accuracy and personal resonance. Lyric meaning, tone, and intensity are primary targets.",
  },
  {
    name: "Cinematic Life Story",
    category: "Film",
    icon: "🎬",
    tiers: [
      { name: "Standard", price: "$499", revisions: "1 round",  notes: "Scene order + color grade" },
      { name: "Premium",  price: "$599", revisions: "2 rounds", notes: "+ Narration + music swap" },
      { name: "Signature",price: "$799", revisions: "3 rounds", notes: "+ Full scene re-render" },
    ],
    scope: "Film revisions cover: scene sequencing, narration script edits, music track swap, color grade, and transition style. Full scene regeneration reserved for top tier.",
  },
  {
    name: "Memorial Legacy Film",
    category: "Film",
    icon: "🕊️",
    tiers: [
      { name: "Classic",    price: "$399", revisions: "1 round",  notes: "Timeline and caption edits" },
      { name: "Heritage",   price: "$499", revisions: "2 rounds", notes: "+ Music + narration revision" },
      { name: "Heirloom",   price: "$699", revisions: "3 rounds", notes: "+ Visual re-composition" },
    ],
    scope: "Sensitive revisions handled with full care. Captions, timeline ordering, music selection, narration tone, and visual treatment all eligible.",
  },
  {
    name: "Couples Journey Film",
    category: "Film",
    icon: "💑",
    tiers: [
      { name: "Starter",   price: "$149", revisions: "1 round",  notes: "Music + caption edits" },
      { name: "Standard",  price: "$199", revisions: "2 rounds", notes: "+ Scene restructure" },
      { name: "Signature", price: "$249", revisions: "3 rounds", notes: "+ Full re-render" },
    ],
    scope: "Revision rounds cover: scene restructuring, music swap, caption and title edits, narration changes, and transition style.",
  },
  {
    name: "Cinematic Story Film",
    category: "Film",
    icon: "🎞️",
    tiers: [
      { name: "Basic",     price: "$79",  revisions: "1 round",  notes: "Music + pacing edits" },
      { name: "Enhanced",  price: "$129", revisions: "2 rounds", notes: "+ Scene order + narration" },
      { name: "Premium",   price: "$199", revisions: "3 rounds", notes: "+ Full visual overhaul" },
    ],
    scope: "Covers pacing, scene transitions, narration tone, music track, and color grading changes.",
  },
  {
    name: "Dream AI Visualization",
    category: "Visualization",
    icon: "✨",
    tiers: [
      { name: "Vision",    price: "$79",  revisions: "1 round",  notes: "Color palette + style" },
      { name: "Enhanced",  price: "$149", revisions: "2 rounds", notes: "+ Mood + scene count" },
      { name: "Signature", price: "$299", revisions: "3 rounds", notes: "+ Full concept re-render" },
    ],
    scope: "Artistic direction, color palette, visual theme, and scene mood are all revision targets.",
  },
  {
    name: "Future Self Vision",
    category: "Visualization",
    icon: "🔭",
    tiers: [
      { name: "Spark",    price: "$79",  revisions: "1 round",  notes: "Goal emphasis edits" },
      { name: "Clarity",  price: "$149", revisions: "2 rounds", notes: "+ Visual style revision" },
      { name: "Mastery",  price: "$299", revisions: "3 rounds", notes: "+ Full scenario re-render" },
    ],
    scope: "Focus areas: scenario emphasis, visual style, future-state narrative, and motivational tone.",
  },
  {
    name: "Voice Cloning Studio",
    category: "Voice",
    icon: "🎙️",
    tiers: [
      { name: "Classic",   price: "$299",  revisions: "1 round",  notes: "Vocal tone + delivery" },
      { name: "Pro",       price: "$599",  revisions: "2 rounds", notes: "+ Script revision" },
      { name: "Signature", price: "$999",  revisions: "3 rounds", notes: "+ Multi-style variations" },
    ],
    scope: "Revisions for vocal tone, pacing, pronunciation, emotional delivery, and script phrasing. Style variations available at top tier.",
  },
  {
    name: "NFT Collection",
    category: "Digital Art",
    icon: "🖼️",
    tiers: [
      { name: "Entry",     price: "$299",  revisions: "1 round",  notes: "Art style + color" },
      { name: "Standard",  price: "$599",  revisions: "2 rounds", notes: "+ Theme + composition" },
      { name: "Collector", price: "$1,299",revisions: "3 rounds", notes: "+ Full concept revision" },
    ],
    scope: "Visual art direction, color palette, thematic concept, and composition layout are all revision targets.",
  },
  {
    name: "Family Vault",
    category: "Archive",
    icon: "🗂️",
    tiers: [
      { name: "Essential",  price: "$199", revisions: "1 round",  notes: "Organization + labels" },
      { name: "Legacy",     price: "$349", revisions: "2 rounds", notes: "+ Narrative additions" },
      { name: "Heirloom",   price: "$599", revisions: "3 rounds", notes: "+ Full vault restructure" },
    ],
    scope: "Covers: label revisions, organizational structure, narrative captions, and vault presentation layer.",
  },
  {
    name: "Social Ready Clips",
    category: "Social Media",
    icon: "📱",
    tiers: [
      { name: "Essential", price: "$49",  revisions: "1 round",  notes: "Caption + music edit" },
      { name: "Creator",   price: "$99",  revisions: "2 rounds", notes: "+ Pacing + format swap" },
      { name: "Pro",       price: "$199", revisions: "3 rounds", notes: "+ Full clip re-cut" },
    ],
    scope: "Caption text, music track, clip pacing, format (Reels/TikTok/Shorts), and visual style are all revision-eligible.",
  },
  {
    name: "Sophia AI Companion",
    category: "AI Service",
    icon: "🤖",
    tiers: [
      { name: "Lite",      price: "$29/mo", revisions: "N/A", notes: "Ongoing — evolves with use" },
      { name: "Standard",  price: "$49/mo", revisions: "N/A", notes: "Memory + emotional modeling" },
      { name: "Elite",     price: "$79/mo", revisions: "N/A", notes: "Full personalization suite" },
    ],
    scope: "Sophia AI is a continuous interactive service, not a fixed deliverable. She evolves based on every conversation. There are no revision rounds — if a response misses the mark, she recalibrates in real time.",
    noRevision: true,
  },
];

function RevisionCard({ product }: { product: typeof REVISION_PRODUCTS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      variants={fadeUp}
      style={{
        background: `linear-gradient(135deg, rgba(11,23,54,0.55) 0%, rgba(8,15,34,0.75) 100%)`,
        border: `1px solid rgba(212,175,55,0.14)`,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "20px 24px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 24, flexShrink: 0 }}>{product.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(15px, 1.4vw, 18px)",
            fontWeight: 700,
            color: TEXT,
            lineHeight: 1.2,
          }}>{product.name}</div>
          <div style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            color: GOLD,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            marginTop: 4,
          }}>{product.category}</div>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          border: `1px solid rgba(212,175,55,0.25)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          transition: "transform 220ms ease",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: "0 24px 24px" }}>
          {/* Tier table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(12px, 1vw, 14px)",
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid rgba(212,175,55,0.15)` }}>
                  {["Tier", "Price", "Revisions", "What's Covered"].map(h => (
                    <th key={h} style={{
                      color: "rgba(255,255,255,0.38)",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontSize: 11,
                      padding: "10px 12px 10px 0",
                      textAlign: "left",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {product.tiers.map((tier, i) => (
                  <tr key={tier.name} style={{
                    borderBottom: i < product.tiers.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                  }}>
                    <td style={{ padding: "12px 12px 12px 0", color: TEXT, fontWeight: 600 }}>{tier.name}</td>
                    <td style={{ padding: "12px 12px 12px 0", color: GOLD, fontWeight: 700 }}>{tier.price}</td>
                    <td style={{ padding: "12px 12px 12px 0", color: "rgba(255,255,255,0.72)" }}>
                      {product.noRevision ? "—" : tier.revisions}
                    </td>
                    <td style={{ padding: "12px 0", color: "rgba(255,255,255,0.50)", lineHeight: 1.5 }}>{tier.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Scope note */}
          <div style={{
            marginTop: 16,
            padding: "14px 16px",
            borderRadius: 10,
            background: "rgba(212,175,55,0.05)",
            border: `1px solid rgba(212,175,55,0.12)`,
          }}>
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(12px, 0.95vw, 13px)",
              color: "rgba(255,255,255,0.48)",
              lineHeight: 1.65,
              margin: 0,
            }}>
              <strong style={{ color: "rgba(212,175,55,0.70)", fontWeight: 600 }}>Scope: </strong>
              {product.scope}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function RevisionsPerProduct() {
  return (
    <Section id="revisions-per-product" style={{ background: "transparent" }}>
      <Pill>Revision Details</Pill>
      <SectionHeading
        sub="Every product has a clear, defined revision structure. Expand any product to see exactly what each tier includes."
      >
        Revisions by Product &amp; Tier
      </SectionHeading>
      <GoldDivider />

      {/* Global rules */}
      <motion.div
        variants={fadeUp}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginTop: 40,
          marginBottom: 40,
        }}
      >
        {[
          { label: "Revision Window", value: "7 days from delivery" },
          { label: "Response Time",   value: "48–72 hrs per round" },
          { label: "Submission",      value: "Written brief required" },
          { label: "Scope Guard",     value: "Must match original brief" },
        ].map(item => (
          <div key={item.label} style={{
            background: "rgba(11,23,54,0.45)",
            border: `1px solid rgba(212,175,55,0.12)`,
            borderRadius: 12,
            padding: "16px 20px",
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(13px, 1.1vw, 15px)",
              color: GOLD,
              fontWeight: 700,
              marginBottom: 6,
            }}>{item.value}</div>
            <div style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: "rgba(255,255,255,0.40)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>{item.label}</div>
          </div>
        ))}
      </motion.div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {REVISION_PRODUCTS.map(p => (
          <RevisionCard key={p.name} product={p} />
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — REFUND FRAMEWORK
// ─────────────────────────────────────────────────────────────────────────────
const REFUND_TIERS = [
  {
    type: "Full Refund",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.07)",
    border: "rgba(34,197,94,0.20)",
    icon: "✓",
    when: "Ghaafeedi Music is unable to meet the documented quality standard after all revision rounds are exhausted.",
    conditions: [
      "All revision rounds were used with no satisfactory result",
      "Original brief was clearly documented and followed",
      "Reported within 48 hours of final delivery",
      "No portion of the deliverable was used or published",
    ],
  },
  {
    type: "Partial Refund",
    color: GOLD,
    bg: "rgba(212,175,55,0.07)",
    border: "rgba(212,175,55,0.20)",
    icon: "◑",
    when: "A specific element of the deliverable failed to meet standard while the overall product was delivered successfully.",
    conditions: [
      "Specific failed element is clearly identified",
      "Remainder of deliverable met the brief",
      "Reported within 7 days of delivery",
      "Partial refund amount proportional to element",
    ],
  },
  {
    type: "No Refund",
    color: "rgba(255,255,255,0.35)",
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.09)",
    icon: "—",
    when: "The deliverable was completed to the documented standard and revisions were either used or declined.",
    conditions: [
      "Product delivered per original brief",
      "Revision rounds offered but declined",
      "Change of mind after delivery",
      "Brief changed significantly after work began",
    ],
  },
];

function RefundFramework() {
  return (
    <div style={{
      background: `linear-gradient(180deg, ${BG} 0%, ${BG2} 50%, ${BG} 100%)`,
      borderTop: `1px solid rgba(212,175,55,0.08)`,
      borderBottom: `1px solid rgba(212,175,55,0.08)`,
    }}>
      <Section id="refund-framework">
        <Pill>Satisfaction Guarantee</Pill>
        <SectionHeading
          sub="We stand behind every deliverable. Here is how our refund framework works — clearly, without fine print."
        >
          Refund Framework
        </SectionHeading>
        <GoldDivider />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
          marginTop: 48,
        }}>
          {REFUND_TIERS.map(tier => (
            <motion.div
              key={tier.type}
              variants={fadeUp}
              style={{
                background: tier.bg,
                border: `1px solid ${tier.border}`,
                borderRadius: 16,
                padding: "28px 24px",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: `1.5px solid ${tier.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: tier.color,
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>{tier.icon}</div>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(16px, 1.4vw, 20px)",
                  fontWeight: 700,
                  color: tier.color,
                  margin: 0,
                }}>{tier.type}</h3>
              </div>
              <p style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(13px, 1vw, 14px)",
                color: "rgba(255,255,255,0.52)",
                lineHeight: 1.65,
                marginBottom: 20,
              }}>{tier.when}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {tier.conditions.map(c => (
                  <div key={c} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: tier.color, fontSize: 12, flexShrink: 0, marginTop: 2 }}>•</span>
                    <span style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "clamp(12px, 0.95vw, 13px)",
                      color: "rgba(255,255,255,0.48)",
                      lineHeight: 1.55,
                    }}>{c}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Process note */}
        <motion.div variants={fadeUp} style={{
          marginTop: 36,
          padding: "20px 24px",
          borderRadius: 14,
          background: "rgba(212,175,55,0.04)",
          border: `1px solid rgba(212,175,55,0.12)`,
          maxWidth: 720,
          margin: "36px auto 0",
        }}>
          <p style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(13px, 1vw, 14px)",
            color: "rgba(255,255,255,0.50)",
            lineHeight: 1.75,
            margin: 0,
            textAlign: "center",
          }}>
            To initiate a refund request, contact support@ghaafeedi.com with your order number, 
            the specific issue, and documentation of your original brief. All requests are reviewed 
            within 2 business days.
          </p>
        </motion.div>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — WHY GHAAFEEDI MUSIC
// ─────────────────────────────────────────────────────────────────────────────
const WHY_POINTS = [
  {
    title: "Built for Emotional Depth",
    body: "General AI platforms create content. We create meaning. Every song and film we produce is engineered to carry the emotional weight of your actual story — not an approximation of it.",
    icon: "💎",
  },
  {
    title: "Proprietary Creation System",
    body: "We operate a custom multi-stage creative pipeline built specifically for emotional storytelling. It's not a wrapper around public tools — it's a system trained and tuned on what makes personal stories resonate.",
    icon: "⚙️",
  },
  {
    title: "Enterprise-Grade Infrastructure",
    body: "Your production runs on the same infrastructure used by high-volume creative studios. Redundant systems, queue management, and automated quality checks at every stage.",
    icon: "🏗️",
  },
  {
    title: "Exclusive, Not Generic",
    body: "No two outputs from our system are the same. Your song is built from your words, your emotion profile, and your story context — not from a genre template.",
    icon: "🔐",
  },
  {
    title: "Clear Accountability",
    body: "Revision rounds are documented. Quality standards are written. Refund criteria are published here, openly. We don't hide behind vague satisfaction guarantees.",
    icon: "📋",
  },
  {
    title: "Lifetime Delivery",
    body: "Your creations are delivered to your personal vault. They live there indefinitely. We don't delete, expire, or restrict access to what you've commissioned.",
    icon: "🏛️",
  },
];

const PLATFORM_COMPARE = [
  {
    platform: "Suno",
    description: "General-purpose AI music generation. Type a prompt, receive a song. Excellent for quick, genre-based content creation.",
    what_they_do: "Prompt-to-song in seconds",
    what_we_do: "Story-to-masterpiece in 72 hours",
  },
  {
    platform: "Runway",
    description: "Powerful video generation and editing toolset. Strong for professional creatives who already have footage and concepts.",
    what_they_do: "Tools for creative professionals",
    what_we_do: "Full-service emotional film production",
  },
  {
    platform: "HiggsField",
    description: "AI music and audio generation platform. Focused on speed and volume — great for content creators needing quantity.",
    what_they_do: "High-volume audio generation",
    what_we_do: "Single, irreplaceable personal creation",
  },
];

function WhyGhaafeedi() {
  return (
    <Section id="why-us">
      <Pill>Our Difference</Pill>
      <SectionHeading
        sub="There are many ways to use AI for creative output. Here's why people who want something that truly means something choose Ghaafeedi Music."
      >
        Why Ghaafeedi Music
      </SectionHeading>
      <GoldDivider />

      {/* 6 pillars */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 22,
        marginTop: 48,
      }}>
        {WHY_POINTS.map(pt => (
          <motion.div
            key={pt.title}
            variants={fadeUp}
            style={{
              background: `linear-gradient(135deg, rgba(11,23,54,0.55) 0%, rgba(8,15,34,0.80) 100%)`,
              border: `1px solid rgba(212,175,55,0.13)`,
              borderRadius: 16,
              padding: "26px 22px",
              transition: "border-color 220ms ease",
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 14 }}>{pt.icon}</div>
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(15px, 1.3vw, 19px)",
              fontWeight: 700,
              color: TEXT,
              margin: "0 0 10px",
              lineHeight: 1.3,
            }}>{pt.title}</h3>
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(13px, 1vw, 15px)",
              color: "rgba(255,255,255,0.50)",
              lineHeight: 1.7,
              margin: 0,
            }}>{pt.body}</p>
          </motion.div>
        ))}
      </div>

      {/* Platform comparisons */}
      <motion.div variants={fadeUp} style={{ marginTop: 64 }}>
        <h3 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(20px, 2vw, 28px)",
          fontWeight: 700,
          color: TEXT,
          textAlign: "center",
          margin: "0 0 12px",
        }}>How We Compare to Other Platforms</h3>
        <p style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "clamp(13px, 1.1vw, 15px)",
          color: "rgba(255,255,255,0.40)",
          textAlign: "center",
          margin: "0 0 36px",
          lineHeight: 1.6,
        }}>
          These platforms are good at what they do. We're built for something different.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PLATFORM_COMPARE.map(pc => (
            <div
              key={pc.platform}
              style={{
                background: "rgba(11,23,54,0.45)",
                border: `1px solid rgba(255,255,255,0.07)`,
                borderRadius: 14,
                padding: "22px 24px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 24,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(15px, 1.3vw, 18px)",
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 6,
                }}>{pc.platform}</div>
                <p style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(12px, 0.95vw, 13px)",
                  color: "rgba(255,255,255,0.40)",
                  margin: 0,
                  lineHeight: 1.6,
                }}>{pc.description}</p>
              </div>
              <div style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
                <div style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.30)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}>They Do</div>
                <div style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(12px, 1vw, 14px)",
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.5,
                }}>{pc.what_they_do}</div>
              </div>
              <div style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(212,175,55,0.06)",
                border: `1px solid rgba(212,175,55,0.18)`,
              }}>
                <div style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 10,
                  color: GOLD,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}>We Do</div>
                <div style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(12px, 1vw, 14px)",
                  color: "rgba(255,255,255,0.75)",
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}>{pc.what_we_do}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — FINAL CTA
// ─────────────────────────────────────────────────────────────────────────────
function RevisionsCTA() {
  const [, setLocation] = useLocation();
  return (
    <div style={{
      background: `linear-gradient(180deg, ${BG2} 0%, ${BG} 100%)`,
      borderTop: `1px solid rgba(212,175,55,0.08)`,
    }}>
      <Section>
        <div style={{
          textAlign: "center",
          maxWidth: 620,
          margin: "0 auto",
        }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 20 }}>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(36px, 5vw, 58px)",
              fontWeight: 700,
              color: TEXT,
              lineHeight: 1.2,
            }}>
              Ready to Start<br />
              <span style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 50%, ${GOLD} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>Your Story?</span>
            </span>
          </motion.div>

          <motion.p variants={fadeUp} style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(14px, 1.4vw, 17px)",
            color: "rgba(255,255,255,0.50)",
            lineHeight: 1.75,
            marginBottom: 36,
          }}>
            You now know exactly what you get, what's covered, and what we stand behind. 
            The rest is just beginning.
          </motion.p>

          <motion.div variants={fadeUp} style={{
            display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center",
          }}>
            <button
              onClick={() => setLocation("/products")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "0 36px", height: 52,
                borderRadius: 999,
                border: "none",
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
                color: "#05080F",
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(13px, 1.1vw, 15px)",
                fontWeight: 700,
                letterSpacing: "0.07em",
                cursor: "pointer",
                boxShadow: `0 0 32px rgba(212,175,55,0.45)`,
                transition: "all 220ms ease",
              }}
            >
              Explore All Products
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="#05080F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => setLocation("/contact")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "0 28px", height: 52,
                borderRadius: 999,
                border: `1px solid rgba(212,175,55,0.30)`,
                background: "rgba(212,175,55,0.06)",
                color: GOLD,
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(13px, 1.1vw, 15px)",
                fontWeight: 600,
                letterSpacing: "0.06em",
                cursor: "pointer",
                transition: "all 220ms ease",
              }}
            >
              Ask a Question
            </button>
          </motion.div>

          {/* Trust strip */}
          <motion.div variants={fadeUp} style={{
            marginTop: 44,
            display: "flex",
            alignItems: "center",
            gap: "clamp(12px, 2vw, 24px)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}>
            {[
              "Revision policy above is binding",
              "Refunds honored within 7 days",
              "No hidden fees",
            ].map((item, i) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {i > 0 && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(212,175,55,0.30)" }} />}
                <span style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(11px, 0.9vw, 12px)",
                  color: "rgba(255,255,255,0.30)",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function RevisionsPage() {
  // Handle hash links (e.g. /revisions#why-us)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    }
  }, []);

  return (
    <div style={{ background: BG, minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />
      <HeroSection />
      <WhatIsAI />
      <RevisionsPerProduct />
      <RefundFramework />
      <WhyGhaafeedi />
      <RevisionsCTA />
      <Footer />
    </div>
  );
}
