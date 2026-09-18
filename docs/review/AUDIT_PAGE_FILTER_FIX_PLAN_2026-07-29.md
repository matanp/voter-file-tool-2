# Audit Page Filter Fix Plan

**Page:** `/admin/audit`  
**Date:** 2026-07-29  
**Related:** [AUDIT_PAGE_FILTER_PERFORMANCE_2026-07-29.md](./AUDIT_PAGE_FILTER_PERFORMANCE_2026-07-29.md)

## Assessment

This plan is sound and matches the root cause identified in the performance review. An audit-specific URL-synced filter layer is the right scope: the audit page is currently the only real consumer of URL-backed interactive filters, so a domain-specific hook is safer than a generic abstraction now and remains extractable later.

The plan correctly targets:

- instant filter UI via synchronous local state
- bookmarkable URLs and back/forward correctness via debounced or batched URL sync
- no stale fetch races via `useApiQuery` abort behavior
- no full-table flash via stale-while-revalidate loading
- export using active local filters, not lagging URL state

**Implementation note:** Phase 1 and Phase 4 both apply to date filters. Date fields should update local `filters` immediately for display, but URL sync and `listEndpoint` should use debounced values (250ms via `useDebouncedValue`, which already defaults to `DEBOUNCE_DELAY_MS = 250`) so each date-picker step does not trigger navigation + fetch. Only the date/free-text inputs should be debounced — discrete selects (action, record type, user) should commit to the URL and fetch immediately, since debouncing single clicks only adds latency and the Radix `Select` already echoes the chosen value optimistically without waiting for the URL.

---

## Recommended Sequencing: Ship Phases 3 + 5 First

**Land Phases 3 (fetch via `useApiQuery`) and 5 (stale-while-revalidate UI) as a standalone first change, before the local-state layer.**

**Why:** Phases 3 + 5 alone eliminate the most visible jank — the table disappearing and flashing `Loading…` on every filter change — and add abort safety for superseded requests. They are independently shippable and verifiable, and carry near-zero bug surface because they do not touch the URL-as-source-of-truth model. The remaining phases (1, 2, 4) add a local-state mirror plus URL⇄local reconciliation, which is the highest-complexity, highest-risk part of this work and mostly buys instant echo on the **date inputs** (selects already echo optimistically). Landing the loading fix first means the primary user-facing problem is solved even if the local-state layer takes longer to get right.

**Concretely, the first PR is:**

1. Refactor `useAuditList` to fetch via `useApiQuery(listEndpoint)`, with `listEndpoint` still built inside `useAuditList` from `useSearchParams()` (no signature change yet — minimizes PR 2 churn).
2. Apply the stale-while-revalidate loading UI from Phase 5, including **data-derived pagination while refreshing** (see Phase 5).
3. Add focused component tests for the PR 1 loading/refresh behavior (see Phase 9).

Then the second PR adds Phases 1, 2, 4, and 6 (local filter state + debounced URL sync + export from local filters).

The rest of this document describes the full end state; the phase numbering is logical, not a required commit order.

---

## Goal

Make `/admin/audit` filters feel instant while preserving:

- bookmarkable/shareable URLs
- back/forward navigation correctness
- paginated API behavior
- export using the same active filters
- no stale request races
- no full-table disappearance on every filter change

---

## Phase 1: Extract Audit Filter State

Create:

- [`useAuditFilters.ts`](../../apps/frontend/src/app/admin/audit/useAuditFilters.ts)

Define an `AuditFilters` type:

```ts
type AuditFilters = {
  page: number;
  pageSize: number;
  action: AuditAction | '';
  entityType: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
};
```

The hook should provide:

```ts
{
  filters,
  queryString,
  listEndpoint,
  exportQueryString,
  setFilter,
  setPage,
  setPageSize,
  clearFilters,
}
```

**Behavior:**

- initialize from `useSearchParams()`
- update local state synchronously on user input
- sync the URL with `router.replace(..., { scroll: false })`
- reset `page` to `1` when filters change
- keep `page` when pagination changes
- omit defaults/empty values from the URL
- sync local state if the URL changes externally, such as browser back/forward

### Critical: guard the URL⇄local reconciliation loop

This is the single hardest and most bug-prone part of the hook, and it must be a first-class step rather than an afterthought.

Because the hook **writes** the URL via (debounced) `router.replace`, that write echoes back through `useSearchParams`. A naive effect like:

```ts
// WRONG — clobbers fresh local state with a stale URL during the debounce window
useEffect(() => {
  setFilters(parseAuditFilters(searchParams));
}, [searchParams]);
```

