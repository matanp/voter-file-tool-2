-- Deduplicate CommitteeGovernanceConfig: keep one row (prefer id = 'mcdc-default', else earliest updatedAt)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      ORDER BY CASE WHEN id = 'mcdc-default' THEN 0 ELSE 1 END,
               "updatedAt" ASC
    ) AS rn
  FROM "CommitteeGovernanceConfig"
)
DELETE FROM "CommitteeGovernanceConfig"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Enforce singleton: at most one row (partial unique index on constant)
CREATE UNIQUE INDEX "CommitteeGovernanceConfig_singleton_key"
  ON "CommitteeGovernanceConfig" ((true));
