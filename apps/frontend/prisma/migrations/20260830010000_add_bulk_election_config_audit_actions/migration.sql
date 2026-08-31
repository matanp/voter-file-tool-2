-- Bulk adds of election office names write OFFICE_NAMES_BULK_CREATED audit rows.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OFFICE_NAMES_BULK_CREATED';
-- Bulk adds of election dates write ELECTION_DATES_BULK_CREATED audit rows.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ELECTION_DATES_BULK_CREATED';
