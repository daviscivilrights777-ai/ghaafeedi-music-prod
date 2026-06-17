import { motion, AnimatePresence } from "framer-motion";

const GOLD = "#D4AF37";
const BG = "#050B1A";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export function AuthGateModal({ open, onClose, redirectTo = "/onboarding" }: AuthGateModalProps) {
  const encodedRedirect = encodeURIComponent(redirectTo);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onClick={e => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, #0D0F1E 0%, #0A0C18 100%)",
              border: "1px solid rgba(212,175,55,0.22)",
              borderRadius: 20, padding: "40px 36px",
              maxWidth: 420, width: "100%",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08)",
              textAlign: "center",
            }}
          >
            {/* Icon */}
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(212,175,55,0.1)",
              border: "1.5px solid rgba(212,175,55,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z"
                  stroke={GOLD} strokeWidth="1.8" fill="none"/>
                <path d="M9 12l2 2 4-4" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Heading */}
            <h2 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 24,
              color: "#FFFFFF", fontWeight: 700, marginBottom: 10, lineHeight: 1.3,
            }}>
              Create Your Account to Continue
            </h2>
            <p style={{
              fontFamily: "Inter, sans-serif", fontSize: 14,
              color: "rgba(255,255,255,0.55)", marginBottom: 28, lineHeight: 1.6,
            }}>
              Your story deserves to be preserved. Sign up in seconds to start your cinematic journey.
            </p>

            {/* CTA buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <a href={`/signup?redirect=${encodedRedirect}`} style={{
                display: "block", padding: "14px 24px",
                background: "linear-gradient(135deg, #FFF9E6 0%, #F1D37A 30%, #C9962E 100%)",
                color: "#01040B", fontFamily: "Inter, sans-serif",
                fontWeight: 700, fontSize: 15, borderRadius: 12,
                textDecoration: "none", transition: "all 0.2s",
              }}>
                Create Free Account
              </a>
              <a href={`/signin?redirect=${encodedRedirect}`} style={{
                display: "block", padding: "13px 24px",
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.25)",
                color: GOLD, fontFamily: "Inter, sans-serif",
                fontWeight: 600, fontSize: 15, borderRadius: 12,
                textDecoration: "none", transition: "all 0.2s",
              }}>
                Sign In to Existing Account
              </a>
            </div>

            {/* Close */}
            <button onClick={onClose} style={{
              marginTop: 18, background: "none", border: "none",
              color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif",
              fontSize: 13, cursor: "pointer",
            }}>
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
