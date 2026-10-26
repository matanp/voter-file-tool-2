# 01 - Settle the residency rule's open questions

Status: resolved
Type: task

## Why

The spec (`../spec.md`, "Open questions") leaves two policy questions open. Both affect the search
filter (ticket 04) and the ADR (ticket 07).

## To do

- **Town.** The rule as stated drops the same-town requirement as well as LD and ED. Confirm that a
  voter living in a different town, but in the same AD, can serve on the committee. NY Election Law
  only requires residence in the assembly district, which supports dropping it.
- **`requireAssemblyDistrictMatch = false`.** Once LD and ED no longer apply, turning this setting
  off removes the residency check completely. Decide whether that's intended or whether the setting
  should become non-optional.

## Acceptance

- Both answers are recorded below under `## Answer`, along with who made the decision.
- If the setting becomes non-optional, a follow-up ticket exists for that change.

## Answer

Decided 2026-10-25.

- **Town: dropped.** A voter who lives in a different town but in the committee's assembly district
  may serve. Residency is decided by the AD alone. *Decided by MCDC*, which confirmed that town
  doesn't matter. This matches NY Election Law and what both server gates already do.
- **`requireAssemblyDistrictMatch = false`: stays optional, and that means no residency check.**
  *Decided by Matan Presberg.* The setting remains the fallback for go-live without crosswalk data
  (ticket 1.1b) and for testing. This isn't a change on the server: the gates never checked LD or
  ED, so turning the flag off already meant no residency check there. For ticket 04: when the flag
  is off, "Only eligible candidates" applies no residency filter, so it matches the server.

No follow-up ticket: the setting isn't becoming non-optional.

## Comments
