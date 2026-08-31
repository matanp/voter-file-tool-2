-- Single-record election-config edits write their own audit rows, so the bulk
-- actions are no longer the only trace of reference-data changes.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OFFICE_NAME_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OFFICE_NAME_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ELECTION_DATE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ELECTION_DATE_DELETED';
