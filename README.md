# Context Lens

Context Lens photographs a book passage, extracts its text on-device, and adds vocabulary, in-book, and real-world context. Authenticated users can save analyzed passages to a private Supabase library.

## Repository layout

- `apps/mobile` — Expo/React Native iOS application
- `apps/backend` — Vercel API for authenticated OpenAI analysis
- `supabase/migrations` — database schema, functions, and row-level-security policies
- `prototype` — early OCR prototype retained for reference
- `docs` — validation and release checklists

## Prerequisites

- Node.js 22
- npm
- Xcode 26 or newer for the current App Store toolchain
- An iPhone with Developer Mode enabled for a local personal build
- Supabase, OpenAI, Upstash, and Vercel projects

## Environment setup

Copy each example file and supply real values. Never commit the resulting `.env` files.

```sh
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
```

The mobile app needs its Supabase URL and anonymous key plus either the local or deployed backend URL. The backend needs OpenAI, Supabase, and Upstash credentials.

Register `contextlens://auth/callback` in Supabase Authentication → URL Configuration → Redirect URLs so magic-link sign-in can return to the app.

## Install and validate

```sh
cd apps/backend
npm ci
npm run validate

cd ../mobile
npm ci
npm run validate
```

`npm run validate` type-checks and runs the complete automated suite. Mobile validation also checks that native packages match Expo SDK 55.

## Database

Apply the migrations in `supabase/migrations` to the Supabase project. A fresh project receives the `books`, `notes`, and `annotation_feedback` tables, the `upsert_book` function, and row-level-security policies that restrict records to the authenticated owner.

Before relying on an older manually configured project, compare its schema and policies with the migrations. Existing permissive policies must be removed manually if their names differ from the policies in this repository.

## Run on a personal iPhone

1. Open Xcode once and sign in with the Apple Account used by the phone.
2. Review and accept the installed Xcode license yourself when Xcode requests it. CocoaPods cannot run until the license is accepted.
3. Connect and trust the iPhone and enable Developer Mode.
4. From `apps/mobile`, run `npm run ios -- --device` and select the phone.
5. If prompted on the phone, trust the developer certificate in Settings.
6. Complete the release smoke test in `docs/MVP_USER_VALIDATION_CHECKLIST.md`.

Free Personal Team provisioning is temporary. Rebuild and reinstall when the profile expires. The Mac does not need to remain running after the native app has been installed; only a development build that is actively loading JavaScript from Metro needs the development server.

## Deployment notes

- Deploy the backend from `apps/backend` only after `npm run validate` passes.
- Confirm `/api/health` returns HTTP 200 after deployment.
- Do not expose `OPENAI_API_KEY` or Upstash credentials in mobile environment variables.
- Increment the iOS `buildNumber` for every uploaded App Store Connect build.
- Review `docs/APPLE_DISTRIBUTION_REQUIREMENTS.md` before TestFlight or App Store submission.

## Known dependency audit limitations

Expo SDK 55 currently brings transitive advisories through its build tooling. Do not use `npm audit fix --force`; npm proposes an incompatible downgrade to Expo 46. Recheck advisories whenever Expo SDK 55 receives a patch and resolve them through supported Expo/React Native upgrades.
