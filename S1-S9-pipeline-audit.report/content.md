# S1–S9 Onboarding Pipeline Audit
**Ghaafeedi Music — AI Integration & Cinematic Orchestration Gap Analysis**
*Audit Date: June 23, 2026 | Source: `packages/web/src/web/pages/onboarding.tsx` (10,064 lines) + `packages/web/src/api/routes/onboarding.ts` (464 lines)*

---

## Executive Summary

Of the 9 onboarding steps, **2 steps have live GPT-4o + real provider integration (S5, S5-song-gen)**, **1 step has real payment API wiring (S8)**, and **6 steps are entirely hardcoded/simulated with zero live AI or pipeline connection** (S3, S4, S6, S7, S9, and S6's audio player). S4 collects critical story input but doesn't pre-warm any AI call. S6 is the single biggest gap: it receives the S5 AI result but ignores both the real song title AND the generated audio URL — playing a fake setTimeout waveform instead. S7 shows fabricated pipeline stages from a hardcoded `PIPELINE_INIT` array with no live job polling. S9 defaults to placeholder order data if the Dodo checkout didn't succeed. **No step routes user data into the orchestration engine (jobs queue, audit log, or billing emitter) at any point during the 9-step journey.**

---

## Key Findings

- **S5 `/api/onboarding/analyze`** — LIVE. Real GPT-4o-mini call, 5-bar scoring, personalized song title + emotion. Fallback graceful. ✅
- **S5 `triggerSongGeneration()`** — LIVE. Real GPT-4o-mini for lyrics/metadata, real Sunor.cc polling (90s timeout). Returns real `audioUrl`. ✅  
- **S6 audio player** — FAKE. Uses `requestAnimationFrame` ticker over 28 fake seconds. Does NOT consume the `audioUrl` generated in S5. Real audio ready but not passed through. ❌
- **S6 song title / metadata** — PARTIAL. Uses `analysisData?.songTitle` if passed, but **`analysisData` is NOT wired in the S6 invocation** in the orchestrator (missing prop). Falls back to hardcoded `deriveSongTitle()`. ❌
- **S7** — ENTIRELY FAKE. `PIPELINE_INIT` is a static array. `FEED_SEQUENCE` is hardcoded copy. `PROGRESS_SEQUENCE = [12, 28, 45, 62, 78]` — hardcoded numbers. Refresh cycles through fake sequences. No job ID, no polling, no real status. ❌
- **S3** — Acceptable. Static picker (8 experience options). Selection feeds S4/S5. No AI call needed here. ⚠️ Minor: one extra `setTimeout(400ms)` fake delay on Next.
- **S4** — Acceptable input step. 25-word enforcer works. Voice recording, photo/video/doc upload exist. BUT: no pre-warm API call fired on mount, no media sent to S5 (`mediaCount` always 0 in analyze call). ⚠️
- **S8** — PARTIAL. Real Dodo Payments `POST /api/dodo/checkout-session` call. But selected package, BNPL option, and add-ons are NOT sent to the orchestration engine on payment success. No job is enqueued when checkout completes. ❌
- **S9** — PARTIAL. Reads from `localStorage.gm_order_confirmation`. Falls back to hardcoded order ID `GM-2024-89271` and `$79.00` if nothing stored. No real member creation beyond a fire-and-forget `POST /api/members/create`. ⚠️

---

## Step-by-Step Analysis

### S1 — Welcome / Auth Gate
**Status: ✅ Correct as-is**

Pure UI shell. Auth handled by Better Auth. `MemberDropdown` renders live session state. No AI needed. Correct design.

**Nothing to fix.**

---

### S2 — Who Is This For?
**Status: ✅ Acceptable**

8-card static grid. Selection stored in `obData.whoFor`. Feeds downstream. No AI call needed at this stage.

**Nothing to fix.**

---

### S3 — Choose Experience
**Status: ⚠️ Minor**

Static picker from `EXPERIENCE_OPTIONS` array (8 options, hardcoded). `handleNext()` fires a `setTimeout(400ms)` fake delay before advancing. Selection stored in `obData.experienceType`.

**Gap:** The fake 400ms delay is unnecessary visual theatre — imperceptible to users, meaningless as UX. Not blocking.

**No pipeline integration needed here** — this is legitimately a picker. No fix required unless UX polish is desired.

---

### S4 — Tell Your Story
**Status: ⚠️ Gap: Media not forwarded, no pre-warm**

The 25-word enforcer is live and correct. Voice recording, photo upload, video upload, and document upload are all functional UI.

**Gap 1: `mediaCount` always 0 in S5 analyze call.**
The `fetch("/api/onboarding/analyze")` call in S5 receives `storyText`, `whoFor`, `experienceType` — but `mediaCount` is hardcoded to `0` and `alreadyOwnedIds` is always `[]`. The GPT-4o prompt mentions "They also uploaded N media files" — this context is never populated.

**Gap 2: No API pre-warm on mount.**
When S4 mounts, no warm-up call is fired. S5's analysis takes 2-5 seconds. A silent pre-warm (or at minimum a media upload to R2) could shave visible latency when the user hits Continue.

**Gap 3: Uploaded media not sent to analysis.**
Photos, voice notes, videos uploaded in S4 are stored as `obData.uploadedPhotos[]` etc. — but the S5 analysis endpoint only receives text. There is no image-description step feeding photo context into GPT-4o.

---

### S5 — AI Emotional Analysis
**Status: ✅ Live (but song data not passed to S6)**

This is the best-wired step. The `useEffect` on mount calls `POST /api/onboarding/analyze` with real GPT-4o-mini. The 5-bar emotional scoring, personalized song title, `dominantEmotion`, `emotionalArc`, and product recommendations all come from live AI.

After analysis completes, `triggerSongGeneration()` fires immediately — calling `POST /api/onboarding/generate-song` with the AI result. This in turn calls GPT-4o-mini for lyrics/metadata, then Sunor.cc for real audio (90s polling). Album art is generated in parallel via FAL.ai Flux Schnell.

**Critical Gap: Song data is generated inside S5 but NEVER passed to S6.**

In the orchestrator (line ~9994), Step6 is invoked with:
```tsx
<Step6PreviewCreation
  whoFor={obData.whoFor}
  experienceType={obData.experienceType}
  storyText={obData.storyText}
  onNext={next}
  onBack={back}
/>
```

`analysisData` is not passed. `songData` is not passed. The real song title, real audio URL, real album art URL, real lyrics — all discarded at the S5→S6 boundary.

---

### S6 — Preview Your Creation
**Status: ❌ Fully Fake Audio | ❌ Disconnected from Real Data**

**Issue 1: Fake audio player.**
S6 uses `requestAnimationFrame` to tick an `elapsed` counter from 0 to 28 (fake seconds). `togglePlay()` just starts/stops the RAF loop. There is no `<audio>` element, no `src`, no real playback. The "play" button simulates waveform animation over a static `WAVEFORM` array (`Array.from({length:52}, ... Math.sin ...`).

**Issue 2: Song title is a hardcoded fallback.**
`deriveSongTitle(whoFor, experienceType)` returns strings like "Little Light of Mine", "Across Every Lifetime", "Forever In My Heart" — generic fallbacks. Even though `analysisData?.songTitle` is in the prop interface, `analysisData` is never passed from the orchestrator.

**Issue 3: Mood gallery is static.**
`MOOD_IMAGES` is `[{src:"/assets/mood-1.png"}, ...]` — 4 static image slots for generic assets that may not exist. No connection to the AI-generated album art from S5.

**Issue 4: "Included items" are generic.**
`INCLUDED_ITEMS = ["Lyrics & Music", "Cinematic Video", "Unlimited Revisions", "High Quality Delivery"]` — hardcoded regardless of what the user selected in S2/S3.

**What needs to happen:**
- `obData.songData` (the S5 Sunor result) must be stored in state and passed to S6
- `obData.analysisData` must be passed to S6
- S6 must render a real `<audio src={songData.audioUrl}>` when the URL is available
- S6 must show real title, genre, BPM, key, instruments from `songData`
- S6 must show real album art from `songData.albumArtUrl`
- S6 must show real lyrics (verse 1 + chorus) from `songData.lyrics`
- If audio isn't ready yet (Sunor.cc still polling), show a "Generating your song…" state with progress indicator

---

### S7 — Production Portal
**Status: ❌ Entirely Simulated**

Every number and status in S7 is hardcoded:

```ts
const PIPELINE_INIT: PipelineStep[] = [
  { id:"lyrics",   label:"Lyrics Generated",  status:"done"    },
  { id:"music",    label:"Music Generated",    status:"done"    },
  { id:"video",    label:"Video In Progress",  status:"active"  },
  { id:"finalize", label:"Finalizing",         status:"pending" },
  { id:"delivery", label:"Ready For Delivery", status:"pending" },
];

const PROGRESS_SEQUENCE = [12, 28, 45, 62, 78];
```

`handleRefresh()` cycles through `FEED_SEQUENCE` in order — it doesn't call any API. The refresh button is pure state cycling. The animated ring always starts at 78%. The "Live Status" feed messages are static strings.

**There is no job ID anywhere in S7.** The orchestration engine exists and is live (`packages/web/src/api/routes/jobs.ts`) but S7 never calls it. No `GET /api/jobs/:id/status` poll. No job created at any prior step.

**What needs to happen:**
- A job must be created in the orchestration engine at some point before S7 (likely S5 completion or S8 payment confirmation)
- S7 must store that job ID and poll `GET /api/jobs/:id/status` every ~5 seconds
- Pipeline steps, progress %, and feed messages must come from real job state
- The "Refresh" button must trigger a real status fetch, not cycle fake data

**Note:** The `experienceType` and `whoFor` values reach S7 but are only used for cosmetic label strings (`deliveryLabel`, `packageLabel`). No routing to specific pipeline logic occurs.

---

### S8 — Checkout & Payment
**Status: ⚠️ Payment is live; no job enqueue on success**

The Dodo checkout call (`POST /api/dodo/checkout-session`) is live. The BNPL module, payment method selector, form validation, and CTA states are all functional and previously QA-passed.

**Gap 1: No job created on payment success.**
When `submitState === "success"`, the code writes `gm_order_confirmation` to localStorage and calls `onNext()`. It does NOT call the orchestration engine to create a production job. Nothing is enqueued in the jobs queue.

**Gap 2: Selected package is not sent to any backend on completion.**
The full cart — `selectedPkg`, `bnplOption`, `addons[]` — is persisted in `gm_checkout_state` but never POSTed to a server-side order record. If the user clears localStorage, the order is lost.

**Gap 3: S5 AI results not included in order metadata.**
When an order is created, it should carry the song title, dominant emotion, lyrics, and audio URL generated in S5 so the production team / orchestration engine has full context. Currently this data lives only in component-local state and is discarded.

**What needs to happen:**
- On payment success: `POST /api/jobs/create` with `{ jobType: "song_gen" | "cinematic_video", packageId, songMeta, analysisData, customerEmail }`
- Persist order to PostgreSQL (`orders` table) via a new route
- Return a real `jobId` that flows into S7 for status polling

---

### S9 — Order Confirmation
**Status: ⚠️ Mostly correct; fallback data is misleading**

S9 reads from `localStorage.gm_order_confirmation`. If Dodo succeeded, real order data is displayed. The copy-to-clipboard, receipt download (client-side PDF generation), and "Go To Dashboard" CTA are functional.

**Gap 1: Hardcoded fallback order data.**
If `gm_order_confirmation` is empty (e.g. user navigated to S9 directly, or localStorage was cleared), S9 shows:
```
Order ID: GM-2024-89271
Package: Premium Song Package
Total: $79.00
```
This is fake data that looks real. A returning user who lost their localStorage would see fabricated order details.

**Gap 2: No real job status in S9.**
`jobStatus` falls back to `"Queued"` but is never sourced from the actual orchestration engine. The production timeline shown in S9 is cosmetic.

**Gap 3: `POST /api/members/create` is fire-and-forget.**
The member creation call on S9 mount is unawaited and has no retry logic. If it fails silently, the member record may never be created.

---

## Data Flow Summary

| Step | Sends to AI | Receives from AI | Orchestration Engine | Assessment |
|------|-------------|-----------------|---------------------|------------|
| S1 | ❌ | ❌ | ❌ (correct) | ✅ |
| S2 | ❌ | ❌ | ❌ (correct) | ✅ |
| S3 | ❌ | ❌ | ❌ (correct) | ✅ |
| S4 | ❌ | ❌ | ❌ | ⚠️ Media not forwarded |
| S5 | ✅ GPT-4o-mini + Sunor.cc + FAL.ai | ✅ Full analysis + audio + art | ❌ | ✅ Live, but data dies here |
| S6 | ❌ | ❌ (ignores S5 output) | ❌ | ❌ Fully fake |
| S7 | ❌ | ❌ | ❌ | ❌ Fully fake |
| S8 | ❌ | ❌ | ❌ | ⚠️ Payment live, no job created |
| S9 | ❌ | ❌ | ❌ | ⚠️ Fallback data misleading |

---

## Priority Fix Matrix

| Priority | Step | Fix | Effort |
|----------|------|-----|--------|
| 🔴 P0 | S6 | Pass `songData` + `analysisData` from orchestrator; render real audio + title + art | Medium |
| 🔴 P0 | S8 | On payment success: POST to `/api/jobs/create`, persist order to PG | Medium |
| 🔴 P0 | S7 | Poll real job status via `GET /api/jobs/:id/status` (job ID from S8) | Medium |
| 🟡 P1 | S9 | Remove hardcoded fallback order data; show "Order not found" state instead | Small |
| 🟡 P1 | S9 | Source `jobStatus` from real orchestration engine | Small |
| 🟡 P1 | S4 | Forward `mediaCount` and uploaded media URLs to S5 analyze call | Small |
| 🟢 P2 | S4 | Pre-warm `/api/onboarding/analyze` on S4 mount (silent background call) | Small |
| 🟢 P2 | S9 | Add retry logic to `POST /api/members/create` | Small |
| 🟢 P2 | S6 | Show real lyrics (verse 1 + chorus) from `songData.lyrics` | Small |
| 🟢 P2 | S8 | Send full AI context (songTitle, emotion, lyrics) with order payload | Small |

---

## Critical Path for Full Pipeline Wiring

The fixes must be done in this order:

**1. Add `songData` and `analysisData` to `obData` state** — so both survive step transitions and can be passed as props.

**2. Wire S6** — pass `songData` + `analysisData`; render real audio player, title, art.

**3. Wire S8 success handler** — on Dodo success, POST to `/api/jobs/create` with full context. Store `jobId` in `obData`.

**4. Wire S7** — pass `jobId` from obData; poll `/api/jobs/:id/status` every 5s for real pipeline progress.

**5. Wire S9** — pass real `jobId`; surface actual job status and order record from PG instead of localStorage fallback.

---

## What's Already Working (Do Not Break)

- `POST /api/onboarding/analyze` — GPT-4o-mini live, fallback graceful ✅
- `POST /api/onboarding/generate-song` — GPT-4o-mini + Sunor.cc polling ✅
- `POST /api/onboarding/generate-album-art` — FAL.ai Flux Schnell ✅
- `POST /api/dodo/checkout-session` — Dodo Payments live ✅
- S5 emotional scoring bars, animations, jitter, skip lock ✅
- S5 product recommendation panel ✅
- S8 BNPL module, dynamic calc, security section ✅
- S9 receipt PDF generation (client-side) ✅
- `gm_checkout_locked` auto-advance to S9 ✅
- Back-button interception (popstate) ✅
- Step persistence via `gm_ob_step` ✅

---

## Methodology

Audit performed by direct source-code inspection of `onboarding.tsx` (10,064 lines) and `onboarding.ts` (464 lines). Every `fetch()` call, `setTimeout()`, hardcoded array, and state variable was traced. The orchestrator render block (lines 9994–10064) was cross-referenced against each step's prop interface to identify data that should be passed but isn't. No external sources required — this is a first-party code audit.
