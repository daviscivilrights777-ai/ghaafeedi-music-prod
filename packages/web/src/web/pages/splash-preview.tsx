/**
 * /splash-preview — Always shows SplashLandingPage for review/approval.
 * Ignores localStorage. After clicking through, renders the homepage
 * inline so you see the full transition: splash → homepage.
 */
import { useState } from "react";
import { SplashLandingPage } from "../components/SplashLandingPage";
import IndexPage from "./index";

export default function SplashPreview() {
  const [done, setDone] = useState(false);

  if (done) return <IndexPage />;

  return <SplashLandingPage onComplete={() => setDone(true)} />;
}
