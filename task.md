# Auth + Onboarding Fix Task

## Root Cause Analysis

### Bug 1: Google sign-in redirects to homepage instead of /onboarding
- `callbackURL: redirectTo` is set in `handleGoogle()` — this is the Better Auth `callbackURL` 
- BUT: `redirectTo` defaults to `/onboarding` correctly
- REAL ISSUE: After Google OAuth callback, Better Auth redirects to `callbackURL` BUT the app's root `/` route renders the homepage. 
- After OAuth, user lands on `/onboarding` BUT the `_initStep` IIFE runs synchronously at component init time. At that moment `isAuthed` is `false` (session hasn't loaded yet), so it always returns 1. The useEffect that resumes the step only fires after the session resolves.
- ADDITIONAL ISSUE: `POST /api/members` in the onboarding useEffect uses wrong path — should be `/api/members/create`

### Bug 2: S2 Continue button "missing/broken"
- S2 Continue button DOES exist in code (line 1027)  
- BUT: it requires `selected !== null` — if user hasn't picked an option, button is grayed out (disabled)
- The actual issue might be: after Google OAuth, user is authed but lands on S1, presses Continue which calls `next()`. Since `step === 1 && !isAuthed` guard — BUT wait, after OAuth isAuthed should be true...
- WAIT: The gate in `next()` checks `step === 1 && !isAuthed`. For Google OAuth users, session might not be loaded yet when they hit Continue. So they get the AuthGateModal instead of advancing to S2. That IS the S2 issue — they never get to S2!

### Bug 3: All Continue buttons S1-S9 must work
- Root issue is same as above — session loading timing

### Dashboard requirement: S1-S9 persistent customer dashboard header with GM account number

## Fixes Required

### Fix A: Auth redirect — ensure Google + email signin land on /onboarding
- Both already set `callbackURL: redirectTo` and `redirectTo` defaults to `/onboarding` ✓
- Email signin: calls `setLocation(redirectTo)` explicitly ✓  
- Google OAuth: relies on Better Auth to redirect to callbackURL — this SHOULD work
- ADD: after Google OAuth returns, onboarding.tsx should handle the case where session loads async

### Fix B: S1 Continue timing issue
- Problem: `next()` checks `!isAuthed` but session is async
- When Google OAuth user lands on /onboarding, `sessionLoading=true` initially, `isAuthed=false`
- They press Continue → gets blocked by auth gate
- Fix: if `sessionLoading === true`, show loading state on S1 Continue button instead of blocking

### Fix C: Members create endpoint
- `fetch("/api/members", { method: "POST" })` — WRONG path
- Should be `fetch("/api/members/create", { method: "POST" })`

### Fix D: Persistent member dashboard bar in S1-S9
- Add a slim top bar showing GM account number, user name, member status
- Fetch from `/api/members/me` when authed
- Show only when `isAuthed === true`
- Must not interfere with step layouts

## Status
- [ ] Fix B: S1 Continue timing (sessionLoading guard)
- [ ] Fix C: wrong members create URL in onboarding
- [ ] Fix D: persistent member bar S1-S9
- [ ] Start dev server + verify
