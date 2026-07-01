// ============================================================
// Ghaafeedi Music — Get Started Interstitial
// "Existing customer? Sign In" vs "New? Create Account"
// ============================================================
import { GhaafeediLogo } from "../components/GhaafeediLogo";
import { motion } from "framer-motion";
import { Link, useSearch } from "wouter";

const GOLD = "#D4AF37";
const GOLD2 = "#F0D060";
const BG = "#050B1A";

export default function GetStarted() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const redirectTo = params.get("redirect");
  const qs = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : "";

  return (
    <div style={{
      minHeight: "100vh", background: BG,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 20px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 40%, rgba(11,23,54,0.95) 0%, ${BG} 70%)` }} />
      <div style={{ position: "absolute", top: "12%", left: "12%", width: 460, height: 460, borderRadius: "50%", background: "rgba(212,175,55,0.05)", filter: "blur(110px)" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 340, height: 340, borderRadius: "50%", background: "rgba(11,23,54,0.6)", filter: "blur(90px)" }} />

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "20px 40px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          <GhaafeediLogo variant="navbar" />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 720, textAlign: "center" }}
      >
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
          background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)",
          borderRadius: 20, padding: "5px 16px",
        }}>
          <span style={{ fontSize: 11, color: GOLD, fontFamily: "Inter, sans-serif", fontWeight: 700, letterSpacing: "0.1em" }}>✦ GHAAFEEDI MUSIC</span>
        </div>

        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(30px, 5vw, 42px)", fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>
          Let's Get You Where You're Going
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", fontFamily: "Inter, sans-serif", margin: "0 0 48px" }}>
          Tell us who you are, and we'll take you straight there.
        </p>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {/* Existing customer */}
          <Link href={`/signin${qs}`} style={{ textDecoration: "none", flex: "1 1 280px", maxWidth: 320 }}>
            <motion.div whileHover={{ y: -4, boxShadow: "0 20px 50px rgba(212,175,55,0.15)" }}
              style={{
                background: "rgba(11,23,54,0.55)", border: "1px solid rgba(212,175,55,0.22)",
                borderRadius: 20, padding: "40px 28px", cursor: "pointer", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
              }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
              }}>🔑</div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: GOLD, margin: 0 }}>I'm a Member</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif", margin: 0, lineHeight: 1.6 }}>
                Sign in with your existing account to continue your story.
              </p>
              <span style={{
                marginTop: 8, padding: "10px 26px", borderRadius: 999,
                border: `1.5px solid rgba(212,175,55,0.5)`, color: GOLD,
                fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
              }}>Sign In →</span>
            </motion.div>
          </Link>

          {/* New customer */}
          <Link href={`/create-account${qs}`} style={{ textDecoration: "none", flex: "1 1 280px", maxWidth: 320 }}>
            <motion.div whileHover={{ y: -4, boxShadow: "0 20px 50px rgba(212,175,55,0.3)" }}
              style={{
                background: `linear-gradient(160deg, rgba(212,175,55,0.14) 0%, rgba(11,23,54,0.7) 100%)`,
                border: "1px solid rgba(212,175,55,0.4)",
                borderRadius: 20, padding: "40px 28px", cursor: "pointer", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
              }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
              }}>✦</div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>I'm New Here</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", margin: 0, lineHeight: 1.6 }}>
                Create your account and receive your own Member ID instantly.
              </p>
              <span style={{
                marginTop: 8, padding: "11px 26px", borderRadius: 999,
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`, color: BG,
                fontSize: 13, fontWeight: 700, fontFamily: "Inter, sans-serif",
                boxShadow: "0 4px 20px rgba(212,175,55,0.4)",
              }}>Create Account →</span>
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
