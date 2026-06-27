import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";

const FADE_UP = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as any } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.09 } } };

const FAQ_ITEMS = [
  {
    q: "How does the AI songwriting process work?",
    a: "You share your story through our 12-step emotional onboarding. Our AI analyzes the emotional arc, extracts key themes, writes lyrics, composes music, and generates a fully produced song — typically within 24–48 hours. A human review ensures quality before delivery.",
  },
  {
    q: "Can I use my Ghaafeedi song commercially?",
    a: "Yes. All productions delivered through our platform come with a perpetual, worldwide commercial license. You can stream, distribute, sell, and license your song without additional royalties to us.",
  },
  {
    q: "What is the Voice Cloning Studio?",
    a: "Voice Cloning Studio creates a synthetic model of your voice from audio samples you provide. Once created, your AI song can be sung in your own voice. Explicit consent is required, and you can revoke and delete your voice model at any time.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Go to Account Settings → Billing → Cancel Subscription. Your access continues until the end of the current billing period. No cancellation fee applies.",
  },
  {
    q: "What file formats will I receive my production in?",
    a: "Songs are delivered as high-quality MP3 (320kbps) and WAV (24-bit). Videos are delivered as MP4 (H.264, up to 4K). Legacy packages include a ZIP archive with all assets and formats.",
  },
  {
    q: "How long does production take?",
    a: "Standard productions: 24–48 hours. Cinematic films: 3–5 business days. Legacy Vaults: 5–7 business days. Elite tier productions receive priority queue access.",
  },
  {
    q: "Is my story kept private?",
    a: "Absolutely. All content is private by default. We never publish, share, or display your productions without your explicit opt-in. See our Privacy Policy for complete details.",
  },
  {
    q: "Can I request revisions?",
    a: "Yes. Every production includes at least one complimentary revision. Premium and Elite tier memberships include unlimited revisions. Revisions are processed within 24–48 hours.",
  },
];

type SophiaMsg = { role: "sophia" | "user"; text: string };

const SOPHIA_GREETINGS: SophiaMsg = {
  role: "sophia",
  text: "Hello! I'm Sophia, your AI Emotional Concierge at Ghaafeedi Music. I'm here 24/7 to help you with products, orders, account questions, and anything else you need. What can I help you with today?",
};

const SOPHIA_RESPONSES: Record<string, string> = {
  default: "I'd love to help with that! For the most accurate answer, could you give me a bit more detail? Alternatively, I can connect you with a human support specialist — just say 'Talk to a person' and I'll escalate right away.",
  refund: "Our refund policy allows full refunds within 48 hours of subscription purchase if no production has been started. For productions already in progress, we evaluate on a case-by-case basis. Would you like me to initiate a refund request for you?",
  cancel: "To cancel your subscription: go to Account Settings → Billing → Cancel Subscription. Your access continues until the end of your paid period. Would you like me to walk you through it?",
  order: "I can help track your order! Could you share your order ID or the email address on your account? I'll pull up the production status right away.",
  price: "Our memberships start at $19/month for the Essential tier (2 songs/month), $39/month for Creator (5 songs), and $79/month for Professional (12 songs). We also offer one-time productions and video packages. Want the full breakdown?",
  human: "Absolutely — I'll escalate this to a human specialist. You'll receive a response within 2 business hours. For urgent issues, email us directly at support@ghaafeedimusic.com.",
  voice: "Voice Cloning Studio lets you produce songs sung in your own voice. You'll provide 3–5 minutes of clean audio, our AI builds your voice model, and future productions can use it. You own full consent rights and can delete the model anytime.",
};

function getSophiaResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("refund")) return SOPHIA_RESPONSES.refund ?? "";
  if (lower.includes("cancel")) return SOPHIA_RESPONSES.cancel ?? "";
  if (lower.includes("order") || lower.includes("track")) return SOPHIA_RESPONSES.order ?? "";
  if (lower.includes("price") || lower.includes("cost") || lower.includes("plan") || lower.includes("subscription")) return SOPHIA_RESPONSES.price ?? "";
  if (lower.includes("human") || lower.includes("person") || lower.includes("agent") || lower.includes("escalate")) return SOPHIA_RESPONSES.human ?? "";
  if (lower.includes("voice") || lower.includes("clone")) return SOPHIA_RESPONSES.voice ?? "";
  return SOPHIA_RESPONSES.default ?? "";
}

