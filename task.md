# Phase 4 — Admin Control Center (Android-first)

## Goal
Full admin mobile app in packages/mobile — real-time job monitor, queue control,
provider toggles + balance, revenue dashboard, GPU budget alerts.

## Screens
1. `/app/admin/_layout.tsx`       — Tab bar (Overview / Jobs / Providers / Revenue)
2. `/app/admin/index.tsx`         — Overview: live stats cards, alert banner
3. `/app/admin/jobs.tsx`          — Job monitor: list, status badge, cancel button
4. `/app/admin/providers.tsx`     — Provider grid: health, balance status, enable/disable
5. `/app/admin/revenue.tsx`       — Revenue charts: MRR, orders, product breakdown

## API used
- GET  /api/providers/health       — live health + balance
- GET  /api/providers              — list with DB config
- GET  /api/admin/overview         — stats
- GET  /api/admin/orders           — recent orders
- GET  /api/jobs (existing)        — job list
- POST /api/admin/providers/:name/toggle — enable/disable (need to add)
- WS   /api/jobs/stream            — real-time job updates (add SSE fallback)

## New API endpoints to add
- POST /api/admin/providers/:name/toggle  — flip enabled bool in DB
- GET  /api/jobs/live                     — SSE stream of job events

## Design tokens (match web admin)
- BG: #050B1A, Surface: #0B1736, Gold: #D4AF37, Text: #FFFFFF
- Font: System (Inter not available on RN)
- Status colors: green=#22C55E, red=#EF4444, amber=#F59E0B, grey=#64748B

## Status
- [ ] New API endpoints (toggle + SSE)
- [ ] Mobile admin screens (5 screens)
- [ ] Real-time polling (5s interval, SSE upgrade)
- [ ] QA (3 viewports: phone/tablet/web preview)
- [ ] Gate report
