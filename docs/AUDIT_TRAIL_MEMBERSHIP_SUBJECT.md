# Audit Trail — CommitteeMembership Subject Snapshots

Short intention doc for `metadata.subject` on `CommitteeMembership` audit events.

## Problem

The audit trail UI was built to show human-readable summaries (member name + committee location), but mutation routes only logged status deltas in `beforeValue` / `afterValue`. Admins saw generic rows like "Member activated (CommitteeMembership)" instead of "Jane Smith activated in Brighton LD 28 ED 3".

## Goal

Every **new** `CommitteeMembership` audit row should be self-describing without joining live database tables at read time.

## Design — write-time snapshot, not read-time join

Voter names in `VoterRecord` can change when BOE data is re-imported. Joining the live voter table at display time is **not** audit-faithful. Identity and committee context must be snapshotted at the moment the action is logged.

Historical rows (before this convention) are out of scope; the UI keeps generic fallbacks for them.

## Convention — three JSON layers

| Field | Purpose | Examples |
| ----- | ------- | -------- |
| `beforeValue` / `afterValue` | Domain state that changed | `status`, `seatNumber`, `removalReason`, dates |
| `metadata` | Operational context | `source`, `overrideReason`, `meetingRecordId` |
| `metadata.subject` | Point-in-time who/where | `memberName`, `voterRecordId`, committee location, `termLabel`, `seatNumber` |

No schema migration is required. The convention is enforced via a shared helper and code review.

### `metadata.subject` shape

```ts
{
  memberName: string;
  voterRecordId: string;
  committeeListId: number;
  termId: string;
  termLabel: string;
  cityTown: string;
  legDistrict: number | null;
  electionDistrict: number;
  seatNumber?: number | null;
}
```

## Helper

All `CommitteeMembership` `logAuditEvent` call sites must use:

`apps/frontend/src/lib/auditMembershipSubject.ts`

- `buildMembershipAuditSubject` — when voter/committee/term are already loaded
- `fetchMembershipAuditSubject` — when a single lookup is needed inside a transaction
- `mergeAuditMetadata(metadata, subject)` — attach subject without overwriting an existing one

## UI decisions

- **Table:** Entity ID column removed (truncated cuid has no admin value). Summary carries the story.
- **Drawer:** Subject block (member + committee) above raw JSON; full membership ID copyable.
- **Export:** Entity ID column retained as the machine key; Summary uses `metadata.subject`.
