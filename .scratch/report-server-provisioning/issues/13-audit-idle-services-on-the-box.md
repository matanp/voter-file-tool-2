# 13 - Turn off services the box doesn't need

Status: ready-for-human
Type: task

## Why

The Lightsail `nodejs` blueprint is a Bitnami image, and it may start services we don't use, on top of our nginx and
PM2. On first boot `unattended-upgrade` and `apt-listchanges` took about 230Mi together (ticket 04). That passes, but the
daily apt timers can run again and collide with a deploy or a report.

## To do

On a settled box:

- `systemctl list-units --type=service --state=running` and `ps -eo rss,comm --sort=-rss | head -15`.
- For each service that isn't nginx, PM2, sshd, cron, the system basics or certbot's timer, decide whether it can be
  disabled. Look especially for anything Bitnami ships, such as a bundled web server (we install our own nginx).
- For apt: keep security updates, but consider moving `apt-daily.timer` / `apt-daily-upgrade.timer` to a quiet hour
  through a systemd override, so they don't run during report hours.
- Put whatever you decide into provisioning (a new step, or `01-install-dependencies.sh`), so a recreate keeps it.

## Acceptance

- The list of running services and what was disabled, recorded in the Comments, with idle RAM before and after.
- The disabling is in provisioning, not only done by hand.

## Comments
