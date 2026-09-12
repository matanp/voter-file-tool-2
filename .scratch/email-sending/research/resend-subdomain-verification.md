# Research: Verifying `notifications.opensourcepolitics.online` as a Resend sending domain

Feeds: [ticket 05](../issues/05-research-domain-verification.md) → [ticket 03 (domain/DNS setup)](../issues/03-domain-dns-setup.md).

Primary sources: Resend's own docs (fetched 2026-08-29 via `resend.com/docs/*.md` — Resend serves Markdown source for its docs pages at that path). URLs cited inline per claim.

## Summary

Verifying a Resend sending domain — subdomain or root — requires adding **3 DNS records** Resend generates for you (MX, TXT/SPF, TXT/DKIM) plus an **optional** 4th (TXT/DMARC). A subdomain like `notifications.opensourcepolitics.online` is Resend's own recommended pattern specifically because it **cannot conflict** with any existing records on the root domain `opensourcepolitics.online` — the two are verified and DNS-scoped independently. Verification is usually fast (~15 min) but can take up to 72 hours.

## The DNS records, exactly

Resend's dashboard generates these when you click "Add Domain" and enter `notifications.opensourcepolitics.online`. All three are **required**; values below are the pattern — the real values (mail server hostname, DKIM public key) are unique per domain and only shown in your own Resend dashboard, so copy them from there, don't reuse examples.

| # | Purpose | Type | Name/Host (relative to the subdomain) | Value pattern | Required? |
|---|---------|------|----------------------------------------|----------------|-----------|
| 1 | Return-path / SPF sending source | `MX` | `send.notifications.opensourcepolitics.online` (Resend shows this as host `send`, relative to the subdomain you're adding) | mail server hostname Resend gives you, e.g. `feedback-smtp.<region>.amazonses.com`, priority `10` | Yes |
| 2 | SPF | `TXT` | same host as the MX record: `send.notifications.opensourcepolitics.online` | `v=spf1 include:amazonses.com ~all` (exact string from dashboard) | Yes |
| 3 | DKIM | `TXT` | `resend._domainkey.notifications.opensourcepolitics.online` | `p=<long public key value from dashboard>` | Yes |
| 4 | DMARC | `TXT` | `_dmarc.notifications.opensourcepolitics.online` | e.g. `v=DMARC1; p=none; rua=mailto:<you>@opensourcepolitics.online;` | **No — optional/recommended**, added *after* the domain is already verified |

Sources:
- Record types/purpose and "required" framing: https://resend.com/docs/add-a-domain.md ("DKIM and SPF configurations (TXT and MX records)... These records must match exactly what Resend generated.")
- Exact example record table (type/name/value/priority) for a DNS host UI: https://resend.com/docs/knowledge-base/cloudflare.md
- Default `send` subdomain for the MX/return-path record, and that it's customizable via `custom_return_path`: https://resend.com/docs/dashboard/domains/custom-return-path.md
- DMARC is optional and recommended only after SPF/DKIM (i.e., after verification), with exact record host `_dmarc.<domain>` and staged-rollout policy advice (`p=none` → `p=quarantine` → `p=reject`): https://resend.com/docs/dashboard/domains/dmarc.md

**Note on DMARC:** Resend does not require it for the domain to show as "Verified." It's a separate, later hardening step, and Resend explicitly recommends starting with `p=none` (monitor-only, doesn't affect delivery) rather than jumping to an enforcing policy, to avoid accidentally blocking legitimate mail while still learning your sending patterns.

## Propagation / verification wait time

- Resend states domains **"often verify within 15 minutes"** of the records being added.
- DNS changes can take **up to 72 hours** to propagate globally, though this is the tail case, not the typical one.
- If a domain is still unverified after 72 hours, Resend's dashboard has a "Restart verification" button to retry the check.
- Source: https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying.md

## Subdomain-of-a-live-site gotchas

The good news first: **using a subdomain specifically avoids the most common conflict class.** Resend's own guidance for this exact situation (an existing domain with its own email/website already live) is to put the MX (and by extension the SPF/DKIM) records on a subdomain precisely because that subdomain's MX record "won't conflict... because the MX record is for `send.example.com`, not `example.com`." The root domain's existing MX/SPF records for `opensourcepolitics.online` (e.g. Google Workspace, whatever mail provider runs `@opensourcepolitics.online` today) are untouched — Resend's records live under `notifications.opensourcepolitics.online` and `send.notifications.opensourcepolitics.online`, separate DNS names entirely.
Source: https://resend.com/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records.md

Things that *can* still go wrong, per Resend's own troubleshooting doc — worth checking before starting:

