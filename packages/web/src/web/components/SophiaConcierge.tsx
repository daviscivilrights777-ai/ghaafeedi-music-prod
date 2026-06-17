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

export function SophiaConcierge() {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [remaining, setRemaining] = useState(FREE_LIMIT);
  const [limitReached, setLimitReached] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: "sophia", text: "Hello, I'm Sophia — your Ghaafeedi Music AI Concierge. I'm here to help you turn your memories into something extraordinary. How can I help?" },
  ]);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const isPaidMember = false; // Will be determined server-side; client just tracks display

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

    // Optimistic UI
    setMessages(m => [...m, { from: "user", text }]);
    setInput("");
    setLoading(true);

    // Track client-side for instant feedback
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
          text: "You've used your 3 free daily messages with me. Upgrade to any Ghaafeedi plan for unlimited access — I'd love to keep helping you create something beautiful. 💛",
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
      {/* ─── SECTION WRAPPER (homepage section) ─── */}
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
                  AI Emotional Concierge
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px,3.5vw,52px)",
                color: "#FFFFFF", fontWeight: 700, lineHeight: 1.18, marginBottom: 18,
              }}>
                Meet Sophia,<br />
                <span style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Your Creative Partner
                </span>
              </h2>
              <p style={{
                fontFamily: "Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.6)",
                lineHeight: 1.7, marginBottom: 28, maxWidth: 460,
              }}>
                Sophia is available to everyone — no subscription required. Ask her anything about your story, our products, or the creative process. Free members get 3 questions per day.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                {[
                  { icon: "💬", text: "3 free daily messages for all visitors" },
                  { icon: "🔓", text: "Unlimited access for paid members" },
                  { icon: "🎯", text: "Onboarding guidance & product recommendations" },
                  { icon: "24h", text: "Free tier resets every 24 hours" },
                ].map((item) => (
                  <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: item.icon === "24h" ? 11 : 16, fontWeight: item.icon === "24h" ? 700 : 400, color: GOLD, minWidth: 24, textAlign: "center" }}>{item.icon}</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.65)" }}>{item.text}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setOpen(true)} style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
                color: "#01040B", fontFamily: "Inter, sans-serif", fontWeight: 700,
                fontSize: 15, borderRadius: 999, padding: "14px 30px",
                border: "none", cursor: "pointer",
                boxShadow: `0 6px 32px rgba(212,175,55,0.4)`,
              }}>
                <span>✦</span> Chat with Sophia
              </button>
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
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#fff", fontWeight: 700 }}>Sophia</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#22C55E", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
                      Online · AI Concierge
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {session ? "Unlimited" : `${getRemainingLocal()}/${FREE_LIMIT} free msgs today`}
                  </div>
                </div>

                {/* Sample messages */}
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { from: "sophia", text: "Hello! I'm Sophia. I can help you find the perfect way to preserve your memories. What brings you here today?" },
                    { from: "user",   text: "I want to create something for my late grandmother." },
                    { from: "sophia", text: "That's a beautiful intention. Our Memorial Legacy Film or a Personalized Cinematic Song would be perfect — both transform cherished memories into something eternal. Which feels right?" },
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
                        fontFamily: "Inter, sans-serif", fontSize: 13.5, lineHeight: 1.55,
                        color: m.from === "sophia" ? "rgba(255,255,255,0.8)" : "#fff",
                      }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ padding: "0 20px 20px" }}>
                  <button onClick={() => setOpen(true)} style={{
                    width: "100%", padding: "12px",
                    background: "rgba(212,175,55,0.08)",
                    border: "1px solid rgba(212,175,55,0.2)",
                    borderRadius: 12, color: GOLD,
                    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14,
                    cursor: "pointer",
                  }}>
                    Continue this conversation →
                  </button>
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
            aria-label="Chat with Sophia"
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
              width: "min(380px, calc(100vw - 32px))",
              background: "linear-gradient(145deg, #0D0F1E 0%, #080A14 100%)",
              border: "1px solid rgba(212,175,55,0.18)",
              borderRadius: 20, overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.06)",
              display: "flex", flexDirection: "column",
              maxHeight: "min(560px, calc(100svh - 48px))",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "14px 16px",
              background: "rgba(212,175,55,0.05)",
              borderBottom: "1px solid rgba(212,175,55,0.1)",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: `linear-gradient(135deg, ${GOLD} 0%, #8B4513 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
              }}>✦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: "#fff", fontWeight: 700 }}>Sophia</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#22C55E", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
                  AI Concierge · Online
                </div>
              </div>
              {/* Free tier counter */}
              {!session && (
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
                  borderRadius: 12, padding: "12px 14px", textAlign: "center",
                }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
                    Daily free messages used. Resets tomorrow.
                  </p>
                  <a href="/signup" style={{
                    display: "inline-block", padding: "8px 18px",
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
                    color: "#01040B", fontFamily: "Inter, sans-serif",
                    fontWeight: 700, fontSize: 13, borderRadius: 999,
                    textDecoration: "none",
                  }}>
                    Upgrade for Unlimited Access →
                  </a>
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
                  {remaining} free message{remaining !== 1 ? "s" : ""} remaining today ·{" "}
                  <a href="/signup" style={{ color: GOLD, textDecoration: "none" }}>Upgrade for unlimited</a>
                </p>
              )}
            </div>
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
