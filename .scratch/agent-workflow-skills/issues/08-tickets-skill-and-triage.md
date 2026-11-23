# 08 - Ticket-handling skill, and make `triage` model-invocable

Status: needs-triage
Type: task
Source: transcript analysis, 2026-11-20 (see ../README.md)
Blocked by: 07

## Problem

Ticket work (write, triage, "what's next", status, close) is the most common kind of session. Each time:

- `docs/agents/issue-tracker.md` and `triage-labels.md` are re-read (12+ sessions).
- When you paste a row from the Tickets pane, the assistant has to grep for which project it belongs to (4 times).
- The rules are re-inferred: `ready-for-human` while the PR is open, `resolved` after merge. `done` vs `resolved`
  drifted, and one session bulk-rewrote them.

The repo's `triage` skill has `disable-model-invocation: true`, so "help me triage X" never loads it.

## Proposal

- A short skill covering:
  - the ticket template (`# NN - Title` / `Status:` / `Type:` / `Blocked by:` / `## Why` / `## Acceptance criteria`
    / `## Comments`)
  - numbering via 07
  - the status lifecycle
  - lead with a "worth doing?" judgement
  - no invented requirements (one session invented an "email bounced" requirement)
  - fold small fixes into the current ticket instead of filing new ones
  - redact voter PII
- **After a grilling session:** write the decisions into the existing ticket. `/to-spec` overreached once: "I just
  want to write the decisions we made into the ticket".
- Decide whether to flip `disable-model-invocation` on `triage`, or have the new skill point at it.

## Open questions

- One skill, or fold this into 09 (wrap-up) and 01 (review follow-through)?
