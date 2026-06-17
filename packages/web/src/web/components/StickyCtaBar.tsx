import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function StickyCtaBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem("gm_sticky_dismissed")) {
      setDismissed(true);
      return;
    }

    const onScroll = () => {
      const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setVisible(scrollPct > 0.18);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function dismiss() {
    sessionStorage.setItem("gm_sticky_dismissed", "1");
    setDismissed(true);
  }

  const show = visible && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="sticky-cta"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
          style={{
            position: "fixed",
            bottom: 0, left: 0, right: 0,
            zIndex: 9000,
            background: "rgba(5, 7, 13, 0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(212,175,55,0.28)",
            boxShadow: "0 -8px 48px rgba(0,0,0,0.72), 0 -1px 0 rgba(212,175,55,0.08)",
          }}
        >
          <div style={{
            maxWidth: 1440, margin: "0 auto",
            padding: "14px 40px",
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            gap: 20, flexWrap: "wrap",
          }} className="sticky-cta-inner">

            {/* Left: urgency copy */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }} className="sticky-cta-left">
              {/* Pulse dot */}
              <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
                <div style={{
                  position: "absolute", inset: 0,
                  borderRadius: "50%",
                  background: "#D4AF37",
                  animation: "stickyPulseRing 1.8s ease-out infinite",
                }} />
                <div style={{
                  position: "absolute", inset: "2px",
                  borderRadius: "50%",
                  background: "#D4AF37",
                }} />
              </div>
              <div>
                <span style={{
                  fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14,
                  color: "#fff", letterSpacing: "0.01em",
                }}>
                  Your story deserves to live forever.
                </span>
                <span style={{
                  fontFamily: "Inter, sans-serif", fontSize: 12.5,
                  color: "rgba(255,255,255,0.46)", marginLeft: 10,
                }}>
                  Songs from $19 · Films from $79
                </span>
              </div>
            </div>

            {/* Center: social micro-proof */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(212,175,55,0.07)",
                border: "1px solid rgba(212,175,55,0.16)",
                borderRadius: 999, padding: "6px 14px",
              }}
              className="sticky-cta-proof"
            >
              {/* Avatars */}
              <div style={{ display: "flex", marginRight: 2 }}>
                {["#8B5CF6","#D4A574","#06B6D4","#10B981"].map((c, i) => (
                  <div key={i} style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${c}80, ${c}40)`,
                    border: "1.5px solid rgba(5,7,13,0.9)",
                    marginLeft: i > 0 ? -8 : 0,
                    flexShrink: 0,
                  }} />
                ))}
              </div>
              <span style={{
                fontFamily: "Inter, sans-serif", fontSize: 12,
                color: "rgba(255,255,255,0.60)", whiteSpace: "nowrap",
              }}>
                <span style={{ color: "#D4AF37", fontWeight: 700 }}>14,200+</span> creations delivered
              </span>
            </div>

            {/* Right: CTAs */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <a
                href="/onboarding"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #FFE8A3 0%, #D4AF37 55%, #9A6F1F 100%)",
                  color: "#0A0B0F",
                  fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5,
                  borderRadius: 999, padding: "10px 24px",
                  textDecoration: "none",
                  boxShadow: "0 4px 24px rgba(212,175,55,0.52)",
                  letterSpacing: "0.02em",
                  transition: "all 0.22s",
                  animation: "stickyCtaGlow 3s ease-in-out infinite",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 36px rgba(212,175,55,0.72)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(212,175,55,0.52)";
                }}
              >
                ✦ Start Your Story
              </a>

              <a
                href="/products"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "rgba(255,255,255,0.72)",
                  fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13,
                  borderRadius: 999, padding: "9px 18px",
                  textDecoration: "none", transition: "all 0.22s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.40)";
                  (e.currentTarget as HTMLElement).style.color = "#D4AF37";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.72)";
                }}
              >
                View Products
              </a>

              {/* Dismiss */}
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.38)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0, transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.30)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.38)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                }}
              >×</button>
            </div>
          </div>

          <style>{`
            @keyframes stickyPulseRing {
              0%   { transform: scale(1); opacity: 0.85; }
              70%  { transform: scale(2.6); opacity: 0; }
              100% { transform: scale(2.6); opacity: 0; }
            }
            @keyframes stickyCtaGlow {
              0%,100% { box-shadow: 0 4px 24px rgba(212,175,55,0.52); }
              50%      { box-shadow: 0 4px 36px rgba(212,175,55,0.78), 0 0 0 3px rgba(212,175,55,0.18); }
            }
            @media (max-width: 760px) {
              .sticky-cta-proof { display: none !important; }
              .sticky-cta-inner {
                padding: 12px 18px !important;
                justify-content: space-between !important;
                gap: 10px !important;
              }
              .sticky-cta-left span:last-child { display: none !important; }
            }
            @media (max-width: 480px) {
              .sticky-cta-left > div > span:first-child { font-size: 12.5px !important; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
