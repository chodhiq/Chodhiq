# Launch Readiness: Error Logging, Load Testing, & RLS Audit Guide

## Quick Reference

| Task | Time | Status |
|------|------|--------|
| **Error Logging (Sentry)** | 20 min | See SENTRY_SETUP.md |
| **RLS Audit** | 15 min | See below |
| **Load Test (k6)** | 45 min | See below |

---

## Phase 1: Error Logging Setup ✅

**File:** `SENTRY_SETUP.md`

### Quick Steps:
1. Create Sentry account (sentry.io)
2. Create 3 projects (app, admin-dashboard, business-dashboard)
3. Copy each project's DSN
4. Follow integration steps in SENTRY_SETUP.md
5. Test by triggering an error in each app

**Expected:** Errors appear in Sentry dashboard within seconds

---

## Phase 2: RLS Audit (Data Isolation Verification)

### Step 1: Prepare Test Users

Open Supabase SQL Editor and run:

```sql
-- Copy the entire content of db/RLS_AUDIT.sql
-- Paste into Supabase SQL Editor
-- Click "Run"
```

### What it tests:

✓ Customer A cannot see Customer B's profile
✓ Customer A cannot see Customer B's saved items
✓ Customer A cannot write reviews as Customer B
✓ Booking service validation works (cross-provider protection)
✓ Provider cannot modify customer-owned booking fields
✓ Admin can see all data (bypass working)
✓ Quote requests isolated by user

### Expected Output:

```
✓ TEST 1 PASSED: Customers isolated by profile RLS
✓ TEST 2 PASSED: Saved items isolated by user_id RLS
✓ TEST 3 PASSED: Reviews isolated by user_id RLS policy
✓ TEST 4 PASSED: Booking validation rejected mismatched service
✓ TEST 5 PASSED: Booking field protection working
✓ TEST 6 PASSED: Admin can see all profiles (admin bypass working)
✓ TEST 7 PASSED: Quote requests isolated by user_id RLS
```

### If ANY test fails:

1. **Check RLS policies** in Supabase:
   ```bash
   # In Supabase SQL Editor:
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   SELECT * FROM pg_policies WHERE tablename = 'bookings';
   ```

2. **Check authentication context:**
   ```bash
   # Verify JWT is being set correctly
   SELECT auth.uid();
   ```

3. **Run individual test** (comment out others in RLS_AUDIT.sql)

4. **Check triggers** if field protection failed:
   ```bash
   SELECT * FROM pg_trigger WHERE tgname LIKE '%protect%';
   ```

---

## Phase 3: Load Testing with k6 📊

### Prerequisites

Install k6:
```bash
# Windows (using Chocolatey)
choco install k6

# Or download from: https://k6.io/docs/getting-started/installation/
```

Verify installation:
```bash
k6 version
# Should output: k6 vX.XX.X
```

### Step 1: Get Your Supabase Credentials

1. Go to Supabase dashboard → Settings → API
2. Copy:
   - **Project URL:** `https://your-project.supabase.co`
   - **Anon Key:** `sb_publishable_...`

### Step 2: Run Load Test

```bash
cd C:\Users\ASUS\Documents\Codex\chodhiq

# Run with 100 virtual users (VUs)
k6 run tests/load-test.k6.js \
  -e BASE_URL=https://your-project.supabase.co \
  -e ANON_KEY=your_anon_key

# For more VUs (stress test):
k6 run tests/load-test.k6.js \
  -e BASE_URL=https://your-project.supabase.co \
  -e ANON_KEY=your_anon_key \
  --vus 500 --duration 5m
```

### Step 3: Monitor Results

Watch the real-time output:

```
scenario: default, 45/100 VUs, 2m15s/5m0s
  data_received..................: 1.2 MB 10 kB/s
  data_sent.......................: 450 kB  3.8 kB/s
  errors...........................: 0    0/s
  http_req_duration...............: avg=125ms  p95=450ms  p99=800ms max=2.1s
  http_req_failed.................: 0.00%
  search_duration..................: avg=110ms  p95=420ms
  quote_duration...................: avg=280ms  p95=950ms
  quotes_created...................: 45
```

