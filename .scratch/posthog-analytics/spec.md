# PostHog analytics: findings and follow-up work

Source: PostHog analysis on 2026-11-20 (project 114503, all history, localhost excluded).
People are referred to by role and a short PostHog person id prefix, never by name (public repo).

## What the data shows

- About 15 real signed-in people have used the app since Sep 2025, with 1–6 active in a month. November 2026 is
  the busiest month (6 users, 41 sessions, 526 pageviews).
- One Admin account (person `cad86007…`) is the power user: 59 active days and 108 sessions.
- 426 anonymous "persons" have median session length 0s: bots and sign-in-page bounces. They inflate visitor counts.
- The only events are `$pageview`, `$autocapture`, `$pageleave`, `$rageclick`, `$web_vitals`, `$identify`.
  There are no custom events, so outcomes (report generated, member added, search returned results) can only be
  guessed from button text.
- 121 rage clicks in total. Excluding Developer accounts, they cluster in two places:
  - **Add member wizard** (`/committees`, Nov 2026): 16 from the power-user Admin, plus 1 "Submit candidate" from a
    Leader. Cause: the primary button stays in the same spot through Continue → Continue → Add member, so clicking
    fast in one place confirms. See 01.
  - **Record search, volunteer break-it session** (May 31 – Jun 3 2026): 5 ReadAccess testers and the power-user
    Admin made about 1,300 address searches. The rage clicks were on the house-number input, the chip "×" remove
    button and "See more details". The replays have expired (30-day retention). See 03, 04.
- Session replays capture voter names, addresses and DOBs on screen with no masking. See 06.
- The project's test-account filter only excludes localhost. It does not yet drop `qa_agent` tabs, Developer
  accounts, or `DEV -` identities. See 07.

## Tickets

Rage clicks / break-it testing:
- 01 Add member wizard lets fast clicks skip the review and details steps
- 02 Watch the rage-click replays that are still retained
- 03 Re-check the volunteer record-search rage clicks against current code
- 04 Chip "×" remove buttons are a 16px target
- 05 Playbook for the next volunteer break-it session

Privacy:
- 06 Mask voter PII in session replays
- 13 Narrow replay masking to voter-data areas

PostHog setup and tracking:
- 07 Test-account filter: qa_agent, Developer, DEV identities
- 08 Custom events for core actions
- 09 Capture exceptions and failed actions
- 10 Identity hygiene: reset on sign-out, stop anonymous person profiles
- 11 Upgrade posthog-js
- 12 Usage dashboard
