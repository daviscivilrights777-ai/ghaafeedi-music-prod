# Revision Intake Flow — Build Plan
## AI Songs + Music Video Product Line (Line 2)

### ARCHITECTURE

```
RevisionIntakeFlow.tsx          ← Customer-facing page at /revisions/submit
  ↓
SophiaRevisionGuide.tsx         ← Orchestrates the multi-step guided conversation
  ↓
<SophiaAvatarRenderer />        ← Provider-agnostic slot
  provider="simli"|"did"|"ltx"|"heygen"|"static"
  (driven by feature flag AVATAR_PROVIDER + member tier)
  ↓
RevisionJobPayload (typed struct) ← Validated JSON built from intake form
  ↓
POST /api/revisions/submit       ← New route
  ↓
OrchestrationEngine.submitJob()  ← Existing engine
  ↓
ltx_retake JobType               ← New job type
  ↓
Admin /admin/revisions page      ← Monitor + approve + dispatch
```

---

### FILES TO CREATE/MODIFY

#### NEW Files
1. `packages/web/src/web/pages/revision-intake.tsx` — `/revisions/submit` page
2. `packages/web/src/web/components/revision/RevisionIntakeFlow.tsx` — wizard shell
3. `packages/web/src/web/components/revision/SophiaRevisionGuide.tsx` — Sophia-guided conversation
4. `packages/web/src/web/components/revision/SophiaAvatarRenderer.tsx` — agnostic avatar slot
5. `packages/web/src/web/components/revision/RevisionSteps.tsx` — step components (1-6)
6. `packages/web/src/api/routes/revisions.ts` — POST /submit, GET /:id, GET /my
7. `packages/web/src/api/orchestration/adapters/ltx-adapter.ts` — LTX Studio provider
8. `packages/web/src/web/pages/admin/admin-revisions.tsx` — admin panel page

#### MODIFY
- `packages/web/src/api/orchestration/job-queue.ts` — add `ltx_retake` JobType
- `packages/web/src/api/orchestration/orchestration-engine.ts` — add ltx_retake cost/value
- `packages/web/src/api/index.ts` — wire revisions route
- `packages/web/src/web/app.tsx` — add routes /revisions/submit + /admin/revisions
- `packages/web/src/api/database/pg-schema.ts` — add `revisionRequests` table
- `packages/web/src/api/routes/admin.ts` — add /admin/revisions stats

---

### DB: revisionRequests table
- id, userId, orderId, productionId, productSlug, tier
- revisionRound (1|2|3)
- avatarProvider (which Sophia was used)
- status: pending | approved | in_progress | complete | rejected
- requestPayload (jsonb) — full RevisionJobPayload
- adminNotes, dispatchedJobId
- createdAt, updatedAt

---

### RevisionJobPayload (typed)
```ts
interface RevisionJobPayload {
  revisionId: string;
  orderId: string;
  productionId: string;
  productSlug: string;
  tier: "starter"|"premium"|"elite";
  revisionRound: number;
  
  // Song revision fields
  song?: {
    currentSongUrl: string;
    changes: {
      lyrics?: string;         // new lyric direction
      tempo?: string;          // faster/slower/specific BPM
      key?: string;            // different key
      genre?: string;          // genre shift
      mood?: string;           // emotional tone change
      structure?: string;      // add bridge / change chorus / etc.
    };
    emotionalIntent: string;   // what the customer wants to feel
    referenceTrackUrl?: string; // customer uploads a reference
  };
  
  // Music video revision fields
  video?: {
    currentVideoUrl: string;
    changes: {
      sceneChanges?: string;   // describe scene modifications
      colorGrade?: string;     // warmer/cooler/specific look
      pacing?: string;         // faster cuts / slower / etc.
      narration?: string;      // new narration direction
      transitions?: string;    // style changes
      rerender?: boolean;      // full scene re-render requested
    };
    visualReferenceUrls?: string[]; // customer uploads
  };
  
  // Combined (for products that include both)
  bothSongAndVideo: boolean;
  
  // Submission metadata
  submittedAt: string;
  customerMessage: string;     // free-form from Sophia guide
  urgency: "standard"|"priority";
  attachments?: string[];      // R2 keys of uploaded files
}
```

---

### 6-STEP REVISION WIZARD (SophiaRevisionGuide)

Step 1: Product Selector — which order/product
Step 2: Round Selector — which revision round
Step 3: Song Changes — song-specific fields (show if song product)
Step 4: Video Changes — video-specific fields (show if video product)
Step 5: Sophia Interview — she asks 3 clarifying questions via avatar
Step 6: Review & Submit — show full payload, confirm, submit

---

### SophiaAvatarRenderer providers
- `simli` — WebRTC, desktop only (current)
- `did` — REST API, works everywhere (fallback)
- `static` — animated SVG/CSS Sophia, works always (zero cost)
- `ltx` — LTX Studio talking-head (Phase later)
- `heygen` — HeyGen LiveAvatar (enterprise tier)

Feature flag: `AVATAR_PROVIDER` env var OR member tier override
- Starter/Creator → `static` (animated)
- Premium → `did`  
- Elite → `simli` (desktop) / `did` (mobile)
- Admin override → any

---

### ltx_retake JobType
Cost: 400¢ (LTX Studio video-to-video retake)
Value: 1500¢ (revision round value)
Provider: ltx-adapter → POST to LTX Studio API

---

### ADMIN /admin/revisions
- KPI row: Pending / In Progress / Completed / Rejected this week
- Table: revision requests with order info, product, round, status
- Actions: Approve → dispatch ltx_retake job | Reject + message | View payload JSON
- Linked from admin sidebar
