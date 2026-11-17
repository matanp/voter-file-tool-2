/** Nav items that show a live count after their label. */
export type AdminNavCountKey = "pendingReview";

/** Live counts shown after a nav item's label, keyed by the item's `countKey`. */
export type AdminNavCounts = Partial<Record<AdminNavCountKey, number>>;

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  /** Set when the sidebar appends a live count to this item's label. */
  countKey?: AdminNavCountKey;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const adminSidebarGroups: AdminNavGroup[] = [
  {
    id: "setup",
    label: "Setup",
    items: [
      {
        id: "terms",
        label: "Committee Terms",
        href: "/admin/terms",
        enabled: true,
      },
      {
        id: "election-config",
        label: "Election Config",
        href: "/admin/election-config",
        enabled: true,
      },
      {
        id: "governance-config",
        label: "Governance Config",
        href: "/admin/governance-config",
        enabled: true,
      },
    ],
  },
  {
    id: "import-data",
    label: "Import Data",
    items: [
      {
        id: "absentee-report",
        label: "Absentee Report",
        href: "/admin/absentee-report",
        enabled: true,
      },
      {
        id: "lted-crosswalk",
        label: "LTED Crosswalk",
        href: "/admin/lted-crosswalk",
        enabled: true,
      },
      {
        id: "voter-import",
        label: "Voter Import",
        href: "/admin/voter-import",
        enabled: true,
      },
      {
        id: "weighted-table",
        label: "Weighted Table",
        href: "/admin/weighted-table",
        enabled: true,
      },
    ],
  },
  {
    id: "review-queues",
    label: "Review Queues",
    items: [
      {
        id: "discrepancies",
        label: "Discrepancies",
        href: "/admin/discrepancies",
        enabled: true,
      },
      {
        id: "eligibility-flags",
        label: "Eligibility Flags",
        href: "/admin/eligibility-flags",
        enabled: true,
      },
      {
        // Submissions and Exit Reports awaiting a decision. Lives outside /admin.
        id: "pending-review",
        label: "Pending review",
        href: "/committees/requests",
        enabled: true,
        countKey: "pendingReview",
      },
    ],
  },
  {
    id: "committee-operations",
    label: "Committee Operations",
    items: [
      {
        id: "meetings",
        label: "Meetings",
        href: "/admin/meetings",
        enabled: true,
      },
      {
        id: "petition-outcomes",
        label: "Petition Outcomes",
        href: "/admin/petition-outcomes",
        enabled: true,
      },
    ],
  },
  {
    id: "access-oversight",
    label: "Access & Oversight",
    items: [
      {
        id: "audit",
        label: "Audit Trail",
        href: "/admin/audit",
        enabled: true,
      },
      { id: "users", label: "Users", href: "/admin/users", enabled: true },
    ],
  },
];

/** Flat view of every nav item across all groups, in display order. */
export const adminSidebarConfig: AdminNavItem[] = adminSidebarGroups.flatMap(
  (group) => group.items,
);
