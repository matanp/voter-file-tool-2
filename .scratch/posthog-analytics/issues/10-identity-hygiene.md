# 10 - Identity hygiene: reset on sign-out, stop anonymous person profiles

Status: ready-for-agent

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
