import type { CommitteeDetailResponse } from "~/lib/validations/committee";

/**
 * The contract every detail tab implements (Roster, Pending, Seats & Weight,
 * History). `CommitteeTabs` renders the active tab's component from
 * `registry.ts` with exactly these props, and only once the detail has loaded,
 * so a tab never handles loading or failed-detail states itself.
 *
 * Tickets 09–12 each replace only their own tab file and keep its export name;
 * none of them edits the registry, `CommitteeTabs`, or this type.
 *
 * - Role-gated controls inside a tab read `actingPermissions` from
 *   `GlobalContext` (client visibility only; see skills/auth-check-patterns).
 *   What the caller may *see* is already decided by the server: Admin-only
 *   keys are absent from `detail` for Leaders.
 * - A tab's section heading is an `h3` (the committee context is the `h2`).
 */
export type CommitteeTabProps = {
  /** The selected committee's `committeeListId` (same as `detail.committee.committeeListId`). */
  committeeId: number;
  /** `GET /api/committee/{committeeId}/detail`, already validated. */
  detail: CommitteeDetailResponse;
  /**
   * Refetches the detail after a mutation made from inside the tab (for
   * example, an LTED weight edit). The current detail stays on screen while
   * the refetch is in flight.
   */
  onRefresh: () => void;
};