will, during the debounce window, overwrite the just-updated local state with the older URL value — filters snap back, or a controlled input fights the user's typing.

**Fix — explicit echo suppression.** Track the last query string the hook wrote, and only adopt an incoming `searchParams` when it differs from that (i.e. a genuine external / back-forward navigation):

```ts
const lastWrittenRef = useRef<string>(initialQueryString);

// when we write:
const qs = serializeAuditFilters(next).toString();
lastWrittenRef.current = qs;
router.replace(`/admin/audit?${qs}`, { scroll: false });

// when the URL changes:
useEffect(() => {
  const incoming = searchParams.toString();
  if (incoming === lastWrittenRef.current) return; // our own echo — ignore
  lastWrittenRef.current = incoming;
  setFilters(parseAuditFilters(searchParams));
}, [searchParams]);
```

Normalize both sides through the same serializer so key ordering and omitted defaults compare equal (otherwise a semantically-identical echo looks "external" and re-triggers the loop).

---

## Phase 2: Add Pure Parse/Serialize Helpers

Either inside the hook file or adjacent:

- [`auditFilterState.ts`](../../apps/frontend/src/app/admin/audit/auditFilterState.ts)

**Functions:**

- `parseAuditFilters(searchParams: URLSearchParams | ReadonlyURLSearchParams): AuditFilters`
- `serializeAuditFilters(filters: AuditFilters): URLSearchParams`
- `buildAuditListEndpoint(filters: AuditFilters): string`
- `buildAuditExportQuery(filters: AuditFilters): string`

These should mirror the server validation defaults in [`auditListQuerySchema`](../../apps/frontend/src/lib/validations/audit.ts):

- `page`: default `1`, min `1`
- `pageSize`: default `25`, min `1`, max `100`
- `action`: only valid `AuditAction`, otherwise empty
- empty strings omitted
- no `page` in export params
- no `pageSize` in export params

**Note on `sortBy` / `sortOrder`:** `auditListQuerySchema` accepts `sortBy` (default `timestamp`) and `sortOrder` (default `desc`), but the UI has never exposed sorting. `AuditFilters` intentionally omits them, and `serializeAuditFilters` should not emit them — the server defaults apply. This is not a regression (the controls never existed); call it out so a reviewer doesn't read the omission as a dropped feature.

This keeps URL behavior testable without rendering Next components.

---

## Phase 3: Refactor Data Fetching

Change `useAuditList` in [`AuditTrailClient.tsx`](../../apps/frontend/src/app/admin/audit/AuditTrailClient.tsx) to use the existing [`useApiQuery.ts`](../../apps/frontend/src/hooks/useApiQuery.ts).

**PR 1:** keep `useSearchParams()` inside `useAuditList` and build `listEndpoint` there — no new hook signature, no parent wiring change. **PR 2:** when `useAuditFilters` lands, move endpoint construction to the hook and pass `listEndpoint` into `useAuditList` (or inline `useApiQuery` in the client).

**Why:**

- it already aborts superseded requests
- it keeps data until replaced
- it centralizes loading/error/refetch behavior
- it avoids old slower requests overwriting newer filter results

The audit page can pass:

```ts
const { data, loading, error, refetch } =
  useApiQuery<AuditListResponse>(listEndpoint);
```

Then distinguish:

```ts
const hasLoaded = data != null;
const showInitialLoading = !hasLoaded && !error; // covers the pre-fetch frame too
const refreshing = loading && hasLoaded;
```

**Why not `loading && !hasLoaded` for initial loading:** `useApiQuery` initializes `loading` to `false` and only flips it `true` once the effect fires. On first mount there is a frame with `loading === false` and `data === null`. `loading && !hasLoaded` is `false` on that frame, so the component falls through to the table/empty branch and briefly renders "No audit entries match your filters" before the fetch starts. Using `!hasLoaded && !error` (and gating the empty state on `hasLoaded`, per Phase 5) avoids that flash — the current `useAuditList` sidesteps it only because it initializes `loading` to `true`.

**Error + retained data:** unlike the current `useAuditList` (which nulls `data` on error), `useApiQuery` keeps the last successful `data` when a later fetch errors. **PR 1 decision (minimal):** keep the existing top-level `if (error) return <error box>` unchanged — no inline retry UI or refresh-vs-initial error split in this PR. A failed refresh after a successful load will still replace the page with the error box (same as today when the fetch fails). `useApiQuery`'s default 10s timeout and JSON-parsed error messages are acceptable; no custom 401 copy needed.

