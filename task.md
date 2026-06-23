# S5/S6 Onboarding Overhaul

## STATUS: IN PROGRESS

## Steps
1. [x] Read all files — DONE
2. [ ] Step 1: API — add `reason` + `emotionalFingerprint` to GPT prompt + buildFallback
3. [ ] Step 2: S5 cleanup — remove all song gen state/functions/render block
4. [ ] Step 3: S5 report card — add S5AnalysisReport below ob5-layout, inside ob5-scroll
5. [ ] Step 4: S5 onNext signature change → `onNext: (result: S5AnalysisResult) => void`
6. [ ] Step 5: Orchestrator bridge — add analysisResult to obData, wire S5 onNext, pass analysisData to S6
7. [ ] Step 6: S6 real song gen — replace fake RAF sim with real audio player
8. [ ] TS check: 0 errors
9. [ ] Git commit + push

## Key line numbers
- S5AnalysisResult interface: 2956-2963
- Step5Props/Step5AIAnalysis: 3079+
- Song gen state vars: 3116-3133
- triggerSongGeneration: 3385-3440
- handlePlayPause: 3445
- handleProgressClick: 3452
- Song preview section start: 4117 `{phase === "done" && (`
- Song preview section end: ~4428 (closing the AnimatePresence/div)
- S5ReassuranceTicker render: 4425
- Continue button onClick: 4454 `onClick={onNext}`
- s5audiowave keyframe: ~4546
- Step6Props: 4625
- Step6PreviewCreation: 4773
- RAF sim state: playing/progress/elapsed/tickAudio/togglePlay/restart/seekTo
- Orchestrator S5 render: ~9980
- Orchestrator S6 render: ~10000
- obData setters: ~9579-9587

## Decisions
- S6 design = zero changes, only internals swap
- S5 song gen block removed entirely (lines 4117-4428)
- S5AnalysisReport goes inside ob5-scroll, below ob5-layout
- emotionalFingerprint = 3-5 adjective strings from GPT
- cat.reason = 2-3 sentence explanation referencing story content
- S6 fallback if Sunor null: show "preview being crafted" message, Continue still enabled
- Remove s5audiowave keyframe from S5 (S6 has its own OB6_STYLES)
- analysisResult stored in obData (need to add to inline state type or separate state)
