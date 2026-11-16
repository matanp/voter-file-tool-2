#!/bin/bash
# Sign in without Google: insert a database session for an existing local user and print its token.
# The app uses Auth.js database sessions, so a Session row + an `authjs.session-token` cookie is a login.
# Usage:
#   session.sh <Developer|Admin|Leader|RequestAccess|ReadAccess>   -> prints a token for the first such user
#   session.sh --list                                               -> users, privilege, jurisdictions
#   session.sh --cleanup                                            -> delete every session this script made
# LOCAL DB ONLY (docker container frontend-postgres-1).
set -euo pipefail
C=frontend-postgres-1
U=$(docker exec $C printenv POSTGRES_USER)
D=$(docker exec $C printenv POSTGRES_DB)
psql() { docker exec $C psql -U "$U" -d "$D" -tA "$@"; }

case ${1:-} in
  --list)
    psql -F ' | ' -c 'select u.id, u."privilegeLevel",
        coalesce(string_agg(j."cityTown" || $$ LD $$ || coalesce(j."legDistrict"::text, $$*$$), $$, $$), $$-$$)
      from "User" u left join "UserJurisdiction" j on j."userId" = u.id
      group by u.id, u."privilegeLevel" order by 2' ;;
  --cleanup)
    psql -c "delete from \"Session\" where \"sessionToken\" like 'run-frontend-%'" ;;
  Developer|Admin|Leader|RequestAccess|ReadAccess)
    uid=$(psql -c "select id from \"User\" where \"privilegeLevel\" = '$1' and id <> 'system' order by id limit 1")
    [[ -n $uid ]] || { echo "session.sh: no local user with privilegeLevel $1 (see --list)" >&2; exit 1; }
    tok="run-frontend-$(echo "$1" | tr A-Z a-z)-$(date +%s)"
    # updatedAt has no DB default (Prisma @updatedAt), so it must be given.
    psql -c "insert into \"Session\" (\"sessionToken\", \"userId\", expires, \"updatedAt\") values ('$tok', '$uid', now() + interval '1 day', now())" >/dev/null
    echo "$tok" ;;
  *) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
