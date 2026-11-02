-- Weighted-table imports rewrite CommitteeList.ltedWeight and Seat.weight county-wide,
-- so they get their own audit action alongside CROSSWALK_IMPORTED.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WEIGHTED_TABLE_IMPORTED';
