# Branch Architecture & Maintainability Review — `feat/srs-implementation`

**Basis:** `git diff main`, Jul 2026 (doc synced through branch tip `159fa6c`). Reviewable product surface
≈ 24.8k added lines / 172 files after excluding tests, migrations, docs, and lockfiles.
**Axis:** DRY / simplification / architecture only — *not* a correctness or security review.
Findings that touch auth were checked against `skills/auth-check-patterns/SKILL.md`; the
server/client privilege split is consistently correct across the branch and is **not** a
finding here (noted where relevant).

Prior targeted reviews (`docs/AUTH_INVITE_FLOW_REVIEW.md`, `docs/COMMITTEE_DISCREPANCY_UNDO.md`)
were skimmed for dedup; their already-recorded items are not repeated.

## Status at a glance

**Legend:** ✅ Done · 🟡 Partial (core landed; follow-ups listed) · ⬜ Not started · 📋 Backlog (document / ticket, not a refactor push)

| # | Finding | Status | What remains |
|---|---------|--------|--------------|
| 1 | Scoped report registry / dedup | 🟡 Partial | Phase 5 — report-server handler map (`scopeReportHandlers/`) |
| 2 | Membership confirm→activate service | 🟡 Partial | Petition-outcomes path still separate; `forceAdd` not on bulk decisions UI |
| 3 | Party / AD eligibility predicates | ✅ Done | Optional: unify `IneligibilityReason` / `EligibilityFlagReason` (Finding 13) |
| 4 | Tx-aware capacity / active-elsewhere helpers | ✅ Done | — |
| 5 | Designation-weight computation (frontend vs report-server) | ✅ Done | Shared `computeDesignationWeight` in `shared-prisma`; both apps adapt at the edge |
| 6 | `lib/validations/committee.ts` field factories | ⬜ Not started | `legDistrictField`, contact/date factories, etc. |
| 7 | Xlsx importers + upload tabs | ⬜ Not started | Shared parse/normalize + `<XlsxUploadCard>` |
| 8 | Audit write contract + server→UI import | ⬜ Not started | Options-object API, typed metadata, neutral `lib/audit/format.ts` |
| 9 | Admin CRUD route consistency | ⬜ Not started | Envelope, validation, param unwrap, term audit policy |
| 10 | Roster occupant map built twice | ✅ Done | `buildSeatRosterRows` uses shared `indexActiveMembershipsBySeat` |
| 11 | Invite subsystem clones | ⬜ Not started | Shared `lib/invites/`, `unusedInviteWhere`, `classifyInviteState` |
| 12 | Upload-form scaffolding + data tabs IA | ⬜ Not started | `<PresignedUploadReportForm>`, config-driven data tabs |
| 13 | Schema modeling notes | 📋 Backlog | Ticket for membership↔Seat FK; document rest in schema comments |
| 14 | Grouped minor nits | ✅ Done | — |
| B | Discrepancy/undo residual | 🟡 Partial | `buildRemovedMembershipData(reason, notes)` still duplicated |

**Counts:** 5 done · 3 partial · 6 not started · 1 backlog-only

---

## Remediation log

Chronological / granular fixes (superset of the table above).

| Item | Status |
|------|--------|
| Finding 14 — redundant audit zod defaults | ✅ Done (SLAM DUNK) |
| Finding 14 — dead petition-outcomes null guard | ✅ Done (SLAM DUNK) |
| Residual B — `lockDiscrepancyForUpdate` extraction | ✅ Done (SLAM DUNK) |
| Finding 4 note — delete unused capacity helpers | ✅ Done (SLAM DUNK) — non-tx exports removed; tx-aware helpers restored in Finding 4 resolution |
| Finding 4 note — `ALREADY_IN_ANOTHER_COMMITTEE_ERROR` unused | Corrected — constant kept; now also used in meetings/decisions |
| Finding 14 — double `getActiveTermId` in invites + bulk load | ✅ Done (SLAM DUNK) |
| Finding 14 — double config/count fetch in eligibility preflight | ✅ Done (SLAM DUNK) — `runEligibilityPreflight` + `prefetched` on `validateEligibility` |
| Finding 14 — `ACTIVE_STATUS` / write-site literal consolidation | ✅ Done (SLAM DUNK) — `ACTIVE_MEMBERSHIP_STATUS` in `committeeValidation.ts` |
| Finding 14 — inline `isActive: true` term reads → `findActiveTerm` | ✅ Done (SLAM DUNK) |
| Finding 2 — membership confirm→activate service | 🟡 Phase 1 done — `membershipConfirmation.ts`; petition-outcomes deferred |
| Finding 1 — scoped report registry / dedup | 🟡 Phases 1–4 + 3b done — core registry, shared form/pages/grid; Phase 5 report-server deferred |
| Finding 3 — party / AD eligibility predicates | ✅ Done — `eligibilityPredicates.ts`; enum unification deferred |
| Finding 4 — tx-aware capacity / active-elsewhere helpers | ✅ Done — `countActiveMembers`, `isCommitteeAtCapacity`, `isVoterActiveInAnotherCommittee` in `committeeValidation.ts` |
| Finding 5 — designation-weight computation | ✅ Done — `committeeDesignationWeight.ts` in `shared-prisma`; frontend + report-server adapt at the edge |
| Finding 10 — roster occupant map built twice | ✅ Done — shared `indexActiveMembershipsBySeat`; roster passes `seatOccupants` into weight engine |
| Residual B — `buildRemovedMembershipData` extraction | ⬜ Not started — payload still duplicated in undo + `bulkLoadUtils` |

---

## Subsystem map (the decomposition this review rests on)

