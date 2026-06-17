import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_ACTIONS = [
  { label: "Product Recommendations", icon: "⬡" },
  { label: "Order Tracking",          icon: "📦" },
  { label: "FAQ Assistance",          icon: "❓" },
  { label: "Onboarding Guidance",     icon: "🚀" },
  { label: "Account Support",         icon: "🔑" },
];

const RESPONSES: Record<string, string> = {
  "Product Recommendations": "Based on your goals, I'd recommend starting with our Personalized Cinematic Songs. It's the most emotionally impactful starting point. Would you like to see the full 14-product catalog?",
  "Order Tracking": "I can pull up your order status right now. Please sign into your dashboard and I'll have real-time production updates waiting for you.",
  "FAQ Assistance": "I can answer questions about our process, pricing, delivery timelines, revisions, data privacy, and more. What would you like to know?",
  "Onboarding Guidance": "Welcome! Our onboarding takes about 12 steps and I'll guide you every moment. Ready to begin? Click 'Start Your Story' and I'll walk you through sharing your memories.",
  "Account Support": "For account help — login issues, billing, upgrades, or cancellations — I'm here 24/7. Or email us at support@ghaafeedimusic.com for priority assistance.",
};

export function SophiaConcierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: "user" | "sophia"; text: string }[]>([
    { from: "sophia", text: "Hello, I'm Sophia — your Ghaafeedi Music AI Concierge. I'm here 24/7 to help you create something extraordinary from your memories. How can I help?" },
  ]);
  const [input, setInput] = useState("");

  function handleQuick(label: string) {
    const reply = RESPONSES[label] || "Let me look into that for you right away.";
    setMessages(m => [
      ...m,
      { from: "user", text: label },
      { from: "sophia", text: reply },
    ]);
  }

  function handleSend() {
    if (!input.trim()) return;
    const q = input.trim().toLowerCase();
    let reply = "That's a great question. Our team and I are here to help — for immediate support, visit our Help Center or email support@ghaafeedimusic.com.";
    if (q.includes("price") || q.includes("cost") || q.includes("plan"))
      reply = "Our Song plans start at $19/month (2 songs). Video experiences start at $79. All pricing is transparent with no hidden fees. Want me to walk you through the full pricing breakdown?";
    else if (q.includes("refund") || q.includes("cancel"))
      reply = "We offer a satisfaction guarantee. If your creation doesn't meet expectations, we'll revise it. For refunds, see our Refund Policy at ghaafeedimusic.com/legal/refund-policy.";
    else if (q.includes("how") && q.includes("work"))
      reply = "It's a simple 4-step journey: Share Your Story → AI Analysis → Song & Film Creation → Receive Your Legacy. The whole process takes 3–14 business days depending on your product.";
    else if (q.includes("sophia") || q.includes("ai"))
      reply = "I'm Sophia, your dedicated AI Emotional Concierge. I can guide product selection, track your orders, answer questions, and support your entire creative journey — 24/7.";

    setMessages(m => [
      ...m,
      { from: "user", text: input.trim() },
      { from: "sophia", text: reply },
    ]);
    setInput("");
  }

  return (
    <>
      {/* Section */}
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
                background: "rgba(139,92,246,0.10)",
                border: "1px solid rgba(139,92,246,0.28)",
                borderRadius: 999, padding: "5px 16px", marginBottom: 24,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#8B5CF6", letterSpacing: "0.20em", textTransform: "uppercase" }}>
                  Available 24/7
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(32px, 4vw, 50px)",
                fontWeight: 800, color: "#fff",
                lineHeight: 1.14, marginBottom: 18,
              }}>
                Meet Sophia,<br />
                <span style={{
                  background: "linear-gradient(135deg, #F8E08A, #D4A574, #C4925A)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>Your AI Concierge</span>
              </h2>

              <p style={{
                fontFamily: "Inter, sans-serif", fontSize: 15.5,
                color: "rgba(255,255,255,0.58)", lineHeight: 1.80,
                marginBottom: 36, maxWidth: 420,
              }}>
                Sophia is an intelligent emotional AI companion available around the clock. She guides your creative journey, answers every question, and ensures your experience is seamless from first memory to final masterpiece.
              </p>

              {/* Capabilities */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 }}>
                {QUICK_ACTIONS.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: "rgba(139,92,246,0.12)",
                      border: "1px solid rgba(139,92,246,0.24)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, flexShrink: 0,
                    }}>{a.icon}</div>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.68)", fontWeight: 500 }}>
                      {a.label}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setOpen(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: "linear-gradient(135deg, rgba(139,92,246,0.20), rgba(139,92,246,0.08))",
                  border: "1.5px solid rgba(139,92,246,0.50)",
                  color: "#a78bfa",
                  fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14,
                  borderRadius: 999, padding: "13px 28px",
                  cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.25s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.80)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.22)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.50)";
                  (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(139,92,246,0.20), rgba(139,92,246,0.08))";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontSize: 16 }}>✦</span>
                Chat with Sophia
              </button>
            </motion.div>

            {/* Right — chat preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              style={{
                background: "linear-gradient(145deg, rgba(15,20,25,0.98), rgba(10,11,15,0.95))",
                border: "1px solid rgba(139,92,246,0.20)",
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "0 24px 64px rgba(139,92,246,0.12)",
              }}
            >
              {/* Header */}
              <div style={{
                padding: "18px 22px",
                background: "linear-gradient(135deg, rgba(139,92,246,0.16), rgba(139,92,246,0.06))",
                borderBottom: "1px solid rgba(139,92,246,0.15)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff",
                  fontFamily: "'Playfair Display', serif",
                  boxShadow: "0 0 16px rgba(139,92,246,0.50)",
                }}>S</div>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>Sophia</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                    <span style={{ fontSize: 11, color: "#10B981", fontFamily: "Inter, sans-serif" }}>Online · Responds instantly</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14, minHeight: 220 }}>
                <div style={{
                  alignSelf: "flex-start",
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.20)",
                  borderRadius: "4px 18px 18px 18px",
                  padding: "12px 16px", maxWidth: "85%",
                }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.68, margin: 0 }}>
                    Hello! I'm Sophia. I'm here 24/7 to help you create something extraordinary from your memories. What would you like to create today?
                  </p>
                </div>

                <div style={{
                  alignSelf: "flex-end",
                  background: "rgba(212,165,116,0.10)",
                  border: "1px solid rgba(212,165,116,0.22)",
                  borderRadius: "18px 4px 18px 18px",
                  padding: "12px 16px", maxWidth: "80%",
                }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.68, margin: 0 }}>
                    I want to create a song about my late father...
                  </p>
                </div>

                <div style={{
                  alignSelf: "flex-start",
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.20)",
                  borderRadius: "4px 18px 18px 18px",
                  padding: "12px 16px", maxWidth: "90%",
                }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.68, margin: 0 }}>
                    I'm so honored to help with this. Our Personalized Cinematic Songs plan was made exactly for this. Let me guide you through every step — from sharing your memories to hearing his story come alive in music. 🎵
                  </p>
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ padding: "0 18px 18px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {QUICK_ACTIONS.slice(0, 3).map((a, i) => (
                  <div key={i} style={{
                    fontSize: 11.5, fontFamily: "Inter, sans-serif", fontWeight: 600,
                    color: "rgba(139,92,246,0.90)",
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.22)",
                    borderRadius: 999, padding: "5px 12px",
                    cursor: "pointer",
                  }}>
                    {a.icon} {a.label}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Floating chat widget */}
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999 }} className="sophia-float-root">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ duration: 0.3 }}
              style={{
                position: "absolute", bottom: 72, right: 0,
                width: 340, background: "#0F1419",
                border: "1px solid rgba(139,92,246,0.30)",
                borderRadius: 20, overflow: "hidden",
                boxShadow: "0 24px 80px rgba(0,0,0,0.70), 0 0 40px rgba(139,92,246,0.15)",
              }}
            >
              {/* Header */}
              <div style={{
                padding: "14px 16px",
                background: "linear-gradient(135deg, rgba(139,92,246,0.20), rgba(139,92,246,0.08))",
                borderBottom: "1px solid rgba(139,92,246,0.15)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "#fff",
                    fontFamily: "'Playfair Display', serif",
                    boxShadow: "0 0 12px rgba(139,92,246,0.50)",
                  }}>S</div>
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, color: "#fff" }}>Sophia</div>
                    <div style={{ fontSize: 10, color: "#10B981", fontFamily: "Inter, sans-serif" }}>● Online · 24/7</div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.40)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
              </div>

              {/* Messages */}
              <div style={{ padding: "14px 14px", height: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{
                    alignSelf: m.from === "sophia" ? "flex-start" : "flex-end",
                    background: m.from === "sophia" ? "rgba(139,92,246,0.12)" : "rgba(212,165,116,0.10)",
                    border: m.from === "sophia" ? "1px solid rgba(139,92,246,0.20)" : "1px solid rgba(212,165,116,0.22)",
                    borderRadius: m.from === "sophia" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                    padding: "10px 12px", maxWidth: "85%",
                  }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.80)", lineHeight: 1.65, margin: 0 }}>
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick replies */}
              <div style={{ padding: "0 12px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                {QUICK_ACTIONS.map((a, i) => (
                  <button key={i} onClick={() => handleQuick(a.label)} style={{
                    fontSize: 10.5, fontFamily: "Inter, sans-serif", fontWeight: 600,
                    color: "rgba(139,92,246,0.90)",
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.22)",
                    borderRadius: 999, padding: "4px 10px",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.18)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.08)"}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{
                padding: "10px 12px 14px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex", gap: 8,
              }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="Ask Sophia anything..."
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 10, padding: "8px 12px",
                    color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 12,
                    outline: "none",
                  }}
                />
                <button onClick={handleSend} style={{
                  background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                  border: "none", borderRadius: 10, padding: "8px 14px",
                  color: "#fff", fontSize: 14, cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                >→</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trigger button */}
        {/* "Ask Sophia" pill label — visible on mobile, hidden on desktop */}
        {!open && (
          <div className="sophia-label-pill" style={{
            position: "absolute", bottom: 14, right: 68,
            background: "linear-gradient(135deg, rgba(139,92,246,0.92), rgba(109,40,217,0.92))",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(139,92,246,0.50)",
            borderRadius: 999,
            padding: "6px 14px",
            fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12,
            color: "#fff", letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 16px rgba(139,92,246,0.35)",
            pointerEvents: "none",
          }}>
            Ask Sophia
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(o => !o)}
          style={{
            width: 58, height: 58, borderRadius: "50%",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            border: "2px solid rgba(139,92,246,0.50)",
            boxShadow: "0 8px 32px rgba(139,92,246,0.45), 0 0 0 0 rgba(139,92,246,0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 22,
            animation: "sophiaPulse 3s ease-in-out infinite",
          }}
          title="Chat with Sophia"
        >
          {open ? "×" : "✦"}
        </motion.button>
      </div>

      <style>{`
        @keyframes sophiaPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(139,92,246,0.45), 0 0 0 0 rgba(139,92,246,0.4); }
          50% { box-shadow: 0 8px 32px rgba(139,92,246,0.65), 0 0 0 14px rgba(139,92,246,0); }
        }
        @media (max-width: 900px) { .sophia-grid { grid-template-columns: 1fr !important; } }
        /* Show "Ask Sophia" label on mobile, hide on desktop */
        .sophia-label-pill { display: none !important; }
        @media (max-width: 768px) { .sophia-label-pill { display: block !important; } }
      `}</style>
    </>
  );
}
