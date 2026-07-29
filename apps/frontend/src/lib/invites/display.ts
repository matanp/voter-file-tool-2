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

/** Returns Tailwind badge classes for a privilege level. */
export function getPrivilegeColor(level: PrivilegeLevel): string {
  switch (level) {
    case PrivilegeLevel.Developer:
      return "bg-purple-100 text-purple-800";
    case PrivilegeLevel.Admin:
      return "bg-red-100 text-red-800";
    case PrivilegeLevel.Leader:
      return "bg-blue-100 text-blue-800";
    case PrivilegeLevel.RequestAccess:
      return "bg-yellow-100 text-yellow-800";
    case PrivilegeLevel.ReadAccess:
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
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
