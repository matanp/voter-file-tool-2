# 05 - Playbook for the next volunteer break-it session

Status: ready-for-human

The May session produced plenty of signal (about 1,300 searches, 28 rage clicks), but it was hard to use afterwards.
The replays expired, there were no outcome events, and testers can't be told apart from real users.

## Before

- Land 08 (custom events) and 09 (exceptions) so failures show up as data, not guesses.
- Land 06 (replay masking) before testers use real voter data.
- Tag testers, either with a `tester: true` person property set at identify time or with a PostHog cohort of their
  person ids. Analytics can then include or exclude them explicitly.
- Give each tester a short brief of flows to attack: record search (simple and advanced), add/replace member,
  report generation and download, petitions.

## During

- Testers note the time when something feels broken. That makes finding the replay trivial.

## After (within 30 days)

- Make a PostHog replay playlist filtered to tester cohort + `$rageclick` or `$exception`. Saved playlists keep
  their recordings past normal retention.
- Triage each cluster into a ticket under the relevant `.scratch/` feature, the way 01 does.
- Run the 03 checks.
