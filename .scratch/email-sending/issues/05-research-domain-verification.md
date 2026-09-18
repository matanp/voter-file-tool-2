Type: research
Status: resolved

## Question

What exactly does verifying `notifications.opensourcepolitics.online` as a Resend sending domain require? Cover:

- The specific DNS record types Resend requires (SPF/TXT, DKIM/CNAME, and whether DMARC is required or just recommended) for a subdomain (not root domain) setup.
- Typical propagation/verification wait time.
- Whether using a subdomain of an already-live site (opensourcepolitics.online) has any gotchas (e.g. needing to check the root domain doesn't already have a conflicting SPF record).
- Step-by-step: what the user will need to do in their DNS host's dashboard, phrased for someone who has never done this before.

Findings feed the [domain/DNS setup task](03-domain-dns-setup.md) — write the output as a checklist that ticket's assignee can follow directly.

## Answer

Full findings + a directly-usable checklist: [research/resend-subdomain-verification.md](../research/resend-subdomain-verification.md).

Summary:

- **Required DNS records (3):** `MX` + `TXT` (SPF) both at `send.notifications.opensourcepolitics.online`, plus `TXT` (DKIM) at `resend._domainkey.notifications.opensourcepolitics.online`. Values (mail server hostname, DKIM public key) are generated per-domain in the Resend dashboard — copy from there, don't reuse examples.
- **DMARC is optional/recommended, not required.** It's a 4th `TXT` record at `_dmarc.notifications.opensourcepolitics.online`, added *after* verification, starting with a monitor-only `p=none` policy.
- **Propagation/verification:** typically verifies within ~15 minutes; worst case up to 72 hours (Resend's own stated ceiling), with a "Restart verification" retry button in the dashboard.
- **Subdomain-of-a-live-site gotchas:** using a subdomain is itself the mitigation — SPF/DKIM/DMARC are evaluated per exact hostname, not inherited from the root domain, so `opensourcepolitics.online`'s existing website/email DNS (A/CNAME, any existing MX/SPF) is untouched and unrelated. The realistic risks are generic DNS hygiene (copy-paste/truncation errors, editing records in the wrong DNS host if DNS management is split from the registrar, DNS hosts that auto-append the domain name to pasted values) — not root-domain conflicts.
- The research file includes a full step-by-step checklist phrased for a DNS/email first-timer, covering finding the authoritative DNS host, adding each record, verifying, and confirming the root domain's own records were never touched.
