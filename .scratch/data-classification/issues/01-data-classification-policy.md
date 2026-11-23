# 01 - Write down the data classification, and check that proprietary data stays private

Status: needs-triage
Type: task
Source: stakeholder chat 2026-11-21 ([leader-feedback-2026-11-21](../../leader-feedback-2026-11-21/README.md))

Kept outside `security-audit/` because that folder stays uncommitted until its exploit tickets ship. "security-audit NN"
below means `.scratch/security-audit/issues/NN-*.md`, which exists only in local checkouts for now.

## Ask (verbatim)

Our question:

> what exactly is the data security requirements for all the data in the system? My AI generally treats all Voter Data as PII and tries to not put it in code, or generally expose it -- but it'd be great to do a bit of an audit of what's ok / not ok.

The stakeholder's answer:

> I think in general you are right. However, it is all publicly available data, so that's why I don't generally worry about it. However, I think from an open source politics and from a PR relation angle, being able to say that we do what we can to protect people's information is a good idea
>
> From there, we definitely don't want the committee lists being publicly available in any way. Those are proprietary
>
> Along with any contact information that we personally add

## Classification as stated

| Data                                                        | Class          | Rule                                                                 |
| ----------------------------------------------------------- | -------------- | -------------------------------------------------------------------- |
| BOE voter file fields (name, address, DOB, enrollment, etc.) | Public record  | Protect anyway, as good practice and for PR. Keep current handling. |
| Committee lists (who holds which seat)                      | Proprietary    | Never publicly available in any form.                               |
| Contact info we add (phones, emails on members)             | Proprietary    | Never publicly available in any form.                               |

Practice doesn't change for voter data: keep it out of code, tickets and the public repo (see the
redaction guidance in security-audit 16).

## Task

1. **Write the policy down** where agents and contributors will find it: a `CONTEXT.md` section, or an ADR in
   `docs/adr/` if it should record the reasoning. Point to it from the redaction guidance.
2. **Check that proprietary data can't be reached publicly.** For committee membership and added contact info,
   confirm none of these expose it without the right role:
   - unauthenticated pages and API routes, including the public reports list (security-audit 12);
   - exports and generated reports, including R2 links and retention (security-audit 11, security-audit 13);
   - logs, Sentry and PostHog payloads (security-audit 07, security-audit 10, security-audit 15);
   - the public repo: fixtures, seed data, scratch docs (security-audit 16).
   Many of these are already tickets; record which ones also cover proprietary data, and file new tickets for gaps.
3. **Third-party services.** List which services receive which class of data (AI tools, geocoding if
   leader-feedback-2026-11-21/04 goes ahead, email). Decide whether proprietary data may go to them.

## Open question for the stakeholder

Is a Leader seeing committee lists outside their own jurisdiction a problem, or does "publicly available" only
mean outside the app's signed-in users?
