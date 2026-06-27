# Ghaafeedi Music — Full TS Error Fix + Poyo Migration Audit

## Error Count: 406 errors across 44 files

## Fix Groups (in order):
1. [x] ANALYSIS DONE
2. [ ] poyo.adapter.ts — add `poyoChatText()` helper returning `string`
3. [ ] openai.adapter.ts — fix PoyoChatResponse type usage (line 191)
4. [ ] onboarding.ts (backend) — fix PoyoChatResponse.replace, undefined guards
5. [ ] stories.ts (backend) — fix c.get("user") type, PoyoChatResponse arg
6. [ ] dashboard.ts — fix c.get("user") type (61 errors — common pattern)
7. [ ] admin.ts — undefined guards on aggregate queries
8. [ ] jobs.ts — JobSubmissionRequest type fixes, position field
9. [ ] members.ts — c.get("user") type + undefined guards
10. [ ] productions.ts — c.get("user") type + undefined guards
11. [ ] orders.ts — c.get("user") type + undefined guards
12. [ ] acknowledgements.ts — c.get("user") type + undefined guards
13. [ ] assets.ts — c.get("user") type fixes
14. [ ] profiles.ts — c.get("user") type fixes
15. [ ] lipsync.ts — JobSubmissionRequest type fix
16. [ ] providers.ts — JobSpec type fix
17. [ ] sophia.ts — usedModel type literal, schema column issues
18. [ ] revisions-intake.ts — PoyoChatResponse arg, usedCount, tier
19. [ ] FRONTEND: SplashLandingPage + all pages — Variants type (as const satisfies)
20. [ ] FRONTEND: about/contact/faq/impact/legal/legal-doc — Variants
21. [ ] FRONTEND: onboarding.tsx — StatusFeed, S8Package, undefined guards
22. [ ] FRONTEND: products.tsx — sp undefined guards
23. [ ] FRONTEND: dashboard.tsx — Member type, param 't'
24. [ ] FRONTEND: demo.tsx — entry undefined, URL arg
25. [ ] FRONTEND: SocialProof.tsx — entry/item undefined guards
26. [ ] FRONTEND: SocialProofToast.tsx — setState type
27. [ ] FRONTEND: HeroSection.tsx — undefined guards
28. [ ] FRONTEND: StorytellingShowcase.tsx — entry undefined
29. [ ] FRONTEND: admin/lipsync.tsx — columns type
30. [ ] FRONTEND: admin-layout.tsx — style undefined
31. [ ] FRONTEND: GhaafeediLogo.tsx — string|undefined
32. [ ] FRONTEND: button.tsx — @/lib/utils missing
33. [ ] FRONTEND: lib/api.ts — headers return type
34. [ ] FRONTEND: revision/RevisionIntakeFlow.tsx — type-only import
35. [ ] FRONTEND: revision/SophiaRevisionGuide.tsx — type imports, missing export
36. [ ] MOBILE: ErrorBoundary.tsx — override modifier
37. [ ] MOBILE: admin/jobs.tsx — AiJob type
38. [ ] MOBILE: admin/providers.tsx — entry undefined
39. [ ] RUN FINAL TS CHECK → 0 errors
40. [ ] ENV VARS AUDIT for Render
41. [ ] COMMIT

## Root Causes Summary:
- `c.get("user")` returns `{}` type — need to cast `as any` or define middleware type
- `poyoChat()` returns `PoyoChatResponse` object, callers use it as `string` — need `poyoChatText()` helper
- Framer Motion `Variants` type — inline objects need `as const satisfies Variants` or typed const
- `Object possibly undefined` — drizzle query results, array indexing — need optional chaining
- `JobSubmissionRequest` missing `payload`/`priority` (those are on `JobSpec`, not request)
- `string | undefined` not assignable to `string` — need `?? ""` or `!` assertions
