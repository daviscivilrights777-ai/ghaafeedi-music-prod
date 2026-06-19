/**
 * GHAAFEEDI MUSIC — Homepage
 * ══════════════════════════════════════════════════════════════════
 * Entry flow (every visit):
 *   1. SophiaEntryFlow — Sophia AI guides customer through 5-act
 *      conversion flow with live lip sync (Simli + ElevenLabs)
 *   2. onComplete(path) → "onboarding" | "products" | "home"
 *
 * Old EntryGate + SplashLandingPage replaced. Archived, not deleted.
 */
import { useState, Suspense, lazy } from "react";
import { SophiaEntryFlow } from "../components/SophiaEntryFlow";
import { useLocation } from "wouter";

// Lazy-load everything below the fold
const Navbar              = lazy(() => import("../components/Navbar").then(m => ({ default: m.Navbar })));
const HeroSection         = lazy(() => import("../components/HeroSection").then(m => ({ default: m.HeroSection })));
const HowItWorks          = lazy(() => import("../components/HowItWorks").then(m => ({ default: m.HowItWorks })));
const ProductCards        = lazy(() => import("../components/ProductCards").then(m => ({ default: m.ProductCards })));
const TrustFeatures       = lazy(() => import("../components/TrustFeatures").then(m => ({ default: m.TrustFeatures })));
const SocialProof         = lazy(() => import("../components/SocialProof").then(m => ({ default: m.SocialProof })));
const SophiaConcierge     = lazy(() => import("../components/SophiaConcierge").then(m => ({ default: m.SophiaConcierge })));
const StorytellingShowcase = lazy(() => import("../components/StorytellingShowcase").then(m => ({ default: m.StorytellingShowcase })));
const FinalCTA            = lazy(() => import("../components/FinalCTA").then(m => ({ default: m.FinalCTA })));
const Footer              = lazy(() => import("../components/Footer").then(m => ({ default: m.Footer })));
const StickyCtaBar        = lazy(() => import("../components/StickyCtaBar").then(m => ({ default: m.StickyCtaBar })));
const SocialProofToast    = lazy(() => import("../components/SocialProofToast").then(m => ({ default: m.SocialProofToast })));

type Stage = "sophia" | "home";

export default function Index() {
  const [stage, setStage] = useState<Stage>("sophia");
  const [, setLocation] = useLocation();

  const handleComplete = (path: "onboarding" | "products" | "home") => {
    if (path === "onboarding") {
      setStage("home"); // render homepage first so BG is ready
      setTimeout(() => setLocation("/onboarding"), 80);
      return;
    }
    if (path === "products") {
      setStage("home");
      setTimeout(() => setLocation("/products"), 80);
      return;
    }
    setStage("home");
  };

  return (
    <>
      {/* ── Sophia Entry Flow ── */}
      {stage === "sophia" && (
        <SophiaEntryFlow onComplete={handleComplete} />
      )}

      {/* ── Homepage (rendered once Sophia completes) ── */}
      {stage === "home" && (
        <div style={{ background: "#0A0B0F", minHeight: "100vh", overflowX: "hidden" }}>
          <Suspense fallback={<div style={{ background: "#0A0B0F", minHeight: "100vh" }} />}>
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
          </Suspense>
        </div>
      )}
    </>
  );
}