| # | Subsystem | Primary members |
|---|-----------|-----------------|
| N | Committee membership core | `api/committee/{add,remove,requestAdd,handleRequest,…}`, `api/lib/{committeeValidation,seatUtils,membershipConfirmation,eligibilityService}`, `lib/{eligibility,designationWeight,eligibilityPreflight}`, `shared-prisma/{eligibilityPredicates,committeeDesignationWeight}.ts`, `app/committees/**` |
| K | Reports generation | `api/generateReport`, `scopeReportRegistry.ts`, `ScopedReportForm`, six scoped report pages, `report-server/src/**`, `shared-validators/schemas/report.ts`, `reportTypeMapping.ts` |
| D | Auth / invites / users admin | `api/auth/invite/**`, `lib/applyPendingInvite`, `api/admin/invites`, `admin/users/**`, `auth.ts`, `emailIdentity.ts` |
| C | Audit trail | `lib/{auditLog,auditLogGuard,auditMembershipSubject}`, `api/admin/audit/**`, `admin/audit/**` |
| B | Committee discrepancy + bulk load | `api/admin/{handleCommitteeDiscrepancy,bulkLoadCommittees}/**`, `api/lib/committeeDiscrepancyResolution` |
| I | LTED crosswalk + weighted import | `admin/data/{LtedCrosswalkTab,WeightedTableImport}`, `api/admin/{crosswalk,weightedTable}/**` |
| E | Eligibility flags / BOE flagging | `admin/eligibility-flags/**`, `api/admin/eligibility-flags/**`, `shared-prisma/{boeEligibilityFlagging,eligibilityPredicates}.ts` |
| F | Governance config + terms + jurisdictions | `admin/{governance-config,terms}/**`, `api/admin/{governance-config,terms,jurisdictions}/**` |
| H | Petition outcomes | `admin/petition-outcomes/**`, `api/admin/petition-outcomes/**` |
| G | Meetings / exec confirmation | `admin/meetings/**`, `api/admin/meetings/**` |
| J | Committee roster / seats UI | `api/committee/roster/**`, `CommitteeRosterTable`, `committee-roster-reports/**` |
| L | Admin shell + data import IA | `AdminSidebar`, `admin/{layout,data,dashboard}`, `config/adminNav.ts` |
| M | Shared infra / hooks | `hooks/useApi{Mutation,Query}`, `useFileUpload`, `authcheck`, `committeeUtils` |
| A | Schema (Prisma) | `apps/frontend/prisma/schema.prisma` |

**Deliberately lighter treatment:** **L** and **M** are mostly wiring / shared-infra
plumbing and the branch generally improved them (e.g. `hasPermissionFor` now fails closed,
`AuthCheck` correctly moved to acting privilege, dropdown/formatter helpers de-inlined). **A**
is treated as a modeling-note appendix (Finding 13), not a refactor target — schema changes
carry migration cost that outweighs cosmetic normalization.

---

## Findings (most-severe / highest-leverage first)

### 1. Six report types are threaded in parallel through ~8 hand-maintained surfaces
**Status: 🟡 Partial (Phases 1–4 + 3b done · Phase 5 deferred) · Severity: High · Blast radius: large overall; the frontend slice is a high-leverage extraction**

*Problem description below reflects the pre-refactor state. Frontend forms, pages, grid, and schema
dedup are done; report-server `processJob` branches remain (Phase 5).*

**What & where.** Each of the six scoped reports (`committeeRoster`, `signInSheet`,
`designationWeightSummary`, `vacancyReport`, `changesReport`, `petitionOutcomesReport`) is
re-expressed, near-verbatim, across:

1. Six `*Form.tsx` (~300 lines each) whose `cities`/`legDistricts`/`showLegDistrict`
   `useMemo`s, `handleCityChange`, `validate`, `handleSubmit`, the scope radio group, the
   two `ComboboxDropdown` blocks, the submit/link/spinner, and the `<ReportStatusTracker>`
   success block are **byte-identical** (confirmed directly). Deltas are tiny: the `type`
   literal, 0–2 extra fields, and whether `format` is a `<select>` vs a radio pair.
   `apps/frontend/src/app/vacancy-reports/VacancyReportForm.tsx` etc.
2. Six `page.tsx` server wrappers whose jurisdiction-scoping scaffold (`getActiveTermId` →
   `committeeList.findMany({ where:{ termId }})` → Leader filter via
   `getUserJurisdictions`/`committeeMatchesJurisdictions`) is identical line-for-line
   (confirmed: `changes/sign-in-sheet/vacancy/weight-summary/petition-outcomes/committee-roster`
   `page.tsx` all match at lines 8–45).
3. `components/reports/GenerateReportGrid.tsx` card list.
4. `generateReportSchema` discriminated union (`schemas/report.ts`).
5. `enrichedReportDataSchema` — a **second** 12-variant union re-spreading the same shapes.
6. `REPORT_TYPE_MAPPINGS` (`reportTypeMapping.ts`).
7. `SCOPE_REPORT_TYPES` **and** the `reportLabels` map inline in `api/generateReport/route.ts`
   — two more hand-kept lists of the same six.
8. report-server `processJob` `if/else` branch + a `fetch*Data` + `*Row` type +
   `generate*HTML`/component + `generate*XLSXAndUpload` quintet per type.

**Why it hurts.** Adding or renaming one report is shotgun surgery across ~8 files in two
packages; the four parallel type-lists (`SCOPE_REPORT_TYPES`, `reportLabels`,
`REPORT_TYPE_MAPPINGS`, the two zod unions) can silently fall out of sync. The `format`
control already drifted (three `<select>`, two radios, one hardcoded) and only two of six
forms clear the name error on change — evidence the copies are diverging under maintenance.

