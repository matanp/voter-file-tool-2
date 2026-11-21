# 01 - Open-source "learn more" page

Status: needs-triage

Part of [leader-feedback-2026-11-21](../README.md).

## Ask (verbatim)

> Final note is on the open source side, having a more detailed explanation behind a learn more of what the database is built on and how to see the code or something along those lines. There was a question on that from a leader or 2

## What was asked

A "learn more" link that opens a plain-language explanation of:

- what the system is built on (data sources such as the BOE voter file, and the main technology), and
- that the code is open source, with a link to see it.

At least one or two Leaders have asked about this.

## Notes

- Decide where the link goes: the footer, the signed-in home, the sign-in page, or more than one of these. It
  should follow the ui-makeover spec's progressive disclosure principle: a quiet link, not a panel.
- The page links to the public repo, but must not repeat infrastructure details (hosts, IPs, database endpoints).
  See [security-audit/16](../../security-audit/issues/16-public-repo-disclosures.md).
- It's a natural place to say what the project does to protect people's information, once
  [security-audit/20](../../security-audit/issues/20-data-classification-policy.md) has written that down. The
  stakeholder sees that as good open-source politics and good PR.
- Open question: should the page be public (visible before sign-in) or only for signed-in users?
