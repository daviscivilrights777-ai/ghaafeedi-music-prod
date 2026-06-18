/**
 * /splash-preview — Isolated preview of SplashLandingPage.
 * Shows all 6 sections. After clicking "Enter Ghaafeedi Music"
 * shows a simple done screen with a link back to replay or go home.
 * Never touches localStorage. Never auto-navigates anywhere.
 */
import { useState } from "react";
import { SplashLandingPage } from "../components/SplashLandingPage";

export default function SplashPreview() {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#050B1A",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, sans-serif", color: "#fff", gap: 24,
      }}>
        <img
          src="/assets/ghaafeedi-logo-dark.png"
          alt="Ghaafeedi Music"
          style={{ width: 280, opacity: 0.9 }}
        />
        <p style={{ color: "rgba(212,175,55,0.80)", fontFamily: "'Playfair Display',serif", fontSize: 18, margin: 0 }}>
          Splash preview complete.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => setDone(false)}
            style={{
              padding: "12px 28px", borderRadius: 10, border: "1.5px solid rgba(212,175,55,0.45)",
              background: "rgba(212,175,55,0.08)", color: "#F4D06F", cursor: "pointer",
              fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 500,
            }}
          >
            ↺ Replay Splash
          </button>
          <a
            href="/"
            style={{
              padding: "12px 28px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#D4AF37,#96760A)", color: "#050B1A",
              cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700,
              textDecoration: "none", display: "inline-flex", alignItems: "center",
            }}
          >
            Go to Homepage →
          </a>
        </div>
      </div>
    );
  }

  return <SplashLandingPage onComplete={() => setDone(true)} />;
}
