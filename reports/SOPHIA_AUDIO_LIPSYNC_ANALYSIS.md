# Sophia Audio & Lip-Sync — Comprehensive Analysis Report
**Ghaafeedi Music | Prepared for Lawrence Davis**
**Date: June 24, 2026**

---

## 1. WHAT WAS BROKEN — ROOT CAUSE CONFIRMED

### The Error
```
MEDIA_ELEMENT_ERROR: Empty src attribute (code: 4)
HTMLAudio error code:4
Audio error: {"isTrusted":true}
```

All four errors across the timeline (12:01 AM, 12:14 AM, 11:02 AM, 11:11 AM) are the **exact same bug** — different timestamps, same root cause.

### Why It Failed — The Sequence Problem

**Old broken sequence in `SophiaMobileLipSync.tsx`:**
```
preUnlocked.src = ttsUrl   ← streaming GET URL assigned
preUnlocked.load()         ← browser starts fetching
audio = preUnlocked
// ... more code ...
audio.onplaying = ...      ← handlers attached HERE (too late)
audio.onended  = ...
audio.onerror  = ...
audio.play()               ← FIRES at readyState=0 (HAVE_NOTHING)
                           ← src still "empty" from browser's view
                           ← ERROR: MEDIA_ELEMENT_ERROR code:4
```

**Three compounding failures:**

| # | Failure | Effect |
|---|---------|--------|
| 1 | Handlers attached after `play()` | `onerror` missed the first error event |
| 2 | No `canplay` gate | `play()` hit `readyState=0` — browser had nothing buffered |
| 3 | Streaming GET URL as `src` | Browser must initiate a new network request; `src` is momentarily unresolved on Android |

### Why the Debug Page Worked
`/api/sophia-mobile/tts` debug page followed the correct sequence internally — fetch → full buffer → blob → play. That's exactly why it passed every time. Backend is 100% clean. This was always a **front-end timing bug only**.

---

## 2. WHAT WAS ALREADY FIXED (commit c46a388)

The audio fix was applied before Lawrence sent the full spec. The new sequence in `SophiaMobileLipSync.tsx`:

```typescript
// 1. Fetch full audio bytes
const res = await fetch(`/api/sophia-mobile/tts?text=...`);
const arrayBuffer = await res.arrayBuffer();
const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
const blobUrl = URL.createObjectURL(blob);  // ← fully buffered, never empty

// 2. Wire ALL listeners BEFORE src is set
audio.oncanplay = () => {
  audio.play()  // ← called INSIDE the event handler, not before it
};
audio.onended = () => { ... resolve() ... };
audio.onerror = () => { ... reject() ... };

// 3. Set src + load AFTER listeners
audio.src = blobUrl;
audio.load();
// canplay fires → play() executes → audio confirmed!
```

**This fix is deployed on Render (commit c46a388). Zero TS errors. Zero pre-existing errors introduced.**

---

## 3. WHAT HAS NOT BEEN IMPLEMENTED YET

Lawrence sent a 6-part spec after the audio fix was committed. **Nothing from Parts 1–6 has been implemented.** Here is the full inventory:

### Part 1 — `SophiaLipSync` Engine (js/sophia-lipsync.js)
**Status: NOT YET IMPLEMENTED**
- `SophiaLipSync` class with Web Audio API `AnalyserNode`
- 60 FPS `requestAnimationFrame` loop
- Frequency analysis: bass / lowMid / mid / high bands
- 6 mouth shapes: CLOSED, SMALL, MEDIUM, LARGE, WIDE, ROUND
- Lerp smoothing factor 0.35 (prevents jitter)
- `smoothToClose()` on audio end
- `destroy()` cleanup — disconnects source + analyser nodes

### Part 2 — `SophiaAudioPlayer` Integration Update
**Status: NOT YET IMPLEMENTED (audio fix is in, but lip-sync wiring is not)**
- `crossOrigin = 'anonymous'` must be set BEFORE src (required for Web Audio API `createMediaElementSource`)
- `sophiaLipSync.initialize(audio)` called BEFORE src is set
- `sophiaLipSync.start()` on `playing` event
- `sophiaLipSync.stop()` on `ended` / `pause` / `error`
- `_sophiaConnected` guard — `createMediaElementSource` can only be called ONCE per element

