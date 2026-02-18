# Inactive Voter Warning — Implementation Spec

**February 2026**

This document describes how to implement the "inactive voter" warning (Roadmap 2.2) by **deriving** inactive status from voter file import presence, rather than requiring a BOE status field. It supplements [SRS_GAPS_AND_CONSIDERATIONS.md](SRS_GAPS_AND_CONSIDERATIONS.md) §1.2 and [SRS_IMPLEMENTATION_ROADMAP.md](SRS_IMPLEMENTATION_ROADMAP.md) §2.2.

---

## 1. Definition

**Possibly inactive voter:** A voter whose record was *not* updated by the most recent voter file import. In other words, their `(latestRecordEntryYear, latestRecordEntryNumber)` is strictly older than the most recent import version.

This is a **proxy** for inactive registration. Absence from the latest BOE export could also indicate: moved, deceased, purged, or data error. For a non-blocking warning, this proxy is sufficient—it flags voters who may need administrative review before committee membership decisions.

---

## 2. Assumptions

| Assumption | Description |
| ---------- | ----------- |
| **Full snapshot** | The BOE voter file export is a full snapshot of all currently active/registered voters each time. If the export were incremental/delta, this logic would not work. |
| **Import semantics** | The current import behavior is preserved: it only creates or updates `VoterRecord` rows; it never deletes voters who are absent from a new import. Voters who drop out of the file retain their previous `latestRecordEntryYear` / `latestRecordEntryNumber`. |
| **Version ordering** | Newer imports use larger `(year, recordEntryNumber)` values (e.g., first import of 2024 = (2024, 1), second = (2024, 2)). The `isRecordNewer` logic in `voterRecordProcessor.ts` already enforces this. |

---

## 3. Data Model (No Changes Required)

The existing schema supports this implementation:

- **`VoterRecord.latestRecordEntryYear`** — year of the last import that touched this voter
- **`VoterRecord.latestRecordEntryNumber`** — entry number of that import
- **Most recent import** — can be derived as `MAX(latestRecordEntryYear, latestRecordEntryNumber)` across all `VoterRecord` rows (see §4.1)

---

## 4. Implementation Plan

### 4.1 Eligibility Service — "Most Recent Import" Helper

**Location:** `apps/frontend/src/app/api/lib/eligibilityService.ts` (new) or alongside `committeeValidation.ts`

**Helper: Get most recent import version**

```ts
/**
 * Returns the (year, recordEntryNumber) of the most recent voter file import.
 * A voter is "possibly inactive" if their latestRecordEntry* is strictly older.
 */
async function getMostRecentImportVersion(prisma: PrismaClient): Promise<{
  year: number;
  recordEntryNumber: number;
} | null> {
  const result = await prisma.voterRecord.findFirst({
    orderBy: [
      { latestRecordEntryYear: 'desc' },
      { latestRecordEntryNumber: 'desc' },
    ],
    select: { latestRecordEntryYear: true, latestRecordEntryNumber: true },
  });
  return result
    ? {
        year: result.latestRecordEntryYear,
        recordEntryNumber: result.latestRecordEntryNumber,
      }
    : null;
}
```

**Helper: Check if voter is possibly inactive**

```ts
function isVoterPossiblyInactive(
  voter: { latestRecordEntryYear: number; latestRecordEntryNumber: number },
  mostRecent: { year: number; recordEntryNumber: number },
): boolean {
  if (voter.latestRecordEntryYear < mostRecent.year) return true;
  if (
    voter.latestRecordEntryYear === mostRecent.year &&
    voter.latestRecordEntryNumber < mostRecent.recordEntryNumber
  )
    return true;
  return false;
}
```

**Edge case:** If there has only been one import, `mostRecent` equals every voter's version, so no one is flagged. The warning only becomes meaningful after at least two imports.

---

### 4.2 Extend Eligibility Validation (Roadmap 2.1)

The eligibility service `validateEligibility(voterRecordId, committeeListId)` returns `{ eligible, hardStops, warnings }`. Add the inactive check to `warnings`:

1. Fetch `VoterRecord` with `latestRecordEntryYear`, `latestRecordEntryNumber`.
2. Call `getMostRecentImportVersion(prisma)`.
3. If `mostRecent` is null or voter is not inactive → no warning.
4. If `isVoterPossiblyInactive(voter, mostRecent)` → append to `warnings`: `"Voter does not appear in the most recent voter file import; registration may be inactive."`

