-- Fix default term label: en-dash (U+2013) → ASCII hyphen (U+002D)
UPDATE "CommitteeTerm"
SET "label" = '2024-2026'
WHERE "id" = 'term-default-2024-2026';
