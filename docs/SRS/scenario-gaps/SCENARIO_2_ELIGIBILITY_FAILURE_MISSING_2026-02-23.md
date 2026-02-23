# Scenario 2 Gaps: Submission Fails Eligibility Checks

Date: 2026-02-23  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 2)

## Missing Items

| Gap ID | Missing item | Evidence | Impact | Severity |
| --- | --- | --- | --- | --- |
| S2-G1 | Leader-facing failure messaging is not reliably criterion-specific. | Error body built with `error` message and optional `reasons`: `apps/frontend/src/hooks/useApiMutation.ts:75`; request form shows generic toast on error: `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:82` | Users may not understand exact ineligibility reason and corrective action. | Medium |
| S2-G2 | No explicit “contact MCDC staff for exception” guidance in leader ineligibility path. | Messages map reasons but no escalation guidance: `apps/frontend/src/lib/eligibilityMessages.ts:12`; request form failure text remains generic: `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:82` | Acceptance criterion explicitly requires this guidance; currently not present as a clear UX pattern. | Medium |

## Recommended Fixes

1. In leader request UI, parse and display all returned `reasons` with user-friendly text.
2. Append a standard escalation line for hard-stop failures:
   - “If you believe this is an exception, contact MCDC staff.”
3. Add tests asserting reason rendering and escalation guidance in leader request flow.

## Definition of Done

- Leader sees one or more explicit hard-stop reasons in the request modal/page.
- Leader sees explicit staff-escalation guidance on blocked submissions.
- Tests fail if response reasons are not displayed.