**Proposed refactor.**
- **Frontend forms:** extract one `ScopedReportForm` component owning all shared state, the
  city/leg-district memoization, validate/submit, and JSX. Per-report specifics become a
  small descriptor (`{ type, title, formatOptions, extraFields?: FieldSpec[], buildExtraPayload }`).
  The six `*Form.tsx` collapse to a descriptor + `<ScopedReportForm spec={…} />`.
- **Frontend pages:** extract `loadScopedReportPageData(privilege, userId)` returning the
  Leader-filtered `committeeLists`; the six `page.tsx` become one line plus a heading.
- **Type registry:** make one `SCOPE_REPORTS` registry (label, prisma type, filename, form
  spec) the single source; derive `SCOPE_REPORT_TYPES`, `reportLabels`, and
  `REPORT_TYPE_MAPPINGS` from it. Collapse `enrichedReportDataSchema` to
  `generateReportSchema.and(enrichedFieldsSchema)` rather than a hand-copied second union.
- **report-server:** register each report as a `{ fetch, toXlsx, toHtml }` handler in a map
  keyed by type; `processJob` looks up the handler and runs the shared
  `scope-guard → fetch → (xlsx|pdf)` template once instead of five copied branches.

This is the single highest-duplication area in the branch; even doing only the frontend
form+page extraction removes well over a thousand lines of clone.

**Resolution (Phases 1–4 + 3b — done).** Landed the frontend/schema dedup; report-server handler map deferred to Phase 5 follow-up PR.

- **Added:** `packages/shared-validators/src/scopeReportRegistry.ts` (core registry: jurisdiction labels, prisma/filename mapping, format defs); `apps/frontend/src/components/reports/{scopeReportUiRegistry,scopeReportFormSpecs,ScopedReportForm,ScopedReportPageShell}.tsx`; `apps/frontend/src/lib/loadScopedReportPageData.ts`.
- **Removed/thinned:** six route-local `*Form.tsx` files (~1,800 lines); six duplicated `page.tsx` scaffolds → thin shells calling `ScopedReportPageShell`.
- **Derived now:** `SCOPE_REPORT_TYPES` + `ScopeReportType` from `keyof typeof SCOPE_REPORT_REGISTRY`; scope slice of `REPORT_TYPE_MAPPINGS`; `getScopeReportJurisdictionLabel()` (replaces inline `reportLabels` in `generateReport/route.ts`); `generateReportSchema` / `enrichedReportDataSchema` from shared `generateReportVariants` tuple; six scoped grid cards from `SCOPE_REPORT_UI`.
- **Still manual (Phase 5):** report-server `processJob` branches — handler map not yet extracted.
- **Still manual (out of scope):** non-scope reports in grid/mapping (`voterList`, `designatedPetition`, `ldCommittees`, etc.); individual Zod schema variants per report type.
- **Key decisions:** narrow core registry (no UI routes in shared-validators); frontend `SCOPE_REPORT_UI` for pages/grid; API-level `cityTown` required when `scope === jurisdiction` via union-level `superRefine`; page loader uses `buildJurisdictionWhere()` DB-side; format controls standardized to `<select>` from registry (Phase 3b); name-error clearing on all forms.
- **Deferred:** Phase 5 — `scopeReportHandlers/` map in report-server (requires golden HTML snapshots first).
- **Test evidence:** `scopeReportRegistry.test.ts`; enriched schema + cityTown rejection in `schemas/report.test.ts`; `loadScopedReportPageData.test.ts` (Leader fail-closed, DB-side filter, Admin load); retargeted `ScopedReportForm` tests; API `generateReport` cityTown 400 test.

---

### 2. Membership "confirm → activate" is re-implemented in three places instead of one service
**Status: 🟡 Partial (Phase 1 done · petition-outcomes + `forceAdd` gap remain) · Severity: High (behavioral drift, not just duplication) · Blast radius: medium**

*Problem description below reflects the pre-refactor state. `handleRequest` and meetings/decisions
now share `membershipConfirmation.ts`; petition-outcomes still has its own path.*

**What & where.** The SUBMITTED→ACTIVE (and →REJECTED) membership transition exists as three
parallel implementations that share primitives but not a service:
- `api/committee/handleRequest/route.ts` — the fullest version: `FOR UPDATE` lock on
  `CommitteeList`, explicit capacity count vs `config.maxSeatsPerLted`, in-tx re-fetch,
  "active in another committee" pre-check, replacement-target removal, warning-snapshot
  persistence, admin `forceAdd` override.
- `api/admin/meetings/[meetingId]/decisions/route.ts` — a **thinner copy**: same
  `validateEligibility` → `ensureSeatsExist` → `assignNextAvailableSeat` → update-to-ACTIVE →
  identical `MEMBER_CONFIRMED`+`MEMBER_ACTIVATED` audit pair, but **omits** the row lock,
  capacity count, and replacement logic (relies solely on `assignNextAvailableSeat` throwing).
- `api/admin/petition-outcomes/record/route.ts` — a third upsert-to-ACTIVE path with its own
  seat/audit handling.

**Why it hurts.** These must stay behaviorally identical but are guaranteed to drift — the
meetings path already has weaker concurrency/capacity guarantees than `handleRequest` for what
is conceptually the same operation. A future rule change (e.g. a new eligibility gate at
confirmation) has to be found and re-applied in three hand-written transaction bodies.

