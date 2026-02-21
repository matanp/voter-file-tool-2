/**
 * SRS 3.1 — Admin users page: list Leader+ users and manage jurisdiction assignments.
 */

import React from "react";
import { PrivilegeLevel } from "@prisma/client";
import AuthCheck from "~/components/ui/authcheck";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import prisma from "~/lib/prisma";
import { UsersClient } from "./UsersClient";

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

export default async function AdminUsersPage() {
  return (
    <AuthCheck privilegeLevel={PrivilegeLevel.Admin}>
      <AdminUsersContent />
    </AuthCheck>
  );
}

async function AdminUsersContent() {
  let activeTermId: string | null = null;
  try {
    activeTermId = await getActiveTermId();
  } catch {
    // No active term
  }

  if (activeTermId == null) {
    return (
      <div className="w-full p-6">
        <h1 className="text-2xl font-semibold mb-6">Users</h1>
        <p className="text-muted-foreground">
          No active committee term is set. Configure an active term to manage
          user jurisdictions.
        </p>
      </div>
    );
  }

  const [users, committeeLists] = await Promise.all([
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

  const serializedUsers: UserWithJurisdictions[] = users.map((u) => ({
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

  const meta: JurisdictionMeta = {
    cityTowns,
    legDistrictsByCity,
  };

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-6">Users</h1>
      <UsersClient
        users={serializedUsers}
        activeTermId={activeTermId}
        jurisdictionMeta={meta}
      />
    </div>
  );
}
