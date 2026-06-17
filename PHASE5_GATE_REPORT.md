# Phase 5 — n8n Automation Gate Report
**Ghaafeedi Music · Enterprise AI Orchestration Platform**
**Date:** Wednesday, June 17, 2026
**Status:** ✅ COMPLETE — AWAITING LAWRENCE APPROVAL

---

## Summary

Phase 5 wires all critical Ghaafeedi Music business events into a Railway-hosted n8n automation layer. Five workflows handle the full order-to-delivery-to-retention loop with zero blocking on the main API path.

---

## Deliverables

### 5 n8n Workflow JSON Files

| # | File | Trigger | Purpose |
|---|------|---------|---------|
| 1 | `01-order-paid-production-job.json` | `POST /webhook/gm-order-paid` | New order → create orchestration job → confirm to customer |
| 2 | `02-job-failed-alert.json` | `POST /webhook/gm-job-failed` | Job failure → admin alert email → retry notification |
| 3 | `03-job-complete-delivery.json` | `POST /webhook/gm-job-complete` | Job done → delivery email to customer → mark order delivered |
| 4 | `04-daily-revenue-digest.json` | Cron `0 8 * * *` (08:00 UTC) | Pull 24h revenue → HTML email → send to admin |
| 5 | `05-subscription-cancelled-reengage.json` | `POST /webhook/gm-subscription-cancelled` | Cancelled member → Sophia AI re-engagement email w/ 20% return offer |

All files at: `/home/user/ghaafeedi-music/n8n-workflows/`

---

### API Routes — `GET/POST /api/automations/*`

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/automations/status` | Admin header | List all 5 automations, webhook URLs, n8n config state |
| `POST /api/automations/test/:name` | Admin header | Fire test event to n8n for any automation |
| `GET /api/automations/digest` | n8n shared secret | Revenue data pull — called by n8n cron workflow |
| `POST /api/automations/inbound/:event` | n8n shared secret | n8n callbacks back (delivery-sent, digest-sent, reengage-sent) |

File: `packages/web/src/api/routes/automations.ts`

---

### n8n Dispatcher — `packages/web/src/api/orchestration/n8n-dispatcher.ts`

Typed fire-and-forget dispatchers for all 5 automation events. All calls use `.catch(() => {})` — never block main job/order flow.

```typescript
n8nDispatcher.orderPaid({ orderId, userId, productSlug, ... })
n8nDispatcher.jobFailed({ jobId, userId, jobType, error, willRetry, ... })
n8nDispatcher.jobComplete({ jobId, userId, deliveryUrl, previewUrl, ... })
n8nDispatcher.subscriptionCancelled({ userId, customerEmail, planName, ... })
// Automation 4 (digest) is triggered by n8n cron, not by dispatcher
```

---

### Integration Points — Existing Route Updates

| File | What Was Wired |
|------|---------------|
| `routes/orders.ts` | `n8nDispatcher.orderPaid()` fires on `POST /api/orders` (new order) |
| `routes/orders.ts` | `n8nDispatcher.subscriptionCancelled()` fires on `PATCH /api/orders/:id` when `status=cancelled` |
| `orchestration-engine.ts` | `n8nDispatcher.jobComplete()` fires after `EventBus.publish("job.complete", ...)` |
| `orchestration-engine.ts` | `n8nDispatcher.jobFailed()` fires after `EventBus.publish("job.failed", ...)` |
| `api/index.ts` | `automations` router registered at `/automations` |

---

### Environment Variables Added

```env
# packages/web/.env
N8N_WEBHOOK_BASE=https://n8n.your-railway-app.railway.app   # set after Railway deploy
N8N_WEBHOOK_SECRET=gm-n8n-secret-2026-prod                  # change before prod
ADMIN_EMAIL=admin@ghaafeedi.com
```

---

## QA Results

### TypeScript
```
cd packages/web && bun tsc --noEmit
EXIT: 0  (0 errors)
```

### API Live Test — `GET /api/automations/status`
```json
{
  "n8nConfigured": false,
  "n8nBase": null,
  "webhooks": [
    { "key": "orderPaid",              "path": "/webhook/gm-order-paid",               "url": null },
    { "key": "jobFailed",              "path": "/webhook/gm-job-failed",               "url": null },
    { "key": "jobComplete",            "path": "/webhook/gm-job-complete",             "url": null },
    { "key": "subscriptionCancelled",  "path": "/webhook/gm-subscription-cancelled",  "url": null }
  ],
  "automations": [
    { "id": 1, "name": "Order Paid → Production Job",         "trigger": "order.paid",             "status": "unconfigured" },
    { "id": 2, "name": "Job Failed → Retry + Admin Alert",    "trigger": "job.failed",             "status": "unconfigured" },
    { "id": 3, "name": "Job Complete → Customer Delivery",    "trigger": "job.complete",           "status": "unconfigured" },
    { "id": 4, "name": "Daily Revenue Digest",                "trigger": "cron: 08:00 UTC",        "status": "unconfigured" },
    { "id": 5, "name": "Subscription Cancelled → Re-engage",  "trigger": "subscription.cancelled", "status": "unconfigured" }
  ],
  "checkedAt": "2026-06-17T00:44:44.232Z"
}
```
✅ All 5 automations registered. Status "unconfigured" is correct — n8n deploys after Lawrence approves.

---

## Architecture

```
Ghaafeedi API                    n8n (Railway Docker)
─────────────────                ────────────────────
Order created ──────────────────▶ Webhook: gm-order-paid
                                   → Create orchestration job
                                   → Email confirmation to customer
                                   → POST /api/automations/inbound/order-queued

