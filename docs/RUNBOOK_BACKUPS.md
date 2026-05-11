# Database Backup & Restore Runbook

This runbook covers Railway Postgres backup verification, restoration procedures, and disaster recovery for CaptionFlow.

---

## Railway Postgres Backup Overview

Railway automatically backs up PostgreSQL databases with the following features:

- **Automated daily backups** (retention depends on your Railway plan)
- **Point-in-time recovery (PITR)** using write-ahead logs (WAL)
- **Encrypted storage** in Railway's cloud infrastructure
- **One-click restore** through Railway dashboard

---

## Verify Backups Are Enabled

### Step 1: Check Railway Dashboard

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Select your **CaptionFlow** project
3. Click on the **Postgres** service
4. Navigate to the **Backups** tab

You should see:
- ✅ **Backup Status**: Enabled (automatic)
- 📅 **Last Backup**: Recent timestamp (should be within 24 hours)
- 📊 **Available Backups**: List of daily snapshots with timestamps

### Step 2: Verify via CLI (Alternative)

Check that your Postgres service is managed by Railway:

```bash
cd /Users/admin/Documents/StuPath/CaptionFlow
railway service status
```

Look for the `Postgres` service - if it shows as "Active" or "Healthy", backups are running automatically.

---

## Backup Schedule & Retention

| Plan        | Backup Frequency | Retention Period | PITR Support |
|-------------|------------------|------------------|--------------|
| Free        | Daily            | 7 days           | No           |
| Developer   | Daily            | 14 days          | Yes (7 days) |
| Team        | Daily            | 30 days          | Yes (14 days)|
| Enterprise  | Custom           | Custom           | Yes (custom) |

