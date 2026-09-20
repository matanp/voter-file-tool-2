# 01 - Prototype the split-pane layout (Variant A)

Type: prototype
Status: open
Parent: ../map.md

## Question

Does the split-pane layout (grid left, tabbed detail right, contextual action drawer) hold up at laptop and 375px widths well enough to promote it, or is there real disagreement that justifies building Variants B and C?

Executes plan §4 under its scope guard: build **Variant A only**, read-only, on the existing route behind a development-only `?variant=` parameter, with realistic committee counts, vacancies, incomplete weights, pending submissions, and member names; stub every mutation. Then do a 375px pass. Use the `prototype` skill.

Evaluate with the human, live:

- How quickly a user finds an ED and reads its status.
- Whether roster and vacancy info are readable at normal laptop widths.
- Whether the add-member drawer preserves enough committee context.
- Behavior at 375px, 768px, desktop.

Keyboard navigation is *not* evaluated here (plan defers it to the real shell, ticket 08).

Expected answer: promote Variant A with Variant B's list-to-detail navigation on mobile. Record the decision, link the prototype branch as an asset, and note how the prototype code is removed (see the map's Not yet specified).

## Progress

2026-09-19 — Variant A built, awaiting the live evaluation.

- Code: `apps/frontend/src/app/committees/_prototype/` (`VariantA.tsx`, `AddMemberDrawerStub.tsx`, `mockData.ts`, `PrototypeSwitcher.tsx`, `CommitteesPrototype.tsx`) plus a dev-only branch at the top of `committees/page.tsx`.
- Run: `pnpm --filter voter-file-tool dev`, sign in, open `/committees?variant=A`. The amber pill at the bottom is the switcher (only A exists; `×` exits). Use the header role switcher (`actingPermissions`) to compare Admin vs Leader labels and PII.
- Mock data: 16 towns / 24 LDs / 136 EDs (Rochester multi-LD), seeded, in the real `EdRollup` / `CommitteeDetailResponse` shapes; ~30% of petitioned seats have missing weight, ~1/3 of EDs with vacancies have pending submissions, a few have unassigned members.
- URL state works as plan §6 describes: `committee` (push), `tab`, `town`, `ld` (replace). Below `md` the URL's `committee` param toggles list ↔ detail (Variant B navigation); the drawer is full-width there.
- Everything mutating is a toast: add/submit, replace, remove, resign, edit weights, generate report.
- Not evaluated here: keyboard navigation (ticket 08).

2026-09-19 — Variants B and C built (scope guard overridden by request), all three switchable.

- Code: `VariantB.tsx` (full-width sortable table → full-page detail with breadcrumb, prev/next, preserved filters + scroll on back) and `VariantC.tsx` (metric-card filters, collapsible town/LD groups, inline accordion detail with action bar). Same mock data, tabs, PII gating, URL state (`variant=B` / `variant=C`) and toast-stubbed mutations as A.
- Run: `/committees?variant=A|B|C`; the amber pill and ←/→ keys cycle all three.
- Verified: `tsc --noEmit` and eslint clean on `_prototype/`; each route compiles and serves in dev. Not yet eyeballed in a browser.
