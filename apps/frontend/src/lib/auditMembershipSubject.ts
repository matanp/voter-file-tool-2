import type {
  CommitteeList,
  CommitteeTerm,
  Prisma,
  VoterRecord,
} from "@prisma/client";
import { getName } from "~/app/api/lib/utils";
import prisma from "~/lib/prisma";

/** Point-in-time who/where snapshot for CommitteeMembership audit events. */
export type AuditMembershipSubject = {
  memberName: string;
  voterRecordId: string;
  committeeListId: number;
  termId: string;
  termLabel: string;
  cityTown: string;
  legDistrict: number | null;
  electionDistrict: number;
  seatNumber?: number | null;
};

type VoterNameFields = Pick<
  VoterRecord,
  "VRCNUM" | "firstName" | "middleInitial" | "lastName"
>;

type CommitteeLocationFields = Pick<
  CommitteeList,
  "id" | "cityTown" | "legDistrict" | "electionDistrict"
>;

type TermLabelFields = Pick<CommitteeTerm, "id" | "label">;

/** Builds a membership audit subject from already-loaded relations. */
export function buildMembershipAuditSubject(params: {
  voterRecord: VoterNameFields;
  committee: CommitteeLocationFields;
  term: TermLabelFields;
  seatNumber?: number | null;
}): AuditMembershipSubject {
  const { voterRecord, committee, term, seatNumber } = params;
  const memberName = getName(voterRecord);

  return {
    memberName: memberName || voterRecord.VRCNUM,
    voterRecordId: voterRecord.VRCNUM,
    committeeListId: committee.id,
    termId: term.id,
    termLabel: term.label,
    cityTown: committee.cityTown,
    legDistrict: committee.legDistrict,
    electionDistrict: committee.electionDistrict,
    ...(seatNumber !== undefined ? { seatNumber } : {}),
  };
}

/** Loads voter, committee, and term data and builds a membership audit subject. */
export async function fetchMembershipAuditSubject(
  client: Prisma.TransactionClient,
  params: {
    voterRecordId: string;
    committeeListId: number;
    termId: string;
    seatNumber?: number | null;
  },
): Promise<AuditMembershipSubject> {
  const { voterRecordId, committeeListId, termId, seatNumber } = params;

  const [voterRecord, committee] = await Promise.all([
    client.voterRecord.findUnique({
      where: { VRCNUM: voterRecordId },
      select: {
        VRCNUM: true,
        firstName: true,
        middleInitial: true,
        lastName: true,
      },
    }),
    client.committeeList.findUnique({
      where: { id: committeeListId },
      select: {
        id: true,
        cityTown: true,
        legDistrict: true,
        electionDistrict: true,
        term: { select: { id: true, label: true } },
      },
    }),
  ]);

  if (!voterRecord) {
    throw new Error(
      `Cannot build audit subject: voter record not found (${voterRecordId})`,
    );
  }
  if (!committee) {
    throw new Error(
      `Cannot build audit subject: committee not found (${committeeListId})`,
    );
  }
  if (committee.term.id !== termId) {
    throw new Error(
      `Cannot build audit subject: committee term mismatch (expected ${termId}, got ${committee.term.id})`,
    );
  }

  return buildMembershipAuditSubject({
    voterRecord,
    committee,
    term: committee.term,
    seatNumber,
  });
}

/** Merges operational metadata with a membership subject snapshot. */
export function mergeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
  subject: AuditMembershipSubject,
): Record<string, unknown> {
  const base = metadata ?? {};
  if ("subject" in base && base.subject != null) {
    return base;
  }
  return { ...base, subject };
}

/** Default Prisma client wrapper for fetchMembershipAuditSubject. */
export async function fetchMembershipAuditSubjectFromDb(params: {
  voterRecordId: string;
  committeeListId: number;
  termId: string;
  seatNumber?: number | null;
}): Promise<AuditMembershipSubject> {
  return fetchMembershipAuditSubject(prisma, params);
}
