# CaptionFlow Trust Ladder

This document is the operational companion to the implementation plan in
[`captionflow_trust_ladder_1249c2e7.plan.md`](../.cursor/plans/captionflow_trust_ladder_1249c2e7.plan.md).
It enumerates the automated gates that run in CI on every push, what each gate
mechanically proves, and what is intentionally left manual.

## TL;DR

Every push to `main` runs L1 → L5 in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
Every six hours, [`.github/workflows/smoke.yml`](../.github/workflows/smoke.yml)
probes production. Things that cannot be automated (real WCAG audit, real Canvas
launch, real pen-test) are tracked separately in
[`VENDOR_CHECKLIST.md`](VENDOR_CHECKLIST.md).

## Layers

```
L1 Unit ──► L2 Integration ──► L3 E2E + a11y ──► L4 LTI ──► L5 Security/Supply ──► L6 Post-deploy smoke
                                                                                              │
                                                                                              ▼
                                                                       External: WCAG audit, pen-test, LTI cert
```

### L1 — Unit (Vitest)

Runs via `npm test` in CI.

| File | What it proves |
| --- | --- |
| [`src/shared/srt.test.ts`](../src/shared/srt.test.ts), [`src/shared/vtt.test.ts`](../src/shared/vtt.test.ts) | SRT/VTT parsers round-trip with `fast-check` property tests. |
| [`src/shared/youtube-id.test.ts`](../src/shared/youtube-id.test.ts) | YouTube id extraction from URLs and bare ids. |
| [`src/web/caption-surface/sync-engine.test.ts`](../src/web/caption-surface/sync-engine.test.ts) | The cue sync engine produces correct active-cue indices against a fake YouTube player and fake `requestAnimationFrame`. |
| [`src/server/lib/translate-text.test.ts`](../src/server/lib/translate-text.test.ts) | Translate adapter: DeepL path, Google fallback, mock fallback, newline preservation. |

### L2 — Integration (Vitest + `@testcontainers/postgresql` + `app.inject`)

Runs via `npm run test:integration`. Each file boots a fresh Postgres container,
applies migrations, and exercises the route layer through Fastify's `inject()`.

| File | What it proves |
| --- | --- |
| [`tests/integration/api-captions.test.ts`](../tests/integration/api-captions.test.ts) | Baseline caption CRUD happy path. |
| [`tests/integration/auth.test.ts`](../tests/integration/auth.test.ts) | Magic-link issuing; `/auth/callback` rejects missing/invalid/expired/used tokens; `/api/me` 401 vs authenticated; `/auth/logout` clears the cookie. |
| [`tests/integration/captions-validation.test.ts`](../tests/integration/captions-validation.test.ts) | Oversize (413), malformed VTT (400), missing/invalid YouTube id (400), GET/PATCH/DELETE ownership returns 404 across instructors. |
| [`tests/integration/resources.test.ts`](../tests/integration/resources.test.ts) | URL → 11-char id parsing, PATCH ownership, DELETE no-op for non-owners, success path for owners. |
| [`tests/integration/public-and-views.test.ts`](../tests/integration/public-and-views.test.ts) | Public payload shape (multi-track w/ cues) and `view_event` rows tagged with the instructor's `institution_id`. |
| [`tests/integration/admin-views.test.ts`](../tests/integration/admin-views.test.ts) | Non-admin 403; admin sees correct daily buckets sorted ascending and clipped to month bounds. |
| [`tests/integration/grants-and-borrow.test.ts`](../tests/integration/grants-and-borrow.test.ts) | `share` is idempotent (single grant row on duplicate calls); 404 for unknown grantee or non-owned caption; B's borrow list contains A's caption, A's own list does not. |
| [`tests/integration/translate.test.ts`](../tests/integration/translate.test.ts) | Translate creates an MT caption with `isMachineTranslated=true` and `sourceCaptionId`; the second call hits cache (no fetch); translating an already-MT track returns 400. |
| [`tests/integration/security-headers.test.ts`](../tests/integration/security-headers.test.ts) | Prod CSP includes `frame-src https://www.youtube.com`; auth cookie carries `HttpOnly; SameSite=Lax; Secure`; `/auth/magic-link` returns 429 when hammered above the rate-limit. |

### L3 — End-to-end (Playwright)

Runs via `npm run test:e2e` against a real `npm start` web server backed by Postgres.

| File | What it proves |
| --- | --- |
| [`tests/e2e/youtube-sync.spec.ts`](../tests/e2e/youtube-sync.spec.ts) | Pinned public-domain YouTube video + 6 timestamped cues; verifies the sync engine in a real browser. |
| [`tests/e2e/a11y-dashboard.spec.ts`](../tests/e2e/a11y-dashboard.spec.ts) | `axe-core` scan on the unauthenticated login shell, all four authenticated dashboard routes, and the caption surface (excluding the third-party YouTube iframe). Fails on `critical`/`serious`. |
| [`tests/e2e/dashboard-flow.spec.ts`](../tests/e2e/dashboard-flow.spec.ts) | Full instructor flow: magic-link login (via `EXPOSE_LAST_MAGIC_LINK` test endpoint) → upload SRT → caption appears in list → create resource from URL → set default caption → caption surface renders. |
| [`tests/e2e/translation-label.spec.ts`](../tests/e2e/translation-label.spec.ts) | Switching to a machine-translated track surfaces the `MACHINE_TRANSLATED_LABEL` exactly as required by Section 8 P2-4 (b) of `requirements.txt`. |
| [`tests/e2e/fullscreen.spec.ts`](../tests/e2e/fullscreen.spec.ts) | Clicking the fullscreen button promotes the surface wrapper to `document.fullscreenElement`. |

