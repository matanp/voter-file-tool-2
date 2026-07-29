import { type Invite, type Prisma } from "@prisma/client";
import { authEmailsEqual } from "@voter-file-tool/shared-validators";

export type InviteStateCheckInput = Pick<
  Invite,
  "usedAt" | "deleted" | "expiresAt" | "email"
>;

export type InviteStateResult =
  | { ok: true }
  | { ok: false; reason: "deleted" | "expired" | "used" };

/** Prisma where clause for a valid unused invite by email. */
export function unusedInviteWhere(
  email: string,
  now: Date = new Date(),
): Prisma.InviteWhereInput {
  return {
    email,
    usedAt: null,
    deleted: false,
    expiresAt: { gt: now },
  };
}

/** Prisma where clause for expired-but-unused invites (admin cleanup). */
export function expiredUnusedInviteWhere(
  email: string,
  now: Date,
): Prisma.InviteWhereInput {
  return {
    email,
    usedAt: null,
    deleted: false,
    expiresAt: { lte: now },
  };
}

/** Classifies invite validity after fetch; supports same-email used idempotency. */
export function classifyInviteState(
  invite: InviteStateCheckInput,
  options?: {
    now?: Date;
    allowSameEmailUsed?: boolean;
    sessionEmail?: string;
  },
): InviteStateResult {
  const now = options?.now ?? new Date();

  if (invite.deleted) {
    return { ok: false, reason: "deleted" };
  }
  if (now > invite.expiresAt) {
    return { ok: false, reason: "expired" };
  }
  if (invite.usedAt) {
    if (
      options?.allowSameEmailUsed &&
      options.sessionEmail &&
      authEmailsEqual(invite.email, options.sessionEmail)
    ) {
      return { ok: true };
    }
    return { ok: false, reason: "used" };
  }

  return { ok: true };
}
