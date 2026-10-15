# 15 - Responsive and accessibility verification across the whole workspace

Type: task
Status: open
Blocked by: 10, 11, 12, 14
Parent: ../map.md

## Question

With all tabs and drawer actions in place, verify plan §10 end to end and fix what fails: 375px / 768px / desktop behavior including the full-screen drawer sheet and no horizontal overflow; heading hierarchy (`h1` Committees, `h2` committee context, `h3` tab sections); keyboard path through grid selection, tabs, row action menus, and the drawer; focus trap/restore/Escape; no state conveyed by color alone.

HITL for the manual pass; record what was checked and on what, and link any follow-up fixes. This is the last gate before cutover.

## Comments

**2026-10-15, 15a (agent pass, branch `committees-workspace`):** Plan §10 checklist. "Test" means `apps/frontend/src/__tests__/components/committees/CommitteeWorkspace.a11y.test.tsx` unless another file is named. 15b, the human pass, works from the last column.

| # | Check | How verified | Result | 15b (human) |
|---|---|---|---|---|
| 1 | Exactly one `h1` **Committees** | Test, on every tab | Pass | Screen reader heading list |
| 2 | `h2` is the committee context; tab sections are `h3`; no skipped levels | Test, on all four tabs (outline walk; tested by mutating Roster to `h4`). Drawer: own `h2` title, `h3` step | Pass | Screen reader heading list |
| 3 | Semantic tabs with arrow-key navigation | Test (and `CommitteeWorkspace.test.tsx`) | Pass | Screen reader announces "tab, 1 of 4" |
| 4 | Committee rows keyboard-selectable | Test: Enter on a row selects it (and `CommitteeWorkspace.test.tsx`) | Pass | — |
| 5 | Keyboard path: grid row → Tab into tabs → arrows → Tab to row menu → Enter → ArrowDown/Enter on item → drawer | Test, keyboard only | Pass | Repeat with a real keyboard and check the focus ring is visible at each stop |
| 6 | Drawer traps focus (Tab and Shift+Tab) | Test: 25 presses each way, focus stays inside | Pass | VoiceOver/NVDA virtual cursor can't leave the sheet |
| 7 | Escape closes the drawer and focus returns to the row's trigger | Test (keyboard path), plus Close button test; success paths in `CommitteeWorkspace.drawer.test.tsx` | Pass | — |
| 8 | Focus fallback when the trigger's row is gone | `CommitteeWorkspace.drawer.test.tsx` | Pass | — |
| 9 | Not color alone: grid row (seats filled, pending, missing weight, unassigned), selected row (`aria-current` + left bar), summary, petitioned vacancy, loading (`role=status`), failed detail (`role=alert`) | Test | Pass | Check with a grayscale filter |
| 10 | Not color alone: eligibility warnings and hard stops in the drawer | `CommitteeActionDrawer.test.tsx` (titled text alerts) | Pass | — |
| 11 | No horizontal page overflow at 375 / 768 / 1280 (list, every tab, drawer open) | Screenshots plus `scrollWidth == clientWidth` measured in headless Chromium. This ran against a temporary uncommitted page rendering `CommitteeWorkspace` as Admin, with stubbed APIs (long names and emails, 4 towns, mixed flags), because no signed-in session was available to the agent | Pass at every width | Real phone (iOS Safari plus Android Chrome) on real data |
| 12 | Row action menu reachable on narrow screens | Screenshot plus measurement. **Failed**: at 375 and in the 768 split pane the roster table scrolls sideways inside the tab, and the `⋯` triggers were off-screen. **Fixed** in `1b5bc70` (actions column sticky right), with a regression test | Pass after fix | Confirm on a phone |
| 13 | Drawer is a full-screen sheet below `md` | Screenshot: 375 → 375×800 at x=0. At 768 and 1280 it's a 544px right sheet (`md` = 768, per ticket 08's breakpoint) | Pass | Tablet in portrait: confirm the side sheet at exactly 768 is acceptable |
| 14 | Desktop split ~35–40 / 60–65, collapsible list, sticky header and tabs | Screenshot at 1280 (list 460px, 36%). Collapse toggle in `CommitteeWorkspace.test.tsx` | Pass | Scroll a long roster and confirm header/tabs stay pinned |
| 15 | Mobile list ↔ detail with **Back to committees**, focus to `h2`, back to row | `CommitteeWorkspace.test.tsx`, plus 375 screenshots | Pass | — |
| 16 | Screen reader announcements (live regions, toast, drawer title/description) | Not automatable | — | VoiceOver and NVDA pass |
| 17 | Touch target size and zoom to 200% | Not automatable | — | Manual |

Noted outside workspace scope: at 375 the global app header (`app/components/header.tsx`) scrolls sideways inside itself, so **Reports** and **View Profile** start off-screen. That isn't page overflow, and the header is app-wide, not part of this ticket. 15b decides whether it needs a follow-up.
