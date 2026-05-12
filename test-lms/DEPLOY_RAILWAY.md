# Deploying Mock LMS to Railway

This guide shows how to deploy the Mock LMS as a **separate Railway service** alongside your CaptionFlow production instance.

## Why Deploy Mock LMS?

- **Production Testing:** Test LTI integration against your live CaptionFlow instance
- **Demos:** Show clients/stakeholders the full LTI flow without Canvas/Blackboard access
- **CI/CD:** Run automated end-to-end tests against a stable mock platform
- **Multi-Platform Testing:** Simulate multiple LMS instances with different configurations

---

## Deployment Options

### Option 1: Railway CLI (Recommended)

```bash
# Navigate to test-lms directory
cd test-lms

# Login to Railway (if not already)
railway login

# Link to your existing CaptionFlow project
railway link

# Create a new service in the project
railway service create

# Name it (when prompted): captionflow-mock-lms

# Deploy
railway up
```

**Result:** Mock LMS deploys as a separate service in your CaptionFlow project.

---

### Option 2: Railway Dashboard

1. **Open your CaptionFlow project** on Railway dashboard
2. **Click "+ New"** → **"Empty Service"**
3. **Name it:** `CaptionFlow Mock LMS`
4. **Settings** → **Source:**
   - Connect to your GitHub repo
   - Set **Root Directory:** `test-lms`
   - Set **Build Command:** *(auto-detected from package.json)*
   - Set **Start Command:** `npm start`
5. **Generate Domain:**
   - Settings → Networking → Generate Domain
   - Example: `captionflow-mock-lms.up.railway.app`
6. **Deploy** (Railway auto-builds on push)

---

### Option 3: Monorepo Template (Advanced)

If you want a one-click deploy for both CaptionFlow + Mock LMS:

1. Create `railway.json` at repo root:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "nixpacks"
     },
     "deploy": {
       "numReplicas": 1,
       "restartPolicyType": "on_failure"
     }
   }
   ```

2. Railway will detect the `test-lms/railway.toml` and offer it as a second service

---

## Environment Variables

After deploying, set these in Railway dashboard for the Mock LMS service:

| Variable | Value | Notes |
|---|---|---|
| `PORT` | `3000` | Railway auto-injects this |
| `CAPTIONFLOW_URL` | `https://captionflow.link` | Your CaptionFlow production URL |
| `LTI_SECRET` | *(auto-generated)* | Optional: for stable JWT signing |

**Optional:** Set a custom `LTI_SECRET` for deterministic JWTs (useful for debugging).

---

## Post-Deployment Setup

### 1. Get Mock LMS URL

In Railway dashboard:
- Mock LMS Service → Settings → Networking → Public URL
- Copy it (e.g., `https://captionflow-mock-lms.up.railway.app`)

### 2. Register in CaptionFlow

Visit your CaptionFlow admin UI:
- **URL:** `https://captionflow.link/#lms-config`
- **Sign in** as `institution_admin`
- **Click:** "Register New LMS"
- **Fill in:**
  ```
  Name: Mock LMS (Railway)
  Issuer URL: https://captionflow-mock-lms.up.railway.app
  Client ID: mock-lms-client-123
  Auth Endpoint: https://captionflow-mock-lms.up.railway.app/lms/auth
  Token Endpoint: https://captionflow-mock-lms.up.railway.app/lms/token
  JWKS URL: https://captionflow-mock-lms.up.railway.app/lms/.well-known/jwks
  Deployment IDs: 1
  ```
- **Save**

### 3. Update CaptionFlow CSP

Add Mock LMS to allowed iframe origins:

1. CaptionFlow Service → Variables
2. Set: `LMS_FRAME_ANCESTORS=https://captionflow-mock-lms.up.railway.app`
   - *(If you already have origins, comma-separate them)*
3. **Redeploy** CaptionFlow (or it will auto-redeploy on next push)

### 4. Restart CaptionFlow

Platform registrations load on startup, so restart CaptionFlow:

- Railway Dashboard → CaptionFlow Service → **Redeploy**

---

## Testing the Deployed Mock LMS

1. **Visit:** `https://captionflow-mock-lms.up.railway.app`
2. **Verify:** Page loads with "Mock LMS" heading and setup instructions
3. **Click:** "Launch Content Picker"
   - Should redirect to CaptionFlow login
   - After login, shows content picker
   - Select a resource
   - Returns to Mock LMS with success message
4. **Click:** "Launch as Student" (with resource ID)
   - Should open CaptionFlow caption surface
   - Video and captions load

---

## Architecture: Two Services, One Project

