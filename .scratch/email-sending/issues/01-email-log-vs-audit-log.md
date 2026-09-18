Type: grilling
Status: resolved

## Question

How should sent emails be tracked, and how does that reconcile with the existing audit log (`apps/frontend/src/lib/auditLog.ts`)?

Context: the user's instinct is that the audit log is for canonical/permanent data changes, and a "we sent an email" event doesn't feel as permanent as that — conflating them feels off. But retry needs *some* persisted, identifiable record of a send (recipient, template/type, status, error, timestamp) for an admin to act on at the calling site (e.g. a "retry" button in `InviteManagement.tsx`). One proposed direction floated during mapping: a separate lightweight `EmailLog` Prisma model, purpose-built for this, leaving the audit log untouched — but the user wanted to think about it more rather than lock it during mapping.

Resolve:
- Does sent-email tracking get its own model/table, reuse the audit log, or something else (e.g. piggyback on an existing table)?
- What fields does it need at minimum to support the "surface a retry button to the admin" requirement from the map's Decisions-so-far?
- Should any sends (e.g. invites specifically) *also* produce an audit log entry, given an invite is arguably a meaningful account-lifecycle event? (Noted as a possible cheap follow-up in the map's Not yet specified — decide here whether it's in scope now or truly deferred.)

## Answer

### Grounding facts established during the grilling

- `AuditLog` is **append-only immutable snapshots** (`beforeValue`/`afterValue`) keyed to an `AuditAction` **enum** of domain events (`schema.prisma:516`, `:58`). An email's status *mutates over time* (sent → delivered → bounced). Structural mismatch, not merely a stylistic one.
- `AuditLog.userId` is a **required FK to `User`** — a real actor. Report-ready emails are system-triggered from the `reportComplete` webhook, and `AuditLog` has no concept of a *recipient*, which is an email's interesting party.
- Invite **creation** writes no audit entry today; invite **acceptance** does (`apps/frontend/src/lib/applyPendingInvite.ts:382`).
- Both apps get Prisma via `@voter-file-tool/shared-prisma`, so a new model is writable from `apps/frontend` and `apps/report-server` alike.
- Auth identity emails are canonicalized lowercase/trimmed on write (`schema.prisma:92`), making the address a reliable join key back to `User`.
- Invite tokens are bearer credentials — `randomBytes(32)` granting a privilege level (`apps/frontend/src/app/api/admin/invites/route.ts`).

### Decisions

1. **Dedicated `EmailLog` Prisma model.** Not the audit log, not per-consumer columns. The audit log's contract is "canonical data changed, here is the snapshot"; an email is an outbound side-effect with a lifecycle. Reusing it would force a mutable `status` onto an immutable-by-design table and turn `AuditAction` into something other than a list of domain events.

2. **One row per send *attempt*, not per logical email.** A retry inserts a new row rather than mutating the old one. Driven by Resend issuing a distinct message id per attempt: overwriting a row would discard the previous `providerMessageId` and make a late-arriving webhook for the first attempt uncorrelatable. Cost accepted: "current state of X" is a latest-row-per-target query.

3. **No audit-log entry for email sends** — invites included. The `Invite` row already records the account-lifecycle event and `EmailLog` records the send; an `EMAIL_SENT` audit action would be a third record of the same fact. (Separate, unrelated observation: invite *creation* being entirely unaudited is a real gap, but it belongs to its own ticket and is not an email concern.)

4. **Persist Resend's `data.id` as `providerMessageId` from day one; defer webhook consumption** to [ticket 06](06-resend-delivery-webhooks.md). Without that id stored at send time, delivery webhooks can never be correlated and cannot be backfilled. The status enum carries the terminal webhook states from the start so ticket 06 needs no enum migration.

5. **Polymorphic `targetType` + `targetId` strings** to identify what a send is about, mirroring `AuditLog`'s existing `entityType`/`entityId` convention. Per-consumer FKs were rejected because `shared-mailer` is a package and cannot import `Invite`/`Report` types without inverting the dependency, and would need a migration per new consumer. Loss of referential integrity is acceptable and arguably correct: the send record should outlive its target.

