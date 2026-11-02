# Team-access preview

The next upgrade is available in the web preview; the previously submitted iOS 1.0.1 (8) remains unchanged. Do not request another Apple review until the owner has tested and approved this preview.

## Owner

Sign in with the existing administrator email and password. Home shows the selected month's team totals. Team retains the original employee/month sheet and adds invitations, member access controls and pending-day review. Projects stores names and addresses. Reports reuse the individual/team PDF flows. Settings retains the original company/profile preferences and account deletion controls.

An invitation requires an existing employee, a unique normalized username and an email; the phone number is optional. Sharing buttons open WhatsApp, SMS or an email composition window. They do not send messages automatically. Invites expire after seven days and are consumed after activation.

## Employee

The invitation page offers App Store download and the app's custom-scheme link on iOS, plus browser activation. Android uses the browser. A new recipient defines a password; an existing recipient must authenticate with the invitation's verified email. Usernames are globally unique. Password recovery sends a link to the registered email and returns a generic response.

Employees can list only their own days and company project choices. Submissions await manager approval. Approved days are locked to employees; the manager can edit and approve/reject. Payroll calculations and reports include approved days, with existing records treated as approved.

The employee portal includes a collapsed personal-account deletion control. Company-owned employment history survives employee account deletion. The existing employer account deletion flow is unchanged.

## Backend boundaries

`team-access` explicitly validates a bearer token for private actions; invitation/login/recovery endpoints are intentionally public and rate limited. `team_accounts`, hashed invitations and rate-limit records are service-only, with RLS enabled and no anon/authenticated table privileges. No authorization depends on user-editable metadata. Service requests derive company and employee IDs from verified membership. Payroll remains protected by the existing owner-scoped RLS.

New migrations add tables and approval columns without deleting existing records. The second migration grants the backend the necessary access to legacy employee/profile/day tables. Employee data is not exposed to another company.

## Validation

- Existing authentication, reporting, payment arithmetic and calendar checks.
- Backend tests cover unauthorized actions, cross-company access, membership-derived IDs, pending submissions, approved-day locking, blocking, invitation recipient matching and rate limiting.
- UI tests cover owner navigation, complete day-entry forms and employee portal isolation.
- Live synthetic-account tests cover username login, account roles, blocked sessions, day submission/approval, invitation consumption and new-account activation/password choice. No invitation emails are sent during these tests. Synthetic accounts are removed after testing.
- Native invite opening and sharing must be tested on a physical iPhone before the next Apple submission. The currently installed App Store build does not contain the new employee portal.
