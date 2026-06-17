# Ghaafeedi Music — Phase 2 Blocker Removal Guide
### Complete Account Setup & Handoff Instructions
**For:** Lawrence Davis  
**Purpose:** Remove every Phase 2 blocker by setting up all required accounts in the exact right order  
**Format:** Step-by-step. Click-by-click. What you do. What you give me. Nothing skipped.

---

## How This Guide Works

Every section follows the same structure:

> **WHAT IT IS** — Why you need this account in plain language  
> **WHAT YOU DO** — Exact steps, where to click, what to fill in  
> **WHAT YOU GIVE ME** — The exact values you copy and send so I can wire it into the app  

You do the accounts. I do the code. This guide tells you exactly where the handoff happens.

**Do these in order. Each one builds on the last.**

---

## Setup Order (Sequence Matters)

| # | Account / Service       | Why First              | Time Required |
|---|-------------------------|------------------------|---------------|
| 1 | Railway (PostgreSQL)    | App's database         | 10 minutes    |
| 2 | Upstash (Redis)         | Job queue              | 5 minutes     |
| 3 | Infisical               | Secrets vault          | 15 minutes    |
| 4 | OpenAI                  | AI brain               | 5 minutes     |
| 5 | FAL.ai                  | Video generation       | 5 minutes     |
| 6 | Suno / Sunor.cc         | Music generation       | 10 minutes    |
| 7 | ElevenLabs              | Voice / narration      | 5 minutes     |
| 8 | Modal                   | Backup GPU compute     | 5 minutes     |
| 9 | Vast.ai                 | Overflow GPU compute   | 5 minutes     |
| 10| Cloudflare R2           | File storage / CDN     | 10 minutes    |
| 11| Resend                  | Transactional email    | 5 minutes     |
| 12| Google OAuth            | Google login           | 10 minutes    |
| 13| Betterstack             | Uptime monitoring      | 5 minutes     |
| 14| Railway Staging Env     | Test environment       | 5 minutes     |
| 15| Final Handoff           | Send me everything     | 5 minutes     |

**Total estimated time: ~1.5 to 2 hours**

---

---

# STEP 1 — Railway: PostgreSQL Database

## What It Is
Railway already hosts your app server. You need to add a PostgreSQL database to the same project. This replaces the current Turso database for all new production features.

---

## What You Do

### 1.1 — Open Your Railway Project
1. Go to **railway.app** in your browser
2. Click **"Login"** → log in with your account
3. You should see your Ghaafeedi Music project. Click on it.
4. You'll see the main project canvas with your services on it.

### 1.2 — Add PostgreSQL
1. Click the **"+ New"** button (top right of the canvas, or a "+" icon in the canvas area)
2. In the popup that appears, click **"Database"**
3. Click **"Add PostgreSQL"**
4. Railway will spin up a PostgreSQL instance. Wait about 30 seconds — it'll appear on the canvas.

