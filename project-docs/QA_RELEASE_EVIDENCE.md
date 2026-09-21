# ChodhiQ release evidence record

Do not mark a row passed without a date, tester, build/deployment identifier and evidence link. Use separate customer, provider and administrator accounts; never place credentials in this file.

## Staging security and workflows

| Test | Result | Tester/date | Build or deployment | Evidence |
| --- | --- | --- | --- | --- |
| Customer cannot read another customer's records | NOT RUN | | | |
| Provider A cannot read or mutate Provider B | NOT RUN | | | |
| Non-admin cannot load admin data or invoke privileged functions | NOT RUN | | | |
| Admin mutation creates the expected audit entry | NOT RUN | | | |
| Verification documents require short-lived signed access | NOT RUN | | | |
| Upload policies reject wrong owner, MIME type and oversize files | NOT RUN | | | |
| All migrations apply cleanly to a fresh staging project | NOT RUN | | | |
| Edge Functions type-check and execute with staging secrets | NOT RUN | | | |

## Signed mobile builds

Record Android and iOS separately for sign-up/login, OAuth return, password reset, deep links, notification opt-in/out and delivery, permissions, ad consent granted/withdrawn, genuine AdMob delivery, offline write/reconnect sync, account export and account deletion.

| Platform/device/OS | Signed build ID | Result | Tester/date | Evidence |
| --- | --- | --- | --- | --- |
| Android | | NOT RUN | | |
| iOS | | NOT RUN | | |

## Dashboard compatibility and accessibility

Test customer/provider/admin workflows with keyboard only. Verify visible focus, logical focus order, modal focus containment/return, labels, error announcements, zoom at 200%, and a screen reader.

| Browser/layout/assistive technology | Result | Tester/date | Deployment | Evidence |
| --- | --- | --- | --- | --- |
| Chrome desktop | NOT RUN | | | |
| Edge desktop | NOT RUN | | | |
| Safari desktop | NOT RUN | | | |
| Mobile Safari | NOT RUN | | | |
| Chrome Android | NOT RUN | | | |
| NVDA or VoiceOver | NOT RUN | | | |

## Final rule

Public release remains blocked while any Priority 0 row is `NOT RUN` or failed. Attach this record to the go/no-go decision together with the operational ownership and rollback evidence.

