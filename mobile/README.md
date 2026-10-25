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

## Apple monthly subscription

Product ID: `io.github.jefrisrenovationnetizen.suividesheures.monthly` (no hyphen).
The Bundle ID retains its hyphen. StoreKit 2 obtains the localized price, associates
purchases with the signed-in Supabase UUID, and keeps unfinished transactions until
the authenticated server verifies the Apple signature and saves the entitlement.
Restoration requires the same app account used for the original purchase.

`subscription-access` and `apple-subscription-notifications` verify Apple JWS using
Apple's official server library and public Apple PKI certificates with online
revocation checks. Configure **both production and sandbox App Store Server
Notifications V2** in App Store Connect to:
`https://nnrelfuewfhkirgzbwsi.supabase.co/functions/v1/apple-subscription-notifications`.
The webhook uses Apple signature authentication, not a Supabase user JWT.

The launch date is deliberately **not set**: `billing_config.launch_at` is null.
Existing access stays free until the actual launch is scheduled. At launch set a
reviewed timestamptz in that single row. Promotion ends three calendar months later.
Each enrolled account gets twenty days from the later of enrollment and promotion
end. No subscription is automatically created after those days; the user must
confirm an Apple purchase. Enrollment and trial dates are server-controlled.
Expired users retain reading, reports, exports, settings and account deletion;
server restrictive RLS policies reject changes to employees, work days and payment
records. Existing website accounts are not enrolled automatically by this release.

Sandbox transactions are stored separately and cannot unlock production access
while `allow_sandbox=false` (the default). Never enable this global setting for a
public release. A signed Apple purchase, renewal, expiry, refund/revocation and
restore still need physical-device sandbox testing before release. This code has
not yet been compiled with Xcode in this workspace (Linux).

Validation: `npm test`, web build, generated native project registration, and
`supabase/tests/billing.sql` (rollback-only server access/ownership regression).
Before submission also complete the Paid Apps agreement/bank/tax setup, add the
subscription/group localization and review screenshot, finish native UI language
and privacy policy checks, and remove the test banner only after device validation.
