# Screenshot issues and community author profiles - 6 October 2026

## Scope completed in the workspace

1. Reporting: own posts no longer expose Report; both posts and comments check the target author before submission. The backend already rejects self-reports, explaining the screenshot where the post author is You. Error messages distinguish session access, report limits, missing content, invalid reports and connectivity. Retry is available after failures.
2. Quote and review empty headings, supporting text and icons now use theme colours.
3. Community feed tabs use full-width layout; Recommended is labelled For you. Category filtering appears on its own row.
4. Post images use containment and loaded image dimensions. Tapping an image opens a full-image modal.
5. Community introduction now says customer posts can include images. No video support added.
6. Notification settings show sync progress and distinguish device preferences from push registration. Manual retry and phone settings access are available; foreground retries remain serialized. These UI changes cannot guarantee registration when device permissions, the network or backend configuration prevent it.
7. Signed-in identity is mapped immediately from authenticated metadata instead of remaining Guest while account requests load. Account loading now fetches the current profile row. Profile presentation no longer invents a membership year when missing.
8. Provider setup uses expandable joining details to keep search accessible. Initial search help, result guidance and no-match suggestions are included.
9. Provider information explains listing verification and separately reviewed business-dashboard access, required evidence, business details, discovery and enquiries. Removed the obsolete form that claimed Application received without submitting anything; its screen now opens real listing setup.
10. Empty quote and review screens offer Find a business and Browse providers actions.

Provider benefits are also expanded on the profile joining card. Copy makes no promises of guaranteed bookings or unsupported free plans.

Community uses the existing shared light/dark palette for backgrounds, surfaces, borders and actions, including the space header and selected space. Tapping an author's avatar/name opens CommunityProfile, showing community identity and posts visible under the existing post RLS policies. No contact details are included in the public response.

## Backend dependency

Apply supabase/migrations/20261006110000_community_member_profiles.sql for get_community_member_profile. The RPC exposes only ID, display name, avatar and joining year. It permits one's own identity, administrator access, or an author with a published post in a readable active community, and honours blocks for signed-in readers. Private-only authors cannot be inspected by unrelated members or guests. Existing profiles SELECT permissions are unchanged.

supabase/tests/community_member_profiles.test.sql covers visible authors, private contact exclusion, private communities, own identity and blocked authors. The local Supabase database is unavailable, so the SQL tests have not been executed. Migration has not been applied to production.

## Validation

App TypeScript checks, unit tests, quality and accessibility checks, security checks and Expo web export are run from the authoritative workspace. The two new report-target/error tests are included in npm test. Authenticated Android/device, real push registration, profile-RPC and screenshot visual verification still require a release test environment. No APK build, remote migration or website deployment was performed by this change.

## Release follow-up

Released on 6 October 2026 after explicit authorization. See RELEASE_2026-10-06.md for applied migrations, live admin verification, passing database tests and verified APK v28. Earlier local-only and unexecuted-test notes above describe the pre-release state. Physical phone testing remains unexecuted because no phone was available.
