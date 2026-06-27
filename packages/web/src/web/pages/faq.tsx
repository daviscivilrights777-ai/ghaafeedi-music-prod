import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

const GOLD = "#D4AF37";
const GOLD2 = "#FFC24D";
const BG = "#050B1A";
const NAVY = "#0B1736";

const FADE_UP = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as any } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.07 } } };

const FAQ_CATEGORIES = [
  {
    label: "Getting Started",
    icon: "✦",
    items: [
      {
        q: "What is Ghaafeedi Music?",
        a: "Ghaafeedi Music is a luxury AI-powered emotional storytelling platform. We transform your personal memories, relationships, and life stories into cinematic songs, films, and legacy experiences — using the most advanced AI emotional intelligence available. Every production is personalized to your story, not a template.",
      },
      {
        q: "How does the AI songwriting process work?",
        a: "You share your story through our 12-step emotional onboarding guided by Sophia AI. Our AI analyzes the emotional arc, extracts key themes, writes lyrics tuned to your feelings, composes original music, and produces a fully mastered song — typically delivered within 24–48 hours. A human quality review is performed before every delivery.",
      },
      {
        q: "Do I need any technical or musical knowledge?",
        a: "None whatsoever. Our onboarding is designed for anyone. You simply share your story in your own words. Sophia AI handles everything from emotional analysis to music composition and production. If you can tell a story, we can make it cinematic.",
      },
      {
        q: "What is Sophia AI Emotional Companion?",
        a: "Sophia is your 24/7 personal AI companion — a 24-28 year old Mediterranean/Middle Eastern presence with warm emotional intelligence. She listens, analyzes your story's emotional layers, guides your onboarding journey, and remains available to help throughout your entire creative process. She is the heart of the Ghaafeedi Music experience.",
      },
    ],
  },
  {
    label: "Products & Pricing",
    icon: "◈",
    items: [
      {
        q: "What products does Ghaafeedi Music offer?",
        a: "We offer 14 premium products including: Sophia AI Emotional Companion, Cinematic Life Story Film, Emotional Soundtrack (song memberships), Voice Cloning Studio, Memorial Legacy Film, Relationship Healing, Family Vault, NFT Collection, Cinematic Story Film, Couples Journey Film, Dream AI Visualization, Future Self Vision, Signature Masterpiece, and Social Story Clips. Each product is a standalone experience or part of a membership.",
      },
      {
        q: "What are the song membership tiers?",
        a: "We offer three song membership tiers: Essential ($19/mo — 2 songs/month), Creator ($39/mo — 5 songs/month), and Pro ($69/mo — 12 songs/month). All tiers include original AI-composed music, professional mastering, and commercial licensing.",
      },
      {
        q: "What are the video/film pricing options?",
        a: "Cinematic films are priced by length: 2-minute films ($79 / $129 / $199 across tiers), 5-minute films ($149 / $249 / $399), and 10-minute films ($299 / $499 / $799). Each tier adds revisions, priority production, enhanced visual quality, and delivery formats.",
      },
      {
        q: "Can I use my Ghaafeedi song commercially?",
        a: "Yes. All productions delivered through our platform come with a perpetual, worldwide commercial license. You can stream, distribute, sell, and license your song without additional royalties to us. See our User Content Policy for the full scope of your rights.",
      },
      {
        q: "Are there one-time purchase options or only subscriptions?",
        a: "Both. Song memberships are monthly subscriptions. Cinematic films, voice cloning, legacy vaults, and visualization experiences are available as one-time purchases. You can mix and match — there is no requirement to subscribe.",
      },
    ],
  },
  {
    label: "Production & Delivery",
    icon: "⬡",
    items: [
      {
        q: "How long does production take?",
        a: "Standard song productions: 24–48 hours. Cinematic films (2-min): 2–3 business days. Cinematic films (5–10 min): 3–5 business days. Legacy Vaults: 5–7 business days. Elite tier productions receive priority queue access and have reduced timelines across the board.",
      },
      {
        q: "What file formats will I receive?",
        a: "Songs are delivered as high-quality MP3 (320kbps) and WAV (24-bit). Videos are delivered as MP4 (H.264, up to 4K depending on tier). Legacy packages include a ZIP archive with all assets and formats. Physical USB delivery is available on select premium tiers.",
      },
      {
        q: "Can I request revisions?",
        a: "Yes. Every production includes at least one complimentary revision. Creator and Pro song tiers include 2–3 revisions. Premium and Elite film tiers include 2–4 revisions. Revisions are processed within 24–48 hours of your feedback submission.",
      },
      {
        q: "What happens if I'm not satisfied with my production?",
        a: "We stand behind every production. If your song or film does not meet the quality standard you briefed, we'll revise it. If after revision it still doesn't meet your expectations, you are eligible for a full refund as described in our Refund Policy. Our goal is a production you're proud of.",
      },
      {
        q: "Can I upload my own photos, videos, or audio to use in my production?",
        a: "Absolutely. Our onboarding flow includes a media upload step. You can submit photos, video clips, audio recordings, and written memories. All uploaded content is encrypted at rest and used solely for your production. See our Privacy Policy for details.",
      },
    ],
  },
  {
    label: "Voice Cloning",
    icon: "∿",
    items: [
      {
        q: "What is the Voice Cloning Studio?",
        a: "Voice Cloning Studio creates a synthetic model of your voice (or a loved one's voice) from audio samples you provide. Once created, your AI song can be sung in that voice. The resulting voice model is exclusively yours — we do not share, reuse, or sell voice models.",
      },
      {
        q: "How much audio do I need to provide for voice cloning?",
        a: "We recommend 3–5 minutes of clean audio recorded in a quiet environment. The higher the audio quality and the more natural the speech, the more accurate the voice model. We provide a guided recording checklist to help you get the best results.",
      },
      {
        q: "Do I need consent to clone someone else's voice?",
        a: "Yes, absolutely. You must have explicit written or recorded consent from the person whose voice you are cloning. By proceeding with Voice Cloning Studio, you confirm you have obtained this consent and accept full responsibility for all uses of the cloned voice. Ghaafeedi Music reserves the right to terminate accounts that misuse voice cloning technology.",
      },
      {
        q: "Can I delete my voice model?",
        a: "Yes. You can request deletion of your voice model at any time through Account Settings → Voice Models → Delete. Deletion is permanent and irreversible. The model and all associated data are purged within 30 days of the request.",
      },
    ],
  },
  {
    label: "Account & Billing",
    icon: "♾",
    items: [
      {
        q: "How do I cancel my subscription?",
        a: "Go to Account Settings → Billing → Cancel Subscription. Your access continues until the end of the current billing period. No cancellation fee applies. You will not be charged again after cancellation.",
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept all major credit and debit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, PayPal, bank transfer, and select cryptocurrencies. Buy Now Pay Later (BNPL) options including monthly installments and 30/60-day payment plans are available through Dodo Payments.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes. We use Whop and Dodo Payments as our payment processors — we never store raw card data on our servers. All payment pages are secured with TLS 1.3, PCI DSS compliance, and tokenized transactions. Your payment details are handled entirely by our certified payment partners.",
      },
      {
        q: "Can I get a refund?",
        a: "Full refunds are available within 48 hours of initial subscription purchase if no production has been started. Productions in progress are evaluated on a case-by-case basis. See our full Refund Policy for details, or contact support@ghaafeedimusic.com with your order ID.",
      },
      {
        q: "Can I upgrade or downgrade my plan?",
        a: "Yes. You can change your subscription tier at any time from Account Settings → Billing → Change Plan. Upgrades take effect immediately (with prorated billing). Downgrades take effect at the start of your next billing cycle.",
      },
    ],
  },
  {
    label: "Privacy & Security",
    icon: "⟡",
    items: [
      {
        q: "Is my story kept private?",
        a: "Absolutely. All content is private by default. We never publish, share, or display your productions without your explicit opt-in. Your story data is encrypted at rest and in transit. We do not sell personal data. See our Privacy Policy for full details.",
      },
      {
        q: "Does Ghaafeedi Music train AI on my content?",
        a: "No — not without your consent. By default, your story and production content is never used to train our AI models. If you choose to opt-in to our AI improvement program, you can do so in Account Settings → Privacy → AI Training Preferences, and you can withdraw consent at any time.",
      },
      {
        q: "Who can access my productions?",
        a: "Only you, by default. Productions are stored in your private vault. You can optionally share a production via a private link, or opt-in to community showcases. Admin staff may access productions only for quality review or support purposes, and only with your knowledge per our Data Protection Policy.",
      },
      {
        q: "What happens to my data if I delete my account?",
        a: "All personal data is purged within 30 days of account deletion. Backup copies are purged within 90 days. Aggregated, anonymized analytics (not traceable to you) may be retained. You can request a full data export before deletion via privacy@ghaafeedimusic.com.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(212,175,55,0.10)",
        cursor: "pointer",
      }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, padding: "20px 0",
      }}>
        <span style={{
          fontFamily: "Inter, sans-serif", fontSize: 14.5, fontWeight: 500,
          color: open ? "#FFF" : "rgba(255,255,255,0.82)",
          lineHeight: 1.5, transition: "color 0.2s",
        }}>{q}</span>
        <span style={{
          fontSize: 18, color: GOLD, flexShrink: 0,
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 0.28s cubic-bezier(0.34,1.4,0.64,1)",
          display: "inline-block", lineHeight: 1,
        }}>+</span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] as any }}
            style={{ overflow: "hidden" }}
          >
            <p style={{
              fontFamily: "Inter, sans-serif", fontSize: 13.5,
              color: "rgba(255,255,255,0.62)", lineHeight: 1.8,
              margin: "0 0 20px", paddingRight: 32,
            }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div style={{ background: BG, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #010510; }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 2px; }
      `}</style>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{
        position: "relative", padding: "140px 40px 80px", textAlign: "center", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600, height: 600,
          background: "radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <motion.div initial="hidden" animate="show" variants={STAGGER}
          style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
          <motion.div variants={FADE_UP} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.22)",
            borderRadius: 40, padding: "6px 18px", marginBottom: 28,
          }}>
            <span style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: "0.18em", fontFamily: "Inter, sans-serif" }}>HELP CENTER</span>
          </motion.div>
          <motion.h1 variants={FADE_UP} style={{
            fontFamily: "Playfair Display, serif", fontSize: "clamp(36px,5vw,64px)",
            fontWeight: 700, color: "#FFF", margin: "0 0 20px", lineHeight: 1.1,
          }}>
            Frequently Asked{" "}
            <span style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Questions</span>
          </motion.h1>
          <motion.p variants={FADE_UP} style={{
            fontFamily: "Inter, sans-serif", fontSize: 16,
            color: "rgba(255,255,255,0.55)", lineHeight: 1.75,
            margin: "0 auto", maxWidth: 560,
          }}>
            Everything you need to know about Ghaafeedi Music — from getting started
            to voice cloning, billing, and your creative rights.
          </motion.p>
        </motion.div>
      </section>

      {/* ── CATEGORY TABS ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 48,
          justifyContent: "center",
        }}>
          {FAQ_CATEGORIES.map((cat, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{
              padding: "10px 20px", borderRadius: 40, cursor: "pointer",
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
              letterSpacing: "0.03em", transition: "all 0.22s",
              background: activeTab === i ? `linear-gradient(135deg, ${GOLD}, #b8902a)` : "rgba(255,255,255,0.04)",
              border: activeTab === i ? "none" : "1px solid rgba(255,255,255,0.10)",
              color: activeTab === i ? BG : "rgba(255,255,255,0.60)",
              boxShadow: activeTab === i ? `0 4px 20px rgba(212,175,55,0.30)` : "none",
            }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* ── FAQ CONTENT ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", maxWidth: 800, margin: "0 auto 80px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] as any }}
            >
              <div style={{
                background: "rgba(11,23,54,0.4)", border: "1px solid rgba(212,175,55,0.12)",
                borderRadius: 20, padding: "8px 32px 16px",
                backdropFilter: "blur(8px)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "24px 0 16px", borderBottom: "1px solid rgba(212,175,55,0.12)",
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 18, color: GOLD }}>{FAQ_CATEGORIES[activeTab]!.icon}</span>
                  <h2 style={{
                    fontFamily: "Playfair Display, serif", fontSize: 22,
                    fontWeight: 700, color: "#FFF", margin: 0,
                  }}>{FAQ_CATEGORIES[activeTab]!.label}</h2>
                  <span style={{
                    fontSize: 11, color: GOLD, fontWeight: 700, fontFamily: "Inter, sans-serif",
                    background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.25)",
                    borderRadius: 20, padding: "3px 10px", marginLeft: "auto",
                  }}>{FAQ_CATEGORIES[activeTab]!.items.length} questions</span>
                </div>
                {FAQ_CATEGORIES[activeTab]!.items.map((item, i) => (
                  <FaqItem key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── STILL NEED HELP ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          style={{
            textAlign: "center", padding: "60px 40px 80px",
            background: "rgba(11,23,54,0.35)", border: "1px solid rgba(212,175,55,0.12)",
            borderRadius: 24, marginBottom: 80, position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 400, height: 400,
            background: "radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)",
              borderRadius: 40, padding: "6px 16px", marginBottom: 20,
            }}>
              <span style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: "0.15em", fontFamily: "Inter, sans-serif" }}>SOPHIA AI SUPPORT</span>
            </div>
            <h2 style={{
              fontFamily: "Playfair Display, serif", fontSize: "clamp(24px,3vw,38px)",
              fontWeight: 700, color: "#FFF", margin: "0 0 14px",
            }}>Still have questions?</h2>
            <p style={{
              fontFamily: "Inter, sans-serif", fontSize: 15,
              color: "rgba(255,255,255,0.55)", margin: "0 auto 32px", maxWidth: 480, lineHeight: 1.7,
            }}>
              Sophia AI is available 24/7 for instant answers. Or reach our human support team for anything more complex.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/contact" style={{
                padding: "14px 32px", borderRadius: 999,
                background: `linear-gradient(135deg, ${GOLD}, #b8902a)`,
                color: BG, fontFamily: "Inter, sans-serif", fontWeight: 700,
                fontSize: 14, textDecoration: "none", letterSpacing: "0.02em",
                boxShadow: `0 4px 24px rgba(212,175,55,0.40)`,
                transition: "all 0.22s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 36px rgba(212,175,55,0.55)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(212,175,55,0.40)"; }}
              >Chat with Sophia AI →</a>
              <a href="mailto:support@ghaafeedimusic.com" style={{
                padding: "13px 28px", borderRadius: 999,
                background: "transparent", color: "rgba(255,255,255,0.65)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14,
                textDecoration: "none", letterSpacing: "0.02em", transition: "all 0.22s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.50)"; (e.currentTarget as HTMLElement).style.color = GOLD; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; }}
              >Email Support</a>
            </div>
            <p style={{
              fontFamily: "Inter, sans-serif", fontSize: 12,
              color: "rgba(255,255,255,0.28)", marginTop: 20,
            }}>support@ghaafeedimusic.com · Response within 2 business hours</p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