### Step 4: Generate HTML Report

```bash
k6 run tests/load-test.k6.js \
  -e BASE_URL=https://your-project.supabase.co \
  -e ANON_KEY=your_anon_key \
  -o html=load-test-report.html

# Report will be saved to load-test-report.html
# Open in browser to view detailed graphs
```

---

## Expected Results

### Green Flags ✓
- Error rate: **< 1%**
- Search latency p95: **< 500ms**
- Quote creation latency p95: **< 1s**
- HTTP error rate: **< 0.5%**
- No RLS violations detected
- 0 "new row violates RLS policy" errors

### Red Flags 🚨
- Error rate > 5%: **Database issue or app bug**
- Latency p95 > 2s: **Database performance problem or missing indexes**
- RLS violations: **Security misconfiguration (CRITICAL)**
- Connection timeout: **Connection pool exhausted**

### Yellow Flags ⚠️
- Error rate 1-5%: **Investigate top errors**
- Latency p95 > 1s: **Acceptable for now, optimize before scale**

---

## Troubleshooting Load Test

### "Connection refused" error
```bash
# Verify Supabase URL is correct
k6 run tests/load-test.k6.js -e BASE_URL=https://your-project.supabase.co

# Check if Supabase is accessible
curl https://your-project.supabase.co/rest/v1/health
```

### "401 Unauthorized"
```bash
# Verify ANON_KEY is correct
# Get it from Supabase: Settings → API → Anon Key (sb_publishable_...)
```

### "429 Too Many Requests"
```bash
# Your free tier has rate limits (50 req/sec)
# Reduce VUs or duration:
k6 run tests/load-test.k6.js -e BASE_URL=... -e ANON_KEY=... --vus 20 --duration 1m
```

### "RLS policy violation"
```bash
# Run RLS_AUDIT.sql to diagnose
# Likely cause: RLS policies not applied correctly
# Solution: Re-apply migrations from db/20260812_security_hardening.sql
```

---

## Continuous Integration (GitHub Actions)

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly, Sunday 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: sudo apt-get install k6
      
      - name: Run Load Test
        env:
          BASE_URL: ${{ secrets.SUPABASE_URL_STAGING }}
          ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_STAGING }}
        run: k6 run tests/load-test.k6.js -o html=report.html
      
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: load-test-report
          path: report.html
```

---

## Post-Launch Monitoring

### Weekly:
- [ ] Review Sentry error dashboard
- [ ] Check top 5 error types
- [ ] Update RLS audit (rerun quarterly)
- [ ] Monitor Supabase metrics dashboard

### Monthly:
- [ ] Run full load test (100 VUs, 5 min)
- [ ] Compare latency baseline
- [ ] Review slow query logs
- [ ] Optimize top 3 slow endpoints

### On Each Deploy:
- [ ] Run RLS audit
- [ ] Smoke test (50 VUs, 1 min)
- [ ] Check error rate spike

---

## Files Created

| File | Purpose |
|------|---------|
| `SENTRY_SETUP.md` | Error logging configuration |
| `db/RLS_AUDIT.sql` | Data isolation verification |
| `tests/load-test.k6.js` | Load test scenarios |
| `LAUNCH_READINESS.md` | This file |

---

## Success Criteria for Launch

- [ ] Error logging configured and receiving events
- [ ] All 7 RLS audit tests passing
- [ ] Load test passing with <1% error rate at 100 VUs
- [ ] Latency p95 < 500ms for searches
- [ ] No RLS violations in 5-minute load test
- [ ] Admin can see full data, customers see only their own
- [ ] Rate limiting configured

**Status: Ready for Pilot Launch** ✅

When all above are checked, you can proceed to:
1. Staging pilot with 50-100 users
2. Production deployment
3. Enable payments
4. Full user onboarding