### Part 3 — HTML Mouth Layer Structure
**Status: NOT YET IMPLEMENTED**
Current render in `SophiaMobileLipSync.tsx` is just `<img>` + `<video>`. Needs:
- `.sophia-face` wrapper
- `.sophia-mouth-container` (absolute positioned over portrait)
  - `.sophia-mouth`
    - `.mouth-upper-lip`
    - `.mouth-cavity`
    - `.mouth-lower-lip`
    - `.mouth-teeth-upper`
    - `.mouth-teeth-lower`
- `.sophia-jaw`
- `.speaking-indicator` (4x `.wave-bar`)

### Part 4 — CSS Mouth Animation
**Status: NOT YET IMPLEMENTED**
- `--mouth-open` / `--mouth-width` CSS variables
- Upper lip: `scaleY(calc(1 - var(--mouth-open) * 0.3))`
- Lower lip: `translateY` + `scaleY` driven by open value
- Cavity: radial gradient, opacity + height driven by open
- Teeth: opacity fade-in on open
- `.sophia-face.speaking` → `subtleBreath` filter animation
- Wave bars: staggered `scaleY` animation on `.speaking` class
- `will-change: transform` + `backface-visibility: hidden` for GPU perf

### Part 5 — Video-Based Fallback (`SophiaVideoSync`)
**Status: NOT YET IMPLEMENTED**
- `SophiaVideoSync` class for pre-rendered talking video path
- Loops `sophia-talking-loop.mp4` while audio plays
- Resets to `sophia-idle-loop.mp4` on end
- Simpler path — no Web Audio API needed

### Part 6 — App Initialization
**Status: ALREADY HANDLED differently**
The codebase uses React + `speakRef` / `speakQueueRef` pattern in `SophiaEntryFlow.tsx`. The vanilla JS `DOMContentLoaded` + `#lets-begin-btn` pattern from Part 6 is not applicable — the React equivalent is already wired. The `handleAudioUnlock` tap handler in `SophiaEntryFlow.tsx` is the equivalent.

### Mobile Unlock (sent between parts)
**Status: PARTIALLY implemented**
- Pre-unlocked silence Audio element already exists in `SophiaEntryFlow.tsx` (`handleAudioUnlock`)
- Silent MP3 base64 is already used
- `touchstart` + `click` `{ once: true }` listeners — **not explicitly added as document-level listeners**; currently only fires on the "Tap to hear Sophia" overlay click

---

## 4. IMPLEMENTATION OPTIONS — THREE PATHS

### OPTION A — Minimal: Audio Fix Only (Already Done)
**What's in:** commit c46a388 — fetch → blob → canplay → play
**What's NOT in:** lip-sync animation, mouth layers, CSS
**Result:** Sophia speaks correctly. Portrait is static. No mouth movement.
**Risk:** Zero. Already deployed.
**Recommended if:** You want to confirm audio works first before adding visual complexity.

---

### OPTION B — Full Lip-Sync: Web Audio API Analyser (Parts 1–4)
**What gets added:**
1. `SophiaLipSyncEngine` TypeScript class (translated from the vanilla JS in Part 1)
2. `crossOrigin = 'anonymous'` + `createMediaElementSource` in `speak()`
3. Mouth layer HTML inside the component render
4. CSS variables + transforms injected via `<style>` tag in component

**Key constraint: `createMediaElementSource` limitation**
- Can only be called **once per audio element** — the `_sophiaConnected` guard handles this
- If we reuse `preUnlockedAudioRef`, we must call `initialize()` on it before swapping src
- If we create `new Audio()` each time, we must call `initialize()` fresh each time (new source node)
- The analyser `AudioContext` must be the SAME one created in the tap handler (`audioCtxRef`)

**Critical integration point:**
```typescript
// MUST happen in this order:
audio.crossOrigin = 'anonymous';     // 1. Before ANYTHING else
lipSyncEngine.initialize(audio, ctx); // 2. Before src — creates MediaElementSource
audio.src = blobUrl;                  // 3. After init
audio.load();
// canplay → play() → lipSyncEngine.start()
```

**Mouth positioning challenge:**
Sophia's portrait is a full-height image (`objectFit: cover`). The mouth container is `position: absolute; bottom: 35%; left: 50%`. On mobile (stacked layout, `height: 64vw`) vs desktop (full height panel), the pixel position of Sophia's mouth in the image will differ. Will need calibration per breakpoint.

**Risk:** Medium. The Web Audio API path introduces one known constraint — if `createMediaElementSource` is called on the same element twice, it throws. Must be handled carefully with the pre-unlocked element reuse pattern.