---

## Phase 4: Update AuditTrailClient Wiring

In [`AuditTrailClient.tsx`](../../apps/frontend/src/app/admin/audit/AuditTrailClient.tsx):

Replace direct values from `searchParams` with `filters`.

**Current problematic pattern:**

```ts
const action = searchParams.get('action') ?? '';
```

**New pattern:**

```ts
const { filters, setFilter, setPage, setPageSize, clearFilters } =
  useAuditFilters();

const { action, entityType, userId, dateFrom, dateTo, page, pageSize } =
  filters;
```

**Update controls:**

```tsx
<Select
  value={action || "all"}
  onValueChange={(v) => setFilter("action", v === "all" ? "" : v)}
>
```

**Date inputs** can either:

- update local state immediately and debounce URL/fetch sync, or
- update local state on change but commit URL on blur

**Recommendation:** debounce using existing [`useDebouncedValue`](../../apps/frontend/src/hooks/useDebouncedValue.ts), likely 250ms, because date inputs are small and this keeps behavior automatic.

---

## Phase 5: Stale-While-Revalidate UI

Change the table loading behavior in [`AuditTrailClient.tsx`](../../apps/frontend/src/app/admin/audit/AuditTrailClient.tsx) (~line 364).

**Current behavior:**

- every filter change hides rows
- shows only `Loading...`
- creates a slow/jumpy feel

**New behavior:**

- **first load:** show centered `Loading...`
- **refresh load:** keep current rows visible
- show subtle refresh state near table footer or top-right, e.g. `Refreshing...`
- optionally reduce table opacity slightly while refreshing

**Important:** if the new result returns zero rows, only show the empty state after that response arrives. Concretely, gate it on `hasLoaded && items.length === 0` — this is the same guard that prevents the first-mount empty flash described in Phase 3.

### Pagination consistency while refreshing