**Check your current plan:**
- Go to [railway.app/account/billing](https://railway.app/account/billing)
- Your retention period and PITR availability depend on your plan tier

---

## Restore From Backup

### Option 1: Restore to Current Database (Destructive)

⚠️ **WARNING:** This will overwrite your current production database.

**Pre-requisites:**
1. Notify all users that the system will be unavailable
2. Document the reason for restore (incident ticket, timestamp, root cause)
3. Export current state if possible (as a safety measure):

```bash
# Get DATABASE_URL from Railway
railway variables | grep DATABASE_URL

# Export current database (before restore)
pg_dump "$DATABASE_URL" > backup-before-restore-$(date +%Y%m%d-%H%M%S).sql
```

**Restore Steps:**

1. Go to Railway dashboard → CaptionFlow project → Postgres service → **Backups** tab
2. Find the backup snapshot you want to restore (by timestamp)
3. Click **Restore** next to that backup
4. **Confirm** the restoration
   - Railway will stop the database
   - Restore data from the snapshot
   - Restart the database (usually takes 2-10 minutes)
5. Verify restoration:

```bash
# Check health endpoint
curl https://captionflow.link/health

# Expected response:
# {"status":"ok","db":"ok"}
```

6. Test critical flows:
   - Log in via magic link
   - View a resource with captions
   - Upload a new caption file

7. Monitor Railway logs for errors:

```bash
railway logs --service CaptionFlow-gh
```

### Option 2: Restore to New Database (Non-Destructive)

This creates a new Postgres service from a backup, allowing you to inspect data before swapping.

**Steps:**

1. Railway dashboard → CaptionFlow project → Postgres service → **Backups** tab
2. Click **Restore to New Service** for the desired backup
3. Railway creates a new Postgres service named `Postgres-restored-YYYY-MM-DD`
4. Get the new `DATABASE_URL`:

```bash
railway variables --service Postgres-restored-YYYY-MM-DD
```

5. **Test the restored database** by temporarily connecting your app to it:

```bash
# In a test environment or locally
export DATABASE_URL="postgresql://postgres:...@restored-db.railway.internal:5432/railway"
npm run dev
```

6. Verify data integrity (check critical tables):

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM resource;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM caption;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM instructor;"
```

7. If data looks good, **swap the production database**:
   - Update Railway variables to use the restored `DATABASE_URL`
   - Redeploy the CaptionFlow-gh service
   - Delete the old Postgres service once confirmed stable

---

## Point-in-Time Recovery (PITR)

If your Railway plan supports PITR, you can restore to a specific timestamp (not just daily snapshots).

**When to Use PITR:**
- Accidental data deletion (e.g., wrong `DELETE FROM caption WHERE ...`)
- Corrupted data introduced at a known time
- Rollback to a state between daily backups

**Steps:**

1. Railway dashboard → Postgres service → **Backups** tab
2. Click **Point-in-Time Recovery**
3. Select the timestamp to restore to (e.g., "2 hours ago")
4. Choose restore destination:
   - **Overwrite current database** (destructive)
   - **Create new database** (recommended)
5. Follow same verification steps as "Restore From Backup"

---

## Disaster Recovery Scenarios

### Scenario 1: Accidental Caption Deletion

**Symptoms:**
- User reports missing captions
- No application errors (data deleted, not corrupted)

**Recovery:**

1. Identify the time of deletion (check Railway logs or user report)
2. Use PITR (if available) to restore to just before deletion
3. Alternatively, restore from the most recent daily backup (may lose recent data)
4. After restore, compare restored data with current state to identify lost changes

### Scenario 2: Database Corruption

**Symptoms:**
- App throwing 500 errors
- `/health` endpoint returns `"db":"error"`
- Postgres logs show corruption warnings

**Recovery:**

1. Restore from the most recent backup
2. If corruption persists, restore from an older backup (iteratively)
3. Run database integrity checks after restore:

```bash
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM instructor;"
```

### Scenario 3: Complete Database Loss

**Symptoms:**
- Railway Postgres service completely unavailable
- No connection possible

**Recovery:**

1. Contact Railway support immediately
2. Meanwhile, create a new Postgres service:

```bash
railway service link
# Select "Create new service" -> PostgreSQL
```

3. Railway support will help restore your data to the new service
4. Update `DATABASE_URL` in Railway variables
5. Redeploy the app

### Scenario 4: Railway Platform Outage

**Symptoms:**
- Railway dashboard inaccessible
- All services unreachable

**Recovery:**

1. Check [Railway status page](https://railway.app/status) for platform incidents
2. Monitor Railway's Twitter/Discord for updates
3. No action needed - backups are safe in Railway's storage
4. Once platform recovers, verify database health with `/health` endpoint

---

## Best Practices

### 1. Regular Backup Verification

**Schedule:** First Monday of each month

**Steps:**
1. Check Railway dashboard → Postgres → Backups tab
2. Verify recent backups exist (within 24 hours)
3. Document check in a monthly operations log

### 2. Manual Snapshot Before Major Changes

Before deploying database migrations or schema changes:

```bash
# Optional: Trigger a manual backup via Railway dashboard
# (Railway UI: Postgres service -> Backups -> "Backup Now")

# Or export a local safety copy:
railway variables | grep DATABASE_URL
pg_dump "$DATABASE_URL" > manual-backup-$(date +%Y%m%d-%H%M%S).sql
```

### 3. Test Restore Procedure

**Schedule:** Quarterly (every 3 months)

**Steps:**
1. Pick a recent backup snapshot
2. Restore to a new database (non-destructive)
3. Connect locally and verify data integrity
4. Document the exercise: time taken, issues encountered
5. Delete the test database after verification

### 4. Monitor Backup Age

Set up a reminder to check backup freshness:

```bash
# Add to a weekly cron or CI job
railway logs --service Postgres | grep -i backup
```

Expected output should show recent backup completion logs.

### 5. Document Every Restore

Create an incident log for each restore operation:

**Template:**

```
## Restore Incident - [DATE]

**Reason for Restore:**
- [Why was the restore needed? Data loss, corruption, user error?]

**Backup Used:**
- Snapshot timestamp: [YYYY-MM-DD HH:MM:SS]
- Backup age: [X hours/days old]

**Restore Method:**
- [ ] Daily snapshot restore
- [ ] Point-in-time recovery
- [ ] Restore to new service (non-destructive)

**Downtime:**
- Start: [HH:MM]
- End: [HH:MM]
- Duration: [X minutes]

**Data Loss:**
- [How much data was lost? E.g., "2 hours of uploads between backup and incident"]

**Verification:**
- [ ] Health check passed
- [ ] Login flow tested
- [ ] Caption upload tested
- [ ] Admin views tested

**Lessons Learned:**
- [What could be improved to prevent this?]
```

---

## Emergency Contacts

| Issue                          | Contact Method                                      |
|--------------------------------|-----------------------------------------------------|
| Railway platform issues        | [Railway Support](https://railway.app/help)         |
| Railway urgent outages         | [Railway Status](https://railway.app/status)        |
| Database performance issues    | Check Railway logs, then contact support            |
| Backup not running             | Railway dashboard → Postgres → Backups → Contact   |

---

## Backup Status Checklist

Use this checklist monthly:

- [ ] Railway Postgres backups enabled (verified in dashboard)
- [ ] Latest backup is < 24 hours old
- [ ] Backup retention period understood (based on Railway plan)
- [ ] PITR availability confirmed (if applicable)
- [ ] Restore procedure tested within last 90 days
- [ ] All team members have access to Railway dashboard
- [ ] Incident response template ready (see above)
- [ ] Contact information updated (Railway support)

---

**Last Verified:** [To be filled on first verification]

**Next Verification Due:** [First Monday of next month]

**Verified By:** [Team member name]