```
Railway Project: CaptionFlow
├── Service 1: captionflow (main app)
│   ├── Domain: captionflow.link (custom)
│   ├── Database: PostgreSQL
│   └── Runs: src/server/app.ts
│
└── Service 2: captionflow-mock-lms (test harness)
    ├── Domain: captionflow-mock-lms.up.railway.app
    ├── Database: (none, uses in-memory SQLite)
    └── Runs: test-lms/server.cjs
```

**Benefits:**
- Both services in same project (easier management)
- Mock LMS can use same PostgreSQL (if needed in future)
- Shared environment variables (via Railway project secrets)
- Logs/metrics in one place

---

## Automated Testing with Deployed Mock LMS

Example: GitHub Actions E2E test

```yaml
# .github/workflows/e2e-lti.yml
name: LTI Integration Tests

on: [push, pull_request]

jobs:
  test-lti:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Run E2E LTI Tests
        env:
          CAPTIONFLOW_URL: https://captionflow.link
          MOCK_LMS_URL: https://captionflow-mock-lms.up.railway.app
        run: |
          npm ci
          npm run test:lti
```

*(Future enhancement: add Playwright/Cypress tests for LTI flows)*

---

## Monitoring & Logs

### View Mock LMS Logs

**Via Dashboard:**
- Mock LMS Service → Deployments → (latest) → Logs

**Via CLI:**
```bash
railway logs --service captionflow-mock-lms
```

### Common Log Messages

**Success:**
```
Mock LMS running on port 3000
LTI Provider configured
Visit http://localhost:3000 to test
```

**Errors:**
```
Error: Failed to configure ltijs - Database connection failed
→ Check DATABASE_URL if using external DB
```

---

## Scaling & Performance

Mock LMS is stateless (in-memory DB resets on restart), so you can:
- **Increase replicas** for load testing (Railway Pro plan)
- **Add caching** (Redis) for shared state across replicas (future)
- **Run multiple instances** with different configurations (e.g., Canvas simulation vs Moodle simulation)

---

## Cost Estimate

**Railway Pricing (Hobby Plan):**
- CaptionFlow Service: ~$5-10/month
- Mock LMS Service: ~$1-3/month (minimal resources)
- PostgreSQL: Shared with CaptionFlow

**Total added cost:** ~$1-3/month for having a persistent test LMS in production.

---

## Teardown

To remove the Mock LMS service:

1. Railway Dashboard → Mock LMS Service → Settings
2. **Delete Service**
3. In CaptionFlow admin UI, delete the "Mock LMS (Railway)" platform registration
4. Restart CaptionFlow

---

## Troubleshooting

### Mock LMS fails to start

**Error:** `Cannot find module 'express'`  
**Fix:** Railway didn't install dependencies. Check `package.json` is in `test-lms/` folder.

**Error:** `listen EADDRINUSE :::4000`  
**Fix:** Don't hardcode port. Use `process.env.PORT || 4000` (Railway injects `PORT=3000`).

---

### CaptionFlow can't reach Mock LMS

**Error:** Platform registration shows "Failed to connect"  
**Fix:** Ensure Mock LMS domain is publicly accessible (not localhost).

**Error:** JWKS fetch fails  
**Fix:** Verify `https://captionflow-mock-lms.up.railway.app/lms/.well-known/jwks` returns JSON in browser.

---

### Deep link flow redirects to 404

**Symptom:** After selecting content, blank page  
**Fix:** Check CaptionFlow logs for "Deep linking failed". Verify `/lti/picker/confirm` route is registered.

---

### CSP errors in browser console

**Error:** `Refused to frame 'https://captionflow.link' because it violates the following Content Security Policy directive: "frame-ancestors 'self'"`

**Fix:** Add Mock LMS URL to `LMS_FRAME_ANCESTORS` in CaptionFlow env vars, then redeploy.

---

## Security Considerations

🔒 **Mock LMS uses hardcoded secrets** for ease of testing. This is acceptable because:
- It doesn't store real user data
- In-memory DB resets on restart
- Used for testing, not production user traffic

⚠️ **Do not:**
- Give students access to the Mock LMS URL (intended for instructors/developers only)
- Store sensitive data in Mock LMS forms
- Use Mock LMS as a real LMS replacement

---

## Next Steps

After deploying Mock LMS to Railway:

1. ✅ Test full LTI integration in production
2. ✅ Use for demos/QA
3. [ ] Add automated E2E tests (Playwright/Cypress)
4. [ ] Configure multiple mock LMS instances (Canvas config, Blackboard config, etc.)
5. [ ] Set up monitoring alerts (Railway webhooks → Slack/Discord)

---

**Questions?** Check the [main Mock LMS README](README.md) or [LMS Testing Guide](../docs/LMS_TESTING.md).

---

Built for seamless CaptionFlow LTI testing 🚀
