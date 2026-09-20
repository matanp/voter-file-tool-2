# 09 - Roster tab

Type: task
Status: open
Blocked by: 08
Parent: ../map.md

## Question

Execute plan §7.1: the seat table as the primary roster representation, reusing and extending `CommitteeRosterTable.tsx`. Columns: seat number, member or vacancy state, membership type, contact info when authorized (Admin-only, plan §3.10), petitioned-vacancy distinction, and a row action menu offering add-from-vacant-row, replace, record resignation, administrative removal.

The row actions dispatch `CommitteeAction` objects (plan §8 type) to the workspace; they must not open anything themselves, since the drawer is ticket 13. Until 13 lands, the actions are wired to a no-op or the existing dialogs — say which in the answer. Role gating follows `auth-check-patterns`.
