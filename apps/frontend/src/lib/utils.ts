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

export function hasPermissionFor(
  userPermission: PrivilegeLevel,
  permissionCheckLevel: PrivilegeLevel,
) {
  const permissionOrder: PrivilegeLevel[] = [
    PrivilegeLevel.Developer,
    PrivilegeLevel.Admin,
    PrivilegeLevel.RequestAccess,
    PrivilegeLevel.ReadAccess,
  ];

  return (
    permissionOrder.indexOf(userPermission) <=
    permissionOrder.indexOf(permissionCheckLevel)
  );
}
