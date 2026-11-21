# 10 - Identity hygiene: reset on sign-out, stop anonymous person profiles

Status: resolved

## Problems

1. **No `posthog.reset()` on sign-out.** `signInButton.tsx` and the invite page call `signOut()` but never reset
   PostHog. If two people share a browser (likely at volunteer sessions or the committee office), the second
   person's anonymous pre-login events attach to the first person's profile until they sign in.
2. **`person_profiles: "always"`** creates a person for every bot and bounce: 426 anonymous persons with a 0s median
   session. They inflate "users" in every insight and count toward the person-profile quota.
3. **Duplicate persons for the same human.** At least two people have two person records each, with different roles
   (e.g. one person as both Admin `cad86007…` and Admin `5f395fd6…`). These are probably separate accounts
   (different user ids). Check whether that's expected, e.g. a re-invited user, or a sign that user ids change.

## Do

- Call `posthog.reset()` before or alongside every `signOut()`. A small `signOutEverywhere()` helper is easiest to
  keep consistent.
- Switch to `person_profiles: "identified_only"`. Anonymous pageviews are still captured but don't create persons.
- Investigate 3 and note the answer here.

## Done when

Signing out then browsing anonymously creates no events on the previous person, and new anonymous visitors don't
appear in the Persons list.

## Comments

2026-11-21: Done.

- `lib/signOut.ts` adds `signOutEverywhere()`, which calls `posthog.reset()` and then NextAuth `signOut`. The header
  Sign Out button and the invite page use it.
- `CSPostHogProvider` also resets when an identified session turns `unauthenticated` without a page reload (expiry,
  `redirect: false`). It clears its identify-dedup key so the next sign-in identifies again.
- `person_profiles: "identified_only"`.
- Tests: `__tests__/lib/signOut.test.ts`, plus two new cases in `__tests__/components/providers/PostHog.test.tsx`.

**Duplicate persons (3).** Three production people have two person records each. In every pair the two records
are identified with **different app user ids**. The older id's last `$identify` is on or before 2025-09-12. The
newer id first appears between 2025-09-13 and 2025-09-19 (in one pair, both ids were created that week, six days
apart). So the user rows were re-created once in mid-Sep 2025, probably a database rebuild or account re-creation.
User ids don't change on an ongoing basis. Nothing to fix in code. To merge history, merge the old person into
the new one in PostHog (Persons → person → Merge). Local-dev `DEV -` identities have about 15 persons per
developer email: one per local database reset. The test-account filter (07) excludes them.

Not yet checked against the live PostHog project. After deploy, check that new anonymous visitors don't appear
in Persons.