6. **Recipient stored as a raw `toAddress` string, canonicalized the same way as auth emails.** No `User` FK — invitees have no `User` row by definition, and a FK would go stale if the user later changed their email, which is precisely wrong for a historical log. Joins to `User` remain possible on demand because auth emails are canonicalized.

7. **The dev/test env gate writes a row with status `SKIPPED`** rather than writing nothing. Otherwise local and CI runs produce no evidence the send path was reached, and the calling UI has no data to render; writing the row keeps the data shape identical across environments and makes the gate observable.

8. **Insert-first protocol, with the row's `cuid` used as Resend's `Idempotency-Key`.** Insert `QUEUED` → call Resend → update to `SENT`/`FAILED` with `providerMessageId`. A single post-send insert was rejected: a crash between the API call and the insert would leave a genuinely-sent email with no record, causing an admin to retry a message the recipient already received. The id-as-idempotency-key falls out for free, since a stable unique per-attempt key is needed anyway.

9. **Never inside the caller's transaction.** An email send must not be able to roll back invite creation, nor hold a transaction open across a network call.

10. **Store `templateId` + `subject` + `toAddress` only. Never rendered HTML, never the raw template props.** Invite emails carry a bearer credential in their props; persisting rendered output or the props bag would write live tokens into a table admins read. If a template later needs a specific prop preserved for display, whitelist that prop explicitly.

11. **`templateId` is a `String` column, not a Prisma enum.** Same dependency-inversion reason as (5): templates live in `shared-mailer` while a Prisma enum lives in the app's schema, so every new template would force a schema migration. The closed union is owned as a TypeScript type in `shared-mailer`, where the templates are. Consistent with `AuditLog.entityType` already being `String`.

12. **`shared-mailer` owns both writes and depends directly on `shared-prisma`.** Decision (8) makes the insert part of the send protocol, so leaving it to callers would make the idempotency guarantee honor-system and force every call site to reimplement insert→send→update. No dependency cycle: `shared-prisma` is a leaf and `report-server` already depends on it. Accepts an **optional client parameter** for tests, matching `auditLog.ts`'s existing idiom.

13. **Asymmetric failure handling for the log writes themselves.** If the **pre-send insert** fails: abort, do not call Resend, surface the failure — sending without a record is the state most worth avoiding. If the **post-send update** fails: the email has already gone out, so log loudly and **return success**; reporting failure would cause a duplicate send on retry. The resulting row stuck at `QUEUED` despite a real send is an orphan that ticket 06's webhook consumer can reconcile via `providerMessageId`.

14. **No pruning, and no global admin email-log page for now.** Resend's free tier retains its own logs only 30 days, so `EmailLog` is the longer-lived record rather than a duplicate; at this volume retention is free, and a pruning job would be the only thing deleting the evidence this exists to keep. Status is surfaced **per-target at the calling site** (the invite's row in `InviteManagement.tsx`) — enough for the retry action, nothing more.

### Resulting shape (indicative, for ticket 02 / implementation)

```prisma
model EmailLog {
  id                String      @id @default(cuid())  // also the Resend Idempotency-Key
  toAddress         String      // canonicalized lowercase/trimmed, as per schema.prisma:92
  templateId        String
  subject           String
  targetType        String?     // e.g. "Invite", "Report"
  targetId          String?
  status            EmailStatus @default(QUEUED)
  providerMessageId String?     // Resend data.id, captured at send time for ticket 06
  errorMessage      String?     // flattened from Resend's {name, statusCode, message}
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@index([targetType, targetId])
  @@index([providerMessageId])
  @@index([toAddress])
  @@index([createdAt])
}

enum EmailStatus {
  QUEUED
  SENT
  FAILED
  SKIPPED
  // written only once ticket 06 lands:
  DELIVERED
  BOUNCED
  COMPLAINED
}
```

**Left to implementation, not decided here:** whether `targetType`/`targetId` are nullable (shown nullable above so an ad-hoc or test send is expressible; every currently-anticipated consumer has a target, so requiring them is defensible if that discipline is wanted).

Feeds [sender abstraction API design](02-sender-abstraction-api-design.md) and [Resend delivery webhooks](06-resend-delivery-webhooks.md).
