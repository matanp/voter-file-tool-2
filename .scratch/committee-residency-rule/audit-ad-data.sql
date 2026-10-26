-- Ticket 02: audit assembly district data before widening the search filter.
-- Read-only. Run with:  psql "$DATABASE_URL" -f audit-ad-data.sql
-- A session-local temp view is the only thing created; everything else runs read-only.
-- L_T is a string on VoterRecord; only numeric values can join to legDistrict.
-- VoterRecord.city is the postal city (e.g. NORTH CHILI, SPENCERPORT), not the town, so it is
-- not part of the join. LD numbers are unique per town, so (LD, ED) identifies the LTED.
CREATE TEMP VIEW voter_vs_crosswalk AS
SELECT v."VRCNUM", v.city, v."L_T", v."electionDistrict",
       btrim(v."stateAssmblyDistrict") AS voter_ad,
       btrim(x."stateAssemblyDistrict") AS crosswalk_ad,
       x.id IS NOT NULL AS has_crosswalk
FROM "VoterRecord" v
LEFT JOIN "LtedDistrictCrosswalk" x
  ON v."L_T" ~ '^\s*\d+\s*$'
 AND x."legDistrict" = btrim(v."L_T")::int
 AND x."electionDistrict" = v."electionDistrict";

BEGIN READ ONLY;

\echo '=== 1a. Format: VoterRecord.stateAssmblyDistrict ==='
SELECT
  CASE
    WHEN "stateAssmblyDistrict" IS NULL THEN 'null'
    WHEN btrim("stateAssmblyDistrict") = '' THEN 'empty'
    WHEN "stateAssmblyDistrict" <> btrim("stateAssmblyDistrict") THEN 'needs trim'
    WHEN "stateAssmblyDistrict" ~ '^0\d+$' THEN 'leading zero'
    WHEN "stateAssmblyDistrict" ~ '^\d+$' THEN 'plain digits'
    ELSE 'other'
  END AS shape,
  count(*) AS voters,
  count(DISTINCT "stateAssmblyDistrict") AS distinct_values,
  (array_agg(DISTINCT "stateAssmblyDistrict"))[1:10] AS examples
FROM "VoterRecord"
GROUP BY 1 ORDER BY 2 DESC;

SELECT "stateAssmblyDistrict", count(*) AS voters
FROM "VoterRecord" GROUP BY 1 ORDER BY 1;

\echo '=== 1b. Format: LtedDistrictCrosswalk.stateAssemblyDistrict ==='
SELECT
  CASE
    WHEN btrim("stateAssemblyDistrict") = '' THEN 'empty'
    WHEN "stateAssemblyDistrict" <> btrim("stateAssemblyDistrict") THEN 'needs trim'
    WHEN "stateAssemblyDistrict" ~ '^0\d+$' THEN 'leading zero'
    WHEN "stateAssemblyDistrict" ~ '^\d+$' THEN 'plain digits'
    ELSE 'other'
  END AS shape,
  count(*) AS lteds,
  count(DISTINCT "stateAssemblyDistrict") AS distinct_values,
  (array_agg(DISTINCT "stateAssemblyDistrict"))[1:10] AS examples
FROM "LtedDistrictCrosswalk"
GROUP BY 1 ORDER BY 2 DESC;

SELECT "stateAssemblyDistrict", count(*) AS lteds
FROM "LtedDistrictCrosswalk" GROUP BY 1 ORDER BY 1;

\echo '=== 1c. ADs on one side but not the other (after trim) ==='
WITH v AS (SELECT DISTINCT btrim("stateAssmblyDistrict") ad FROM "VoterRecord"
           WHERE btrim(coalesce("stateAssmblyDistrict", '')) <> ''),
     x AS (SELECT DISTINCT btrim("stateAssemblyDistrict") ad FROM "LtedDistrictCrosswalk"
           WHERE btrim("stateAssemblyDistrict") <> '')
SELECT coalesce(v.ad, x.ad) AS ad,
       CASE WHEN v.ad IS NULL THEN 'crosswalk only' ELSE 'voters only' END AS side
FROM v FULL JOIN x ON v.ad = x.ad
WHERE v.ad IS NULL OR x.ad IS NULL
ORDER BY 1;

