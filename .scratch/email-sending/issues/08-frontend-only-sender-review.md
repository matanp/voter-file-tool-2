Type: grilling
Status: open
Blocked by: 02

## Question

Pre-implementation review of the locked decisions in [map.md](../map.md) and [ticket 02](02-sender-abstraction-api-design.md). Nothing is built yet, so any of these is still cheap to change. Ordered by how much they change.

### 1. Send email only from `apps/frontend`; do not create `packages/shared-mailer`

The map locates the mailer in a shared package "consumed by both `apps/frontend` and `apps/report-server`". The only reason `report-server` was ever a consumer is the report-ready email — but `report-server` does not own report completion. It POSTs to `apps/frontend/src/app/api/reportComplete/route.ts` (`apps/report-server/src/index.ts:468`, `:504`), and that handler already:

- flips `Report.status` to `COMPLETED`/`FAILED`,
- has the recipient one join away (`Report.generatedById` → `User.email`, `schema.prisma:578`),
- already fans out a side-effect (Ably publish) after the status update,
- is already idempotent against callback retries (skips when status is not `PROCESSING`).

So the report-ready email is one more effect in that handler, and no anticipated consumer (invites, report-ready, future Leader notifications, the ticket 06 webhook receiver — all frontend) needs `report-server` to send mail.

What moving to `apps/frontend/src/lib/mailer/` removes:

- the React **peer** dependency straddling 18.3.1 (`report-server`) and 19.1.1 (`frontend`) — ticket 02 item 1's accepted cost;
- a JSX build step in a `tsc`-to-`dist/` package (ticket 02, "Context established") — templates just live in the Next.js tree, which already compiles JSX and can run react-email previews;
- a second production `RESEND_API_KEY` in `report-server`'s deployment env (ticket 03) — one key, one `.env`, one env gate;
- the "package cannot import `Invite`/`Report` types" constraint that drove polymorphic `targetType`/`targetId` (ticket 01, decision 5). Keep the polymorphic columns anyway — the send record should outlive its target — but the constraint is no longer load-bearing;
- the factory rationale in ticket 02 item 4 ("`shared-prisma` exports the class, not an instance"). `apps/frontend` has `~/lib/prisma`, so the mailer can follow `auditLog.ts` exactly: optional `client` param defaulting to the singleton. Keeping `createMailer` as a factory is still fine (construction-time env gate, injected `sendEmail` seam); it is just no longer forced.

Everything else in ticket 02 — the `send()` signature, `SendResult`, the closed template registry, guards, `getLatestStatuses`, subject sanitization, `From` constant — is about the interface, not the package boundary, and survives unchanged. If `report-server` ever genuinely needs to send, extract then; that is a mechanical move because the interface is already designed as if it were a package.

Consequence to design for: `reportComplete` becomes status-update → Ably → email. The email send must be **after** the Ably publish and must **never** affect the webhook response — a `FAILED` result is logged in `EmailLog` and the handler still returns 200, otherwise a Resend outage makes `report-server` think the callback failed.

### 2. The `Idempotency-Key` claim is wrong as written

Map: the row cuid as `Idempotency-Key` "protects against double-submitting the same attempt (double-clicked button, retried HTTP request)". It does not. A double-click hits the invite route twice → two `send()` calls → two `EmailLog` inserts → two distinct keys → two emails. A per-attempt key only dedupes a retry of the *same* Resend call for the *same* row, which the "no automatic retry" decision rules out.

Keep sending the header (harmless, one line), but fix the stated guarantee, and put the actual double-submit guard at the call site: e.g. the invite route consults `getLatestStatuses` and refuses a second send for the same target while the latest row is `QUEUED` or `SENT` within the last N seconds; the UI disables the button while the request is in flight.

### 3. A stuck `QUEUED` row is invisible to the retry UI