1. **SPF is a single-record-per-name protocol.** If `notifications.opensourcepolitics.online` (or specifically `send.notifications.opensourcepolitics.online`) *already* has a TXT record starting with `v=spf1...` from something else, you cannot have two — they must be merged into one record with all `include:` mechanisms combined. This is unlikely for a brand-new subdomain that's never sent mail, but worth a 30-second check first (see checklist below). Note this is scoped to that exact subdomain name, not the root domain — an SPF record on `opensourcepolitics.online` itself has **no effect** on `notifications.opensourcepolitics.online`, since SPF/DKIM/DMARC are all evaluated per-exact-hostname, not inherited by subdomains. (General SPF/DNS behavior, corroborated by Resend's blog: "policies on the root/apex domain are not applied to subdomains" — https://resend.com/blog/email-authentication-a-developers-guide)
2. **DNS provider auto-appending the domain name.** Some DNS dashboards (noted for MX records especially) silently append your zone's domain to whatever host/value you paste, turning e.g. `feedback-smtp.us-east-1.amazonses.com` into `feedback-smtp.us-east-1.amazonses.com.opensourcepolitics.online`. Fix is either a trailing `.` on the value (marks it "fully qualified") or checking the specific DNS host's own convention.
3. **Split DNS management.** If `opensourcepolitics.online`'s DNS is managed somewhere other than where you assume (e.g. nameservers point to Cloudflare even though the registrar is elsewhere), records added in the wrong dashboard silently do nothing. Confirm the authoritative DNS host first (see checklist).
4. **Copy-paste errors in the DKIM value** (extra quotes/spaces, truncation, or accidentally pasting SPF's value into the DKIM record) are called out as the single most common failure mode.
5. **Proxy/CDN-style DNS hosts (e.g. Cloudflare):** for the DKIM `TXT` record specifically, Cloudflare's own guide notes to leave the record as "DNS only" (not proxied) — proxying is an option on `A`/`CNAME` records, not TXT/MX, but it's a category of setting worth double-checking if the DNS host is one with a proxy toggle.
   Source: https://resend.com/docs/knowledge-base/cloudflare.md

Given this project's root domain `opensourcepolitics.online` is a live site (has *some* existing DNS: A/CNAME for the website, presumably MX for `@opensourcepolitics.online` email), the practical takeaway is: **you don't need to touch or worry about any of that.** All 3(+1) Resend records live under the `notifications` subdomain name, which almost certainly has no prior DNS records at all (subdomains don't exist in a zone until something creates a record for them). The one thing actually worth a quick look before starting is whether the subdomain name `notifications` is already used for something else (e.g. a CNAME for a SaaS tool) — if so, pick a different subdomain rather than fight a conflict.

## Step-by-step checklist (for someone who has never done this)

Do this after signing up for Resend and generating an API key isn't needed yet — domain verification happens first, independent of API keys.

- [ ] **1. Find out where your domain's DNS is actually managed.** "DNS" is a separate thing from where the *website* is hosted or where the domain was *bought* — they're sometimes different companies. To find the right one: look up `opensourcepolitics.online` on https://whatsmydns.net or ask whoever set up the website/email originally which company manages DNS (common ones: GoDaddy, Namecheap, Cloudflare, Google Domains/Squarespace, Route53/AWS, the web host itself). You'll need login access to that account, not just the website's CMS.
- [ ] **2. In Resend's dashboard**, go to **Domains → Add Domain**, and enter `notifications.opensourcepolitics.online` (the subdomain — not the root `opensourcepolitics.online`). Pick the region closest to your users if asked.
- [ ] **3. Resend will show you a table of DNS records to add** — there will be 3 rows: one `MX`, two `TXT` (SPF and DKIM). Keep this dashboard tab open; you'll copy from it.
- [ ] **4. Log into your DNS host's dashboard** (from step 1) and find the DNS management / "DNS records" / "Zone editor" section for `opensourcepolitics.online`.
- [ ] **5. Add each of the 3 records exactly as shown by Resend:**
  - For the **Name/Host field**: most DNS dashboards want just the subdomain part relative to your root domain, i.e. enter `send.notifications` (not the full `send.notifications.opensourcepolitics.online` — the dashboard appends the root domain automatically). Some hosts want the full name instead — if Resend's exact value doesn't seem to "fit," check that host's documentation link from Resend's list (Resend has written guides for Cloudflare, GoDaddy, Namecheap, Route53, Vercel, Gandi, Hostinger, IONOS, and Porkbun specifically — worth checking if your host is on that list: https://resend.com/docs/knowledge-base/cloudflare.md and neighboring pages).
  - **Copy-paste, don't retype**, especially the long DKIM value — a single missing character breaks verification.
  - For the MX record, set **Priority to 10** (or whatever Resend's dashboard specifies).
  - Leave TTL at its default/"Auto" setting.
  - Save/add each record.
- [ ] **6. Go back to Resend's dashboard and click "Verify" (or wait — some setups auto-check).** Expect success within about 15 minutes; don't panic if it takes longer, DNS can take up to 72 hours in rare cases.
- [ ] **7. If it doesn't verify after 15–30 minutes**, double check: (a) records were saved with no typos/truncation, (b) they were added in the DNS host that's actually authoritative for the domain (step 1), (c) your DNS host didn't silently auto-append the domain name to a value that already included it. Resend's dashboard has a "Restart verification" button to retry the check without re-adding anything.
- [ ] **8. Once verified**, you're done with the required setup. Optionally, as a later hardening step (not blocking, not urgent): add a 4th TXT record at `_dmarc.notifications.opensourcepolitics.online` with value `v=DMARC1; p=none; rua=mailto:<an-address-you-control>@opensourcepolitics.online;` to start monitoring DMARC reports before eventually tightening the policy.
- [ ] **9. Confirm the root domain wasn't touched.** None of the above should have required editing any existing record for `opensourcepolitics.online` itself (its website's A/CNAME record, its own email MX records if any) — if a step above prompted you to edit or delete an existing record rather than add a new one, stop and re-check you're on the `notifications` subdomain records, not the root domain's.

## Answer to the three specific sub-questions

1. **Record types required:** MX (1) + TXT/SPF (1) + TXT/DKIM (1) = 3 required records, all generated per-domain by Resend's dashboard. DMARC (TXT) is a 4th, optional/recommended record, added after verification.
2. **Propagation/verification wait:** typically ~15 minutes; worst case up to 72 hours per Resend's own docs.
3. **Subdomain-of-a-live-site gotchas:** using a subdomain is exactly what avoids conflicts — the root domain's existing SPF/MX records are untouched and unrelated, because SPF/DKIM/DMARC are evaluated per exact hostname, not inherited down from the root. Realistic risks are generic DNS-hygiene issues (copy-paste errors, wrong DNS host, auto-appended domain suffixes), not root-domain conflicts.
