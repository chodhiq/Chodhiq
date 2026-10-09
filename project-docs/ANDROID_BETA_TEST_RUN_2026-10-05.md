# Android beta test run — 5 to 7 October 2026

Use anonymous IDs T01–T06 for the current small test. Record the installed Android version code and device/OS for every result. Do not put names, email addresses, passwords, phone numbers or confirmation links in this file. A screen result alone does not prove a backend or provider result.

| ID | Device / Android | App version code | Signup + email confirmation + login | Password reset + new login | Booking visible to provider | Photo survives restart | Push open / background / closed | Denied permissions + recovery | Logout/restart | Delete account last + login rejected | Blocking issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | | | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |
| T02 | | | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |
| T03 | | | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |
| T04 | | | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |
| T05 | | | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |
| T06 | | | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |

For each failure, record: issue ID, P0–P3 priority, expected/actual result, exact steps, frequency, build code, device/OS, redacted screenshot or recording reference, and whether it was retested on a replacement build. Mark booking complete only when the provider dashboard shows the request. Mark notification states separately. Perform deletion after all other tests and verify the account cannot sign in after restart.

## October 7 closed-beta handoff

- [ ] P0 issues found by T01–T06 are fixed and retested on the release source.
- [ ] Provider booking view and account-deletion function are deployed and tested with disposable accounts.
- [ ] Signed AAB is built from a reviewed source checkpoint; package, Android API target, version code, signature and SHA-256 are recorded.
- [ ] Exact AAB is installed through Google Play internal testing and the critical journey is repeated.
- [ ] Play Console app setup, privacy/data-deletion URLs, Data safety, content rating, listing and tester access are complete.
- [ ] One closed-test email list or Google Group has the intended 20–40 testers; one shared Play opt-in URL is ready for group distribution.
- [ ] Closed-test release is approved/published by Play. Each tester opts in once; subsequent builds update through Play.

Do not enter test results until a tester provides evidence. This file is a run sheet, not a claim that testing has passed.
