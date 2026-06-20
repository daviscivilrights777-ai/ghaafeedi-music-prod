/**
 * PricingIntelligenceModal
 * Shows competitor pricing vs Ghaafeedi Music.
 * Desktop: inline collapsible panel below pricing tiers.
 * Mobile: full-screen modal overlay.
 *
 * Data source: pricingComparisons.ts (approved June 2026)
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FILM_COMPARISON_BY_LENGTH,
  getComparisonType,
  getNonFilmComparison,
  type CompetitorEntry,
  type GhaafeediTier,
  type ProductComparison,
} from "../data/pricingComparisons";

const GOLD  = "#D4AF37";
const BG    = "#050B1A";
const NAVY  = "#0B1736";
const GREEN = "#22C55E";

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  slug: string;
  selectedTierIndex?: number;   // 0=Essential, 1=Creator, 2=Pro — used to default length tab for film products
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return "$" + n.toLocaleString();
}

// ─── Check row ────────────────────────────────────────────────────────────────
function CheckRow({ text, yes }: { text: string; yes: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: yes ? GREEN : "rgba(239,68,68,0.7)", flexShrink: 0, marginTop: 1 }}>
        {yes ? "✓" : "✗"}
      </span>
      <span style={{
        fontFamily: "Inter, sans-serif", fontSize: 11,
        color: yes ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)",
        lineHeight: 1.4,
      }}>{text}</span>
    </div>
  );
}

// ─── Competitor card ──────────────────────────────────────────────────────────
function CompetitorCard({ comp, ghaafeediMin }: { comp: CompetitorEntry; ghaafeediMin: number }) {
  const saves = comp.priceMin > ghaafeediMin
    ? `You save ${fmt(comp.priceMin - ghaafeediMin)}+`
    : null;

  return (
    <div style={{
      background: "rgba(11,23,54,0.6)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "16px",
      position: "relative",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `${comp.color}22`,
            border: `1px solid ${comp.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: comp.color,
            flexShrink: 0,
          }}>{comp.logo}</div>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>{comp.name}</div>
            {comp.note && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1, lineHeight: 1.3 }}>
                {comp.note}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: "rgba(239,68,68,0.85)" }}>
            {comp.priceRange}
          </div>
          {saves && (
            <div style={{
              fontSize: 10, fontWeight: 700, color: GREEN,
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 20, padding: "2px 8px", marginTop: 4, whiteSpace: "nowrap",
            }}>{saves}</div>
          )}
        </div>
      </div>

      {/* Includes */}
      <div style={{ marginBottom: 8 }}>
        {comp.includes.map((item, i) => <CheckRow key={i} text={item} yes={true} />)}
        {comp.missing.map((item, i) => <CheckRow key={i} text={item} yes={false} />)}
      </div>
    </div>
  );
}

