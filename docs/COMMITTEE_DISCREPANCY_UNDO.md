# Committee Discrepancy Undo — Implementation Plan

## Goal

Let an admin **undo** a committee-upload discrepancy decision (Accept, Accept &
Update Address, or Reject).

- **Data layer:** undo is possible while every mutation it must reverse is still
  reversible — i.e. the resolved membership row is unchanged. Address is handled
  leniently: a manual address edit does **not** block undo (see "Address
  reversal"). A soft-resolved discrepancy retains everything needed to reverse it.
- **UI (for now):** undo is **session-only** — an **Undo** button rendered next
  to the "Accepted, record saved to committee" / "Rejected, record not saved"
  status text. After a page refresh the button is gone, even though the backend
  could still reverse the row. A persistent "resolved history" UI is out of
  scope for this pass. *(Do not treat missing Undo after refresh as a bug — see
  §6.)*

## What we cut, and why

An earlier draft of this plan guarded undo with a **committee-wide roster
fingerprint**, a **codebase-wide roster-lock rollout**, and an
**absent-from-upload sweep**. All three were dropped. Rationale:

- **Undo never grows the active roster.** It always takes the row that resolve
  activated (`created` or `reactivated`) *back down* to a non-active status. So
  undo cannot violate capacity or create an active seat collision. Current roster
  and seat-assignment code treats only `ACTIVE` memberships as occupying seats;
  restoring a historical `seatNumber` onto a non-active membership is audit
  restoration, not active seat assignment.
- **The fingerprint only added *conservative refusal*, not safety.** It refused
  undo whenever anything unrelated on the committee moved. Every mutation undo
  actually performs is guarded locally and cheaply (membership match + address
  equality), so the broad refusal protected no data — it just annoyed admins.
  **Cut:** `committeeRosterAtResolve` snapshot and the
  rebuild-and-compare algorithm.
- **The lock-everywhere refactor bought a guarantee v1 never claimed.** Touching
  ~7 route families to serialize on the committee row is a large blast radius.
  Locking the committee row in **resolve + undo only** (resolve already does
  this) plus a `FOR UPDATE` on the reversed membership row gives strong-enough
  serialization for the row being reversed. The residual race is the same one the
  fuller design already conceded for v1 — so we pay the same honest caveat
  without the refactor. **Cut:** shared `lockCommitteeRoster` helper applied
  across add/remove/request/handle/bulk-sync/meeting/petition/eligibility.
- **The absent sweep closed undo for *meaningfulness*, not safety.** Proactively
  marking "this voter left the upload, close undo" is unnecessary: the targeted
  guards already keep any such undo *safe* (just possibly stale), and a
  session-only UI is stale-by-design after refresh anyway. **Cut:**
  `undoClosedAt` / `undoClosedReason`, the sweep transaction step, the
  `undo_closed` reason, and the `@@index([committeeId, resolvedAt])`.

What survives from the bulk-upload work is only the piece that also fixes a
pre-existing data-loss bug plus the unique-constraint requirement (see §5).

**Net effect:** same audit trail, same no-corruption guarantee, roughly half the
surface area. If stakeholders later want proactive closure or cross-refresh undo,
the sweep and a persistent-history UI can be added as isolated passes — neither
is load-bearing for anything below.

## Undo window (targeted guards)

Undo is permitted whenever the specific mutations it must reverse are still
reversible. Instead of a committee-wide fingerprint, undo checks — inside its own
transaction, with the committee row and discrepancy row locked `FOR UPDATE`, and
the reversed membership row locked `FOR UPDATE` when applicable:

1. **Membership match** (accept paths with a membership side-effect) — the
   resolved voter's current membership `status` + `seatNumber` + `activatedAt`
   still equal `membershipAfter`. Mismatch (or a missing membership row) → `409`
   `{ reason: "membership_diverged" }`. Including `activatedAt` makes the guard
   version-aware: a remove-then-re-add that lands back on the same status/seat
   mints a fresh `activatedAt`, so the ABA is caught instead of silently reversed.
2. **Address equality** (address paths) — handled leniently at reversal time, not
   as a blocking guard (see "Address reversal").

These directly protect every write undo performs. Undo always downgrades the
row resolve activated, so no capacity or active-seat check is needed.

**A superseded row cannot be undone.** If a new upload re-flags the same
`VRCNUM`, the upsert clears the resolution columns (§5); undo then sees
`resolvedAt = null` and returns `409` `{ reason: "not_resolved" }`. There is no
separate `undoClosedAt` state in this design.

### Address reversal (lenient)

When `addressBefore` / `addressAfter` are present in metadata (`ACCEPTED` or
`ACCEPTED_WITH_ADDRESS` with `takeAddress`):

- If current `addressForCommittee === addressAfter` → restore `addressBefore`.
- Else → **skip** the address write (do not clobber a newer manual edit); still
  proceed with membership reversal and/or reopening the discrepancy.

**Address comparison:** use strict string equality on the stored values (no
trim/normalize in v1). Capture `addressBefore` / `addressAfter` exactly as
written at resolve time so undo comparison is deterministic.

Return a flag in the undo response (e.g. `addressRestoreSkipped: true`) so the
UI can toast: "Discrepancy reopened; address was not changed because it was
edited after acceptance."

### Concurrency note (v1 honesty)

Resolve and undo both `SELECT … FOR UPDATE` the `CommitteeList` row and the
`CommitteeUploadDiscrepancy` row. For accept undos, undo also locks the reversed
`CommitteeMembership` row. This serializes resolve/undo against each other and
against any concurrent transition that locks the same membership row. It does
**not** serialize against every other roster writer in the codebase (they do not
all lock the committee). The membership-match and discrepancy-row lock still
catch the stale cases that would duplicate undo or mutate the row being reversed.
A concurrent roster mutation on an unrelated row is a known, accepted v1
limitation — the same caveat the fuller fingerprint design carried without the
lock-everywhere refactor.

## Current behavior (as-is)

Endpoint: `POST /api/admin/handleCommitteeDiscrepancy`
(`apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts`), driven
by `{ VRCNUM, accept, takeAddress }`.

| Action | Data effect | AuditLog |
|---|---|---|
| **Accept** (`accept: true`) | Creates **or** re-activates **or** finds-already-`ACTIVE` a `CommitteeMembership` | ✅ `MEMBER_ACTIVATED` (create/reactivate only) |
| **Accept fails** (`atCapacity` / `anotherCommittee`) | **No** membership change; returns **400 early**, before address/delete | ❌ nothing — discrepancy left intact |
| **Update address** (`takeAddress`) | Overwrites `voterRecord.addressForCommittee` | ❌ nothing — old address lost |
| **Reject** (`accept: false`) | No membership change | ❌ nothing |
| **All non-failing paths (end)** | `committeeUploadDiscrepancy.delete(...)` — **hard delete** | ❌ discrepancy JSON destroyed |

> **Not every accept reaches the delete.** The accept path can early-return
> `400` on `atCapacity` or `anotherCommittee` (`route.ts:221-233`) **without**
> touching the membership, address, or discrepancy row. The soft-resolve in §2
> must preserve this: on those failure outcomes, do **not** soft-resolve and do
> **not** write audit events.

The work today is **split across transaction boundaries**: membership
activation, address change, discrepancy mutation, and audit writes are separate
operations. The accept path also has an **already-`ACTIVE`** branch that makes no
membership change yet still deletes the discrepancy.

Key facts that shape the design:

- The `AuditLog` is **append-only / immutable** (SRS §1.5), enforced at runtime
  by `apps/frontend/src/lib/auditLogGuard.ts`. Undo is a **new compensating
  event**, never a deletion of history.
- `CommitteeMembership` is **never hard-deleted** by the system, and
  `EligibilityFlag.membership` is `onDelete: Cascade`
  (`schema.prisma:439`) — deleting a membership would silently destroy its
  eligibility flags. **Undo must therefore transition to `REMOVED`, not delete.**
- Discrepancy rows are written by the upload route, which **wipes all rows
  first**: `bulkLoadCommittees/route.ts:29` calls
  `prisma.committeeUploadDiscrepancy.deleteMany({})` before recreating from the
  file. This must change so a soft-resolved row does not collide with a re-flagged
  `VRCNUM` on the unique key, and so the delete does not run before a successful
  load (see §5).
- `DISCREPANCY_RESOLVED` is currently an *eligibility-flag / crosswalk* event and
  is **not** reused here (see "Audit actions").
- Address changes during discrepancy resolve are **not** given a dedicated audit
  action. Capture `addressBefore` / `addressAfter` in `resolutionMetadata` only.

## Design decisions

- **Soft-resolve** the discrepancy (resolution columns + reversal payload)
  instead of hard delete.
- **Never delete the membership on undo.** Undo of a *created* membership issues
  a compensating transition to `REMOVED` (source `discrepancy_undo`), freeing the
  seat while preserving the timeline and any eligibility flags. *(Product
  decision: preserve history as `REMOVED`, not erase.)* Use the **bulk-import /
  replacement removal field set** (not the manual `remove/route.ts` pattern,
  which omits `seatNumber: null`):

  ```ts
  {
    status: "REMOVED",
    removedAt: new Date(),
    removalReason: "OTHER",
    removalNotes: "Undo of discrepancy accept",
    seatNumber: null,
  }
  ```

  Clearing `seatNumber` is required so `assignNextAvailableSeat` does not treat
  the seat as still occupied.
- **Snapshot the full pre-change membership state**, not just `status` — the
  accept path overwrites many fields, so partial restore would corrupt history.
  On **reactivated undo**, write back **only** the snapshotted fields (see §3);
  leave untouched fields (`submittedAt`, `meetingRecordId`, `petitionSeatNumber`,
  etc.) as-is.
- **Guard undo with targeted, local checks** (discrepancy row still resolved +
  membership match + address equality), not a committee-wide fingerprint. See
  "Undo window" and "What we cut". Address is restored conditionally at undo time.
- **Atomic resolve and atomic undo.** Each runs in a single transaction with the
  committee row locked `FOR UPDATE`, the discrepancy row locked and conditionally
  updated, and any voter/membership rows locked before reversal. Concurrent
  clicks cannot duplicate audit events or strand a membership/address change.
- **Throwing audit writes** (`logAuditEventOrThrow`) inside these transactions —
  an audit outage must roll back the state change, not commit it silently.
  - **Actor id:** `AuditLog.userId` is an FK to `User.id`. The current handler's
    `session.user?.id ?? "system"` fallback (`route.ts:59`) is dead defensive
    code — `withPrivilege` already returns `401` when `session.user.id` is
    missing and types the handler as `SessionWithUser` with `user.id: string`
    guaranteed (`withPrivilege.ts:11-13,31`). The rewrite should type the handler
    as `SessionWithUser` and use `session.user.id` directly; **drop the `"system"`
    fallback** (no extra 401 check needed). The throwing-audit FK risk therefore
    does not apply to resolve/undo — those always run as a real admin. (The bulk
    path legitimately authors as `SYSTEM_USER_ID` and stays on non-throwing
    `logAuditEvent`, so it is unaffected.)
- **Cross-committee supersede is intentional** (§5) but surprising to admins:
  confirm with stakeholders before shipping. A voter-wide `@unique` `VRCNUM`
  means a new discrepancy for a *different* committee replaces any prior
  soft-resolved row and its undo affordance (membership + audit history remain).

## API conventions (resolve + undo)

Applies to §2 and §3. Follow project rules (`.cursorrules`, `AGENTS.md`).

**Request validation.** Add Zod schemas in
`packages/shared-validators/src/schemas/`. Parse the body with `await req.json()`,
then validate the parsed value with the existing `validateRequest(body, schema)`
helper — do not cast `(await req.json()) as ...`. Unless the helper is changed
globally, invalid request bodies return its standard **`422`** response; tests
should expect `422`, not route-local `400`, for schema failures.

| Route | Schema fields |
|---|---|
| Resolve | `{ VRCNUM, accept, takeAddress? }` — drop unused `committeeId` from the client payload (today it is sent but ignored). Optionally reject if a stray `committeeId` is present and does not match the loaded discrepancy row. |
| Undo | `{ VRCNUM }` |

**Handlers** use `SessionWithUser` from `withPrivilege` (not raw `Session`).

**Breaking API change:** soft-resolve replaces hard delete. A second resolve on
the same row returns **`409`** (`already_resolved`), not **`404`**. Update
`handleCommitteeDiscrepancy.test.ts` and any client error handling.

**409 response shape.** All guard failures return `409` with a machine-readable
body so the UI can toast appropriately:

```jsonc
{ "error": "...", "reason": "already_resolved" | "not_resolved" | "membership_diverged" }
```

| `reason` | When |
|---|---|
| `already_resolved` | Resolve on a row with `resolvedAt` set |
| `not_resolved` | Undo on unresolved / already-undone / superseded row (`resolvedAt` null) |
| `membership_diverged` | Resolved membership no longer matches `membershipAfter` |

## Audit actions

Reusing the generic `DISCREPANCY_RESOLVED` is rejected: this codebase models one
action per outcome (`MEMBER_ACTIVATED/REJECTED/REMOVED/...`), and
`DISCREPANCY_RESOLVED` already means eligibility/crosswalk. New/used actions:

- **Every accept** → new `DISCREPANCY_ACCEPTED` (including
  `membershipOutcome: "none"` / already-`ACTIVE`). Metadata: `resolution`,
  `membershipOutcome`, `addressBefore` / `addressAfter` when present. Records
  the admin decision regardless of membership side-effects.
- **Accept membership side-effect** (create/reactivate only) → existing
  `MEMBER_ACTIVATED`, separate from the decision event above.
- **Reject** → new `DISCREPANCY_REJECTED`.
- **Address update** → **no dedicated address audit event**; address before/after
  captured in `DISCREPANCY_ACCEPTED` metadata when applicable.
- **Undo** → new `DISCREPANCY_UNDONE`, plus compensating membership events per
  the mapping below.

(Unprefixed names to match house style: `DISCREPANCY_ACCEPTED`, not
`COMMITTEE_DISCREPANCY_ACCEPTED`.)

**Decision-event shape** (for `DISCREPANCY_ACCEPTED`, `DISCREPANCY_REJECTED`,
`DISCREPANCY_UNDONE`):

| Field | Value |
|---|---|
| `entityType` | `"CommitteeUploadDiscrepancy"` |
| `entityId` | discrepancy row `id` (not `VRCNUM`) |
| `beforeValue` / `afterValue` | Resolved snapshot vs cleared/unresolved snapshot on undo; null → resolved fields on accept/reject |
| `metadata` | durable decision snapshot (below); may overlap `resolutionMetadata`; keep shapes stable for tests |

Decision-event metadata must be self-contained because the single
`CommitteeUploadDiscrepancy` row can later be superseded by another upload for
the same `VRCNUM`. Do **not** rely on dereferencing `entityId` later to explain
what happened. Include:

```jsonc
{
  "VRCNUM": "...",
  "committeeId": 123,
  "termId": "ck...",
  "discrepancy": { /* original discrepancy JSON at decision time */ },
  "resolution": "ACCEPTED" | "ACCEPTED_WITH_ADDRESS" | "REJECTED",
  "membershipOutcome": "created" | "reactivated" | "none",
  "membershipId": "ck...",              // when applicable
  "membershipBefore": { /* when applicable */ },
  "membershipAfter": { "status": "ACTIVE", "seatNumber": 3, "activatedAt": "..." },
  "addressBefore": "123 Old St",       // when applicable
  "addressAfter": "456 New Ave",       // when applicable
  "addressRestoreSkipped": false        // undo only, when applicable
}
```

**Audit UI wiring required.** Each new `AuditAction` must be added to
`apps/frontend/src/app/admin/audit/auditUtils.ts`:
- `AUDIT_ACTION_LABELS` (≈ line 19) — human label per action, else the action
  renders as the raw enum string in the audit trail.
- `AUDIT_ENTITY_TYPES` — add `"CommitteeUploadDiscrepancy"` so these decision
  events can be filtered in the audit trail.
- `buildSummary` switch (≈ line 263) — add cases for the three new actions.
  For undo-driven `PETITION_RECORDED` compensating events, summarize with
  `source: discrepancy_undo` so the trail reads as a reversal, not a new
  petition (known enum quirk — no new `AuditAction` in v1).

### Compensating membership events on undo

| Undo path | Compensating `AuditAction` |
|---|---|
| **`created`** → transition to `REMOVED` | `MEMBER_REMOVED` (`source: discrepancy_undo`) |
| **`reactivated`** → restore `membershipBefore.status` of `REMOVED` | `MEMBER_REMOVED` |
| **`reactivated`** → restore `membershipBefore.status` of `RESIGNED` | `MEMBER_RESIGNED` |
| **`reactivated`** → restore `membershipBefore.status` of `REJECTED` | `MEMBER_REJECTED` |
| **`reactivated`** → restore `membershipBefore.status` of `SUBMITTED` | `MEMBER_SUBMITTED` |
| **`reactivated`** → restore `membershipBefore.status` of `CONFIRMED` | `MEMBER_CONFIRMED` |
| **`reactivated`** → restore `membershipBefore.status` of `PETITIONED_LOST` or `PETITIONED_TIE` | `PETITION_RECORDED` |
| **`none`** / **`REJECTED`** | no membership audit event |

All compensating membership events use `source: discrepancy_undo`, `beforeValue`
= current ACTIVE (or post-resolve) snapshot, `afterValue` = restored snapshot.
Implementation picks the row from `membershipBefore.status`; tests assert the
mapping explicitly — do not guess at runtime.

## 1. Schema (`apps/frontend/prisma/schema.prisma`)

```prisma
enum DiscrepancyResolution {
  ACCEPTED
  ACCEPTED_WITH_ADDRESS
  REJECTED
}

enum AuditAction {
  // ...existing...
  DISCREPANCY_ACCEPTED
  DISCREPANCY_REJECTED
  DISCREPANCY_UNDONE
}

model CommitteeUploadDiscrepancy {
  id          String        @id @default(cuid())
  VRCNUM      String        @unique
  committee   CommitteeList @relation(fields: [committeeId], references: [id], onDelete: Cascade)
  committeeId Int
  discrepancy Json

  // --- resolution / undo support ---
  resolvedAt         DateTime?
  resolvedBy         String?                 // userId who resolved
  resolution         DiscrepancyResolution?
  resolutionMetadata Json?                   // reversal payload (below)

  @@index([resolvedAt])                      // fetchLoaded filters resolvedAt: null
}
```

`membershipOutcome` is always present. Use `"none"` for rejects and for
already-`ACTIVE` accepts. `membershipId` + `membershipAfter` are **required** in
`resolutionMetadata` for `membershipOutcome` `"created"` and `"reactivated"`
(captured inside the resolve transaction after membership writes). Omit both when
`membershipOutcome === "none"`.

`resolutionMetadata` — captures the **membership outcome** and **full pre-change
snapshot** of every field the accept path can overwrite. No committee roster
fingerprint is stored (see "What we cut"):

```jsonc
{
  // which kind of membership side-effect this decision had.
  // "none" = reject or already-ACTIVE accept with no membership change
  "membershipOutcome": "created" | "reactivated" | "none",
  "membershipId": "ck...",            // null when outcome === "none"

  // full snapshot of the membership BEFORE accept (only for "reactivated").
  // Restoring just status would corrupt history (e.g. a prior REMOVED row would
  // lose removalReason/removedAt). Snapshot every field accept overwrites:
  "membershipBefore": {
    "status": "REMOVED",
    "membershipType": "APPOINTED",
    "seatNumber": null,
    "activatedAt": "...",
    "confirmedAt": null,
    "resignedAt": null,
    "removedAt": "...",
    "rejectedAt": null,
    "rejectionNote": null,
    "resignationDateReceived": null,
    "resignationMethod": null,
    "removalReason": "OTHER",
    "removalNotes": "...",
    "petitionVoteCount": null,
    "petitionPrimaryDate": null
  },

  // state THIS resolution left the membership in — used to guard undo.
  // activatedAt makes the guard version-aware (catches remove-then-re-add ABA).
  "membershipAfter": { "status": "ACTIVE", "seatNumber": 3, "activatedAt": "..." },

  // only for ACCEPTED_WITH_ADDRESS (or ACCEPTED with takeAddress)
  "addressBefore": "123 Old St",
  "addressAfter": "456 New Ave"
}
```

> The overwritten field set is taken directly from the accept/reactivate branch
> of the current handler (route lines ~140–158). `petitionSeatNumber`,
> `submittedAt`, `submittedById`, etc. are **not** touched by accept and so are
> left alone.

Migration: `prisma migrate dev --name discrepancy_undo`.

## 2. Resolve path — `handleCommitteeDiscrepancy/route.ts`

**Validate** request with shared Zod schema (`validateRequest`). Handler typed as
`SessionWithUser`; use `session.user.id` directly (no `"system"` fallback).

Wrap the **entire** resolution in one transaction. **Lock order** (consistent
across resolve/undo to reduce deadlocks): committee → discrepancy → voter (when
address is updated). Use `$queryRaw` `FOR UPDATE` on `CommitteeList` (resolve
already does this) and on `CommitteeUploadDiscrepancy` (Prisma has no built-in
row lock on `findUnique`).

1. Lock committee + discrepancy; re-read discrepancy inside tx. If `resolvedAt`
   is set → **`409`** `{ reason: "already_resolved" }` (replaces today's
   hard-delete + second-call `404`).
2. Determine and perform side-effects, but do not write the decision audit yet:
   collect one final `resolutionMetadata` object as the transaction proceeds.
3. **Accept** — determine outcome:
   - **already `ACTIVE`** → `membershipOutcome: "none"`, do not touch membership.
   - Run `anotherCommittee` and `atCapacity` checks before any seat creation or
     membership write. A failed accept should not soft-resolve, audit, update
     address, or create/modify seats.
   - **reactivated** → snapshot `membershipBefore` (full field set) before update;
     `membershipOutcome: "reactivated"`; set `membershipId` + `membershipAfter`
     (`status` + `seatNumber` + `activatedAt`) after update; log `MEMBER_ACTIVATED`.
   - **created** → `membershipOutcome: "created"`; set `membershipId` +
     `membershipAfter` (`status` + `seatNumber` + `activatedAt`) after create; log
     `MEMBER_ACTIVATED`.
   - **failure outcomes** (`atCapacity` / `anotherCommittee`) → return **`400`**
     **before** soft-resolve / audit (roll back tx): discrepancy row left intact.
4. **Address update** — **only when `accept === true` and `takeAddress` is
   non-empty.** Reject + `takeAddress` is **forbidden** (return `400` if
   sent — today the API silently updates address on reject; close that hole).
   Capture `addressBefore` before overwriting; set `addressAfter`. Resolution
   `ACCEPTED_WITH_ADDRESS` when address taken, else `ACCEPTED`. Store address
   metadata in `resolutionMetadata`; no separate address audit write.
5. **Reject** — resolution `REJECTED`, `membershipOutcome: "none"`. No address
   or membership side-effects.
6. Build the durable decision-event metadata from the final
   `resolutionMetadata`, plus `VRCNUM`, `committeeId`, `termId`, and the original
   discrepancy JSON. Then log exactly one decision event:
   `DISCREPANCY_ACCEPTED` for successful accept paths or
   `DISCREPANCY_REJECTED` for reject.
7. **Soft-resolve**: replace `committeeUploadDiscrepancy.delete(...)` with an
   `update(...)` setting `resolvedAt/resolvedBy/resolution/resolutionMetadata`.
8. All audit writes use `logAuditEventOrThrow` so a logging failure rolls the
   whole resolution back.

Rebuild `packages/shared-prisma` / Prisma client after schema enum changes.

## 3. Undo endpoint — `POST /api/admin/handleCommitteeDiscrepancy/undo`

**Validate** `{ VRCNUM }` with shared Zod schema. `withPrivilege(Admin, ...)`.
Handler typed as `SessionWithUser`. Single transaction; **lock order**: committee
→ discrepancy → voter (when restoring address) → membership row (when reversing).
Lock the `CommitteeList` row `FOR UPDATE` (serializes against resolve), lock and
re-read the `CommitteeUploadDiscrepancy` row `FOR UPDATE`, then lock the reversed
`CommitteeMembership` row `FOR UPDATE` before reversing it when the resolution
has a membership side effect.

1. Load and lock discrepancy (`include: { committee: { include: { term } } }`)
   inside the transaction. If row missing → `404`. If `resolvedAt` is null →
   **`409`** `{ reason: "not_resolved" }`. This locked re-read is required even
   for reject undo and already-`ACTIVE` accept undo, which have no membership
   side-effect guard; it prevents concurrent undo clicks from both logging
   `DISCREPANCY_UNDONE`.
2. **Guards** (else **`409`** with reason below):
   - If `membershipId` set: current `status` + `seatNumber` + `activatedAt` must
     match `membershipAfter` → `{ reason: "membership_diverged" }`. A missing
     membership row (deleted out from under the resolution) is also
     `membership_diverged`, not a crash. `activatedAt` makes this version-aware so
     a remove-then-re-add onto the same status/seat is caught (see "Undo window").
3. Reverse by `resolution` + `membershipOutcome`:
   - **`none`** (already-active accept) → no membership change; just reopen.
   - **`created`** → transition to `REMOVED` using the field set in "Design
     decisions" (`seatNumber: null`, `removedAt`, `removalReason`, `removalNotes`);
     log `MEMBER_REMOVED` with `source: discrepancy_undo`.
   - **`reactivated`** → **partial update**: write back only the snapshotted
     fields from `membershipBefore` (the accept-overwritten set); do not replace
     the whole row. Log compensating event per mapping table in "Audit actions".
     If `membershipBefore.seatNumber` is non-null, restore it as historical
     membership state on the non-active row; this does not occupy an active
     roster seat under the current active-only seat model.
   - **Address** (when `addressBefore` / `addressAfter` in metadata) — lock
     voter row; restore `addressBefore` only if current
     `addressForCommittee === addressAfter`; else skip and set
     `addressRestoreSkipped: true` in the response (see "Address reversal").
   - **`REJECTED`** → no data side-effect.
4. Clear all resolution columns (`resolvedAt`, `resolvedBy`, `resolution`,
   `resolutionMetadata` → null) → row returns to the unresolved list.
5. Log `DISCREPANCY_UNDONE` (`entityType: CommitteeUploadDiscrepancy`,
   `entityId: discrepancy.id`) with durable metadata containing the original
   decision snapshot plus undo actor, undo timestamp, membership reversal result,
   and `addressRestoreSkipped` when applicable. Use `logAuditEventOrThrow`.

**Success response:** `{ success: true, addressRestoreSkipped?: boolean }`.

A second undo on the same row → **`409`** `{ reason: "not_resolved" }`.

## 4. Read path — `/api/committee/fetchLoaded`

`fetchLoaded/route.ts:9` — add `where: { resolvedAt: null }` to the `findMany`
so resolved rows don't reappear in the active list on refresh. Resolved rows
persist in the DB for backend undo while guards still pass.

## 5. Bulk-upload lifecycle

Trimmed to the two changes that are actually required for correctness. The
absent-from-upload sweep and `undoClosedAt` are **cut** (see "What we cut").

> **`VRCNUM` is globally `@unique`** — at most one discrepancy row per voter,
> table-wide. The current upload builds plain `create()` calls
> (`bulkLoadCommittees/route.ts:36-57`). Once resolved rows are preserved (step 2
> below), a plain `create` for a re-flagged `VRCNUM` would hit a unique
> violation — **upserts are mandatory**.
>
> **Cross-committee/term supersede is intended behavior.** Because the key is
> voter-wide (not scoped to committee+term), a new discrepancy for the **same
> voter in a *different* committee or term** also supersedes their existing
> resolved row — replacing that row's `discrepancy`/`resolutionMetadata` and
> clearing its resolution columns (which closes undo via `not_resolved`). This is
> accepted by design (see worked example below).
>
> *Worked example:* Upload 1 flags voter `V` for committee **X** (address
> mismatch); admin accepts → `V` is `ACTIVE` in X, row soft-resolved
> (`committeeId = X`). Upload 2 lists `V` in committee **Y**; since `V` is already
> active in X, `loadCommitteeLists` emits an `alreadyActiveInAnotherCommittee`
> discrepancy for **Y** (`bulkLoadUtils.ts:434-444`). The `upsert` on `VRCNUM`
> overwrites `V`'s single row: `committeeId` X→Y, `discrepancy` replaced,
> resolution columns cleared. The **X resolution record and its Undo are gone.**
>
> What is *not* lost: `V`'s `ACTIVE` membership in X (separate table — adjusted,
> if at all, by Upload 2's normal audited roster sync) and the full `AuditLog`
> for the original X acceptance (`DISCREPANCY_ACCEPTED` / `MEMBER_ACTIVATED`,
> append-only). Only the soft-resolved *discrepancy* record for X and its undo
> affordance are discarded — a completed decision whose outcome remains durably
> recorded. This is correct: once the source reassigns `V` to Y, undoing the
> stale X resolution is no longer meaningful. (A per-`(committee, term)`
> discrepancy key would retain both rows but is a schema change, out of scope —
> see "Out of scope".)

1. **`loadCommitteeLists` first** (membership sync + build `discrepanciesMap`).
2. **On successful load only** — run steps 3–4 in **one transaction**. A failed
   parse/sync must **not** delete unresolved rows. *(This fixes a pre-existing
   bug: today `deleteMany({})` runs **before** `loadCommitteeLists`, so a load
   that throws still wipes the unresolved rows.)*
3. **`deleteMany({ where: { resolvedAt: null } })`** — clear only the unresolved
   set. Resolved rows stay until superseded (step 4) or successfully undone.
4. **Upsert** every entry in `discrepanciesMap` keyed on `VRCNUM`: on conflict,
   replace `discrepancy` JSON, update `committeeId` if needed, and **clear all
   resolution columns** so a re-flagged voter returns fresh and unresolved.

> **Do not** run step 3 before a successful step 1.

## 6. Frontend (session-only undo)

Files: `apps/frontend/src/app/admin/data/CommitteeUploadDiscrepancies.tsx`
(undo button + state) and `apps/frontend/src/app/admin/audit/auditUtils.ts`
(labels/summary for the new audit actions — see "Audit actions").

**Admin expectation:** Undo is session-only. After refresh, resolved rows are
hidden (`fetchLoaded` filters `resolvedAt: null`) and the Undo button disappears,
even though the backend may still permit undo. Do not file this as a bug in v1.

- Render a small **Undo** button next to the existing green/red status text.
- New `DiscrepancyUndoButton` (mirrors `DiscrepanciesActionsMenu`, `useApiMutation`
  → `/api/admin/handleCommitteeDiscrepancy/undo`), per-row loading.
- On success, remove the `VRCNUM` from `acceptedDiscrepancies` /
  `rejectedDiscrepancies` → re-renders the original `DiscrepanciesActionsMenu`.
- If response includes `addressRestoreSkipped`, toast that the discrepancy was
  reopened but address was left unchanged (edited after acceptance).
- On **`409`**, read `reason` from the response body and toast:
  - `membership_diverged` — committee membership changed since resolve
  - `not_resolved` — already undone, never resolved, or superseded by an upload
  Fallback generic message if `reason` is absent. No cross-refresh persistence.
- Remove dead `committeeId` from resolve mutation payload when touching
  `DiscrepancyActionsMenu` (optional cleanup in same pass).

## 7. Tests

Run the **illegible-bug checklist** (`AGENTS.md`) for both routes: unauthenticated
→ 401; insufficient privilege → 403; missing row → 404; guard failures → 409
with correct `reason`; no cross-scope leakage.

Resolve path (`handleCommitteeDiscrepancy.test.ts`):
- soft-resolve (`update`, not `delete`) + resolution columns/metadata populated
  (incl. `membershipId` + `membershipAfter` for create/reactivate, address
  snapshots when applicable; **no** `committeeRosterAtResolve`);
- audit row on **every accept** (`DISCREPANCY_ACCEPTED`, incl. already-`ACTIVE`
  / `membershipOutcome: "none"`) + `MEMBER_ACTIVATED` only when membership
  changes; audit row on **reject** (`DISCREPANCY_REJECTED`);
- decision events use `entityType: CommitteeUploadDiscrepancy`, `entityId: row
  id`, and durable metadata containing `VRCNUM`, `committeeId`, `termId`,
  original discrepancy JSON, `resolution`, `membershipOutcome`, membership
  snapshots where applicable, and address snapshots where applicable;
- **`409`** `{ reason: "already_resolved" }` (replaces today's second-call `404`);
- **accept failure** (`atCapacity` / `anotherCommittee`) → `400`, discrepancy
  **not** soft-resolved, no audit rows written, no seat setup committed;
- **reject + `takeAddress`** → `400`, no address write, no soft-resolve;
- request validation: missing / invalid `VRCNUM` → `422` via shared Zod helper;
- resolution + side-effects + audit all commit or all roll back (atomicity);
- audit-write failure: mock `logAuditEventOrThrow` to throw → resolve rolls back
  (do not rely on invalid `userId` FK once `SessionWithUser` is enforced).

Undo endpoint (`handleCommitteeDiscrepancy/undo.test.ts` — new file):
- auth suite (401 / 403) mirroring resolve tests;
- created-membership accept → `REMOVED` with `seatNumber: null`, eligibility
  flags intact, row reopened, `DISCREPANCY_UNDONE` logged;
- **reactivation undo** writes back only snapshotted fields; compensating audit
  matches `membershipBefore.status` per mapping table;
- accept-with-address → address restored when current equals `addressAfter`;
- accept-with-address + manual address edit after resolve → undo succeeds,
  address unchanged, `addressRestoreSkipped: true`;
- reactivation undo restoring non-null `membershipBefore.seatNumber` writes it
  back as historical state on the restored non-active membership; no active-seat
  collision guard is run;
- **membership diverged** (resolved member's status/seat changed since resolve) →
  `409` `membership_diverged`, no mutation;
- **membership diverged via ABA** (member removed then re-added onto the same
  status/seat, fresh `activatedAt`) → `409` `membership_diverged`, no mutation
  (guard is version-aware, not value-only);
- **membership diverged via missing row** (`membershipId` set but row absent) →
  `409` `membership_diverged`, no crash;
- reject undo → row reopened, no membership change;
- **undo after already-`ACTIVE` accept** → reopens, no membership touch;
- concurrent / duplicate undo for reject or already-`ACTIVE` accept serializes on
  the locked discrepancy row; one succeeds and the second returns `409`
  `not_resolved`, with only one `DISCREPANCY_UNDONE` audit event;
- `DISCREPANCY_UNDONE` metadata includes the original decision snapshot plus undo
  actor/timestamp, membership reversal result, and `addressRestoreSkipped` when
  applicable;
- second undo → `409` `not_resolved`;
- each guard failure asserts the correct `reason` field.

Lifecycle / upload (`bulkLoadCommittees.test.ts`):
- upload preserves resolved rows; only unresolved replaced;
- **failed load leaves unresolved discrepancies intact** (required — step 2 in §5);
- same `VRCNUM` re-flagged → upsert supersedes (no unique error), resolution
  cleared, superseded row's undo now returns `409` `not_resolved`.

## Lifecycle summary

1. Upload → `loadCommitteeLists` (membership sync); on success, replace unresolved
   discrepancies + upsert new ones in one transaction; resolved rows preserved
   until superseded or undone.
2. Admin resolves a row → soft-resolved (resolution + reversal snapshot), all
   side-effects + audit in one transaction (`DISCREPANCY_ACCEPTED` or
   `DISCREPANCY_REJECTED` on every decision; membership events when applicable).
3. Within the session, UI shows **Undo**; undo reverses side-effects and reopens
   the row while the targeted guards pass.
4. Backend undo remains available until the resolved membership diverges from
   `membershipAfter`, or the row is superseded by a new upload (same `VRCNUM`
   re-flagged → resolution columns cleared). Manual address edits do not close
   the window; address is restored only when still at
   `addressAfter`.
5. No automatic time limit.

## Out of scope (future)

- Persistent "resolved / recently resolved" UI with undo across refreshes.
- Bulk undo / undo-all.
- Surfacing undo from the admin audit trail view.
- Dedicated audit action for voter address changes.
- Address trim/normalize on compare (v1 uses strict equality).
- **Committee-wide roster fingerprint** + codebase-wide roster-lock helper +
  absent-from-upload sweep (`undoClosedAt`). Cut from v1 as conservative-refusal
  machinery that added no data safety over the targeted guards (see "What we
  cut"). Revisit if a hard, committee-wide serialized undo window is ever
  required.
- Per-`(committee, term)` discrepancy key (schema change) to retain a separate
  resolved row per committee instead of one voter-wide row. Would preserve the
  prior resolution record when a voter is re-flagged for a different
  committee/term — but the current voter-wide supersede is intended (see §5;
  confirm with stakeholders before ship).
