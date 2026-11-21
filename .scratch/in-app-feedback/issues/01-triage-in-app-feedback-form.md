# 01 - Triage and grill: in-app feedback form

Status: needs-triage
Type: grilling

## Idea

Add an in-app feedback form so users can report problems and make requests as they onboard, without needing to
text or email the maintainer. This ticket is for triaging and grilling the idea (use the `grilling` skill), not
for building it. The output is a decision and a short spec or follow-up tickets.

## Today

- Feedback arrives by text and chat (see the `leader-feedback-*` folders). It's transcribed into tickets by hand.
- PostHog (`posthog-js`, `components/providers/PostHog.tsx`) and Sentry (`@sentry/nextjs`) are already
  installed. Both offer ready-made feedback features: PostHog Surveys, and Sentry's User Feedback widget, which
  can attach a replay or error context.

## Questions to grill

**Who and when**
- Who can send feedback: every signed-in role, or also RequestAccess / ReadAccess users and people who aren't
  signed in?
- Is it always available (a quiet link or button), offered at moments (after onboarding, after a failed
  action), or both? Keep it in line with the ui-makeover spec's progressive disclosure principle.

**What gets captured**
- Free text only, or a type too (bug, request, question)?
- Automatic context: current page, role, jurisdiction, browser, app version, a screenshot?
- Voter PII: users will paste voter names and details into the text, and screenshots will show them. Where may
  that go? Check against [data-classification/01](../../data-classification/issues/01-data-classification-policy.md).
  Committee lists and added contact info are proprietary.

**Where it goes**
- Build it ourselves (a DB table plus an Admin inbox page), or use PostHog Surveys or Sentry User Feedback?
  Weigh: PII going to a third party, who can read it, and how much code it takes.
- Who is notified, and how: email (see `.scratch/email-sending/`), an Admin queue, or just the maintainer?
- How does an item become a `.scratch` ticket? By hand, or with a helper script or agent step?

**Closing the loop**
- Does the sender see a status or get a reply ("fixed", "planned", "won't do")?
- Is there an audit trail (see `.scratch/admin-audit-trail/`)?

**Scope**
- What is the smallest version that's useful for the current onboarding wave?

## Output

Record the decisions under `## Answer` in this file. Then write `spec.md` in this folder and split the work into
numbered tickets, or close this as `wontfix` with the reason.
