# 05 - Make sure someone actually reads admin@opensourcepolitics.online

Status: ready-for-human
Type: task

## Why

The Let's Encrypt account for `reports.opensourcepolitics.online` is registered to
`admin@opensourcepolitics.online` (setup derives the address from the domain; see ticket 02). Nobody is known to read
that mailbox, so account and certificate notices from Let's Encrypt go nowhere. It may also be the
obvious contact address for other services tied to the domain.

## To do

- Check whether the mailbox exists at all: `dig MX opensourcepolitics.online`. With no MX record, mail to it bounces.
- If there's no mail hosting, set up forwarding through the domain registrar or DNS provider (most offer
  free email forwarding), or through Cloudflare Email Routing, to an inbox someone reads.
- Send a test email to the address and confirm it arrives.
- Note in `infrastructure/DEPLOYMENT_SETUP.md` where `admin@` forwards to.

## Acceptance

- An email sent to `admin@opensourcepolitics.online` shows up in a mailbox that's being watched.

## Comments

### 2026-11-08: verification update

Current provisioning and manual certificate recovery used `admin@opensourcepolitics.com`, not the `.online` address described above. No mailbox delivery/monitoring verification was supplied. Confirm the intended contact address and its monitored delivery before changing mail configuration; do not assume the historical `.online` forwarding task is still the desired solution. This ticket remains open.
