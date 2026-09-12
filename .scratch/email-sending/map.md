Label: wayfinder:map

## Destination

Lock the architecture decisions for a general-purpose email-sending capability in voter-file-tool — provider, package location, templating, logging/retry model, and sending domain — so implementation (starting with invite emails, then report-ready emails) can proceed as a clean separate follow-up effort. This map decides; it does not build.

## Notes

- Consumers anticipated: invite emails (smallest first slice), report-ready/report-delivery emails (explicit motivating use case), and later "Leader" notification emails (e.g. meeting reminders) — this third one is fog, not yet scoped.
- Repo is a monorepo: `apps/frontend` (Next.js, NextAuth+Google OAuth), `apps/report-server` (webhook callback to `apps/frontend/src/app/api/reportComplete` + Ably realtime push), and `packages/*` (shared-prisma, shared-validators, voter-import-processor, xlsx-tester).
- Existing audit log pattern: `apps/frontend/src/lib/auditLog.ts` — reserved for canonical/permanent data changes; see [EmailLog vs audit log](issues/01-email-log-vs-audit-log.md) for why sent-email tracking is being kept separate from it.
- Invite flow (today, no email): `apps/frontend/src/app/admin/users/InviteManagement.tsx` + `apps/frontend/src/app/api/admin/invites/route.ts` (copy-invite-URL UX).
- No email infrastructure exists yet anywhere in the repo (confirmed by search): no provider, no `lib/mail*`, no templates, no dependencies.
- Sessions working tickets on this map should call the `grilling` and `domain-modeling` skills for decision tickets, and the `research` skill for research tickets.

## Decisions so far

