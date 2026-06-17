import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVITY_FEED = [
  { city: "Atlanta, GA",     product: "Cinematic Song · Creator",   name: "Marcus T.",  ago: "2m ago",  color: "#8B5CF6" },
  { city: "London, UK",      product: "5-Min Film · Elite",         name: "Sophia R.",  ago: "4m ago",  color: "#D4A574" },
  { city: "Lagos, Nigeria",  product: "Memorial Legacy Film",       name: "James O.",   ago: "6m ago",  color: "#06B6D4" },
  { city: "Dubai, UAE",      product: "Cinematic Song · Pro",       name: "Aaliyah K.", ago: "9m ago",  color: "#10B981" },
  { city: "Toronto, Canada", product: "2-Min Film · Premium",       name: "David M.",   ago: "11m ago", color: "#F59E0B" },
  { city: "New York, NY",    product: "10-Min Masterpiece · Elite", name: "Jordan L.",  ago: "15m ago", color: "#EC4899" },
  { city: "Sydney, AU",      product: "Cinematic Song · Essential", name: "Emily W.",   ago: "18m ago", color: "#8B5CF6" },
  { city: "Paris, France",   product: "5-Min Film · Premium",       name: "Isabelle M.",ago: "22m ago", color: "#D4A574" },
  { city: "Chicago, IL",     product: "Memorial Legacy Film",       name: "Darius C.",  ago: "27m ago", color: "#06B6D4" },
  { city: "Miami, FL",       product: "Cinematic Song · Creator",   name: "Valentina R.",ago:"31m ago",  color: "#10B981" },
];

// Random delay between 8–18s between toasts
function randDelay() { return 8000 + Math.random() * 10000; }

export function SocialProofToast() {
  const [current, setCurrent] = useState<(typeof ACTIVITY_FEED)[0] | null>(null);
  const [shown, setShown]   = useState(false);
  const idxRef  = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotate through entries
  function showNext() {
    const entry = ACTIVITY_FEED[idxRef.current % ACTIVITY_FEED.length];
    idxRef.current++;
    setCurrent(entry);
    setShown(true);

    // Auto-hide after 5s
    setTimeout(() => setShown(false), 5000);

    // Schedule next
    timerRef.current = setTimeout(showNext, randDelay());
  }

  useEffect(() => {
    // First toast after 6s
    timerRef.current = setTimeout(showNext, 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <AnimatePresence>
      {shown && current && (
        <motion.div
          key={idxRef.current}
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0,    opacity: 1 }}
          exit={{   x: -320, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: "fixed",
            bottom: 96, left: 24,   // sits above sticky bar
            zIndex: 8900,
            maxWidth: 310,
            background: "rgba(5, 7, 13, 0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(212,175,55,0.22)",
            borderRadius: 14,
            padding: "13px 16px",
            display: "flex", alignItems: "flex-start", gap: 13,
            boxShadow: "0 8px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(212,175,55,0.06)",
            cursor: "pointer",
          }}
          onClick={() => setShown(false)}
        >
          {/* Avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${current.color}70, ${current.color}30)`,
            border: `2px solid ${current.color}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display', serif",
            fontSize: 15, fontWeight: 700,
            color: current.color,
          }}>
            {current.name[0]}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 3,
            }}>
              {/* Verified icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill={current.color}>
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                <path d="M9 12l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{
                fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700,
                color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {current.name}
              </span>
              <span style={{
                fontFamily: "Inter, sans-serif", fontSize: 11,
                color: "rgba(255,255,255,0.36)", marginLeft: "auto", whiteSpace: "nowrap",
              }}>
                {current.ago}
              </span>
            </div>

            <div style={{
              fontFamily: "Inter, sans-serif", fontSize: 11.5,
              color: "rgba(255,255,255,0.55)", lineHeight: 1.45,
            }}>
              Just ordered{" "}
              <span style={{ color: current.color, fontWeight: 600 }}>{current.product}</span>
              <br />
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>📍 {current.city}</span>
            </div>
          </div>

          {/* Progress bar */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 5, ease: "linear" }}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: 2, borderRadius: "0 0 14px 14px",
              background: `linear-gradient(to right, ${current.color}, ${current.color}60)`,
              transformOrigin: "left",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
