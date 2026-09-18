Type: task
Status: open
Blocked by: 01, 03

## Question

Consume Resend's delivery-status webhooks so an `EmailLog` row's status reflects what actually happened to the message, not just that Resend accepted the API call.

Deferred deliberately during ticket 01: without this, a send record's terminal state means "Resend accepted it for delivery," never "it arrived" / "it bounced." Ticket 01 decided to persist Resend's per-attempt message id (`data.id`) from day one specifically so this can be added later without a backfill — that id is the correlation key.

Resolve / build:
- A webhook receiving endpoint in `apps/frontend` (alongside the existing `api/reportComplete` pattern), including **signature verification** — Resend signs webhook payloads; the endpoint must reject unsigned/forged posts. Compare with `reportCompleteVerifier` for the existing verification pattern in this repo.
- Which event types to handle: at minimum `email.delivered`, `email.bounced`, `email.failed`, `email.complained`. Explicitly decide whether `email.opened` / `email.clicked` are wanted (tracking pixels on internal admin mail — probably not) and whether `email.delivery_delayed` warrants a distinct status or is ignored.
- How an event maps onto the persisted status, given rows are **one-per-send-attempt** (ticket 01): match on `providerMessageId`, never on recipient.
- Out-of-order and late events: a `delivered` can arrive after a `bounced`, and events can arrive for an attempt superseded by a later retry. Decide the status-transition rules so a stale event can't regress a row.
- Unknown `providerMessageId` (event for a send this app has no record of): log and drop, or store orphaned? Decide.
- Whether bounce/complaint events should surface anywhere in the admin UI, or only be queryable — Resend enforces bounce (<4%) and complaint (<0.08%) rate ceilings even on the free tier, so silent accumulation is a real risk.

Blocked by ticket 01 (the `EmailLog` shape and status enum this writes into) and ticket 03 (a verified domain + real sends before there is anything to receive events about).

Reference: event-type list and payload shapes in [Resend integration research](../04-resend-integration-research.md) §4.
