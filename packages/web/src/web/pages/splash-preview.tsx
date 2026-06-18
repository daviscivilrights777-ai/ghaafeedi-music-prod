/**
 * /splash-preview — Always shows the SplashGate regardless of localStorage.
 * Use this to review/approve the splash intro at any time.
 * After clicking through, redirects to homepage.
 */
import { useLocation } from "wouter";
import { SplashGate } from "../components/SplashGate";

export default function SplashPreview() {
  const [, setLocation] = useLocation();
  return (
    <SplashGate
      onComplete={() => setLocation("/")}
    />
  );
}
