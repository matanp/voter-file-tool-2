# 02 - Certbot failure is logged as "SSL certificate obtained successfully"

Status: ready-for-agent
Type: task

## What happened (2026-10-16)

`/var/log/user-data.log` on the recreated instance:

```
Certbot failed to authenticate some domains (authenticator: nginx).
  Domain: reports.opensourcepolitics.online
  Type:   connection
  Detail: 54.70.186.10: Fetching http://reports.opensourcepolitics.online/.well-known/acme-challenge/...: Timeout during connect (likely firewall problem)
...
✅ SSL certificate obtained successfully!
```

So HTTPS was never set up, but the log reports success.

## Root cause 1: the exit status is swallowed

`07-start-services.sh`:

```bash
if sudo certbot --nginx ... 2>&1 | tee /tmp/certbot.log; then
```

No script in `infrastructure/scripts/` sets `pipefail`, so the `if` tests `tee`'s exit status, which is always 0.
The `else` branch reads `${PIPESTATUS[0]}`, but that branch can never run.

Fix: inside the `if`, capture `${PIPESTATUS[0]}` right after the pipeline, or wrap the
pipeline in `set -o pipefail` (inside a subshell, so the other scripts sourced by `00-setup-all.sh` aren't affected).

## Root cause 2 (likely): certbot runs before the instance is reachable at the static IP

The ACME server couldn't connect to port 80 on `54.70.186.10`. In `main.tf`,
`aws_lightsail_static_ip_attachment` depends on the instance and is `replace_triggered_by` it, so it is
attached only *after* the instance is created. Meanwhile `user_data` runs on first boot. On a slow
setup the IP is probably attached by the time certbot runs, but nothing guarantees that.
Port 80 on the Lightsail firewall (`aws_lightsail_instance_public_ports`) has the same race.

Fix: before running certbot, poll until the domain resolves to this instance's public IP and
port 80 is reachable from outside, with a timeout of about 5 minutes. For example, compare
`dig +short "$DOMAIN_NAME"` with `curl -s https://checkip.amazonaws.com`, then retry certbot a few times
with backoff. If it still fails, print a clear `⚠️  HTTPS NOT CONFIGURED` banner and the exact manual command, and
make the final summary in `00-setup-all.sh` say that setup finished *with warnings*.

Supporting evidence: certbot run by hand about 1h45m later, with the static IP confirmed attached, succeeded.
Confirm on the next recreate whether root cause 2 really is the timing race (check the user-data log timestamps against
the Terraform apply output).

## Acceptance

- A certbot failure produces a warning, never a ✅.
- On a normal `terraform:recreate`, HTTPS for `reports.opensourcepolitics.online` works without a manual certbot run.

## Implemented (2026-10-15)

- `07-start-services.sh`: certbot's exit code now comes from `${PIPESTATUS[0]}` after the pipeline, not from the `if`. Before certbot, the script waits up to 5 minutes for `getent ahostsv4 $DOMAIN_NAME` to match `checkip.amazonaws.com`. Certbot then gets 3 tries, 30s then 60s apart, which stays under the Let's Encrypt limit of 5 failed validations per hour. A failure prints `⚠️  HTTPS NOT CONFIGURED` and the manual command.
- `00-setup-all.sh`: step scripts add to `SETUP_WARNINGS`, and the final summary says "Setup finished with warnings" when any exist.
- `main.tf`: new `certbot_email` variable, exported to `user_data`. A precondition fails `terraform plan` if it's empty while Let's Encrypt is on. The `admin@<domain>` guess is gone.
- Tested locally with a stubbed certbot and `terraform plan`, but not yet on a real recreate. Status stays as-is until the next `terraform:recreate` shows HTTPS working with no manual step and the log timestamps confirm the race.

## Comments

### Also: the certbot email is guessed, not configured

`07-start-services.sh` uses `CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN_NAME#*.}}"`, so on this
deploy the account was registered to `admin@opensourcepolitics.online`, a mailbox nobody reads. Lower priority now that ticket 05 makes `admin@` a
watched mailbox. Still, make it a
Terraform variable (`certbot_email`), pass it through `user_data`, and fail with a clear message if
SSL is enabled and the variable is empty. Let's Encrypt no longer sends expiry emails, so watching renewals
(`certbot renew --dry-run`, the certbot systemd timer) matters more than the address itself.
