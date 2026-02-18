# SRS UI Planning Gaps — Cross-Reference Mapping

**February 2026**

This document maps each gap from [SRS_UI_PLANNING_GAPS.md](../SRS/SRS_UI_PLANNING_GAPS.md) to the current implementation state and our recommendations. It serves as a checklist for implementation planning.

---

## Mapping Table

| Gap # | SRS Title                                         | Current State                        | Location                                       | Recommendation                                            |
| ----- | ------------------------------------------------- | ------------------------------------ | ---------------------------------------------- | --------------------------------------------------------- |
| 1     | Admin Override UX                                 | Not implemented                      | AddCommitteeForm, handleRequest API            | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) A2         |
| 2     | Meeting Record & Executive Committee Confirmation | One-off accept/reject only           | RequestCard, handleRequest                     | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) R1         |
| 3     | Resignation Workflow UI                           | No resignation flow; generic remove  | CommitteeSelector Remove button                | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) A1         |
| 4     | Structured Removal with Reasons                   | No reason; immediate remove          | CommitteeSelector Remove button                | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) A1         |
| 5     | Petition & Primary Outcome Tracking               | No outcome entry                     | —                                              | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) R2         |
| 6     | BOE Eligibility Flagging Review Queue             | CommitteeUploadDiscrepancy exists    | AdminDataClient > Discrepancies tab            | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) R3         |
| 7     | Committee Term Admin UI                           | No term model                        | —                                              | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) R6         |
| 8     | User Jurisdiction Assignment UI                   | No jurisdiction model                | —                                              | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) R7         |
| 9     | LTED Crosswalk Import UI                          | No crosswalk                         | —                                              | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) R8         |
| 10    | AddCommitteeForm Enhancements                     | No hard stops, warnings, email/phone | AddCommitteeForm.tsx                           | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) A4, A5     |
| 11    | CommitteeSelector Vacancy & Weight Display        | No summary block                     | CommitteeSelector.tsx                          | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) A7         |
| 12    | Leader Empty State                                | Partial (no jurisdictions case)      | CommitteeSelector noContentMessage             | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) A8         |
| 13    | Report Generation UI Additions                    | Existing types only                  | reports, committee-reports, voter-list-reports | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) A10        |
| 14    | Audit Trail UI                                    | No audit UI                          | —                                              | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) R5         |
| 15    | CommitteeSelector Redesign                        | Card-based; no table                 | CommitteeSelector.tsx                          | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) R4 (defer) |
| 16    | Navigation & IA                                   | Flat header; no admin structure      | header.tsx, admin routes                       | [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md) A9, Q1–Q4  |
| 17    | Mobile & Accessibility                            | No explicit specs                    | —                                              | Note in 03; formal audit deferred                         |

---

## Detail: Gap → Current State

### Gap 1 — Admin Override UX

- **Current:** Add fails on hard stop; no override path. handleRequest has no override.
- **Code:** `api/committee/add/route.ts`, `AddCommitteeForm.tsx`
- **Needed:** API param `forceAdd`, `overrideReason`; UI control + reason field; audit log

### Gap 2 — Meeting Record & Confirmation

- **Current:** CommitteeRequest accepts/rejects one-by-one. No MeetingRecord. No bulk.
- **Code:** `RequestCard.tsx`, `api/committee/handleRequest/route.ts`
- **Needed:** MeetingRecord model, meetings page, bulk select, rejection note

### Gap 3 — Resignation Workflow

- **Current:** "Remove" disconnects; no resignation date/method.
- **Code:** `CommitteeSelector` Remove button, `api/committee/remove/route.ts`
- **Needed:** "Record Resignation" action, modal with date + method, status RESIGNED

### Gap 4 — Structured Removal

- **Current:** Remove with no reason.
- **Code:** Same as Gap 3.
- **Needed:** "Remove" opens modal with RemovalReason dropdown + notes for OTHER

### Gap 5 — Petition Outcome

- **Current:** /petitions generates form PDF. No outcome tracking.
- **Code:** `petitions/GeneratePetitionForm.tsx`
- **Needed:** New page for challenger entry + outcome recording; distinct from form gen

### Gap 6 — BOE Eligibility Queue

- **Current:** CommitteeUploadDiscrepancy for bulk upload name/address mismatches.
- **Code:** `CommitteeUploadDiscrepancies.tsx`, `DiscrepancyActionsMenu`
- **Needed:** New flagging model post-BOE import; party/AD/status checks; review queue; Confirm/Dismiss

