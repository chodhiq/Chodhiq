# ChodhiQ release provenance

## Current traceable release

- Release reference: `v1.0.0-rc.1`
- Source commit: resolve with `git rev-list -n 1 v1.0.0-rc.1`
- Verification command: `npm run verify:all`
- Binary policy: APK, AAB, and IPA files remain outside Git. Publish their SHA-256 digest, build ID, signing channel, source tag, and resolved commit in the release record.
- Deployment policy: every Expo, Cloudflare, and Supabase promotion must record its deployment ID and this tag's resolved commit.

Production Expo builds must set `EXPO_PUBLIC_RELEASE_COMMIT` to the full commit hash. It is embedded as `extra.releaseCommit`; production configuration rejects a missing value.

## Existing binary inventory

These binaries existed before this workspace had valid Git history. Their bytes are identified, but their source commits cannot be reconstructed. They are legacy test artifacts and must not be represented as builds of `v1.0.0-rc.1`.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/ChodhiQ-update-v9-transparent-logo.apk` | 107860211 | `2E9E6F24911B1A57C5796BAE26BA20A484CA5C4043FA67CEEFE7E14AB16C3025` |
| `outputs/ChodhiQ-1.0.0-auth-palettes.apk` | 122049585 | `306C51E7E354659CE9BD39F9FD6DF7FAD826E6FF0E5171DA5C3599831627D46D` |
| `outputs/ChodhiQ-1.0.0-bug-audit.apk` | 122050017 | `EBF014D188D877CDD664A8823C5CC83691D7DAFEB358069E71AA68806F364EF8` |
| `outputs/ChodhiQ-1.0.0-bugfix.apk` | 111467432 | `D76ED027F44EB7960330FE424194B601C52ED30E36E8B6E6EE2B0017E41DFF19` |
| `outputs/ChodhiQ-1.0.0-classic-green-auth.apk` | 122933413 | `EAF7C1E4176657ABEDF2FF7286AF0BFB4B61FD60AF2BDB06B2F117D92DD62DAB` |
| `outputs/ChodhiQ-1.0.0-clean-ui.apk` | 108083639 | `3D8D7096D719A6723DAAB173858A797AC6FAAE42EEC4AAB8264C1FF129C19B9E` |
| `outputs/ChodhiQ-1.0.0-design-system.apk` | 111467129 | `D54A7DEB55B5B8CE0504C0989F3AF0B46EAC574F5194CF4A987E3EFCF6DDB45D` |
| `outputs/ChodhiQ-1.0.0-light-dark-balanced.apk` | 122933097 | `554244B0530413F972B09E700FC14F9BD9FB81598B72763ADBE19926D2DFD972` |
| `outputs/ChodhiQ-1.0.0-map-crash-fix.apk` | 111469884 | `246622C2038406078E9271F7105519AC3BAAFA45A03946417B982797F2559D87` |
| `outputs/ChodhiQ-1.0.0-official-ui.apk` | 111463104 | `1769CAFAB77BB0AE5D40B46F86C40FAE3530DDF3434BFBADF040397E70DC67ED` |
| `outputs/ChodhiQ-1.0.0-reference-ui-v2.apk` | 111464632 | `39FAD1752E7DFB253717E45601CBA3E3D45A4604EF07016D4E289AB58AC4F2BA` |
| `outputs/ChodhiQ-1.0.0-responsive.apk` | 122933385 | `9BE6999A5E62C53C08F3E92907D7DF2F4C527CCFD2B8AF777F1F9ED341B258A3` |
| `outputs/ChodhiQ-1.0.0-three-palettes.apk` | 115516189 | `AE016107427A6790BD5CB05F8BC9C9CC87860A79840790243F0489B904326908` |
| `outputs/ChodhiQ-1.0.0-three-ui-modes.apk` | 122048869 | `F2CB607C3F610701B0E120D55BC4408A464B13261D2E199B0DB6EED14E3E6824` |
| `outputs/ChodhiQ-1.0.0-ui-update.apk` | 108083844 | `E911FABAF4FCA7F29EA3F44600C3CBD3E131B99FB98371588B2BDC2932ED3DEE` |
| `outputs/ChodhiQ-1.0.0-visual-fixes.apk` | 122049733 | `26F9212070DEAFE93C65E47D9D7FC6E99231737D4AFAB83AC17C91810F73F6D9` |
| `outputs/ChodhiQ-1.0.0-workflow-fixes.apk` | 122934349 | `8F95C3615F0682A61C8880C63FD6B54DC32264325AA6EF42F8509A78E1F8878B` |

No IPA or AAB file was present during the 2026-09-21 inventory.

## Deployment register

No verifiable Expo, Cloudflare, Supabase, App Store, or Play Store deployment identifier was present locally at initialization. Populate each row at deployment time; never infer identifiers from filenames.

| Environment | Product | Deployment/build ID | Source tag | Source commit | Deployed at | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Production | Customer app | Pending | `v1.0.0-rc.1` | Resolve from tag | Pending | Pending |
| Production | Business dashboard | Pending | `v1.0.0-rc.1` | Resolve from tag | Pending | Pending |
| Production | Admin dashboard | Pending | `v1.0.0-rc.1` | Resolve from tag | Pending | Pending |
| Production | Coming-soon site | Pending | `v1.0.0-rc.1` | Resolve from tag | Pending | Pending |
| Production | Supabase migrations/functions | Pending | `v1.0.0-rc.1` | Resolve from tag | Pending | Pending |
