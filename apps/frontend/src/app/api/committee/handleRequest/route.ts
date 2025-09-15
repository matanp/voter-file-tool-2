import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import type { Session } from "next-auth";
import type { HandleCommitteeRequestData } from "~/lib/validations/committee";

async function handleRequestHandler(req: NextRequest, session: Session) {
  const { committeeRequestId, acceptOrReject }: HandleCommitteeRequestData =
    (await req.json()) as HandleCommitteeRequestData;

  if (
    !committeeRequestId ||
    !acceptOrReject ||
    !Number.isInteger(committeeRequestId) ||
    !["accept", "reject"].includes(acceptOrReject)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const committeeRequest = await prisma.committeeRequest.findUnique({
      where: {
        id: committeeRequestId,
      },
      include: {
        committeList: {
          include: {
            committeeMemberList: true,
          },
        },
      },
    });

    if (!committeeRequest) {
      return NextResponse.json(
        { error: "Committee request not found" },
        { status: 404 },
      );
    }

    if (acceptOrReject === "accept") {
      if (committeeRequest.removeVoterRecordId) {
        await prisma.committeeList.update({
          where: {
            id: committeeRequest.committeeListId,
          },
          data: {
            committeeMemberList: {
              disconnect: {
                VRCNUM: committeeRequest.removeVoterRecordId,
              },
            },
          },
        });
      }

      if (committeeRequest.committeList.committeeMemberList.length >= 4) {
        await prisma.committeeRequest.delete({
          where: {
            id: committeeRequestId,
          },
        });

        return NextResponse.json(
          { error: "Committee already full" },
          { status: 400 },
        );
      }

      if (committeeRequest.addVoterRecordId) {
        await prisma.committeeList.update({
          where: {
            id: committeeRequest.committeeListId,
          },
          data: {
            committeeMemberList: {
              connect: {
                VRCNUM: committeeRequest.addVoterRecordId,
              },
            },
          },
        });
      }

      await prisma.committeeRequest.delete({
        where: {
          id: committeeRequestId,
        },
      });
    } else if (acceptOrReject === "reject") {
      await prisma.committeeRequest.delete({
        where: {
          id: committeeRequestId,
        },
      });
    }

    return NextResponse.json({ message: "Request accepted" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, handleRequestHandler);