**Proposed refactor.** Extract a `confirmMembership(tx, { membershipId, actor, meetingRecordId? })`
(and a matching `rejectMembership`) into `api/lib` that owns: status guard, eligibility
re-check, seat ensure/assign, capacity + "active elsewhere" guards, the update, and the
`MEMBER_CONFIRMED`/`MEMBER_ACTIVATED` audit pair with `mergeAuditMetadata`. `handleRequest`,
`meetings/decisions` (looped), and the petition winner path all call it. Replacement-target
removal and `forceAdd` stay as caller-supplied options so the service stays the one authority
on the transition.

**Resolution (Phase 1 — done).** Implemented as `confirmSubmittedMembership` /
`rejectSubmittedMembership` in `apps/frontend/src/app/api/lib/membershipConfirmation.ts`.
Both appointment paths now call the shared service:

- **Callers:** `api/committee/handleRequest/route.ts` and
  `api/admin/meetings/[meetingId]/decisions/route.ts` (thin wrappers: pre-tx eligibility,
  `getGovernanceConfig()` once → `maxSeats`, HTTP / per-item result mapping).
- **Not done:** `api/admin/petition-outcomes/record/route.ts` — different domain flow
  (upsert-by-seat, `PETITIONED`, fixed seat, `PETITION_RECORDED` audit). Optional Phase 2:
  shared `logMemberActivatedAudit` helper only.
- **Key decisions:** caller-provided `maxSeats` and caller-resolved `membershipType` (no
  service default); `logAuditEventOrThrow` for all service audit writes; richer reject
  before-snapshot; `fetchMembershipAuditSubject(tx, …)` inside the service; bulk
  `atCapacity` returns handled per-item failure + `continue` (writes REJECTED + audit, does
  not roll back batch).
- **Not done:** `forceAdd` not exposed on bulk decisions UI/schema.

---

### 3. Eligibility predicates (party / assembly-district) are duplicated with drift
**Status: ✅ Done (optional enum unification deferred) · Severity: High (rule divergence) · Blast radius: small — extract two predicates**

*Problem description below reflects the pre-refactor state. Shared predicates now live in
`eligibilityPredicates.ts`.*

**What & where.** The party-match and assembly-district-match rules are implemented twice from
the same `CommitteeGovernanceConfig` inputs, once as an admission gate and once as a standing
audit, with subtly different code:
- `lib/eligibility.ts` (`validateEligibility`): `(voter.party ?? "").trim() !== (config.requiredPartyCode ?? "").trim()`
  and a per-call `findUnique` crosswalk compare.
- `packages/shared-prisma/src/boeEligibilityFlagging.ts` (`detectFlagsForMembership`): the same
  intent via `normalizeText(...)` and a preloaded `crosswalkByKey` map.

The inactivity rule (`isVoterPossiblyInactive`) is *correctly* shared via
`eligibilityService.ts` → `@voter-file-tool/shared-prisma`; only these two predicates are
forked. Two enums (`IneligibilityReason` vs `EligibilityFlagReason`) also independently encode
`PARTY_MISMATCH` / `ASSEMBLY_DISTRICT_MISMATCH`.

**Why it hurts.** The admission gate and the standing-membership audit can silently disagree
about who is eligible — the worst kind of duplication because the two answers are supposed to
match by definition.

**Proposed refactor.** Add `checkParty(voter, config)` and
`checkAssemblyDistrict(voter, crosswalk, config)` predicates to the shared package (co-located
with `isVoterPossiblyInactive`); both `validateEligibility` and `detectFlagsForMembership` call
them, mapping the shared boolean to their respective enum. Consider a single shared reason enum
with a `{ hardStop | flag }` classification rather than two overlapping enums.

**Resolution (done).** Shared predicates landed in `packages/shared-prisma/src/eligibilityPredicates.ts`
as `isPartyMismatch` and `isAssemblyDistrictMismatch` (plus `normalizeEligibilityText`). Both
admission gate (`lib/eligibility.ts` via `eligibilityService.ts`) and BOE standing audit
(`boeEligibilityFlagging.ts`) call them; each maps the boolean to its own enum
(`IneligibilityReason` vs `EligibilityFlagReason`).

- **Key decisions:** trim-only comparison (not case-insensitive) — `"dem"` vs `"DEM"` is a
  mismatch; empty expected AD counts as mismatch when AD check is enabled.
- **Optional follow-up:** single shared reason enum with `{ hardStop | flag }` classification (Finding 13
  note still applies).
- **Test evidence:** `eligibilityPredicates.test.ts`; whitespace/sharp-edge cases in
  `eligibility.test.ts` and `boeEligibilityFlagging.test.ts`.

---

### 4. Capacity / "active in another committee" checks re-inlined 3–4× because the shared helpers aren't transaction-aware
**Status: ✅ Done · Severity: Medium-High · Blast radius: several call sites, each a small edit**

*Problem description below reflects the pre-refactor state. Tx-aware helpers in
`committeeValidation.ts` replaced all inline copies.*

**What & where.** Transactional callers re-inline the "at capacity" / "already seated elsewhere"
predicates because shared helpers lacked tx support (Finding 4). The former non-tx exports
`countActiveMembers`, `isVoterActiveInAnotherCommittee`, and deprecated `isVoterInAnotherCommittee`
were **removed** in the SLAM DUNK pass (zero call sites). Inline copies remain at:
- `lib/eligibility.ts` (non-tx, in `validateEligibility`).
- `api/committee/add/route.ts` and `handleRequest/route.ts` (in-tx re-checks under `FOR UPDATE`).
- `api/admin/handleCommitteeDiscrepancy/route.ts` (in-tx).
- `api/admin/bulkLoadCommittees/bulkLoadUtils.ts` (a third inline "active elsewhere" `findFirst`).

