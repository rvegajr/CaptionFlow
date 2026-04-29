# STOP S1 — Drift measurement (human)

Run the sync spike: `npm run dev:web` then open `http://localhost:5173/spike/index.html` (or `/spike/index.html?e2e=1` for the Playwright control hook only).

The spike uses pinned video `aqz-KE-bpKQ` with six short inline WebVTT cues for automated sync checks.

Scenarios: Chrome, Safari (desktop + iOS), Firefox — play, pause, seek-while-playing, seek-while-paused, CPU/network throttling, background tab then foreground.

Record worst-case perceived lag between spoken/gesture timing and caption change. Gate: **250 ms** (see `requirements.txt` NFR-4). If exceeded, stop Phase 1 backend work until mitigated.