Job failed ─────────────────────▶ Webhook: gm-job-failed
                                   → Admin alert email (retry info)

Job complete ───────────────────▶ Webhook: gm-job-complete
                                   → Delivery email to customer
                                   → POST /api/automations/inbound/delivery-sent
                                     → DB: orders.status = "delivered"

Cron 08:00 UTC ──── n8n cron ──▶ GET /api/automations/digest
                                   → Build HTML revenue email
                                   → Send to admin
                                   → POST /api/automations/inbound/digest-sent

Sub cancelled ──────────────────▶ Webhook: gm-subscription-cancelled
                                   → Sophia AI re-engagement email (20% offer)
                                   → POST /api/automations/inbound/reengage-sent
```

**Security:**
- All Ghaafeedi → n8n calls include `X-GM-Secret` header
- All n8n → Ghaafeedi calls validated against same secret
- Fire-and-forget pattern — n8n failures never affect customer-facing API

---

## Railway Deployment Instructions (Lawrence's Action)

### Step 1 — Add n8n Service to Railway Project

1. Open your Railway project → **New Service** → **Docker Image**
2. Image: `n8nio/n8n:latest`
3. Service name: `ghaafeedi-n8n`

### Step 2 — Set Environment Variables on n8n Service

```
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<choose-strong-password>
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://<your-n8n-railway-domain>.railway.app
GM_API_BASE=https://<your-ghaafeedi-api-domain>
GM_WEBHOOK_SECRET=gm-n8n-secret-2026-prod
GM_ADMIN_EMAIL=admin@ghaafeedi.com
GM_ADMIN_QA_KEY=<admin-api-key>
```

### Step 3 — Add Persistent Volume

- Mount path: `/home/node/.n8n`
- Size: 1GB minimum (stores credentials + workflow data)

### Step 4 — Import Workflows

1. Open n8n UI at your Railway domain
2. **Settings** → **Import Workflow** for each file in `n8n-workflows/`:
   - `01-order-paid-production-job.json`
   - `02-job-failed-alert.json`
   - `03-job-complete-delivery.json`
   - `04-daily-revenue-digest.json`
   - `05-subscription-cancelled-reengage.json`
3. For each workflow, create required credentials:
   - **HTTP Header Auth** (`gm-api-auth`): Header Name = `X-GM-Secret`, Value = your `GM_WEBHOOK_SECRET`
   - **SMTP** (`ghaafeedi-smtp`): Your email SMTP credentials (Resend SMTP or SendGrid)

### Step 5 — Update Ghaafeedi API `.env`

```env
N8N_WEBHOOK_BASE=https://<your-n8n-railway-domain>.railway.app
N8N_WEBHOOK_SECRET=gm-n8n-secret-2026-prod
```

### Step 6 — Activate All Workflows

Toggle each workflow to **Active** in n8n UI. Status endpoint will show `"status": "active"` for all 5.

### Step 7 — Test

```bash
# From Ghaafeedi admin panel or curl:
curl -X POST https://your-api/api/automations/test/order-paid -H "x-user-role: admin"
curl -X POST https://your-api/api/automations/test/job-failed -H "x-user-role: admin"
curl -X POST https://your-api/api/automations/test/job-complete -H "x-user-role: admin"
curl -X POST https://your-api/api/automations/test/subscription-cancelled -H "x-user-role: admin"
```

---

## Phase 5 Completion Checklist

| Item | Status |
|------|--------|
| `01-order-paid-production-job.json` written | ✅ |
| `02-job-failed-alert.json` written | ✅ |
| `03-job-complete-delivery.json` written | ✅ |
| `04-daily-revenue-digest.json` written | ✅ |
| `05-subscription-cancelled-reengage.json` written | ✅ |
| `n8n-dispatcher.ts` written | ✅ |
| `routes/automations.ts` written | ✅ |
| `orders.ts` patched (orderPaid + subscriptionCancelled) | ✅ |
| `orchestration-engine.ts` patched (jobComplete + jobFailed) | ✅ |
| `api/index.ts` updated | ✅ |
| `.env` updated | ✅ |
| TypeScript: 0 errors | ✅ |
| API live test: 200 OK | ✅ |
| Railway deployment guide written | ✅ |

---

## What Comes After Approval

- Lawrence deploys n8n to Railway (15 min following guide above)
- Set `N8N_WEBHOOK_BASE` in Ghaafeedi `.env`
- Import 5 workflow JSONs, configure credentials, activate
- Run test triggers from admin panel
- All 5 automations go live

**No further code changes required after this approval.**

---

*Ghaafeedi Music — Phase 5 n8n Automation | Generated June 17, 2026*
