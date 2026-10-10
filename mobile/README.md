# Suivi des heures Pro — mobile

A shared Capacitor application built from a frozen copy of the tested time-tracking UI. The public production page is independent. Backend records remain in the existing owner-scoped Supabase project. New accounts start with an empty profile, French and EUR defaults, and no sample employees or company branding.

## Reproducible build

Node 22+:

```
cd mobile
npm ci
npm run prepare:web
npm test
npm run build
npm run prepare:native -- ios
```

Use `android` instead of `ios` for Android. Generated platform directories and bundles are excluded from git and recreated on the build machine. iOS uses the existing Apple Bundle ID `io.github.jefrisrenovation-netizen.suividesheures` and Team ID `ZFF7B3HXTT`. Android uses the valid Java identifier `io.github.jefrisrenovation.suividesheures`.

## Codemagic

The root `codemagic.yaml` has two manual test workflows:

- `ios-simulator`: build for an iPhone simulator, no Apple credential required. It cannot be installed on a physical iPhone or uploaded to App Store Connect.
- `android-debug`: generates a test APK, not a Google Play release.

No workflow publishes to a store automatically. Production signing and TestFlight configuration are still required.

## Before physical-device testing and release

- Add `suiviheurespro://login` to Supabase Auth URL Configuration > Redirect URLs. The mobile application uses this callback; it does not change web authentication. Verify the complete email login on a physical device. The provided Apple site-association JSON is an optional future alternative requiring Associated Domains capability and correct hosting; it is not enabled by default.
- Android app-link association needs the real signing certificate SHA-256 fingerprint. Never use a fabricated fingerprint.
- Configure App Store Connect credentials in Codemagic directly. Do not commit `.p8`, certificates, passwords or keystores.
- Test login, persistence, PDF sharing, employee deactivation, date deletion, financial totals and permanent account deletion with a separate test account.
- Audit all languages: several inherited UI messages and report labels are still Portuguese. Complete their translations before release.
- Verify privacy declarations against the final SDK/native bundle and backend configuration; update the policy to cover the released mobile version.
- Configure Android release signing and Google Play account, screenshots, pricing/availability and store requirements.

## Account deletion

The `delete-own-account` Edge Function validates the bearer token against Supabase Auth and requires the authenticated account email. The target user ID comes only from the verified user, never the request body. It revokes refresh sessions and invokes admin deletion. The migration adds CASCADE for monthly payments so deleting Auth user data is atomic with the owned relational records. Existing employee removal remains deactivation, which preserves history.

The Edge Function and migration are deployed. Validation checked gateway denial without authentication and cascade behavior using synthetic rows inside a transaction followed by rollback. A complete physical-device deletion test is still pending.
