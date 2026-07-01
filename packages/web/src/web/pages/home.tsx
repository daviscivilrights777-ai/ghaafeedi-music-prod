/**
 * GHAAFEEDI MUSIC — Full Marketing Homepage
 * ══════════════════════════════════════════════════════════════════
 * Shown to guests after they skip/finish the promo intro video.
 * Assembles all brand sections in order. Auth-aware nav included.
 */
import { SiteNav } from "../components/SiteNav";
import { HeroSection } from "../components/HeroSection";
import { StorytellingShowcase } from "../components/StorytellingShowcase";
import { HowItWorks } from "../components/HowItWorks";
import { ProductCards } from "../components/ProductCards";
import { SocialProof } from "../components/SocialProof";
import { TrustFeatures } from "../components/TrustFeatures";
import { FinalCTA } from "../components/FinalCTA";
import { Footer } from "../components/Footer";
import { StickyCtaBar } from "../components/StickyCtaBar";
import { SophiaConcierge } from "../components/SophiaConcierge";

export default function HomePage() {
  return (
    <div style={{ background: "#050B1A", minHeight: "100vh", overflowX: "hidden" }}>
      <SiteNav />
      <HeroSection />
      <StorytellingShowcase />
      <HowItWorks />
      <ProductCards />
      <SocialProof />
      <TrustFeatures />
      <FinalCTA />
      <Footer />
      <StickyCtaBar />
      {/* Sophia floating widget — Concierge Chat tab + Sophia AI Emotional Companion info tab */}
      <SophiaConcierge />
    </div>
  );
}
