import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "../lib/authClient";

const GOLD = "#D4AF37";
const GOLD2 = "#F4D06F";
const BG_CHAT = "#070A14";
const FREE_LIMIT = 3;
const FREE_LIMIT_KEY = "gm_sophia_free";

// Persist free tier usage in localStorage (resets daily)
function getFreeTierLocal(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(FREE_LIMIT_KEY);
    if (!raw) return { count: 0, date: "" };
    return JSON.parse(raw);
  } catch { return { count: 0, date: "" }; }
}

function incrementFreeTierLocal(): number {
  const today = new Date().toISOString().slice(0, 10);
  const { count, date } = getFreeTierLocal();
  const newCount = date === today ? count + 1 : 1;
  localStorage.setItem(FREE_LIMIT_KEY, JSON.stringify({ count: newCount, date: today }));
  return newCount;
}

function getRemainingLocal(): number {
  const today = new Date().toISOString().slice(0, 10);
  const { count, date } = getFreeTierLocal();
  if (date !== today) return FREE_LIMIT;
  return Math.max(0, FREE_LIMIT - count);
}

const QUICK_ACTIONS = [
  { label: "Product Recommendations", icon: "⬡" },
  { label: "How does it work?",       icon: "✦" },
  { label: "Pricing & Plans",         icon: "💎" },
  { label: "Onboarding Guidance",     icon: "🚀" },
];

interface Message { from: "user" | "sophia"; text: string; }

