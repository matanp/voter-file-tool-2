# 07 - Petition form: catch entries too long to fit one sheet before generating

Status: needs-triage
Type: task
Source: follow-up to [03](03-designating-petition-long-values-overflow.md) (PR #173)

## Problem

Since PR #173, the designating petition shrinks the candidate table and vacancies box to fit a Legal sheet (8px
printed floor, whole-sheet zoom no lower than 90%). If a sheet still doesn't fit, it prints onto two pages and the
report completes with a warning in `Report.metadata`. The person only learns about it after generating, and a
two-page sheet is a poor petition.

The form (`apps/frontend/src/app/petitions/GeneratePetitionForm.tsx`) accepts candidate and vacancy-committee entries
of any length and number.

## Fix

Stop or warn on overflowing input before generating: per-field length limits, a cap on candidates and appointees, or a
live hint that estimates whether the sheet fits. Decide which, and where the limits come from. From PR #173's checks:
5 long candidates fit at 98% zoom, 8 at 92%, 12 at 90% plus the squeeze (macOS only); 25 long candidates with 10 long
appointees overflow.

## Acceptance

- The form prevents or clearly warns about entries that would overflow, with a message that says what to shorten.
- Realistic petitions (petition-quick, petition-10-long) are unaffected.
