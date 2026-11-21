# 01 - Neutral page surfaces and quiet headings

Status: needs-triage

Part of [ui-makeover](../spec.md).

## Problem

- **Pink pages.** Every member page using `PageContainer` is tinted pink. `apps/frontend/src/components/layout/PageContainer.tsx:34` uses `bg-primary-foreground`, which `styles/globals.css:25` defines as hsl(355.7 100% 97.3%), the shadcn green theme's *text-on-green* colour. Seven more places use it as a panel fill: `RecordSearchForm.tsx:126`, `ScopedReportForm.tsx:617`, `XLSXConfigForm.tsx:251`, `CommitteeSelector.tsx:700`, and others (grep `bg-primary-foreground`). The workspace and the admin pages are white.
- **Loud headings.** `.primary-header` (`globals.css:64`) is `text-2xl text-primary font-bold`, a big green heading. `CardTitle` defaults to `text-2xl` (`components/ui/card.tsx:36`), so card titles outrank the page title on `/reports` ("Report Jobs", "My Reports") and `/committees/requests`. The workspace uses a 3-step scale: title `text-lg font-semibold`, body `text-sm`, meta `text-xs text-muted-foreground`.

## Proposal

1. `PageContainer`: `bg-primary-foreground` → `bg-background`. Swap the panel uses to `bg-muted`, or a new `--surface-subtle` (slate-50).
2. `.primary-header` → `text-lg font-semibold text-foreground`. Fold `.section-header` into the same scale.
3. `CardTitle` default → `text-base font-semibold`.
4. Add `* { @apply border-border }` to `globals.css`. `border` is used only 3 times today, so borders fall back to Tailwind's default grey.

Settle spec open decision 4 (dark mode) first, or at least don't add new `dark:` work.

## Acceptance

- No page background is tinted, at 375 or 1280. Check `/reports`, `/recordsearch`, `/sign-in-sheet-reports` and `/petitions` against `/committees`.
- No heading is green. No card title is larger than its page's `h1`.
- Existing heading-semantics tests (ui-page-consistency 01) still pass.

Evidence: reviews/design-system.md §1, reviews/reports.md "Highest-leverage single finding".

## Comments

### 2026-11-21

Approved in stakeholder review. Brand colour decided: `--primary` stays green, so headings go neutral (this ticket) but primary buttons stay green. Fix `--primary-foreground` (today a pink "text on green") to white while touching the tokens.
