# 19 - Leaders pin features to their home page

Status: needs-info

Blocked by: 10

Part of [ui-makeover](../spec.md).

## Ask

From the 2026-11-21 stakeholder review: let Leaders pick the top three features they want pinned to their home page, with an option to change them in settings.

## Proposal

- After 10 ships, the home page gets a "Pinned" row of up to three shortcuts above "My committees".
- Candidate pins: find a voter, my committees, pending items, generate a sign-in sheet, generate a committee roster, vacancy report, recent reports.
- A settings page (or a section of the profile sheet) lets the user choose and order up to three. Defaults apply until they choose.
- Store the choice per user (for example a `homePins` JSON column on `User`, or a small `UserPreference` table).

## Open questions

- Which features count as pinnable? Whole sections, specific report types, or both?
- Do Admins get pins too, or only Leaders?
- There is no user settings page today. Where should the setting live: the profile sheet, or a new `/settings`?

## Acceptance

- A Leader can choose up to three pins, and they appear on their home page at 375 and 1280.
- The choice survives sign-out and works across devices.
- Pins respect privilege: an option a user can't use is never offered.

## Comments

### 2026-11-21 - triage

Needs info from the stakeholder: the three open questions above (what is pinnable, Admin pins or not, where the setting lives). Can't start before 10 ships anyway.
