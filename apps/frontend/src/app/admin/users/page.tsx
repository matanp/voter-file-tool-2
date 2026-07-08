/**
 * SRS 3.1 — Admin users page: list Leader+ users and manage jurisdiction assignments.
 */

import React from "react";
import { PrivilegeLevel } from "@prisma/client";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import prisma from "~/lib/prisma";
import { UsersManagementClient } from "./UsersManagementClient";

export type UserWithJurisdictions = {
  id: string;
  name: string | null;
  email: string;
  privilegeLevel: PrivilegeLevel;
  jurisdictions: Array<{
    id: string;
    cityTown: string;
    legDistrict: number | null;
    createdAt: string;
  }>;
};

export type JurisdictionMeta = {
  cityTowns: string[];
  legDistrictsByCity: Record<string, number[]>;
};

export type TermOption = {
  id: string;
  label: string;
  isActive: boolean;
};

export default async function AdminUsersPage() {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  return <AdminUsersContent />;
}

async function AdminUsersContent() {
  let activeTermId: string | null = null;
  try {
    activeTermId = await getActiveTermId();
  } catch {
    // No active term
  }

  let users: UserWithJurisdictions[] = [];
  let jurisdictionMeta: JurisdictionMeta | null = null;

  // Terms are listed for display labels; Leader invite scope is pinned to the active term.
  const terms: TermOption[] = (
    await prisma.committeeTerm.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, label: true, isActive: true },
    })
  ).map((t) => ({ id: t.id, label: t.label, isActive: t.isActive }));

  if (activeTermId != null) {
    const [fetchedUsers, committeeLists] = await Promise.all([
      prisma.user.findMany({
        where: {
          privilegeLevel: {
            in: [
              PrivilegeLevel.Leader,
              PrivilegeLevel.Admin,
              PrivilegeLevel.Developer,
            ],
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          privilegeLevel: true,
          jurisdictions: {
            where: { termId: activeTermId },
            select: {
              id: true,
              cityTown: true,
              legDistrict: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.committeeList.findMany({
        where: { termId: activeTermId },
        select: { cityTown: true, legDistrict: true },
      }),
    ]);

    const cityTowns = [...new Set(committeeLists.map((c) => c.cityTown))].sort();
    const legDistrictsByCity: Record<string, number[]> = {};
    for (const c of committeeLists) {
      if (!legDistrictsByCity[c.cityTown]) {
        legDistrictsByCity[c.cityTown] = [];
      }
      if (!legDistrictsByCity[c.cityTown]!.includes(c.legDistrict)) {
        legDistrictsByCity[c.cityTown]!.push(c.legDistrict);
      }
    }
    for (const arr of Object.values(legDistrictsByCity)) {
      arr.sort((a, b) => a - b);
    }

    users = fetchedUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      privilegeLevel: u.privilegeLevel,
      jurisdictions: u.jurisdictions.map((j) => ({
        id: j.id,
        cityTown: j.cityTown,
        legDistrict: j.legDistrict,
        createdAt: j.createdAt.toISOString(),
      })),
    }));

    jurisdictionMeta = {
      cityTowns,
      legDistrictsByCity,
    };
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-muted-foreground">
          View Leader accounts and assign jurisdictions, or create and manage
          pending signup invites.
        </p>
      </div>
      <UsersManagementClient
        activeTermId={activeTermId}
        users={users}
        jurisdictionMeta={jurisdictionMeta}
        terms={terms}
      />
    </div>
  );
}
