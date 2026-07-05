-- Normalize auth identity emails to lowercase trimmed form for case-insensitive matching.
UPDATE "User"
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

UPDATE "PrivilegedUser"
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

UPDATE "Invite"
SET email = lower(trim(email))
WHERE email <> lower(trim(email));
