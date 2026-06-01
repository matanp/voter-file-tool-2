import { PrivilegeLevel } from "@prisma/client";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isPrivilegeLevel(
  privilegeLevel: string,
): privilegeLevel is PrivilegeLevel {
  return Object.values(PrivilegeLevel).includes(
    privilegeLevel as PrivilegeLevel,
  );
}

/**
 * Ordered privilege levels (highest to lowest). Only roles listed here have
 * any privileges; unknown roles (e.g. newly added enum values) are denied
 * until explicitly supported. SRS §3.2: Developer > Admin > Leader > RequestAccess > ReadAccess.
 */
const PRIVILEGE_ORDER: readonly PrivilegeLevel[] = [
  PrivilegeLevel.Developer,
  PrivilegeLevel.Admin,
  PrivilegeLevel.Leader,
  PrivilegeLevel.RequestAccess,
  PrivilegeLevel.ReadAccess,
] as const;

/** Returns true iff the user's privilege level meets or exceeds the required level. */
export function hasPermissionFor(
  userPermission: PrivilegeLevel,
  permissionCheckLevel: PrivilegeLevel,
): boolean {
  const userIdx = PRIVILEGE_ORDER.indexOf(userPermission);
  const requiredIdx = PRIVILEGE_ORDER.indexOf(permissionCheckLevel);

  // Unknown roles have no privileges; unknown required levels deny (fail closed).
  if (userIdx === -1 || requiredIdx === -1) return false;

  return userIdx <= requiredIdx;
}

/**
 * Reconciles initial values against available items, filtering out invalid values
 */
export function reconcileInitialValues<T extends { value: string }>(
  initialValues: string[],
  items: T[],
): string[] {
  const validValues = new Set(items.map((item) => item.value));
  return initialValues.filter((value) => validValues.has(value));
}
