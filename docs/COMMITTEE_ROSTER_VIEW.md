# Committee Roster View — Implementation Spec

**Status:** Approved for implementation
**Scope:** v1 = single town (city + optional Leg District). County-wide is phase 2.
**Origin:** Product ask — _"Allow committee members to be seen without clicking into the ED level — select town and see the entire committee, could be a load option instead of a preset."_

---

## 1. Goal

Add a town-level **Roster** view to `/committees` that loads every seat — occupied **and** vacant — across all Election Districts (EDs) in a scope at once, rendered as a grouped table. It is an alternative to the existing per-ED **drill-down**, not a replacement.

Two view modes coexist at the town level:

- **Drill down** (today) — City → (Leg District) → ED → one committee, with full detail + mutation (resign/remove/add).
- **Roster** (new) — City → (Leg District) → **Load roster** → all EDs at once, read + navigate.

The data shape is designed **county-ready from day one** so phase 2 (county-wide) is "don't filter to one city" + pagination, not a rewrite.

---

## 2. Visibility & PII boundary (decided — read this first)

| Field | Leader | Admin |
|---|---|---|
| Name, ED, seat number, membership type | ✅ | ✅ |
| Vacant / petitioned-vacant seat status | ✅ | ✅ |
| **Contact (email / phone)** | ❌ | ✅ |
| Row → drill-down **Edit** affordance | ❌ | ✅ |

**Rationale.** Member **names** at jurisdiction scope are already exposed to Leaders via sign-in sheets (`fetchSignInSheetData` + `validateReportJurisdictionAccess` permit `jurisdiction` scope for non-admins), so names in the roster cross no new line. **Contact info is the line we hold** — it is not exposed to Leaders anywhere today, and the roster keeps it that way.

**Implementation requirement — make the contact gate obvious and trivially reversible.** This is a deliberate policy choice that may be revisited (e.g. if Leader outreach becomes a goal). Implement it as a single named flag, not scattered `isAdmin` checks:

```ts
// apps/frontend/src/app/api/committee/roster/route.ts
// POLICY: Contact info (email/phone) is Admin-only in the roster.
// Leaders get names at jurisdiction scope (consistent with sign-in sheets) but NOT contact.
// To expose contact to Leaders, flip this single predicate — do not thread isAdmin elsewhere.
const includeContact = isAdmin;
```

The route builds contact fields only when `includeContact` is true; the frontend renders the Contact column only when the response contains it (`rows[i].contact !== undefined`). One flip of `includeContact` undoes the policy end to end.

**Drill-down stays Admin-only in v1** (member cards remain gated as today). Because the row→drill-down "Edit" link is **Admin-only**, Leaders never land on the existing "Contact an administrator" dead-end. Ungating the drill-down Seat Roster table for Leaders is a clean **future** follow-up, explicitly out of scope here.

---

## 3. Endpoint — `GET /api/committee/roster`

**Auth:** `withPrivilege(PrivilegeLevel.Leader, …)` — same floor as `fetchCommitteeList`.

**Query params**

| Param | v1 | Notes |
|---|---|---|
| `cityTown` | **required** | Missing ⇒ 400. (Precedent: `fetchSignInSheetData` throws without it.) |
| `legDistrict` | required iff `cityTown === "ROCHESTER"` | Otherwise optional. Enforced in `rosterQuerySchema`. |
| `cursor`, `limit` | ignored in v1 | Reserved for phase-2 county-wide pagination. |

**Handler logic**

1. `activeTermId = getActiveTermId()`.
2. `jurisdictions = getUserJurisdictions(userId, activeTermId, privilege)`.
   - Returns `null` for Admin/Developer (no constraint).
   - Returns an array for Leader → build a DB `where` via the new `buildJurisdictionWhere()` helper (§4). Empty array ⇒ `{ OR: [] }` ⇒ matches nothing (correct empty result).
   - If a Leader requests a `cityTown`/`legDistrict` outside their jurisdictions, the `where` AND with the requested scope yields no rows → empty roster (no 403 needed; nothing leaks).
3. `prisma.committeeList.findMany({ where: { termId, cityTown, legDistrict?, ...jurisdictionWhere }, include: { seats: { orderBy: { seatNumber: "asc" } }, memberships: { where: { status: "ACTIVE", termId }, include: { voterRecord: true } } }, orderBy: [{ cityTown }, { legDistrict }, { electionDistrict }] })`.
4. **Flatten to seat rows** (server-side, see `buildSeatRosterRows` §3.1).
5. **PII gating:** build `contact` on each row only when `includeContact` (= `isAdmin`).
6. Return `RosterResponse` (§3.2).

### 3.1 Row construction — `buildSeatRosterRows`

Per committee:

