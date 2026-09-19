# 13 - Action drawer: add-member and submit-candidate flows

Type: task
Status: open
Blocked by: 03, 09
Parent: ../map.md

## Question

Execute plan §8: one `CommitteeActionDrawer` (on `components/ui/sheet.tsx`) driven by the `CommitteeAction` discriminated union, with adapters in `committees/workspace/adapters.ts` translating actions into the current `add`/`requestAdd`/`remove` request bodies using the composite key from `CommitteeRef`. The drawer never sees endpoint URLs; the caller provides the action and handles completion.

This ticket covers `add-member` and `replace-member` (add with a preselected replacement target, via `requestAdd` for submission roles; not offered to Admin). Four steps in one drawer, no nested dialogs: find candidate (voter id / names, **only eligible** filter), review (hard stops, warnings, membership/capacity), details (membership type, email, phone, override reason where permitted), confirm (explicit destination, role-appropriate label — **Add member** / **Submit candidate** / none for ReadAccess, per ticket 03's answer). Full-screen sheet on mobile; focus trap, Escape, focus restore.

After success: close, refresh detail and the affected grid row, preserve filters/selection/tab, existing success toast. Tests (plan §12.2): candidate search/selection; eligible, warning, hard-stop, retry, full-committee states; successful add refreshing both panes; drawer reset and focus restoration. Run the §12.3 checklist.
