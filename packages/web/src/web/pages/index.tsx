/**
 * GHAAFEEDI MUSIC — Homepage
 * ══════════════════════════════════════════════════════════════════
 * Entry flow (every visit):
 *   1. EntryGate  — "Watch Our Story" OR "Go to Homepage"
 *   2a. SplashLandingPage (all 6 sections) → then homepage
 *   2b. Homepage directly
 *
 * No localStorage. No one-time gate. Customer chooses every time.
 */
import { useState } from "react";
import { EntryGate }         from "../components/EntryGate";
import { SplashLandingPage } from "../components/SplashLandingPage";
import { Navbar }            from "../components/Navbar";
import { HeroSection }       from "../components/HeroSection";
import { HowItWorks }        from "../components/HowItWorks";
import { ProductCards }      from "../components/ProductCards";
import { TrustFeatures }     from "../components/TrustFeatures";
import { SocialProof }       from "../components/SocialProof";
import { SophiaConcierge }   from "../components/SophiaConcierge";
import { StorytellingShowcase } from "../components/StorytellingShowcase";
import { FinalCTA }          from "../components/FinalCTA";
import { Footer }            from "../components/Footer";
import { StickyCtaBar }      from "../components/StickyCtaBar";
import { SocialProofToast }  from "../components/SocialProofToast";

type Stage = "gate" | "splash" | "home";

export default function Index() {
  const [stage, setStage] = useState<Stage>("gate");

  return (
    <>
      {/* ── Stage 1: Choice gate (always shown first) ── */}
      {stage === "gate" && (
        <EntryGate
          onWatchStory={() => setStage("splash")}
          onGoHome={()     => setStage("home")}
        />
      )}

      {/* ── Stage 2a: Full splash (6 sections) → then homepage ── */}
      {stage === "splash" && (
        <SplashLandingPage onComplete={() => setStage("home")} />
      )}

      {/* ── Stage 2b / 3: Homepage (only rendered when stage === "home") ── */}
      {stage === "home" && (
        <div style={{ background: "#0A0B0F", minHeight: "100vh", overflowX: "hidden" }}>
          <Navbar />
          <HeroSection />
          <HowItWorks />
          <ProductCards />
          <TrustFeatures />
          <SocialProof />
          <SophiaConcierge />
          <StorytellingShowcase />
          <FinalCTA />
          <Footer />
          <StickyCtaBar />
          <SocialProofToast />
        </div>
      )}
    </>
  );
}
