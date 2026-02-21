export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
}

export const adminSidebarConfig: AdminNavItem[] = [
  { id: "data", label: "Data", href: "/admin", enabled: true },
  { id: "terms", label: "Terms", href: "/admin/terms", enabled: true },
  { id: "meetings", label: "Meetings", href: "/admin/meetings", enabled: true },
  { id: "users", label: "Users", href: "/admin/users", enabled: true },
  { id: "eligibility", label: "Eligibility Flags", href: "/admin/eligibility-flags", enabled: true },
  { id: "petition-outcomes", label: "Petition Outcomes", href: "/admin/petition-outcomes", enabled: true },
  { id: "audit", label: "Audit Trail", href: "/admin/audit", enabled: false },
];