The login flow uses a test-only HTTP endpoint `GET /__test__/last-magic-link`,
which is mounted only when `EXPOSE_LAST_MAGIC_LINK=1` (set by
[`playwright.config.ts`](../playwright.config.ts) and the CI workflow).

### L4 — LTI

[`tests/integration/lti.test.ts`](../tests/integration/lti.test.ts) boots the
app with LTI enabled and asserts:
- `/.well-known/jwks` returns valid JWKS shape over real HTTP (we use a real
  Fastify listener because ltijs is mounted via `@fastify/express` and its
  responses don't cleanly round-trip through `inject()`).
- `/lti/login` and `/lti/launch` exist (do not 404).
- The idempotency contract that `lti.onConnect` relies on: calling the
  upsert-institution → upsert-instructor → `findByLtiResourceLink || create`
  sequence twice with the same `resource_link.id` produces a single
  `captioned_resource` row, and a direct duplicate insert violates the unique
  constraint.

A full real-OIDC launch is intentionally a manual exit-gate (LMS cert is
external). See [`VENDOR_CHECKLIST.md`](VENDOR_CHECKLIST.md).

### L5 — Security and supply chain

In CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

- `npx tsc --noEmit -p tsconfig.server.json`
- `npx tsc --noEmit -p tsconfig.web.json`
- `npm audit --omit=dev --audit-level=high` — currently a non-blocking notice.
  See "Known supply-chain debt" below.

The L2 `security-headers.test.ts` already gates the CSP, cookie flags, and
rate-limit assertions on every push.

### L6 — Post-deploy production smoke

[`.github/workflows/smoke.yml`](../.github/workflows/smoke.yml) runs every six
hours and on `workflow_dispatch`:

- `GET $PROD_URL/health` must return JSON containing `"status":"ok"` and `"db":"ok"`.
- `POST /auth/magic-link` with an invalid email must return 400 (we drive the
  reject path so we don't pollute prod with smoke-only magic links).
- `GET /api/public/resources/<zero-uuid>` must return 404.

`PROD_URL` comes from the repo variable of the same name (or defaults to the
deployed Railway URL).

## Known supply-chain debt

`ltijs-sequelize` pulls in `sequelize` which transitively pulls `mysql2`,
`@azure/identity`, `@azure/msal-node`, `axios`, `jsonwebtoken`, and `adal-node`.
Several of these have published high/critical advisories with **no upstream fix
available** for the version `ltijs-sequelize` requires. We use **only the
Postgres dialect**, so the `mysql2` and `@azure/*` codepaths are unreachable at
runtime, but `npm audit` cannot prove unreachability.

For now `npm audit` runs in CI as a notice (`continue-on-error: true`) so we
keep visibility without falsely failing the build. To make it strict, one of
the following must happen first:

1. Upgrade `fastify` to `^5` together with `@fastify/express@^4.0.5`. The 4.x
   line of `@fastify/express` carries the only fix for the URL-normalization
   auth-bypass advisories (`GHSA-g6q3-96cp-5r5m`, `GHSA-6hw5-45gm-fj88`,
   `GHSA-hrwm-hgmj-7p9c`) but requires `fastify-plugin@^5`, which in turn
   requires `fastify@^5`. Doing this is a coordinated semver-major bump across
   `fastify`, all `@fastify/*` plugins, and the Pino logger pipeline.
2. Replace `ltijs-sequelize` with a Postgres-only adapter (or wait for a
   maintained replacement from ltijs upstream) to drop the `mysql2`,
   `@azure/*`, and `adal-node` advisories.
3. Or pin via `audit-ci` with explicit allowlists for the unreachable
   advisories and re-run audit as a hard gate.

We deliberately did **not** bump `@fastify/express` to 4.x in isolation: it
breaks ltijs registration with `FST_ERR_PLUGIN_VERSION_MISMATCH` because the
4.x line is for `fastify@5`. The ltijs route surface is integration-tested in
[`tests/integration/lti.test.ts`](../tests/integration/lti.test.ts), which
caught this regression immediately.

## What stays manual

These cannot be automated. Each is tracked in
[`VENDOR_CHECKLIST.md`](VENDOR_CHECKLIST.md) as a STOP:

| Manual gate | Why it cannot be automated |
| --- | --- |
| WCAG 2.1 AA external audit (Deque / TPGi / Level Access) | Requires a human auditor producing a VPAT. Internal axe runs only catch automatable rules. |
| Penetration test cycle | Requires a third-party engagement and a written attestation. |
| Canvas LTI 1.3 certification | IMS Global cert process driven by the LMS vendor. We can verify our `/lti/*` surfaces locally; we cannot self-issue the cert. |
| Real-LMS exit-gate test | An instructor uploading a caption and a student watching it from a real Canvas course is the ultimate proof, and requires a real Canvas instance. |

## "Trusted" definition

The application is considered trusted at this level when, on every push to `main`:

- All L1–L4 tests pass.
- L5 type checks are green; L5 audit either passes strictly or is documented as
  a tracked notice with a remediation path.
- L6 smoke has been green for the last 24 hours.
- The L1.5 manual deliverables (VPAT, pen-test attestation, Canvas LTI cert) are
  stored or linked from `docs/`. The presence of those documents is the L1.5
  check; the human work behind them is not something this plan executes.
