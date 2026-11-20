# 02 - Weights: per seat, and missing from the Weight Report

Status: resolved

## Ask (verbatim)

> 2. The weight uploaded is per seat, not per ED. A full ED, or one with 2 members, should always be an even number.

> Also checking the Weight Report it doesnt seem to be including the weight numbers.

## Comments

### 2026-11-01 - triage: needs-info

**Per seat: confirmed as an import bug.** `api/admin/weightedTable/import` stores `Weighted Vote` as the LTED
total and divides it by `maxSeatsPerLted` (4) to get seat weight (`computeSeatWeight`, `seatUtils.ts`). In
`data/Base Committee Weight by LTED 20260109.xlsx`, `Base Weight` = `Weighted Vote` × `Weighted Seats` on all 397
data rows (e.g. 17001: 128.5 × 4 = 514), so `Weighted Vote` is per seat. Today every seat gets a quarter of its
real weight. The fix changes the **LTED Weight** definition in `CONTEXT.md` and the schema comments, and
`LtedWeightEditor` needs the same change.

**Weight Report missing numbers: probably [06](06-vacancy-report-petitioned-status.md).**
`DesignationWeightSummary.tsx` sums only petitioned seats in both weight columns. `Seat.isPetitioned` defaults to
`false` and only the petition-outcomes screen sets it, so with no outcomes recorded every weight is `0.00`. Proposal:
move this half to 06. Open display question: should `LTED Weight` show the full ED weight whether or not seats
are petitioned?

**Questions for the reporter:**

1. What is `Weighted Seats`? It varies 1–4 per ED and can be below the filed count (21001: 2 weighted, 5 filed).
   Should the ED total be `Weighted Vote` × `Weighted Seats` from the file, or × our fixed seat count?
2. How is `Current Weight` computed? 17006 shows 181.6875 (= 242.25 × ¾), not 3 filled × 80.75. Also needed by
   [13](13-weight-by-lt-town-report.md).

### 2026-11-17 - reporter answers (email from Avi)

> Weighted seats are the committee seats that were petitioned on and are now currently occupied.
> No ED can have more than 4 people seated.
> The weights will change in December after the current election is certified.
> What needs to be done to enter the petition results? The original file of members for 2026-2028 are those results.
> The before and after dont mean much to me because everything needs to have the petition results layer to know
> what does and doesnt carry weight right now.

**What this settles:**

- `Weighted Vote` is the per-seat weight. A seat carries it only if it was petitioned on **and** is occupied now.
  That matches the sheet's rule `Current Weight = Weighted Vote × min(Weighted Seats, Filed Seats)` and the
  **Designation Weight** definition already in `CONTEXT.md`.
- So Q1: an ED's weight is `Weighted Vote` × its petitioned seats, not × our fixed seat count. An ED with no
  petitioned seats has zero weight.
- `Weighted Seats` in the 20260109 sheet comes from the **2024–2026** petitions. It matches the 2026–2028 file's
  ELECTED count per ED on 443 of 690 sheet rows. Examples that differ (sheet vs. file): 17002 4/0, 21003 4/2,
  22007 0/4. Don't import `Weighted Seats` for the new term. Get petitioned seats from the
  2026–2028 file (see [06](06-vacancy-report-petitioned-status.md)).
- `data/Elected County Committee List 2026 - 2028 .txt` has 1,470 rows across 437 EDs, every row ELECTED, and no
  ED over 4 (39 EDs with 1, 51 with 2, 59 with 3, 288 with 4). This is consistent with "no ED can have more than 4
  people seated." The "5 filed" for 21001 in the old sheet was a 2024–2026 count.
- A new per-seat `Weighted Vote` sheet is due in December after certification. The per-seat import fix has to be
  in before then.
- The before/after mock-up is on hold until 06 lands. Then the real report can be shown instead of a mock.

