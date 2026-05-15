# Noctusoft Communication Relay

CaptionFlow can route all third-party API egress through the Noctusoft
Communication Relay so we don't have to manage SendGrid, Twilio, or Google
credentials per environment. The relay terminates SSL on subdomains of
`noctusoft.com`, authenticates with a single deploy key, and forwards to the
upstream provider.

Reference: <https://docs.api.noctusoft.com/>

---

## What we route through the relay

| Surface | Direct API | Noctusoft URL | Used by |
|---|---|---|---|
| **Magic-link email** | `api.sendgrid.com` | `api.sendgrid.noctusoft.com` | `NoctusoftSendGridMagicLinkSender` |
| **Caption translation** | `translation.googleapis.com` | `googleapis.noctusoft.com` | `translateLines` (Google fallback) |
| **DeepL** | `api-free.deepl.com` | *(not relayed — DeepL not supported by relay)* | `translateLines` (primary) |

DeepL stays direct because the relay doesn't proxy DeepL. We continue to
prefer DeepL over Google for caption translation, so the relay is only used
for the Google fallback path.

---

## Authentication

A single **deploy key** (`nsins_dk_*`) authenticates every relayed call. The
relay injects the upstream provider's actual API key on the way out, so we
never store SendGrid/Google keys directly.

```
Authorization: Bearer nsins_dk_cd8c0425f52e49da6c938b9163c114053f08a0faad6cd7b5
```

> The example deploy key above is in the public Noctusoft docs. Treat it as
> a shared secret — rotate via the [Noctusoft admin panel](https://noctusoft.com/twilio/api/access/admin)
> if you suspect compromise.

---

## Environment variables

Set these on Railway (or in `.env` for local dev). See
[`.env.example`](../.env.example) for the canonical list.

| Variable | Required | Purpose |
|---|---|---|
| `NOCTUSOFT_API_KEY` | Yes (production) | Deploy key (`nsins_dk_*`). Enables relay-based email and Google routing. |
| `FROM_EMAIL` | Yes | Sender address. **Must be on a SendGrid-verified domain** (see below). |
| `NOCTUSOFT_FROM_NAME` | No | Display name. Defaults to `CaptionFlow`. |
| `RESEND_API_KEY` | No | Legacy fallback. Used only when `NOCTUSOFT_API_KEY` is unset. |

### Adapter selection

`src/server/index.ts` picks the magic-link sender at boot:

1. **Noctusoft** — if `NOCTUSOFT_API_KEY` and `FROM_EMAIL` are both set
2. **Resend** — if `RESEND_API_KEY` and `FROM_EMAIL` are both set
3. **Fake** — dev only. Stores the link in memory for Playwright tests.

The choice is logged at startup as `mailer=noctusoft-sendgrid|resend|fake`.

### Verified sender domains (SendGrid)

`FROM_EMAIL` must use a domain that's been verified in the upstream SendGrid
account that the relay forwards to. As of 2026-05-15:

- `*@bdp.network`
- `*@blessbox.org`
- `*@emberlead.pro`
- `*@escalatingreminders.com`
- `*@fieldview.live`
- `*@liveenergy.com`
- `*@rpsfull.pro`
- `*@rubriqflow.com`
- `*@scholarmancy.com`
- `*@tankroom.pro`
- `*@yolovibecodebootcamp.com`

`captionflow.link` is **not yet** on the list. Pick a verified domain (e.g.
`noreply@scholarmancy.com`) until DKIM/SPF for `captionflow.link` is added in
the SendGrid console.

---

## Local testing

Set the variables in `.env`:

```bash
NOCTUSOFT_API_KEY=nsins_dk_<your-deploy-key>
FROM_EMAIL=noreply@scholarmancy.com
NOCTUSOFT_FROM_NAME=CaptionFlow
```

Send yourself a magic link:

```bash
curl -X POST http://localhost:3000/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"you@yourdomain.com"}'
```

Check the email. The "From" line should read `CaptionFlow <noreply@scholarmancy.com>`.

### Sanity-check the relay directly

```bash
curl -X POST https://api.sendgrid.noctusoft.com/v3/mail/send \
  -H "Authorization: Bearer $NOCTUSOFT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations":[{"to":[{"email":"you@yourdomain.com"}]}],
    "from":{"email":"noreply@scholarmancy.com","name":"CaptionFlow Smoke Test"},
    "subject":"relay smoke test",
    "content":[{"type":"text/plain","value":"hello"}]
  }'
```

A `202 Accepted` from the relay means it forwarded the request. Anything
else and you'll see the SendGrid error inline.

---

## Production deployment (Railway)

Set the variables on the `CaptionFlow` service:

```bash
railway variables set \
  NOCTUSOFT_API_KEY=nsins_dk_<your-deploy-key> \
  FROM_EMAIL=noreply@scholarmancy.com \
  NOCTUSOFT_FROM_NAME=CaptionFlow \
  --service CaptionFlow
```

Or via the Railway dashboard → CaptionFlow → Variables.

Railway will redeploy. Confirm the right adapter was selected by checking
the boot log:

```
listening on 3000  mailer=noctusoft-sendgrid
```

---

## Rollback

If the relay misbehaves, fall back to direct Resend in one step:

1. Unset `NOCTUSOFT_API_KEY` on Railway.
2. Set `RESEND_API_KEY` (and confirm `FROM_EMAIL` is on a Resend-verified
   domain).
3. Redeploy. The boot log will read `mailer=resend`.

Translation falls back automatically: removing `NOCTUSOFT_API_KEY` causes
`translateLines` to call `translation.googleapis.com` directly using the
existing `GOOGLE_TRANSLATE_API_KEY`.

---

## What we deliberately don't relay

| Service | Why not (yet) |
|---|---|
| **DeepL** | Relay doesn't proxy DeepL. Keep direct. |
| **Twilio SMS** | We don't send SMS today. The relay supports it (`api.twilio.noctusoft.com`) for future admin alerts. |
| **Square payments** | Out of scope. CaptionFlow has no payment flow. |
| **YouTube IFrame API** | Client-side, not a server-egress concern. |

---

## Related code

- [`src/server/adapters/noctusoft-magic-link-sender.ts`](../src/server/adapters/noctusoft-magic-link-sender.ts)
- [`src/server/adapters/noctusoft-magic-link-sender.test.ts`](../src/server/adapters/noctusoft-magic-link-sender.test.ts)
- [`src/server/lib/translate-text.ts`](../src/server/lib/translate-text.ts) (Google routing)
- [`src/server/config.ts`](../src/server/config.ts) (env validation)
- [`src/server/index.ts`](../src/server/index.ts) (adapter selection)
