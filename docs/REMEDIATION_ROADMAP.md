# ChodhiQ Remediation Roadmap

**Created:** 2026-09-01  
**Target:** Address all 22 identified issues before production deployment  
**Status:** Planning phase

---

## Executive Summary

Based on comprehensive code review, ChodhiQ has:
- ✅ **Strong foundation**: Modern stack, good test coverage, audit logging
- ⚠️ **22 identified issues**: 4 critical, 5 high, 8 medium, 5 low
- 📋 **Detailed remediation**: All issues have fixes documented and prioritized
- ⏱️ **Timeline**: ~6 weeks to clear all issues (critical path: 2 weeks)

**Recommendation:** Address Phase 1 & 2 before any staging deployment.

---

## Phase 1: Critical Blockers (Week 1-2)

**Timeline:** 10 working days  
**Must-Do:** Yes  
**Status:** 🔴 NOT STARTED

These 4 issues block production deployment:

### 1. Implement next.config.ts Security Headers
- **Issue:** Both dashboards have empty next.config.ts files
- **Risk:** No XSS protection, no CSP, clickjacking vulnerable
- **Status:** ✅ **FIXED** - Security headers, image optimization, compression now configured
- **Files:** 
  - [admin-dashboard/next.config.ts](../admin-dashboard/next.config.ts)
  - [business-dashboard/next.config.ts](../business-dashboard/next.config.ts)
- **Effort:** ✅ Completed (2 hours)
- **Verification:** `npm run build && npm run lint`

### 2. Stabilize vinext Dependency
- **Issue:** Both dashboards use vinext 1.0.0-beta.2 (not production-ready)
- **Risk:** Breaking changes during deployment, no stable API
- **Status:** 🟡 IN PROGRESS - Two options:
  - **Option A (Recommended):** Wait for vinext 1.0.0 stable release
  - **Option B (Short-term):** Pin current beta and add extensive integration tests
