# Suivi des heures Pro 1.0.3

Prepared corrections, not deployed.

- Employee portal and portrait PDF show worked hours, approved days, daily/hourly/fixed rate, gross pay, monthly advances and net balance. Only approved records contribute to pay.
- Workplace filters recompute hours and daily/hourly gross pay; monthly advances and fixed salary are not allocated across workplaces.
- Own payment data is selected on the server using verified membership, never client-supplied owner or employee IDs. No payment row is displayed as “rate not yet entered”.
- Language selection stays visible before login and inside the employee area. Local preference is retained for screens and reports.
- Existing password login is expanded, the last successful identifier is retained, and the stable access URL is available even from an expired invitation page. Auth sessions continue to use the existing persisted Supabase session.
- New managed phone invitations can be accepted without manually creating a password. Tokens remain expiring and single-use. Password-reset invitations and existing verified email identities preserve their existing verification.
- Owner data refreshes avoid redundant nested loads.

Validation: 46 automated tests passed and Vite production build passed. Includes generated PDF content, daily/hourly/half-day calculations, filtered fixed salary, language changes, membership isolation, blocked users and invite replay protection. Physical iPhone acceptance and live authenticated employee PDF verification are pending.

Publication order: deploy the reviewed team-access Edge Function first, then publish the matching web preview and invitation page. Build and upload a new signed iOS 1.0.3 binary separately. The existing production backend deployment was blocked by automatic approval review pending explicit authorization; no live backend was changed.

This change does not implement the separate previously planned phone/SMS registration for personal/company accounts or App Store subscription capacity tiers.
