# Dependency security status

Audit date: 2026-08-20

`npm audit fix --omit=dev` applied all compatible updates and reduced the report to 20 findings: 10 high and 10 moderate, with no critical findings. The remaining dependency paths are primarily Expo 54, Metro, PostCSS, image-size and Xcode tooling. npm proposes Expo 57 as the complete fix, which is a breaking SDK migration and must not be forced into a production branch without native regression testing. Both web dashboards currently report zero production dependency vulnerabilities.

## Required upgrade workstream

1. Create a dedicated Expo 57 migration branch.
2. Use Expo's supported SDK upgrade procedure and align all Expo modules.
3. Rebuild Android and iOS native projects and development clients.
4. Revalidate Reanimated, bottom sheets, notifications, OAuth, document picker, SQLite and deep links.
5. Run physical-device, accessibility and staging E2E gates.
6. Re-run `npm audit --omit=dev`; document any accepted build-tool-only exposure.

Until this workstream is complete, do not process untrusted image/CSS inputs through local Metro build tooling in shared or exposed build environments.
