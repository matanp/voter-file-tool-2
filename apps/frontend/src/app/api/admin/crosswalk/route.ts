/**
 * SRS 3.7 — LTED Crosswalk admin API.
 * POST: create/update single crosswalk row.
 * GET: list crosswalk entries with pagination and filters.
 */

import { PrivilegeLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { withPrivilege, type SessionWithUser } from "~/app/api/lib/withPrivilege";
import {
  crosswalkUpsertSchema,
  crosswalkListQuerySchema,
} from "~/lib/validations/crosswalk";

async function postHandler(req: NextRequest, _session: SessionWithUser) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateRequest(body, crosswalkUpsertSchema);
  if (!validation.success) return validation.response;

  const data = validation.data;
  const cityTown = data.cityTown.trim().toUpperCase();

  const record = await prisma.ltedDistrictCrosswalk.upsert({
    where: {
      cityTown_legDistrict_electionDistrict: {
        cityTown,
        legDistrict: data.legDistrict,
        electionDistrict: data.electionDistrict,
      },
    },
    create: {
      cityTown,
      legDistrict: data.legDistrict,
      electionDistrict: data.electionDistrict,
      stateAssemblyDistrict: data.stateAssemblyDistrict,
      stateSenateDistrict: data.stateSenateDistrict ?? null,
      congressionalDistrict: data.congressionalDistrict ?? null,
      countyLegDistrict: data.countyLegDistrict ?? null,
    },
    update: {
      stateAssemblyDistrict: data.stateAssemblyDistrict,
      stateSenateDistrict: data.stateSenateDistrict ?? null,
      congressionalDistrict: data.congressionalDistrict ?? null,
      countyLegDistrict: data.countyLegDistrict ?? null,
    },
  });

  return NextResponse.json(record, { status: 200 });
}

async function getHandler(_req: NextRequest, _session: SessionWithUser) {
  const { searchParams } = new URL(_req.url);
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = crosswalkListQuerySchema.safeParse(raw);

  const page = parsed.success ? parsed.data.page : 1;
  const pageSize = parsed.success ? parsed.data.pageSize : 25;
  const cityTown = parsed.success ? parsed.data.cityTown : undefined;
  const legDistrict = parsed.success ? parsed.data.legDistrict : undefined;

  const where: {
    cityTown?: string;
    legDistrict?: number;
  } = {};
  if (cityTown?.trim()) {
    where.cityTown = cityTown.trim().toUpperCase();
  }
  if (legDistrict !== undefined) {
    where.legDistrict = legDistrict;
  }

  const [records, total, lastImport, governanceConfig, distinctCityTowns] =
    await Promise.all([
    prisma.ltedDistrictCrosswalk.findMany({
      where,
      orderBy: [{ cityTown: "asc" }, { legDistrict: "asc" }, { electionDistrict: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ltedDistrictCrosswalk.count({ where }),
    prisma.auditLog.findFirst({
      where: { action: "CROSSWALK_IMPORTED" },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    }),
    prisma.committeeGovernanceConfig.findFirst({
      select: { requireAssemblyDistrictMatch: true },
    }),
    prisma.ltedDistrictCrosswalk.findMany({
      select: { cityTown: true },
      distinct: ["cityTown"],
      orderBy: { cityTown: "asc" },
    }),
  ]);

  return NextResponse.json({
    data: records,
    total,
    page,
    pageSize,
    lastImported: lastImport?.timestamp?.toISOString() ?? null,
    requireAssemblyDistrictMatch: governanceConfig?.requireAssemblyDistrictMatch ?? true,
    cityTowns: distinctCityTowns.map((r) => r.cityTown),
  });
}

export const POST = withPrivilege(PrivilegeLevel.Admin, postHandler);
export const GET = withPrivilege(PrivilegeLevel.Admin, getHandler);