- **Seat synthesis (in-memory, read-only).** If `committee.seats.length === 0`, synthesize virtual vacant seats `1..maxSeatsPerLted` (from governance config). **Never call `ensureSeatsExist`** — it writes (`createMany`); a GET must not mutate.
- For each seat (real or synthesized), find the active membership with matching `seatNumber`:
  - occupied → emit occupant fields.
  - none → emit a **vacant** row (`occupant: null`). If `seat.isPetitioned`, mark `petitionedVacant` for distinct styling.
- **Unassigned members.** Active memberships with `seatNumber: null` don't match any seat. Emit them as extra rows flagged `unassigned: true` so members never vanish (rendered in an "Unassigned" sub-section under their ED).
- **Duplicate-seat integrity.** If two active memberships claim the same `seatNumber`, **throw a data-integrity error** (same condition `computeDesignationWeightFromData` already detects — `designationWeight.ts`). Never silently keep the first. Surface it the way `fetchCommitteeList` does (Sentry capture + `409`), so the roster fails loudly rather than misrepresenting a seat.
- **Contact** (only when `includeContact`): `email = submissionMetadata?.email ?? voterRecord.email`, `phone = submissionMetadata?.phone ?? voterRecord.telephone`. ⚠️ The `VoterRecord` field is **`telephone`** (there is no `phone` on the voter model); only `submissionMetadata` uses `phone`. The API output field stays `phone` for the row. Matches existing sign-in / display rules.

> v1: keep `buildSeatRosterRows` local to the route. Extract to `apps/frontend/src/app/api/lib/` only if report-server needs it too.

### 3.2 Response shape

```ts
type SeatRosterRow = {
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  seatNumber: number | null;        // null only for unassigned rows
  isPetitioned: boolean;
  weight: string | null;            // Decimal serialized
  unassigned?: boolean;
  petitionedVacant?: boolean;       // vacant AND isPetitioned
  occupant: {
    VRCNUM: string;
    firstName: string;
    lastName: string;
    membershipType: MembershipType | null;
  } | null;
  contact?: { email: string | null; phone: string | null }; // present iff Admin
};

type EdRollup = {                   // per-ED subheader summary
  electionDistrict: number;
  legDistrict: number;
  filled: number;                   // seats OCCUPIED (distinct seatNumbers with an active occupant)
  totalSeats: number;
  unassignedCount: number;          // active members with no seatNumber (in the table, not counted in `filled`)
  designationWeight: number | null;
  missingWeightSeatNumbers: number[]; // petitioned seats lacking weight — render "—", not the number
};

type RosterResponse = {
  scope: { cityTown: string; legDistrict?: number };
  rows: SeatRosterRow[];
  edRollups: EdRollup[];
  summary: {
    totalSeats: number;
    filled: number;                 // seats OCCUPIED, not active-member count
    vacant: number;
    edCount: number;
    unassignedCount: number;        // town-wide active members with no seat
  };
};
```

**Counting rules (avoid the "empty ED" trap):** `filled` = count of distinct seats with an active occupant. An active member with `seatNumber: null` is **not** counted in `filled` (it has no seat) but **is** counted in `unassignedCount` and rendered in the table. So an ED with one unassigned active member reads `0/4 filled · 1 unassigned`, never a misleading empty `0/4`.

**Weight display:** the table/rollup renders `—` (not the numeric `designationWeight`) whenever `missingWeightSeatNumbers.length > 0`, matching `CommitteeSummaryBlock`'s deliberate "weight incomplete ≠ zero weight" behavior.

New Zod schema + types live in `~/lib/validations/committee` (`rosterQuerySchema`, `SeatRosterRow`, `RosterResponse`), matching the existing pattern in that file.

---

## 4. Shared helper — `buildJurisdictionWhere()`

Add to `apps/frontend/src/app/api/lib/committeeValidation.ts` (mirrors the existing `committeeMatchesJurisdictions` predicate as a DB filter):

```ts
export function buildJurisdictionWhere(
  jurisdictions: JurisdictionScope[],
): Prisma.CommitteeListWhereInput {
  return {
    OR: jurisdictions.map((j) => ({
      cityTown: j.cityTown,
      ...(j.legDistrict !== null ? { legDistrict: j.legDistrict } : {}),
    })),
  };
}
```

Reuse in the roster route now; migrate `committees/page.tsx`'s client-side filter to it later (out of scope for v1).

**Tests** (`committeeValidation` suite): all-LDs entry (`legDistrict: null`) matches any LD in that town; specific-LD entry matches only that LD; mixed list ORs correctly; empty list matches nothing.

---

## 5. Frontend

### 5.1 View toggle in `CommitteeSelector`

- After City (+ Leg District for Rochester) is selected, render a segmented control: **Drill down** | **Roster**.
- **Drill down:** unchanged — ED dropdown + existing detail/mutation UI.
- **Roster:** hide the ED dropdown; show a **Load roster** button. Clicking fetches `/api/committee/roster`.

New state in the component: `viewMode: "drill" | "roster"`, `rosterData: RosterResponse | null`, `rosterLoading: boolean`.

