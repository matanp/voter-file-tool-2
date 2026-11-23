# Stakeholder feedback, 2026-11-21

Feedback received Saturday 2026-11-21 by chat, roughly 1:00 PM to 1:44 PM. Each ticket in `issues/` quotes its
part word for word; nothing has been triaged or specified yet.

The first part of the same chat is already tracked elsewhere:

- Leaders requesting committee adds and contact updates from voter search: [ui-makeover/21](../ui-makeover/issues/21-request-from-voter-search.md).
- "People want to see what they want to do the first place they look … without letting it get too busy":
  [ui-makeover/22](../ui-makeover/issues/22-cross-link-audit.md) and the ui-makeover spec's principles.
- "ADA accessibility": comment on [accessibility/01](../accessibility/issues/01-app-wide-accessibility-review.md).

Earlier feedback: [leader-feedback-2026-11-11](../leader-feedback-2026-11-11/README.md).

## Original thread (verbatim, from the open-source note on)

Lines starting "Us:" are our replies. Everything else is from the stakeholder.

> Final note is on the open source side, having a more detailed explanation behind a learn more of what the database is built on and how to see the code or something along those lines. There was a question on that from a leader or 2
>
> lol sorry now my brain is rolling. On the admin side for the absentee and election turnout results I'll share a few dashboards I built with Claude this year that I'd love to build into the system for next year so I can produce the info without the AI usage.
>
> This wouldn't be needed until next March
>
> Us: please send as many ideas as you have!
>
> There is the petition generation angle. But then there is also a use for a petition tracking module where users can log the signatures collected noting by who and when.
>
> Us: btw -- one thing I'd love to get some clarity on, what exactly is the data security requirements for all the data in the system? My AI generally treats all Voter Data as PII and tries to not put it in code, or generally expose it -- but it'd be great to do a bit of an audit of what's ok / not ok. I know you've been sending a lot of voter data to the AI and such, so I think my data security practices are in line with yours?
>
> Us: no rush on this, just remembering to mention it ^
>
> If we go crazy there we would include a GIS function to produce maps for people to collect signatures from valid signers
>
> I think in general you are right. However, it is all publicly available data, so that's why I don't generally worry about it. However, I think from an open source politics and from a PR relation angle, being able to say that we do what we can to protect people's information is a good idea
>
> From there, we definitely don't want the committee lists being publicly available in any way. Those are proprietary
>
> Along with any contact information that we personally add
>
> (Replying to "There is the petition generation angle. But then there is also a use for a petition tracking module …")
> I'll share a Google sheet of how this has been done in the past
>
> I don't know if you have this somewhere in the notes, but ballot generation should be somewhere in there at some point. I can help design various templates for internal party ballots to help them be pregenerated for committee meetings
>
> Us: cool, I'll need more info about ballot generation but I'll get it written down needing triage. and all sounds good

## Tickets

| #   | Ticket                                                                         | Covers                         | Waiting on                    |
| --- | ------------------------------------------------------------------------------ | ------------------------------ | ----------------------------- |
| 01  | [Open-source "learn more" page](issues/01-open-source-learn-more.md)           | Open-source note               | —                             |
| 02  | [Absentee and turnout dashboards](issues/02-absentee-and-turnout-dashboards.md) | Admin dashboards               | Triage (dashboards received) |
| 03  | [Petition signature tracking](issues/03-petition-signature-tracking.md)         | Petition tracking module       | Stakeholder's Google Sheet    |
| 04  | [Signer maps (GIS)](issues/04-signer-maps-gis.md)                               | GIS function                   | 03                            |
| 05  | [Internal party ballot generation](issues/05-internal-party-ballot-generation.md) | Ballot generation            | Stakeholder's template input  |
| 06  | [Petition objection research](issues/06-petition-objection-research.md)         | Shared "Objections" folder     | —                             |

## Materials shared after the chat

- Three Claude dashboards for early voting, mail ballots and results. PDF exports are in the gitignored
  `data/turnout-dashboards-2026/` (one includes voter contact details). They are described in [02](issues/02-absentee-and-turnout-dashboards.md).
- An "Objections" folder of 2026 petition-challenge workbooks, scans and BOE forms. It contains PII, so it's kept
  only in the gitignored `data/petition-objections/`. It's described in [06](issues/06-petition-objection-research.md).

The data-security answer is tracked as [data-classification/01](../data-classification/issues/01-data-classification-policy.md).
