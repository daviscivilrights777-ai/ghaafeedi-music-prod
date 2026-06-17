# Ghaafeedi Music — Auth & Sophia Build

## Tasks
1. [x] SiteNav component (sign out, sign in, dashboard links)
2. [x] AuthGateModal component (shown when unauthed user tries to proceed past S1)
3. [x] Sophia API route /api/sophia/chat (free tier 3 msg/day, OpenAI gpt-4o-mini)
4. [x] Wire sophia route in api/index.ts
5. [ ] SophiaConcierge.tsx — rewrite to use real API + free tier UI (remaining msgs, limit reached state)
6. [ ] onboarding.tsx — auth gate: check session on mount, show modal if unauthed tries next() on S1
7. [ ] onboarding.tsx — resume: save/load step to localStorage (gm_ob_step), clear on S9 complete
8. [ ] signin.tsx — after login redirect to saved step or /onboarding
9. [ ] signup.tsx — after signup redirect to /onboarding (same)
10. [ ] Google OAuth callback — ensureMember after Google sign-in (add to auth callback)
11. [ ] Add SiteNav to: dashboard, products, product-detail, demo, homepage (already has its own nav?)
12. [ ] QA all 3 viewports

## Key Files
- SiteNav: packages/web/src/web/components/SiteNav.tsx (NEW)
- AuthGateModal: packages/web/src/web/components/AuthGateModal.tsx (NEW)
- sophia route: packages/web/src/api/routes/sophia.ts (NEW)
- SophiaConcierge: packages/web/src/web/components/SophiaConcierge.tsx
- onboarding: packages/web/src/web/pages/onboarding.tsx (8776 lines)
- signin: packages/web/src/web/pages/signin.tsx
- signup: packages/web/src/web/pages/signup.tsx
- dashboard: packages/web/src/web/pages/dashboard.tsx

## Notes
- Auth: useSession() from authClient, signOut() from authClient
- Free tier: 3 msgs/day, resets at midnight (key = ip:YYYY-MM-DD)
- Step persistence: gm_ob_step in localStorage, cleared on S9 onDashboard()
- Auth gate: S1 is public (show welcome), S2+ require auth → show AuthGateModal
- Google callback: need to call /api/members/create after OAuth redirect
