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
import { useState, Suspense, lazy } from "react";
import { EntryGate }   from "../components/EntryGate";
import { Navbar }      from "../components/Navbar";
import { HeroSection } from "../components/HeroSection";

// Lazy-load everything below the fold
const SplashLandingPage  = lazy(() => import("../components/SplashLandingPage").then(m => ({ default: m.SplashLandingPage })));
const HowItWorks         = lazy(() => import("../components/HowItWorks").then(m => ({ default: m.HowItWorks })));
const ProductCards       = lazy(() => import("../components/ProductCards").then(m => ({ default: m.ProductCards })));
const TrustFeatures      = lazy(() => import("../components/TrustFeatures").then(m => ({ default: m.TrustFeatures })));
const SocialProof        = lazy(() => import("../components/SocialProof").then(m => ({ default: m.SocialProof })));
const SophiaConcierge    = lazy(() => import("../components/SophiaConcierge").then(m => ({ default: m.SophiaConcierge })));
const StorytellingShowcase = lazy(() => import("../components/StorytellingShowcase").then(m => ({ default: m.StorytellingShowcase })));
const FinalCTA           = lazy(() => import("../components/FinalCTA").then(m => ({ default: m.FinalCTA })));
const Footer             = lazy(() => import("../components/Footer").then(m => ({ default: m.Footer })));
const StickyCtaBar       = lazy(() => import("../components/StickyCtaBar").then(m => ({ default: m.StickyCtaBar })));
const SocialProofToast   = lazy(() => import("../components/SocialProofToast").then(m => ({ default: m.SocialProofToast })));

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
        <Suspense fallback={<div style={{ background: "#050B1A", minHeight: "100vh" }} />}>
          <SplashLandingPage onComplete={() => setStage("home")} />
        </Suspense>
      )}

      {/* ── Stage 2b / 3: Homepage (only rendered when stage === "home") ── */}
      {stage === "home" && (
        <div style={{ background: "#0A0B0F", minHeight: "100vh", overflowX: "hidden" }}>
          <Navbar />
          <HeroSection />
          <Suspense fallback={null}>
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
          </Suspense>
        </div>
      )}
    </>
  );
}
