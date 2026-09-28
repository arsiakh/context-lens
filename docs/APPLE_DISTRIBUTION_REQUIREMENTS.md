# Apple distribution requirements for Context Lens

Last policy review: 2026-09-28

This is the app-specific preflight list for TestFlight and App Store distribution. Apple changes its requirements, supported SDKs, and agreements; recheck the linked primary sources immediately before each submission.

## 1. Membership, agreements, and app record

- [ ] Enroll in the Apple Developer Program and complete identity/compliance verification.
- [ ] Accept all current developer and App Store Connect agreements.
- [ ] If the app becomes paid or offers purchases, accept the Paid Apps Agreement and provide tax and banking details.
- [ ] Create the App Store Connect app record before uploading a build.
- [ ] Register and retain the bundle ID `com.arsiakh.contextlens`; enable only capabilities actually used by the binary.
- [ ] Create distribution signing credentials or allow Xcode/EAS to manage them automatically.

Sources: [App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow/), [Agreements and guidelines](https://developer.apple.com/support/terms/)

## 2. Build and technical compliance

- [ ] Build with the currently required Xcode/iOS SDK. As of this review, iOS uploads must be built with Xcode 26 or later.
- [ ] Keep the marketing version user-facing and increment `ios.buildNumber` for every uploaded build.
- [ ] Provide a non-placeholder 1024×1024 icon, launch experience, correct product name, and correct bundle identifier.
- [ ] Test on supported physical devices, screen sizes, and the oldest supported iOS version.
- [ ] Ensure the app is complete, stable, and free of placeholder or “coming soon” controls before App Review.
- [ ] Keep the production backend available throughout review.
- [ ] Give App Review a working demo account and precise review notes for camera, OCR, AI analysis, and saved-library flows.
- [ ] Include valid privacy manifests and signatures for third-party SDKs that Apple lists, and declare every required-reason API used by the app or its dependencies.
- [ ] Answer export-compliance questions and supply encryption documentation if Apple requests it.

Sources: [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/), [App Review Guidelines 2.1 and 2.5](https://developer.apple.com/app-store/review/guidelines/), [Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)

## 3. Authentication and account lifecycle

- [ ] Decide whether sign-in is necessary for the core experience. Account-gated features must be significant; otherwise Apple expects useful access without login.
- [ ] Keep email/password and magic-link behavior reliable, including expired-link and expired-session recovery.
- [ ] If Google or another social login is added, also offer an equivalent login service satisfying Guideline 4.8. Sign in with Apple is the normal choice for this app.
- [ ] Restore the Sign in with Apple capability only after paid-team provisioning and the complete nonce/token flow are configured.
- [ ] Provide an easy-to-find in-app account-deletion action. It must delete the Supabase auth account and associated books, notes, and feedback—not merely sign out or deactivate.
- [ ] If Sign in with Apple is used, revoke the user's Apple tokens during account deletion.

Sources: [App Review Guidelines 4.8 and 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/), [Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app)

## 4. Privacy, AI disclosure, and data security

- [ ] Publish a working privacy-policy URL in App Store Connect and link to the same policy from an easy-to-find in-app screen.
- [ ] State what is collected and why: account email/identifier, photographed/extracted passage text, optional book metadata, saved annotations, feedback events, and operational diagnostics actually retained.
- [ ] Name the categories of processors involved, including Supabase, Vercel, Upstash, and OpenAI, and describe retention, security, and deletion behavior.
- [ ] Before sending passage text or other personal data to OpenAI, clearly disclose that it is shared with third-party AI and obtain explicit user permission. Preserve the user's choice and provide a way to withdraw it.
- [ ] Complete App Store privacy-label answers for the app and every third-party SDK; keep them synchronized with actual behavior.
- [ ] Request camera/photo access only in context, with accurate purpose strings and a usable denial/recovery path.
- [ ] Do not use camera/photo-derived data for advertising, marketing, or user profiling.
- [ ] Use TLS, keep privileged keys server-side, enforce Supabase RLS, minimize logs, and prevent one account from accessing another account's content.
- [ ] Define and honor retention periods, consent withdrawal, data export/request handling where legally required, and complete deletion.
- [ ] Use App Tracking Transparency only if future behavior meets Apple's definition of tracking. The current app should not track users.

Sources: [App Review Guidelines 5.1](https://developer.apple.com/app-store/review/guidelines/), [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy), [User privacy and data use](https://developer.apple.com/app-store/user-privacy-and-data-use/)

## 5. Content, design, permissions, and legal rights

- [ ] Make the camera's active use obvious and request explicit consent before capture.
- [ ] Ensure every permission is essential and the app remains understandable when permission is denied.
- [ ] Keep accessibility labels, focus order, Dynamic Type behavior, contrast, touch targets, and safe-area layouts usable.
- [ ] Do not market generated context as guaranteed fact. Provide clear retry/error states for OCR and model failures.
- [ ] Use only icons, fonts, textures, screenshots, sample passages, trademarks, and other assets that you own or are licensed to distribute.
- [ ] Avoid including copyrighted book passages in App Store screenshots or marketing unless permission or a valid exception applies.
- [ ] Comply with the OpenAI, Supabase, Vercel, Upstash, Expo, and other third-party service terms.
- [ ] Comply with privacy, consumer, copyright, and AI laws in every selected storefront; obtain legal advice where needed.

Sources: [App Review Guidelines 1.6, 2.5.14, and 5.2](https://developer.apple.com/app-store/review/guidelines/)

## 6. App Store metadata

- [ ] Finalize app name, subtitle, description, keywords, primary/secondary categories, copyright, support URL, and optional marketing URL.
- [ ] Supply at least one accurate screenshot for each required device family; screenshots must show the shipping interface and must not mislead.
- [ ] Complete the age-rating questionnaire honestly, including user-generated, web, or AI-generated content characteristics if applicable.
- [ ] Provide the privacy-policy URL, support contact, review contact, review notes, and demo credentials.
- [ ] Set price, tax category, storefront availability, and release method.
- [ ] Confirm metadata, screenshots, and the binary make no unsupported performance, privacy, or accuracy claims.

Sources: [Screenshot requirements](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots), [Publishing overview](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/overview-of-publishing-your-app-on-the-app-store/)

## 7. TestFlight preflight

- [ ] Provide beta description, features to test, feedback email, and beta review contact information.
- [ ] Upload a correctly signed build and finish export-compliance answers.
- [ ] Run the complete MVP validation checklist on the exact uploaded build.
- [ ] Add internal testers first. External testing may require Beta App Review and must comply with the App Review Guidelines.
- [ ] Monitor crashes, sessions, and tester feedback. Replace or expire builds with release-blocking defects.
- [ ] Remember that TestFlight builds expire after 90 days.

Source: [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)

## 8. Context Lens work still required before App Store submission

- [ ] Implement account deletion and verify cascading deletion of saved data.
- [ ] Add an in-app Privacy screen and hosted privacy-policy URL.
- [ ] Add an explicit consent screen before the first passage is shared with OpenAI.
- [ ] Replace or remove Profile, Settings, Help, and About placeholders.
- [ ] Complete Google Sign-in together with Sign in with Apple, or defer both.
- [ ] Configure EAS/App Store Connect, build numbering, credentials, and the TestFlight profile.
- [ ] Produce screenshots, support content, metadata, demo credentials, and reviewer instructions.
- [ ] Run privacy-manifest/report inspection on the archived release binary.
- [ ] Complete and retain the physical-device validation record.
