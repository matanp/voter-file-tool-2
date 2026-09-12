Type: research
Status: findings

## Question

What does integrating Resend + React Email actually look like for a Next.js/Node monorepo like this one? See [ticket 04](issues/04-research-resend-integration.md).

---

## 1. Node/Next.js SDK: `send()` signature, return shape, error surfacing

Install: `npm install resend`. Initialize once per process:

```ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
```

Send:

```ts
const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'Hello world',
  react: EmailTemplate({ firstName: 'John' }), // or html: '<p>...</p>'
});

if (error) {
  return Response.json({ error }, { status: 500 });
}
return Response.json(data);
```

- `resend.emails.send()` returns a **Promise resolving to a `{ data, error }` result object** — not a thrown exception on API-level failures (network/programmer errors can still throw). Both `data` and `error` are checked explicitly; `error` is truthy only when the send failed.
- **Success shape**: `data` contains the created email's unique id, e.g. `{ "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" }`. This id is what you'd persist for later status lookups / webhook correlation.
- **Error shape**: the underlying HTTP API returns standard HTTP status codes (400s for client errors — validation 422, auth 401/403, not found 404/405, conflict 409; 429 for rate limiting; 500-503 for server errors) plus a JSON error object with three fields: an error **type/name** (e.g. `missing_api_key`), the **status code**, and a human-readable **message**. Each error type in the reference also documents a "suggested action" (retry, verify domain, upgrade plan, etc.). The SDK surfaces this same object as the `error` value in the result — Resend's public docs don't separately document SDK-level throw-vs-return semantics beyond what the code samples show (result-object pattern), so treat the code sample as the source of truth.
- Required request fields: `from`, `to` (string or array, max 50 addresses), `subject`. Optional: `html`, `text` (auto-generated from `html` if omitted), `react` (Node SDK only), `cc`, `bcc`, `reply_to`, `scheduled_at`, `headers`, `attachments`, `tags`, `template` (mutually exclusive with `html`/`text`/`react`).

Sources:
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/send-with-nextjs
- https://resend.com/docs/api-reference/errors

## 2. React Email templates: passed as JSX vs. rendered to HTML first

Both patterns are supported; Resend's Node SDK supports passing JSX directly and doing the HTML conversion for you:

```tsx
import { Resend } from 'resend';
import { Email } from './email';

const resend = new Resend('re_123456789');

await resend.emails.send({
  from: 'you@example.com',
  to: 'user@gmail.com',
  subject: 'hello world',
  react: <Email url="https://example.com" />,
});
```

Per Resend's own docs: "When integrating with other services, you need to convert your React template into HTML before sending. Resend takes care of that for you" — i.e. the `react` field is the primary, no-extra-step pattern for the Node SDK.

The alternative — manual rendering — uses React Email's own `render()` utility (previously `@react-email/render`, now folded into the unified `react-email` package):

```ts
import { render, pretty } from 'react-email';
import { MyTemplate } from './email';

const html = await pretty(await render(<MyTemplate />));
```

You'd reach for manual `render()` when you need the HTML string itself independent of the send call — e.g. to store a copy for an EmailLog/audit record, to preview locally, to generate a plain-text fallback via `toPlainText()` (elements can be excluded from the text version with `data-skip-in-text="true"`), or to hand HTML to a different email provider that doesn't accept JSX. `resend`'s package.json lists `@react-email/render` as an **optional peer dependency** — it's only needed if you use manual rendering rather than the `react` field.

Sources:
- https://react.email/docs/integrations/resend
- https://react.email/docs/utilities/render
- https://resend.com/docs/send-with-nextjs

## 3. Free tier and rate limits

- **Free tier email quota**: 100 emails/day and 3,000 emails/month for transactional email (marketing email is unlimited sends to up to 1,000 contacts/month, a separate quota). Both sent **and received** (inbound) emails count against the quota.
- **Multiple recipients count separately**: To/CC/BCC recipients each count individually against the quota, not per API call.
- **Domains**: free accounts can verify up to 3 custom domains.
- **Sandbox / no-verified-domain restriction**: until a domain is verified, a new account can only send from `onboarding@resend.dev`, and only to the email address used to sign up for the account — this is Resend's default anti-abuse sandbox, not something usable for real sends to other internal users. Once a domain is verified (SPF/DKIM/DMARC DNS records added), you can send from any address at that domain to any recipient.
- **Rate limit**: default **10 requests per second per team**, shared across all API keys on the team/account (not per-key). Responses include IETF-standard headers `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset`, and `retry-after`. Exceeding the limit returns HTTP 429. The limit can be raised for trusted senders by contacting Resend support.
- **Quality gates**: all accounts (including free) must keep bounce rate under 4% and spam-complaint rate under 0.08%, or sending can be paused — relevant even for a small internal tool if addresses go stale.
- **Data retention**: free accounts get 30 days of email log/history retention.
- For this tool's projected volume (invites + report-ready notices to internal admins/Leaders, not bulk mail), the free tier's 100/day, 3,000/month and 10 req/s ceilings are unlikely to bind, but the domain-verification step is mandatory before any send to a real (non-signup) internal user works at all.

