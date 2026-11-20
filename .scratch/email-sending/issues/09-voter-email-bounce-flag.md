Type: task
Status: needs-triage
Blocked by: 06

## Question

Should the app mark a committee member's email as bounced, so the sign-in sheet can show
`Email bounced, please update` the way the Brighton reference sheet does?

Raised by [leader-feedback 11](../../leader-feedback-2026-11/issues/11-sign-in-sheet-redesign.md) (sign-in sheet
redesign), which leaves this out because there is no bounce data today.

Things to decide:
- Ticket 06's delivery webhooks only report bounces for mail **this app sends**. A voter/member email only gets
  a bounce status if the app actually emails committee members. Without that, there is nothing to receive.
- Where the flag lives (on the voter's email, on the committee membership, or derived from `EmailLog`), and
  when it clears: a new BOE import with a different email, or a manual edit.
- Whether anything besides the sign-in sheet shows it (roster exports, member pages).
