# ⚡ QUICK ACTION ITEMS - PRE-LAUNCH

**Date:** 2026-09-01  
**Target Launch:** 2026-09-03 (48 hours)  
**Team Assignment:** See "Owner" column

---

## 🔴 CRITICAL (BLOCK DEPLOYMENT IF NOT DONE)

| # | Task | Owner | Time | Status | Notes |
|---|------|-------|------|--------|-------|
| 1 | **RLS Audit**: Run `db/RLS_AUDIT.sql` in Supabase staging | DevOps/DB | 2h | 🔴 NOT DONE | Must pass all 7 tests |
| 2 | **Project Setup**: Confirm ljhncdzhzoatonhhofbv is staging only | Product Lead | 15m | 🔴 NOT DONE | Needs owner sign-off |
| 3 | **Sentry Setup**: Create account, get 3 DSNs, integrate apps | DevOps | 4h | 🔴 NOT DONE | By EOD 2026-09-02 |
| 4 | **ESLint Fixes**: Re-enable rules, fix violations in 9 files | Frontend | 8h | 🔴 NOT DONE | [Guide here](docs/ESLINT_RULES_REMEDIATION.md) |

---

## 🟠 HIGH PRIORITY (COMPLETE BEFORE DEPLOYMENT)

| # | Task | Owner | Time | Status | Notes |
|---|------|-------|------|--------|-------|
| 5 | **Build Cleanup**: Remove 11 dist-* directories | DevOps | 30m | 🔴 NOT DONE | Archive old builds first |
| 6 | **Load Test**: Run `k6 run tests/load-test.k6.js` | QA | 45m | 🔴 NOT DONE | Verify p95 < 1s |
| 7 | **E2E Tests**: Run `npm run test:e2e:staging` | QA | 2h | 🔴 NOT DONE | Test auth flows in staging |
| 8 | **npm Audit**: Document or fix 20 findings | DevOps | 1h | 🔴 NOT DONE | Create npm-audit-accepted.md |

---

## ✅ MEDIUM PRIORITY (DO SOON)