Ticket 01's asymmetric failure handling: if the post-send `update` fails, report success. The row is then `QUEUED` forever and the mail went out. `getLatestStatuses` will render "sending…" indefinitely for that target with no retry action. Decide: treat `QUEUED` older than a threshold as `UNKNOWN` in `EmailLogSummary` (surface a retry, accept a possible duplicate), or leave it and document that ticket 06's `delivered` webhook is what eventually heals it (it matches on `providerMessageId`, which the failed update never persisted — so it cannot heal it). The first option is the honest one.

### 4. Make `text` required for the invite template now, not reserved

Ticket 02 item 14 reserves `text?` and defers it. Ticket 03's only real test send landed in Gmail spam from a zero-reputation subdomain, and the invite carries a bearer token. HTML-only is a known signal. A hand-written text part for one template is minutes of work; reserving the slot saves nothing.

### 5. Indexes the decided queries need

- Default suppression guard: `WHERE toAddress = ? AND status IN (BOUNCED, COMPLAINED)` on every send → `@@index([toAddress, status])`.
- `getLatestStatuses`: latest row per `(targetType, targetId)` → `@@index([targetType, targetId, createdAt])`, and implement with `$queryRaw` `DISTINCT ON` (Prisma's `distinct` filters client-side after fetching every row).
- Ticket 06 correlation: `@@unique([providerMessageId])` (nullable).

### 6. Minor

- `NOT_CONFIGURED` should `console.error` per send (item 7) — fine, but with frontend-only there is exactly one `.env`, so also fail the **Vercel build** via an env check in `next.config`/`env.js` when `NODE_ENV=production` and the key is missing, which is stronger than a per-send log nobody reads.
- `SKIPPED` rows will accumulate in local/CI DBs; harmless, but the invite test fixtures should assert on them rather than mock the mailer, since observability was the point.

## Answer

(open)

## Working plan addendum — durable outbox with one delivery worker (2026-09-19)

This is an additive working direction, not yet a rewrite of the decisions above or of tickets 01–03. Keep the original review intact until this plan is reconciled with those tickets.

### Ownership split

“Who decides to notify?” and “which process delivers email?” are separate responsibilities:

| Responsibility | Owner |
| --- | --- |
| Decide that an invite, report, or Leader notification is required | `apps/frontend` |
| Insert the durable email request in the same transaction as the domain change | `apps/frontend` |
| Claim, render, send, and retry queued email | One long-running delivery worker on the report-server's Lightsail host |
| Query email status and expose admin retry controls | `apps/frontend` |
| Apply Resend delivery webhooks | Undecided endpoint; it updates the same durable email record |

The report-server must not send report-ready email directly from `processJob()`. It still reports completion to `apps/frontend`; the frontend remains the owner of the `Report` transition and atomically records the resulting notification. The existing Lightsail deployment is only the runtime for the delivery worker.

### Transaction boundary

For a successful report callback, one frontend database transaction should:

1. conditionally transition the `Report` from `PROCESSING` to `COMPLETED` (or to `FAILED` for a failure callback), so concurrent callbacks cannot both win;
2. insert the corresponding queued email record with a database-enforced logical deduplication key, if that outcome should notify; and
3. commit both changes together.

After the commit, `reportComplete` may publish Ably as a best-effort realtime hint and then return 200. It does not call Resend. A process failure after the commit can delay Ably or email delivery, but cannot erase the queued email.

Invite creation follows the same rule: create the `Invite` and its queued email record in one transaction. Other future notification-producing mutations use the same enqueue interface.

### Use `EmailLog` as the outbox, provisionally

The working preference is for `EmailLog` itself to be the email outbox rather than adding both an outbox table and a delivery-log table. One row represents one logical request to send an email:

- inserting the row is enqueueing;
- a worker lease represents active delivery;
- `SENT` means Resend accepted the message;
- delivery webhooks may advance it to `DELIVERED`, `BOUNCED`, or `COMPLAINED`;
- a manual retry inserts a new row so the prior history remains intact.

The model will need, at minimum, a unique logical deduplication key, attempt count, next-attempt time, lease expiry, last error, and terminal-failure representation in addition to the fields already planned. Exact field and enum names remain an implementation decision.

Technical retries reuse the same row id as Resend's `Idempotency-Key`. This is the case in which the key provides real protection: if a worker loses the response or crashes after Resend accepts a send, the expired lease is reclaimed and the same logical request is submitted with the same key. An intentional admin retry creates a new row and therefore a new key.

This provides durable, at-least-once processing with duplicate suppression; it is not a claim of mathematically exact-once delivery.

### Delivery worker

Run delivery as a separate PM2 process on the existing Lightsail host, provisionally named `email-outbox-worker`. Do not put it inside the Express request process or the report server's in-memory `async.queue`; report/Puppeteer crashes, memory restarts, and queue load should not directly stop an in-flight email worker.

The worker loop should:

1. atomically lease a small batch of eligible rows;
2. rehydrate the target data needed by the registered template;
3. run suppression guards and render HTML plus required plain text;
4. call Resend outside the lease transaction using the stable row id as the idempotency key;
5. conditionally advance the row on success, or schedule retry with backoff on a transient failure;
6. move exhausted or permanent failures to an admin-visible terminal state; and
7. allow an abandoned lease to expire so another worker can recover it.

All updates must be conditional and monotonic. A late worker must not overwrite a newer attempt or regress a webhook-updated `DELIVERED`/`BOUNCED`/`COMPLAINED` state back to `SENT`.

### Data and secret handling

- Snapshot the canonical recipient and resolved subject when enqueueing so the requested delivery is deterministic and historically accurate.
- Continue to store `templateId`, `targetType`, and `targetId`.
- Do not persist raw template props or rendered bodies. The worker rehydrates props from the target record; this keeps invite bearer tokens out of `EmailLog`.
- After cutover, only the delivery worker needs the production `RESEND_API_KEY`; the frontend writes and reads outbox rows without provider credentials.
- Monitor oldest queued age, expired leases, and terminal failures. Durability without stuck-queue monitoring can still fail silently.

### Code-location consequence

The earlier “all mailer code in `apps/frontend/src/lib/mailer/`” recommendation no longer applies as written:

- frontend code owns enqueueing, transaction integration, and status queries;
- the delivery worker owns the template registry, React Email templates, suppression, Resend integration, leasing, and retry policy;
- no `packages/shared-mailer` package is required while only the worker renders and sends;
- a small closed notification-kind/target contract may live in `shared-validators` if both processes need it, while React and provider code remain worker-local.

Whether the worker initially lives as a second entry point under `apps/report-server` or as a small `apps/email-worker` is deliberately unresolved. It should be a separate PM2 process either way, so moving it later does not change the database interface.

### Effect on the review above

- Section 1's ownership conclusion changes from “frontend sends” to “frontend enqueues; one Lightsail worker sends.” Its arguments against direct report-job sending still stand.
- Section 2's criticism still stands for a newly generated key per HTTP request. The outbox plan instead gives infrastructure retries a stable row/key and requires database uniqueness for logical enqueue deduplication.
- Section 3 is addressed through recoverable leases and stable-key retries; an old queued or leased row becomes actionable worker state rather than an indefinite UI-only `UNKNOWN` state.
- Sections 4 and 5 still stand: invite email should have hand-written plain text, and the decided queries need supporting indexes.
- Section 6 changes: production provider configuration belongs to the delivery worker deployment, not the Vercel frontend build.

### Decisions still to reconcile before implementation

- Confirm `EmailLog` doubles as the outbox rather than introducing a separate outbox model.
- Choose the initial source-tree location and PM2 entry point for the delivery worker.
- Define lease duration, retry classification/backoff, maximum attempts, and terminal state names.
- Decide which report outcomes generate email (`COMPLETED` only or `FAILED` too).
- Decide whether invite creation only enqueues or also requests an eager post-commit delivery attempt for faster admin feedback.
- Choose the Resend webhook endpoint and specify monotonic state-transition rules.
- Update tickets 01 and 02, the map, deployment configuration, and tests only after these choices are settled.