// ─── SOPHIA AI COMPANION INFO PANEL ──────────────────────────────────────────
function SophiaCompanionTab() {
  const tiers = [
    {
      name: "Starter",
      price: "$29",
      period: "/mo",
      color: "#C0A060",
      features: [
        "Unlimited emotional conversations",
        "Memory journaling (up to 50 entries)",
        "Daily check-ins & mood tracking",
        "Basic grief & healing support",
        "Email follow-ups",
      ],
    },
    {
      name: "Premium",
      price: "$49",
      period: "/mo",
      color: GOLD,
      highlight: true,
      features: [
        "Everything in Starter",
        "Deep emotional story sessions",
        "Unlimited memory entries",
        "Relationship & healing guidance",
        "Voice conversation mode",
        "Weekly personalized insights",
      ],
    },
    {
      name: "Elite",
      price: "$79",
      period: "/mo",
      color: "#F4D06F",
      features: [
        "Everything in Premium",
        "Priority 24/7 Sophia access",
        "Emotional legacy document",
        "Advanced grief counseling mode",
        "Dedicated memory vault",
        "Monthly 1-on-1 AI session report",
      ],
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
      {/* Distinction callout */}
      <div style={{
        background: "rgba(212,175,55,0.07)",
        border: "1px solid rgba(212,175,55,0.22)",
        borderRadius: 12, padding: "12px 14px", marginBottom: 16,
      }}>
        <div style={{
          fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
          color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8,
        }}>
          ⚠ Two Different Services
        </div>
        <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
          <div style={{
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 8, padding: "9px 11px",
          }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#22C55E", marginBottom: 3 }}>
              ✦ Sophia AI Concierge (this widget)
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              Free customer support assistant. Answers product questions, guides onboarding, recommends services. <strong style={{ color: "rgba(255,255,255,0.85)" }}>3 messages/day free</strong>, unlimited on any paid plan.
            </div>
          </div>
          <div style={{
            background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: 8, padding: "9px 11px",
          }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 3 }}>
              💛 Sophia AI Emotional Companion
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              A <strong style={{ color: "rgba(255,255,255,0.85)" }}>separate premium platform</strong> — deep emotional conversations, grief support, memory journaling, healing guidance, and personal growth. Requires its own membership. <strong style={{ color: GOLD }}>Not included in Concierge.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Sophia Companion heading */}
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700,
        color: "#fff", marginBottom: 4,
      }}>
        Sophia AI Emotional Companion
      </div>
      <div style={{
        fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)",
        marginBottom: 14, lineHeight: 1.5,
      }}>
        A private, deeply personal AI companion for emotional healing, grief processing, relationship recovery, and life storytelling. This is a full standalone experience — not a chatbot.
      </div>

      {/* Tier cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {tiers.map((tier) => (
          <div key={tier.name} style={{
            background: tier.highlight
              ? `linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.06) 100%)`
              : "rgba(255,255,255,0.03)",
            border: tier.highlight
              ? `1.5px solid rgba(212,175,55,0.35)`
              : "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: "12px 13px",
            position: "relative", overflow: "hidden",
          }}>
            {tier.highlight && (
              <div style={{
                position: "absolute", top: 8, right: 10,
                fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700,
                color: "#01040B", background: GOLD, borderRadius: 999,
                padding: "2px 8px", letterSpacing: "0.08em",
              }}>
                MOST POPULAR
              </div>
            )}
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: tier.color }}>
                {tier.name}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, color: "#fff" }}>
                {tier.price}
              </span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                {tier.period}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {tier.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                  <span style={{ color: tier.color, fontSize: 11, marginTop: 2, flexShrink: 0 }}>✓</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href="/products/sophia-ai"
        style={{
          display: "block", textAlign: "center",
          padding: "11px 16px",
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
          color: "#01040B", fontFamily: "Inter, sans-serif",
          fontWeight: 700, fontSize: 13, borderRadius: 12,
          textDecoration: "none", marginBottom: 8,
        }}
      >
        Explore Sophia AI Emotional Companion →
      </a>
      <p style={{
        fontFamily: "Inter, sans-serif", fontSize: 11,
        color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.5,
      }}>
        Separate membership required · Not part of Concierge · Cancel anytime
      </p>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function SophiaConcierge() {
  const [open, setOpen]           = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "about">("chat");
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [remaining, setRemaining] = useState(FREE_LIMIT);
  const [limitReached, setLimitReached] = useState(false);
  const [messages, setMessages]   = useState<Message[]>([
    { from: "sophia", text: "Hello, I'm Sophia — your Ghaafeedi Music AI Concierge. I'm here to help you turn your memories into something extraordinary. How can I help?" },
  ]);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (open) {
      const r = getRemainingLocal();
      setRemaining(r);
      setLimitReached(r === 0);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    if (limitReached) return;

    setMessages(m => [...m, { from: "user", text }]);
    setInput("");
    setLoading(true);

    const newCount = incrementFreeTierLocal();
    const newRemaining = Math.max(0, FREE_LIMIT - newCount);

    try {
      const res = await fetch("/api/sophia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyRef.current.slice(-6),
        }),
      });

      const data = await res.json() as {
        reply?: string;
        limitReached?: boolean;
        remaining?: number;
        isPaidMember?: boolean;
        message?: string;
        error?: string;
      };

      if (res.status === 429 || data.limitReached) {
        setLimitReached(true);
        setRemaining(0);
        setMessages(m => [...m, {
          from: "sophia",
          text: "You've used your 3 free daily messages. Upgrade to any Ghaafeedi plan for unlimited Concierge access. Or explore the Sophia AI Emotional Companion — a deeper, dedicated platform for emotional support. 💛",
        }]);
        return;
      }

      if (data.reply) {
        setMessages(m => [...m, { from: "sophia", text: data.reply! }]);
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: text },
          { role: "assistant", content: data.reply },
        ];
        if (data.isPaidMember) {
          setRemaining(999);
        } else {
          setRemaining(data.remaining ?? newRemaining);
          if ((data.remaining ?? newRemaining) === 0) setLimitReached(true);
        }
      } else {
        setMessages(m => [...m, { from: "sophia", text: data.error ?? "Something went wrong. Please try again." }]);
      }
    } catch {
      setMessages(m => [...m, { from: "sophia", text: "I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleQuick(label: string) { sendMessage(label); }
  function handleSend() { sendMessage(input); }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <>
      {/* ─── HOMEPAGE SECTION ──────────────────────────────────────────────── */}
      <section style={{
        padding: "80px 40px 96px",
        background: "#0A0B0F",
        borderTop: "1px solid rgba(212,165,116,0.08)",
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64, alignItems: "center",
          }} className="sophia-grid">

            {/* Left — copy */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 999, padding: "5px 14px", marginBottom: 22,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, boxShadow: `0 0 8px ${GOLD}` }} />
                <span style={{ fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  AI Services
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px,3.5vw,52px)",
                color: "#FFFFFF", fontWeight: 700, lineHeight: 1.18, marginBottom: 18,
              }}>
                Two Sophia Experiences,<br />
                <span style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Built for Different Needs
                </span>
              </h2>
              <p style={{
                fontFamily: "Inter, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.6)",
                lineHeight: 1.7, marginBottom: 24, maxWidth: 480,
              }}>
                We offer two distinct Sophia-powered experiences. Understanding which one serves you best helps you get the most out of Ghaafeedi Music.
              </p>

              {/* Comparison cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                {/* Concierge */}
                <div style={{
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.18)",
                  borderRadius: 14, padding: "16px 18px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: "rgba(34,197,94,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0,
                    }}>✦</div>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: "#22C55E" }}>
                        Sophia AI Concierge
                      </div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        Free support assistant · This widget
                      </div>
                    </div>
                    <div style={{
                      marginLeft: "auto", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700,
                      color: "#22C55E", background: "rgba(34,197,94,0.12)",
                      border: "1px solid rgba(34,197,94,0.25)", borderRadius: 999, padding: "3px 10px",
                    }}>FREE</div>
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                    Answers your product questions, guides onboarding, and recommends the right Ghaafeedi service for your story. <strong style={{ color: "rgba(255,255,255,0.85)" }}>3 messages/day</strong> for visitors — unlimited on any paid plan.
                  </div>
                </div>

                {/* Emotional Companion */}
                <div style={{
                  background: "rgba(212,175,55,0.07)",
                  border: "1px solid rgba(212,175,55,0.22)",
                  borderRadius: 14, padding: "16px 18px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${GOLD} 0%, #8B4513 100%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0,
                    }}>💛</div>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: GOLD }}>
                        Sophia AI Emotional Companion
                      </div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        Separate premium platform · Membership required
                      </div>
                    </div>
                    <div style={{
                      marginLeft: "auto", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700,
                      color: GOLD, background: "rgba(212,175,55,0.1)",
                      border: "1px solid rgba(212,175,55,0.25)", borderRadius: 999, padding: "3px 10px",
                      whiteSpace: "nowrap",
                    }}>From $29/mo</div>
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                    A deeply personal AI companion for emotional healing, grief processing, relationship recovery, and life storytelling. Full memory journaling, voice sessions, and unlimited emotional conversations. <strong style={{ color: GOLD }}>Not the same as the Concierge widget.</strong>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {["Starter $29/mo", "Premium $49/mo", "Elite $79/mo"].map((t) => (
                      <span key={t} style={{
                        fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: GOLD2,
                        background: "rgba(212,175,55,0.09)",
                        border: "1px solid rgba(212,175,55,0.18)",
                        borderRadius: 999, padding: "3px 10px",
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={() => setOpen(true)} style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  color: "#22C55E", fontFamily: "Inter, sans-serif", fontWeight: 700,
                  fontSize: 14, borderRadius: 999, padding: "13px 24px",
                  cursor: "pointer",
                }}>
                  ✦ Open Concierge (Free)
                </button>
                <a href="/products/sophia-ai" style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
                  color: "#01040B", fontFamily: "Inter, sans-serif", fontWeight: 700,
                  fontSize: 14, borderRadius: 999, padding: "13px 24px",
                  border: "none", cursor: "pointer", textDecoration: "none",
                  boxShadow: `0 6px 32px rgba(212,175,55,0.35)`,
                }}>
                  💛 Explore Emotional Companion
                </a>
              </div>
            </motion.div>

            {/* Right — chat preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <div style={{
                background: "linear-gradient(145deg, #0D0F1E 0%, #080A14 100%)",
                border: "1px solid rgba(212,175,55,0.15)",
                borderRadius: 20, overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              }}>
                {/* Chat header */}
                <div style={{
                  padding: "16px 20px",
                  background: "rgba(212,175,55,0.05)",
                  borderBottom: "1px solid rgba(212,175,55,0.1)",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${GOLD} 0%, #8B4513 100%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>✦</div>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#fff", fontWeight: 700 }}>Sophia Concierge</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#22C55E", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
                      Online · Free Support Assistant
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {session ? "Unlimited" : `${getRemainingLocal()}/${FREE_LIMIT} free msgs today`}
                  </div>
                </div>

                {/* Sample messages */}
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { from: "sophia", text: "Hello! I'm the Sophia AI Concierge — a free support assistant for Ghaafeedi Music. What can I help you with today?" },
                    { from: "user",   text: "What's the difference between the Concierge and the Emotional Companion?" },
                    { from: "sophia", text: "Great question! I'm the Concierge — free for everyone, I answer product questions and guide you. The Sophia AI Emotional Companion is a separate premium platform for deep emotional healing, grief support, and memory journaling. It requires its own membership starting at $29/mo." },
                  ].map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "82%",
                        background: m.from === "sophia"
                          ? "rgba(255,255,255,0.05)"
                          : `linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.08) 100%)`,
                        border: m.from === "sophia"
                          ? "1px solid rgba(255,255,255,0.07)"
                          : `1px solid rgba(212,175,55,0.22)`,
                        borderRadius: m.from === "sophia" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                        padding: "10px 14px",
                        fontFamily: "Inter, sans-serif", fontSize: 13, lineHeight: 1.55,
                        color: m.from === "sophia" ? "rgba(255,255,255,0.8)" : "#fff",
                      }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
                  <button onClick={() => setOpen(true)} style={{
                    flex: 1, padding: "11px",
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: 12, color: "#22C55E",
                    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13,
                    cursor: "pointer",
                  }}>
                    Open Concierge →
                  </button>
                  <a href="/products/sophia-ai" style={{
                    flex: 1, padding: "11px",
                    background: "rgba(212,175,55,0.08)",
                    border: "1px solid rgba(212,175,55,0.2)",
                    borderRadius: 12, color: GOLD,
                    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13,
                    cursor: "pointer", textDecoration: "none", textAlign: "center",
                    display: "block",
                  }}>
                    Companion →
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .sophia-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          }
        `}</style>
      </section>

      {/* ─── FLOATING WIDGET BUTTON ─── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            onClick={() => setOpen(true)}
            style={{
              position: "fixed", bottom: 24, right: 24, zIndex: 9990,
              width: 60, height: 60, borderRadius: "50%",
              background: `linear-gradient(135deg, ${GOLD} 0%, #8B4513 100%)`,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, boxShadow: `0 8px 32px rgba(212,175,55,0.5)`,
            }}
            aria-label="Chat with Sophia Concierge"
          >
            ✦
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── CHAT WIDGET ─── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{
              position: "fixed", bottom: 24, right: 24, zIndex: 9990,
              width: "min(400px, calc(100vw - 32px))",
              background: "linear-gradient(145deg, #0D0F1E 0%, #080A14 100%)",
              border: "1px solid rgba(212,175,55,0.18)",
              borderRadius: 20, overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.06)",
              display: "flex", flexDirection: "column",
              maxHeight: "min(620px, calc(100svh - 48px))",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "13px 16px 0",
              background: "rgba(212,175,55,0.04)",
              borderBottom: "1px solid rgba(212,175,55,0.1)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${GOLD} 0%, #8B4513 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, flexShrink: 0,
                }}>✦</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: "#fff", fontWeight: 700 }}>Sophia</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#22C55E", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
                    AI Concierge · Online
                  </div>
                </div>
                {!session && activeTab === "chat" && (
                  <div style={{
                    fontFamily: "Inter, sans-serif", fontSize: 11,
                    color: remaining === 0 ? "#ef4444" : remaining === 1 ? "#f59e0b" : "rgba(255,255,255,0.45)",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 999, padding: "3px 9px",
                  }}>
                    {remaining}/{FREE_LIMIT} free
                  </div>
                )}
                <button onClick={() => setOpen(false)} style={{
                  background: "none", border: "none", color: "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4, flexShrink: 0,
                }}>×</button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0 }}>
                {([
                  { key: "chat",  label: "Concierge Chat" },
                  { key: "about", label: "Sophia AI Info" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1, padding: "8px 0",
                      background: "none", border: "none",
                      borderBottom: activeTab === tab.key
                        ? `2px solid ${GOLD}`
                        : "2px solid transparent",
                      color: activeTab === tab.key ? GOLD : "rgba(255,255,255,0.4)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 500,
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    {tab.key === "chat" ? "✦ " : "💛 "}{tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            {activeTab === "about" ? (
              <SophiaCompanionTab />
            ) : (
              <>
                {/* Messages */}
                <div style={{
                  flex: 1, overflowY: "auto", padding: "16px",
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "84%",
                        background: m.from === "sophia"
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(212,175,55,0.12)",
                        border: m.from === "sophia"
                          ? "1px solid rgba(255,255,255,0.07)"
                          : "1px solid rgba(212,175,55,0.2)",
                        borderRadius: m.from === "sophia" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                        padding: "9px 13px",
                        fontFamily: "Inter, sans-serif", fontSize: 13.5, lineHeight: 1.55,
                        color: m.from === "sophia" ? "rgba(255,255,255,0.82)" : "#fff",
                      }}>
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "4px 14px 14px 14px", padding: "10px 16px",
                        display: "flex", gap: 5, alignItems: "center",
                      }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{
                            width: 6, height: 6, borderRadius: "50%", background: GOLD,
                            animation: "sophiaDot 1.2s ease-in-out infinite",
                            animationDelay: `${i * 0.2}s`,
                          }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Limit reached banner */}
                  {limitReached && (
                    <div style={{
                      background: "rgba(212,175,55,0.08)",
                      border: "1px solid rgba(212,175,55,0.22)",
                      borderRadius: 12, padding: "12px 14px",
                    }}>
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
                        Daily free messages used. Resets tomorrow.
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <a href="/create-account" style={{
                          flex: 1, display: "block", textAlign: "center", padding: "8px 0",
                          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
                          color: "#01040B", fontFamily: "Inter, sans-serif",
                          fontWeight: 700, fontSize: 12, borderRadius: 999,
                          textDecoration: "none",
                        }}>
                          Upgrade (Unlimited)
                        </a>
                        <button
                          onClick={() => setActiveTab("about")}
                          style={{
                            flex: 1, padding: "8px 0",
                            background: "rgba(212,175,55,0.09)",
                            border: "1px solid rgba(212,175,55,0.22)",
                            borderRadius: 999, color: GOLD,
                            fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Sophia Companion →
                        </button>
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* Quick actions (show only at start) */}
                {messages.length <= 1 && (
                  <div style={{
                    padding: "0 14px 10px",
                    display: "flex", flexWrap: "wrap", gap: 7, flexShrink: 0,
                  }}>
                    {QUICK_ACTIONS.map(a => (
                      <button key={a.label} onClick={() => handleQuick(a.label)} style={{
                        background: "rgba(212,175,55,0.06)",
                        border: "1px solid rgba(212,175,55,0.18)",
                        borderRadius: 999, padding: "6px 12px",
                        color: "rgba(255,255,255,0.7)", cursor: "pointer",
                        fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500,
                        transition: "all 0.2s",
                      }}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveTab("about")}
                      style={{
                        background: "rgba(212,175,55,0.1)",
                        border: "1px solid rgba(212,175,55,0.28)",
                        borderRadius: 999, padding: "6px 12px",
                        color: GOLD, cursor: "pointer",
                        fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                        transition: "all 0.2s",
                      }}
                    >
                      💛 Sophia Companion Plans
                    </button>
                  </div>
                )}

                {/* Input */}
                <div style={{
                  padding: "12px 14px 16px",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  flexShrink: 0,
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={limitReached ? "Upgrade for unlimited access..." : "Ask Sophia anything..."}
                      disabled={limitReached || loading}
                      rows={1}
                      style={{
                        flex: 1, background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12, padding: "10px 13px",
                        color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14,
                        resize: "none", outline: "none",
                        opacity: limitReached ? 0.5 : 1,
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || loading || limitReached}
                      style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: input.trim() && !limitReached
                          ? `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`
                          : "rgba(255,255,255,0.06)",
                        border: "none", cursor: input.trim() && !limitReached ? "pointer" : "not-allowed",
                        color: input.trim() && !limitReached ? "#01040B" : "rgba(255,255,255,0.3)",
                        fontSize: 16, transition: "all 0.2s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ↑
                    </button>
                  </div>
                  {!session && !limitReached && (
                    <p style={{
                      fontFamily: "Inter, sans-serif", fontSize: 11,
                      color: "rgba(255,255,255,0.3)", marginTop: 7, textAlign: "center",
                    }}>
                      {remaining} free message{remaining !== 1 ? "s" : ""} remaining ·{" "}
                      <a href="/create-account" style={{ color: GOLD, textDecoration: "none" }}>Upgrade for unlimited</a>
                      {" "}·{" "}
                      <button
                        onClick={() => setActiveTab("about")}
                        style={{ background: "none", border: "none", color: GOLD2, cursor: "pointer", fontSize: 11, padding: 0 }}
                      >
                        Sophia Companion Plans
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes sophiaDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
