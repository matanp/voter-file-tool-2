# 14 - Migrate removal, resignation, and Leader replacement into the drawer

Type: task
Status: open
Blocked by: 13
Parent: ../map.md

## Question

Execute plan §9: move the resignation and removal dialogs out of `CommitteeSelector.tsx` into the shared drawer as `remove-member` and `record-resignation`, and wire Leader `replace-member` submission through `requestAdd` with the stored target as today.

Preserve every domain requirement: removal requires a reason, **Other** requires notes, resignation requires received date and method; eligibility and warnings stay server-decided; privileged mutations stay auditable. Thin adapters only — no command-service changes (out of scope on the map). Run the §12.3 checklist.
