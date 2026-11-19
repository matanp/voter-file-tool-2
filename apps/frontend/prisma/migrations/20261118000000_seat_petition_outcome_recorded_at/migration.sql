-- Seat.isPetitioned meant two things: "this seat was won by petition" (read by the
-- Vacancy and Weight reports) and "a petition outcome has been recorded" (the
-- petition-outcomes recorder's single-use latch). The latch moves to its own column so
-- the seat flag can be set for every petitioned seat without locking the recorder.

ALTER TABLE "Seat" ADD COLUMN "petitionOutcomeRecordedAt" TIMESTAMP(3);

-- Until now only the recorder set isPetitioned, so every flagged seat has a recorded
-- outcome. Carry the latch over, dated by the recorder's seat audit row when there is one.
UPDATE "Seat" s
SET "petitionOutcomeRecordedAt" = COALESCE(
  (
    SELECT MIN(a."timestamp")
    FROM "AuditLog" a
    WHERE a."entityType" = 'Seat'
      AND a."entityId" = s."id"
      AND a."action" = 'PETITION_RECORDED'
  ),
  CURRENT_TIMESTAMP
)
WHERE s."isPetitioned" = true
  AND s."petitionOutcomeRecordedAt" IS NULL;

-- Audit action for the one-time backfill of isPetitioned on imported petitioned seats.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SEAT_PETITIONED_BACKFILLED';
