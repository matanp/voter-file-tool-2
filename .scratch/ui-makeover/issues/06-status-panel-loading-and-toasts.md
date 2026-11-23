# 06 - Shared empty/denied/error panel, loading skeletons, and toast refresh

Status: ready-for-agent

Blocked by: 01

Part of [ui-makeover](../spec.md).

## Problem

- **Permission denied** is raw unstyled text flush to the edge: `committees/requests/page.tsx:65`, `AdminPageAccessDenied.tsx:4-6`, `authcheck.tsx:27-31`. `/petitions` shows a generic "Something went wrong".
- **404** is the Next.js default; there is no `not-found.tsx`.
- **`/error`** is a full-bleed card. **`app/error.tsx`** is bare and shows the raw `error.message`.
- **Empty states** are bare lines ("No reports found", shown twice on `/reports`).
- **Loading:** about 25 different plain "Loading…" strings. `authcheck.tsx:40` renders `<h1>Loading...</h1>`. The only route `loading.tsx` is under admin, so navigation elsewhere looks frozen.
- **Toasts:**
  - 72 destructive and 3 default uses, with no success variant.
  - Destructive is a solid red slab with `p-6` padding.
  - On phones they cover the header.
  - `TOAST_REMOVE_DELAY = 1000000` (`use-toast.ts:11`).
  - Titles are mostly "Error" (37) and "Success" (15).

## Proposal

- **`StatusPanel`** (icon, title, body, action): a centred `max-w-md` block based on `CommitteeEmptyScope.tsx:23-29`, which is already good. Use it for denied, sign-in needed, 404, error and empty.
- **Route `loading.tsx`** for `/committees`, `/reports` and `/recordsearch`, using a page-header skeleton plus list-row skeletons in the workspace row shape.
- **Toasts:** compact `p-3 text-sm` with a coloured leading icon and a `success` variant. Bottom-centre on phones. Success auto-dismisses after about 4s. Titles say what happened ("Report queued").

Coordinate with accessibility/02 (toast cut off by focus move).

## Acceptance

- Denied, 404, error and empty all render through `StatusPanel`. No raw `error.message` is shown to users.
- The three main sections show a skeleton during navigation.
- Toasts have a success variant, don't cover the header on phones, and auto-dismiss.

Evidence: reviews/shell.md §1C and §2.

## Comments

### 2026-11-21 - triage

Ready for agent after 01. It can run in parallel with 05. Read accessibility/02 first and fix it here if it is still open.
