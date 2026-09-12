Type: task
Status: resolved
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

**2026-09-12 — Domain verified; real test send succeeded (landed in spam).**

Done:
- `notifications.opensourcepolitics.online` added in Resend (region us-east-1). Return-Path subdomain left at the default `send`; click/open tracking **left off** — invite emails carry a bearer-token link that must not be rewritten through a tracking redirect, and nothing in the map needs engagement metrics.
- DNS is hosted at **Vercel DNS** (`ns1/ns2.vercel-dns.com`), not the registrar. Records added in the Vercel dashboard (Name field is relative to the root):
  - `MX send.notifications` → `10 feedback-smtp.us-east-1.amazonses.com`
  - `TXT send.notifications` → `v=spf1 include:amazonses.com ~all`
  - `TXT resend._domainkey.notifications` → `p=MIGf…` (DKIM key from dashboard)
  - `TXT _dmarc.notifications` → `v=DMARC1; p=none; rua=mailto:mpresberg@gmail.com;` (Resend's suggested value omits `rua=`; added so reports actually arrive)
  - `TXT _dmarc` (root) → same value — defensive policy for the root domain, which sends no mail today. Initially added by mistake in place of the subdomain record; kept deliberately.
- Vercel warned "Wildcard Domain Override": the root has a `*.opensourcepolitics.online` A record, and adding records under `notifications` stops the wildcard matching `notifications.*`. Intended — the subdomain is sending-only and must never host the site. Root, `www`, and other subdomains confirmed unaffected.
- Records were visible at Vercel's authoritative NS and via 8.8.8.8 within minutes; Resend showed **Verified** shortly after.
- Real test send via `POST /emails` with the local key: Resend id `ca159791-9ac7-4c20-9106-61f734fa3240`, from `Open Source Politics <notifications@notifications.opensourcepolitics.online>` to the account owner's Gmail. Gmail headers: `spf=pass`, `dkim=pass` (selector `resend` + SES), `dmarc=pass` with `header.from=notifications.opensourcepolitics.online`. **Landed in the spam folder** — expected for a zero-reputation domain sending a one-line plain-text message with no links; not a configuration fault. Marked "not spam" manually. Warm-up / seed-testing / bounce-rate monitoring belongs in the research ticket proposed by [ticket 02](02-sender-abstraction-api-design.md) Q18.

**2026-09-12 — Deployed-env key decision; ticket resolved.**

- Two restricted send-only keys: the original one stays as the **dev** key in the local `apps/frontend/.env`; a separate **production** key was minted and set as `RESEND_API_KEY` in the Vercel project env vars for `apps/frontend` (production scope; preview left unset so sends log `SKIPPED`). Separate keys so a leaked dev key can be revoked without touching production, per-key usage is visible in Resend, and the prod key never lives on a laptop.
- `apps/report-server` will use the production key in its own deployment env when report emails are implemented; nothing set for it yet.
- Follow-up: the spam placement on the first send motivates the deliverability research ticket proposed in [ticket 02](02-sender-abstraction-api-design.md) Q18 (warm-up, seed testing, bounce/complaint monitoring).
