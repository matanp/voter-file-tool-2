# 01 - Prototype the split-pane layout (Variant A)

Type: prototype
Status: open
Parent: ../map.md

## Question

Does the split-pane layout (grid left, tabbed detail right, contextual action drawer) hold up at laptop and 375px widths well enough to promote it, or is there real disagreement that justifies building Variants B and C?

Executes plan §4 under its scope guard: build **Variant A only**, read-only, on the existing route behind a development-only `?variant=` parameter, with realistic committee counts, vacancies, incomplete weights, pending submissions, and member names; stub every mutation. Then do a 375px pass. Use the `prototype` skill.

Evaluate with the human, live:

- How quickly a user finds an ED and reads its status.
- Whether roster and vacancy info are readable at normal laptop widths.
- Whether the add-member drawer preserves enough committee context.
- Behavior at 375px, 768px, desktop.

Keyboard navigation is *not* evaluated here (plan defers it to the real shell, ticket 08).

Expected answer: promote Variant A with Variant B's list-to-detail navigation on mobile. Record the decision, link the prototype branch as an asset, and note how the prototype code is removed (see the map's Not yet specified).
