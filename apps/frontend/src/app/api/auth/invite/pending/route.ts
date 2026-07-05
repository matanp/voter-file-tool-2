import { NextResponse, type NextRequest } from "next/server";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { findValidUnusedInviteWithScope } from "~/lib/applyPendingInvite";

async function getPendingInviteHandler(
  _req: NextRequest,
  session: SessionWithUser,
) {
  const email = session.user.email;
  if (!email) {
    return NextResponse.json(null);
  }

  const invite = await findValidUnusedInviteWithScope(email);
  if (!invite) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    token: invite.token,
    privilegeLevel: invite.privilegeLevel,
    jurisdictions: invite.jurisdictions.map((jurisdiction) => ({
      id: jurisdiction.id,
      cityTown: jurisdiction.cityTown,
      legDistrict: jurisdiction.legDistrict,
      termId: jurisdiction.termId,
      term: jurisdiction.term,
    })),
  });
}

export const GET = withPrivilege("Authenticated", getPendingInviteHandler);
