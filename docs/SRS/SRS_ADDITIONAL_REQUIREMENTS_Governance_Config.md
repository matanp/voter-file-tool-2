# SRS Additional Requirements: Configurable Governance Settings

## Extends SRS v0.1 Committee Membership & Governance

**February 2026**

This document defines **additional requirements** that extend (not replace) [SRS_v0.1_Committee_Membership_Governance.md](SRS_v0.1_Committee_Membership_Governance.md). The base SRS describes the business rules; this document describes how they are **parameterized** to support different jurisdictions and deployments.

---

## 1. Committee Governance Config

A single `CommitteeGovernanceConfig` row per deployment holds configurable values for eligibility and capacity rules. This enables the system to support:

- Different political parties (e.g., Republican county committees)
- Different seat counts per LTED (e.g., 2, 4, or 6 members)
- Jurisdictions that do not use district-based residence eligibility

---

## 2. Configurable Requirements

### 2.1 Party Affiliation (requiredPartyCode)

**Requirement:** Individual's party enrollment must match the committee's **required party** (configurable BOE party code).

- Valid party codes come from authoritative voter data (`DropdownLists.party`).
- Implementation: `VoterRecord.party === governanceConfig.requiredPartyCode`.
- **MCDC default:** Democrat (BOE code `"DEM"`).

Extends SRS §7.1 Hard Stops: "Individual is not an enrolled Democrat" becomes "Individual's party does not match required party."

---

### 2.2 Max Seats per LTED (maxSeatsPerLted)

**Requirement:** Each LTED has a configurable maximum number of seats.

- Currently fixed at 4 in NY Election Law; other jurisdictions may use 2, 4, 6, or other values.
- Affects:
  - Capacity checks in `handleRequest`, `AddCommitteeForm`, `CommitteeRequestForm`
  - Seat model creation (N seats per CommitteeList per term)
  - Weight calculation: `seatWeight = ltedWeight / maxSeatsPerLted`
- **MCDC default:** 4.

Extends SRS §7.1 (LTED capacity) and §8.1 (seat/weight logic).

---

### 2.3 Assembly District Residence Check (requireAssemblyDistrictMatch)

**Requirement:** When enabled, individual must reside in the correct Assembly District per `LtedDistrictCrosswalk`.

- When disabled, skip this hard stop.
- Useful for jurisdictions that do not use district-based eligibility, or for testing.
- **MCDC default:** enabled (`true`).

Extends SRS §7.1: "Individual does not reside in the correct Assembly District" is enforced only when this flag is true.

---

## 3. Relationship to Base SRS

| Base SRS Section                      | Extended By      |
| ------------------------------------- | ---------------- |
| §7.1 Hard Stops (party, AD, capacity) | §2.1, §2.2, §2.3 |
| §8.1 LTED and Seat Weights            | §2.2             |

The base SRS describes _what_ the rules are; this document describes _how_ they are parameterized via `CommitteeGovernanceConfig`.

---

## 4. Data Model

See [SRS_DATA_MODEL_CHANGES.md](SRS_DATA_MODEL_CHANGES.md) for the `CommitteeGovernanceConfig` Prisma model.

---

## 5. Implementation

See [SRS_IMPLEMENTATION_ROADMAP.md](SRS_IMPLEMENTATION_ROADMAP.md) roadmap item 1.1c and related updates to 2.1 (Eligibility Validation) and 1.4 (Seat Model).
