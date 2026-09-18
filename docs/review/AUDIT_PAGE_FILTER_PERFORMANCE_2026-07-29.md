# Audit Page Filter Performance

**Page:** `/admin/audit`  
**Date:** 2026-07-29  
**Component:** `apps/frontend/src/app/admin/audit/AuditTrailClient.tsx`

## Problem

Filter controls on the audit trail page feel slow to update. When selecting an action, record type, user, or date filter, the displayed value does not change immediately—it lags behind the interaction.

## Root Cause

Filter values are driven entirely by URL search params (`useSearchParams`), not local React state.

On change, the flow is:

1. User selects a filter (e.g. Radix `Select` `onValueChange`)
2. `updateParams` calls `router.replace` with the new query string
3. Next.js updates the URL and re-renders subscribers to `useSearchParams`
4. Only then do controls receive their new `value` props

There is no optimistic local state, so controls wait on an async navigation round-trip before reflecting the selection.

This differs from other admin pages such as `EligibilityFlagsTable`, which keep filters in `useState` and update the UI immediately while fetching in a `useEffect`.

## Contributing Factors

| Factor | Effect |
|--------|--------|
| URL-only filter state | Primary cause of delayed control updates |
| `setLoading(true)` on every fetch | Replaces the entire table with "Loading…" on each filter change |
| Monolithic `AuditTrailClient` | Any param change re-renders filters, table, pagination, export, and drawer |
| `buildSummary()` per row inline | Non-trivial work on every render (25–100 rows) |
| Date inputs call `updateParams` on every `onChange` | Each date-picker step triggers navigation + refetch |
| User `ComboboxDropdown` | Slightly better—updates internal state immediately before calling `onSelect` |

## Recommended Fixes

1. **Optimistic local filter state** — Hold filter values in `useState` for instant UI feedback; sync to the URL via `useEffect` or debounced `router.replace` (or a helper like `nuqs`) to keep shareable/bookmarkable URLs.
2. **Stale-while-revalidate loading** — Keep showing the current table while fetching; use a subtle loading indicator instead of swapping the table for a spinner.
3. **Split and memoize** — Extract filter bar and memoize table rows so filter changes do not re-run `buildSummary` for unchanged rows.
4. **Debounce date filters** — Avoid `router.replace` on every date-picker intermediate value.

## Scope

This is a frontend UX/architecture issue, not a slow audit API. The list endpoint (`GET /api/admin/audit`) is paginated and behaves as expected; the sluggishness is from how filter state is wired to the URL and how the page reacts to param changes.
