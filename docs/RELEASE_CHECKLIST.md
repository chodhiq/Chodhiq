# Release checklist

- [ ] Version and release notes approved
- [ ] `npm ci` performed from lockfile
- [ ] `npm run verify:release` passed
- [ ] Staging E2E passed without skips
- [ ] Database migration dry run and backup completed
- [ ] Edge Function secrets and webhook signatures verified
- [ ] Stripe lifecycle scenarios passed
- [ ] Physical Android and iOS smoke tests passed
- [ ] Accessibility and reduced-motion checks passed
- [ ] Privacy disclosures and account deletion passed
- [ ] Crash/error telemetry visible to operations
- [ ] Rollback owner and on-call owner confirmed
