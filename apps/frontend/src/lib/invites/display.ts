import { PrivilegeLevel } from "@prisma/client";

export type SerializedInviteJurisdiction = {
  id: string;
  cityTown: string;
  legDistrict: number | null;
  termId: string;
  term: { label: string };
};

/** Formats a jurisdiction scope for invite UI display. */
export function jurisdictionLabel(
  cityTown: string,
  legDistrict: number | null,
): string {
  return legDistrict != null
    ? `${cityTown} — LD ${legDistrict}`
    : `${cityTown} (all districts)`;
}

const PRIVILEGE_LABELS: Record<PrivilegeLevel, string> = {
  [PrivilegeLevel.Developer]: "Developer",
  [PrivilegeLevel.Admin]: "Admin",
  [PrivilegeLevel.Leader]: "Leader",
  [PrivilegeLevel.RequestAccess]: "Request Access",
  [PrivilegeLevel.ReadAccess]: "Read Access",
};

/**
 * The user-facing name of a privilege level. Privileges render as neutral tags
 * (`<StatusBadge tone="neutral">`): a privilege is not a status.
 */
export function privilegeLabel(level: PrivilegeLevel): string {
  return PRIVILEGE_LABELS[level];
}

/** Formats an invite date/time string for display. */
export function formatInviteDate(
  dateString: string,
  options?: { month?: "short" | "long" },
): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: options?.month ?? "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