Sources:
- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://resend.com/docs/api-reference/rate-limit

## 4. Built-in retry, idempotency, and delivery-status webhooks

- **Idempotency**: the send-email API accepts an `Idempotency-Key` request header to prevent duplicate sends on retried requests. Keys must be unique per logical send, are honored for **24 hours**, and have a max length of 256 characters. This is provided natively by Resend — no custom idempotency layer needed if the caller generates and passes a stable key per logical send attempt.
- **Server-side automatic retry on Resend's end**: not documented as a feature in the primary docs reviewed (send-email reference, errors reference, rate-limit reference) — Resend does not describe itself automatically retrying failed sends on your behalf; a 4xx/5xx/429 is returned to the caller to handle. (The map's decision to not build auto-retry and instead expose a manual "retry" action to the admin is consistent with there being no native auto-retry to lean on — the idempotency key is what makes a manual retry safe to re-issue.)
- **Delivery-status webhooks**: Resend supports webhooks with the following event types relevant to delivery tracking:
  - Email lifecycle: `email.sent` (API request accepted, Resend will attempt delivery), `email.delivered` (delivered to recipient's mail server), `email.delivery_delayed` (transient issue, e.g. full inbox), `email.bounced` (permanently rejected), `email.complained` (delivered but marked as spam), `email.failed` (failed to send — invalid recipient, quota, verification issues), `email.opened`, `email.clicked`, `email.scheduled`, `email.suppressed`, `email.received` (inbound).
  - Also: `domain.*` (created/updated/deleted) and `contact.*` (created/updated/deleted) and `suppression.*` (added/removed) events, not directly relevant here.
  - These webhooks are the natural mechanism for updating a persisted EmailLog record's status asynchronously (e.g. move from "sent" to "delivered" or "bounced") without polling, if/when that's wanted — separate decision from this research.

Sources:
- https://resend.com/docs/api-reference/emails/send-email (Idempotency-Key)
- https://resend.com/docs/webhooks/event-types
- https://resend.com/docs/api-reference/errors

## 5. Recommended package versions

Checked directly against the npm registry (registry.npmjs.org) at time of writing:

- **`resend`**: latest is **6.25.0**. `engines.node: ">=20"`. Lists `@react-email/render` as an **optional** peer dependency (only needed for manual `render()` usage — not required to use the `react` field).
- **`@react-email/components`**: latest published is **1.0.12**, but the package is **deprecated** on npm ("Package no longer supported... all components and rendering utilities unified into the `react-email` package"). Peer dependency: React `^18.0 || ^19.0 || ^19.0.0-rc`.
- **`react-email`** (unified package, replaces `@react-email/components` and all individual `@react-email/*` component packages as of React Email v6.0.0, released April 16, 2026): latest is **6.9.3**. `engines.node: ">=20.0.0"`. Peer dependencies: React `^18.0 || ^19.0 || ^19.0.0-rc`, React DOM `^18.0 || ^19.0 || ^19.0.0-rc`.

**Notable compatibility/notes:**
- Given `@react-email/components` is deprecated, **`react-email` is the package to install**, not `@react-email/components`.
- Both packages require **Node >= 20**.
- React Email's own docs describe `react-email` as "primarily a development and build-time tool" (CLI: `email dev`, `email build`, `email export`; preview server; render utilities) — there's some community discussion (linked from search results, not itself a primary source) about whether pulling the full `react-email` package into a runtime/server bundle is appropriate given it also drags in devtool dependencies (prismjs, marked, tailwindcss) via its main entry (see resend/react-email GitHub issue #3556). Component-only production imports (e.g. `react-email/components` subpath, if offered) vs. importing the whole package for just JSX authoring is worth checking against the current package's exports map at implementation time rather than assuming the top-level import is the lean runtime path.
- React `^18` or `^19` both work; no exclusive React 19 requirement.

Sources:
- https://registry.npmjs.org/resend/latest
- https://registry.npmjs.org/@react-email/components/latest
- https://registry.npmjs.org/react-email/latest
- https://react.email/docs/changelog
- https://github.com/resend/react-email/issues/3556 (community-flagged bundling caveat, not a primary doc claim — verify against current package.json `exports` before relying on it)
