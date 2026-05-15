# CaptionFlow Automation Scripts

Playwright scripts for automating CaptionFlow admin tasks.

## Setup

Install dependencies (if not already installed):

```bash
npm install --save-dev @playwright/test tsx
npx playwright install chromium
```

## Register Demo LMS Platform

### Option 1: Quick Run (No Saved Session)

```bash
npx tsx scripts/register-demo-lms.ts
```

This will open a browser. If you're not signed in, it will tell you to sign in first, then run the script again.

### Option 2: Save Session (Recommended)

Save your authentication session once:

```bash
npx tsx scripts/save-auth-session.ts
```

This will:
1. Open a browser
2. Wait for you to sign in
3. Save your session to `playwright/.auth/user.json`

Then run any automation scripts without signing in each time:

```bash
npx tsx scripts/register-demo-lms.ts
```

## What It Does

The `register-demo-lms.ts` script:
1. Navigates to `https://captionflow.link/#lms-config`
2. Clicks "Register New LMS"
3. Fills out the form with Demo LMS details:
   - **Name:** Demo LMS
   - **Issuer URL:** https://demo-lms.captionflow.link
   - **Client ID:** mock-lms-client-123
   - **Auth Endpoint:** https://demo-lms.captionflow.link/lms/auth
   - **Token Endpoint:** https://demo-lms.captionflow.link/lms/token
   - **JWKS URL:** https://demo-lms.captionflow.link/lms/.well-known/jwks
   - **Deployment IDs:** 1
4. Submits the registration
5. Takes a screenshot for verification

## After Running

After the platform is registered:

1. **Restart CaptionFlow on Railway** (platforms load on startup)
   ```bash
   railway service --service CaptionFlow
   railway restart
   ```
   Or via Railway dashboard: CaptionFlow Service → Redeploy

2. **Test the integration**
   - Visit https://demo-lms.captionflow.link
   - Click "Launch Content Picker"
   - Verify the full LTI flow works

## Troubleshooting

### "Not authenticated" error

Run the save-auth-session script first:
```bash
npx tsx scripts/save-auth-session.ts
```

### "Cannot find module '@playwright/test'"

Install Playwright:
```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

### Form fields not found

The UI might have changed. Check the screenshot at `scripts/error-screenshot.png` to see what went wrong, then update the script's selectors.

### Platform already exists

If the platform is already registered, you'll need to delete it first via the web UI or update the script to handle editing existing platforms.

## Files

- `register-demo-lms.ts` - Automates Demo LMS platform registration
- `save-auth-session.ts` - Saves your login session for reuse
- `README.md` - This file
- `playwright/.auth/user.json` - Saved authentication session (gitignored)

## Security Note

The `playwright/.auth/user.json` file contains your session cookies. It's automatically gitignored. Don't commit it or share it.
