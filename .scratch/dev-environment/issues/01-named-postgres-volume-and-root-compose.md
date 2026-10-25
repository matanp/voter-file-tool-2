# 01 - Give local Postgres a named volume, then move the compose file to the root

Status: ready-for-agent
Type: task

## Why

The project standards (`/Users/Shared/ProjectWorkflowManager/Project Standards.md`) put the compose file at
`compose.yaml` in the repo root. Ours is `apps/frontend/docker-compose.yml`, and it can't simply be moved.

The file declares no volume, so the running container `frontend-postgres-1` keeps its data in an anonymous volume
(`c0db1268…`, mounted at `/var/lib/postgresql/data`). The compose project name comes from the file's directory
(`frontend`). Moving the file changes the project name, so compose would create a new container with a new, empty
anonymous volume. The old data would still be on disk, but nothing would point at it.

Two more problems turn up along the way:

- **The image is `postgres:latest`, but the data is Postgres 16.4.** Any new pull of `latest` brings a newer major
  version, which can't start on a 16 data directory. Pin the major version.
- **An old volume, `voter-file-tool_postgres_data`, is still around** (created 2024-07-03, compose project
  `voter-file-tool`, volume `postgres_data`, used by no container). A root compose file with project name
  `voter-file-tool` and a volume named `postgres_data` would attach to that stale data without any warning.

## To do

1. **Back up first:** `docker exec frontend-postgres-1 pg_dumpall -U "$POSTGRES_USER" > <backup>.sql`, with values
   from `apps/frontend/.env`. Keep the backup until the end.
2. Create `compose.yaml` at the root:
   - `name:` set explicitly, using a volume name that can't collide with `voter-file-tool_postgres_data`
     (e.g. volume `pgdata`). Or inspect the old volume and delete it if it's stale.
   - `image: postgres:16`.
   - A named volume mounted at `/var/lib/postgresql/data`.
   - The same `command`, `ports` and `restart` as today.
3. Pick how the root file gets `POSTGRES_*` for interpolation. Today they come from `apps/frontend/.env`, which
   compose reads because it sits next to the compose file. Options: `--env-file apps/frontend/.env` wherever compose
   is called, or a root `.env` (gitignored, and listed in an env template). Choose one and document it.
4. Move the data across. Either:
   - copy the anonymous volume into the named one, with a throwaway container that mounts both and runs `cp -a`, or
   - start the new container empty and restore the dump from step 1.
5. Point every caller at the new file:
   - `scripts/dev.sh` (`COMPOSE_FILE`)
   - `scripts/setup-dev-db.sh` (`COMPOSE_FILE`, `CONTAINER_NAME`, and the `frontend_postgres` volume check, which
     never matches today because the volume is anonymous)
   - `compose` in `~/.config/project/voter-file-tool.toml`, and the comment above it
   - `docs/LOCAL_DEVELOPMENT.md` and `scripts/README.md`
6. Check that `pnpm dev` comes up and the data is there (e.g. a row count on a large table, compared before and after).
7. Then remove the old container (`docker rm frontend-postgres-1`), the anonymous volume, and
   `apps/frontend/docker-compose.yml`.

## Notes

- Port: 5432 on the host. The Handshake project's `handshake-postgres` container is also running, so check it isn't
  bound to the same host port before changing anything.
- Since the container has `restart: always`, Docker Desktop brings it back on boot whether or not `pnpm dev` runs.
