import { Navbar } from "../components/Navbar";
import { HeroSection } from "../components/HeroSection";
import { HowItWorks } from "../components/HowItWorks";
import { ProductCards } from "../components/ProductCards";
import { TrustFeatures } from "../components/TrustFeatures";
import { SocialProof } from "../components/SocialProof";
import { SophiaConcierge } from "../components/SophiaConcierge";
import { StorytellingShowcase } from "../components/StorytellingShowcase";
import { FinalCTA } from "../components/FinalCTA";
import { Footer } from "../components/Footer";
import { StickyCtaBar } from "../components/StickyCtaBar";
import { SocialProofToast } from "../components/SocialProofToast";

export default function Index() {
  return (
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
      {/* P4-A Conversion Layer */}
      <StickyCtaBar />
      <SocialProofToast />
    </div>
  );
}
