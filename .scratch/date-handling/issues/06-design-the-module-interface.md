# 06 - Design the Calendar Date module's interface and seam

Type: grilling
Status: open
Blocked by: 04
Parent: ../map.md

## Question

What is the module's interface, and exactly where does the seam sit?

`shared-validators` is the presumed home — both apps already depend on it, and report-server's stake in petition PDFs is what makes the seam real rather than hypothetical. Confirm or move it.

Settle:

- The entry points, and what each one refuses to accept. Fewer is better: today `electionDateUtils` exposes five over one branch table, three of them pass-throughs.
- What the module owns beyond parse and format — comparison, sorting, the invalid-date policy, the Prisma filter.
- What stays outside it, and why.
- What its tests assert, given that the interface is the test surface: no test in this effort should need a mocked timezone.

Worth `codebase-design`'s design-it-twice pattern — the interface is small enough that two independent designs are cheap and the comparison is informative.

## Comments

### 2026-11-19: two `parseCalendarDate`s to merge here

Deferred from the ticket 11 review. Both exist, and they disagree:

- `lib/dateUtils.ts`: lenient. `YYYY-MM-DD` goes to **UTC noon**; anything else falls through to `new Date(s)`, so
  `2023-02-29` rolls into March and full ISO instants are accepted. Used for term dates and the voter-list report form.
- `lib/electionConfigParsing.ts`: strict allowlist (`YYYY-MM-DD`, `M/D/YYYY`). Gives **UTC midnight** and rejects
  components that don't round-trip. Used for election dates.

Merging them changes either the stored time of day for term dates or what input gets accepted, so the representation
choice (04/05) has to come first. That's why this wasn't done as a cleanup.
