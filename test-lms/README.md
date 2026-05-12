# Mock LMS - Testing CaptionFlow LTI 1.3 Integration

This is a lightweight mock Learning Management System (Canvas/Blackboard/Moodle simulator) for testing CaptionFlow's LTI 1.3 integration end-to-end.

## Purpose

Test the complete LTI flow without needing access to a real LMS:
- ✅ Platform registration and OIDC handshakes
- ✅ Deep Linking 2.0 (instructor content selection)
- ✅ Student launches with custom parameters
- ✅ CSP iframe embedding
- ✅ Multi-platform scenarios

## Quick Start (Local)

### 1. Start CaptionFlow
```bash
npm run dev
# CaptionFlow runs on http://localhost:3000 (API) and http://localhost:5173 (web)
```

### 2. Start Mock LMS
```bash
cd test-lms
node server.cjs
# Mock LMS runs on http://localhost:4000
```

### 3. Register Mock LMS in CaptionFlow

1. Visit **http://localhost:5173/#lms-config** (sign in as institution_admin)
2. Click **"Register New LMS"**
3. Fill in the form with these values:

```
Name: Mock LMS (Local)
Issuer URL: http://localhost:4000
Client ID: mock-lms-client-123
Auth Endpoint: http://localhost:4000/lms/auth
Token Endpoint: http://localhost:4000/lms/token
JWKS URL: http://localhost:4000/lms/.well-known/jwks
Deployment IDs: 1
```

4. Click **"Register Platform"**
5. **Restart CaptionFlow** (Ctrl+C and `npm run dev` again)

### 4. Test Deep Linking

1. Open **http://localhost:4000** in your browser
2. Click **"Launch Content Picker"** (instructor scenario)
3. CaptionFlow's picker opens → select a resource
4. Click **"Add to Course"**
5. You're redirected back with success message

### 5. Test Student Launch

1. Copy a resource ID from CaptionFlow dashboard
2. Paste in "Resource ID" field on mock LMS page
3. Click **"Launch as Student"**
4. Caption surface loads with the selected resource

---

## Railway Deployment (Production Testing)

Test the full LTI integration against your **live CaptionFlow instance** on Railway.

### Deploy Mock LMS to Railway

#### Option A: Via Railway CLI

```bash
cd test-lms
railway init
railway up
```

When prompted for service name, use: `captionflow-mock-lms`

#### Option B: Via Railway Dashboard

1. Go to your CaptionFlow project: https://railway.app
2. Click **"New Service"** → **"Empty Service"**
3. Name it: `CaptionFlow Mock LMS`
4. Settings → Generate Domain (e.g., `captionflow-mock-lms.up.railway.app`)
5. Settings → Variables:
   ```
   CAPTIONFLOW_URL=https://captionflow.link
   PORT=3000
   ```
6. Connect to GitHub repo, set root directory: `test-lms`

#### Option C: Railway Button (One-Click Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=...)

*(Configuration in `test-lms/railway.toml`)*

### Register Production Mock LMS

After deploying, register it in CaptionFlow:

1. Visit **https://captionflow.link/#lms-config**
2. Sign in as institution admin
3. Click **"Register New LMS"**
4. Use your Railway-generated URL:

```
Name: Mock LMS (Railway)
Issuer URL: https://captionflow-mock-lms.up.railway.app
Client ID: mock-lms-client-123
Auth Endpoint: https://captionflow-mock-lms.up.railway.app/lms/auth
Token Endpoint: https://captionflow-mock-lms.up.railway.app/lms/token
JWKS URL: https://captionflow-mock-lms.up.railway.app/lms/.well-known/jwks
Deployment IDs: 1
```

4. Save and **restart your CaptionFlow service** on Railway

### Test Live Integration

1. Visit your mock LMS: `https://captionflow-mock-lms.up.railway.app`
2. Follow the on-screen test scenarios
3. Verify the full LTI cycle works in production

---

## Architecture

```
┌─────────────────┐         OIDC Login          ┌──────────────────┐
│   Mock LMS      │◄──────────────────────────► │   CaptionFlow    │
│  (Platform)     │                              │     (Tool)       │
│                 │                              │                  │
│ Port: 4000      │    Deep Link Request         │ Port: 3000/5173  │
│ Acts as Canvas/ │─────────────────────────────►│                  │
│ Blackboard/     │                              │ Content Picker   │
│ Moodle          │◄─────────────────────────────│ Returns Item     │
│                 │    Deep Link Response         │                  │
│                 │                              │                  │
│ Student Launch  │                              │ Caption Surface  │
│ with custom     │─────────────────────────────►│ Loads Resource   │
│ resource ID     │      Launch + JWT             │                  │
└─────────────────┘                              └──────────────────┘
```

