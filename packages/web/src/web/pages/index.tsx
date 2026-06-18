import { useState } from "react";
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
import { SplashGate } from "../components/SplashGate";

const SPLASH_KEY = "gm_splash_seen";

export default function Index() {
  const [splashDone, setSplashDone] = useState<boolean>(
    () => localStorage.getItem(SPLASH_KEY) === "1"
  );

  const handleSplashComplete = () => {
    localStorage.setItem(SPLASH_KEY, "1");
    setSplashDone(true);
  };

  return (
    <>
      {!splashDone && <SplashGate onComplete={handleSplashComplete} />}
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
    </>
  );
}