**Recommended if:** You want real phoneme-driven mouth movement now.

---

### OPTION C — Staged: Audio Fix First → Lip-Sync Second
**Phase 1 (now):** Confirm audio fix works on device (c46a388 is live)
**Phase 2 (after confirmation):** Add Option B lip-sync on top

**This is the lowest-risk path.** Audio is the critical failure — lips not moving is cosmetic. Getting audio working first gives a clean baseline before adding Web Audio API complexity.

**Recommended approach.**

---

## 5. KNOWN RISKS & CONSTRAINTS

| Risk | Severity | Mitigation |
|------|----------|------------|
| `createMediaElementSource` called twice | HIGH | `_sophiaConnected` flag guard |
| `crossOrigin = 'anonymous'` must precede src | HIGH | Set it on element creation, not before play |
| Web Audio API not available on all browsers | MEDIUM | `try/catch` around init — audio still plays without analyser |
| Mouth position alignment across breakpoints | MEDIUM | CSS `clamp()` + per-breakpoint `bottom`/`left` values |
| `preUnlockedAudioRef` consumed on first speak | LOW | Already handled — nulled after first use, `new Audio()` fallback |
| iOS Safari AudioContext suspended state | LOW | `audioCtx.resume()` already called in `handleAudioUnlock` |
| Blob URL leak on component unmount | LOW | `URL.revokeObjectURL` on ended/error/cleanup — already in fix |

---

## 6. WHAT NEEDS LAWRENCE'S DECISION BEFORE PROCEEDING

1. **Confirm Option A, B, or C** — test audio on device first, or add lip-sync in this same pass?

2. **Sophia portrait mouth position** — the mouth overlay needs calibration. Is the current portrait (`/assets/sophia-lipsync-portrait.png`) a tight face crop or full body? On a tight face crop `bottom: 35%` works. On full-body it will need adjustment.

3. **Pre-unlocked element + Web Audio API** — the pre-unlocked element is created as `new Audio(SILENCE_MP3)`. If we attach `createMediaElementSource` to it, then swap src, the analyser will automatically analyze the new audio — this is correct behavior. But if the pre-unlocked element is `null` (already consumed) and we create `new Audio()`, we need a fresh `createMediaElementSource` each time. This is fine but must be explicitly coded.

4. **Emotion detection system** — Lawrence asked if we should build it. This would be Phase 3 after audio + lip-sync are confirmed working. Recommend deferring until Phase 2 is live.

---

## 7. RECOMMENDED IMPLEMENTATION ORDER

```
Step 1 — ALREADY DONE: Audio fix (c46a388) deployed
Step 2 — TEST ON DEVICE: Lawrence confirms "▶️ PLAYING — audio confirmed!" in debug toast
Step 3 — GO SIGNAL: Lawrence approves lip-sync implementation
Step 4 — Translate SophiaLipSyncEngine to TypeScript (from Part 1)
Step 5 — Add crossOrigin + initialize() to speak() in SophiaMobileLipSync.tsx
Step 6 — Add mouth HTML layers to render()
Step 7 — Add CSS via <style> tag in component
Step 8 — Calibrate mouth position to portrait
Step 9 — Remove debug toast
Step 10 — QA: desktop + tablet + mobile × speaking + idle + ended states
Step 11 — Commit + deploy
Step 12 — Lawrence confirms lip-sync working
Step 13 — (Optional) Emotion detection system
```

---

## 8. SUMMARY

| Item | Status |
|------|--------|
| Root cause identified | ✅ Confirmed |
| Audio fix implemented | ✅ commit c46a388, live on Render |
| Backend clean | ✅ Confirmed by debug page |
| Lip-sync engine (Part 1) | ⏳ Awaiting go signal |
| Audio player integration (Part 2) | ⏳ Awaiting go signal |
| Mouth HTML structure (Part 3) | ⏳ Awaiting go signal |
| CSS animations (Part 4) | ⏳ Awaiting go signal |
| Video fallback (Part 5) | ⏳ Low priority — Wav2Lip path already exists |
| Mobile unlock (document-level) | ⏳ Minor addition needed |
| Emotion detection | ⏳ Phase 3 — defer until audio+lip-sync confirmed |
| Debug toast removal | ⏳ After audio confirmed on device |

**Nothing proceeds until Lawrence gives the go signal.**