### Gap 7 — Term Admin

- **Current:** No CommitteeTerm.
- **Needed:** Term CRUD, list, set active

### Gap 8 — Jurisdiction Assignment

- **Current:** No UserJurisdiction. All Admins see all.
- **Needed:** UserJurisdiction model, admin UI to assign cityTown+legDistrict to Leaders

### Gap 9 — Crosswalk Import

- **Current:** No LtedDistrictCrosswalk.
- **Needed:** Resolve format (Gaps 2.1); import UI (file or manual)

### Gap 10 — AddCommitteeForm

- **Current:** Search → results → add. No server hard stops, warnings, email/phone.
- **Code:** `AddCommitteeForm.tsx`
- **Needed:** Hard stop display, warning banners, optional email/phone; prefetch eligibility (optional)

### Gap 11 — Vacancy & Weight

- **Current:** Implicit (4 - count). No weight.
- **Code:** `CommitteeSelector.tsx`, `AddCommitteeForm` (committeeList.length >= 4)
- **Needed:** Summary block with open seats, weight (when 2.7 exists)

### Gap 12 — Leader Empty State

- **Current:** noContentMessage covers "no permission" and "no members". No "no jurisdictions" vs "no committees" distinction.
- **Code:** `CommitteeSelector` noContentMessage
- **Needed:** Two messages based on jurisdiction assignment (requires 3.1)

### Gap 13 — Report UI Additions

- **Current:** ldCommittees, voterList, designatedPetition. No hub links.
- **Code:** `committee-reports/XLSXConfigForm`, `voter-list-reports`, `reports/page`
- **Needed:** Report params matrix; add SignInSheet, DesignationWeightSummary, Vacancy, Changes, PetitionOutcomes; Reports hub links

### Gap 14 — Audit Trail UI

- **Current:** No AuditLog UI.
- **Needed:** /admin/audit with table, filters, detail, export

### Gap 15 — CommitteeSelector Redesign

- **Current:** Card-based. Defer.
- **Constraint:** A7 summary block must be reusable in future table

### Gap 16 — Navigation & IA

- **Current:** Flat header; Data tab; orphaned dashboard/colors; Reports not highlighting on sub-routes.
- **Code:** `header.tsx`
- **Needed:** Tab fixes (Q1, Q2); Reports hub links (Q4); Admin layout/sidebar (A9)

### Gap 17 — Mobile & Accessibility

- **Current:** No explicit a11y specs for new UI.
- **Needed:** Pre-implementation checklist (focus, labels, ARIA); formal audit post-v1

---

## Implementation Checklist (from SRS_UI_PLANNING_GAPS Table)

| Item                             | Doc             | Effort          | Recommendation Ref              |
| -------------------------------- | --------------- | --------------- | ------------------------------- |
| Admin override UX                | Gaps §3.1       | 0.5 day         | A2                              |
| Meeting confirmation flow        | Roadmap 2.4     | 1 day (spec)    | R1                              |
| Resignation form & entry point   | Roadmap 2.3     | 0.5 day         | A1                              |
| Removal form & entry point       | Roadmap 2.5     | 0.5 day         | A1                              |
| Petition outcome page            | New UI spec     | 1–2 days (spec) | R2                              |
| BOE eligibility queue            | Roadmap 2.8     | 1 day (spec)    | R3                              |
| Term management                  | Roadmap 1.1     | 0.5 day         | R6                              |
| Jurisdiction assignment          | Roadmap 3.1     | 0.5 day         | R7                              |
| Crosswalk import                 | After Gaps 2.1  | 0.5 day         | R8                              |
| AddCommitteeForm layout & states | Roadmap 2.1/2.2 | 0.5 day         | A4, A5                          |
| CommitteeSelector vacancy block  | Roadmap 3.1a    | 0.25 day        | A7                              |
| Leader empty states              | Roadmap 3.1     | 0.25 day        | A8                              |
| Report params matrix             | Roadmap 3.2–3.4 | 0.5 day         | A10                             |
| Audit table & filters            | Roadmap 3.5     | 0.5 day         | R5                              |
| Admin IA diagram                 | New doc         | 0.5 day         | A9, 02_INFORMATION_ARCHITECTURE |

---

_This mapping should be updated as gaps are resolved and implementation progresses._