- Destination & scope: general-purpose capability (not invites-only), decisions-only map, implementation deferred.
- Provider: **Resend**.
- Templating: **React Email** (JSX components, native Resend integration).
- Package location: new shared package **`packages/shared-mailer`** (matches `packages/shared-prisma`, `packages/shared-validators` naming convention), consumed by both `apps/frontend` and `apps/report-server`.
- Report emails: link back into the app (auth + existing audit-logged access), **not** a PDF attachment. Attachments are explicitly deferred (see Not yet specified).
- Dev/test safety: app-level env var gate — sending no-ops (logs instead) when unset or provider misconfigured, rather than relying solely on Resend's own sandbox mode.
- Retry: **no automatic retry**. Failed sends are logged; a manual "retry" action is surfaced to the admin at the calling site (e.g. in `InviteManagement.tsx`). This requires a persisted, identifiable send record — see [EmailLog vs audit log](issues/01-email-log-vs-audit-log.md).
- Sending domain: a dedicated subdomain, **`notifications.opensourcepolitics.online`**, not the root site domain — isolates deliverability/reputation and DNS changes from the live website. User owns the root domain but has never configured transactional email before (see the domain-setup task).
- Sent-email logging: explicitly **not** conflated with the existing audit log (which is for canonical data changes) — but the exact shape of the separate tracking mechanism is still open, not fully decided (see ticket 01).
- Leader meeting-notification emails: acknowledged as an anticipated future consumer, deliberately left unscoped (fog).
- Resend subdomain verification for `notifications.opensourcepolitics.online` needs only 3 required DNS records (MX + SPF TXT + DKIM TXT, per-domain values from the Resend dashboard) plus an optional DMARC TXT, verifies in ~15 min (up to 72h worst case), and can't conflict with the root domain's existing DNS since auth records are evaluated per exact hostname — see [ticket 05](issues/05-research-domain-verification.md).
- Template visual branding/design: deliberately left as implementation-time detail, not an architecture decision (fog).
- Sent-email tracking: a dedicated **`EmailLog` Prisma model**, explicitly not the audit log — the audit log is append-only before/after snapshots keyed to a domain-event enum with a required actor FK, while an email has a mutating lifecycle and a *recipient*. Rows are **one per send attempt** (not per logical email), so a retry inserts a new row and each attempt keeps its own Resend message id. See [ticket 01](issues/01-email-log-vs-audit-log.md) for the full decision list.
- Email sends produce **no audit-log entry** — invites included. The `Invite` row is already the account-lifecycle record; an `EMAIL_SENT` audit action would be a third record of the same fact. This closes the "should invites also get an audit entry" question that was open in Not yet specified.
- Send protocol: **insert-first**, with the `EmailLog` row's `cuid` used as Resend's `Idempotency-Key` — insert `QUEUED`, call Resend, update to `SENT`/`FAILED` with `providerMessageId`. Never inside the caller's transaction. If the pre-send insert fails, abort without sending; if the post-send update fails, log loudly but report success (the mail already went out, and reporting failure would cause a duplicate on retry).
- `packages/shared-mailer` **owns the `EmailLog` writes** and depends directly on `shared-prisma` (a leaf package `report-server` already depends on), accepting an optional client param for tests like `auditLog.ts` does — because the insert is part of the send protocol, not something a caller does alongside it.
- Persisted per send: `toAddress` (raw canonicalized string, **no `User` FK** — invitees have no user row and an FK would go stale), `templateId` (a `String` column, union type owned in `shared-mailer`, so new templates need no schema migration), `subject`, polymorphic `targetType`/`targetId` (mirroring `AuditLog`'s convention), `status`, `providerMessageId`, `errorMessage`. **Never rendered HTML and never the raw template props** — invite emails carry a bearer token in their props.
- The dev/test env gate writes a real row with status **`SKIPPED`** rather than writing nothing, so the send path is observable in local/CI runs and the calling UI's data shape is identical in every environment.
- Resend's `data.id` is persisted as `providerMessageId` **from day one**, but consuming Resend's delivery webhooks is deferred to [ticket 06](issues/06-resend-delivery-webhooks.md) — without that id stored at send time the events could never be correlated or backfilled. The status enum carries `DELIVERED`/`BOUNCED`/`COMPLAINED` from the start so ticket 06 needs no enum migration.
- No pruning of `EmailLog` and no global admin email-log page for now: Resend's free tier keeps its own logs only 30 days, so this is the longer-lived record; status is surfaced per-target at the calling site (the invite row in `InviteManagement.tsx`), which is all the retry action needs.
- Resend setup progress (ticket 03, still open): an API key exists and is stored as `RESEND_API_KEY` in `apps/frontend/.env` (documented in `.env.example`). It is a **restricted send-only key**, so domain-verification status is readable only in the Resend dashboard, not via the API. The sending subdomain has not been added and no DNS records exist yet, so no real send has happened — see [ticket 03](issues/03-domain-dns-setup.md).
- Resend SDK research: `resend.emails.send()` returns a `{data, error}` result object (message id in `data.id`, not a thrown exception) and accepts React Email JSX directly via the `react` field; free tier is 100 emails/day / 3,000/month at 10 req/s, gated to your own signup address until a domain is verified; no native auto-retry but an `Idempotency-Key` header plus delivery webhooks (`email.delivered`/`bounced`/`complained`/etc.) are provided natively; install `react-email` (6.9.3) not the now-deprecated `@react-email/components` — see [Resend integration research](issues/04-research-resend-integration.md).

## Not yet specified

- Leader-role meeting-notification emails: no trigger, data source, or template designed yet. Anticipated but not scoped.
- Attachment support for report emails (PDF attached directly instead of link-back) — deferred, may never be needed.
- Visual branding/design system for React Email templates (colors, logo, layout) — decided per-template when each is actually built.
- A **global admin email-log view** (as opposed to per-target status at the calling site) — plausible later want, deliberately not built now.
- Whether `EmailLog.targetType`/`targetId` are nullable — left to implementation; every anticipated consumer has a target, so requiring them is defensible.
- Auditing of invite *creation* itself (currently unaudited, unlike invite acceptance) — a real but unrelated gap, belongs in its own ticket, not an email concern.

## Out of scope

- Marketing / bulk email of any kind.
- Emailing voters or petitioners as voter-file data subjects — only internal app users with accounts (admins, Leaders, etc.) are ever recipients.
