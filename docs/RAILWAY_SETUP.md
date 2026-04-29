# Railway (STOP S2–S4)

CaptionFlow uses **Nixpacks** (`railway.toml`, `nixpacks.toml`): build runs `npm run build` only; **database migrations** run when the server starts (`runMigrations()` in `src/server/index.ts`), because the Postgres private URL is not available during the image build. Health check: `GET /health`.

---

## 1. Authenticate the Railway CLI (required for Cursor MCP)

The **Cursor Railway MCP** (`user-railway`) shells out to the same **Railway CLI** as your terminal. If `check-railway-status` says “Not logged in”, nothing else will work until you fix that.

**Option A — Interactive (simplest)**  
In a terminal on your machine:

```bash
railway login
```

Complete the browser OAuth flow.

**Option B — Token (CI, headless, or when the browser flow fails)**  
Create a token in the Railway dashboard ([Account tokens](https://railway.app/account/tokens)), then either:

```bash
export RAILWAY_API_TOKEN="your_account_token_here"
railway whoami
```

or for **project-scoped** tokens (some flows):

```bash
export RAILWAY_TOKEN="your_project_token_here"
```

See [Railway CLI — Login](https://docs.railway.com/cli/login): if `RAILWAY_TOKEN` or `RAILWAY_API_TOKEN` is set, the CLI uses it instead of prompting.

Verify:

```bash
railway whoami
```

---

## 2. After you are logged in — what the MCP can do

Ask the agent to run the Railway MCP tools against this repo path  
`/Users/admin/Documents/StuPath/CaptionFlow` (or your local clone path as `workspacePath`).

Typical sequence:

| Step | MCP tool | Purpose |
|------|-----------|---------|
| 1 | `check-railway-status` | Confirm CLI + login |
| 2 | `create-project-and-link` | New project + link this directory |
| 3 | `deploy-template` | e.g. `searchQuery`: `PostgreSQL` — adds Postgres to the project |
| 4 | `list-services` | See web app vs database service names |
| 5 | `link-service` | Point the linked service at your Node app if needed |
| 6 | `generate-domain` | Railway-generated `*.up.railway.app` URL for `BASE_URL` |
| 7 | `set-variables` | Set secrets (see §3) |
| 8 | `deploy` | Trigger a deploy (if not using GitHub auto-deploy) |

You can also do steps 2–4 in the [Railway dashboard](https://railway.app): **New project** → **Deploy from GitHub repo** → add **PostgreSQL** plugin.

---

## 3. Environment variables (CaptionFlow)

Set these on the **web** service (values depend on your Resend/domain setup):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Usually provided when Postgres is attached; reference the Postgres plugin variable if Railway does not inject it automatically. |
| `BASE_URL` | Public HTTPS origin (custom domain or `generate-domain` output), **no** trailing slash. |
| `SESSION_SECRET` | At least 32 random bytes (e.g. `openssl rand -hex 32`). |
| `RESEND_API_KEY` | From Resend (STOP S3). |
| `FROM_EMAIL` | Verified sender in Resend. |
| `LTI_ENCRYPTION_KEY` | Required if LTI is enabled; see `.env.example` / `config.ts`. |

Optional: `DEEPL_API_KEY`, `GOOGLE_TRANSLATE_API_KEY` for machine translation.

Use MCP `set-variables` with entries like `BASE_URL=https://your-app.up.railway.app` (array of `KEY=value` strings). For **`DATABASE_URL=${{Postgres.DATABASE_URL}}`**, use the CLI with **single quotes** so the shell does not treat `${{…}}` as bash expansion:

`railway variables --service YourWebService --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'`

---

## 4. GitHub → Railway (auto-deploy)

1. **Install the [Railway GitHub App](https://github.com/apps/railway-app)** on your account (or org) and grant access to **`rvegajr/CaptionFlow`** (or “All repositories” during setup). Without this, `railway add --repo …` returns **repo not found**.
2. From the repo root, create a **GitHub-backed** service (example name used in this project: **`CaptionFlow-gh`**):

   ```bash
   railway add --repo rvegajr/CaptionFlow --service CaptionFlow-gh
   ```

3. Point the CLI at that service and set env vars (see §3), especially **`BASE_URL`** to this service’s public URL and **`DATABASE_URL='${{Postgres.DATABASE_URL}}'`** (single quotes).

4. **Remove the old upload-only web service** (e.g. **`CaptionFlow`**) in the Railway project canvas if you no longer need it, so you are not paying for two Node services.

Pushes to **`main`** on `rvegajr/CaptionFlow` then trigger builds for **`CaptionFlow-gh`**.

---

## 5. Smoke test after first deploy

1. `GET https://<your-host>/health` → `{ "status": "ok" }`  
2. Magic-link signup, caption upload, caption surface playback (see plan exit gate).

When `railway whoami` works on your machine, say **“Railway is logged in”** in chat and the agent can run `create-project-and-link`, Postgres template, `generate-domain`, and `set-variables` for you via MCP.
