# 10 - Signed-in home as a "today" page

Status: needs-triage

Blocked by: 01, 05

Part of [ui-makeover](../spec.md).

## Problem

`/` is a marketing page shown to people who are already signed in:
- a 48px "Political Campaign Tool / BETA" hero (`HeroSection.tsx`)
- a feature grid with checkmarks
- "Get Started" tiles that repeat the nav (`QuickActions.tsx`)
- a "Secure • Reliable • Professional" footer (`app/page.tsx:36-44`)

It looks the same for a Leader and an Admin. On phones the tiles start about 1,500px down, and nothing about *my* committees, pending items or reports appears.

## Proposal

```
Good evening, <first name>
LD 17 · 12 committees · 5 open seats · 1 pending
[ Find a voter…                           🔍 ]
My committees                              View all ›
 ED 7   ●●●○  3/4   1 pending
 ED 12  ●●○○  2/4
Recent reports                             Reports ›
 Committee roster · Nov 18 · Ready ⬇
```

- A Leader sees their scoped committees, top 5 by open seats, linking into the workspace detail.
- An Admin's scope is countywide, so they get "Needs attention" instead: most-vacant EDs and review-queue count chips.
- Signed-out users get a short hero: name, one sentence, Sign in.
- Remove FeaturesGrid, Footer and the commented-out KeyCapabilities.
- Data must respect Leader scoping. Read `skills/auth-check-patterns/SKILL.md` first.

## Acceptance

- Signed-in users see their own scoped summary above the fold at 375.
- A Leader with no assignments gets a sensible empty state from 06.
- Tests cover Leader vs Admin content.

Evidence: reviews/shell.md §1B.

## Comments

### 2026-11-21

Prototyped on `proto/ui-makeover` and approved in stakeholder review. Follow-up ask: Leaders pick up to three features to pin to this page, changeable in settings. That is [19](19-configurable-home-pins.md); build 10 first with a fixed layout.
