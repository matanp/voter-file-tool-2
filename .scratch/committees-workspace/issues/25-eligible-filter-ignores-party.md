# 25 - "Only eligible candidates" ignores party

Type: grilling
Status: needs-triage
Parent: ../map.md
Tier: 1 (fix now) · Priority: P1
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding B4

## Problem

With "Only eligible candidates" ticked, candidate search lists BLK and REP voters. Picking one shows "Ineligible:
Party does not match" in step 2 (under "Warning state: Clear"). Seen in Brighton ED 2 and Rochester LD 17 ED 1.

The filter (`app/committees/workspace/drawer/CandidateSearchStep.tsx:71-77`, `canFilterEligibleOnly`) applies only
the assembly-district residency condition.

## Decision needed

- **A. Apply the party rule in the search** (and any other hard eligibility rule the step-2 check enforces), so the
  label is true. Recommended.
- **B. Rename the box** "Only voters in this assembly district" and keep the search as is.

Either way, ineligible rows that do show up should carry their reason in the results, so nobody picks one and only
finds out at step 2. Also check the stray "Warning state: Clear" line shown next to a hard ineligibility.

## Acceptance criteria (once decided)

- [ ] The box's label matches what it filters.
- [ ] Ineligible results show the reason before they're picked.
