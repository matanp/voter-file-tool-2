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