`ALREADY_IN_ANOTHER_COMMITTEE_ERROR` is used in `handleCommitteeDiscrepancy/route.ts` and
`meetings/[meetingId]/decisions/route.ts` (not unused).

**Why it hurts.** Five copies of the "at capacity" / "already seated elsewhere" predicate;
`maxSeatsPerLted` comparison and the `status:"ACTIVE"` filter are re-typed each time.

**Proposed refactor.** Give the helpers an optional `client: Prisma.TransactionClient = prisma`
parameter (the pattern `logAuditEvent` already uses) so both tx and non-tx callers share one
implementation, then replace the inline copies.

**Resolution (done).** Tx-aware helpers restored in `apps/frontend/src/app/api/lib/committeeValidation.ts`:
`countActiveMembers`, `isCommitteeAtCapacity`, and `isVoterActiveInAnotherCommittee`, each with
an optional `client` parameter (default `prisma`). Inline copies replaced at all former sites:

- **Callers:** `lib/eligibility.ts` (non-tx preflight); `api/committee/add/route.ts`;
  `api/admin/handleCommitteeDiscrepancy/route.ts`; `api/admin/bulkLoadCommittees/bulkLoadUtils.ts`;
  `api/lib/membershipConfirmation.ts` (used by `handleRequest` and meetings/decisions).
- **`eligibility/route.ts`:** still imports `countActiveMembers` for the snapshot payload (duplicate fetch vs `validateEligibility` — was Finding 14; fixed via `runEligibilityPreflight` / `prefetched`).
- **Test evidence:** `committeeValidation.membershipChecks.test.ts`.

---

### 5. Designation-weight computation is implemented twice (frontend vs report-server)
**Status: ✅ Done · Severity: Medium · Blast radius: medium (cross-package)**

*Problem description below reflects the pre-refactor state. The shared engine and edge adapters
landed in `159fa6c`; also resolves Finding 10.*

**What & where.** The seat-weight/contribution rule exists as two full implementations:
- `apps/frontend/src/lib/designationWeight.ts` — `computeDesignationWeightFromData` (+
  `SeatContribution`, `DesignationWeightResult`), used by `add`/roster.
- `apps/report-server/src/committeeMappingHelpers.ts` — `computeDesignationWeight` (+
  `SeatWeightBreakdown`, `DesignationWeightSummary`), used by the weight-summary report.

The result shapes are field-for-field parallel (`seatNumber`, `isPetitioned`, `isOccupied`,
`occupantMembershipType`, `seatWeight`, `contributes`, `contributionWeight`,
`missingWeightSeatNumbers`). Separately, within the frontend, `buildSeatRosterRows` rebuilds an
occupant-by-seat map that `computeDesignationWeightFromData` already computed on the same data
(Finding 10).

**Why it hurts.** The weighted-vote total is a legally meaningful number; two copies of its
rule in two deployables invite exactly the drift that produces "the roster page and the report
disagree." The `contributes`/`contributionWeight` logic is non-trivial and easy to edit in one
place only.

**Proposed refactor.** Move the pure computation into `@voter-file-tool/shared-prisma` (or
`shared-validators`) as the single `computeDesignationWeight(seats, memberships, opts)`; both the
frontend lib and `committeeMappingHelpers` re-export/consume it and adapt to their DTO at the
edge. Have `buildSeatRosterRows` consume `designation.seats[].isOccupied/occupant` rather than
rebuild `occupantBySeat`.

**Resolution (done).** The pure rule now lives once in
`packages/shared-prisma/src/committeeDesignationWeight.ts` as
`computeDesignationWeight({ seats, memberships, context })` returning `DesignationWeightResult`
(with canonical `SeatContribution` / `OccupantMembershipType` types). Placed in `shared-prisma`
(not `shared-validators`) so runtime `Prisma.Decimal` math stays off the client-imported
validators barrel. Both deployables adapt at the edge and hold no rule of their own:
- `apps/frontend/src/lib/designationWeight.ts` — `computeDesignationWeightFromData` is now a thin
  adapter over the shared engine and re-exports `SeatContribution` / `DesignationWeightResult`;
  the DB-fetching `calculateDesignationWeight` wrapper is unchanged.
- `apps/report-server/src/committeeMappingHelpers.ts` — `computeDesignationWeight(committee)`
  delegates to the shared core and only wraps the result with report identity fields;
  `SeatWeightBreakdown` is now `= SeatContribution` (the prior `occupantMembershipType: string | null`
  is narrowed to the enum, a no-op since `MembershipType` has only `PETITIONED`/`APPOINTED`).

- **Test evidence:** `committeeDesignationWeight.test.ts` (10); frontend
  `designationWeight.test.ts` (10) + `roster.test.ts` (18); report-server
  `committeeMappingHelpers.test.ts` (25, includes weight path). `report-server` + `frontend`
  typecheck clean.

---

### 6. `lib/validations/committee.ts` rebuilds the same zod field logic repeatedly
**Status: ⬜ Not started · Severity: Medium · Blast radius: small (local field factories)**

