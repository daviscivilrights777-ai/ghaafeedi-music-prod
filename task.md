# Enterprise Signup Overhaul — Task Tracker

## Scope
1. New `/get-started` interstitial page — "Existing customer? Sign In" / "New? Create Account" two big buttons
2. New enterprise `/create-account` page (replaces bare /signup as primary entry) — fields: name, email, password, phone, street address, city/state/zip, country, DOB, referral source — ALL REQUIRED. Consent checkboxes (ToS/Privacy/Age18) at bottom.
3. On submit: create account + member record (unique GM-XXXXXXXX id) + save profile fields + record consent + send welcome email (Resend, luxury copy, includes full name)
4. Show "Welcome! Your Member ID is GM-XXXX" confirmation screen → click → redirect to /onboarding (S1)
5. Google sign-in on create-account page → also redirects to /onboarding, still gets member id assigned
6. Update ALL "Get Started" CTAs sitewide to point to /get-started instead of /signup
7. Existing /signup page: keep as thin redirect to /create-account (avoid breaking old links) OR repoint links directly — decide during build
8. DB: add fields to profiles table (phone exists, country exists) — need: streetAddress, city, state, zip, dateOfBirth, referralSource
9. Migration via drizzle-kit push (need DATABASE_URL — use Railway URL from memory)
10. Typecheck 0 errors, commit, push

## Status
- [ ] Schema update
- [ ] Migration run
- [ ] Welcome email function
- [ ] /get-started page
- [ ] /create-account page
- [ ] API: /api/members/create-full (or extend /create) to accept profile fields + send email
- [ ] Update CTA links sitewide (Navbar, SiteNav, HeroSection, StickyCtaBar, signin.tsx "Create Account" link, GhaafeediPromoIntro if applicable)
- [ ] Welcome confirmation screen component
- [ ] Typecheck
- [ ] Commit + push

## Key facts
- members table: id, userId, memberId (GM-XXXXXXXX unique), status, tier, joinedAt, updatedAt
- profiles table: userId, fullName, bio, phone, country, timezone, language, avatarUrl, role, onboardingStep, onboardingComplete, storyS, emotionalProfile, sophiaSessionCount, mfaEnabled, mfaSecret, verified, ltvCents, consentAcceptedAt, createdAt, updatedAt
- generateUniqueMemberId() already exists in members.ts — reuse
- Resend pattern: packages/web/src/api/lib/lipsync-email.ts — reuse buildEmailHtml style, FROM = "Ghaafeedi Music <noreply@ghaafeedimusic.com>"
- RESEND_API_KEY via getSecret("RESEND_API_KEY") fallback process.env
- CTA locations found: Navbar.tsx (Get Started), SiteNav.tsx (Get Started x2 spots + Create Account signin link), HeroSection.tsx (Start Your Story -> /onboarding), StickyCtaBar.tsx, signin.tsx (Create Account link -> /signup), GhaafeediPromoIntro.tsx uses /onboarding directly for guests too (handleNavigate logic - need to check)
- DATABASE_URL (Railway prod, from memory): postgresql://postgres:nnrszttShuOrBtrNQPTzHeVmUrGXiCdS@thomas.proxy.rlwy.net:19541/railway
