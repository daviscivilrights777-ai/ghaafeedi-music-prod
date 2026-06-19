# Modal Assembly Worker — Setup Guide

Estimated time: **10 minutes**

---

## Step 1 — Create Modal Account

1. Go to **https://modal.com**
2. Sign up (GitHub login is fastest)
3. You get **$30 free credit/month** — plenty for assembly jobs

---

## Step 2 — Install Modal CLI

On your local machine (Mac/Linux terminal):

```bash
pip install modal
modal token new
```

This opens a browser to authenticate. Paste the token when prompted.

---

## Step 3 — Deploy the Script

```bash
# From the ghaafeedi-music/modal/ folder
cd modal
modal deploy ghaafeedi_assemble.py
```

You'll see output like:
```
✓ Created objects.
├── 🔨 Created mount ...
├── 🔨 Created ghaafeedi-assemble-run => https://ghaafeedi--ghaafeedi-assemble-run.modal.run
└── 🔨 Created ghaafeedi-assemble-status => https://ghaafeedi--ghaafeedi-assemble-status.modal.run
```

**Copy those two URLs** — you need them for Render.

---

## Step 4 — Get Modal Token for Render

```bash
modal token show
```

This shows:
```
Token ID:     ak-xxxxxxxxxxxxxxxxxx
Token Secret: as-xxxxxxxxxxxxxxxxxx
```

---

## Step 5 — Add to Render Environment Variables

In your Render dashboard → **ghaafeedi-music** service → **Environment**:

| Key | Value |
|-----|-------|
| `MODAL_ASSEMBLY_URL` | `https://ghaafeedi--ghaafeedi-assemble-run.modal.run` |
| `MODAL_TOKEN_ID` | `ak-xxxxxxxxxxxxxxxxxx` |
| `MODAL_TOKEN_SECRET` | `as-xxxxxxxxxxxxxxxxxx` |

Click **Save Changes** → Render will redeploy automatically.

---

## Step 6 — Verify It Works

After Render redeploys, hit:

```
GET https://your-render-url.onrender.com/api/providers/health
```

You should see `modal_ffmpeg: healthy` in the response.

---

## What It Does

When a video production job reaches the `edit_assemble` stage, the orchestration engine:

1. Sends all clip URLs + audio URLs to this Modal worker
2. Modal downloads the clips, runs FFmpeg to concat with crossfade transitions
3. Mixes narration (85%) + background music (15%)
4. Adds credits fade out
5. Uploads the final MP4 to your Cloudflare R2 bucket
6. Returns the CDN URL back to the engine
7. Engine marks job `complete` and fires n8n delivery notification

---

## Cost Estimate

- ~$0.30–$0.50 per video assembled (30-60s GPU time)
- T4 GPU @ ~$0.02-0.04/s
- Your $30/mo free credit = ~60–100 free assemblies/month

---

## Troubleshooting

**Deploy fails with "no module named modal"**
→ `pip install modal` first

**"Permission denied" on token**
→ Run `modal token new` again

**Assembly times out**
→ Normal for long videos (10-15 clips). Modal timeout is set to 10 minutes — enough for any product tier.

**Clips not downloading**
→ Check your FAL.ai output URLs are publicly accessible (they are by default)