| # | Task | Owner | Time | Status | Notes |
|---|------|-------|------|--------|-------|
| 9 | **Verify Monitoring**: Final test of all Sentry alerts | DevOps | 1h | 🟡 READY | Post Sentry integration |
| 10 | **Database Backup**: Create snapshot before migrations | DevOps | 30m | 🟡 READY | Pre-deployment day |
| 11 | **Migration Test**: Apply all db/*.sql in staging | DevOps | 1h | 🟡 READY | Verify schema applies cleanly |

---

## 📋 DEPLOYMENT DAY CHECKLIST (2026-09-03)

### Pre-Deployment (Team: DevOps + QA)
```
☐ Verify all blockers resolved (30 min)
☐ Create database backup + snapshot (30 min)
☐ Apply migrations to production (30 min)
☐ Deploy Edge Functions with secrets (30 min)
☐ Configure Stripe webhooks (30 min)
```

### Deployment Window (Team: DevOps + Frontend)
```
☐ Update DNS records
☐ Deploy Expo app via EAS
☐ Deploy admin dashboard
☐ Deploy business dashboard
⏱️ Expected duration: 1 hour
```

### Post-Deployment Verification (Team: QA + DevOps)
```
☐ Smoke test: Signup → quote request → verify email
☐ Verify Sentry receiving errors
☐ Check error rate < 1%
☐ Monitor database connection pool
☐ Verify push notifications working
☐ First 24h monitoring (on-call)
```

---

## 📊 EFFORT SUMMARY

| Phase | Total Time | Can Parallelize? | Notes |
|-------|-----------|------------------|-------|
| **Blockers (2026-09-01)** | 14 hours | YES | 2-3 devs working in parallel |
| **High Priority (2026-09-02)** | 4.5 hours | YES | QA & DevOps can work independently |
| **Deployment (2026-09-03)** | 3 hours | NO | Sequential, requires coordination |
| **Total** | ~21.5 hours | PARTIALLY | Achievable in 2 days |

---

## 👥 TEAM ASSIGNMENTS

### DevOps / Infrastructure Owner
- [ ] Confirm project setup (15 min)
- [ ] Run RLS audit (2 hours)
- [ ] Setup Sentry account + 3 DSNs (2 hours)
- [ ] Integrate Sentry in apps (2 hours)
- [ ] Clean build artifacts (30 min)
- [ ] Deploy migrations + functions (2 hours)
- [ ] Day-of deployment (1 hour)

**Total:** ~10.5 hours

### Frontend Lead
- [ ] Audit ESLint violations (2 hours)
- [ ] Fix violations in 9 files (4-6 hours)
- [ ] Re-enable ESLint rules (30 min)
- [ ] Integrate Sentry in dashboards (1 hour)
- [ ] Verify npm run lint passes (30 min)

**Total:** ~8.5 hours

### QA / Testing
- [ ] Run load test with k6 (1 hour)
- [ ] Run E2E tests (2 hours)
- [ ] Smoke testing (30 min)
- [ ] First 24h monitoring (on-call)

**Total:** ~3.5 hours

### Product Lead
- [ ] Confirm project setup (15 min)
- [ ] Final go/no-go decision (30 min)

**Total:** ~45 min

---

## ⏰ DAY-BY-DAY PLAN

### 2026-09-01 (TODAY) — Kick Off
```
09:00 - 09:30: Team standup
         ☐ Review this document
         ☐ Assign owners
         ☐ Identify blockers

09:30 - 11:30: Parallel work (DevOps + Frontend)
         DevOps: RLS audit (2h)
         Frontend: ESLint violations audit (2h)

11:30 - 12:00: Sync on results
         ☐ RLS audit status
         ☐ ESLint violations count

13:00 - 17:00: Parallel work
         DevOps: Sentry setup (4h)
         Frontend: Fix ESLint (2-3h)

17:00 - 18:00: EOD status
         ✅ RLS audit passed
         ✅ Sentry DSNs obtained
         🟡 ESLint violations in progress
```

### 2026-09-02 (TUESDAY) — Push to Complete
```
09:00 - 09:30: Team standup
         ☐ Review blockers status
         ☐ Identify any risks

09:30 - 13:00: Parallel work
         Frontend: Finish ESLint (2-3h more)
         DevOps: Integrate Sentry in apps (2h)
         QA: Run load test (1h)

13:00 - 15:00: Continuation
         QA: Run E2E tests (2h)
         DevOps: Final verification

15:00 - 16:00: Final checks
         ☐ All blockers green
         ☐ All high-priority done
         ☐ Deployment plan confirmed

16:00 - 17:00: Go/no-go decision
         ✅ Ready for deployment
```

### 2026-09-03 (WEDNESDAY) — DEPLOYMENT DAY
```
08:00 - 09:00: Final checks
         ☐ Database backup created
         ☐ Migrations ready
         ☐ Edge functions staged

09:00 - 10:00: Deployment
         ☐ DNS update
         ☐ Deploy all services
         ☐ Smoke test

10:00 - 12:00: Monitoring
         ☐ Verify Sentry
         ☐ Check error rate
         ☐ Monitor performance

🚀 ChodhiQ LIVE
```

---

## 🎯 SUCCESS CRITERIA

**Blocker Resolution = Green Light for Deployment**
- ✅ RLS audit: 7/7 tests PASS
- ✅ Project setup: Confirmed staging/non-production
- ✅ Sentry: Active in all 3 apps, receiving errors
- ✅ ESLint: Zero errors, rules re-enabled
- ✅ Build: No dist-* clutter
- ✅ Load test: p95 < 1s confirmed
- ✅ E2E tests: All auth flows pass

---

## 📱 COMMUNICATION PLAN

### Daily Standup (09:00 AM)
- 15 minutes
- Status: Blockers, risks, blockers
- Adjust plan if needed

### EOD Status (17:00 PM)
- 15 minutes
- What got done
- What's for tomorrow
- Any escalations

### Pre-Deployment Brief (2026-09-03, 08:00 AM)
- 30 minutes
- Final verification checklist
- Rollback procedures reviewed
- All hands on deck

---

## 🆘 ESCALATION PATH

If ANY blocker can't be resolved:

1. **First escalation:** Notify product lead + tech lead
2. **Risk reassessment:** Is deployment still safe?
3. **Options:**
   - Delay launch 1-2 days for fix
   - Accept risk and proceed (document why)
   - Revert to previous version

**Goal:** Make go/no-go decision by 2026-09-02 EOD

---

## ✅ FINAL CHECKLIST (Print & Post)

```
BLOCKER RESOLUTION (2026-09-01 to 2026-09-02):
☐ RLS Audit: PASS
☐ Project Setup: CONFIRMED
☐ Sentry: ACTIVATED
☐ ESLint: FIXED

HIGH PRIORITY (2026-09-02):
☐ Build: CLEANED
☐ Load Test: PASSED
☐ E2E Tests: PASSED
☐ npm Audit: DOCUMENTED

DEPLOYMENT DAY (2026-09-03):
☐ Backup: CREATED
☐ Migrations: APPLIED
☐ Functions: DEPLOYED
☐ Webhooks: CONFIGURED
☐ Smoke Test: PASSED

🚀 LIVE
```

---

**Generated:** 2026-09-01  
**Next Review:** 2026-09-02 (14:00)  
**Go/No-Go Decision:** 2026-09-02 (17:00)
