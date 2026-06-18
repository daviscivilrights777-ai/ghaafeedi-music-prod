/**
 * /splash-preview — Always shows the SplashGate for review/approval.
 * Ignores localStorage. After clicking through, renders the homepage
 * inline so you see the full transition: splash → homepage.
 */
import { useState } from "react";
import { SplashGate } from "../components/SplashGate";
import IndexPage from "./index";

export default function SplashPreview() {
  const [done, setDone] = useState(false);

  // When done: render homepage inline (no navigation, no localStorage write)
  // so you can see the full splash → homepage transition in context.
  if (done) return <IndexPage />;

  return <SplashGate onComplete={() => setDone(true)} />;
}
