# 04 - Maps of valid signers for petition collection (GIS)

Status: needs-triage

Part of [leader-feedback-2026-11-21](../README.md). Blocked by: 03

## Ask (verbatim)

> If we go crazy there we would include a GIS function to produce maps for people to collect signatures from valid signers

## What was asked

A stretch goal: produce maps showing where valid signers live, so collectors know where to go.

## Notes

- "If we go crazy" means this is low priority, after [03](03-petition-signature-tracking.md).
- Who counts as a valid signer depends on the petition (party enrollment, district). Use the same rule 03 uses
  to check signers.
- Needs geocoded voter addresses. We don't store coordinates today, so check whether the BOE or extended voter
  file has them, or whether we'd need a geocoding service. A service would receive voter addresses: check that
  against [security-audit/20](../../security-audit/issues/20-data-classification-policy.md) first.
- Output could be printable walk maps per ED, an interactive map, or both.
