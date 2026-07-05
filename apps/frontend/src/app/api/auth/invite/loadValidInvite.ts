import type { InviteJurisdiction, PrivilegeLevel } from "@prisma/client";
import { z } from "zod";
import prisma from "~/lib/prisma";

export const inviteTokenSchema = z.string().trim().min(1, "Token is required");

export type InvitePayload = {
  email: string;
  privilegeLevel: PrivilegeLevel;
  customMessage: string | null;
  expiresAt: Date;
  jurisdictions: Array<{
    id: string;
    cityTown: string;
    legDistrict: number | null;
    termId: string;
    term: { label: string };
  }>;
};

type LoadedInvite = {
  id: string;
  email: string;
  privilegeLevel: PrivilegeLevel;
  customMessage: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  deleted: boolean;
  createdBy: string;
  jurisdictions: InvitePayload["jurisdictions"];
};

export type ApplyInviteLoadedInvite = Omit<LoadedInvite, "jurisdictions"> & {
  jurisdictions: InviteJurisdiction[];
};

export type InviteLoadError = {
  status: 400 | 404 | 409 | 410;
  error: string;
  details?: Array<{ field: string; message: string }>;
};

export type InviteLoadResult =
  | { ok: true; invite: LoadedInvite; payload: InvitePayload }
  | { ok: false; error: InviteLoadError };

export type ApplyInviteLoadResult =
  | { ok: true; invite: ApplyInviteLoadedInvite }
  | { ok: false; error: InviteLoadError };

function tokenValidationError(
  token: string,
): { ok: false; error: InviteLoadError } | null {
  const tokenValidation = inviteTokenSchema.safeParse(token);
  if (tokenValidation.success) return null;

  return {
    ok: false,
    error: {
      status: 400,
      error: "Invalid invite link",
      details: tokenValidation.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
    },
  };
}

/** Loads and validates an unused invite by token, or returns a structured error. */
export async function loadValidUnusedInvite(
  token: string,
): Promise<InviteLoadResult> {
  const validationError = tokenValidationError(token);
  if (validationError) return validationError;

  const invite = await prisma.invite.findUnique({
    where: { token: inviteTokenSchema.parse(token) },
    select: {
      id: true,
      email: true,
      privilegeLevel: true,
      customMessage: true,
      expiresAt: true,
      usedAt: true,
      createdBy: true,
      deleted: true,
      jurisdictions: {
        select: {
          id: true,
          cityTown: true,
          legDistrict: true,
          termId: true,
          term: { select: { label: true } },
        },
        orderBy: [{ cityTown: "asc" }, { legDistrict: "asc" }],
      },
    },
  });

  if (!invite) {
    return { ok: false, error: { status: 404, error: "Invite not found" } };
  }
  if (invite.deleted) {
    return {
      ok: false,
      error: { status: 410, error: "This invite has been deleted" },
    };
  }
  if (new Date() > invite.expiresAt) {
    return {
      ok: false,
      error: { status: 410, error: "This invite has expired" },
    };
  }
  if (invite.usedAt) {
    return {
      ok: false,
      error: { status: 409, error: "This invite has already been used" },
    };
  }

  return {
    ok: true,
    invite,
    payload: {
      email: invite.email,
      privilegeLevel: invite.privilegeLevel,
      customMessage: invite.customMessage,
      expiresAt: invite.expiresAt,
      jurisdictions: invite.jurisdictions,
    },
  };
}

/** Loads an invite for authenticated POST /apply, allowing same-email used tokens through for idempotency. */
export async function loadInviteForApply(
  token: string,
  sessionEmail: string,
): Promise<ApplyInviteLoadResult> {
  const validationError = tokenValidationError(token);
  if (validationError) return validationError;

  const invite = await prisma.invite.findUnique({
    where: { token: inviteTokenSchema.parse(token) },
    include: { jurisdictions: true },
  });

  if (!invite) {
    return { ok: false, error: { status: 404, error: "Invite not found" } };
  }
  if (invite.deleted) {
    return {
      ok: false,
      error: { status: 410, error: "This invite has been deleted" },
    };
  }
  if (new Date() > invite.expiresAt) {
    return {
      ok: false,
      error: { status: 410, error: "This invite has expired" },
    };
  }
  if (invite.usedAt && invite.email !== sessionEmail) {
    return {
      ok: false,
      error: { status: 409, error: "This invite has already been used" },
    };
  }

  return { ok: true, invite };
}
