# 21 - R2 setup for Resignation Letters

Status: ready-for-human

Blocked by: none. Blocks shipping 08.

## Why

Ticket 08 stores Resignation Letters in the existing R2 bucket under `resignation-letters/`. The bucket isn't
managed by Terraform, so three settings have to be made by hand in the Cloudflare dashboard. The steps are in
`DEPLOYMENT_GUIDE.md` ("Cloudflare R2: Resignation Letters").

## Steps (Matan)

1. **Bucket privacy (08 decision 11).** R2 → the bucket → Settings. Check that r2.dev public access is disabled
   and no custom domain is connected. If either is on, stop and decide before shipping 08: letters hold members'
   signatures.
2. **Lifecycle rules (08 decisions 5, 10).**
   - `resignation-letters/staging/`: delete after 1 day.
   - `resignation-letters/rejected/`: delete after 90 days.
   - No rule for the rest of `resignation-letters/`.
3. **CORS.** Allow `PUT` with the `content-type` header from the app's origin, unless the Admin CSV upload already
   works from the browser (it uses the same presigned-PUT mechanism, so the policy may already exist).

## Acceptance criteria

- [ ] The bucket has no public access (confirmed in the dashboard, noted in a comment here).
- [ ] Both lifecycle rules exist with the prefixes and ages above.
- [ ] A Leader can upload a letter from the deployed app (the browser PUT isn't blocked by CORS).

## Comments

- 2026-11-07: Written while building 08; these can't be done or checked from the repo.