---

## Testing Scenarios

### Scenario 1: Instructor Adds Content (Deep Linking)

**Goal:** Instructor selects which caption to embed in their course.

1. Mock LMS: Click "Launch Content Picker"
2. OIDC handshake redirects to CaptionFlow login
3. CaptionFlow: Shows `/lti/picker` with instructor's resources
4. Select a resource, click "Add to Course"
5. Deep link JWT returned to mock LMS
6. Mock LMS displays success with JWT preview

**Expected:** No errors, JWT contains `captionflow_resource_id` custom param

---

### Scenario 2: Student Launches Embedded Content

**Goal:** Student clicks link in LMS and sees the captioned video.

1. Mock LMS: Paste resource ID, click "Launch as Student"
2. OIDC handshake redirects to CaptionFlow
3. CaptionFlow reads `custom.captionflow_resource_id`
4. Redirects to `/caption-surface.html?resource=<id>`
5. Video + captions load

**Expected:** No CSP errors, video plays, captions sync

---

### Scenario 3: Legacy Launch (No Deep Link)

**Goal:** Verify stub creation for old-style launches.

1. Mock LMS: Leave resource ID blank, click "Launch as Student"
2. CaptionFlow doesn't find a deep link or existing resource
3. Creates stub caption + resource
4. Redirects to stub video

**Expected:** Stub video (`dQw4w9WgXcQ`) loads with placeholder caption

---

## Troubleshooting

### "Platform not registered" error
- **Cause:** CaptionFlow hasn't loaded the platform from DB
- **Fix:** Restart CaptionFlow after registering the platform

### CSP "Refused to frame" error
- **Cause:** `frame-ancestors` doesn't include mock LMS URL
- **Fix:** Add mock LMS domain to `LMS_FRAME_ANCESTORS` env var in CaptionFlow

### "Failed to load resources" in picker
- **Cause:** Picker can't authenticate or fetch `/api/resources`
- **Fix:** Check CaptionFlow logs, verify instructor record exists

### Deep link returns blank page
- **Cause:** ltijs `createDeepLinkingForm` failing
- **Fix:** Check CaptionFlow logs for `Deep linking failed` error

### 404 on `/lti/picker/confirm`
- **Cause:** Route not registered or static file serving blocking it
- **Fix:** Verify `registerLti` completes, check middleware order

---

## Environment Variables

### Mock LMS

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for mock LMS server |
| `CAPTIONFLOW_URL` | `http://localhost:3000` | CaptionFlow base URL |
| `LTI_SECRET` | `MOCK_LMS_SECRET_KEY...` | JWT signing key |

### CaptionFlow (for testing)

| Variable | Example | Description |
|---|---|---|
| `LMS_FRAME_ANCESTORS` | `http://localhost:4000` | Allow mock LMS to iframe CaptionFlow |
| `LTI_ENCRYPTION_KEY` | *(32+ chars)* | LTI session encryption key |

---

## Development Notes

### Tech Stack
- **Express** - HTTP server
- **ltijs** - LTI 1.3 library (acts as platform, not tool)
- **ltijs-sequelize** - In-memory SQLite storage
- **Vanilla JS** - No framework for UI

### Why In-Memory DB?
This is a test harness, not a real LMS. State resets on restart to ensure clean tests.

### Adding Test Scenarios
Edit `server.cjs` and add new routes/forms for additional test cases (e.g., multiple deployments, role variations, custom claims).

---

## Files

```
test-lms/
├── README.md          # This file
├── server.cjs         # Mock LMS Express server
├── package.json       # Dependencies
├── railway.toml       # Railway deployment config
└── Dockerfile         # Container config (optional)
```

---

## Security Notice

🚨 **This mock LMS is for testing only.** Do not use in production or expose publicly without authentication. The hardcoded keys and in-memory storage are intentionally insecure for ease of testing.

---

## Related Documentation

- [LTI 1.3 Spec](https://www.imsglobal.org/spec/lti/v1p3)
- [Deep Linking 2.0](https://www.imsglobal.org/spec/lti-dl/v2p0)
- [ltijs Documentation](https://cvmcosta.me/ltijs/)
- [CaptionFlow LMS Configuration](../docs/LMS_SETUP.md)

---

## Support

For issues with the mock LMS or CaptionFlow integration:
1. Check logs in both services
2. Verify platform registration in CaptionFlow admin UI
3. Confirm all URLs match (http vs https, ports, domains)
4. Test locally before deploying to Railway

---

Built with ❤️ for testing CaptionFlow LTI integration
