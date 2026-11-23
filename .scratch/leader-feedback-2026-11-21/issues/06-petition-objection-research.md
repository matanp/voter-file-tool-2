# 06 - Petition objection research (scrubbing an opponent's petitions)

Status: needs-triage

Part of [leader-feedback-2026-11-21](../README.md). Related: [03](03-petition-signature-tracking.md), [04](04-signer-maps-gis.md).

## Source

After the chat, the stakeholder shared an "Objections" folder from the 2026 petition season. It is the material for
how petition challenges have been run by hand. A local copy is in the gitignored
`data/petition-objections/Objections/`. It holds real petition scans, signer lists, objector names and addresses,
so don't commit it or quote rows from it.

The folder holds:

- A blank template workbook (`TEMPLATE_Petition Research Specification Objections Form 2025.xlsx`) and filled-in
  copies for three Assembly Districts (54, 130, 137) and one town race.
- Scanned petition PDFs for one AD race (both candidates' petitions).
- Volunteer directions for scrubbing those petitions (the `Petition Scrub Directions.docx` in the `137/` folder).
- Objection cover-sheet letters to the BOE (`.docx`).
- The state's guidance on specifications of objections (`Guidance on Specifications of Objections (Revision 3) - 4-17-2023.pdf`)
  and its sample specifications key (`Specifications Key.pdf`).

## How it works today

1. A general objection is filed against an opposing candidate's designating petition. The specific objections are
   due a few days later (Election Law 6-154).
2. Petition pages are split among volunteers. The workbook's **Signature Counts** tab lists each volume and page,
   its signature count, whether it has been scrubbed, and the assigned scrubber.
3. Volunteers read the scanned pages and log each objection on the **Objections** tab as volume, page, line, one
   or more objection codes, and notes. The **Codes** tab lists the codes:
   - signer codes such as NE (not enrolled), NR (not registered), OD (out of district), WA (wrong address),
     ILL, PRINT, ND, DUP (signed this petition twice) and SAP (signed another candidate's petition first);
   - witness codes such as SW-NE, SW-NR, WNS (wrong number of signatures), DATE and FRAUD.
4. Volunteers also log each signer on a "Voter File - Compare Duplicate Signers" tab, for both candidates'
   petitions, so DUP and SAP can be found.
5. The workbook keeps a running total of objections and how many are still needed to bring the petition below the
   required signature count.
6. The **BOE Official** tab is the county BOE's "Petition Research Form: Specific Objections". A cover letter
   states the totals (filed, invalid, valid, required) and is filed with it.

## What the app could do

This is an idea, not a request yet. The stakeholder hasn't asked for this module, but the material shows where
the app could save the most work:

- Check signers against the voter file: NE, NR, OD and WA are lookups we can already do. Today volunteers do them
  by hand.
- Find DUP and SAP across petitions automatically once signers are entered.
- Track page assignments and progress per volunteer, with running totals of objections against the required count.
- Generate the BOE specific-objections form and cover sheet as a PDF report. See `skills/adding-reports/SKILL.md`.

## Open questions

- Is this what the stakeholder meant by "how this has been done in the past" for [03](03-petition-signature-tracking.md),
  or is it a separate workflow? 03 is about our own collectors; this is about challenging an opponent.
- Who would use it: Admins only, or volunteers given access for one challenge?
- Would we defend our own petitions with the same tools (checking our signers before filing)?
- Petitions are hidden from Leaders until 2028
  ([leader-petition-visibility/01](../../leader-petition-visibility/issues/01-hide-petition-generation-and-outcomes-from-leaders.md)).
  Should this follow the same rule?
- Timing: specific objections are due in early April, so anything built has to be ready before petition season.
