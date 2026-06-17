# Ghaafeedi Music — Architecture & Source of Truth

> Last updated: 2026-06-14\
> Status: Production-ready (Enterprise Member System complete)

***

## 1. Brand Identity

| Token        | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Brand Name   | Ghaafeedi Music (exact spelling, no variations)       |
| Primary Gold | #D4AF37                                               |
| Gold Accent  | #F0D060 / #FFC24D                                     |
| Navy         | #0B1736                                               |
| Deep Navy    | #071225                                               |
| Background   | #050B1A                                               |
| Text         | #FFFFFF                                               |
| Heading Font | Playfair Display (serif)                              |
| Body Font    | Inter (sans-serif)                                    |
| Vibe         | Luxury · Cinematic · Emotional · Premium · AI-powered |

***

## 2. Stack

### Runtime

* **Bun** — package manager + runtime

* **Hono** — API server (TypeScript, edge-compatible)

* **React 18** — web frontend (Vite)

* **Wouter** — client-side routing

* **Drizzle ORM** — type-safe SQL queries

* **Turso (libSQL / SQLite)** — managed database

### Auth

* **Better Auth** — JWT-based, role-based (customer / admin / support)

* Email + password + Google OAuth

* React client: import from `better-auth/react` (NOT `better-auth/client`)

* `captureToken` called in every `onSuccess` callback after sign-in/sign-up

### Payments

* **Autumn** (wraps Whop / Stripe) — primary payment processor

* **Dodo Payments** — secondary / BNPL processor

  * Branding: green `#22C55E` + teal `#14B8A6`

  * Dodo bird SVG logo, "Dodo" green + "Payments" white wordmark

  * LIVE • TLS 1.3 • PCI DSS badges

### AI

* **OpenAI** via AI Gateway — emotion/story analysis, lyrics, scripts, storyboards, companion chat

* Model strings: gateway format (e.g. `openai/gpt-4o`)

### Media Generation

* **Sunor.cc API** — song / music generation

* **FAL.ai** — video generation (primary)

* **Modal** — video generation (secondary)

* **Vast.ai** — GPU overflow

***

## 3. Database Schema

### Core Tables (Better Auth managed)

* `user` — id, name, email, emailVerified, image, createdAt, updatedAt

* `session` — id, userId, token, expiresAt, ...

* `account` — OAuth accounts linked to users

### Extended Tables (Ghaafeedi custom)

#### `members`

| Column    | Type        | Notes                                     |
| --------- | ----------- | ----------------------------------------- |
| id        | text PK     | cuid                                      |
| userId    | text FK     | → user.id, unique, cascade delete         |
| memberId  | text unique | Format: GM-XXXXXXXX (8-digit zero-padded) |
| tier      | text        | starter / premium / elite / visitor       |
| status    | text        | active / paused / cancelled               |
| joinedAt  | integer     | Unix ms                                   |
| updatedAt | integer     | Unix ms                                   |

**Member ID generation:** server generates sequential 8-digit, zero-padded, collision-checked. Example: `GM-00000001`.

#### `acknowledgements`

| Column         | Type    | Notes                     |
| -------------- | ------- | ------------------------- |
| id             | text PK | cuid                      |
| userId         | text FK | → user.id, cascade delete |
| productSlug    | text    | product identifier        |
| acknowledgedAt | integer | Unix ms                   |

Unique constraint: `(userId, productSlug)` — idempotent, audit-logged.

#### `productions`

| Column       | Type        | Notes                                        |
| ------------ | ----------- | -------------------------------------------- |
| id           | text PK     | cuid                                         |
| userId       | text FK     | → user.id, cascade delete                    |
| memberId     | text        | GM-XXXXXXXX                                  |
| productSlug  | text        | product identifier                           |
| productionId | text unique | Format: PROD-XXXXXXXXX (alphanumeric 9-char) |
| status       | text        | queued / processing / complete / failed      |
| inputData    | text        | JSON blob of user story inputs               |
| outputData   | text        | JSON blob of generated assets                |
| createdAt    | integer     | Unix ms                                      |
| updatedAt    | integer     | Unix ms                                      |

***

## 4. API Routes

Base path: `/api`

### Auth

Managed by Better Auth at `/api/auth/*`

### Members — `/api/members`

| Method | Path                 | Auth     | Description                                                                 |
| ------ | -------------------- | -------- | --------------------------------------------------------------------------- |
| POST   | /members/create      | Required | Idempotent — creates member record if not exists, returns existing if found |
| GET    | /members/me          | Required | Returns member profile + tier + memberId                                    |
| GET    | /members/orders      | Required | Returns order history                                                       |
| GET    | /members/productions | Required | Returns all productions for member                                          |