- **Files:** 
  - [admin-dashboard/package.json](../admin-dashboard/package.json#L48)
  - [business-dashboard/package.json](../business-dashboard/package.json#L48)
- **Effort:** 2-3 hours (if switching to stable Next.js) or 1 hour (if pinning beta)
- **Timeline:**
  - Verify vinext roadmap (2026-09-02)
  - Decide option A vs B (2026-09-02)
  - Implement chosen option (2026-09-03)

**Action Items:**
```bash
# Option A: Check vinext status
npm view vinext versions

# Option B: Pin beta version
npm install vinext@1.0.0-beta.2 --save-exact

# Then add lock-file validation to CI
npm audit
```

### 3. Run RLS Audit & Fix Issues
- **Issue:** Multiple aggressive RLS fixes suggest past failures (AGGRESSIVE_RLS_FIX.sql, COMPLETE_RLS_RESET.sql)
- **Risk:** Data leaks, unauthorized access, customer privacy violations
- **Status:** ⚠️ REQUIRES ACTION - Run audit and document results
- **Files:**
  - [db/RLS_AUDIT.sql](../db/RLS_AUDIT.sql) - Run in staging
  - [docs/RLS_POLICY_MATRIX.md](../docs/RLS_POLICY_MATRIX.md) - ✅ CREATED
- **Effort:** 4-6 hours (audit + fix any issues found)
- **Timeline:**
  - Set up staging Supabase environment (2026-09-02)
  - Run RLS_AUDIT.sql and document results (2026-09-03)
  - Fix any failing tests (2026-09-04)
  - Penetration test data isolation (2026-09-05)

**Action Items:**
```sql
-- In Supabase staging dashboard:
-- 1. Connect to staging database
-- 2. Run RLS audit
psql $STAGING_DATABASE_URL -f db/RLS_AUDIT.sql

-- 3. Document results (PASS/FAIL for each test)
-- 4. If FAIL: Run appropriate fixes from db/
-- 5. Re-run audit to verify

-- 6. Export policy definitions
SELECT * FROM information_schema.views 
WHERE table_schema = 'public' AND table_name LIKE 'rls_%';
```

### 4. Migrate Main App to TypeScript (or JSDoc)
- **Issue:** App.js and src/data/*.js are untyped JavaScript
- **Risk:** Runtime errors in production, hard to refactor, IDE support poor
- **Status:** 📋 PLAN CREATED - [TYPESCRIPT_MIGRATION_PLAN.md](../docs/TYPESCRIPT_MIGRATION_PLAN.md)
- **Files:** ~150 files in src/ (App.js, screens, components, lib, data)
- **Effort:** 10-15 days (full migration) or 3-4 days (JSDoc only)
- **Timeline (Full TS):**
  - Week 1: Setup, core libs, data layer
  - Week 2: State, navigation, components
  - Week 2-3: Testing & fixes
- **Timeline (JSDoc):**
  - Day 1: Setup jsconfig.json
  - Day 2: Core files (5-10 files)
  - Day 3: Data layer (10-15 files)
  - Day 4: Testing & fixes

**Recommendation:** Start with JSDoc approach (faster, lower risk)

---

## Phase 2: High Priority (Week 2-3)

**Timeline:** 12 working days  
**Must-Do:** Yes (before production)  
**Status:** 🟡 PLANNING

### 5. Re-enable ESLint Rules
- **Issue:** `exhaustive-deps`, `set-state-in-effect` disabled, hiding bugs
- **Risk:** Stale closures, infinite re-render loops, memory leaks
- **Status:** 📋 PLAN CREATED - [ESLINT_RULES_REMEDIATION.md](../docs/ESLINT_RULES_REMEDIATION.md)
- **Files:** [admin-dashboard/eslint.config.mjs](../admin-dashboard/eslint.config.mjs)
- **Affected:** 9 component files in admin-dashboard
- **Effort:** 2-3 days (1 day audit + 2 days fixes)
- **Timeline:**
  - Day 1: Run ESLint with rules enabled, document violations
  - Day 2: Fix violations
  - Day 3: Test & verify

### 6. Clean Up Build Artifacts
- **Issue:** 11 dist-* directories clutter workspace
- **Risk:** Deployment confusion, wrong artifact deployed
- **Status:** ⚠️ REQUIRES ACTION
- **Files:** dist-admin-rework-verify, dist-business-rework-verify, dist-category-fix-verify, dist-current-fresh, dist-final-verify, dist-item1-5-verify (5), dist-navigation-verify, dist-no-freelance-verify, dist-provider-onboarding-verify, dist-verify
- **Effort:** 2-4 hours (audit which is current, archive/delete others)
- **Timeline:**
  - Identify current production build (2026-09-02)
  - Archive old builds (2026-09-03)
  - Update CI/CD to use single build directory (2026-09-04)

**Action Items:**
```bash
# Identify newest dist
ls -lth dist-* | head -1

# Archive old dist directories
mkdir archived-builds
mv dist-*-verify archived-builds/

# Verify single build works
npm run build
```

### 7. Add API Rate Limiting
- **Issue:** No rate limiting on Supabase functions, API abuse possible
- **Risk:** DOS attacks, uncontrolled database load
- **Status:** ✅ HELPER CREATED - [rate-limit-helper.ts](../supabase/functions/rate-limit-helper.ts)
- **Files:** [supabase/functions/](../supabase/functions/)
- **Effort:** 1-2 days (integrate helper into 5-7 functions)
- **Timeline:**
  - Review helper implementation (2026-09-02)
  - Integrate into push-notification function (2026-09-03)
  - Integrate into payment function (2026-09-03)
  - Test rate limit behavior (2026-09-04)

**Code Example:**
```typescript
import { checkRateLimit, RATE_LIMITS } from '../rate-limit-helper.ts';

export default async (req: Request) => {
  const userId = getUserIdFromAuth(req);
  
  const limit = await checkRateLimit(userId, 'push-notification', RATE_LIMITS.api);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: limit.headers,
    });
  }
  
  // ... rest of function
};
```

### 8. Add Component Unit Tests
- **Issue:** No Jest/Vitest setup, React components untested
- **Risk:** UI bugs not caught, regressions in new releases
- **Status:** 📋 SETUP NEEDED
- **Effort:** 3-5 days (setup + write tests for critical components)
- **Timeline:**
  - Setup Jest/Vitest + React Testing Library (2026-09-05)
  - Write tests for 5-10 critical components (2026-09-06)
  - Integrate into CI pipeline (2026-09-07)

**Setup:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/react-native
npx jest --init
```

### 9. Implement Bundle Size Analysis
- **Issue:** No bundle size monitoring, unknown performance impact
- **Risk:** Ship larger bundles, slow app load times
- **Status:** 📋 SETUP NEEDED
- **Effort:** 4 hours (add visualizer + CI integration)
- **Timeline:** 2026-09-04

**Setup:**
```bash
npm install --save-dev rollup-plugin-visualizer
# Then add to vite.config.ts / next.config.ts
```

---

## Phase 3: Medium Priority Quality (Week 3-4)

**Timeline:** 14 working days  
**Must-Do:** No (quality improvements)  
**Status:** 🟢 PLAN CREATED

### 10-17. Quality Improvements

| # | Issue | Effort | Timeline |
|---|-------|--------|----------|
| 10 | Database Pagination | 2 days | Week 3 |
| 11 | N+1 Query Optimization | 3 days | Week 3 |
| 12 | Image CDN Integration | 1 day | Week 3 |
| 13 | RLS Documentation | ✅ 1 day | Done ✓ |
| 14 | API Rate Limit Headers | 4 hours | Week 3 |
| 15 | Security Headers | ✅ Done | Done ✓ |
| 16 | Policies Documentation | ✅ 1 day | Done ✓ |
| 17 | Module Type Warning | ✅ Done | Done ✓ |

---

## Phase 4: Polish & Documentation (Week 4)

**Timeline:** 5 working days  
**Must-Do:** No (nice-to-have)  
**Status:** 🟢 LOWER PRIORITY

### 18-22. Polish Items

| # | Issue | Effort | Notes |
|---|-------|--------|-------|
| 18 | Visual Regression Tests | 2 days | Optional for MVP |
| 19 | API Documentation JSDoc | 1 day | Quality of life |
| 20 | Admin Runbook | 1 day | Operational readiness |
| 21 | Dev Environment Guide | 1 day | Onboarding |
| 22 | Architecture ADRs | 1 day | Knowledge base |

---

## Dependency Chain

Some issues depend on others:

```
Phase 1: Critical Blockers
├─ next.config.ts (independent)
├─ vinext stabilization (independent)
├─ RLS audit (independent)
└─ TypeScript migration (independent)

Phase 2: High Priority
├─ ESLint fixes (can start after Phase 1)
├─ Build cleanup (independent)
├─ Rate limiting (independent)
└─ Component tests (independent)

Phase 3: Quality
├─ Pagination (after understanding current queries)
├─ Image CDN (independent)
└─ N+1 optimization (after understanding current patterns)
```

**Critical path:** 
1. Fix next.config.ts (2h) ✅
2. Stabilize vinext (1h) 
3. Run RLS audit (4h)
4. TypeScript migration (10-15d)

**Estimated total:** ~20-25 days

---

## Success Criteria

### Phase 1 Completion
- [ ] Both next.config.ts files have security headers & optimization
- [ ] vinext version is stable or pinned with rationale
- [ ] RLS_AUDIT.sql passes all tests with documented results
- [ ] TypeScript migration plan started (JSDoc phase at minimum)

### Phase 2 Completion
- [ ] All ESLint violations fixed, rules re-enabled
- [ ] Old dist-* directories archived or deleted
- [ ] Rate limiting integrated into 3+ functions
- [ ] 5+ critical components have unit tests

### Overall Success
- [ ] npm run verify:release passes
- [ ] npm test shows 30+ tests passing
- [ ] npm run lint shows 0 errors
- [ ] Documentation complete for all changes
- [ ] Security review completed (especially RLS)

---

## Resource Requirements

### People
- **1 Lead Developer:** 4-6 weeks (full-time)
- **1 Security Reviewer:** 1-2 weeks (part-time for RLS audit)
- **1 QA Engineer:** 1-2 weeks (testing all phases)

### Tools/Services
- ✅ Staging Supabase instance (already available)
- ✅ GitHub Actions CI (already configured)
- ✅ Sentry monitoring (already configured)
- 🟡 Penetration tester (optional, recommended for RLS)

### Estimated Cost
- **Labor:** 8-10 weeks developer time (~$24k-$35k depending on rates)
- **Tools:** ~$0 (all open source)
- **Security audit:** ~$2k-$5k (if outsourced)
- **Total:** ~$26k-$40k

---

## Risk & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| vinext 1.0.0 delayed | Medium | High | Start with JSDoc TypeScript for backoff |
| RLS audit finds bugs | Low | Critical | Have SQL rollback plan ready |
| TypeScript migration takes >3 weeks | Medium | Medium | Use JSDoc-only approach, iterate |
| Build artifacts confusion during deploy | Low | High | Automated CI/CD validation |

---

## Decision Points

**By 2026-09-02:**
1. Confirm vinext roadmap (1.0.0 release date)
2. Decide: Full TS vs JSDoc migration for main app
3. Schedule RLS audit in staging

**By 2026-09-05:**
1. Confirm Phase 1 fixes are working
2. Approve Phase 2 scope
3. Allocate resources

**By 2026-09-15:**
1. Phase 1 complete (all 4 critical issues fixed)
2. Phase 2 in progress
3. Production readiness review

**By 2026-09-30:**
1. Phase 1-2 complete
2. Phase 3 in progress or complete
3. Ready for production deployment

---

## Communication Plan

### Daily Standup
- 15 min sync on blockers
- Update issue status
- Adjust timeline if needed

### Weekly Review
- Phase progress (done/blocked/at-risk)
- Demo fixes to team
- Update stakeholders

### Before Deployment
- Full security review
- Penetration testing (RLS)
- Load testing
- Staged rollout plan

---

## Appendix: Created/Updated Files

✅ **Fixed:**
- [admin-dashboard/next.config.ts](../admin-dashboard/next.config.ts) - Security headers, image optimization
- [business-dashboard/next.config.ts](../business-dashboard/next.config.ts) - Security headers, image optimization  
- [package.json](../package.json) - Added "type": "module"

✅ **Created:**
- [supabase/functions/rate-limit-helper.ts](../supabase/functions/rate-limit-helper.ts) - Rate limiting helper
- [docs/RLS_POLICY_MATRIX.md](../docs/RLS_POLICY_MATRIX.md) - RLS policy documentation
- [docs/ESLINT_RULES_REMEDIATION.md](../docs/ESLINT_RULES_REMEDIATION.md) - ESLint fixes guide
- [docs/TYPESCRIPT_MIGRATION_PLAN.md](../docs/TYPESCRIPT_MIGRATION_PLAN.md) - TypeScript migration plan
- [docs/REMEDIATION_ROADMAP.md](../docs/REMEDIATION_ROADMAP.md) - This document

---

**Next Steps:** See Phase 1 implementation checklist above.