**What & where.** This 663-line file (the branch's biggest validator) repeats field logic:
- The `legDistrict` `union→refine→transform→pipe` block is **identical** in
  `committeeDataSchema`, `removeCommitteeDataSchema`, `resignCommitteeDataSchema`; two *other*
  divergent `legDistrict` shapes appear in `committeeRequestDataSchema`/`assignJurisdictionSchema`
  and in `fetchCommitteeListQuerySchema`/`rosterQuerySchema` — three encodings of one concept.
- email/phone "optional + strip-empty `.transform`" duplicated in `committeeDataSchema` and
  `committeeRequestDataSchema`.
- ISO-date `.refine` appears three times (`isoDateString`, `meetingIsoDateString`, inline
  `primaryDate`) — `meetingIsoDateString` differs only in its message string.
- "notes required when reason is Other" `superRefine` duplicated (remove vs resign); the
  duplicate-id `superRefine` duplicated (petition vs bulk decisions).
- `createTermSchema` is defined **inline** in `api/admin/terms/route.ts` instead of here.

**Why it hurts.** Three `legDistrict` variants mean three different coercion behaviors for the
same field depending on which endpoint you hit — a real inconsistency, not just verbosity.

**Proposed refactor.** Provide field factories: `legDistrictField()`, `isoDateField(msg)`,
`optionalContact()`, `notesRequiredWhenOther(...)`, `uniqueByIdRefine(path)`. Pick one
`legDistrict` semantics and use the factory everywhere. Relocate `createTermSchema` into the
validations module for consistency with its siblings.

**Not started.**

---

### 7. The two xlsx importers (and their upload tabs) share a copy-pasted skeleton
**Status: ✅ Done · Severity: Medium · Blast radius: medium**

**What & where.** `api/admin/crosswalk/import/route.ts` and
`api/admin/weightedTable/import/route.ts` each contain a **byte-identical** `TOWN_CODE_TO_CITY`
map (21 entries), near-identical `normalizeTownCode`/`toCityTown`/`isUploadFile`, and the same
xlsx boot sequence (`isUploadFile` guard → `Buffer.from(arrayBuffer)` → `xlsx.read` →
`NEW_LTED_Matrix ?? SheetNames[0]` → `sheet_to_json` → per-row loop with `a ?? A ?? ""` header
fallbacks). Their client tabs `LtedCrosswalkTab.tsx` and `WeightedTableImport.tsx` duplicate the
`.xlsx`-extension guard, FormData submit, and the `Card`/`form`/`Input[type=file]`/`Alert` JSX.
The town-normalizer copies have even drifted (weighted's `/^\d+$/` version is stricter than
crosswalk's). An existing `useFileUpload` hook fits neither (it's a presigned-S3 two-step, not
multipart) and is unused by both.

**Why it hurts.** Two importers, two subtly different town normalizers, two upload UIs to keep
in sync; the divergence is already present.

**Proposed refactor.** Extract `parseXlsxUpload(file, { sheetPreference })` returning typed rows
(server) and the shared `TOWN_CODE_TO_CITY`/town-normalizer helpers into one module (the stricter
weighted version wins). Extract a `<XlsxUploadCard field endpoint accept onResult />` client
component that both tabs render. Leave per-row business logic (`parseRow` vs weight resolution)
in each route.

**Done (2026-07-07).** Shared server lib at `lib/lted/` (`monroeTownCodes.ts`, `digitParsing.ts`, `xlsxUpload.ts`); stricter digit parsing unified across crosswalk, weightedTable, and `seedLtedCrosswalk.ts`; client `<XlsxUploadCard />` at `components/admin/XlsxUploadCard.tsx` used by both tabs. Per-row business logic remains in each route.

---

### 8. Audit write contract is positional + inconsistently used, and the server depends on a client-UI module
**Status: ⬜ Not started · Severity: Medium · Blast radius: small-medium**

**What & where.**
- `logAuditEvent(userId, userRole, action, entityType, entityId, before?, after?, metadata?, client?)`
  is a **9-positional-argument** signature — easy to mis-order (`before`/`after` are adjacent
  same-typed optionals).
- Two write styles coexist: interactive paths use `logAuditEvent`/`logAuditEventOrThrow`, but
  the BOE auto-resolve path **hand-rolls `db.auditLog.create`** directly, and its metadata keys
  drift (`actorUserId` vs the reviewer path's `reviewerUserId`).
- `api/admin/audit/export/route.ts` imports `buildSummary` and `AUDIT_ACTION_LABELS` from
  `~/app/admin/audit/auditUtils` — a **server route depending on a client `app/admin/**` UI
  module**. Single source of truth for labels, but the layering is inverted.

**Why it hurts.** Call sites are fragile (arg order) and metadata shapes are unenforced, so the
audit reader's `switch`/`extractMembershipSubject` silently misses events that used a different
key. The server→UI import couples report export to a display module.

**Proposed refactor.** Convert `logAuditEvent` to a single options object
(`logAuditEvent({ actor, action, entity, before, after, metadata, client })`); route the BOE
auto-resolve through it. Define a typed `AuditMetadata` per action (or at least shared key
constants) so `reviewerUserId`/`actorUserId` converge. Move `AUDIT_ACTION_LABELS` + `buildSummary`
into a framework-neutral module (e.g. `lib/audit/format.ts`) that both the client and the export
route import, so the route no longer reaches into `app/admin`.

**Not started.**

---

### 9. Admin CRUD routes drift in envelope, validation style, and audit coverage
**Status: ⬜ Not started · Severity: Medium · Blast radius: medium**

**What & where.** Across `governance-config`, `terms`, `terms/[id]`, `jurisdictions`,
`jurisdictions/[id]`:
- Response envelope is inconsistent: `{ error }` (terms) vs `{ success:false, error }`
  (jurisdictions) vs governance-config's own `{ success:false, error, fieldErrors }`.
- Validation dispatch has two incompatible styles: `validateRequest` (used by terms/jurisdictions)
  **discards field-level errors** and returns a fixed 422, while governance-config hand-rolls a
  richer `toFieldErrors`/`validationErrorResponse` path.
- The JSON-parse guard, the `[id]` param-unwrap (`type RouteContext = { params?: Promise<{id}> }`
  → `contextArgs[0]` → `await params` → 404), and the `findUnique → 404` guard are each
  duplicated verbatim across these files (and the meetings `[meetingId]` routes).
- Term create/set-active mutations write **no audit log**, while jurisdiction and governance
  mutations do — an inconsistency in what's considered auditable.

**Why it hurts.** Clients must handle two response shapes; two validation paths mean some
endpoints surface field errors and others don't; the param-unwrap boilerplate is re-tested and
re-copied per route.

**Proposed refactor.** Standardize one `apiError`/`apiOk` envelope and one `validateRequest`
that always returns field errors (fold governance-config's richer path into it). Extract a
`withRouteParams<T>(handler)` (or `parseRouteParams(contextArgs)`) helper for the `[id]` unwrap.
Decide the audit policy for term mutations and apply it (add `TERM_CREATED`/activation events, or
document the exemption).

**Not started.**

---

### 10. Roster occupant map built twice per committee
**Status: ✅ Done · Severity: Low-Medium · Blast radius: small**

*Problem description below reflects the pre-refactor state. Resolved alongside Finding 5 in
`159fa6c`.*

**What & where.** `buildSeatRosterRows` builds `occupantBySeat` over `committee.memberships`,
but it already calls `computeDesignationWeightFromData`, which builds its own `seatOccupants`
map + `isOccupied` over the same data. Each committee's occupancy is derived twice.

**Why it hurts.** Two occupancy derivations to keep consistent (vacancy vs contribution logic);
minor redundant work per committee.

**Proposed refactor.** Have `computeDesignationWeightFromData` expose per-seat
`occupant`/`isOccupied` in its `seats[]` result and let `buildSeatRosterRows` consume it (ties
into Finding 5's shared computation).

**Resolution (done).** Resolved via a small deviation from the original proposal: rather than thread the full
occupant object through `seats[]` (the `DesignationWeightResult` is serialized directly into API
responses, so it must stay occupant-free), the *occupant-indexing routine* was extracted to
`indexActiveMembershipsBySeat` in `shared-prisma`. The shared `computeDesignationWeight` uses
it for its integrity check, and `buildSeatRosterRows` builds the map once and passes it into
the weight engine (via `seatOccupants`) for its `occupantBySeat` lookup — so the indexing logic
(and the duplicate-seat guard) exists in exactly one place per committee. `unassignedMembers`
is derived from the same `memberships` in one pass.

- **Test evidence:** duplicate-seat 409 and single-pass occupancy covered in `roster.test.ts`;
  `indexActiveMembershipsBySeat` unit cases in `committeeDesignationWeight.test.ts`.

---

### 11. Invite subsystem carries verbatim clones after the users/data move
**Status: ⬜ Not started · Severity: Low-Medium · Blast radius: small**

**What & where.** `admin/users/InviteManagement.tsx` and `auth/invite/[token]/page.tsx` both
contain a **byte-identical** `getPrivilegeColor` switch, an identical `jurisdictionLabel`, and a
duplicated `SerializedInviteJurisdiction` type; `formatDate` is near-duplicated. The
"valid unused invite" predicate is expressed three ways (`unusedInviteWhere` in
`applyPendingInvite.ts`, re-inlined in `grantInvite`, and twice more in
`api/admin/invites/route.ts`), and the deleted/expired/used sequential check is duplicated
between `loadValidUnusedInvite` and `loadInviteForApply`. (Email canonicalization itself is
correctly centralized in `emailIdentity.ts` — not a finding.)

**Why it hurts.** Privilege→color and jurisdiction labels will drift between the invite-accept
page and the admin table; the invite-validity predicate has four maintenance points.

**Proposed refactor.** Move `getPrivilegeColor`, `jurisdictionLabel`, and
`SerializedInviteJurisdiction` into a shared `lib/invites/` (or reuse `formatJurisdictionNotFoundMessage`'s
neighbor). Export `unusedInviteWhere` and use it at all four sites. Factor the
deleted/expired/used ladder into one `classifyInviteState(invite, { allowSameEmailUsed })`.

**Not started.**

---

### 12. Upload-form scaffolding duplicated; admin data tabs hand-wired while nav is config-driven
**Status: ✅ Done · Severity: Low-Medium · Blast radius: small**

**What & where.** `admin/data/VoterImport.tsx` and `AbsenteeReport.tsx` are near-identical
(`useFileUpload` + `useApiMutation("/api/generateReport")`, same name/error/success state, same
file-picker block with the four-way isUploading/fileKey/file/empty ternary), differing only in
fields/endpoint/size/report-type. Separately, `config/adminNav.ts` drives the sidebar from a
config array, but `AdminDataClient.tsx` hand-wires a `grid-cols-6` of `TabsTrigger`/`TabsContent`
that must be manually kept in sync — two conventions for the same "list of admin destinations."

**Why it hurts.** The two upload forms drift; the tab list needs manual `grid-cols-N` bookkeeping.

**Proposed refactor.** Extract a `<PresignedUploadReportForm spec={…} />` for the two import
forms. Drive the data tabs from a `dataTabs` config array (mirroring `adminNav.ts`) so the
`TabsList` width and trigger/content pairs are generated.

**Resolution (done).** Extracted `PresignedUploadReportForm` in
`components/admin/PresignedUploadReportForm.tsx`; `VoterImport` and `AbsenteeReport` are now thin
spec wrappers. Added `admin/data/adminDataTabs.tsx` registry with co-located `render` functions;
`AdminDataClient` maps triggers/content from the registry with dynamic `gridTemplateColumns` (no
manual `grid-cols-N`, no config/switch drift).

---

### 13. Schema modeling notes (accept-or-document, not a refactor push)
**Status: 📋 Backlog — ticket / document, not an active refactor · Severity: Low (mostly) · Blast radius: high if changed**

From `apps/frontend/prisma/schema.prisma`. Flagged for awareness; most are deliberate
denormalizations:
- **Membership→Seat has no FK.** `CommitteeMembership.seatNumber` /`petitionSeatNumber` and
  `Seat.seatNumber` are loose `Int`s with no relation — the "membership occupies seat" link is
  by-convention only, which is why occupancy is recomputed in code (Findings 5/10). *Worth a
  ticket* — the strongest of these.
- **Status vs timestamps** (`status` enum duplicates `confirmedAt/activatedAt/…` presence) — two
  sources of lifecycle truth.
- **`termId` on both `CommitteeList` and `CommitteeMembership`/`Seat`** with no cross-constraint
  that they agree.
- **`UserJurisdiction` vs `InviteJurisdiction`** are near-identical join tables (invite = pending
  copy of user scope); acceptable but note the shared shape if either changes.
- **`EligibilityFlag` duplicates `committeeListId`/`voterRecordId`/`termId`** already reachable via
  `membership` — intentional for indexing.
- **`IneligibilityReason` vs `EligibilityFlagReason`** overlap — predicates now shared (Finding 3);
  enum unification still deferred.

**Recommendation.** File a ticket for the membership↔Seat FK; document the rest as intentional in
the schema comments so future readers don't "fix" them by accident.

**Not started** (except predicate sharing from Finding 3). No schema FK ticket filed yet.

---

### 14. Grouped minor nits
**Status: ✅ Done · Severity: Low · Blast radius: trivial**

All items below were resolved in the SLAM DUNK pass. Kept for audit trail only.

- ~~**Double config/count fetch:** `api/committee/eligibility/route.ts` assembles the snapshot
  inline by re-querying `getGovernanceConfig` and the active-member count that
  `validateEligibility` already fetched in the same request. `eligibilityPreflight.ts` is
  types-only — move the snapshot assembly into a helper there and reuse the values.~~ ✅
- ~~**Dead branch:** `admin/petition-outcomes/page.tsx` guards `if (activeTermId == null)`, but
  `getActiveTermId(): Promise<string>` *throws* rather than returning null — the branch is
  unreachable.~~ ✅ (Same pattern in a couple of other pages that wrap it in try/catch instead.)
- ~~**`const ACTIVE_STATUS = "ACTIVE"`** declared independently in `committeeValidation.ts` and
  `seatUtils.ts` (capacity helpers now use the former); literal `"ACTIVE"` still hardcoded at
  mutation/write sites — one shared constant.~~ ✅ — `ACTIVE_MEMBERSHIP_STATUS`
- ~~**Redundant zod defaults:** `validations/audit.ts` applies `.default(...)` twice on
  `page`/`pageSize` (on the shared const and again inline).~~ ✅
- ~~**Inline `where:{ isActive:true }` term reads** — actual duplicate-read candidates:
  `admin/eligibility-flags/page.tsx` (`findFirst` with graceful empty UI) and
  `auth/invite/[token]/apply/route.ts` (tx-scoped read with `StaleInviteScopeError`).
  *Not* candidates: `terms/[id]/route.ts` (deactivate-all write path) and `admin/users/page.tsx`
  (selects `isActive` on all terms for dropdown labels).~~ ✅ — `findActiveTerm`
- ~~**Double `getActiveTermId` in same request:** `api/admin/invites/route.ts` (Leader + jurisdictions)
  and `bulkLoadCommittees` route + `bulkLoadUtils.ts`.~~ ✅

---

## What's already good (so it isn't "fixed" back into duplication)
- `getActiveTermId()` is a genuinely shared helper adopted at ~20 sites.
- Data-fetching is largely routed through `useApiMutation`/`useApiQuery`; the report forms use
  the shared mutation hook rather than hand-rolled `fetch`.
- Eligibility rules are correctly shared via `shared-prisma`: inactivity
  (`isVoterPossiblyInactive`), party mismatch (`isPartyMismatch`), and AD mismatch
  (`isAssemblyDistrictMismatch`); `eligibilityService.ts` is a clean re-export shim.
- Capacity / active-elsewhere predicates (`countActiveMembers`, `isCommitteeAtCapacity`,
  `isVoterActiveInAnotherCommittee`) are centralized in `committeeValidation.ts` with optional tx
  client — admission, preflight, discrepancy resolve, bulk load, and membership confirmation all
  share one implementation.
- Designation-weight rule and occupant indexing live once in `shared-prisma`
  (`computeDesignationWeight`, `indexActiveMembershipsBySeat`); frontend `designationWeight.ts`
  and report-server `committeeMappingHelpers.ts` are thin adapters only.
- `hasPermissionFor` now fails closed and `AuthCheck` correctly gates on acting privilege — the
  server/client privilege split is consistent branch-wide.
- Discrepancy resolve/undo share their snapshot/restore logic through
  `committeeDiscrepancyResolution.ts` (including `lockDiscrepancyForUpdate` since SLAM DUNK pass).

**Residual in B (discrepancy/undo) — 🟡 partial:** `lockDiscrepancyForUpdate` ✅ extracted to
`committeeDiscrepancyResolution.ts`. The REMOVED-membership payload is still duplicated between
`undo` and `bulkLoadUtils` — extract a `buildRemovedMembershipData(reason, notes)` alongside the
existing shared helpers (small, low-risk).