### Acknowledgements — `/api/acknowledgements`

| Method | Path                           | Auth     | Description                                   |
| ------ | ------------------------------ | -------- | --------------------------------------------- |
| POST   | /acknowledgements              | Required | Acknowledge a product (body: { productSlug }) |
| GET    | /acknowledgements/:productSlug | Required | Check if user has acknowledged product        |

### Productions — `/api/productions`

| Method | Path                       | Auth     | Description                    |
| ------ | -------------------------- | -------- | ------------------------------ |
| POST   | /productions               | Required | Create new production job      |
| GET    | /productions/:productionId | Required | Get production status + output |

***

## 5. Pages & Routes

| Route           | Page                      | Auth Required                      |
| --------------- | ------------------------- | ---------------------------------- |
| /               | Homepage (Index)          | No                                 |
| /signin         | Sign In                   | No                                 |
| /signup         | Sign Up                   | No                                 |
| /onboarding     | 12-Step Onboarding Flow   | Yes (redirects to /signin)         |
| /products       | Product Experience Center | No (visitor browse)                |
| /products/:slug | Product Detail            | No (visitor view, member to begin) |
| /dashboard      | Member Dashboard          | Yes (redirects to /signin)         |

***

## 6. Product Catalog — All 14 Products

| #   | Slug                      | Title                         | Price       | Category |
| --- | ------------------------- | ----------------------------- | ----------- | -------- |
| 1   | sophia-ai                 | Sophia AI Emotional Companion | From $49/mo | AI       |
| 2   | voice-cloning-studio      | Voice Cloning Studio          | $149        | Studio   |
| 3   | signature-masterpiece     | Signature Masterpiece         | $299        | Music    |
| 4   | emotional-soundtrack      | Emotional Soundtrack          | $199        | Music    |
| 5   | cinematic-story-film      | Cinematic Story Film          | $499        | Video    |
| 6   | cinematic-life-story      | Cinematic Life Story          | $799        | Video    |
| 7   | couples-journey-film      | Couples Journey Film          | $599        | Video    |
| 8   | memorial-legacy-film      | Memorial Legacy Film          | $699        | Legacy   |
| 9   | dream-ai-visualization    | Dream AI Visualization        | $349        | AI       |
| 10  | future-self-vision        | Future Self Vision            | $249        | AI       |
| 11  | relationship-healing      | Relationship Healing          | $199        | AI       |
| 12  | family-vault              | Family Vault                  | $149/yr     | Legacy   |
| 13  | nft-collection            | NFT Collection                | $399        | NFT      |
| 14  | custom-ai-song-membership | Song Membership               | See tiers   | Music    |

### Song Membership Tiers

| Tier    | Price   | Songs/Month |
| ------- | ------- | ----------- |
| Starter | $49/mo  | 3           |
| Premium | $79/mo  | 8           |
| Elite   | $125/mo | 15          |

***

## 7. Pricing Analysis & Margin Model

### AI Cost per Production (OpenAI)

| Task                            | Model  | Est. Tokens         | Cost    |
| ------------------------------- | ------ | ------------------- | ------- |
| Emotion/story analysis          | gpt-4o | ~800 in + 400 out   | ~$0.007 |
| Lyrics generation               | gpt-4o | ~600 in + 800 out   | ~$0.010 |
| Script/storyboard               | gpt-4o | ~1200 in + 1500 out | ~$0.021 |
| Companion chat (per session)    | gpt-4o | ~500 in + 300 out   | ~$0.005 |
| AI subtotal per full production |        |                     | ~$0.04  |

### Song Generation (Sunor.cc)

| Volume          | Estimated Cost |
| --------------- | -------------- |
| Per song (est.) | ~$0.50–$1.00   |
| Starter (3/mo)  | ~$1.50–$3.00   |
| Premium (8/mo)  | ~$4.00–$8.00   |
| Elite (15/mo)   | ~$7.50–$15.00  |

### Video Generation (FAL.ai)

| Product                | GPU Minutes (est.) | FAL.ai Cost |
| ---------------------- | ------------------ | ----------- |
| Short clip (30s)       | ~2 min             | ~$0.30      |
| Cinematic Story Film   | ~8 min             | ~$1.20      |
| Cinematic Life Story   | ~15 min            | ~$2.25      |
| Couples Journey Film   | ~12 min            | ~$1.80      |
| Memorial Legacy Film   | ~12 min            | ~$1.80      |
| Dream AI Visualization | ~5 min             | ~$0.75      |

### Gross Margin Estimates (per product)