**Still unanswered:** Q2 (17006 `Current Weight` 181.6875 vs. 242.25 by the rule). It's probably a sheet error.
It only matters if we want to reproduce old reports. Ask again when the December sheet arrives.

**Ready for agent (this ticket):** treat `Weighted Vote` as per-seat in `api/admin/weightedTable/import`,
`computeSeatWeight` (`seatUtils.ts`), and `LtedWeightEditor`. Update the **LTED Weight** definition in
`CONTEXT.md` and the schema comments. Unblocks 13 and 14, together with 06.

### 2026-11-17 - audit additions

From the read-path audit for [06](06-vacancy-report-petitioned-status.md). Paths are under `apps/frontend/src`
unless written in full. RS means `apps/report-server/src`.

- These all divide by 4 and need the per-seat change: `computeSeatWeight` and `recomputeSeatWeights`
  (`seatUtils.ts`), and the `seatWeight` in `weightedTable/import/route.ts`.
- Update the "divided by {maxSeatsPerLted}" text in `LtedWeightEditor.tsx:100`, the "LTED total weight" label in
  `CommitteeSelector.tsx:1020`, and the **LTED Weight** definition in `CONTEXT.md`.
- The Weight Report's "LTED Weight" column (RS `DesignationWeightSummary.tsx:47`, `xlsxGenerator.ts` ~296-331)
  adds up petitioned seats only, filled or not. That isn't the ED's weight. Show the ED's full weight
  (per-seat × petitioned seats, the sheet's Base Weight) or the per-seat value.
- `ensureSeatsExist` and `missingCommittees` create seats with no weight even when the committee already has
  one, so imported committees show missing weight until a recompute runs. Set the weight when the seat is
  created.

### 2026-11-17 - open question sent to Avi: replacement appointees

Emailed 2026-11-17, awaiting a reply. When a petitioned member resigns and someone is appointed to the seat,
does the seat carry weight again?

- **A** (current code, and what the old sheet's `min(Weighted Seats, Filed Seats)` suggests): the seat is zero
  while vacant or pending, and carries weight again once the appointee is ACTIVE.
- **B**: the seat carries nothing for the rest of the term, because weight belongs to the petitioned member.
  Fix: in `computeDesignationWeight`, also require occupant `membershipType = PETITIONED`. Update **Designation
  Weight** in `CONTEXT.md`.
- **C** (the seat keeps its weight while empty) contradicts "currently occupied" and is ruled out.

This doesn't block the per-seat fix or 06. If he picks A, nothing changes.

### 2026-11-18 - Avi answers: replacement appointees (A)

> Yes, once they are appointed to the seat that was petitioned it carries the weight again for the rest of the term.
>
> Seats petitioned hold weight regardless of who holds it.

Option **A**. Weight belongs to the petitioned seat, not to the member who petitioned. A vacant seat carries
nothing, and the seat carries its weight again once an appointee is ACTIVE in it. `computeDesignationWeight`
(`lib/designationWeight.ts`) already does this ("Appointed members in petitioned seats contribute the full seat
weight"), so no code change. The question is closed.

### 2026-11-18 - implemented, PR #160

Branch `weights-per-seat` (6 commits on `aae89526`), PR #160. The Weight Report keeps **LTED Weight** as the per-seat
value and adds a **Base Weight** column (per seat × petitioned seats). There is no migration. After deploy, re-import
the current weighted table, then run the two read-only checks in the PR for LTED weights that were typed in as
district totals. Follow-up: `updateLtedWeight` writes no audit row ([26](26-audit-lted-weight-edits.md)).

**2026-11-19, closed.** Shipped in PR #160 (merged 2026-11-19 06:31 UTC, deployed). The weighted table was re-imported in prod after merge (audit: 2026-11-18 10:35 and 10:38 PM PT) and "PR160 check" Weight Summary reports (PDF and XLSX) were generated. Follow-ups: 26 (audit LTED weight edits), 27, and reports-polish/02 (footer-only page).
