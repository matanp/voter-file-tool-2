Type: research
Status: open
Blocked by: 03

## Question

Ticket 03's first real send from `notifications.opensourcepolitics.online` passed SPF/DKIM/DMARC and still landed in Gmail spam — expected for a zero-reputation subdomain, but invite emails carry the credential a new admin needs, so "in spam" is the worst place for them. What does this tool need to do, and watch, before and after the first real invite goes out?

Cover, against primary sources (Resend docs, Google/Yahoo sender guidelines, M3AAWG where cited):

- **Warm-up at this volume.** Does a subdomain sending on the order of tens of transactional emails a month need a warm-up schedule at all, or is warm-up only a bulk-sender concern? If it matters, what does the smallest credible ramp look like?
- **Gmail / Yahoo sender requirements (2024+).** Which of the bulk-sender rules (one-click unsubscribe, `List-Unsubscribe` headers, DMARC alignment, complaint thresholds) apply below the 5,000/day threshold, and which are simply irrelevant here. Say explicitly whether transactional invite mail needs an unsubscribe mechanism.
- **Signals to watch in the Resend dashboard**, and the ceilings that pause sending (bounce < 4%, complaint < 0.08% per ticket 04) — with so few sends, a single bounce is a large percentage; what does that mean in practice?
- **Pre-launch seed testing.** A cheap checklist to run before the first real invite: seed addresses at Gmail/Outlook/Yahoo/iCloud, what to inspect in the raw headers (`Authentication-Results`), and whether any free inbox-placement tools are worth one pass.
- **Content-level factors** that plausibly explain the test send's spam placement independent of reputation: HTML-only body (see ticket 02 decision 14 on the reserved `text()` part), link domain vs. sending domain mismatch (invite links point at the app's domain), `no-reply@` local part, subject line shape.
- **DMARC `rua=` reports**: they are already being requested (ticket 03) — what should the user actually look at in them, and is a free aggregator worth wiring up now?

Output: findings under `research/`, plus a short **pre-launch checklist** that the implementation effort can follow before sending the first production invite. This ticket decides nothing about the `shared-mailer` interface (ticket 02 is closed); if a finding argues for building `text()` immediately rather than leaving it reserved, say so as a recommendation.
