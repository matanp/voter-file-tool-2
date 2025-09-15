import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { committeeDataSchema } from "~/lib/validations/committee";
import { PrivilegeLevel } from "@prisma/client";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";

// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
export async function POST(req: NextRequest) {
  // const { electionDistrict, memberId } = req.body;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!hasPermissionFor(session.user.privilegeLevel, PrivilegeLevel.Admin)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
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
    const existingElectionDistrict = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: parseInt(legDistrict, 10),
          electionDistrict: parseInt(electionDistrict, 10),
        },
      },
      include: { committeeMemberList: true },
    });

    if (!existingElectionDistrict) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    await prisma.voterRecord.update({
      where: { VRCNUM: memberId },
      data: {
        committeeId: null,
      },
    });

    return NextResponse.json("success", { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