\echo '=== 2. Coverage: active-term committees without a usable crosswalk AD ==='
SELECT
  count(*) AS active_committees,
  count(*) FILTER (WHERE x.id IS NULL) AS no_crosswalk_row,
  count(*) FILTER (WHERE x.id IS NOT NULL AND btrim(x."stateAssemblyDistrict") = '') AS empty_ad
FROM "CommitteeList" c
JOIN "CommitteeTerm" t ON t.id = c."termId" AND t."isActive"
LEFT JOIN "LtedDistrictCrosswalk" x
  ON x."cityTown" = c."cityTown"
 AND x."legDistrict" = c."legDistrict"
 AND x."electionDistrict" = c."electionDistrict";

SELECT c.id, c."cityTown", c."legDistrict", c."electionDistrict",
       CASE WHEN x.id IS NULL THEN 'no crosswalk row' ELSE 'empty AD' END AS problem,
       (SELECT count(*) FROM "LtedDistrictCrosswalk" x2
        WHERE upper(btrim(x2."cityTown")) = upper(btrim(c."cityTown"))
          AND x2."legDistrict" = c."legDistrict"
          AND x2."electionDistrict" = c."electionDistrict") AS case_insensitive_matches
FROM "CommitteeList" c
JOIN "CommitteeTerm" t ON t.id = c."termId" AND t."isActive"
LEFT JOIN "LtedDistrictCrosswalk" x
  ON x."cityTown" = c."cityTown"
 AND x."legDistrict" = c."legDistrict"
 AND x."electionDistrict" = c."electionDistrict"
WHERE x.id IS NULL OR btrim(x."stateAssemblyDistrict") = ''
ORDER BY 2, 3, 4;

\echo '=== 2b. Town labels: committee town vs crosswalk town for the same (LD, ED) ==='
SELECT c."legDistrict", c."cityTown" AS committee_town, x."cityTown" AS crosswalk_town,
       count(*) AS committees
FROM "CommitteeList" c
JOIN "CommitteeTerm" t ON t.id = c."termId" AND t."isActive"
JOIN "LtedDistrictCrosswalk" x
  ON x."legDistrict" = c."legDistrict" AND x."electionDistrict" = c."electionDistrict"
WHERE x."cityTown" <> c."cityTown"
GROUP BY 1, 2, 3 ORDER BY 1;

\echo '=== 3. Consistency: voter AD vs crosswalk AD of their home LTED ==='
SELECT
  count(*) AS voters,
  count(*) FILTER (WHERE NOT has_crosswalk) AS home_lted_not_in_crosswalk,
  count(*) FILTER (WHERE has_crosswalk AND voter_ad IS NOT DISTINCT FROM crosswalk_ad) AS match,
  count(*) FILTER (WHERE has_crosswalk AND voter_ad IS DISTINCT FROM crosswalk_ad) AS mismatch,
  count(*) FILTER (WHERE has_crosswalk AND voter_ad IS DISTINCT FROM crosswalk_ad
                   AND ltrim(voter_ad, '0') = ltrim(crosswalk_ad, '0')) AS mismatch_only_leading_zeros
FROM voter_vs_crosswalk;

\echo '--- why home LTED is not in the crosswalk ---'
SELECT
  CASE
    WHEN "L_T" IS NULL OR "electionDistrict" IS NULL THEN 'missing L_T/ED'
    WHEN "L_T" !~ '^\s*\d+\s*$' THEN 'non-numeric L_T'
    ELSE 'LTED absent from crosswalk'
  END AS reason,
  count(*) AS voters
FROM voter_vs_crosswalk WHERE NOT has_crosswalk
GROUP BY 1 ORDER BY 2 DESC;

\echo '--- mismatches by (voter AD, crosswalk AD) ---'
SELECT voter_ad, crosswalk_ad, count(*) AS voters,
       count(DISTINCT (city, "L_T", "electionDistrict")) AS lteds
FROM voter_vs_crosswalk
WHERE has_crosswalk AND voter_ad IS DISTINCT FROM crosswalk_ad
GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 25;

\echo '--- sample mismatches ---'
SELECT "VRCNUM", city, "L_T", "electionDistrict", voter_ad, crosswalk_ad
FROM voter_vs_crosswalk
WHERE has_crosswalk AND voter_ad IS DISTINCT FROM crosswalk_ad
ORDER BY random() LIMIT 10;

ROLLBACK;
