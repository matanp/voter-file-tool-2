export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
}

export const adminSidebarConfig: AdminNavItem[] = [
  { id: "data", label: "Data", href: "/admin", enabled: true },
  { id: "terms", label: "Terms", href: "/admin/terms", enabled: true },
  { id: "meetings", label: "Meetings", href: "/admin/meetings", enabled: false },
  { id: "users", label: "Users", href: "/admin/users", enabled: false },
  { id: "eligibility", label: "Eligibility Flags", href: "/admin/eligibility-flags", enabled: false },
  { id: "petition-outcomes", label: "Petition Outcomes", href: "/admin/petition-outcomes", enabled: true },
  { id: "audit", label: "Audit Trail", href: "/admin/audit", enabled: false },
];
