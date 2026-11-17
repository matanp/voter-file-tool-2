-- The admin "create missing committees" action adds CommitteeList rows (and their
-- seats) for voter-file EDs that had none in the active term.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MISSING_COMMITTEES_CREATED';
