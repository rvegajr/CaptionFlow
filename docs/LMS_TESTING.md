# LMS Integration Testing Guide

This guide covers testing CaptionFlow's LTI 1.3 integration with real and mock Learning Management Systems.

## Quick Test: Mock LMS (Recommended)

The fastest way to test the complete LTI integration is with our **Mock LMS**.

### Local Testing

```bash
# Terminal 1: Start CaptionFlow
npm run dev

# Terminal 2: Start Mock LMS  
cd test-lms
node server.cjs
```

Visit **http://localhost:4000** and follow the interactive guide.

**Full documentation:** [`test-lms/README.md`](../test-lms/README.md)

---

### Production Testing on Railway

Deploy the Mock LMS as a separate Railway service to test your live CaptionFlow instance:

1. **Deploy Mock LMS:**
   ```bash
   cd test-lms
   railway init
   railway up
   ```

2. **Generate Domain** in Railway dashboard (e.g., `captionflow-mock-lms.up.railway.app`)

3. **Register in CaptionFlow:**
   - Visit `https://captionflow.link/#lms-config`
   - Register the mock LMS using its Railway URL
   - Restart CaptionFlow service

4. **Test:** Visit your mock LMS URL and run through scenarios

---

## Testing with Real LMS Platforms

### Canvas (Instructure)

**Prerequisites:**
- Canvas account with admin access
- Developer Keys enabled

**Steps:**

1. **Register CaptionFlow as LTI Tool:**
   - Canvas Admin → Developer Keys → + LTI Key
   - Method: **Manual Entry**
   - Redirect URIs: `https://captionflow.link/lti/launch`
   - Target Link URI: `https://captionflow.link/lti/launch`
   - OpenID Connect Initiation URL: `https://captionflow.link/lti/login`
   - JWK Method: **Public JWK URL**
   - Public JWK URL: `https://captionflow.link/.well-known/jwks`
   - Deep Linking: **Enabled**
   - Deep Linking URL: `https://captionflow.link/lti/deep-link`

2. **Copy Registration Details:**
   - After saving, note the **Client ID**
   - Note the Canvas **Issuer URL** (usually `https://<institution>.instructure.com`)

3. **Register Canvas in CaptionFlow:**
   - Visit `https://captionflow.link/#lms-config`
   - Add platform with Canvas details:
     ```
     Issuer URL: https://<institution>.instructure.com
     Client ID: <from Canvas>
     Auth Endpoint: https://<institution>.instructure.com/api/lti/authorize_redirect
     Token Endpoint: https://<institution>.instructure.com/login/oauth2/token
     JWKS URL: https://<institution>.instructure.com/api/lti/security/jwks
     ```

4. **Restart CaptionFlow** (Railway will auto-restart on deployment)

5. **Test in Canvas:**
   - Create a test course
   - Add → External Tool → CaptionFlow
   - Pick content from deep link picker
   - Verify students can launch the captioned video

---

### Blackboard Learn

**Prerequisites:**
- Blackboard Learn account with admin access
- LTI 1.3 enabled (available in Learn Ultra and newer versions)

**Steps:**

1. **Register CaptionFlow in Blackboard:**
   - Admin Panel → LTI Tool Providers → Register LTI 1.3 Tool
   - Tool URL: `https://captionflow.link/lti/launch`
   - Login Initiation URL: `https://captionflow.link/lti/login`
   - Keyset URL: `https://captionflow.link/.well-known/jwks`
   - Enable Deep Linking

2. **Copy Registration:**
   - Note Client ID and Issuer from Blackboard

3. **Register Blackboard in CaptionFlow:**
   ```
   Issuer URL: <from Blackboard>
   Auth Endpoint: <from Blackboard>
   Token Endpoint: <from Blackboard>
   JWKS URL: <from Blackboard>
   ```

4. **Restart CaptionFlow**

5. **Test:** Add CaptionFlow to a course module

---

### Moodle

**Prerequisites:**
- Moodle 3.10+ with LTI 1.3 support
- Admin or teacher role

**Steps:**

1. **Register CaptionFlow:**
   - Site Administration → Plugins → Activity Modules → External Tool → Manage Tools
   - Configure a tool manually:
     - Tool URL: `https://captionflow.link/lti/launch`
     - LTI version: LTI 1.3
     - Public key type: Keyset URL
     - Public keyset: `https://captionflow.link/.well-known/jwks`
     - Initiate login URL: `https://captionflow.link/lti/login`
     - Redirection URI(s): `https://captionflow.link/lti/launch`
     - Supports Deep Linking: Yes