function SophiaChat() {
  const [messages, setMessages] = useState<SophiaMsg[]>([SOPHIA_GREETINGS]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg: SophiaMsg = { role: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const reply: SophiaMsg = { role: "sophia", text: getSophiaResponse(trimmed) };
      setMessages(prev => [...prev, reply]);
      setTyping(false);
    }, 1200 + Math.random() * 600);
  };

  const QUICK = ["Track my order", "Refund request", "Cancel subscription", "Voice Cloning info", "Talk to a person"];

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(212,165,116,0.2)",
      borderRadius: 22, overflow: "hidden",
      display: "flex", flexDirection: "column",
      height: 580,
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(212,165,116,0.12), rgba(139,92,246,0.08))",
        borderBottom: "1px solid rgba(212,165,116,0.15)",
        padding: "18px 22px",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "linear-gradient(135deg, #F8E08A, #D4A574)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 800, color: "#0A0B0F",
          fontFamily: "'Playfair Display', serif",
          boxShadow: "0 0 16px rgba(212,165,116,0.4)",
          flexShrink: 0,
        }}>S</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", fontFamily: "Inter, sans-serif" }}>Sophia AI Concierge</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E" }} />
            <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif" }}>Online · 24/7 Support</span>
          </div>
        </div>
        <div style={{
          fontSize: 10, fontFamily: "Inter, sans-serif",
          color: "#D4A574", letterSpacing: "0.12em", textTransform: "uppercase",
          background: "rgba(212,165,116,0.1)", border: "1px solid rgba(212,165,116,0.2)",
          borderRadius: 999, padding: "4px 12px",
        }}>AI</div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "20px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            {msg.role === "sophia" && (
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg, #F8E08A, #D4A574)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 900, color: "#0A0B0F",
                fontFamily: "'Playfair Display', serif",
                flexShrink: 0, marginRight: 10, marginTop: 2,
              }}>S</div>
            )}
            <div style={{
              maxWidth: "75%",
              background: msg.role === "sophia"
                ? "rgba(212,165,116,0.07)"
                : "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(212,165,116,0.15))",
              border: msg.role === "sophia"
                ? "1px solid rgba(212,165,116,0.15)"
                : "1px solid rgba(139,92,246,0.3)",
              borderRadius: msg.role === "sophia" ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
              padding: "11px 15px",
            }}>
              <p style={{
                fontSize: 13.5, color: "rgba(255,255,255,0.82)",
                fontFamily: "Inter, sans-serif", lineHeight: 1.68, margin: 0,
              }}>{msg.text}</p>
            </div>
          </div>
        ))}

        {typing && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg, #F8E08A, #D4A574)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 900, color: "#0A0B0F",
              fontFamily: "'Playfair Display', serif", flexShrink: 0,
            }}>S</div>
            <div style={{
              background: "rgba(212,165,116,0.07)",
              border: "1px solid rgba(212,165,116,0.15)",
              borderRadius: "4px 18px 18px 18px",
              padding: "12px 18px",
              display: "flex", gap: 5,
            }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#D4A574",
                  animation: `dot-bounce 1.2s ${j * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div style={{
        padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", gap: 8, flexWrap: "wrap",
      }}>
        {QUICK.map((q, i) => (
          <button key={i} onClick={() => {
            setMessages(prev => [...prev, { role: "user", text: q }]);
            setTyping(true);
            setTimeout(() => {
              setMessages(prev => [...prev, { role: "sophia", text: getSophiaResponse(q) }]);
              setTyping(false);
            }, 1000);
          }} style={{
            fontSize: 11.5, fontFamily: "Inter, sans-serif", fontWeight: 500,
            color: "#D4A574", background: "rgba(212,165,116,0.07)",
            border: "1px solid rgba(212,165,116,0.2)", borderRadius: 999,
            padding: "5px 12px", cursor: "pointer", transition: "all 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,165,116,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,165,116,0.07)"; }}
          >{q}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(0,0,0,0.2)",
        display: "flex", gap: 10,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask Sophia anything..."
          style={{
            flex: 1, background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "10px 14px",
            fontSize: 13.5, color: "#FFFFFF",
            fontFamily: "Inter, sans-serif", outline: "none",
          }}
        />
        <button onClick={send} style={{
          background: "linear-gradient(135deg, #F8E08A, #D4A574)",
          color: "#0A0B0F", border: "none",
          borderRadius: 10, padding: "10px 18px",
          fontFamily: "Inter, sans-serif", fontWeight: 700,
          fontSize: 13, cursor: "pointer", flexShrink: 0,
        }}>Send</button>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const [formState, setFormState] = useState({ name: "", email: "", subject: "", message: "", type: "general" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.message) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 1800);
  };

  return (
    <div style={{ background: "#0A0B0F", minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      {/* HERO */}
      <section style={{ padding: "120px 40px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700, height: 500,
          background: "radial-gradient(ellipse, rgba(212,165,116,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <motion.div initial="hidden" animate="show" variants={STAGGER} style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <motion.div variants={FADE_UP} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(212,165,116,0.08)", border: "1px solid rgba(212,165,116,0.22)",
            borderRadius: 999, padding: "7px 20px", marginBottom: 28,
          }}>
            <span style={{ color: "#D4A574", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>Support Center</span>
          </motion.div>

          <motion.h1 variants={FADE_UP} style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(38px, 5.5vw, 72px)",
            fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: 22,
          }}>
            We're Here For You,<br />
            <span style={{ color: "#D4A574" }}>Always</span>
          </motion.h1>

          <motion.p variants={FADE_UP} style={{
            fontSize: 16, color: "rgba(255,255,255,0.52)",
            fontFamily: "Inter, sans-serif", lineHeight: 1.78,
            maxWidth: 560, margin: "0 auto",
          }}>
            24/7 AI concierge, human specialists, and a full knowledge base — however you prefer to get help.
          </motion.p>
        </motion.div>
      </section>

      {/* CONTACT OPTIONS */}
      <div style={{ padding: "0 40px 60px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            {[
              { icon: "🤖", label: "AI Concierge", sub: "Sophia • 24/7 • Instant", color: "#D4A574" },
              { icon: "📧", label: "Email Support", sub: "support@ghaafeedimusic.com\n2-hr response", color: "#38BDF8" },
              { icon: "⚖️", label: "Legal Queries", sub: "legal@ghaafeedimusic.com\n24-hr response", color: "#A78BFA" },
              { icon: "🔏", label: "Privacy/Data", sub: "privacy@ghaafeedimusic.com\nSame day", color: "#22C55E" },
            ].map((c, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18, padding: "24px 22px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.color, fontFamily: "Inter, sans-serif", marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", fontFamily: "Inter, sans-serif", lineHeight: 1.6, whiteSpace: "pre-line" }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: Sophia + Form */}
      <div style={{ padding: "0 40px 80px" }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 40,
        }} className="contact-main-grid">

          {/* SOPHIA */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div style={{
              fontSize: 10, color: "#D4A574", fontFamily: "Inter, sans-serif",
              fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 18,
            }}>Sophia AI Concierge</div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 30, fontWeight: 800, color: "#FFFFFF", marginBottom: 8,
            }}>Instant AI Assistance</h2>
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.45)",
              fontFamily: "Inter, sans-serif", lineHeight: 1.68, marginBottom: 24,
            }}>
              Sophia handles product questions, order tracking, and account assistance. She escalates complex issues to human specialists.
            </p>
            <SophiaChat />
          </motion.div>

          {/* CONTACT FORM */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.12 }}>
            <div style={{
              fontSize: 10, color: "#D4A574", fontFamily: "Inter, sans-serif",
              fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 18,
            }}>Human Support</div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 30, fontWeight: 800, color: "#FFFFFF", marginBottom: 8,
            }}>Send Us a Message</h2>
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.45)",
              fontFamily: "Inter, sans-serif", lineHeight: 1.68, marginBottom: 24,
            }}>
              For complex requests, escalations, or issues that need human judgment. We respond within 2 business hours.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  borderRadius: 20, padding: "48px 36px",
                  textAlign: "center", height: 480,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 16,
                }}
              >
                <div style={{ fontSize: 52 }}>✅</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: "#FFFFFF", fontWeight: 800 }}>Message Sent</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif", lineHeight: 1.68 }}>
                  We've received your message and will respond within 2 business hours. Check your email for a confirmation.
                </p>
                <button onClick={() => { setSubmitted(false); setFormState({ name: "", email: "", subject: "", message: "", type: "general" }); }} style={{
                  marginTop: 8, background: "transparent", color: "#D4A574",
                  border: "1px solid rgba(212,165,116,0.3)", borderRadius: 10,
                  padding: "11px 28px", fontFamily: "Inter, sans-serif",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>Send Another</button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Request type */}
                <div>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif", fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Request Type</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["general", "billing", "technical", "legal", "escalation"].map(t => (
                      <button key={t} type="button" onClick={() => setFormState(s => ({ ...s, type: t }))} style={{
                        fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600,
                        padding: "7px 16px", borderRadius: 999,
                        border: formState.type === t ? "1px solid #D4A574" : "1px solid rgba(255,255,255,0.1)",
                        background: formState.type === t ? "rgba(212,165,116,0.12)" : "transparent",
                        color: formState.type === t ? "#D4A574" : "rgba(255,255,255,0.45)",
                        cursor: "pointer", textTransform: "capitalize",
                      }}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif", fontWeight: 600, display: "block", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>Full Name *</label>
                    <input required value={formState.name} onChange={e => setFormState(s => ({ ...s, name: e.target.value }))} placeholder="Lawrence Davis" style={{
                      width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, padding: "11px 14px", fontSize: 13.5, color: "#FFFFFF",
                      fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif", fontWeight: 600, display: "block", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>Email *</label>
                    <input required type="email" value={formState.email} onChange={e => setFormState(s => ({ ...s, email: e.target.value }))} placeholder="your@email.com" style={{
                      width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, padding: "11px 14px", fontSize: 13.5, color: "#FFFFFF",
                      fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box",
                    }} />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif", fontWeight: 600, display: "block", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>Subject</label>
                  <input value={formState.subject} onChange={e => setFormState(s => ({ ...s, subject: e.target.value }))} placeholder="Brief description of your request" style={{
                    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, padding: "11px 14px", fontSize: 13.5, color: "#FFFFFF",
                    fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box",
                  }} />
                </div>

                {/* Message */}
                <div>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif", fontWeight: 600, display: "block", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>Message *</label>
                  <textarea required value={formState.message} onChange={e => setFormState(s => ({ ...s, message: e.target.value }))} placeholder="Describe your question or issue in detail..." rows={5} style={{
                    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, padding: "11px 14px", fontSize: 13.5, color: "#FFFFFF",
                    fontFamily: "Inter, sans-serif", outline: "none", resize: "vertical",
                    boxSizing: "border-box",
                  }} />
                </div>

                <button type="submit" disabled={sending} style={{
                  background: sending ? "rgba(212,165,116,0.4)" : "linear-gradient(135deg, #F8E08A, #D4A574)",
                  color: "#0A0B0F", border: "none", borderRadius: 12,
                  padding: "15px 32px", fontSize: 14, fontWeight: 700,
                  fontFamily: "Inter, sans-serif", cursor: sending ? "not-allowed" : "pointer",
                  letterSpacing: "0.05em", transition: "all 0.2s",
                  boxShadow: sending ? "none" : "0 8px 28px rgba(212,165,116,0.28)",
                }}>
                  {sending ? "Sending..." : "Send Message →"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>

      {/* FAQ */}
      <section style={{ padding: "0 40px 100px", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", paddingTop: 80 }}>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
            style={{ textAlign: "center", marginBottom: 52 }}
          >
            <motion.div variants={FADE_UP} style={{
              fontSize: 10, color: "#D4A574", fontFamily: "Inter, sans-serif",
              fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 18,
            }}>Frequently Asked Questions</motion.div>
            <motion.h2 variants={FADE_UP} style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800,
              color: "#FFFFFF", lineHeight: 1.14,
            }}>Quick Answers</motion.h2>
          </motion.div>

          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                marginBottom: 0,
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: "100%", textAlign: "left",
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "22px 0",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20,
                }}
              >
                <span style={{
                  fontSize: 15.5, fontFamily: "Inter, sans-serif",
                  fontWeight: 600, color: openFaq === i ? "#D4A574" : "#FFFFFF",
                  transition: "color 0.2s",
                }}>{item.q}</span>
                <span style={{
                  fontSize: 20, color: "#D4A574", flexShrink: 0,
                  transform: openFaq === i ? "rotate(45deg)" : "rotate(0)",
                  transition: "transform 0.3s",
                  display: "inline-block",
                }}>+</span>
              </button>

              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: "hidden" }}
                  >
                    <p style={{
                      fontSize: 14.5, color: "rgba(255,255,255,0.55)",
                      fontFamily: "Inter, sans-serif", lineHeight: 1.78,
                      paddingBottom: 22,
                    }}>{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.38)", fontFamily: "Inter, sans-serif", marginBottom: 16 }}>
              Can't find what you're looking for?
            </p>
            <Link href="/contact">
              <a style={{
                background: "transparent", color: "#D4A574",
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14,
                padding: "13px 32px", borderRadius: 10,
                border: "1px solid rgba(212,165,116,0.3)",
                cursor: "pointer", textDecoration: "none", display: "inline-block",
              }}>Ask Sophia or Contact Support</a>
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 900px) {
          .contact-main-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes dot-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