// ─── Ghaafeedi tier row ───────────────────────────────────────────────────────
function GhaafeediTierRow({ tier }: { tier: GhaafeediTier }) {
  const accent = tier.name === "Essential" ? "rgba(212,175,55,0.7)" : tier.name === "Creator" ? GOLD : "#FFC24D";
  return (
    <div style={{
      background: "rgba(212,175,55,0.05)",
      border: "1px solid rgba(212,175,55,0.2)",
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "Playfair Display, serif", fontSize: 14, fontWeight: 700, color: accent }}>
          {tier.name}
        </span>
        <span style={{ fontFamily: "Playfair Display, serif", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
          {fmt(tier.price)}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {tier.features.map((f, i) => (
          <span key={i} style={{
            fontSize: 10, color: "rgba(255,255,255,0.7)",
            background: "rgba(212,175,55,0.07)",
            border: "1px solid rgba(212,175,55,0.15)",
            borderRadius: 20, padding: "2px 8px",
          }}>✓ {f}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Film comparison panel (with length tabs) ─────────────────────────────────
function FilmComparisonPanel({ selectedTierIndex }: { selectedTierIndex: number }) {
  const { lengths, ghaafeediByLength, competitorsByLength, savingsByLength } = FILM_COMPARISON_BY_LENGTH;
  // Default to the length that maps closest to the currently selected tier's typical duration:
  // Tier 0 (Essential) → 5 min (index 0), Tier 1 (Creator) → 10 min (index 1), Tier 2 (Pro) → 10 min (index 1)
  const defaultLength = selectedTierIndex === 0 ? 0 : 1;
  const [activeLength, setActiveLength] = useState(defaultLength);

  const ghTiers   = ghaafeediByLength[activeLength]!;
  const comps     = competitorsByLength[activeLength]!;
  const savings   = savingsByLength[activeLength]!;
  const gmMin     = ghTiers[0]!.price;

  return (
    <div>
      {/* Length tabs */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 10 }}>
          SELECT FILM LENGTH
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {lengths.map((l, i) => (
            <button
              key={i}
              onClick={() => setActiveLength(i)}
              style={{
                padding: "6px 14px",
                background: activeLength === i ? `${GOLD}22` : "rgba(255,255,255,0.04)",
                border: `1px solid ${activeLength === i ? `${GOLD}66` : "rgba(255,255,255,0.1)"}`,
                borderRadius: 20, cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                color: activeLength === i ? GOLD : "rgba(255,255,255,0.5)",
                transition: "all 0.15s",
              }}
            >{l.label}</button>
          ))}
        </div>
      </div>

      {/* Savings banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(212,175,55,0.06))",
        border: "1px solid rgba(34,197,94,0.2)",
        borderRadius: 10, padding: "10px 14px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
      }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: GREEN }}>
          {savings.badge}
        </span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          vs industry DIY platforms
        </span>
      </div>

      {/* Ghaafeedi tiers */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: GOLD, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
          ✦ GHAAFEEDI MUSIC — {lengths[activeLength]!.label.toUpperCase()} FILM
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ghTiers.map((t, i) => <GhaafeediTierRow key={i} tier={t} />)}
        </div>
      </div>

      {/* Competitor cards */}
      <div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 10 }}>
          VS. DIY ON AI VIDEO PLATFORMS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comps.map((c, i) => <CompetitorCard key={i} comp={c} ghaafeediMin={gmMin} />)}
        </div>
      </div>

      {/* Why we win */}
      <WhyWeWinSection bullets={[
        "Everything included: scripting, voiceover, music, editing, revisions — one price",
        "AI orchestration handles 90+ generations per project with zero effort from you",
        "Revisions cost $0 extra — DIY platforms charge per re-generation attempt",
        "Guaranteed delivery with timeline — DIY has no delivery commitment",
        "No 20–160 hours of your time required to learn platform credit systems",
      ]} />
    </div>
  );
}

// ─── Non-film comparison panel ────────────────────────────────────────────────
function NonFilmComparisonPanel({ data }: { data: ProductComparison }) {
  const gmMin = data.ghaafeediTiers[0]!.price;
  return (
    <div>
      {/* Savings banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(212,175,55,0.06))",
        border: "1px solid rgba(34,197,94,0.2)",
        borderRadius: 10, padding: "10px 14px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
      }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: GREEN }}>
          {data.savingsVsCheapest}
        </span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          {data.savingsVsMostExpensive}
        </span>
      </div>

      {/* Ghaafeedi tiers */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: GOLD, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
          ✦ GHAAFEEDI MUSIC
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.ghaafeediTiers.map((t, i) => <GhaafeediTierRow key={i} tier={t} />)}
        </div>
      </div>

      {/* Competitors */}
      <div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 10 }}>
          VS. ALTERNATIVES
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.competitors.map((c, i) => <CompetitorCard key={i} comp={c} ghaafeediMin={gmMin} />)}
        </div>
      </div>

      {/* Why we win */}
      <WhyWeWinSection bullets={data.whyWeWin} />
    </div>
  );
}

// ─── Why we win section ───────────────────────────────────────────────────────
function WhyWeWinSection({ bullets }: { bullets: string[] }) {
  return (
    <div style={{
      marginTop: 20,
      background: "rgba(212,175,55,0.03)",
      border: "1px solid rgba(212,175,55,0.15)",
      borderRadius: 12, padding: "16px",
    }}>
      <div style={{ fontFamily: "Playfair Display, serif", fontSize: 14, color: GOLD, fontWeight: 700, marginBottom: 12 }}>
        Why Ghaafeedi Music
      </div>
      {bullets.map((b, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
          <span style={{ color: GOLD, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✦</span>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{b}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Legal disclaimer ─────────────────────────────────────────────────────────
function LegalDisclaimer({ legalNote }: { legalNote?: string }) {
  return (
    <div style={{
      marginTop: 20,
      padding: "12px 14px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
    }}>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, lineHeight: 1.6 }}>
        {legalNote && <>{legalNote} · </>}
        Ghaafeedi Music is not affiliated with Runway, HiggsField, Kling AI, Suno, Udio, ElevenLabs, or any other platform mentioned. Prices sourced from official pricing pages and community reports, current as of June 2026 — may vary. Competitor prices include estimated production costs (voiceover, music, revisions) not typically included in platform subscription prices.
      </p>
    </div>
  );
}

// ─── Main modal header ────────────────────────────────────────────────────────
function ModalHeader({ headline, subline, onClose }: { headline: string; subline: string; onClose?: () => void }) {
  return (
    <div style={{
      padding: onClose ? "20px 24px 16px" : "0 0 16px",
      borderBottom: "1px solid rgba(212,175,55,0.12)",
      marginBottom: 20,
      ...(onClose ? { position: "sticky", top: 0, background: BG, zIndex: 10 } : {}),
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: GOLD,
              boxShadow: `0 0 8px ${GOLD}`,
            }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "rgba(212,175,55,0.7)", letterSpacing: "0.12em", fontWeight: 700 }}>
              PRICING INTELLIGENCE
            </span>
          </div>
          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, color: "#FFFFFF", margin: "0 0 4px", fontWeight: 700 }}>
            {headline}
          </h3>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            {subline}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, width: 32, height: 32, cursor: "pointer",
              color: "rgba(255,255,255,0.6)", fontSize: 16, display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >×</button>
        )}
      </div>
    </div>
  );
}