**Performance:** `getMostRecentImportVersion` does a single indexed query. Cache it per request if the same validation runs for multiple voters (e.g., batch validation). Consider a short-lived cache (e.g., 1 minute) if this is called frequently, since imports are infrequent.

---

### 4.3 API Integration Points

Call the eligibility service (including warnings) from:

| Route | When | Notes |
| ----- | ---- | ----- |
| `POST /api/committee/add` | Before adding a member | Return warnings in response; do not block. |
| `POST /api/committee/requestAdd` | Before creating CommitteeRequest | Return warnings in response; do not block. |
| `POST /api/committee/handleRequest` | On accept, before connecting member | Return warnings; admin can proceed. |

**Response shape** (example for `committee/add`):

```json
{
  "success": true,
  "warnings": ["Voter does not appear in the most recent voter file import; registration may be inactive."]
}
```

If there are `hardStops`, return 400 and do not perform the action. If there are only `warnings`, return 200 and perform the action. The UI should surface warnings as yellow banners but allow submission.

---

### 4.4 UI Integration

**Locations (per Roadmap 2.2):**

- **AddCommitteeForm.tsx** — When admin adds a member directly, display server-returned warnings as yellow alert banners above the submit button. Allow submission to proceed.
- **CommitteeRequestForm.tsx** — When leader submits a request, if the API returns warnings, display them. (Leader flow may not need to show warnings—confirm with product.)
- **Handle Request (admin)** — When admin approves a request, if warnings exist, display them in the approval confirmation or a review step.

**Component:** Reuse or extend `Alert` with `variant="warning"` (or equivalent). Message: *"This voter does not appear in the most recent voter file import. Their registration may be inactive. Please verify before confirming."*

---

### 4.5 Optional: Prefetch Warnings on Voter Selection

For better UX, when an admin selects a voter (e.g., in `AddCommitteeForm` before submitting), the frontend can call a lightweight endpoint:

```
GET /api/committee/eligibility?voterRecordId=XXX&committeeListId=YYY
→ { eligible, hardStops, warnings }
```

This allows showing warnings *before* the user clicks Submit. The existing add/requestAdd flows would also return this on mutation, so the prefetch is optional.

---

## 5. Testing

| Test Type | Scope |
| --------- | ----- |
| **Unit** | `isVoterPossiblyInactive` — (2024,1) vs (2024,2) → true; (2024,2) vs (2024,2) → false; (2024,2) vs (2023,5) → false. |
| **Unit** | `getMostRecentImportVersion` — empty DB → null; one voter → returns that voter's version; multiple voters → returns max. |
| **Integration** | `committee/add` with voter having stale `latestRecordEntry*` → 200 + warnings in response; add succeeds. |
| **Integration** | `committee/requestAdd` with same scenario → 200 + warnings; CommitteeRequest created. |
| **Integration** | `committee/handleRequest` accept with stale voter → 200 + warnings; member connected. |

---

## 6. Deferred / Future Considerations

- **BOE status field:** If MCDC later provides an explicit `voterStatus` or `registrationStatus` column, the system could prefer that over the derived check, or combine both (e.g., "BOE marks inactive" + "not in recent import").
- **Incremental imports:** If the BOE ever switches to incremental exports, this implementation would need to be revisited or disabled.
- **Report metadata:** The `Report` table's `metadata` for `VoterImport` does not currently store `year` and `recordEntryNumber`. For "most recent import," we use `VoterRecord` as the source of truth. If desired, metadata could be extended so admins can see which import is "current" in the UI.

---

## 7. Summary Checklist

| Step | Description |
| ---- | ----------- |
| 1 | Add `getMostRecentImportVersion` and `isVoterPossiblyInactive` helpers |
| 2 | Add/extend eligibility service to include inactive warning in `warnings[]` |
| 3 | Update `committee/add`, `committee/requestAdd`, `committee/handleRequest` to call eligibility service and return warnings in response |
| 4 | Update `AddCommitteeForm.tsx` (and related UI) to display warning banners |
| 5 | Add unit and integration tests |
| 6 | Update SRS_GAPS_AND_CONSIDERATIONS.md §1.2 to mark as resolved with "derived from import presence" |

---

*This spec assumes the full-snapshot BOE export model. Confirm with MCDC before implementation.*
