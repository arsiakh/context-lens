# Personal-use readiness plan

Last reviewed: 2026-09-28

This checklist separates work that can be verified automatically from checks that require the owner's physical iPhone and accounts.

## Automated release hardening

- [x] Use the supported Expo SDK 55 patch versions.
- [x] Regenerate the local Expo CLI signing patch for the installed CLI version.
- [x] Give the app its product name, stable slug, bundle identifier, version, and initial iOS build number.
- [x] Remove the unused Sign in with Apple capability while building with a free Personal Team.
- [x] Add a reproducible `books` and `notes` schema with owner-only row-level-security policies.
- [x] Add aggregate backend and mobile validation commands.
- [x] Run the entire mobile suite in continuous integration.
- [x] Document setup, validation, database, device-installation, and deployment procedures.
- [x] Record unresolved upstream dependency advisories without applying breaking forced fixes.

## Required owner checks before starting the trial

- [ ] Review and accept the Xcode licence in Xcode (or run `sudo xcodebuild -license` and review it) so CocoaPods can run.
- [ ] Apply all Supabase migrations and inspect the live project for older permissive policies.
- [ ] Confirm the deployed backend `/api/health` endpoint returns HTTP 200.
- [ ] Build and install the current branch on the intended iPhone.
- [ ] Confirm email/password and magic-link sign-in on the physical phone.
- [ ] Complete sections 1–3 and the release smoke test in `MVP_USER_VALIDATION_CHECKLIST.md`.
- [ ] Perform at least ten capture → OCR → analyze → Reader runs with real pages.
- [ ] Save and reopen at least one passage after force-closing the app.
- [ ] Exercise camera denial, offline analysis, timeout/retry, and session-expiry recovery.
- [ ] Use a second account to confirm neither account can read the other's books or notes.
- [ ] Record the build number, commit, device, iOS version, failures, and final pass decision.

## Trial acceptance rule

The build is ready for a one-week personal trial when automated validation passes and the owner checks above have no unresolved crash, data-loss, authentication, privacy, or core capture-to-reader failure. Cosmetic issues may be recorded for later if they do not block the primary journey.

## Dependency-risk decision

Production packages are updated within their supported major/framework ranges. Remaining npm advisories are transitive dependencies in Expo/Metro and Vercel build tooling. Forced audit fixes are explicitly rejected because npm proposes incompatible framework downgrades. Re-audit before each release and resolve through supported upstream releases.
