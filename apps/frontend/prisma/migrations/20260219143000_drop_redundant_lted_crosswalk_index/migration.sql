-- 1.R.12: Remove redundant non-unique index that duplicates the LTED unique constraint.
DROP INDEX IF EXISTS "LtedDistrictCrosswalk_cityTown_legDistrict_electionDistrict_idx";
