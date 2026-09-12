Type: grilling
Status: in-progress

## Question

What should the public interface of `packages/shared-mailer` look like? This is the shared sender abstraction both `apps/frontend` and `apps/report-server` will import.

Resolve:
- The send function's signature (recipient, template identifier/type, template props, and what it returns — success/failure shape, an id usable for retry lookups, etc.).
- How React Email templates are registered/passed in (co-located in the package vs. defined per-consumer app and passed in).
- How the env-var dev/test gate (no-op when unsent/misconfigured, per the map's Decisions-so-far) is expressed in the interface — e.g. does `send()` silently no-op and still write a log record marked "skipped," or throw/return a distinct status?
- How this interface surfaces what [EmailLog vs audit log](01-email-log-vs-audit-log.md) decided to persist, so a caller (e.g. `InviteManagement.tsx`) has what it needs to render a manual retry action.
- **Unblocked.** Both prerequisites are resolved: ticket 01 settled what gets persisted and the send protocol (`EmailLog`, one row per attempt, insert-first with the row id as Resend's `Idempotency-Key`, `shared-mailer` owning the writes via `shared-prisma`, `SKIPPED` rows for the env gate, asymmetric failure handling, no HTML/props persisted), and ticket 04 established the real Resend SDK surface (`{data, error}` result object, `data.id`, JSX via the `react` field). Design the interface against those, not against guesses.

## Decisions so far

Reached by grilling; rounds 1-4 are settled, round 5 (Q16-Q18) was posed but not answered.

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

### Resulting shape (indicative)

```ts
// packages/shared-mailer
export function createMailer(config: MailerConfig): Mailer;

type Mailer = {
  send<T extends TemplateId>(args: {
    to: string;                            // canonicalized + validated in-package (3)
    template: T;
    props: PropsOf<T>;                     // inferred from the registry (11)
    target: { type: string; id: string };  // required (8)
  }): Promise<SendResult>;                 // throws only if the pre-send insert fails (2)

  getLatestStatuses(args: {
    targetType: string;
    targetIds: string[];
  }): Promise<Map<string, EmailLogSummary>>;  // batch (9)
};
```

`subject` never appears in the signature — it comes from `registry[template].subject(props)`.

### Still open

- **Q16 — suppression guard.** Should `send()` refuse to send to an address with a prior `BOUNCED`/`COMPLAINED` `EmailLog` row, writing a `SKIPPED` row with reason `SUPPRESSED`? Recommendation was **yes, build it now**: one indexed query on the already-indexed `toAddress`; it is the direct counterweight to retry-as-call-site-resend (item 10), since an admin who typos an address and retries four times produces four hard bounces from a subdomain with no reputation; and building it now means ticket 06 turns protection on automatically rather than requiring a coordinated second change. Inert until ticket 06 writes those statuses. Relying on Resend's own suppression list alone was judged insufficient — you would still be attempting, with no local record of why nothing arrived.
- **Q17 — `replyTo` and `From` display name.** Recommendation: keep `replyTo` out of `send()`'s arguments (preserving item 3's constraint) but add it to `createMailer` config so every message carries one, and bake a display name into the `from` config value (`"Open Source Politics <notifications@notifications.opensourcepolitics.online>"`). **Blocked on a question for the user:** is there an address that will actually be monitored for replies? An unmonitored `replyTo` is worse than none.
- **Q18 — where the remaining deliverability work lives.** Proposed split: DMARC moves into ticket 03 and should be treated as **required, not optional** (`p=none` with `rua=`) — ticket 05 called it optional, but it is the only way to see whether mail is authenticating before it starts failing; ticket 06 unchanged but now load-bearing for Q16; and a **new research ticket** (in the mold of 04/05) covering bounce/complaint rates to watch in the Resend dashboard, pre-launch seed testing before the first real invite, whether Gmail/Yahoo bulk-sender rules bind at this volume, and subdomain warm-up. Not yet created — awaiting the go-ahead.
- **Bookkeeping:** whether `getLatestStatuses` hangs off the mailer instance or is a standalone export, since it needs only `prisma` and not the API key.

### Context established while grilling

- `@voter-file-tool/shared-prisma` exports the `PrismaClient` **class, not an instance** (`packages/shared-prisma/src/index.ts`), which is why item 4 is a factory.
- `apps/report-server` already depends on `react`/`react-dom` 18.3.1; `apps/frontend` is on 19.1.1. React Email supports `^18 || ^19`, so co-location is viable via a **peer** dependency.
- `shared-prisma` is a compiled `tsc` package emitting to `dist/`; co-locating templates adds JSX compilation to a package build that has none today.
- `createInviteSchema` (`apps/frontend/src/app/api/admin/invites/route.ts`) already carries `customMessage`, which is the precedent for the admin-authored subject in item 5.
