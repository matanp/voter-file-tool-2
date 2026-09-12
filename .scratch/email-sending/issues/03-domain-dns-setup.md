Type: task
Status: open
Blocked by: 05

## Question

Do the manual setup work to make `notifications.opensourcepolitics.online` a working Resend sending domain: create/access a Resend account, add the subdomain, add the DNS records Resend requires (SPF/DKIM, and DMARC if recommended) at the domain registrar/DNS host for opensourcepolitics.online, verify the domain in Resend's dashboard, and obtain an API key.

This is HITL: the agent can produce exact step-by-step instructions and the specific DNS record values, but registrar access and the Resend dashboard are the user's to drive.

Blocked by [Resend domain verification requirements](05-research-domain-verification.md) so the exact records/steps are based on real facts, not guesses.

Resolve / record on completion:
- Where the API key is stored (env var name, and where — local `.env`, deployment secret store, etc.).
- Confirmation the subdomain is verified and a real test send succeeded.

## Comments

**2026-09-07 — API key obtained; DNS/verification still outstanding.**

Done:
- Resend account exists and an API key has been created.
- The key is a **restricted, sending-only key** (`Authorization: Bearer` against `GET /domains` returns `401 restricted_api_key`, "This API key is restricted to only send emails"). Good least-privilege posture; the practical consequence is that domain-verification status can only be checked in the Resend dashboard, never from the app or from tooling using this key.
- Stored locally as `RESEND_API_KEY` in `apps/frontend/.env` (gitignored via `apps/frontend/.gitignore`), and documented as optional in `apps/frontend/.env.example` alongside the note that unset means sends no-op and are logged `SKIPPED`.

Still outstanding before this ticket resolves:
- Add `notifications.opensourcepolitics.online` as a domain in the Resend dashboard.
- Add the required DNS records at the DNS host for `opensourcepolitics.online` — MX + SPF TXT + DKIM TXT, with the per-domain values Resend shows; optional DMARC TXT. Per [ticket 05](05-research-domain-verification.md) these cannot conflict with the root domain's existing records, since email auth is evaluated per exact hostname.
- Confirm Resend shows the subdomain as Verified (~15 min typical, up to 72h worst case).
- Make a real test send and record the result here.
- Decide where the key lives for deployed environments (Vercel project env vars, and whether report-server needs its own copy) — only the local `.env` is set today.

Note: until the domain is verified, Resend's free tier only permits sending to the account signup address, so any pre-verification test send must target that address.
