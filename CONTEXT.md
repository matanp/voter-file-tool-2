# Voter File Tool

Tracks a county party's committee membership against the voter file: who holds which seat, how they got it, and who is allowed to see and change that.

This glossary covers the whole repo — `apps/frontend`, `apps/report-server`, and `packages/*`. It is a glossary and nothing else: no specs, no implementation notes.

## Language

### Access

**Privilege**:
The level of authority a person holds in the tool — one of Developer, Admin, Leader, RequestAccess, or ReadAccess.
_Avoid_: permission, role, access level

**Privilege Grant**:
The authoritative record that a person, identified by email, holds a given privilege. A person's privilege is derived from their grant; absent a grant they hold ReadAccess.
_Avoid_: privileged user

**Acting Privilege**:
The privilege a Developer is simulating in the interface. It changes what is shown, never what is allowed.
_Avoid_: acting permissions, simulated role

**Leader**:
A user whose authority is limited to their assigned jurisdictions for a committee term. A Leader with no assignments for a term can see nothing in it.
_Avoid_: chair, district leader

**Invite**:
A time-limited offer of a privilege to an email address, redeemable once. Redeeming it establishes the person's privilege grant.

### Geography and scope

**Jurisdiction**:
A city or town, optionally narrowed to a single legislative district within it. A jurisdiction with no legislative district covers the whole city or town.
_Avoid_: area, territory, region, locality

**Assignment**:
Authority given to a Leader over one jurisdiction for one committee term. Assignments do not carry across terms.
_Avoid_: jurisdiction (for the grant itself), scope, mapping

**Pending Assignment**:
An assignment recorded on an invite, taking effect when the invite is redeemed.

**Assembly District**:
The state assembly district a voter lives in, or that a committee's election district lies in. It is the only geography that decides Committee Residency.

**Committee Residency**:
Whether a voter lives in the right place to serve on a committee: they must live in the committee's Assembly District. Their town, legislative district and election district don't matter.
_Avoid_: Serve ED = Home ED, district match

**Home ED**:
The election district a voter lives in, per the BOE. It may differ from their Serve ED.

**Serve ED**:
The election district of the committee a member serves on. It may differ from their Home ED.

**Report Scope**:
Whether a report covers a single jurisdiction or the whole county. The two scopes are named `jurisdiction` and `countywide`; here `jurisdiction` names the scope, not the place.

### Time

**Committee Term**:
The fixed period a committee serves, e.g. "2024–2026". Exactly one term is active at a time, and assignments, seats, and memberships all belong to one.
_Avoid_: cycle, session, period

**Calendar Date**:
A day on the calendar, with no time of day and no timezone. A Committee Term's start, an Election Date, a date of birth, a petition's primary date. Two people in different places agree on it without converting anything.
_Avoid_: date (unqualified), day, timestamp

**Instant**:
A specific moment, the same moment everywhere. When a record was created, when an audit entry was written, when a submission arrived. Distinct from a Calendar Date: an Instant answers "when did this happen", a Calendar Date answers "which day is this".
_Avoid_: timestamp, datetime, date (unqualified)

**Election Date**:
The Calendar Date an election is held on. Held as a Reference List, chosen when generating a
petition, and printed onto the petition itself.
_Avoid_: primary date, poll date

### Reference data

**Reference List**:
A standalone list of values an Admin curates, offered as choices elsewhere in the tool.
A Reference List is referenced **by value at the moment of use**: choosing an entry copies its
value into the work at hand rather than pointing back at it. Renaming or removing an entry
therefore changes only what future choices offer — it cannot orphan an existing record, and it
cannot alter anything already produced.
_Avoid_: lookup table, enum, config list

**Office Name**:
The title of a public office a candidate runs for, e.g. "Council Member, District 3". Held as a
Reference List and chosen per candidate when generating a petition. Distinct from a Seat, which
is a position on the committee that a member holds.
_Avoid_: office, position, title, seat

### Committee records

**Committee History**:
The record of how a committee's membership changed during a Committee Term: who was submitted, accepted, rejected, added, resigned, or removed, when, and by whom. It holds only what was actually recorded at the time; anything not recorded is left out, never reconstructed.
_Avoid_: audit log (for this view), activity feed, changelog

**Election Outcome**:
A petition candidate's result in the primary for a committee seat: won, lost, or tied. Visible to Admins only.
_Avoid_: petition outcome context, petition result

**LTED Weight**:
The total voting weight an Admin sets for a committee's election district. Each seat's weight is an equal share of it.
_Avoid_: committee weight, ED weight

**Designation Weight**:
The part of a committee's LTED Weight that counts toward designation: the weights of petitioned seats that are currently filled. It is incomplete, and not shown as a number, while any petitioned seat has no weight.
_Avoid_: total weight, vote weight

**Submission**:
A candidate a Leader proposes for a committee, waiting for an Admin to accept or reject it. The candidate is not a member until accepted. A replacement submission also names the member the candidate would replace.
_Avoid_: request, committee change request

**Hard Stop**:
An eligibility rule a candidate fails that blocks adding or submitting them, such as a party or district mismatch or a full committee. A warning is the nonblocking counterpart.
_Avoid_: error, validation failure

**Eligibility Override**:
An Admin adding a candidate despite hard stops, with a recorded reason. Some hard stops cannot be overridden.
_Avoid_: force add
