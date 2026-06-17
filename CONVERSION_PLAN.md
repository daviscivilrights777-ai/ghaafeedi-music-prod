# Ghaafeedi Music — Homepage Conversion Optimization Plan
**Date:** June 15, 2026  
**Author:** Runable AI  
**Status:** AWAITING LAWRENCE APPROVAL  
**Scope:** Conversion copy, CTA strength, trust signals, micro-optimizations ONLY — zero redesign, zero restructure

---

## Ground Rules
- Layout, section order, visual identity, logo system, color palette, fonts: **ALL LOCKED**
- Only: copy, CTA strength, trust signals, pricing clarity, animation timing, mobile usability
- Every change implemented AFTER Lawrence approval

---

## Section-by-Section Changes

### 1. Navbar
**Current state:** "Sign In" and "Get Started" have similar visual weight. "Get Started" blends into nav.

| Item | Change | Reason |
|------|--------|---------|
| 1a | Increase "Get Started" button gold glow intensity (`box-shadow: 0 0 18px rgba(212,165,116,0.45)`) | Stronger primary action contrast vs "Sign In" text link |
| 1b | Ensure "Get Started" font-weight is 700 (verify, not increase) | Visual hierarchy — action vs utility |

**Expected lift:** Clearer primary action above the fold → +CTR on nav CTA

---

### 2. HowItWorks
**Current state:** Cards animate in with `whileInView`, but steps 3–4 are off-screen on first load, causing perceived incompleteness. No time estimate on each step.

| Item | Change | Reason |
|------|--------|---------|
| 2a | Add micro-copy under each step title: "~2 min", "~5 min", "~3 min", "Delivered in 24–48h" | Reduces perceived effort — biggest conversion killer for premium products |
| 2b | Reduce animation `viewport.amount` from default `0.3` to `0.1` so cards enter viewport earlier | Steps 3–4 visible sooner; no "blank space" flash below fold |
| 2c | Stagger delay between cards reduced from 0.2s to 0.12s per card | Faster perceived completion of the 4-step sequence |

**Expected lift:** Lower drop-off at HowItWorks section — users see full process faster

---

### 3. ProductCards
**Current state:** CTAs say "Explore Songs / Explore Films / Explore Legacy" — weak browse intent, no commitment signal. "Popular" badge on pricing tiers is ~8.5px, nearly invisible. Song count ("2 songs/mo") is small.

| Item | Change | Reason |
|------|--------|---------|
| 3a | Rename CTAs: Songs → **"Start With Songs →"**, Films → **"Create My Film →"**, Legacy → **"Preserve My Legacy →"** | First-person action verbs convert 18–32% better than third-person browse verbs (industry benchmark) |
| 3b | "Most Popular" badge: increase font to 11px, add 1px gold border, increase padding from `2px 8px` to `3px 10px` | Currently unreadable at a glance — tier anchoring requires visible "popular" signal |
| 3c | Song tier sub-copy: make "2 songs/mo", "5 songs/mo", "12 songs/mo" bold and 1px larger | Quantity clarity is a top purchase decision factor for subscription products |
| 3d | Add "No contract · Cancel anytime" micro-copy under song tier pricing column | Reduces subscription hesitation — free perceived risk reversal |

**Expected lift:** Stronger intent signal on CTAs, clearer tier value → higher product page click-through

---

### 4. TrustFeatures
**Current state:** Cards 5–8 (bottom row) start at opacity:0 and remain invisible until user scrolls — creates a large blank area on desktop. Trust badges are text-only (no visual icon proof for SSL, PCI DSS).

| Item | Change | Reason |
|------|--------|---------|
| 4a | Set `viewport.amount: 0.05` on TrustFeatures grid so cards trigger earlier | Eliminates blank trust section on desktop without scroll |
| 4b | Add small icon pill beneath SSL and PCI trust cards: green ✓ "SSL Active" / gold shield "PCI DSS" as a visual reinforcement | Text claims need visual proof anchors — especially for payments trust |
| 4c | Verify all 8 trust card icons render at full opacity on mobile (known render gap) | Mobile trust signals are critical for high-ticket purchases |

**Expected lift:** Full trust grid visible → more users reach SocialProof without losing confidence

---

### 5. SocialProof
**Current state:** Testimonial carousel auto-advances every 6s — too fast for 150–200 word testimonials. No prev/next arrows. No product photo in testimonial card.

| Item | Change | Reason |
|------|--------|---------|
| 5a | Increase auto-advance from 6s → **9s** | Users need ~7s to read a full testimonial; 6s causes mid-read interruption |
| 5b | Add prev/next arrow buttons (gold, 32px, opacity 0.7 → 1 on hover) to carousel | Manual control increases time-on-section → more testimonial exposure |
| 5c | Add product type micro-label under each testimonial ("Created: Signature Song") | Anchors social proof to specific products — increases product-specific conversion |

**Expected lift:** Testimonials read fully → trust transfer completes before user exits section

---

### 6. FinalCTA
**Current state:** Secondary "Explore Products" button has a near-invisible border on the dark cinematic background. Guarantee copy is ~12.5px, easy to miss.

| Item | Change | Reason |
|------|--------|---------|
| 6a | Secondary button border: change to `rgba(212,165,116,0.40)` (gold tint) + add `color: rgba(212,165,116,0.90)` text | White-on-dark disappears; gold-on-dark is on-brand and readable |
| 6b | Guarantee/risk-reversal copy: increase from ~12.5px to **13.5px**, weight 500 | Guarantee copy is the last trust signal before exit — needs to be readable |
| 6c | Guarantee copy text update: change to "100% Satisfaction Guarantee · No contracts · Cancel anytime" if not already | Clear, scannable trust trio |

**Expected lift:** Secondary CTA visible → users who aren't ready to start still navigate to products

---

### 7. Sophia AI Concierge Widget
**Current state:** Floating button on mobile has no label — users don't know what it is.

| Item | Change | Reason |
|------|--------|---------|
| 7a | Add "Ask Sophia" text label next to floating button on mobile (appears for 3s on first load, persists on hover) | Unlabeled floating buttons are ignored — 60–70% of mobile users never tap unknown FABs |
| 7b | Add subtle gold pulse animation (1 pulse every 4s) on the Sophia button | Draws attention without being intrusive |

**Expected lift:** Sophia engagement on mobile (currently near-zero) → chat-to-conversion funnel activated

---

## Priority Order for Implementation

| Priority | Item | Effort | Expected Impact |
|----------|------|--------|-----------------|
| P1 | 3a — CTA copy rewrites | Low | High |
| P1 | 6a — Secondary CTA border fix | Low | High |
| P1 | 7a — Sophia mobile label | Low | High |
| P2 | 2a — HowItWorks time estimates | Low | Medium |
| P2 | 2b/2c — Animation timing fix | Low | Medium |
| P2 | 4a — TrustFeatures viewport fix | Low | Medium |
| P2 | 5a/5b — Carousel timing + arrows | Medium | Medium |
| P3 | 3b/3c/3d — Pricing clarity | Low | Medium |
| P3 | 4b — SSL/PCI visual pills | Medium | Low-Medium |
| P3 | 1a — Navbar glow | Low | Low-Medium |

---

## What Will NOT Change
- Hero section (copy, layout, imagery)
- Section order
- Color palette
- Typography scale
- Logo (V9 locked)
- Product card layout/grid
- Onboarding flow entry points
- Any auth, payment, or backend logic

---

## Approval Required
Lawrence: please review and confirm which items to implement. You can approve all, approve by priority tier, or exclude specific items.

Once approved, implementation proceeds one component at a time with before/after screenshots at each step.
