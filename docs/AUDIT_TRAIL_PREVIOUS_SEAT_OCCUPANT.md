# Audit Trail — Previous Seat Occupant on Activation

Short design note for product decisions. Companion to [AUDIT_TRAIL_MEMBERSHIP_SUBJECT.md](./AUDIT_TRAIL_MEMBERSHIP_SUBJECT.md).

**Status:** Under consideration — no implementation yet.

---

## Symptom

On `MEMBER_ACTIVATED` rows (especially bulk import), admins can see **who was appointed** and **which seat they got** via `metadata.subject` and `afterValue.seatNumber`. They cannot see **who held that seat before** from the activation row alone.

`beforeValue` only describes the **appointee’s own prior membership state** (e.g. `{ status: "ACTIVE" }`, `{ status: "SUBMITTED" }`, or `null` for a brand-new row). It does not identify the previous occupant of the assigned seat.

When someone is removed and another person takes a seat in the same operation (bulk sync, replacement request, etc.), that relationship exists only as **two separate audit rows** — a `MEMBER_REMOVED` and a `MEMBER_ACTIVATED` — that must be correlated manually (by committee, timestamp, and seat number).

---

## Related issue: noisy bulk-import activations

Bulk import currently emits `MEMBER_ACTIVATED` for **every imported voter**, even when the person was already `ACTIVE` on the same committee with the same seat. In those cases `beforeValue` and `afterValue` are effectively identical; the event means “processed by sync,” not “new appointment.”

That noise makes the audit log harder to scan and weakens `MEMBER_ACTIVATED` as a signal for real changes. **Fixing no-op activations** (skip audit or use a different action) is a separate but adjacent product decision; it affects how valuable `previousSeatOccupant` would be on bulk-import rows.

---

## Proposed convention

Add **`metadata.previousSeatOccupant`** on `MEMBER_ACTIVATED` — a **write-time snapshot** of who occupied the assigned seat immediately before this activation.

### Shape (draft)

```ts
metadata.previousSeatOccupant: {
  memberName: string;
  voterRecordId: string;
  membershipId: string;
  seatNumber: number;
} | null
```

- **`null`** — the assigned seat was vacant (no `ACTIVE` member held that seat number at snapshot time).
- **Omit the field entirely** — the same person kept the same seat (no seat turnover).

Follows the same principles as `metadata.subject`: snapshot at write time, no read-time joins, validate loosely in the UI reader.

### Where it would be set

All `MEMBER_ACTIVATED` call sites (~10):

| Flow | File |
| ---- | ---- |
| Admin direct add / re-activate | `committee/add` |
| Accept submitted request (incl. replacement) | `committee/handleRequest` |
| Bulk import sync | `admin/bulkLoadCommittees/bulkLoadUtils` |
| Discrepancy acceptance | `admin/handleCommitteeDiscrepancy` |
| Meeting confirmation | `admin/meetings/[meetingId]/decisions` |
| Petition outcome activation | `admin/petition-outcomes/record` |

Shared helper alongside `auditMembershipSubject.ts` (e.g. `snapshotPreviousSeatOccupant(client, { committeeListId, termId, seatNumber })`).

### UI (if adopted)

- **Summary line:** e.g. “Jane Smith activated in Brighton LD 28 ED 3 Seat 2 (replacing John Doe)” or “… Seat 4 (vacant).”
- **Drawer:** structured block next to `metadata.subject`, same as subject snapshot.
- **Export:** optional column or embedded in Summary text.

Document the field in the same convention doc as `metadata.subject`.

---

## What “previous occupant” means (needs product decision)

**Recommended definition:** whoever held **`seatNumber` N** on this committee/term with `status: ACTIVE` **immediately before** the new member is written to that seat — regardless of *why* the seat became available.

This is **seat-specific**, not “who was removed in this transaction.”

### Why that distinction matters

Seat assignment uses `assignNextAvailableSeat` — the **lowest-numbered unoccupied seat**, not necessarily the seat the removed member vacated.

Example (replacement request):

1. Member on **Seat 3** is removed (`seatNumber` cleared).
2. New member gets **Seat 1** because seats 1–2 were already vacant.

