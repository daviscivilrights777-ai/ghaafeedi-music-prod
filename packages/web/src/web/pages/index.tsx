/**
 * GHAAFEEDI MUSIC — Homepage Entry
 * ══════════════════════════════════════════════════════════════════
 * Entry flow (MANDATORY for every visitor — logged-in or not):
 *   GhaafeediPromoIntro — 4:46 cinematic promo video, autoplay with sound.
 *   Skip button always visible below player.
 *   "Enter Ghaafeedi Music" gold CTA appears at 4:39 (t=279s).
 *   Smart routing on skip/enter:
 *     guest           → /products
 *     logged-in, incomplete onboarding → /onboarding
 *     logged-in, complete  → /dashboard
 *
 * Bots/crawlers skip intro → /products (for SEO indexing).
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import GhaafeediPromoIntro from "../components/GhaafeediPromoIntro";
import { Suspense, lazy } from "react";

const Products = lazy(() => import("./products"));

export default function Index() {
  const [isBot, setIsBot] = useState(false);
  const [, setLocation] = useLocation();

  // ── BOT/CRAWLER DETECTION: skip video so Google can index content ────────
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const bot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora|showyoubot|outbrain|pinterest|developers\.google\.com\/\+\/web\/snippet|lighthouse|pagespeed|headlesschrome|prerender|crawl|spider|bot\b/.test(ua);
    if (bot) setIsBot(true);
  }, []);

  // Bots go straight to products for indexing
  if (isBot) {
    return (
      <Suspense fallback={<div style={{ background: "#050B1A", minHeight: "100vh" }} />}>
        <Products />
      </Suspense>
    );
  }

  return <GhaafeediPromoIntro />;
}
