# Demo LMS Configuration

After deploying the Mock LMS to Railway with custom domain `demo-lms.captionflow.link`, follow these steps:

## 1. Register Platform in CaptionFlow

Visit **https://captionflow.link/#lms-config** and register:

```
Name: Demo LMS
Issuer URL: https://demo-lms.captionflow.link
Client ID: mock-lms-client-123
Auth Endpoint: https://demo-lms.captionflow.link/lms/auth
Token Endpoint: https://demo-lms.captionflow.link/lms/token
JWKS URL: https://demo-lms.captionflow.link/lms/.well-known/jwks
Deployment IDs: 1
```

## 2. Update CaptionFlow Environment Variables

Railway Dashboard → CaptionFlow Service → Variables:

```
LMS_FRAME_ANCESTORS=https://demo-lms.captionflow.link
```

(If you already have other origins, comma-separate them)

## 3. Restart Both Services

- CaptionFlow Service → Redeploy
- Demo LMS Service → Redeploy

## 4. Test

Visit **https://demo-lms.captionflow.link** and verify:
- ✅ Page loads with no SSL warnings
- ✅ "Launch Content Picker" button works
- ✅ Can select content and return to Mock LMS
- ✅ "Launch as Student" loads caption surface in iframe

## URLs Quick Reference

| Purpose | URL |
|---------|-----|
| Demo LMS Homepage | https://demo-lms.captionflow.link |
| CaptionFlow Admin | https://captionflow.link/#lms-config |
| Issuer/Auth/Token/JWKS | All use `https://demo-lms.captionflow.link` as base |

---

**Note:** After any platform registration changes, always restart CaptionFlow to reload platform configurations from the database.
