# Poyo.ai Migration Task

## Status: IN PROGRESS

## Steps
- [x] Read analysis report + existing suno.adapter.ts / secrets.ts / adapters/index.ts / providers.ts / music-router.adapter.ts
- [x] Write poyo.adapter.ts — full 13-operation adapter
- [x] Update secrets.ts — SUNO_API_KEY → POYO_API_KEY
- [ ] Update adapters/index.ts — swap SunoAdapter → PoyoAdapter
- [ ] Update music-router.adapter.ts — swap Suno ref → Poyo
- [ ] Update providers.ts — test case sunor_cc → poyo
- [ ] Update job-queue.ts — add new JobTypes (music_video, song_extension, vocal_removal, stem_separation, cover_generation, vocal_add, style_boost, section_replace, album_art, timestamped_lyrics, wav_export)
- [ ] Update orchestration-engine.ts — add costs + values for new types, fix failover chain (sunor_cc → poyo)
- [ ] Update DB providers table (sunor_cc → poyo)
- [ ] 0 TS errors check
- [ ] QA health check
- [ ] Commit

## Waiting on
- Lawrence Poyo.ai API key (shown in ask_secrets form)

## Key Facts
- Poyo.ai base: https://poyo.ai/api/v1
- Auth: x-api-key header (same pattern as sunor.cc)
- Task poll: /api/v1/music/task/:task_id
- Cost: most ops $0.10, MV $0.02, lyrics/wav free