// ─── Content router ───────────────────────────────────────────────────────────
function ComparisonContent({ slug, selectedTierIndex }: { slug: string; selectedTierIndex: number }) {
  const type = getComparisonType(slug);

  if (type === "film") {
    return (
      <>
        <FilmComparisonPanel selectedTierIndex={selectedTierIndex} />
        <LegalDisclaimer />
      </>
    );
  }

  const data = getNonFilmComparison(slug);
  if (!data) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
        Comparison data coming soon.
      </div>
    );
  }

  return (
    <>
      <NonFilmComparisonPanel data={data} />
      <LegalDisclaimer legalNote={data.legalNote} />
    </>
  );
}

// ─── Headline/subline per type ────────────────────────────────────────────────
function getHeadlineSubline(slug: string): [string, string] {
  const type = getComparisonType(slug);
  switch (type) {
    case "film":   return ["See How We Compare", "Real cost breakdown vs DIY AI video platforms"];
    case "song":   return ["Professional music at a fraction of the cost", "AI-composed, story-driven, delivered fast"];
    case "voice":  return ["Enterprise voice cloning without the enterprise price", "One-time price vs recurring subscriptions"];
    case "nft":    return ["Your story as NFT — without the DIY gas nightmare", "Full service: design, mint, list, market"];
    case "social": return ["Cinematic social clips in days, not weeks", "Story-driven production vs template tools"];
    case "sophia": return ["24/7 emotional AI that knows your story", "Not therapy. Not a chatbot. Your story presence."];
    case "vault":  return ["A living legacy archive, not just cloud storage", "Organized, narrated, and preserved — not just stored"];
    default:       return ["See How We Compare", "Ghaafeedi Music vs alternatives"];
  }
}

// ─── EXPORTED COMPONENT ───────────────────────────────────────────────────────
export default function PricingIntelligenceModal({
  slug,
  selectedTierIndex = 1,
  isMobile,
  isOpen,
  onClose,
}: Props) {
  const [headline, subline] = getHeadlineSubline(slug);

  // Trap scroll on mobile modal
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isMobile, isOpen]);

  // Keyboard close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Desktop: inline collapsible panel ─────────────────────────────────────
  if (!isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(5,11,26,0.95)",
              border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: 16, padding: "24px",
              marginTop: 4,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
              <ModalHeader headline={headline} subline={subline} />
              <ComparisonContent slug={slug} selectedTierIndex={selectedTierIndex} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── Mobile: full-screen modal ──────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 300,
            display: "flex", alignItems: "flex-end",
          }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              width: "100%",
              maxHeight: "92vh",
              background: BG,
              border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: "20px 20px 0 0",
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Drag handle */}
            <div style={{ padding: "10px 0 0", display: "flex", justifyContent: "center" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 24px" }}>
              <ModalHeader headline={headline} subline={subline} onClose={onClose} />
              <ComparisonContent slug={slug} selectedTierIndex={selectedTierIndex} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Trigger button (exported separately for easy insertion) ─────────────────
export function PricingIntelligenceTrigger({
  isOpen,
  onClick,
  isMobile,
}: {
  isOpen: boolean;
  onClick: () => void;
  isMobile: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        width: "100%",
        padding: isMobile ? "11px 16px" : "10px 16px",
        background: isOpen ? "rgba(212,175,55,0.08)" : "rgba(212,175,55,0.04)",
        border: `1px solid ${isOpen ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.15)"}`,
        borderRadius: 10,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "all 0.2s",
        marginBottom: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>⚖</span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: GOLD }}>
          See How We Compare
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700,
          background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 20, padding: "2px 7px", color: GREEN, letterSpacing: "0.06em",
        }}>SAVE MORE</span>
      </div>
      <span style={{
        fontSize: 11, color: "rgba(255,255,255,0.4)",
        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s",
        display: "inline-block",
      }}>▼</span>
    </motion.button>
  );
}
