# CaptionFlow

Wrapper around embedded YouTube that plays **instructor-authored** SRT/VTT captions in sync. LTI 1.3 for LMS embeds. See [requirements.txt](requirements.txt) and [implementation_plan.txt](implementation_plan.txt).

## Quick start

```bash
cp .env.example .env
docker compose up -d
npm ci
npm run build
DATABASE_URL=postgresql://captionflow:captionflow@localhost:5432/captionflow \
  BASE_URL=http://localhost:3000 \
  SESSION_SECRET=01234567890123456789012345678901 \
  NODE_ENV=development \
  npm start
```

Dev (API + Vite HMR): `npm run dev` — API on `3000`, web on `5173` (proxied `/api`, `/lti`).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm test` | Unit tests (Vitest) |
| `npm run test:integration` | API + Postgres (Testcontainers) |
| `npm run test:e2e` | Playwright (needs Postgres + `npm run build`) |
| `npm run build` | Production web + server |
| `npm start` | Serve `dist/web` + API |

## Docs

- [docs/RAILWAY_SETUP.md](docs/RAILWAY_SETUP.md) — hosting (STOP S2–S4)
- [docs/CANVAS_LTI.md](docs/CANVAS_LTI.md) — Canvas (STOP S5)
- [docs/STOP_S1_DRIFT.md](docs/STOP_S1_DRIFT.md) — Phase 0 drift gate
- [docs/VENDOR_CHECKLIST.md](docs/VENDOR_CHECKLIST.md) — audits / pen-test / LTI cert
- [docs/A11Y_INTERNAL.md](docs/A11Y_INTERNAL.md) — internal a11y pass
- [docs/VPAT_TEMPLATE.md](docs/VPAT_TEMPLATE.md) — VPAT shell

## Phase 2–3 (in this repo)

- **Metering:** `view_event` logged on public resource views; `/api/admin/views/:yearMonth` for `institution_admin`.
- **Sharing:** `caption_grant` + `/api/captions/:id/share` + borrow list `/api/captions/borrow/:youtubeVideoId`.
- **Translation:** `POST /api/captions/:id/translate` (DeepL → Google → mock). Machine tracks labeled on caption surface per product rules.
- **Fullscreen:** Button on caption surface requests fullscreen on the player+caption wrapper.
