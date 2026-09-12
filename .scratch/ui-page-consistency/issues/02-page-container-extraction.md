# 02 - Extract PageContainer / PageHeader and fix the reports dashboard width

Status: ready-for-agent

Blocked by: 01

Covers findings 1 and 7 from the UI consistency review. Grouped because 7 falls
out of 1 almost for free, and doing them separately would mean touching
`reports/page.tsx` twice.

## Problem

Every page hand-rolls its own wrapper. The shape is already stable and already
duplicated verbatim in three places — this is an extraction, not an invention.

`apps/frontend/src/components/reports/ScopedReportPageShell.tsx:35-42`,
`src/app/committee-reports/page.tsx:29-37`, and
`src/app/voter-list-reports/page.tsx:15-23` each contain the identical:

```tsx
<div className="w-full min-h-screen bg-primary-foreground">
  <div className="max-w-6xl mx-auto p-4">
    <div className="mb-6">
      <h1 className="primary-header">{title}</h1>
      <p className="text-muted-foreground mt-2">{description}</p>
    </div>
```

Meanwhile the other pages diverge: `src/app/page.tsx:37` uses
`container mx-auto px-4 py-16` on `bg-background`, `src/app/reports/page.tsx:31`
uses a bare `w-full p-4 space-y-6` with no max-width at all (finding 7 — content
stretches on wide monitors), and the admin pages use their own wrappers again.

## Scope

1. Add `PageContainer` and `PageHeader` under `apps/frontend/src/components/layout/`.
   - `PageHeader` takes `title` and an optional `description`.
   - **Do not** add a `PageSubtitle` component. It is a single
     `<p className="text-muted-foreground">`; wrapping that in a component is
     pure overhead.
2. Migrate the three existing call sites above onto them. `ScopedReportPageShell`
   should compose `PageContainer`, not duplicate it — every scoped report page
   inherits the fix through it.
3. Give `PageContainer` a width variant, and use it to fix `reports/page.tsx`.

## Important: do not blanket-apply `max-w-6xl`

`src/app/reports/page.tsx` is deliberately wide. It has side-by-side report lists
(`flex flex-col xl:flex-row gap-6` at `:51`, two `flex-1 min-w-0` columns) that
will get cramped inside `max-w-6xl`. Constraining it uniformly would "fix" the
stretch and regress the dashboard layout.

So `PageContainer` needs a variant — e.g. `width="default" | "wide"` — and the
reports dashboard opts into `wide` (a larger cap such as `max-w-screen-2xl`,
*not* unbounded, since unbounded is the actual finding-7 complaint).

## Sequencing

Land [01](01-heading-semantics-and-scale.md) first. This ticket touches many
files and will conflict with anything else in flight, so keep it as its own PR
and land it late. Note there is a large amount of uncommitted work on `main`
right now.

## Out of scope

- Finding 6 (voter-list form diverging from the scoped report forms). The
  divergence is likely justified — that form is driven by `VoterSearchContext`,
  the scoped report forms by the scope registry. Aligning them means either a
  leaky shared abstraction or a cosmetic-only change. Not worth it until we know
  why they differ.
- Finding 8 (`QuickActionCard`). One extracted component for one call site is a
  net loss. Revisit if a second usage appears.