**Stale-state hygiene:** clear `rosterData` when `selectedCity`/`selectedLegDistrict` changes and when switching back to drill-down, so a stale roster never lingers.

**Fetch style:** plain `fetch` + local state — consistent with the existing `fetchCommitteeList` in this component (not `useApiQuery`, which auto-fires on `enabled`). The button = manual load, matching the "load option, not a preset" ask.

### 5.2 New component — `CommitteeRosterTable.tsx`

Sibling of `CommitteeSummaryBlock`. Pure presentational; easy to unit-test.

**Props:** `{ data: RosterResponse; isAdmin: boolean }`.

**Render:**
- **Header line** from `summary`: `{filled}/{totalSeats} seats filled · {vacant} vacant · {edCount} EDs`.
- **Grouped by ED.** Sticky `ED {n}` subheader per group, with a rollup line from `edRollups`: `{filled}/{totalSeats} filled · weight {designationWeight ?? "—"}`.
- **One `<tr>` per seat:** ED · Seat · Name · Type · **[Contact — only if `isAdmin` and `row.contact` present]**.
  - Vacant → muted `— vacant —`. `petitionedVacant` styled distinctly.
  - Unassigned members → "Unassigned" sub-section at the end of their ED group.
- **Sorting:** within-group only (seat number default; optional name). **No cross-group global sort in v1** (would break sticky ED headers).
- **Row action:** **Edit** link — **Admin only** — switches `viewMode` to `"drill"`, sets `selectedCity/legDistrict/district`, **and calls `fetchCommitteeList(city, ed, legDistrict)`**. ⚠️ Setting selection state alone is not enough — only `fetchCommitteeList` loads the drill-down's memberships/seats (it's what `handleDistrictChange` calls today). Reuse that path so the drill-down lands fully loaded. Leaders see no row link (they act via the existing request/add flow). All mutation stays in drill-down; the roster never duplicates the resign/remove modals.

---

## 6. Build order

1. **`buildJurisdictionWhere()`** helper + tests (§4).
2. **Endpoint** `/api/committee/roster` + `rosterQuerySchema`/types + `__tests__/api/committee/roster.test.ts`.
   Tests: jurisdiction filtering (incl. all-LD + specific-LD mix, empty jurisdictions); vacant-seat emission; **seat synthesis when `seats` empty**; unassigned-member rows + `unassignedCount` (and that they're excluded from `filled`); **duplicate active memberships on one seat ⇒ 409 integrity error**; **`missingWeightSeatNumbers` populated for petitioned seats lacking weight**; contact uses `voterRecord.telephone` fallback; **contact present for Admin / absent for Leader**; term scoping; `cityTown` required (400); Rochester requires `legDistrict`.
3. **`CommitteeRosterTable`** (presentational) + unit tests.
4. **Toggle + load wiring** in `CommitteeSelector`; Admin row→drill-down linkage; stale-state clearing.

---

## 7. Decisions baked in (for the record)

- **One row per seat** — vacancies visible inline; uses the `Seat` model; folds coverage into the roster.
- **Flat grouped table = overview; cards = drill-down detail** — no competing card views.
- **Mutations stay in drill-down** — roster is read + navigate; keeps scope small, no duplicated modals.
- **Contact = Admin-only**, behind a single `includeContact` flag, deliberately easy to reverse (§2).
- **Leaders: names yes, contact no, drill-down Edit no** — consistent with sign-in sheets; no dead-ends.
- **Seat synthesis is read-only/in-memory** — GET never mutates.
- **`filled` = seats occupied, not active-member count** — unassigned members tracked separately (`unassignedCount`) so an ED is never falsely reported empty.
- **`missingWeightSeatNumbers` in rollups** — incomplete weight renders `—`, distinct from zero (mirrors `CommitteeSummaryBlock`).
- **Duplicate active memberships on a seat ⇒ loud 409 integrity error**, never silent first-pick (same condition `computeDesignationWeightFromData` enforces).
- **Voter contact field is `telephone`** (not `phone`); only submission metadata uses `phone`.
- **v1 requires `cityTown`; Rochester requires `legDistrict`.**

---

## 8. Phase 2 — county-wide (not in v1)

- Drop the `cityTown` requirement; no-city scope is **Admin-only**.
- Add `cursor`/`limit` pagination + row virtualization (county = thousands of seats).
- **Contact PII at volume:** likely lazy-load contact per-ED rather than bulk; revisit the `includeContact` policy for the county scope specifically.
- Grouping deepens: City → (Leg District) → ED, collapsible.

## 9. Deferred nice-to-haves

- Roster filters ("vacant only", "petitioned vacant") — v1.1; trivial client-side once rows exist.
- Persist `?view=roster` in URL so refresh keeps the mode.
- Richer town header ("3 EDs with vacancies", "1 ED missing weight") — derivable from the same rows.
- Ungate the drill-down Seat Roster table for Leaders (Option B unification).
