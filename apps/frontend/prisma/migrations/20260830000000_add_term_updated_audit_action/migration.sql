-- Admin term edits and active-term switches write TERM_UPDATED audit rows.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TERM_UPDATED';
