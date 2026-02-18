-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('SUBMITTED', 'REJECTED', 'CONFIRMED', 'ACTIVE', 'RESIGNED', 'REMOVED', 'PETITIONED_WON', 'PETITIONED_LOST', 'PETITIONED_TIE');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('PETITIONED', 'APPOINTED');

-- CreateEnum
CREATE TYPE "RemovalReason" AS ENUM ('PARTY_CHANGE', 'MOVED_OUT_OF_DISTRICT', 'INACTIVE_REGISTRATION', 'DECEASED', 'OTHER');

-- CreateEnum
CREATE TYPE "ResignationMethod" AS ENUM ('EMAIL', 'MAIL');

-- Add Leader to PrivilegeLevel enum (non-breaking)
ALTER TYPE "PrivilegeLevel" ADD VALUE IF NOT EXISTS 'Leader' BEFORE 'RequestAccess';

-- CreateTable
CREATE TABLE "CommitteeMembership" (
    "id"                      TEXT NOT NULL,
    "voterRecordId"            TEXT NOT NULL,
    "committeeListId"          INTEGER NOT NULL,
    "termId"                   TEXT NOT NULL,
    "status"                   "MembershipStatus" NOT NULL DEFAULT 'SUBMITTED',
    "membershipType"           "MembershipType",
    "seatNumber"               INTEGER,
    "submittedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt"              TIMESTAMP(3),
    "activatedAt"              TIMESTAMP(3),
    "resignedAt"               TIMESTAMP(3),
    "removedAt"                TIMESTAMP(3),
    "rejectedAt"               TIMESTAMP(3),
    "rejectionNote"            TEXT,
    "submittedById"            TEXT,
    "submissionMetadata"       JSONB,
    "meetingRecordId"          TEXT,
    "resignationDateReceived"  TIMESTAMP(3),
    "resignationMethod"        "ResignationMethod",
    "removalReason"            "RemovalReason",
    "removalNotes"             TEXT,
    "petitionVoteCount"        INTEGER,
    "petitionPrimaryDate"      TIMESTAMP(3),

    CONSTRAINT "CommitteeMembership_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "CommitteeMembership_voterRecordId_committeeListId_termId_key"
    ON "CommitteeMembership"("voterRecordId", "committeeListId", "termId");

-- CreateIndex
CREATE INDEX "CommitteeMembership_committeeListId_termId_status_idx"
    ON "CommitteeMembership"("committeeListId", "termId", "status");

CREATE INDEX "CommitteeMembership_termId_status_idx"
    ON "CommitteeMembership"("termId", "status");

CREATE INDEX "CommitteeMembership_voterRecordId_idx"
    ON "CommitteeMembership"("voterRecordId");

-- AddForeignKey
ALTER TABLE "CommitteeMembership" ADD CONSTRAINT "CommitteeMembership_voterRecordId_fkey"
    FOREIGN KEY ("voterRecordId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommitteeMembership" ADD CONSTRAINT "CommitteeMembership_committeeListId_fkey"
    FOREIGN KEY ("committeeListId") REFERENCES "CommitteeList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommitteeMembership" ADD CONSTRAINT "CommitteeMembership_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "CommitteeTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommitteeMembership" ADD CONSTRAINT "CommitteeMembership_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data backfill: VoterRecord.committeeId → CommitteeMembership (ACTIVE)
-- Only runs if an active term exists.
INSERT INTO "CommitteeMembership" (
    "id", "voterRecordId", "committeeListId", "termId",
    "status", "submittedAt", "activatedAt"
)
SELECT
    gen_random_uuid()::text,
    vr."VRCNUM",
    vr."committeeId",
    ct.id,
    'ACTIVE'::"MembershipStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "VoterRecord" vr
JOIN "CommitteeTerm" ct ON ct."isActive" = true
WHERE vr."committeeId" IS NOT NULL
ON CONFLICT ("voterRecordId", "committeeListId", "termId") DO NOTHING;

-- Data backfill: CommitteeRequest.addVoterRecordId → CommitteeMembership (SUBMITTED)
-- Only add-only and replacement requests (those with an addVoterRecordId).
INSERT INTO "CommitteeMembership" (
    "id", "voterRecordId", "committeeListId", "termId",
    "status", "submittedAt", "submissionMetadata"
)
SELECT
    gen_random_uuid()::text,
    cr."addVoterRecordId",
    cr."committeeListId",
    ct.id,
    'SUBMITTED'::"MembershipStatus",
    CURRENT_TIMESTAMP,
    CASE
        WHEN cr."removeVoterRecordId" IS NOT NULL
        THEN jsonb_build_object('removeMemberId', cr."removeVoterRecordId", 'requestNotes', cr."requestNotes")
        ELSE NULL
    END
FROM "CommitteeRequest" cr
JOIN "CommitteeTerm" ct ON ct."isActive" = true
WHERE cr."addVoterRecordId" IS NOT NULL
ON CONFLICT ("voterRecordId", "committeeListId", "termId") DO NOTHING;

-- Seed CommitteeGovernanceConfig with MCDC defaults (re-entrant: skip if row exists)
INSERT INTO "CommitteeGovernanceConfig" (
    "id", "requiredPartyCode", "maxSeatsPerLted",
    "requireAssemblyDistrictMatch", "nonOverridableIneligibilityReasons", "updatedAt"
)
VALUES (
    'mcdc-default', 'DEM', 4, true,
    ARRAY[]::"IneligibilityReason"[], CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
