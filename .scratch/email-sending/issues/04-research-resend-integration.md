Type: research
Status: resolved

## Question

What does integrating Resend + React Email actually look like for a Next.js/Node monorepo like this one? Cover:

- The Node/Next.js SDK: how `send()` is called, what it returns (success/error shape, message id), and how errors/failures are surfaced (thrown exceptions vs. status codes vs. result objects).
- How React Email templates are rendered and passed to Resend's send call.
- Free tier / rate limits (relevant given this is a low-volume internal tool, not bulk mail).
- Any built-in retry, idempotency-key, or delivery-status-webhook features Resend offers, since the map decided against building custom auto-retry — worth knowing what Resend already gives for free.
- Recommended package versions for `resend` and `react-email`/`@react-email/components`.

Findings feed [sender abstraction API design](02-sender-abstraction-api-design.md).

## Answer

Full findings, with source citations, are in [Resend integration research](../04-resend-integration-research.md). Summary:

- **SDK send call**: `new Resend(apiKey)` then `await resend.emails.send({ from, to, subject, react | html, ... })`. Returns a Promise resolving to a `{ data, error }` result object (not a thrown exception for API-level failures). On success, `data` is `{ id: "<uuid>" }` — a message id you can persist for later correlation/status lookups. On failure, `error` carries an error type/name, HTTP status code, and human-readable message; the underlying HTTP API uses standard status codes (401/403 auth, 404/405, 409, 422 validation, 429 rate limit, 5xx).
- **React Email + Resend**: pass the JSX element directly via the `react` field (e.g. `react: <Email url="..." />`) — Resend converts it to HTML for you, no manual step needed. A manual-render path also exists (`render()`/`pretty()` from the `react-email` package, previously `@react-email/render`) for cases where you need the HTML string itself (e.g. storing a copy for EmailLog, generating a plain-text fallback, or targeting a different provider). `resend` lists `@react-email/render` only as an *optional* peer dependency.
- **Free tier / limits**: 100 emails/day, 3,000/month (sent + received both count; multiple To/CC/BCC recipients each count separately); up to 3 verified domains free. Rate limit is 10 requests/second per team (not per key), with standard `ratelimit-*`/`retry-after` headers and 429 on excess; raisable on request. Before a domain is verified, sends are sandboxed to `onboarding@resend.dev` → only the signup email address — a verified sending domain is required before this can send to real internal users. Bounce/complaint-rate quality gates apply even to low-volume senders.
- **Native retry/idempotency/webhooks**: Resend supports an `Idempotency-Key` request header (unique key, honored 24h) to make retried send requests safe to repeat — this is what makes a manual "retry" action safe, since Resend does not document any automatic server-side retry of failed sends on its own. Resend also offers delivery-status webhooks: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.opened`, `email.clicked`, plus domain/contact/suppression events — usable to update a persisted EmailLog asynchronously without polling.
- **Versions**: `resend` latest is 6.25.0 (Node >=20). `@react-email/components` (1.0.12) is **deprecated** — components and rendering are now unified into the single `react-email` package (latest 6.9.3, Node >=20, React ^18 or ^19), which is what should be installed instead.
