Type: grilling
Status: resolved

## Question

What should the public interface of `packages/shared-mailer` look like? This is the shared sender abstraction both `apps/frontend` and `apps/report-server` will import.

Resolve:
- The send function's signature (recipient, template identifier/type, template props, and what it returns — success/failure shape, an id usable for retry lookups, etc.).
- How React Email templates are registered/passed in (co-located in the package vs. defined per-consumer app and passed in).
- How the env-var dev/test gate (no-op when unsent/misconfigured, per the map's Decisions-so-far) is expressed in the interface — e.g. does `send()` silently no-op and still write a log record marked "skipped," or throw/return a distinct status?
- How this interface surfaces what [EmailLog vs audit log](01-email-log-vs-audit-log.md) decided to persist, so a caller (e.g. `InviteManagement.tsx`) has what it needs to render a manual retry action.
- **Unblocked.** Both prerequisites are resolved: ticket 01 settled what gets persisted and the send protocol (`EmailLog`, one row per attempt, insert-first with the row id as Resend's `Idempotency-Key`, `shared-mailer` owning the writes via `shared-prisma`, `SKIPPED` rows for the env gate, asymmetric failure handling, no HTML/props persisted), and ticket 04 established the real Resend SDK surface (`{data, error}` result object, `data.id`, JSX via the `react` field). Design the interface against those, not against guesses.

## Decisions so far

Reached by grilling over five rounds (2026-09-12); all settled.

### Settled

1. **Templates are co-located in `shared-mailer` as a closed, typed union** (Q1a). `send()` takes `{ template, props }` where `props` is inferred per-template, rather than accepting caller-supplied JSX. Chosen because it is the only shape where the persisted `templateId` and the thing actually rendered cannot drift apart, and the only one where "never persist the props" (ticket 01, decision 10) is enforceable by the package instead of by caller discipline. Accepted costs: the package gains a JSX build step and a `react` **peer** dependency (peer, not direct — `apps/frontend` is on React 19.1.1 and `apps/report-server` on 18.3.1), and a template change forces a package rebuild for both apps.

2. **`send()` returns a result object; it throws only when the pre-send insert fails** (Q2b).

   ```ts
   type SendResult =
     | { status: "SENT";    emailLogId: string; providerMessageId: string }
     | { status: "SKIPPED"; emailLogId: string; reason: SkipReason }
     | { status: "FAILED";  emailLogId: string; error: { message: string; name?: string; statusCode?: number } };
   ```

   This buys the invariant **if `send()` returned, an `EmailLog` row exists and `emailLogId` is non-null** — exactly what the retry UI needs, with no null-check branch at any call site. The pre-send insert failure is the one state where that invariant cannot hold and is an infrastructure fault rather than an email outcome, so it throws (satisfying ticket 01, decision 13's "abort and surface"). Callers must not read "no throw" as "delivered": `FAILED` is a returned value.

3. **Single recipient; sender owned by the package** (Q3). `to: string` only — no arrays, no cc/bcc. `EmailLog.toAddress` is one column, so multi-recipient sends would silently lose recipients from the record; the free tier counts each recipient separately; and only internal users are ever recipients. `from` comes from package config, not a caller argument, so no call site can send from an unverified domain. The package **re-canonicalizes `to` itself** (lowercase/trim via `canonicalEmailSchema` in `shared-validators`) rather than trusting the caller.

4. **Construction is a factory, not a module-level singleton** (Q4a). `createMailer({ prisma, apiKey, from, enabled, ... })`, with each app building one in its own `lib/mailer.ts`. `auditLog.ts`'s idiom cannot be copied: `@voter-file-tool/shared-prisma` exports the `PrismaClient` **class, not an instance**, so there is no shared singleton to default to, and a package that constructed its own client would open a second connection pool per app. The factory also makes the env gate a construction-time value rather than a `process.env` read per send.

5. **The template owns the subject; there is no `subject` argument on `send()`** (Q5/Q10ii). Each template module exports `subject(props) => string` alongside its component. An admin-authored subject (the motivation for wanting an override — parallel to the existing `customMessage` on `createInviteSchema`) arrives **as a prop**, not as a second channel, so subject and body draw from the same validated input. `EmailLog.subject` always stores the **resolved** subject.

6. **Subject input is sanitized inside `shared-mailer`** — strip CR/LF, cap length — because it now originates from an admin form and a newline in a subject is header injection. Placed in the package rather than the invite route's Zod schema for the same reason `to` is canonicalized there (item 3): the package is the last line before the wire and should not trust any caller. Note the repo has no existing precedent for this; `customMessage` only ever lands in a body today.

7. **The gate distinguishes two skip reasons** (Q6b): `SkipReason = "DISABLED" | "NOT_CONFIGURED"` (plus `"SUPPRESSED"` if Q16 lands). These are opposite bugs — `DISABLED` in local dev is working as intended and should be quiet, while `NOT_CONFIGURED` in production means invites are silently not arriving and should `console.error` loudly on every send while still writing the row. The reason string is persisted in **`errorMessage`** (unambiguous, since `status` is already `SKIPPED`); no new column. `createMailer` does **not** throw at construction when `enabled: true` with no API key — a boot-time throw would take the whole frontend down over email config.

8. **`target` is required in the signature**, as a single `{ type, id }` object so neither half can be passed alone (Q7). Ticket 01 left this open. A row without a target is a row the retry UI can never surface — an invisible failed email. The **column stays nullable** for future backfill or ad-hoc sends; the interface simply does not mint orphans today.

9. **The package exposes a batch status query** (Q8c): `getLatestStatuses({ targetType, targetIds }) => Map<targetId, EmailLogSummary>`. `InviteManagement.tsx` renders a list, so a single-target helper is an N+1 waiting to happen; and "latest attempt per target" is exactly the non-obvious query that ticket 01's one-row-per-attempt decision created, so each call site reinventing it means one of them shows a stale `FAILED` after a successful retry. Returns a narrow summary (`{ status, createdAt, emailLogId, errorMessage }`), not the raw row.

10. **Retry is a call-site concern; `shared-mailer` exposes no retry function** (Q9a). Props are never persisted (ticket 01, decision 10), so a package-level `retry(emailLogId)` is impossible without storing invite bearer tokens in a table admins read. The admin retry endpoint re-reads the `Invite`, rebuilds the props, and calls `send()` again — new row, new id, new idempotency key. Consequence worth stating: the `Idempotency-Key` protects against **double-submitting the same attempt** (double-clicked button, retried HTTP request), **not** against an admin sending an invite twice. A guard against the latter, if ever wanted, belongs at the call site.

11. **The template union is mechanized as one central registry** (Q11a): `{ invite: { subject, Component }, ... } as const satisfies TemplateRegistry`, with `TemplateId = keyof typeof registry` and props inferred from each component's prop type. One file to read to know every template that exists; props inferred rather than restated, so they cannot drift from the component; `templateId` literally *is* a registry key, making ticket 01's decision 11 true by construction. Registry and components are also **exported via a secondary entry point** (`@voter-file-tool/shared-mailer/templates`) for react-email previews and render assertions in tests, so importing the mailer does not drag templates into bundles that do not need them.

12. **The Resend call is injected as one optional config field typed as the exact shape of `resend.emails.send`** (Q12c, minimal form) — no adapter, no transport interface, no indirection layer; it defaults to `new Resend(apiKey).emails.send`. Same seam as `auditLog.ts`'s optional `client`, so it adds no new concept. This leaves exactly one untested line (the default-wiring expression, which has no branching), while everything with real logic — insert → send → update, the asymmetric failure handling, the caught network exception — is directly exercisable. Module-mocking `resend` leaves zero untested lines but adds mock-hoisting plumbing for no other gain. Note the transport signature must accommodate Resend's second options argument, where `idempotencyKey` is passed.

13. **Failures flatten to a composite string, and expose structure to the caller** (Q13). `EmailLog.errorMessage` gets e.g. `"validation_error (422): The 'to' field must be a valid email"` rather than the bare message, so the retry UI can distinguish "bad address, fix it" from "rate limited, just retry". The `FAILED` variant carries `{ message, name, statusCode }` structured, so a call site could branch on `statusCode === 429` later. **Network/transport exceptions** (Resend unreachable — a thrown error, not an `{error}` result) are caught and become a `FAILED` row too, or the invariant in item 2 would hold for API errors but not for a DNS blip.

14. **The template contract gains an optional `text(props) => string`** (Q14b), unused at first. HTML-only mail is a mild but real spam-filter signal, and this is a brand-new sending subdomain with no reputation delivering credential-bearing invites — the category where landing in spam costs most. Auto-generating text from rendered HTML was rejected (mangled output, plus `render()` plumbing the package otherwise does not need). Costs one line in the registry type now and lets a hand-written text part be added later without touching `send()`.

15. **Callers always `await`; the package exposes only the one async function** (Q15a). Ticket 01's decision 9 already keeps the send out of the caller's transaction, which removes the reason to fear the latency; this is an admin action, not a hot path; and fire-and-forget in a Next.js route handler is genuinely unsafe (the function can be frozen after the response). Concretely: the invite route awaits `send()` and includes the resulting status in its JSON, so `InviteManagement.tsx` can render "invited, email failed — retry" immediately rather than waiting for a refetch.

### Settled in round 5 (2026-09-12)

16. **Suppression is an ordered list of guards with a tri-state verdict** (Q16). `createMailer({ guards?: SendGuard[] })`, defaulting to `[bouncedOrComplainedGuard]`.

    ```ts
    type GuardVerdict = "allow" | { reason: string } | null;  // null = no opinion
    type SendGuard = (ctx: {
      to: string;                       // post-canonicalization
      template: TemplateId;
      target: { type: string; id: string };
      prisma: PrismaClient;
    }) => Promise<GuardVerdict>;
    ```

    Guards run in order; the **first non-`null` verdict is final**, so ordering is semantically load-bearing (an `"allow"` guard placed after a deny guard is dead code) — document this on the type. `"allow"` exists so a later allow-list can short-circuit the derived bounce check, and so a per-template rule ("this address may receive admin mail but nothing else") is just a guard that reads `ctx.template`. Neither is built now. The default guard is **derived from `EmailLog`** — any row with `toAddress = to AND status IN (BOUNCED, COMPLAINED)` — so it needs no schema and is inert until ticket 06 writes those statuses. An explicit `EmailSuppression` table (allow/deny rows, `source: WEBHOOK | MANUAL`) is the anticipated shape for un-suppression when it is actually needed; it slots in as a guard ahead of the default, not as a change to `send()`. Rejected: separate `allowGuards`/`denyGuards` arrays, because that pre-decides a precedence (does `COMPLAINED` beat an allow-row?) better left to list order.

17. **One `SUPPRESSED` skip reason, detail in `errorMessage`** (Q16c). `SkipReason = "DISABLED" | "NOT_CONFIGURED" | "SUPPRESSED"`; the guard's `reason` string lands in `errorMessage` (e.g. `"SUPPRESSED: prior BOUNCED on 2026-09-10 (emailLog …)"`). The `SendResult` union and retry UI do not grow a case per guard — the UI action is the same for all of them. Same pattern as item 7.

18. **No bypass flag on `send()`** (Q16d). Consequence accepted: under the derived default there is no way to send to a suppressed address short of DB surgery. The trigger for adding the suppression table (item 16) is precisely the first time un-suppression is needed — a reviewable allow-row beats a per-call checkbox that can fire hard bounces at a zero-reputation subdomain.

19. **Pipeline order** (Q16e): canonicalize `to` → env gate (`DISABLED`/`NOT_CONFIGURED`, no DB hit) → guards (DB hit) → insert `QUEUED` → Resend → update. A skip at either gate inserts the row **directly as `SKIPPED`** (no `QUEUED`→`SKIPPED` transition). A guard that **throws** (DB unreachable) throws out of `send()`, like the pre-send insert failing (item 2) — never fall through to sending. Consequence: local dev with `enabled: false` never produces `SUPPRESSED` rows, which is fine since a local DB has no bounces.

20. **No `replyTo` for now** (Q17). There is no monitored mailbox; an unmonitored `replyTo` is worse than none. When one exists it is added to `createMailer` config (not to `send()`), preserving item 3. Inbound mail is already noted in the map's Not yet specified.

21. **`From` is a package constant: `"Open Source Politics <no-reply@notifications.opensourcepolitics.online>"`** (Q17b), exported from `shared-mailer` so `apps/frontend` and `apps/report-server` cannot drift. `no-reply@` states honestly that replies are unread (see item 20).

22. **Registry entries reserve `displayName?: string`; the address is never overridable** (Q17c). Same move as item 14's `text?` — one line now so a second friendly name ("Report Server <no-reply@…>") is a template change later. Precedence: template `displayName` if set, else the constant's. A full per-template `from` was rejected because it reopens the unverified-sender risk item 3 closed.

23. **Remaining deliverability work** (Q18): DMARC (`p=none`, `rua=`) is already live per ticket 03's resolution, so that half collapses. A new research ticket [07](07-research-deliverability-warmup.md) covers subdomain warm-up, bounce/complaint rates to watch, pre-launch seed testing, and whether Gmail/Yahoo bulk-sender rules bind at this volume — motivated by ticket 03's test send landing in Gmail spam.

24. **`getLatestStatuses` is a standalone export, not a mailer method** (Q4b): `getLatestStatuses({ prisma, targetType, targetIds })`, mirroring `auditLog.ts`'s take-a-client idiom. `Mailer` is just `{ send }`, which is honest about what actually needs the API key; a read-only site (server component / GET route) never constructs a mailer. Rejected: exposing both, as two ways to do one thing.

### Resulting shape

```ts
// packages/shared-mailer
export const DEFAULT_FROM =
  "Open Source Politics <no-reply@notifications.opensourcepolitics.online>";

export function createMailer(config: {
  prisma: PrismaClient;
  apiKey?: string;
  from?: string;                        // defaults to DEFAULT_FROM (21)
  enabled: boolean;                     // env gate (7)
  guards?: SendGuard[];                 // defaults to [bouncedOrComplainedGuard] (16)
  sendEmail?: typeof Resend.prototype.emails.send;  // test seam (12)
}): Mailer;

type Mailer = {
  send<T extends TemplateId>(args: {
    to: string;                          // canonicalized + validated in-package (3)
    template: T;
    props: PropsOf<T>;                   // inferred from the registry (11)
    target: { type: string; id: string }; // required (8)
  }): Promise<SendResult>;               // throws only if a guard or the pre-send insert throws (2, 19)
};

export function getLatestStatuses(args: {
  prisma: PrismaClient;
  targetType: string;
  targetIds: string[];
}): Promise<Map<string, EmailLogSummary>>;   // standalone, batch (9, 24)

export const bouncedOrComplainedGuard: SendGuard;

// registry entry
type TemplateEntry<P> = {
  Component: (props: P) => JSX.Element;
  subject: (props: P) => string;
  text?: (props: P) => string;          // reserved (14)
  displayName?: string;                 // reserved (22)
};
```

`subject`, `from`, `replyTo`, and any bypass never appear on `send()`.

### Context established while grilling

- `@voter-file-tool/shared-prisma` exports the `PrismaClient` **class, not an instance** (`packages/shared-prisma/src/index.ts`), which is why item 4 is a factory.
- `apps/report-server` already depends on `react`/`react-dom` 18.3.1; `apps/frontend` is on 19.1.1. React Email supports `^18 || ^19`, so co-location is viable via a **peer** dependency.
- `shared-prisma` is a compiled `tsc` package emitting to `dist/`; co-locating templates adds JSX compilation to a package build that has none today.
- `createInviteSchema` (`apps/frontend/src/app/api/admin/invites/route.ts`) already carries `customMessage`, which is the precedent for the admin-authored subject in item 5.

## Answer

Interface settled; see the 24 numbered decisions above and the **Resulting shape**. Nothing in this ticket remains open. Anticipated-but-unbuilt (recorded so implementation does not accidentally foreclose them): an `EmailSuppression` allow/deny table as a guard ahead of the default; per-template allow guards; `replyTo` in config once a monitored mailbox exists; per-template `displayName` use.
