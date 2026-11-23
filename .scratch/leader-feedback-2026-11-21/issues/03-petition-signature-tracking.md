# 03 - Petition signature tracking

Status: needs-info

Part of [leader-feedback-2026-11-21](../README.md). [04](04-signer-maps-gis.md) builds on this.

## Ask (verbatim)

> There is the petition generation angle. But then there is also a use for a petition tracking module where users can log the signatures collected noting by who and when.

And, replying to that message:

> I'll share a Google sheet of how this has been done in the past

## What was asked

A module where users log petition signatures as they are collected, recording who collected them and when.
This is separate from petition generation, which already exists for Admins.

## Waiting on

The stakeholder's Google Sheet showing how tracking has been done in the past. It should answer:

- what one row is: a single signature, a petition sheet, or a count per collector per day;
- which fields are recorded (signer, collector, date, petition or candidate, sheet number, valid or not);
- who enters the data and who sees totals.

If the sheet holds real signer names, keep it in the gitignored `data/` folder and don't quote rows in tickets.

## Notes

- Petitions are hidden from Leaders until 2028
  ([leader-petition-visibility/01](../../leader-petition-visibility/issues/01-hide-petition-generation-and-outcomes-from-leaders.md)).
  Decide whether tracking follows the same rule, or whether Leaders or collectors log signatures directly.
- Checking a signer against the voter file (registered, right party, right district) could come later. It's
  also what [04](04-signer-maps-gis.md) needs.

The stakeholder has since shared an "Objections" folder of petition-challenge workbooks
([06](06-petition-objection-research.md)). Its Signature Counts tab tracks pages, counts and who scrubbed each one,
but it covers challenging an opponent's petitions, not logging our own collection. Ask whether that folder is the
promised sheet or whether a separate collection-tracking sheet is still coming.

Move to `needs-triage` once the sheet arrives.