### 1.3 — Get the Connection String
1. Click on the PostgreSQL service that just appeared on the canvas
2. Click the **"Variables"** tab
3. You'll see a list of auto-generated variables. Find the one called **`DATABASE_URL`** or **`POSTGRES_URL`**
4. Click the copy icon next to that value — it looks like: `postgresql://postgres:randompassword@monorail.proxy.rlwy.net:12345/railway`
5. Save that string somewhere (a notes app, your phone's notes — anything secure and private)

### 1.4 — Add It to Your App's Environment Variables
1. Go back to your main project canvas
2. Click on your **API/web service** (not the PostgreSQL service — your actual app service)
3. Click the **"Variables"** tab
4. Click **"+ New Variable"**
5. Fill in:
   - **Name:** `POSTGRES_URL`
   - **Value:** paste the connection string you copied
6. Click **"Add"**
7. Add another variable:
   - **Name:** `POSTGRES_POOL_URL`
   - **Value:** same connection string (for now — will be updated when PgBouncer is added later)
8. Click **"Add"**

### 1.5 — Confirm It's Running
1. Click back on the PostgreSQL service
2. Click the **"Data"** tab or **"Connect"** tab
3. You should see an empty database ready to go (no tables yet — that's fine, I'll run migrations)

---

## What You Give Me

Send me these exact values:

```
POSTGRES_URL = [the full connection string you copied]
```

That's it for Railway PostgreSQL. Takes 10 minutes max.

---

---

# STEP 2 — Upstash: Redis Queue

## What It Is
Upstash provides a Redis database that powers the job queue. Every time a member submits a song or video order, it goes into this queue. Workers pull from this queue to process jobs. Without it, no jobs can process.

---

## What You Do

### 2.1 — Create Your Account
1. Go to **upstash.com**
2. Click **"Start for Free"** or **"Sign Up"**
3. Sign up with your Google account (easiest) or email
4. Verify your email if prompted

### 2.2 — Create a Redis Database
1. After logging in, you'll land on the Upstash console dashboard
2. Click **"Create Database"** (big button, hard to miss)
3. Fill in the form:
   - **Name:** `ghaafeedi-prod`
   - **Type:** Regional (NOT Global — Global costs more, not needed yet)
   - **Region:** Select **"US-East-1 (N. Virginia)"** — matches Railway's default region
   - **Eviction:** Toggle ON → select **"allkeys-lru"** (prevents memory overflow)
   - **TLS:** Leave ON (it is on by default)
4. Click **"Create"**
5. Wait about 10 seconds — database will appear

### 2.3 — Get Your Credentials
1. Click on the database you just created (`ghaafeedi-prod`)
2. Scroll down to the section called **"REST API"**
3. You'll see two values:
   - `UPSTASH_REDIS_REST_URL` — looks like `https://us1-xxxxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` — a long string of letters and numbers
4. Copy both. Save them in your notes.

### 2.4 — Add to Railway
1. Go back to Railway → your app service → **Variables** tab
2. Add two new variables:
   - **Name:** `UPSTASH_REDIS_REST_URL` | **Value:** the URL you copied
   - **Name:** `UPSTASH_REDIS_REST_TOKEN` | **Value:** the token you copied
3. Click **"Add"** after each one

### 2.5 — Set a Spending Alert (Important)
1. Back in Upstash console, click on your account icon (top right) → **"Billing"**
2. Look for **"Usage Alerts"** or **"Budget Alerts"**
3. Set an alert at **$20/month** so you know when you're past the free tier
4. Enter your email for alerts

---

## What You Give Me

```
UPSTASH_REDIS_REST_URL = [the URL from Upstash]
UPSTASH_REDIS_REST_TOKEN = [the token from Upstash]
```

---

---

# STEP 3 — Infisical: Secrets Vault

## What It Is
Infisical is a secure vault that stores all your API keys. Instead of putting sensitive keys directly into Railway (where they're visible in plaintext), the app fetches them from Infisical at runtime. This is how enterprise platforms protect their credentials.

---

## What You Do

### 3.1 — Create Your Account
1. Go to **app.infisical.com**
2. Click **"Sign Up"**
3. Sign up with your Google account or email
4. Complete email verification if prompted
5. When asked for organization name, enter: `Ghaafeedi Music`

### 3.2 — Create Your Production Project
1. After the onboarding, you'll see a dashboard with "Projects"
2. Click **"Create Project"** or **"New Project"**
3. Name it: `ghaafeedi-prod`
4. Click **"Create"**

### 3.3 — Create Your Development Project
1. Click **"New Project"** again
2. Name it: `ghaafeedi-dev`
3. Click **"Create"**

> You now have two projects. You will only need to fill secrets into `ghaafeedi-prod` right now. `ghaafeedi-dev` is for later when we set up a staging environment.

### 3.4 — Create a Machine Identity (Service Account for Your App)
This is how the app authenticates to Infisical to read secrets. Think of it as a login for your server.

1. Click on your **Organization name** (top left) → **"Access Control"**
2. Click **"Machine Identities"** in the left sidebar
3. Click **"Create Identity"**
4. Fill in:
   - **Name:** `gm-api-prod`
   - **Role:** Select **"Member"** (not admin — principle of least privilege)
5. Click **"Create"**
6. On the next screen, click **"Create Client Secret"**
7. A popup appears. You'll see:
   - **Client ID** — copy this
   - **Client Secret** — copy this (shown only once — do NOT close this popup until you've saved it)
8. Save both values in your notes immediately.

### 3.5 — Add the Machine Identity to Your Project
1. Click into your **`ghaafeedi-prod`** project
2. Click **"Access Control"** or **"Members"** in the left sidebar of the project
3. Click **"Add Member"** or **"Invite"**
4. Switch to the **"Machine Identities"** tab in the popup
5. Select `gm-api-prod`
6. Set role to **"Developer"** (can read secrets, cannot delete)
7. Click **"Add"**

### 3.6 — Get Your Project ID
1. Inside the `ghaafeedi-prod` project, click **"Settings"** (left sidebar, gear icon)
2. You'll see **"Project ID"** — a string like `a1b2c3d4-e5f6-...`
3. Copy it and save it.

### 3.7 — Add Railway Variables for Infisical Bootstrap
Back in Railway → your app service → Variables tab, add these:

- **Name:** `INFISICAL_CLIENT_ID` | **Value:** the Client ID from step 3.4
- **Name:** `INFISICAL_CLIENT_SECRET` | **Value:** the Client Secret from step 3.4
- **Name:** `INFISICAL_PROJECT_ID` | **Value:** the Project ID from step 3.6
- **Name:** `INFISICAL_ENV` | **Value:** `production`

> These four variables are the ONLY sensitive things that go into Railway directly. Everything else goes into Infisical.

### 3.8 — Leave the Secrets Page Open
Keep Infisical open in a tab. You'll be adding secrets to it throughout steps 4–13 below. Every time a section says "Add to Infisical," come back to this tab.

**How to add a secret in Infisical:**
1. Inside `ghaafeedi-prod` project
2. Click **"Secrets"** in the left sidebar
3. Make sure you're on the **"production"** environment (tab at top)
4. Click **"+ Add Secret"** button
5. Enter the **Key** name and **Value**
6. Click **"Save"** or press Enter

---

## What You Give Me

```
INFISICAL_CLIENT_ID = [Client ID from step 3.4]
INFISICAL_CLIENT_SECRET = [Client Secret from step 3.4]
INFISICAL_PROJECT_ID = [Project ID from step 3.6]
```

---

---

# STEP 4 — OpenAI: AI Analysis & Sophia

## What It Is
OpenAI powers emotion analysis (the S5 analysis step in onboarding), lyrics generation, storyboard creation, and Sophia AI Companion chat. Every single onboarding and every AI conversation runs through OpenAI.

---

## What You Do

### 4.1 — Create / Log Into Your Account
1. Go to **platform.openai.com**
2. Sign up or log in
3. If new: verify email, complete account setup

### 4.2 — Add a Payment Method
1. Click on your **account name** (top right) → **"Billing"**
2. Click **"Add payment method"**
3. Add a credit card
4. Under **"Credit grants / Auto-recharge"**, set:
   - Initial credit: $20 is fine to start
   - Enable **"Auto-recharge"** at $5 remaining, add $20 at a time

### 4.3 — Set a Spending Limit (Critical)
1. Still in Billing, find **"Usage limits"**
2. Set **"Hard limit"** to **$200/month**
3. Set **"Soft limit"** (email warning) to **$150/month**
4. Click **"Save"**

> This prevents a runaway AI bug from draining your account.

### 4.4 — Create an API Key
1. Click **"API keys"** in the left sidebar (or go to platform.openai.com/api-keys)
2. Click **"+ Create new secret key"**
3. Name it: `ghaafeedi-prod`
4. Set permissions: **"All"** (for now)
5. Click **"Create secret key"**
6. **IMPORTANT:** A popup shows your key starting with `sk-proj-...` or `sk-...`
7. Click the copy icon. This key is shown **only once**. Save it immediately.

### 4.5 — Add to Infisical
1. Go to Infisical → `ghaafeedi-prod` project → Secrets → production environment
2. Add secret:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** the key you just copied

---

## What You Give Me

```
OPENAI_API_KEY = [added to Infisical — confirm when done]
```

Just confirm when this step is done. I don't need the actual key.

---

---

# STEP 5 — FAL.ai: Video Generation

## What It Is
FAL.ai generates all video content — Legacy Films, Cinematic Life Stories, Couples Journey Films, Dream AI Visualizations. It is the primary video rendering engine. Without this, no video products work.

---

## What You Do

### 5.1 — Create Your Account
1. Go to **fal.ai**
2. Click **"Sign Up"** (top right)
3. Sign up with Google or email
4. Verify email if needed

### 5.2 — Add Credits / Payment Method
1. After logging in, click your **profile icon** (top right) → **"Billing"** or **"Credits"**
2. Add a payment method (credit card)
3. Add an initial credit top-up of **$50** to get started
4. Enable **auto-recharge**: when balance drops below $20, recharge by $50

### 5.3 — Set a Spending Alert
1. In billing settings, find "Spending Alerts" or "Budget Alerts"
2. Set alert when balance drops to **$10** — this gives you warning before jobs start failing

### 5.4 — Get Your API Key
1. Click your **profile icon** → **"API Keys"** (or go to fal.ai/dashboard/keys)
2. Click **"Create API Key"** or **"+ New Key"**
3. Name it: `ghaafeedi-prod`
4. Click **"Create"**
5. Copy the key that appears. Save it.

### 5.5 — Add to Infisical
1. Infisical → `ghaafeedi-prod` → Secrets → production
2. Add secret:
   - **Key:** `FAL_AI_API_KEY`
   - **Value:** the key you copied

---

## What You Give Me

```
FAL_AI_API_KEY = [added to Infisical — confirm when done]
```

Confirm when done.

---

---

# STEP 6 — Suno Music Generation (via Sunor.cc)

## What It Is
Suno is the AI music generation engine. Every song — Emotional Soundtracks, Signature Masterpieces, Relationship Healing songs, and all membership song credits — is generated through this API. Suno does not have a public direct API yet, so we use Sunor.cc (a stable third-party reseller API for Suno).

---

## What You Do

### 6.1 — Check Sunor.cc Availability First
1. Go to **sunor.cc** in your browser
2. If this loads and shows an API service: proceed with steps below
3. **If sunor.cc is unavailable or closed:** Go to **apiframe.ai** instead — they also provide a Suno API with the same structure. The steps are the same.

### 6.2 — Create Account on Sunor.cc (or Apiframe.ai)
1. Click **"Sign Up"** or **"Get Started"**
2. Create account with email
3. Verify email

### 6.3 — Add Credits / Payment
1. Go to **Billing** or **Credits** in your dashboard
2. Add a payment method
3. Purchase starting credits — **$20 worth** is a good starting amount (generates ~130–200 songs)
4. Note: Keep this balance above $10 or song generation jobs will fail silently

### 6.4 — Get Your API Key
1. Go to your dashboard → **"API Keys"** section
2. Generate or copy your API key
3. Also note the **API Base URL** — it will look like `https://api.sunor.cc` or `https://api.apiframe.ai`
4. Copy both values

### 6.5 — Add to Infisical
1. Infisical → `ghaafeedi-prod` → Secrets → production
2. Add two secrets:
   - **Key:** `SUNO_API_KEY` | **Value:** your API key
   - **Key:** `SUNO_API_BASE_URL` | **Value:** the base URL (e.g., `https://api.sunor.cc`)

---

## What You Give Me

```
SUNO_API_KEY = [added to Infisical — confirm when done]
SUNO_API_BASE_URL = [added to Infisical — e.g., https://api.sunor.cc]
```

Also tell me which service you used: Sunor.cc or Apiframe.ai. I need to know so I can match the adapter code to the correct API format.

---

---

# STEP 7 — ElevenLabs: Voice & Narration

## What It Is
ElevenLabs generates AI voice narration for Legacy Films, powers the Voice Cloning Studio product, and is the engine behind Sophia AI's voice. It converts text scripts into lifelike audio.

---

## What You Do

### 7.1 — Create Your Account
1. Go to **elevenlabs.io**
2. Click **"Sign Up"** (top right)
3. Sign up with Google or email
4. Verify email

### 7.2 — Choose a Plan
1. After login, click your **profile icon** → **"Billing"** or go to elevenlabs.io/pricing
2. Select the **"Creator"** plan at **$22/month** to start
   - Gives you 100,000 characters/month
   - API access included
   - Sufficient for early operations (300–500 narration requests/month)
3. Enter payment details and confirm subscription

### 7.3 — Get Your API Key
1. Click your **profile icon** (top right) → **"Profile"** or **"API Keys"**
2. You'll see a section called **"API Key"**
3. Click the **copy icon** next to your API key (it starts with `sk_...`)
4. Save it

### 7.4 — Add to Infisical
1. Infisical → `ghaafeedi-prod` → Secrets → production
2. Add secret:
   - **Key:** `ELEVENLABS_API_KEY`
   - **Value:** the key you copied

---

## What You Give Me

```
ELEVENLABS_API_KEY = [added to Infisical — confirm when done]
```

---

---

# STEP 8 — Modal: Backup GPU Compute

## What It Is
Modal is the backup compute engine. When FAL.ai is at capacity, rate-limited, or temporarily down, video jobs automatically reroute to Modal. It's cheaper for high volumes but slightly slower. Think of it as your video generation insurance policy.

---

## What You Do

### 8.1 — Create Your Account
1. Go to **modal.com**
2. Click **"Get Started"** or **"Sign Up"**
3. Sign up with GitHub (preferred — faster) or email
4. Verify and complete onboarding steps

### 8.2 — Add Payment Method
1. After login, click your **profile/account icon** → **"Billing"**
2. Add a credit card
3. Modal uses pay-as-you-go — no minimum. You only pay when jobs run.
4. Set a billing alert at **$50/month** in your account notification settings

### 8.3 — Get Your API Token
1. Click your **profile icon** → **"Settings"** or go to modal.com/settings/tokens
2. You'll see a section called **"API Tokens"**
3. Click **"Create Token"** or **"New Token"**
4. Name it: `ghaafeedi-prod`
5. Click **"Create"**
6. You'll see two values appear:
   - **Token ID** — starts with something like `ak-...`
   - **Token Secret** — a longer secret string
7. Copy both immediately. The secret is shown only once.

### 8.4 — Add to Infisical
1. Infisical → `ghaafeedi-prod` → Secrets → production
2. Add two secrets:
   - **Key:** `MODAL_TOKEN_ID` | **Value:** the Token ID
   - **Key:** `MODAL_TOKEN_SECRET` | **Value:** the Token Secret

---

## What You Give Me

```
MODAL_TOKEN_ID = [added to Infisical — confirm when done]
MODAL_TOKEN_SECRET = [added to Infisical — confirm when done]
```

---

---

# STEP 9 — Vast.ai: Overflow GPU Compute

## What It Is
Vast.ai is a spot-market GPU rental platform. It's the cheapest compute option but the least guaranteed (machines can occasionally be reclaimed). Used only as a third-fallback for non-urgent video jobs or high-volume overflow. Optional for launch but recommended to have ready.

---

## What You Do

### 9.1 — Create Your Account
1. Go to **vast.ai**
2. Click **"Sign Up"**
3. Create account with email
4. Verify email

### 9.2 — Add Credits
1. After login, click **"Billing"** in the sidebar
2. Add a payment method
3. Add **$20 initial credit** — this is prepaid compute time
4. Vast.ai works on a prepaid credit system

### 9.3 — Get Your API Key
1. Click your **account icon** or go to **vast.ai/account** (after login)
2. Scroll to find **"API Key"** section
3. Click **"Generate"** or **"Show API Key"**
4. Copy the key

### 9.4 — Add to Infisical
1. Infisical → `ghaafeedi-prod` → Secrets → production
2. Add secret:
   - **Key:** `VAST_AI_API_KEY`
   - **Value:** the key you copied

---

## What You Give Me

```
VAST_AI_API_KEY = [added to Infisical — confirm when done]
```

---

---

# STEP 10 — Cloudflare R2: File Storage

## What It Is
Cloudflare R2 stores all generated files — songs (.mp3), videos (.mp4), voice clones, album art, and any uploaded media from members. R2 is S3-compatible, extremely cheap ($0.015/GB/month), and has **zero egress fees** (unlike AWS S3 which charges for every download).

---

## What You Do

### 10.1 — Create Cloudflare Account
1. Go to **cloudflare.com**
2. Click **"Sign Up"** (top right)
3. Create account with email
4. Verify email
5. You don't need to add a domain or site — just the account itself

### 10.2 — Navigate to R2
1. After login, in the left sidebar find **"R2 Object Storage"**
2. If you don't see it, click **"Storage & Databases"** → **"R2"**
3. First time: you may need to click **"Purchase R2"** — it costs $0 to enable, only billed for what you use

### 10.3 — Create a Storage Bucket
1. Click **"Create bucket"**
2. Name it: `ghaafeedi-media` (lowercase, hyphens OK, no spaces)
3. Location: **"Automatic"** is fine
4. Click **"Create bucket"**

### 10.4 — Make Bucket Publicly Readable (for serving files)
1. Click on your `ghaafeedi-media` bucket
2. Click **"Settings"** tab
3. Scroll to **"Public access"**
4. Toggle **"Allow public access"** → ON
5. Cloudflare will generate a public URL for the bucket — copy it. Looks like: `https://pub-xxxxxxxxxxxx.r2.dev`
6. Save this URL — it's your `R2_PUBLIC_URL`

### 10.5 — Create API Token for R2
1. Go back to your Cloudflare dashboard main page
2. Click your **account icon** (top right) → **"My Profile"** or go to dash.cloudflare.com/profile/api-tokens
3. Click **"API Tokens"** tab
4. Click **"Create Token"**
5. Click **"Use template"** → select **"Edit Cloudflare Workers"** OR scroll down and click **"Create Custom Token"**
6. For custom token:
   - **Token name:** `ghaafeedi-r2-prod`
   - **Permissions:** Account → R2 Storage → Edit
   - **Account Resources:** Include → your account
   - Click **"Continue to Summary"** → **"Create Token"**
7. Copy the token shown. Saved once only.

### 10.6 — Get Your Account ID
1. Go to your Cloudflare dashboard main page
2. On the right side panel, find **"Account ID"** — it's a 32-character hex string
3. Copy it

### 10.7 — Add to Infisical and Railway
**Add to Infisical** (sensitive values):
- **Key:** `R2_ACCESS_KEY_ID` | **Value:** same as the API token you created (Cloudflare R2 uses the API token as the access key in S3-compatible mode — **but see note below**)
- **Key:** `R2_SECRET_ACCESS_KEY` | **Value:** *(see note below)*
- **Key:** `R2_ACCOUNT_ID` | **Value:** your Account ID

> **Important note on R2 API credentials:** Cloudflare R2 uses a separate set of S3-compatible access keys that are different from API tokens. Here's how to get them:
> 1. Go back to R2 dashboard
> 2. Click **"Manage R2 API tokens"** (right side of R2 page)
> 3. Click **"Create API token"**
> 4. Name: `ghaafeedi-r2-s3`
> 5. Permissions: **Object Read & Write**
> 6. TTL: No expiry
> 7. Click **"Create API Token"**
> 8. You'll see:
>    - **Access Key ID** — copy this
>    - **Secret Access Key** — copy this (shown once)
> 9. Use these for `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in Infisical

**Add to Railway** (non-sensitive):
- **Key:** `R2_BUCKET_NAME` | **Value:** `ghaafeedi-media`
- **Key:** `R2_PUBLIC_URL` | **Value:** `https://pub-xxxxxxxxxxxx.r2.dev` (your bucket's public URL)

---

## What You Give Me

```
R2_ACCOUNT_ID = [added to Infisical — confirm when done]
R2_ACCESS_KEY_ID = [added to Infisical — confirm when done]
R2_SECRET_ACCESS_KEY = [added to Infisical — confirm when done]
R2_BUCKET_NAME = ghaafeedi-media [added to Railway — confirm when done]
R2_PUBLIC_URL = [the https://pub-xxx.r2.dev URL — added to Railway]
```

---

---

# STEP 11 — Resend: Transactional Email

## What It Is
Resend sends transactional emails — order confirmations, welcome emails, password resets, job completion notifications. Clean developer-focused email API. Free tier covers first 3,000 emails/month.

---

## What You Do

### 11.1 — Create Account
1. Go to **resend.com**
2. Click **"Sign Up"**
3. Sign up with GitHub (preferred) or email
4. Verify email

### 11.2 — Add and Verify Your Sending Domain
> You need a domain for this. If you have `ghaafeedi.com` (or whatever your domain is), use it. If you don't have a domain yet, skip to step 11.5 and use the Resend test domain for now.

1. After login, click **"Domains"** in the left sidebar
2. Click **"Add Domain"**
3. Enter your domain: `ghaafeedi.com`
4. Resend will show you DNS records to add (TXT and MX records)
5. Log into wherever your domain DNS is managed (GoDaddy, Namecheap, Cloudflare, etc.)
6. Add the DNS records exactly as shown
7. Come back to Resend and click **"Verify"**
8. DNS propagation can take 10–30 minutes

### 11.3 — Get Your API Key
1. Click **"API Keys"** in the left sidebar
2. Click **"Create API Key"**
3. Name it: `ghaafeedi-prod`
4. Permission: **"Sending access"**
5. Domain: Select your verified domain (or "All domains" for now)
6. Click **"Add"**
7. Copy the API key that appears (starts with `re_...`)

### 11.4 — Add to Infisical
1. Infisical → `ghaafeedi-prod` → Secrets → production
2. Add secret:
   - **Key:** `RESEND_API_KEY`
   - **Value:** the key you copied

### 11.5 — Add Sender Config to Railway
1. Railway → your app service → Variables
2. Add:
   - **Key:** `FROM_EMAIL` | **Value:** `noreply@ghaafeedi.com` (or `hello@ghaafeedi.com`)
   - **Key:** `SUPPORT_EMAIL` | **Value:** your support inbox email

---

## What You Give Me

```
RESEND_API_KEY = [added to Infisical — confirm when done]
FROM_EMAIL = [e.g., noreply@ghaafeedi.com — added to Railway]
SUPPORT_EMAIL = [your support email — added to Railway]
```

Also tell me: **what is your primary domain?** (e.g., ghaafeedi.com, ghaafeedimusic.com, etc.) I need this to configure the app's public URLs.

---

---

# STEP 12 — Google OAuth: Google Login

## What It Is
This enables the "Sign in with Google" button on your auth pages. Members can log in with their Google account instead of creating a password. Currently exists in the app but may not have live credentials yet.

---

## What You Do

### 12.1 — Go to Google Cloud Console
1. Go to **console.cloud.google.com**
2. Sign in with your Google account (use the one you want associated with this project)

### 12.2 — Create or Select a Project
1. In the top bar, there's a dropdown that shows the current project name (might say "Select a project")
2. Click it → click **"New Project"**
3. Name it: `Ghaafeedi Music`
4. Click **"Create"**
5. Wait a few seconds, then make sure you're inside this project (the dropdown at top should show "Ghaafeedi Music")

### 12.3 — Enable Google OAuth
1. In the left sidebar, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (allows any Google account to sign in)
3. Click **"Create"**
4. Fill in the form:
   - **App name:** `Ghaafeedi Music`
   - **User support email:** your email
   - **Developer contact information:** your email
   - Leave everything else blank for now
5. Click **"Save and Continue"** through all steps until you reach the summary, then click **"Back to Dashboard"**

### 12.4 — Create OAuth Credentials
1. In the left sidebar, go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `ghaafeedi-web`
5. Under **"Authorized JavaScript origins"**, click **"+ Add URI"** and add:
   - `http://localhost:4200` (for local development)
   - `https://[your-railway-app-url]` (your live URL — find it in Railway → your service → "Settings" → the public URL shown there)
6. Under **"Authorized redirect URIs"**, click **"+ Add URI"** and add:
   - `http://localhost:4200/api/auth/callback/google`
   - `https://[your-railway-app-url]/api/auth/callback/google`
7. Click **"Create"**
8. A popup appears with:
   - **Your Client ID** — looks like `123456789-xxxx.apps.googleusercontent.com`
   - **Your Client Secret** — a shorter string
9. Copy both. Click **"OK"**

### 12.5 — Add to Infisical
1. Infisical → `ghaafeedi-prod` → Secrets → production
2. Add two secrets:
   - **Key:** `GOOGLE_CLIENT_ID` | **Value:** the Client ID
   - **Key:** `GOOGLE_CLIENT_SECRET` | **Value:** the Client Secret

---

## What You Give Me

```
GOOGLE_CLIENT_ID = [added to Infisical — confirm when done]
GOOGLE_CLIENT_SECRET = [added to Infisical — confirm when done]
Your Railway app's public URL = [e.g., https://ghaafeedi-music-production.up.railway.app]
```

The Railway URL is important — I need it to configure the auth redirect and the app's base URL.

---

---

# STEP 13 — Betterstack: Uptime Monitoring

## What It Is
Betterstack sends you an instant push notification (email + SMS optional) the moment your app goes down. Free tier is completely sufficient for launch. You'll know about outages before your customers do.

---

## What You Do

### 13.1 — Create Account
1. Go to **betterstack.com**
2. Click **"Start for free"**
3. Sign up with Google or email
4. You'll land on the **"Uptime"** dashboard

### 13.2 — Create an Uptime Monitor
1. Click **"Monitors"** in the left sidebar
2. Click **"Create Monitor"**
3. Fill in:
   - **Monitor type:** HTTP/HTTPS
   - **URL:** `https://[your-railway-app-url]/api/health` (we'll build this endpoint — for now enter your Railway URL + `/api/health`)
   - **Name:** `Ghaafeedi Music API`
   - **Check frequency:** Every **3 minutes** (free tier)
4. Click **"Create Monitor"**

### 13.3 — Set Up Alert Notifications
1. Click on the monitor you just created
2. Click **"On-call"** or **"Notifications"** tab
3. Add notification:
   - **Email:** your email address
   - Notify on: **Down** and **Recovery**
4. Optional: add phone number for SMS alerts

### 13.4 — Get Your API Token (for app integration)
1. Click your **account icon** (top right) → **"Settings"** or **"Team Settings"**
2. Click **"API"** in the sidebar
3. Click **"Create API Token"**
4. Name: `ghaafeedi-app`
5. Copy the token

### 13.5 — Add to Infisical
1. Infisical → `ghaafeedi-prod` → Secrets → production
2. Add secret:
   - **Key:** `BETTERSTACK_TOKEN`
   - **Value:** the token you copied

---

## What You Give Me

```
BETTERSTACK_TOKEN = [added to Infisical — confirm when done]
```

---

---

# STEP 14 — Railway: Create Staging Environment

## What It Is
A staging environment is an identical copy of your production app that uses test/sandbox API keys. Before any feature goes live to real customers, you test it in staging first. This prevents bugs from hitting paying members.

---

## What You Do

### 14.1 — Create a Staging Environment in Railway
1. Go to Railway → your project
2. In the top bar or sidebar, look for **"Environments"** — Railway lets you create multiple environments per project
3. Click **"New Environment"**
4. Name it: `staging`
5. Click **"Create"**

### 14.2 — Add Staging-Specific Variables
1. Switch to the **staging** environment (click it in the environment dropdown)
2. Click on your app service → **Variables** tab
3. Add the following (these override production values for staging):
   - **Key:** `NODE_ENV` | **Value:** `staging`
   - **Key:** `INFISICAL_ENV` | **Value:** `staging`
   - **Key:** `POSTGRES_URL` | **Value:** create a separate Railway PostgreSQL for staging (same steps as Step 1, name it `ghaafeedi-staging`) and paste its URL here

### 14.3 — Create Staging Infisical Project
1. Go to Infisical → click **"New Project"**
2. Name it: `ghaafeedi-staging`
3. Follow the same steps as Step 3 to create a Machine Identity called `gm-api-staging`
4. Add the same secrets as production BUT use test/sandbox API keys where available:
   - OpenAI: use a separate key with a $20/month hard cap
   - FAL.ai: use the same key (FAL.ai doesn't have a sandbox mode)
   - Suno: use the same key but set a lower credit limit
   - All others: same as production for now

### 14.4 — Add Auth Variable to Railway (Both Environments)

You need to generate a `BETTER_AUTH_SECRET` — a random 32-character string used to sign authentication tokens. Here's how to generate one:

1. Go to **generate-secret.vercel.app** OR just type any 32+ random characters
2. Alternatively: in your terminal (or any online random string generator), generate a 64-character random hex string
3. Copy it

Add to Railway (production environment):
- **Key:** `BETTER_AUTH_SECRET` | **Value:** the random string you generated
- **Key:** `BETTER_AUTH_URL` | **Value:** `https://[your-production-railway-url]`
- **Key:** `NODE_ENV` | **Value:** `production`
- **Key:** `PORT` | **Value:** `3000`
- **Key:** `APP_URL` | **Value:** `https://[your-production-railway-url]`

Add to Railway (staging environment):
- **Key:** `BETTER_AUTH_SECRET` | **Value:** a DIFFERENT random string (don't reuse production)
- **Key:** `BETTER_AUTH_URL` | **Value:** `https://[your-staging-railway-url]`
- **Key:** `NODE_ENV` | **Value:** `staging`
- **Key:** `APP_URL` | **Value:** `https://[your-staging-railway-url]`

---

## What You Give Me

```
Your production Railway URL = [e.g., https://ghaafeedi-music-production.up.railway.app]
Your staging Railway URL = [e.g., https://ghaafeedi-music-staging.up.railway.app]
BETTER_AUTH_SECRET (prod) = [the random string you generated — add to Railway only, not Infisical]
```

---

---

# STEP 15 — Final Handoff: Send Me Everything

## What It Is
You've set up all accounts. Now you give me a confirmation checklist and the few non-sensitive values that I need to wire into the codebase. You do NOT send me raw API keys — those are already safe in Infisical. You confirm they're there.

---

## The Confirmation Checklist

Copy this, fill in each status, and send it to me:

```
PHASE 2 BLOCKER REMOVAL — COMPLETION CHECKLIST

STEP 1 — Railway PostgreSQL
[ ] PostgreSQL service added to Railway project
[ ] POSTGRES_URL variable added to Railway app service
[ ] POSTGRES_POOL_URL variable added to Railway app service

STEP 2 — Upstash Redis
[ ] Upstash account created
[ ] Redis database "ghaafeedi-prod" created in us-east-1
[ ] UPSTASH_REDIS_REST_URL added to Railway
[ ] UPSTASH_REDIS_REST_TOKEN added to Railway

STEP 3 — Infisical
[ ] Infisical account created
[ ] "ghaafeedi-prod" project created
[ ] "ghaafeedi-dev" project created
[ ] Machine Identity "gm-api-prod" created
[ ] Identity added to ghaafeedi-prod project
[ ] INFISICAL_CLIENT_ID added to Railway
[ ] INFISICAL_CLIENT_SECRET added to Railway
[ ] INFISICAL_PROJECT_ID added to Railway
[ ] INFISICAL_ENV = production added to Railway

STEP 4 — OpenAI
[ ] Account created / logged in
[ ] Hard spending limit set at $200/month
[ ] API key created and named "ghaafeedi-prod"
[ ] OPENAI_API_KEY added to Infisical (ghaafeedi-prod / production)

STEP 5 — FAL.ai
[ ] Account created
[ ] $50+ credits added
[ ] Auto-recharge enabled
[ ] API key created
[ ] FAL_AI_API_KEY added to Infisical

STEP 6 — Suno / Sunor.cc
[ ] Account created at: [ ] sunor.cc  OR  [ ] apiframe.ai  OR  [ ] other: _______
[ ] Credits added ($20+)
[ ] SUNO_API_KEY added to Infisical
[ ] SUNO_API_BASE_URL added to Infisical
[ ] API base URL is: _______________________

STEP 7 — ElevenLabs
[ ] Account created
[ ] Creator plan ($22/mo) activated
[ ] ELEVENLABS_API_KEY added to Infisical

STEP 8 — Modal
[ ] Account created (GitHub login recommended)
[ ] Payment method added
[ ] API token created ("ghaafeedi-prod")
[ ] MODAL_TOKEN_ID added to Infisical
[ ] MODAL_TOKEN_SECRET added to Infisical

STEP 9 — Vast.ai
[ ] Account created
[ ] $20 credits added
[ ] VAST_AI_API_KEY added to Infisical

STEP 10 — Cloudflare R2
[ ] Cloudflare account created
[ ] R2 enabled on account
[ ] "ghaafeedi-media" bucket created
[ ] Public access enabled on bucket
[ ] R2 S3-compatible API token created
[ ] R2_ACCESS_KEY_ID added to Infisical
[ ] R2_SECRET_ACCESS_KEY added to Infisical
[ ] R2_ACCOUNT_ID added to Infisical
[ ] R2_BUCKET_NAME = ghaafeedi-media added to Railway
[ ] R2_PUBLIC_URL added to Railway

STEP 11 — Resend
[ ] Account created
[ ] Domain added and verified (or test domain for now)
[ ] RESEND_API_KEY added to Infisical
[ ] FROM_EMAIL added to Railway
[ ] SUPPORT_EMAIL added to Railway

STEP 12 — Google OAuth
[ ] Google Cloud project "Ghaafeedi Music" created
[ ] OAuth consent screen configured
[ ] OAuth credentials created
[ ] GOOGLE_CLIENT_ID added to Infisical
[ ] GOOGLE_CLIENT_SECRET added to Infisical
[ ] Railway app URL added to authorized redirect URIs

STEP 13 — Betterstack
[ ] Account created
[ ] Uptime monitor created for /api/health
[ ] Email alerts configured
[ ] BETTERSTACK_TOKEN added to Infisical

STEP 14 — Railway Staging Environment
[ ] Staging environment created in Railway
[ ] Separate staging PostgreSQL provisioned
[ ] BETTER_AUTH_SECRET (prod) added to Railway production env
[ ] BETTER_AUTH_SECRET (staging) added to Railway staging env
[ ] BETTER_AUTH_URL (prod) added to Railway
[ ] NODE_ENV = production added to Railway
[ ] PORT = 3000 added to Railway
[ ] APP_URL added to Railway

---

VALUES I NEED FROM YOU (non-sensitive — safe to share):

Production Railway URL: https://____________________________
Staging Railway URL: https://____________________________
Your domain name: ____________________________
Suno API provider used: ____________________________
Suno API Base URL: ____________________________
R2 Public URL: https://pub-________________.r2.dev
FROM_EMAIL address: ____________________________
```

---

## After You Send Me the Checklist

Once I receive the completed checklist and the non-sensitive values above, I will:

1. Update `secrets.ts` with the correct Infisical client credential variable names
2. Run the PostgreSQL migration (push all 18 tables to Railway PG)
3. Verify Redis connectivity from the app
4. Update all provider adapters with the correct API base URLs
5. Configure the auth system with your domain and Google OAuth redirect
6. Set up the `/api/health` endpoint for Betterstack
7. Wire R2 storage into file upload routes
8. Run a full end-to-end test on staging before production
9. Give you the all-clear to begin Phase 2

---

## Troubleshooting — Common Issues

| Issue | What To Do |
|-------|------------|
| Can't find "New Variable" in Railway | Make sure you clicked on the SERVICE (not the project root) → Variables tab |
| Infisical secret not showing up | Make sure you're on the "production" environment tab, not "development" |
| R2 bucket says "Access denied" | Re-check that you created an R2 API token (not a Workers API token) in Step 10.5 |
| Google OAuth redirect error | Double-check the authorized redirect URI includes `/api/auth/callback/google` exactly |
| Sunor.cc won't load | Use apiframe.ai instead — same API structure, just different base URL |
| Railway URL not found | Go to Railway → your service → Settings → the public domain shown there |
| FAL.ai API key missing from dashboard | Try refreshing the page — sometimes newly created keys take a few seconds to appear |

---

*End of Phase 2 Blocker Removal Guide*  
*Prepared by: Runable AI Engineering Assistant*  
*For: Lawrence Davis, Ghaafeedi Music*  
*Date: June 16, 2026*
