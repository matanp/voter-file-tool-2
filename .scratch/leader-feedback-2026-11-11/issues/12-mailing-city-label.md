# 12 - Label the voter card's City line as the mailing city

Status: needs-triage
Type: task

Follow-up from [04](04-voter-card-town-code.md) / PR #149 (merged `26c28e0d`).

## Found

The voter card has a City line (`city`, the Postal City) and, since #149, a Town line (`townCode`). These can
disagree. 6,787 voters with a Webster mailing city live in the town of Penfield (060), so their card shows
"City: WEBSTER" and "Town: PENFIELD (060)". A leader may think one of them is wrong.

`CONTEXT.md` defines Town, Postal City and Village / Ward.

## Decision needed

The label to use, e.g. "Mailing City" or "Postal City". Check whether `city` is the postal city of the residence
address. `mailingCity` is a separate field, so "Mailing City" might be confused with that.

## Fix

- Relabel the City line on `VoterCard.tsx`.
- Check the record search column and the report field picker for the same label, and change them so all three
  match.

## Acceptance

- Card, record search column and report picker use the same label for `city`.
- The `VoterCard` test checks the new label.