| Product               | Price   | Est. COGS | Gross Margin |
| --------------------- | ------- | --------- | ------------ |
| Signature Masterpiece | $299    | ~$5       | ~98%         |
| Emotional Soundtrack  | $199    | ~$3       | ~98%         |
| Cinematic Story Film  | $499    | ~$2       | ~99%         |
| Cinematic Life Story  | $799    | ~$3       | ~99%         |
| Sophia AI (Starter)   | $49/mo  | ~$3/mo    | ~94%         |
| Sophia AI (Premium)   | $79/mo  | ~$8/mo    | ~90%         |
| Sophia AI (Elite)     | $125/mo | ~$15/mo   | ~88%         |
| NFT Collection        | $399    | ~$5       | ~99%         |
| Family Vault          | $149/yr | ~$2/yr    | ~99%         |

> **Target margin: 88–99%** across all products. AI and GPU costs are negligible relative to pricing. Primary cost driver is Sophia AI companion chat volume at Elite tier.

### Infrastructure (Monthly, at scale)

| Service           | Est. Cost                   |
| ----------------- | --------------------------- |
| Turso (DB)        | $25–$75                     |
| FAL.ai (video)    | Variable — ~$1–3/production |
| OpenAI (AI)       | ~$0.04/production           |
| Sunor.cc (songs)  | ~$0.50–1.00/song            |
| Server (Hono/Bun) | ~$20–50 (VPS)               |
| Total fixed       | ~$100–200/mo                |

At 100 productions/month: ~$300–500 total infra → effectively <1% of revenue.

***

## 8. Onboarding Flow (12 Steps)

| Step | ID  | Name                        |
| ---- | --- | --------------------------- |
| 01   | S1  | Welcome & Emotional Capture |
| 02   | S2  | Story Discovery             |
| 03   | S3  | Character & People          |
| 04   | S4  | Memory Selection            |
| 05   | S56 | Mood & Tone                 |
| 06   | S6  | Preview Your Creation       |
| 07   | S7  | Production Portal           |
| 08   | S8  | Checkout & Payment          |
| 09   | S9  | Order Confirmation          |

Steps S01–S09 are complete and QA-passed. Journey terminates at S9.

***

## 9. Member Flow

```
Visitor → /products (browse only)
       → clicks product → /products/:slug (detail, visitor state)
       → clicks "Begin" → /signup?redirect=/products/SLUG
       → signs up → captureToken → api.members.create (GM-XXXXXXXX assigned)
       → redirected to /products/SLUG (member state — acknowledgement gate)
       → acknowledges → /onboarding (12-step flow)
       → completes → /dashboard (member home)
```

Returning member:

```
/signin?redirect=/products/SLUG → captureToken → ensureMember → redirected back
```

***

## 10. Security & Compliance

* JWT sessions via Better Auth

* Rate limiting: 3 payment submissions/min (S8 checkout)

* No double-submit: `gm_checkout_locked` localStorage flag

* Form validation: inline errors, no page reload

* Dodo Payments: TLS 1.3 + PCI DSS + tokenized card data

* CSRF protection on all state-mutating endpoints

* Role-based access: customer / admin / support

***

## 11. Admin Panel (Planned)

* Full CRM (member list, GM IDs, tier, status)

* Order management

* AI job monitor + GPU queue dashboard

* Revenue analytics (MRR, LTV, churn)

* Production status tracker

***

## 12. Key Files

| File                                            | Purpose                                 |
| ----------------------------------------------- | --------------------------------------- |
| packages/web/src/api/database/schema.ts         | Drizzle schema (all tables)             |
| packages/web/src/api/index.ts                   | Hono API router (all routes wired)      |
| packages/web/src/api/routes/members.ts          | Member CRUD + GM-ID generation          |
| packages/web/src/api/routes/acknowledgements.ts | Acknowledgement gate                    |
| packages/web/src/api/routes/productions.ts      | Production job tracker                  |
| packages/web/src/web/app.tsx                    | React routes                            |
| packages/web/src/web/lib/authClient.ts          | Better Auth React client + captureToken |
| packages/web/src/web/lib/api.ts                 | Hono typed client                       |
| packages/web/src/web/pages/product-detail.tsx   | Product detail + visitor/member gate    |
| packages/web/src/web/pages/dashboard.tsx        | Member dashboard                        |
| packages/web/src/web/pages/signin.tsx           | Sign in + redirectTo preservation       |
| packages/web/src/web/pages/signup.tsx           | Sign up + member creation + redirectTo  |
| packages/web/src/web/pages/onboarding.tsx       | 12-step onboarding orchestrator         |

***

*This document is the authoritative source of truth for the Ghaafeedi Music platform. Update it with every architectural decision.*
