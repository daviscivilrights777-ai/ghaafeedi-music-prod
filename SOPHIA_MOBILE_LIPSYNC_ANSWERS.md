# Sophia Mobile Lip Sync — Infrastructure Q&A

---

**Q1 — GPU Infrastructure**
B) Modal — $30 free credit available. Use Modal exclusively for Wav2Lip. FAL.ai needs balance top-up, Vast.ai is unconfigured overflow.

---

**Q2 — Current Mobile Fallback**
A) Static portrait image of Sophia — `/assets/sophia-lipsync-portrait.png`. Face is frozen. ElevenLabs TTS audio plays but no lip movement.

---

**Q3 — Acceptable Latency on Mobile**
B) 2-5 seconds is acceptable — matches the architecture spec ("Latency: 2-4 seconds for a 5-10 second clip"). User sees a loading indicator while Wav2Lip renders on Modal GPU.

---

**Q4 — Sophia Portrait Asset**
A) A single high-quality static image — `/public/assets/sophia-lipsync-portrait.png` is the canonical Sophia face. This is the reference image Wav2Lip will use for every render.

---

**Q5 — The Document Being Sent**
C) New infrastructure details — the complete Wav2Lip on Modal architecture spec built by Lawrence, sent for recording and approval before implementation.
