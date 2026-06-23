# Story 1 — All 9 Shots Dispatch

## Status: POLLING — waiting for Modal completions

## Job IDs (all 9 dispatched at 23:54 UTC Jun 22)
- S01_001: v2_c11b2ba321de
- S01_002: v2_0eb4170ca4b0
- S01_003: v2_07fad4216c61
- S01_004: v2_eabf64508c78
- S01_005: v2_b93d50a56db1
- S01_006: v2_40d42c2cf42c
- S01_007: v2_b24de036f5bc
- S01_008: v2_64dbf6f3316f
- S01_009: v2_4845eb5b1446

## Key Files
- Shot prompts: `scripts/story1_continuity_shots_full.json`
- Dispatch script: `scripts/dispatch_story1_all9.py`
- Poll script: `/tmp/poll_story1.py`
- Poll log: `/tmp/story1_poll.log`
- Output dir: `test_output_wan/story1_v3/`
- Assemble script: `scripts/assemble_story.py`

## Continuity Chain (designed into prompts)
1. S1 ends → flour on wood table (push in)
2. S2 opens → same flour, hands enter (CUT — identical frame bridge)
3. S2 ends → hands at rest on floured surface
4. S3 opens → same resting hands (CUT), camera pulls back to reveal face
5. S3 ends → woman's face, amber kitchen
6. S4 opens → daughter's face COLD (hard grade contrast cut IS the bridge)
7. S4 ends → daughter's face cold close-up
8. S5 opens → empty chair, cold grade (same world)
9. S5 ends → elevated wide, empty chair
10. S6 opens → grocery list found in pocket
11. S6 ends → handwritten list in hands
12. S7 opens → woman on floor with list
13. S7 ends → floor level, shaft of light
14. S8 opens → bedroom, rising to window
15. S8 ends → silhouette at window, dawn
16. S9 opens → exterior, walking into morning light
17. S9 ends → woman walking away into gold morning

## After All Done
1. Check poll_manifest.json
2. Run assemble_story.py on all 9 (poll script does this auto)
3. Extract keyframes from seam points
4. Deliver to Lawrence
