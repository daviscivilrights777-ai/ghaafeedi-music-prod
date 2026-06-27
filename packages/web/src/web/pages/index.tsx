/**
 * GHAAFEEDI MUSIC — Homepage
 * ══════════════════════════════════════════════════════════════════
 * Entry flow (MANDATORY for every visitor — logged-in or not):
 *   1. SophiaIntroVideo — 1:48 cinematic intro video, autoplay muted,
 *      🔊 unmute button, "Enter Ghaafeedi Music →" CTA at 100s.
 *   2. Skip button always visible bottom-right.
 *   3. onComplete() → stage "home"
 *
 * Error Boundary wraps SophiaIntroVideo — any crash auto-skips to home.
 */
import { useState, useEffect, Suspense, lazy, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { SophiaIntroVideo } from "../components/SophiaIntroVideo";
import { useLocation } from "wouter";
import { useSession } from "../lib/authClient";

// ─── Error Boundary ──────────────────────────────────────────────────────────
// Any crash inside SophiaEntryFlow → auto-skip to homepage (never black screen)
interface EBProps { children: ReactNode; onError: () => void; }
interface EBState { hasError: boolean; }
class SophiaErrorBoundary extends Component<EBProps, EBState> {
  override state: EBState = { hasError: false };
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  override componentDidCatch(err: Error, info: ErrorInfo) {
    console.warn("[Sophia] Entry flow crashed, skipping to home:", err.message, info.componentStack);
    this.props.onError();
  }
  override render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── Lazy-load everything below the fold ────────────────────────────────────
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
  const { data: session, isPending: sessionLoading } = useSession();

  // ── ONE-WAY DOOR: logged-in users never see Sophia or homepage ──────────────
  useEffect(() => {
    if (!sessionLoading && session?.user) {
      setLocation("/onboarding");
    }
  }, [sessionLoading, session]);

  // While checking auth, render nothing (avoid flash of Sophia for authed users)
  if (sessionLoading) return <div style={{ background: "#06040f", position: "fixed", inset: 0 }} />;

  const handleComplete = (path?: "onboarding" | "products" | "home") => {
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

  // If anything crashes → just go home
  const handleSophiaCrash = () => setStage("home");

  return (
    <>
      {/* ── Sophia Entry Flow — wrapped in error boundary, safe on all devices ── */}
      {stage === "sophia" && (
        <SophiaErrorBoundary onError={handleSophiaCrash}>
          <SophiaIntroVideo onComplete={() => setStage("home")} />
        </SophiaErrorBoundary>
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
