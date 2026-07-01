/**
 * GHAAFEEDI MUSIC — Homepage Entry
 * ══════════════════════════════════════════════════════════════════
 * Entry flow:
 *   Logged-in users → immediately redirected to /dashboard (no promo).
 *   Guest visitors  → GhaafeediPromoIntro cinematic promo video.
 *   Bots/crawlers   → /products (SEO indexing).
 *
 * Smart routing on skip/enter (handled inside GhaafeediPromoIntro):
 *   guest                        → /products
 *   logged-in, onboarding todo   → /onboarding
 *   logged-in, complete          → /dashboard
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import GhaafeediPromoIntro from "../components/GhaafeediPromoIntro";
import { Suspense, lazy } from "react";

const Products = lazy(() => import("./products"));

const TOKEN_KEY = "gm_bearer_token";

export default function Index() {
  const [isBot, setIsBot] = useState(false);
  const [checked, setChecked] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // ── BOT/CRAWLER DETECTION ────────────────────────────────────────
    const ua = navigator.userAgent.toLowerCase();
    const bot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora|showyoubot|outbrain|pinterest|developers\.google\.com\/\+\/web\/snippet|lighthouse|pagespeed|headlesschrome|prerender|crawl|spider|bot\b/.test(ua);
    if (bot) {
      setIsBot(true);
      setChecked(true);
      return;
    }

    // ── LOGGED-IN GUARD ───────────────────────────────────────────────
    // If a bearer token exists, skip the promo and go directly to dashboard.
    // replaceState so "/" is not in the back-stack.
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      window.history.replaceState(null, "", "/dashboard");
      setLocation("/dashboard");
      return;
    }

    setChecked(true);
  }, [setLocation]);

  // Bots → products for SEO
  if (isBot) {
    return (
      <Suspense fallback={<div style={{ background: "#050B1A", minHeight: "100vh" }} />}>
        <Products />
      </Suspense>
    );
  }

  // Waiting for the auth check (renders nothing / dark bg to prevent flash)
  if (!checked) {
    return <div style={{ background: "#050B1A", minHeight: "100vh" }} />;
  }

  return <GhaafeediPromoIntro />;
}
