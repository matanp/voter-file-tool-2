import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import { committeeDataSchema } from "~/lib/validations/committee";

// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!hasPermissionFor(session.user.privilegeLevel, PrivilegeLevel.Admin)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  let cityTown: string;
  let legDistrict: string;
  let electionDistrict: string;
  let memberId: string;

  try {
    const body = (await req.json()) as unknown;
    const validatedData = committeeDataSchema.parse(body);
    cityTown = validatedData.cityTown;
    legDistrict = validatedData.legDistrict;
    electionDistrict = validatedData.electionDistrict;
    memberId = validatedData.memberId;

    // Additional validation for numeric fields
    if (!Number.isInteger(Number(electionDistrict)) || !Number(legDistrict)) {
      return NextResponse.json(
        { error: "Invalid numeric fields" },
        { status: 400 },
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const updatedCommittee = await prisma.committeeList.upsert({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: Number(legDistrict),
          electionDistrict: Number(electionDistrict),
        },
      },
      update: {
        committeeMemberList: {
          connect: { VRCNUM: memberId },
        },
      },
      create: {
        cityTown: cityTown,
        legDistrict: Number(legDistrict),
        electionDistrict: Number(electionDistrict),
        committeeMemberList: {
          connect: { VRCNUM: memberId },
        },
      },
      include: {
        committeeMemberList: true,
      },
    });

    return NextResponse.json(updatedCommittee, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
