# 03 - Does RequestAccess remain a submission role?

Type: grilling
Status: open
Parent: ../map.md

## Question

Spec §16 item 4: does `RequestAccess` remain a distinct role that can submit candidates via `requestAdd`, or is it fully replaced by `Leader`?

The plan currently assumes it stays: the drawer's primary action reads **Submit candidate** for "Leader or RequestAccess", the adapters route both through `requestAdd`, and `replace-member` is offered to both (plan §8). If it is being retired, the drawer, adapters, and role-specific tests (ticket 13) shrink, and `auth-check-patterns` should be updated.

Before grilling, check what the code does today: which routes accept `RequestAccess`, whether any users hold it, and what `actingPermissions` simulation offers. Put the decision to the human; do not answer it for them. Record the answer in `apps/frontend/CONTEXT.md` if the role's meaning changes.
