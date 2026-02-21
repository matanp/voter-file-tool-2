# SRS Pre-Implementation Gaps & Considerations

**February 2026**

This document captures gaps, open questions, and items to resolve before or during implementation of the MCDC Committee Membership & Governance system. It supplements [SRS_IMPLEMENTATION_ROADMAP.md](SRS_IMPLEMENTATION_ROADMAP.md) and [SRS_DATA_MODEL_CHANGES.md](SRS_DATA_MODEL_CHANGES.md).

---

## Status Quick Reference

| Status                 | Count |
| ---------------------- | ----- |
| **Open**               | 0     |
| **Partially Resolved** | 1     |
| **Resolved**           | 8     |

---

## 1. Resolved Questions

### 1.1 LTED Weight Source (Roadmap 1.4, 2.7)

**Status:** Resolved

**Question (resolved):** Does the BOE voter/committee export include weight, or does it require a separate MCDC upload?

**Impact:** Determines whether weight can be populated automatically during BOE import or must be entered manually.

**Resolution:** BOE exports are not the weight source. LTED weight comes from the separate MCDC weighted table import, with manual admin entry fallback. See [SRS_LTED_WEIGHT_SOURCE.md](SRS_LTED_WEIGHT_SOURCE.md).

---

### 1.2 Voter Status / Inactive Warning (Roadmap 2.2)

**Status:** Resolved

**Question (resolved):** Does the BOE CSV/export include a voter status field for inactive-registration checks?

**Impact:** The "inactive voter" warning (non-blocking) requires a field to derive status. If unavailable, the warning cannot be implemented in v1.

**Resolution:** Inactive warning can be derived from voter-file import presence (no BOE status field required). See [SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md](SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md) for implementation details.

---

## 2. Data Source Gaps

### 2.1 LTED-to-Assembly-District Crosswalk (Roadmap 1.1b)

**Status:** Resolved

**Issue:** Roadmap says "Migration/seed to populate from MCDC-provided data" but does not specify:

- **Format:** CSV, Excel, API, or manual entry?
- **Provider:** Who at MCDC owns this data?
- **Update cadence:** One-time seed or periodic refresh?

**Resolution:** The LTED Matrix/weighted-table specs define format and matching approach; schema + seed path are complete, and admin UI/import UX is tracked in Phase 2 planning/tickets. See [SRS_LTED_WEIGHT_SOURCE.md](SRS_LTED_WEIGHT_SOURCE.md) and [tickets/1.1b-lted-assembly-district-mapping.md](tickets/1.1b-lted-assembly-district-mapping.md).

---

## 3. UX & API Specification Gaps

### 3.1 Admin Override for Hard Stops (Roadmap 2.1)

**Status:** Resolved

**Resolution:** See [SRS_IMPLEMENTATION_ADMIN_OVERRIDE.md](SRS_IMPLEMENTATION_ADMIN_OVERRIDE.md). Single `forceAdd` + required `overrideReason`; configurable `nonOverridableIneligibilityReasons` on `CommitteeGovernanceConfig`; UX shows display-only checklist of bypassed rules; audit logs `bypassedReasons` + `overrideReason`.

---

## 4. Migration Robustness

### 4.1 Replacement Request Migration (Step 8)

**Status:** Resolved

**Issue:** Migration Step 8 states: "Replacement requests (both add and remove): create two records — (1) REMOVED for removee, (2) SUBMITTED for addee." The current `CommitteeRequest` model may use `addToCommittee` and `removeFromCommittee` (or equivalent). The exact mapping and ordering are not fully specified.

**Resolution:** **Resolved — not applicable.** Committee data will be re-imported (from BOE/MCDC) after the schema change, not migrated. No CommitteeRequest → CommitteeMembership data migration is needed. The new `CommitteeMembership` model handles replacement requests natively at runtime: update removee's membership to `REMOVED`, create `SUBMITTED` for addee — with full status lifecycle, timestamps, and ordering built in.

---

### 4.2 Rollback & Failure Recovery

**Status:** Resolved

**Issue:** Migration strategy does not describe rollback or partial-failure handling for Step 8 (data backfill).

**Considerations:**

- Is the backfill transactional or batched?
- If it fails mid-run, what is the rollback path?
- Should there be a verification step before dropping `committeeId` (Step 9)?

**Resolution:** **Resolved — out of scope.** Rollback and failure recovery are not required. Production data volume is limited and all data can be re-imported from external sources. Documented in [SRS_DATA_MODEL_CHANGES](SRS_DATA_MODEL_CHANGES.md) §5.3.

