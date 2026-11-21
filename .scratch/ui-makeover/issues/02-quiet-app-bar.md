# 02 - Quiet app bar

Status: ready-for-agent

Blocked by: 01, 04

Part of [ui-makeover](../spec.md).

## Problem

The global nav (`apps/frontend/src/app/components/header.tsx`, `TAB_STYLE`, around `:111-120`) renders Record Search, Committees, Reports and Admin as 64px `Button` blocks. Inactive items are `bg-muted-foreground` grey; the active item is solid green. The bar is about 88px tall in total, has no product name, and uses a dark "View Profile" button (`components/ui/manageProfile.tsx`) in a third colour. It is the loudest element on every screen, and the quiet workspace header right under it looks pasted in.

On phones, Admin adds a second floating menu button at the bottom-left (`AdminSidebar.tsx:137-150`), which clashes with toasts.

## Proposal

Keep a top bar; don't add a global side rail. There are only 3–4 sections, Leaders are mostly on phones, and the workspace needs the width for its own split.

```
1280 │ ◧ <Product>   Voters  Committees  Reports  Admin        [DEV DB] (MP)▾ │ 48px, white, border-b
                               ─────────                                      active = 2px underline
375  │ ◧ <Product>                                         (MP) ☰ │
```

- Bar height 48px, white, with a hairline border.
- Nav items are `text-sm font-medium` links. The active one gets foreground colour and an underline; inactive ones are muted. No green.
- Profile becomes an initials button with a dropdown: name, privilege, acting-as, sign out.
- The DEV/PROD DB badge moves next to the profile and shrinks.
- Phone: one ☰ sheet that also holds the Admin section links, which removes the floating admin button.
- A fixed bar height lets `useHeightBelowNav` become a CSS variable.
- While in there: replace `p.includes("record")` with a `startsWith` check for the active state.

Brand colour and nav labels are decided (spec "Decisions"): keep green primary, and label the first item "Voters". The product name and branding are still open (spec open decision 2); use a placeholder until then.

## Acceptance

- Bar is ≤48px at all widths. No grey or green button blocks.
- Phone: a single menu entry point, including admin sections, and no floating admin button.
- `run-frontend` screenshots at 375/768/1280 show no overflow. Existing header tests are updated, not deleted.

Evidence: reviews/shell.md §1A.

## Comments

### 2026-11-21

Prototyped on `proto/ui-makeover` and approved in stakeholder review. Decided: green primary actions, "Voters" nav label. The active nav item keeps the neutral underline (foreground colour), not green.

### 2026-11-21 - triage

Ready for agent, with a placeholder product name until spec open decision 2 is settled. Runs in parallel with 03 after 01 and 04; it touches only the header, profile and DB badge files.
