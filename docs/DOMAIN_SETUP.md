# Domain Setup Guide

This guide covers DNS configuration for `captionflow.link` to enable:
1. **Railway custom domain** (serve the app from your domain)
2. **Resend verified sender** (send magic-link emails from your domain)

---

## Step 1: Railway DNS Configuration

Add this DNS record at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

### CNAME Record for Traffic Routing

| Type  | Name/Host | Value/Target              | TTL  |
|-------|-----------|---------------------------|------|
| CNAME | @         | k2hi9iyv.up.railway.app   | Auto |

**Notes:**
- `@` represents the root domain (`captionflow.link`)
- Some registrars use `captionflow.link` instead of `@` for the root
- Railway will automatically provision an SSL certificate once DNS propagates (5-30 minutes)

### Verify Railway Domain

After adding the DNS record, check status:

```bash
railway domain
```

Look for `CERTIFICATE_STATUS_TYPE_READY` - this means SSL is active and your site is live on `https://captionflow.link`.

---

## Step 2: Resend Email Configuration

To send magic-link emails from `noreply@captionflow.link`, you need to verify domain ownership with Resend.

### Get Your DNS Records from Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **Add Domain**
3. Enter `captionflow.link`
4. Resend will provide **3 DNS records** to add (SPF, DKIM, DMARC)

### Example Records (yours will be different)

You'll receive records similar to:

| Type  | Name/Host                          | Value/Target                                      | TTL  |
|-------|------------------------------------|---------------------------------------------------|------|
| TXT   | @                                  | v=spf1 include:_spf.resend.com ~all               | Auto |
| TXT   | resend._domainkey                  | p=MIGfMA0GCSqGSIb3DQEBAQUAA4G...                  | Auto |
| TXT   | _dmarc                             | v=DMARC1; p=none;                                 | Auto |

**⚠️ IMPORTANT:** Use the exact values from your Resend dashboard, not these examples.

### Add Records to Your DNS

1. Log in to your domain registrar
2. Navigate to DNS management for `captionflow.link`
3. Add all 3 TXT records provided by Resend
4. Save changes

### Verify in Resend

After adding records (wait 5-30 minutes for propagation):

1. Return to Resend dashboard
2. Click **Verify** next to `captionflow.link`
3. Once verified, you'll see a green checkmark ✓

### Get Your Resend API Key

1. In Resend dashboard, go to **API Keys**
2. Create a new API key (name it "CaptionFlow Production")
3. Copy the key (starts with `re_...`)

### Add to Railway

```bash
cd /Users/admin/Documents/StuPath/CaptionFlow
railway variables --set 'RESEND_API_KEY=re_your_actual_key_here'
```

**Replace `re_your_actual_key_here` with your real API key.**

---

## Step 3: Redeploy

After all DNS records are added and verified:

```bash
railway up
```

This triggers a new deployment with:
- `BASE_URL=https://captionflow.link`
- `NODE_ENV=production` (enables security headers, CSP)
- `FROM_EMAIL=noreply@captionflow.link`
- `RESEND_API_KEY=re_...` (once you add it)

---

## Step 4: Test

### Test the Domain

Visit: **https://captionflow.link**

You should see the CaptionFlow landing page with a valid SSL certificate (🔒).

### Test Magic-Link Email

1. Go to `https://captionflow.link/#login`
2. Enter your email address
3. Click "Send Magic Link"
4. Check your inbox for an email from `noreply@captionflow.link`
5. Click the link to log in

---

## Troubleshooting

### Railway domain shows "Certificate validating"

- **Cause:** DNS hasn't propagated yet
- **Fix:** Wait 5-30 minutes, then run `railway domain` to check status
- **Verify DNS:** Use `dig captionflow.link` - should show `k2hi9iyv.up.railway.app`

### Resend verification failing

- **Cause:** DNS records not added correctly or not propagated
- **Fix:** Double-check TXT record names and values in your registrar
- **Verify DNS:** Use `dig txt captionflow.link` to see TXT records

### Email not sending (500 error)

- **Cause:** Missing or invalid `RESEND_API_KEY`
- **Fix:** Check Railway variables with `railway variables` - ensure `RESEND_API_KEY` is set
- **Test API Key:** Visit [Resend API Keys](https://resend.com/api-keys) to verify it's active

### Email sending but not arriving

- **Cause:** Domain not verified in Resend
- **Fix:** Check [Resend Domains](https://resend.com/domains) - must show verified ✓
- **Check spam:** Look in spam/junk folder

---

## Summary Checklist

- [ ] Add CNAME record at domain registrar: `@ → k2hi9iyv.up.railway.app`
- [ ] Wait for Railway SSL certificate (check with `railway domain`)
- [ ] Add domain to Resend dashboard
- [ ] Add 3 TXT records (SPF, DKIM, DMARC) from Resend to domain registrar
- [ ] Verify domain in Resend (green checkmark)
- [ ] Create Resend API key
- [ ] Add `RESEND_API_KEY` to Railway variables
- [ ] Redeploy with `railway up`
- [ ] Test site at `https://captionflow.link`
- [ ] Test magic-link email flow

---

**Once complete, CaptionFlow will be production-ready with:**
- ✅ Custom domain with SSL
- ✅ Verified email sender
- ✅ Production security headers (CSP, rate limits)
- ✅ Professional branding
