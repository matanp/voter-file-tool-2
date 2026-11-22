# ui-makeover: triage and build order

Triaged 2026-11-21. Part of [ui-makeover](spec.md). The `Blocked by:` lines in the tickets match this plan.

## Decisions

- **Dark mode is dropped.** The `ThemeProvider` in `layout.tsx` is commented out, so the existing `dark:` classes never apply. New tokens are light-only, no new `dark:` classes are added, and dead `dark:` classes and `themeToggle.tsx` are removed when their files are touched.
- **Requests page:** ship 11 now as the interim fix. committees-workspace/22 is a separate, later effort.
- **Focus ring: blue-600 app-wide** (13), so focus stays distinct from green primary buttons and success badges.
- **Still open:** the product name and branding in the app bar (spec open decision 2). 02 ships with a placeholder.

## Statuses

| Status | Tickets |
|---|---|
| `resolved` | 01–04 (phase 1, PRs 190 and 191) |
| `ready-for-agent` | 05–18, 22 (research: cross-link audit) |
| `needs-triage` | 21 (requests from voter search), 23 (root `<main>` extra scroll) |
| `needs-info` | 19 (stakeholder: what is pinnable, Admin pins or not, where the setting lives), 20 (stakeholder: which LTED fields, who sees mismatches) |

## Build order

Steps run top to bottom. Tickets in the same step can run in parallel.

| Step | Tickets | Why here |
|---|---|---|
| 1 | 14, 11, 22 | Standalone overflow fixes and the cross-link audit, with no blockers. Start them any time, even alongside step 2. Finish 22 before step 6, so its findings land in the page tickets. |
| 2 | 01 | The single largest visual change. It sets the tokens that everything else edits. |
| 3 | 04 | Shares `components/ui` and `globals.css` with 01 and 03, so it lands between them to avoid conflicts. |
| 4 | 03 ∥ 02 | 03 is tokens and badges; 02 is header files only. With these in, phase 1 is done. |
| 5 | 05 ∥ 06 | Shared primitives. 05 gates every page ticket, so it is the critical path. |
| 6 | 07 ∥ 09 | The highest-impact pages, in separate areas (reports, record search). |
| 7 | 08 ∥ 10 ∥ 15 | 08 needs 07. 10 needs 06's empty state. 15 needs 02's ☰ sheet. 10 and 15 share the admin count queries. |
| 8 | 16 ∥ 17 ∥ 12 | Admin list views and the record search follow-up. Ship 16 as two PRs (eligibility flags, discrepancies). |
| 9 | 13, then 18 | Medium and low impact. 13 waits for 08 because both edit `ScopedReportForm`. Split 18 into one PR per page group (config forms, import pages, users, terms). |

**Critical path:** 01 → 04 → 03 → 05 → 07 → 08.

**Not scheduled:** 19 (after 10) and 20. Ask 20's questions before 09's Districts section is finished. 21 (requests from voter search) is `needs-triage`; it would follow 09, 05 and committees-workspace/28.

## Blockers added in triage

| Ticket | Now blocked by | Why |
|---|---|---|
| 02 | 01, 04 | Lands after the shared token files settle. |
| 03 | 01, 04 | 01, 04 and 03 all edit `globals.css`, `tailwind.config.ts` and `components/ui`. |
| 04 | 01 | Same files as 01. |
| 10 | + 06 | Its acceptance needs 06's empty state. |
| 13 | + 08 | Both edit `ScopedReportForm` and its mount points. |
| 15 | + 02 | Phone admin links move into 02's ☰ sheet. |
| 18 | + 05 | Uses the compact `PageHeader`. |

## Notes

- **Prototype reference.** The prototype for 01–04 and the rough 07–11 is commit `158e40bd` on the local `proto/ui-makeover` branch (worktree `../vft-ui-proto`), not pushed. Use it as a reference, not a base.
- **Overlapping tickets elsewhere.**
  - record-search-results/03 and /04 are `ready-for-agent`, but 09 replaces their visual parts. Don't build them separately; keep /04's accessibility requirements in 09.
  - reports-polish/01 (failed jobs): read it before 07.
  - accessibility/02 (toast cut off by focus move): fix it in 06 if it is still open.