---

## 5. Deferred / Out-of-Scope Clarifications

### 5.1 Microsoft Access Import (SRS §4.1)

**Status:** Resolved — Out of Scope for v1

**Context:** SRS lists "CSV and Microsoft Access database" as voter data formats. Current implementation scope supports CSV import only. The roadmap does not include Access import in v1.

**Resolution:** Microsoft Access database import is deferred to a future release. v1 supports CSV import only. See [SRS_IMPLEMENTATION_ROADMAP.md — Future Considerations](SRS_IMPLEMENTATION_ROADMAP.md#microsoft-access-database-import) for the deferred work item and [EXTENSIBILITY_ANALYSIS.md](../EXTENSIBILITY_ANALYSIS.md) for effort estimates.

---

### 5.2 Email/Phone Entry During Submission (SRS §9.1)

**Status:** Resolved

**Context:** SRS says "Email and phone may be entered (optional but encouraged)" during leader submission. Earlier implementation review marked this as missing; roadmap now includes this as 2.1a.

**Resolution:** Store in `CommitteeMembership.submissionMetadata` (JSON): `{ email?: string; phone?: string }`. Not saved to `VoterRecord` — voter import overwrites those fields from BOE, so leader-supplied contact would be lost. Metadata preserves it, survives imports, and display logic uses `submissionMetadata?.email ?? voterRecord.email` for rosters/sign-in sheets. See SRS_DATA_MODEL_CHANGES.md CommitteeMembership model and SRS_IMPLEMENTATION_ROADMAP.md §2.1a.

---

### 5.3 Serve ED vs Home ED (Glossary)

**Status:** Partially Resolved

**Context:** Glossary defines "Serve ED" (Election District where member serves) as possibly differing from "Home ED" (residence). Current model does not have a "serve ED" field.

**Resolution:** For v1, treat Serve ED = Home ED (or document as future enhancement if MCDC has different requirements).

**See:** [SRS_SERVE_ED_VS_HOME_ED.md](SRS_SERVE_ED_VS_HOME_ED.md) for design considerations and implementation options.
**Tracking:** [tickets/2.9-serve-ed-vs-home-ed-resolution.md](tickets/2.9-serve-ed-vs-home-ed-resolution.md)

---

## 6. Summary Checklist

| #   | Item                                    | Status                 | Priority | Action                                                                               |
| --- | --------------------------------------- | ---------------------- | -------- | ------------------------------------------------------------------------------------ |
| 1.1 | LTED weight source                      | **Resolved**           | High     | Weighted table source documented (see [SRS_LTED_WEIGHT_SOURCE.md](SRS_LTED_WEIGHT_SOURCE.md)) |
| 1.2 | Voter status field for inactive warning | **Resolved**           | High     | Derived-from-import approach documented (see [SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md](SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md)) |
| 2.1 | Crosswalk data format & source          | **Resolved**           | Medium   | LTED matrix/crosswalk source documented; Phase 2 UI tracked in tickets              |
| 3.1 | Admin override UX/API                   | **Resolved**           | Medium   | See [SRS_IMPLEMENTATION_ADMIN_OVERRIDE.md](SRS_IMPLEMENTATION_ADMIN_OVERRIDE.md)     |
| 4.1 | Replacement request migration spec      | **Resolved**           | —        | N/A — re-importing committee data; new model handles replacements natively           |
| 4.2 | Migration rollback/recovery             | **Resolved**           | Low      | Out of scope (see SRS_DATA_MODEL_CHANGES §5.3)                                       |
| 5.1 | Access import                           | **Resolved**           | Low      | Out of scope for v1; deferred to future phase                                       |
| 5.2 | Email/phone on submission               | **Resolved**           | Low      | Use submissionMetadata (see §5.2)                                                    |
| 5.3 | Serve ED vs Home ED                     | **Partially resolved** | Low      | Finalize via [2.9](tickets/2.9-serve-ed-vs-home-ed-resolution.md); see [SRS_SERVE_ED_VS_HOME_ED.md](SRS_SERVE_ED_VS_HOME_ED.md) |

---

_This document is retained as a consolidated resolution log; active implementation queue is tracked in [tickets/README.md](tickets/README.md)._

## Retirement Gate

This document can be removed from active SRS docs once item 5.3 is no longer `Partially Resolved` and [2.9](tickets/2.9-serve-ed-vs-home-ed-resolution.md) is closed.
