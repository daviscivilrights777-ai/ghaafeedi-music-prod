# Phase 8 — Lip Sync Email Delivery + Admin Monitor + Sophia Chat Awareness

## Status: IN PROGRESS

## Scope (3 deliverables)

### D1: Email Delivery Notifications (Resend)
- Trigger: when lip_sync job transitions to `complete` or `failed`
- Hook into orchestration engine worker event or poll-based checker
- Email template: cinematic dark HTML (Ghaafeedi brand), gold CTA
  - Complete: "Your Sophia Lip Sync is Ready" — preview link + download button
  - Failed: "Lip Sync Issue — We're On It" — retry link + support link
- Route: worker.ts listens for job status change → calls Resend
- Resend API key: re_E1QtSiUu_9u85HapTabWqUE7TPb1JNYqu
- From: "Ghaafeedi Music <noreply@ghaafeedimusic.com>"

### D2: Admin Panel Lip Sync Monitor Tab
- New tab in admin panel: "Lip Sync Jobs"
- Route: /admin/lipsync
- Table: all lip_sync jobs across all users, columns: jobId / member / status / provider / queued / cost / output link
- Filters: status (all/pending/processing/complete/failed)
- Actions: retry (re-queue failed), cancel (pending only)
- Stats row: total / complete / pending / failed / avg processing time

### D3: Sophia Chat Awareness
- Sophia companion chat (existing) gains context about member's lip sync jobs
- When member asks about lip sync status → Sophia returns real data
- System prompt injection: inject lipsyncJobs[] summary into Sophia's context
- Trigger phrases: "lip sync", "sophia video", "my video", "lipsync status"
- Response: job count, latest status, output URL if complete, ETA if pending

## Build Order
1. D2 Admin tab (no external deps, fastest)
2. D1 Email notifications (Resend integration)
3. D3 Sophia awareness (requires D1 complete for full context)

## Files to touch
- packages/web/src/api/routes/admin.ts (D2)
- packages/web/src/web/pages/admin.tsx (D2)
- packages/web/src/api/orchestration/worker.ts (D1)
- packages/web/src/api/routes/email.ts (D1 — new or existing)
- packages/web/src/api/routes/sophia.ts (D3)

## QA Checkpoints
- 0 TS errors
- Admin lipsync tab: desktop/tablet/mobile (3 shots)
- Email HTML preview (mb screenshot of template)
- Sophia chat responds to "what's my lip sync status" with job data
- Git commit + push → Render auto-deploy
- Gate report: PHASE8_GATE_REPORT.md

## Done
- [ ] D2 Admin tab
- [ ] D1 Email notifications
- [ ] D3 Sophia awareness
- [ ] TS check clean
- [ ] QA screenshots
- [ ] Gate report
- [ ] Git commit + push