Stale-while-revalidate keeps old rows visible during a fetch, but the URL updates immediately on filter/page changes. If the footer reads `page` / `pageSize` from `searchParams` while `items` / `total` still come from the previous response, the user can see page-1 rows with page-2 highlighted (or new filter labels with old filter's rows).

**PR 1 fix:** while `refreshing`, derive footer/pagination display from the loaded response, not the URL:

```ts
const urlPage = /* from searchParams, as today */;
const urlPageSize = /* from searchParams, as today */;

// While refreshing, URL may be ahead of the stale rows still on screen.
const displayPage = refreshing ? (data?.page ?? urlPage) : urlPage;
const displayPageSize = refreshing ? (data?.pageSize ?? urlPageSize) : urlPageSize;
const displayTotal = data?.total ?? 0;
const displayTotalPages = data?.totalPages ?? 1;
```

Use `displayPage` / `displayPageSize` / `displayTotal` / `displayTotalPages` for the "Showing X–Y of Z" text and pagination button active/disabled state. Filter controls still read from `searchParams` in PR 1 (they will switch to `filters` in PR 2). After the fetch settles (`refreshing === false`), URL and response should match again.

---

## Phase 6: Export Uses Local Filters

Update `handleExport` to use `exportQueryString` from the hook instead of rebuilding params from URL-derived values.

That avoids this bug class:

1. user changes a filter
2. UI shows new local filter immediately
3. URL has not synced yet
4. export accidentally uses old URL state

Export should always reflect `filters`, not `searchParams`.

**Debounce mismatch (document the intent):** because the list uses debounced date values while export reads immediate local `filters`, a just-typed, not-yet-committed date would export differently from what the table currently shows. This is arguably the correct behavior — export what is in the inputs — but make it a deliberate decision rather than an accident. If you'd rather keep export and table strictly in lockstep, source export from the same debounced values that feed `listEndpoint`.

---

## Phase 7: Optional Component Split

Once behavior is fixed, split for readability:

- `AuditFilterBar`
- `AuditTable`
- `AuditPagination`

This is not required for the latency fix, but it would make `AuditTrailClient` less monolithic.

If splitting, pass plain props. Do not introduce context for this page.

---

## Phase 8: Memoize Row Summaries

Move row rendering into a memoized component:

```tsx
const AuditTableRow = memo(function AuditTableRow({ row, onSelect }) {
  const summary = useMemo(() => buildSummary(...), [row]);
});
```

**`onSelect` must be stable.** `memo` is defeated if the parent passes a fresh closure per row (as the current `onClick={() => setSelectedId(row.id)}` does). Pass a single `useCallback`'d `onSelect` and call `onSelect(row.id)` inside the row; otherwise every parent render produces new props and nothing is memoized.

This is secondary. It helps avoid re-running `buildSummary()` for unchanged rows when filter controls update, but the main win is the stale-while-revalidate loading fix (Phases 3 + 5) plus local filter state.

---

## Phase 9: Tests

Before adding tests, follow the repo instruction and read:

- [`skills/test-type-safety/SKILL.md`](../../skills/test-type-safety/SKILL.md)

### PR 1 tests (ship with the loading fix)

Add [`AuditTrailClient.test.tsx`](../../apps/frontend/src/__tests__/app/admin/audit/AuditTrailClient.test.tsx), following patterns in [`GovernanceConfigClient.test.tsx`](../../apps/frontend/src/__tests__/app/admin/governance-config/GovernanceConfigClient.test.tsx). Mock `next/navigation` (`useRouter`, `useSearchParams`) and `global.fetch` via `mockJsonResponse`.

**Cases to cover:**

1. **Initial load** — shows centered `Loading…` before first response; does not flash "No audit entries match your filters".
2. **Stale-while-revalidate** — after first load, trigger a URL/filter change (update mocked `searchParams` + re-render or simulate pagination click); assert prior row text remains visible while the second fetch is in flight; assert `Refreshing…` (or equivalent indicator) appears.
3. **Pagination during refresh** — with a slow second fetch pending, assert footer/pagination reflect the **previous** response's `page` / total (data-derived), not the new URL page.
4. **Empty state gating** — first response with `items: []` shows empty message only after fetch completes, not on the pre-fetch frame.

Use small typed `AuditListResponse` fixtures (`satisfies` or a named factory); no full Prisma shapes.

### PR 2 tests (with local filter state)

**Pure helper tests for `parseAuditFilters`:**

- defaults from empty params
- clamps invalid `page`
- clamps invalid `pageSize`
- drops invalid `action`
- preserves valid filters

**Pure helper tests for `serializeAuditFilters`:**

- omits empty/default values
- includes active filters
- resets page correctly through hook/action tests if practical

**Component / hook behavior:**

- selecting an action updates the visible select value immediately (local state, not URL round-trip)
- fetch is called for the new endpoint

**Export behavior:**

- export URL uses active local filters

---

## Implementation Order

See "Recommended Sequencing" above — this splits into two PRs.

**PR 1 — the loading fix (low risk, ships the main win):**

1. Refactor `useAuditList` to fetch via `useApiQuery(listEndpoint)`; keep building `listEndpoint` inside the hook from `useSearchParams()` (no signature churn).
2. Update loading UI to stale-while-revalidate (`showInitialLoading`, `refreshing`, empty state gated on `hasLoaded`).
3. While `refreshing`, derive footer/pagination from `data.page` / `data.total` (not URL) so stale rows and footer stay consistent.
4. Keep the existing full-page `if (error)` early return unchanged (minimal error handling).
5. Add `AuditTrailClient.test.tsx` with PR 1 cases from Phase 9.
6. Run focused tests, then lint/typecheck if practical.

**PR 2 — local filter state:**

7. Add `auditFilterState.ts` pure helpers.
8. Add tests for parse/serialize helpers.
9. Add `useAuditFilters.ts`, including the URL⇄local echo-suppression guard.
10. Move `listEndpoint` to the hook; refactor `useAuditList` to accept `listEndpoint` (or inline `useApiQuery`); update `AuditTrailClient` controls to use `filters` (debounce only the date inputs).
11. Update export to use `exportQueryString` / local `filters`.
12. Add PR 2 tests from Phase 9; run focused tests, then lint/typecheck if practical.

**PR 3 (optional):** split table/filter/pagination components and memoize rows.

---

## Decision Summary

Use an audit-specific hook now. Do not add `nuqs` or a generic `useUrlSyncedState` yet. The hook gives the performance fix, makes the audit page cleaner, and creates a proven shape that can later be generalized if more admin pages adopt URL-synced filters.

**PR 1 locked decisions:**

| Topic                              | Decision                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Pagination during refresh          | Data-derived footer/pagination while `refreshing`; URL drives display after fetch settles |
| Refresh-time errors                | Keep existing full-page error box (minimal change)                                        |
| Tests                              | Ship `AuditTrailClient.test.tsx` in PR 1                                                  |
| `useAuditList` signature           | No change in PR 1; refactor when `useAuditFilters` lands in PR 2                          |
| `useApiQuery` timeout / error copy | Accept defaults; no custom handling                                                       |
