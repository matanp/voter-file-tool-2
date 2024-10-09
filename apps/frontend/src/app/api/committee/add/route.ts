import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";

export interface CommitteeData {
  cityTown: string;
  legDistrict: string;
  electionDistrict: string;
  memberId: string;
}

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

  const { cityTown, legDistrict, electionDistrict, memberId }: CommitteeData =
    (await req.json()) as CommitteeData;

  if (
    !cityTown ||
    !legDistrict ||
    !electionDistrict ||
    !memberId ||
    !Number.isInteger(electionDistrict) ||
    !Number(legDistrict)
  ) {
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