2. **Copy Platform Details from Moodle:**
   - Note Platform ID, Client ID, Authentication request URL, Access token URL, Public keyset URL

3. **Register Moodle in CaptionFlow**

4. **Restart CaptionFlow**

5. **Test:** Add as activity in a course

---

### D2L Brightspace

**Prerequisites:**
- D2L Brightspace account with admin access
- LTI Advantage enabled

**Steps:**

1. **Register CaptionFlow:**
   - Admin Tools → External Learning Tools → Manage Tool Providers
   - Register App:
     - Name: CaptionFlow
     - Domain: `captionflow.link`
     - Redirect URLs: `https://captionflow.link/lti/launch`
     - OpenID Connect Login URL: `https://captionflow.link/lti/login`
     - Target Link URI: `https://captionflow.link/lti/launch`
     - Keyset URL: `https://captionflow.link/.well-known/jwks`
     - Extensions: Deep Linking

2. **Copy D2L Details**

3. **Register D2L in CaptionFlow**

4. **Restart CaptionFlow**

5. **Test:** Add to Content in a course

---

## IMS Global Reference Platform (saLTIre)

For official LTI 1.3 certification testing:

1. **Visit:** https://lti-ri.imsglobal.org
2. **Register CaptionFlow** using the tool registration form
3. **Register saLTIre in CaptionFlow** using their provided platform details
4. **Run Certification Tests** from the saLTIre dashboard

---

## Verification Checklist

After registering any platform, verify:

- [ ] Platform appears in CaptionFlow admin UI (`#lms-config`)
- [ ] CaptionFlow logs show "Registered LTI platform" on startup
- [ ] Deep link launch opens content picker
- [ ] Selected content is added to LMS course
- [ ] Student launch loads caption surface inside LMS iframe
- [ ] No CSP "Refused to frame" errors in browser console
- [ ] Video plays and captions sync correctly

---

## Troubleshooting

### Issue: "Platform not registered"
**Symptoms:** 401 or 403 errors during OIDC handshake  
**Fix:** Restart CaptionFlow after registering the platform in admin UI

### Issue: CSP "Refused to frame"
**Symptoms:** Blank iframe, console error about `frame-ancestors`  
**Fix:** Add LMS domain to `LMS_FRAME_ANCESTORS` environment variable

### Issue: Deep link returns to wrong URL
**Symptoms:** Deep link completes but lands on 404  
**Fix:** Verify "Deep Link Return URL" in LMS matches your callback endpoint

### Issue: Student sees stub video instead of selected content
**Symptoms:** Launches show `dQw4w9WgXcQ` instead of deep-linked resource  
**Fix:** Check that `custom.captionflow_resource_id` is present in launch JWT

---

## Test Data Setup

Before testing, ensure CaptionFlow has content:

1. **Upload captions:** Visit `#upload`, create at least 2-3 captioned videos
2. **Create resources:** Visit `#resources`, create shareable resources
3. **Upgrade to admin:** Set instructor role to `institution_admin` in database

```sql
UPDATE instructor SET role = 'institution_admin' WHERE email = 'your-email@example.com';
```

---

## Performance Testing

To test under load:

1. Deploy Mock LMS to Railway (handles concurrent requests)
2. Use a load testing tool (e.g., `k6`, `artillery`)
3. Simulate 50+ concurrent instructor launches
4. Monitor CaptionFlow logs and Railway metrics

---

## Related Documentation

- [Mock LMS README](../test-lms/README.md) - Detailed mock LMS guide
- [LMS Configuration UI](../src/web/dashboard/pages/lms-config.tsx) - Admin interface
- [LTI Setup Code](../src/server/lti/ltijs-setup.ts) - Backend implementation
- [IMS LTI 1.3 Spec](https://www.imsglobal.org/spec/lti/v1p3)
- [IMS Deep Linking 2.0](https://www.imsglobal.org/spec/lti-dl/v2p0)

---

## Deployment-Specific Notes

### Railway
- Use separate services for CaptionFlow and Mock LMS
- Both services can share the same PostgreSQL database
- Set `LMS_FRAME_ANCESTORS` to include Mock LMS Railway URL
- Restart services after platform registration

### Local Development
- Use `http://localhost:*` URLs (not `https`)
- Disable CSP in development mode (handled automatically)
- Both services must run simultaneously

---

**Questions or issues?** Check the troubleshooting section or review server logs for detailed error messages.
