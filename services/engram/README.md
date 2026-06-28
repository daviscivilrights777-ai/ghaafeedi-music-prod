# Engram — Railway Deploy for Ghaafeedi Music

Self-hosted [engram.to](https://engram.to) memory service.  
Source: [github.com/Harshitk-cp/engram](https://github.com/Harshitk-cp/engram) · Apache-2.0

---

## Deploy Steps

### 1. Create a new Railway service from this repo

Railway → New Project → "Deploy from GitHub repo" → point at the engram repo (NOT the ghaafeedi-music repo).

**Use this repo:** `https://github.com/Harshitk-cp/engram`

Railway auto-detects the `Dockerfile`. No extra config needed in the Railway UI — all config is via env vars below.

---

### 2. Add a PostgreSQL database to the same Railway project

Railway → Add Service → Database → PostgreSQL  

Copy the `DATABASE_URL` Railway generates. Engram runs its own migrations automatically on first start via `serve` (or you can run `docker compose exec server /engram migrate` locally).

---

### 3. Set environment variables in Railway

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | ✅ | Railway PostgreSQL URL (from step 2) |
| `SERVER_PORT` | ✅ | `8080` |
| `ENGRAM_SETUP_TOKEN` | ✅ | Any strong random string — needed only once for bootstrap |
| `LLM_PROVIDER` | ✅ | `openai` |
| `EMBEDDING_PROVIDER` | ✅ | `openai` |
| `OPENAI_API_KEY` | ✅ | `sk-proj-bhfAM9APL...` (Ghaafeedi prod key) |
| `LOG_LEVEL` | optional | `info` |
| `RATE_LIMIT_RPS` | optional | `100` |
| `CORS_ALLOWED_ORIGINS` | optional | `https://ghaafeedi-music.onrender.com` |

> **RAZORPAY keys** — leave unset for self-hosted. Without them, quotas are NOT enforced (unmetered).

---

### 4. Bootstrap (one-time after first deploy)

After the service goes green in Railway, run this **once**:

```bash
curl -X POST https://YOUR-ENGRAM-URL.up.railway.app/v1/setup \
  -H "X-Setup-Token: YOUR_ENGRAM_SETUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"org_name": "Ghaafeedi Music"}'
```

Response:
```json
{
  "api_key": "mk_xxxxxxxxxxxxxxxx",   ← SAVE THIS — shown only once
  "tenant_id": "..."
}
```

Set `ENGRAM_API_KEY=mk_xxx...` on the **Render** app (ghaafeedi-music main app).

---

### 5. Register the Sophia agent (one-time)

```bash
curl -X POST https://YOUR-ENGRAM-URL.up.railway.app/v1/agents \
  -H "Authorization: Bearer mk_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"external_id": "sophia-global", "name": "Sophia AI Companion"}'
```

Response:
```json
{ "id": "AGENT-UUID-HERE" }
```

Set `ENGRAM_AGENT_ID=AGENT-UUID-HERE` on Render.

---

### 6. Set env vars on Render (main app)

Add to Render → ghaafeedi-music → Environment:

```
ENGRAM_BASE_URL=https://YOUR-ENGRAM-URL.up.railway.app
ENGRAM_API_KEY=mk_xxxxxxxxxxxxxxxx
ENGRAM_AGENT_ID=AGENT-UUID-HERE
```

---

### 7. Verify

```bash
# Health check
curl https://YOUR-ENGRAM-URL.up.railway.app/health

# Verify from the Ghaafeedi admin panel
# GET https://ghaafeedi-music.onrender.com/api/memory/health
# (requires admin session)
```

---

## Agent Namespace Convention (Ghaafeedi Music)

| Agent | external_id | Purpose |
|---|---|---|
| Sophia AI chat | `sophia_{userId}` | Per-user conversational memory |
| Revision intake | `revision_{userId}` | User revision history + directives |
| Pipeline | `pipeline_{productType}` | Shared production learnings |

Memories use `anchor_external_id = userId` for per-subject GDPR erasure.

---

## Quotas

Engram is unmetered when Razorpay is not configured. Self-hosted = unlimited memories.

## Engram Console

Once live, the admin console is at:  
`https://YOUR-ENGRAM-URL.up.railway.app/console`

Create an account there to browse memories, inspect the audit chain, and manage API keys.

---

## Useful Links

- [Engram docs](https://docs.hakuya.ai)
- [API reference](https://docs.hakuya.ai/api)
- [GitHub repo](https://github.com/Harshitk-cp/engram)
