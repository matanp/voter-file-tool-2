# 04: Members are recorded as elected or appointed, as the file says

**What to build:** An import records how each member actually got their seat. The importer
currently writes `APPOINTED` for every membership it creates and falls back to `APPOINTED` when
reactivating, which is wrong for the large majority of members: the active term's file carries
1238 primary-elected against 321 appointed, and the incoming 2026–2028 file is entirely
elected. A membership created by an import instead takes the `membershipType` its canonical
entry carries.

Existing memberships are not rewritten. Reactivating an existing membership keeps that
membership's recorded type when it has one, and takes the entry's type only when it does not.
Correcting the already-loaded 2024–2026 term is separate work and is not in scope here.

**Blocked by:** 03

**Status:** resolved

- [x] A membership created by an import carries the entry's `membershipType` rather than a
      constant
- [x] Reactivating a membership that already has a recorded type keeps that type; one without a
      recorded type takes the entry's
- [x] The audit event for an activation reports the type actually written
- [x] A test asserts a created membership's type comes from the entry, covering both
      `PETITIONED` and `APPOINTED`

## Comments

`ImportPlan.activations` carries `membershipType` alongside the voter and committee, so the
write loop takes the type from the plan rather than from a constant. Reactivation reads
`existingMembership.membershipType ?? plannedMembershipType`: a membership that already
records how its member won the seat keeps it, and only an untyped one takes the file's.
The `MEMBER_ACTIVATED` audit event reports the type actually written in both branches.

Nothing rewrites an existing typed membership, so the already-loaded 2024–2026 term is
untouched — correcting its 1238 primary-elected members recorded as appointed remains
separate work.

New `bulkLoadCommittees.membershipType.test.ts` covers create for both `PETITIONED` and
`APPOINTED`, reactivation keeping a recorded type, and reactivation of an untyped
membership taking the entry's. Two pre-existing assertions in
`bulkLoadCommittees.bulkLoadUtils.test.ts` changed from `APPOINTED` to `PETITIONED`: those
are exactly the constant this ticket removes.