`previousSeatOccupant` on the activation row would be **`null`** (Seat 1 was vacant). The displaced member is still visible on the separate `MEMBER_REMOVED` row (`metadata.reason: "replacement"`, `replacementMembershipId` on the removal side today).

Alternative definition — **“displaced member”** (whoever was removed to make room in this operation) — is a different field and overlaps with existing removal metadata. Mixing the two definitions in one field would be confusing.

| Definition | Answers | Misses |
| ---------- | ------- | ------ |
| **Seat occupant** (proposed) | “Who was in Seat N before?” | Link to removal when seats don’t match |
| **Displaced member** | “Who did this person replace?” | Vacant-seat fills; wrong seat when lowest-available ≠ vacated seat |

---

## Bulk import specifics

Per committee, bulk sync runs in one transaction:

1. **Removals first** — active members not in the import file → `REMOVED`, `seatNumber: null`.
2. **Activations** — each imported member gets `assignNextAvailableSeat` or keeps an existing seat.

For a newcomer taking a seat just vacated in step 1, the snapshot query must run **after** the assignee’s `seatNumber` is known but must look up **who held that seat number before this activation** — including someone already transitioned to `REMOVED` milliseconds earlier in the same transaction. That implies querying membership history or capturing the occupant **before** clearing `seatNumber` on removal, not only “current ACTIVE on seat N.”

**Product / engineering decision:** snapshot-at-removal vs snapshot-at-activation-with-wider query. Both work; removal-time capture is simpler for bulk import’s remove-then-add ordering.

---

## Overlap with existing removal metadata

`MEMBER_REMOVED` already carries useful context in some flows:

- Bulk import: `metadata.source: "bulk_import_sync"`, `metadata.reason: "not_in_import_file"`
- Replacement: `metadata.reason: "replacement"`, `replacementMembershipId` on the **removal** row

`previousSeatOccupant` on activation makes the **activation row self-contained** for the common admin question: “Who got this seat, and who had it before?” It does not replace removal events or bidirectional cross-links (`replacedMembershipId` / `successorMembershipId`) if those are desired later.

---

## Open product decisions

1. **Adopt `previousSeatOccupant` at all?** Is manual correlation of REMOVED + ACTIVATED rows acceptable for rare flows, or is self-contained activation copy a recurring admin need?

2. **Seat occupant vs displaced member** — confirm seat-specific definition above, or prefer a “replaced {name}” narrative tied to the removal transaction.

3. **No-op bulk activations** — fix separately (skip audit / new action like `MEMBER_SYNCED`) before or together with this work? Without that fix, most bulk-import rows would omit `previousSeatOccupant` (same person, same seat) but still clutter the log.

4. **Vacant seat presentation** — explicit “vacant” in summary vs omitting predecessor text when `null`.

5. **Re-activation without seat change** — omit field (proposed) vs always include `previousSeatOccupant: null` for consistency.

6. **Cross-links** — add symmetric IDs on REMOVED rows (`successorMembershipId`) in addition to activation-side snapshot, or keep one-directional snapshot only.

7. **Historical rows** — out of scope (same as `metadata.subject`); generic UI fallback for older activations.

8. **New enum value** — extend metadata vs new `AuditAction` (e.g. `SEAT_ASSIGNED`). Metadata extension matches existing `metadata.subject` pattern and avoids enum migration.

---

## Implementation sketch (for sizing only)

- One shared snapshot helper + unit tests.
- Touch ~10 call sites; bulk import and replacement need snapshot **before** seat is cleared or via removal-time side channel.
- Reader validation + summary formatting in `auditUtils.ts`.
- Tests per flow where seat turnover occurs (replacement, bulk remove+add, vacant fill).

No Prisma schema migration required (JSON metadata convention).

---

## Suggested decision order

1. Confirm whether seat-turnover visibility on the **activation row** is worth the added metadata/UI.
2. Lock definition: **seat occupant** vs **displaced member**.
3. Decide bulk-import no-op audit behavior (orthogonal but affects signal-to-noise).
4. Approve UI copy for summary/drawer/export.
5. Implement helper + call sites + reader.
