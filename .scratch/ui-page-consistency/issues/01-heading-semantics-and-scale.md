# 01 - Fix heading semantics and unify the page-title scale

Status: ready-for-agent

Covers findings 3, 4, and 2 from the UI consistency review. These are grouped
because they all touch the same thing — how a page-level heading is expressed —
and fixing them separately would mean editing the same lines twice.

## Problem

### a. A `<label>` is being used as a section heading (real a11y defect)

`apps/frontend/src/app/committees/CommitteeSelector.tsx:782`:

```tsx
<label htmlFor="district-select" className="primary-header">
  Committee Selector
</label>
```

Two things are wrong:

1. This makes "Committee Selector" the **accessible name of the district
   select**. A screen reader announces that dropdown as "Committee Selector",
   and the section itself has no heading at all.
2. It sits above an entire `Card` of controls (city, district, and others), not
   just `district-select`, so even as a label it points at the wrong scope.

### b. Two page-level `h1`s on recordsearch, with a hand-rolled copy of an existing token

`apps/frontend/src/app/recordsearch/RecordsList.tsx:172` and `:183` are both
`<h1>` on the same page ("Record Search" and "Voter Records"). Their styling is
applied to the *parent div* as `text-2xl text-primary font-bold` — which is
character-for-character the definition of `.primary-header` in
`apps/frontend/src/styles/globals.css:64`.

### c. Three different scales for the same rank of heading

| Pattern | Where |
| --- | --- |
| `primary-header` → `text-2xl text-primary font-bold` | reports, committees, petitions |
| `text-2xl font-semibold` | all 13 `src/app/admin/*/page.tsx` files |
| `text-3xl font-bold tracking-tight` | `src/app/reports/page.tsx:34` |
| `text-2xl font-bold mb-4` | `admin/election-config/ElectionDates.tsx:104`, `ElectionOffices.tsx:113` |

## Scope

1. **CommitteeSelector**: convert the `label` at `:782` to an `<h2 className="primary-header">`, and give `district-select` its own real `Label` from `~/components/ui/label`.
2. **RecordsList**: keep "Record Search" as the page `h1`; demote "Voter Records" to `<h2>`. Replace the inline `text-2xl text-primary font-bold` on both parent divs with the `primary-header` utility on the heading elements themselves.
3. **Scale**: settle on one page-title class and point the admin pages and the reports dashboard at it. Mechanical find-and-replace across the 13 admin pages plus `reports/page.tsx`.

## Open decision (resolve before step 3)

Admin pages use `font-semibold` with no `text-primary` colour, which reads as a
deliberately quieter surface than the member-facing pages. Decide whether that
is intentional:

- If **yes**: add a second utility (e.g. `.section-header`) beside
  `.primary-header` in `globals.css` and point admin at it. Do not flatten.
- If **no**: move everything onto `.primary-header`.

Either way the outcome is one class per rank, referenced by name, with no inline
duplicates of a token's definition left in the tree.

Also fold in the two `text-2xl font-bold mb-4` headings in `election-config/`.
Leave `auth/access-denied/page.tsx` and `error/page.tsx` alone — those are
standalone full-screen states, not app pages.

## Out of scope

The page container / max-width work — see [02](02-page-container-extraction.md).
Do this ticket first; it is small and mostly mechanical, and 02 touches many of
the same files.
