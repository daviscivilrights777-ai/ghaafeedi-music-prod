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
import { useState, useEffect, Suspense, lazy } from "react";
import { SophiaEntryFlow } from "../components/SophiaEntryFlow";
import { useLocation } from "wouter";
import { authClient } from "../lib/authClient";

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

type Stage = "checking" | "sophia" | "home";

export default function Index() {
  // Start as "checking" — determine if user is already logged in before showing Sophia
  const [stage, setStage] = useState<Stage>("checking");
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return; // still loading auth state
    if (session?.user) {
      // Logged-in user — skip Sophia, go straight to homepage
      // Use replaceState so the homepage doesn't stack behind dashboard in history
      window.history.replaceState(null, "", "/");
      setStage("home");
    } else {
      setStage("sophia");
    }
  }, [session, isPending]);

  const handleComplete = (path: "onboarding" | "products" | "home") => {
    if (path === "onboarding") {
      setStage("home");
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

  // Brief blank while checking auth
  if (stage === "checking") {
    return <div style={{ background: "#050B1A", minHeight: "100vh" }} />;
  }

  return (
    <>
      {/* ── Sophia Entry Flow (new visitors only) ── */}
      {stage === "sophia" && (
        <SophiaEntryFlow onComplete={handleComplete} />
      )}

      {/* ── Homepage ── */}
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
