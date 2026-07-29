import {
  AuditAction,
  type Invite,
  type InviteJurisdiction,
  type Prisma,
  PrivilegeLevel,
} from "@prisma/client";
import {
  authEmailsEqual,
  canonicalizeAuthEmail,
  canonicalizeAuthEmailOrNull,
} from "@voter-file-tool/shared-validators";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  unusedInviteWhere,
} from "~/lib/invites/validity";
import prisma from "~/lib/prisma";

export class InviteGrantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InviteGrantError";
  }
}

export type AppliedJurisdiction = {
  id: string;
  cityTown: string;
  legDistrict: number | null;
  termId: string;
};

export type InviteGrantResult =
  | { status: "no_invite" }
  | {
      status: "applied" | "already_applied";
      privilegeLevel: PrivilegeLevel;
      inviteId: string;
      createdBy: string;
      jurisdictions: AppliedJurisdiction[];
    };

export type ApplyPendingInviteOptions = {
  tx?: Prisma.TransactionClient;
  expectedInviteId?: string;
};

type InviteWithJurisdictions = Invite & {
  jurisdictions: InviteJurisdiction[];
};

export type InviteWithScope = Invite & {
  jurisdictions: Array<
    InviteJurisdiction & {
      term: { label: string };
    }
  >;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

const LEADER_EMPTY_SCOPE_MESSAGE =
  "Leader invite requires at least one jurisdiction";

async function resolvePendingInvite(
  client: DbClient,
  email: string,
): Promise<InviteWithJurisdictions | null> {
  return client.invite.findFirst({
    where: unusedInviteWhere(email),
    include: { jurisdictions: true },
  });
}

export async function findValidUnusedInvite(
  email: string | null | undefined,
): Promise<Invite | null> {
  const canonicalEmail = canonicalizeAuthEmailOrNull(email);
  if (!canonicalEmail) return null;

  return prisma.invite.findFirst({
    where: unusedInviteWhere(canonicalEmail),
  });
}

export async function findValidUnusedInviteWithScope(
  email: string | null | undefined,
): Promise<InviteWithScope | null> {
  const canonicalEmail = canonicalizeAuthEmailOrNull(email);
  if (!canonicalEmail) return null;

  return prisma.invite.findFirst({
    where: unusedInviteWhere(canonicalEmail),
    include: {
      jurisdictions: {
        include: { term: { select: { label: true } } },
        orderBy: [{ cityTown: "asc" }, { legDistrict: "asc" }],
      },
    },
  });
}

async function jurisdictionsMatchInvite(
  client: DbClient,
  userId: string,
  jurisdictions: InviteJurisdiction[],
): Promise<boolean> {
  for (const j of jurisdictions) {
    const existing =
      j.legDistrict === null
        ? await client.userJurisdiction.findFirst({
            where: {
              userId,
              cityTown: j.cityTown,
              legDistrict: null,
              termId: j.termId,
            },
          })
        : await client.userJurisdiction.findUnique({
            where: {
              userId_cityTown_legDistrict_termId: {
                userId,
                cityTown: j.cityTown,
                legDistrict: j.legDistrict,
                termId: j.termId,
              },
            },
          });
    if (!existing) return false;
  }
  return true;
}

async function loadAppliedJurisdictions(
  client: DbClient,
  userId: string,
  jurisdictions: InviteJurisdiction[],
): Promise<AppliedJurisdiction[]> {
  const rows: AppliedJurisdiction[] = [];
  for (const j of jurisdictions) {
    const row =
      j.legDistrict === null
        ? await client.userJurisdiction.findFirst({
            where: {
              userId,
              cityTown: j.cityTown,
              legDistrict: null,
              termId: j.termId,
            },
          })
        : await client.userJurisdiction.findUnique({
            where: {
              userId_cityTown_legDistrict_termId: {
                userId,
                cityTown: j.cityTown,
                legDistrict: j.legDistrict,
                termId: j.termId,
              },
            },
          });
    if (row) {
      rows.push({
        id: row.id,
        cityTown: row.cityTown,
        legDistrict: row.legDistrict,
        termId: row.termId,
      });
    }
  }
  return rows;
}

async function checkAlreadyApplied(
  client: DbClient,
  email: string,
  userId: string,
  inviteId?: string,
): Promise<InviteGrantResult | null> {
  const privileged = await client.privilegedUser.findUnique({
    where: { email },
  });
  if (!privileged) return null;

  const usedInvite = inviteId
    ? await client.invite.findUnique({
        where: { id: inviteId },
        include: { jurisdictions: true },
      })
    : await client.invite.findFirst({
        where: { email, usedAt: { not: null }, deleted: false },
        include: { jurisdictions: true },
        orderBy: { usedAt: "desc" },
      });
  if (!usedInvite) return null;
  if (
    !authEmailsEqual(usedInvite.email, email) ||
    !usedInvite.usedAt ||
    usedInvite.deleted
  ) {
    return null;
  }

  if (
    usedInvite.privilegeLevel === PrivilegeLevel.Leader &&
    usedInvite.jurisdictions.length === 0
  ) {
    if (privileged.privilegeLevel === PrivilegeLevel.Leader) {
      throw new InviteGrantError(LEADER_EMPTY_SCOPE_MESSAGE);
    }
    return null;
  }

  const matches = await jurisdictionsMatchInvite(
    client,
    userId,
    usedInvite.jurisdictions,
  );
  if (!matches) return null;

  const jurisdictions = await loadAppliedJurisdictions(
    client,
    userId,
    usedInvite.jurisdictions,
  );

  return {
    status: "already_applied",
    privilegeLevel: privileged.privilegeLevel,
    inviteId: usedInvite.id,
    createdBy: usedInvite.createdBy,
    jurisdictions,
  };
}

async function grantInvite(
  client: DbClient,
  invite: InviteWithJurisdictions,
  email: string,
  userId: string,
  expectedInviteId?: string,
): Promise<InviteGrantResult> {
  if (expectedInviteId && invite.id !== expectedInviteId) {
    throw new InviteGrantError("Pending invite does not match requested invite");
  }

  if (
    invite.privilegeLevel === PrivilegeLevel.Leader &&
    invite.jurisdictions.length === 0
  ) {
    throw new InviteGrantError(LEADER_EMPTY_SCOPE_MESSAGE);
  }

  const now = new Date();
  const consumeResult = await client.invite.updateMany({
    where: {
      id: invite.id,
      ...unusedInviteWhere(email, now),
    },
    data: { usedAt: now },
  });

  if (consumeResult.count === 0) {
    const alreadyApplied = await checkAlreadyApplied(
      client,
      email,
      userId,
      expectedInviteId ?? invite.id,
    );
    if (alreadyApplied) return alreadyApplied;
    throw new InviteGrantError(
      "Invite could not be consumed (expired, deleted, or already used)",
    );
  }

  await client.user.update({
    where: { id: userId },
    data: { privilegeLevel: invite.privilegeLevel },
  });

  await client.privilegedUser.upsert({
    where: { email },
    create: { email, privilegeLevel: invite.privilegeLevel },
    update: { privilegeLevel: invite.privilegeLevel },
  });

  const created: AppliedJurisdiction[] = [];
  for (const j of invite.jurisdictions) {
    const row = await client.userJurisdiction.create({
      data: {
        userId,
        cityTown: j.cityTown,
        legDistrict: j.legDistrict,
        termId: j.termId,
        createdById: invite.createdBy,
      },
    });
    created.push({
      id: row.id,
      cityTown: j.cityTown,
      legDistrict: j.legDistrict,
      termId: j.termId,
    });
  }

  return {
    status: "applied",
    privilegeLevel: invite.privilegeLevel,
    inviteId: invite.id,
    createdBy: invite.createdBy,
    jurisdictions: created,
  };
}

export async function applyPendingInvite(
  email: string,
  userId: string,
  options?: ApplyPendingInviteOptions,
): Promise<InviteGrantResult> {
  const canonicalEmail = canonicalizeAuthEmail(email);
  const { tx, expectedInviteId } = options ?? {};

  const run = async (client: DbClient): Promise<InviteGrantResult> => {
    if (expectedInviteId) {
      const alreadyApplied = await checkAlreadyApplied(
        client,
        canonicalEmail,
        userId,
        expectedInviteId,
      );
      if (alreadyApplied) return alreadyApplied;
    }

    const invite = await resolvePendingInvite(client, canonicalEmail);
    if (!invite) {
      const alreadyApplied = await checkAlreadyApplied(
        client,
        canonicalEmail,
        userId,
        expectedInviteId,
      );
      return alreadyApplied ?? { status: "no_invite" };
    }

    return grantInvite(
      client,
      invite,
      canonicalEmail,
      userId,
      expectedInviteId,
    );
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

type AuditInviteGrantsParams = {
  userId: string;
  inviteId: string;
  createdBy: string;
  jurisdictions: AppliedJurisdiction[];
  tx?: Prisma.TransactionClient;
};

export async function auditInviteJurisdictionGrants({
  userId,
  inviteId,
  createdBy,
  jurisdictions,
  tx,
}: AuditInviteGrantsParams): Promise<void> {
  if (jurisdictions.length === 0) return;

  const client = tx ?? prisma;
  const inviter = await client.user.findUnique({
    where: { id: createdBy },
    select: { privilegeLevel: true },
  });
  const inviterRole = inviter?.privilegeLevel ?? PrivilegeLevel.Admin;

  for (const j of jurisdictions) {
    await logAuditEventOrThrow(
      createdBy,
      inviterRole,
      AuditAction.JURISDICTION_ASSIGNED,
      "UserJurisdiction",
      j.id,
      null,
      null,
      {
        userId,
        cityTown: j.cityTown,
        legDistrict: j.legDistrict,
        termId: j.termId,
        source: "invite",
        inviteId,
      },
      client,
    );
  }
}
