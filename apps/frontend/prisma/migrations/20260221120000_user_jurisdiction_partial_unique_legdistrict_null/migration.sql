-- Enforce uniqueness when legDistrict IS NULL ("all districts").
-- PostgreSQL treats NULL values as distinct in standard unique indexes,
-- so multiple (userId, cityTown, NULL, termId) rows could be inserted.
-- This partial index ensures at most one such row per (userId, cityTown, termId).
--
-- SCHEMA DRIFT: This index is NOT in schema.prisma — Prisma does not support
-- partial indexes (WHERE clause). The migration is the source of truth for this
-- index. To resolve: (A) drop this index and rely on app-level findFirst check;
-- or (B) switch to sentinel value (legDistrict Int default -1) so @@unique suffices.
CREATE UNIQUE INDEX "UserJurisdiction_userId_cityTown_termId_legDistrict_null_key"
ON "UserJurisdiction"("userId", "cityTown", "termId")
WHERE "legDistrict" IS NULL;
