/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import prisma from "~/lib/prisma";
import * as xlsx from "xlsx";
import * as fs from "fs";
import type { Prisma } from "@prisma/client";

import {
  type DiscrepanciesAndCommittee,
  findDiscrepancies,
} from "../../lib/utils";
import {
  getActiveTermId,
  getGovernanceConfig,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";

type CommitteeIdentity = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  termId: string;
};

function formatCommitteeIdentity(committee: CommitteeIdentity): string {
  return `${committee.cityTown}-${committee.legDistrict}-${committee.electionDistrict}`;
}

function ensureImportDiscrepancy(
  discrepanciesMap: Map<string, DiscrepanciesAndCommittee>,
  voterRecordId: string,
  committee: CommitteeIdentity,
  key: string,
  incoming: string,
  existing: string,
) {
  const existingEntry = discrepanciesMap.get(voterRecordId);
  const nextDiscrepancies = {
    ...(existingEntry?.discrepancies ?? {}),
    [key]: {
      incoming,
      existing,
    },
  };

  discrepanciesMap.set(voterRecordId, {
    discrepancies: nextDiscrepancies,
    committee:
      existingEntry?.committee ??
      {
        id: 0,
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        electionDistrict: committee.electionDistrict,
        termId: committee.termId,
        ltedWeight: null,
      },
  });
}

export async function loadCommitteeLists() {
  const committeeData = new Map<
    string,
    { data: Prisma.CommitteeListCreateManyInput; committeeMembers: string[] }
  >();

  const filePath = "data/Committee-File-2025-05-15.xlsx";
  // const filePath = "data/DemocraticCommitteeExport.xlsx";

  const fileBuffer = fs.readFileSync(filePath);
  const workbook: xlsx.WorkBook = xlsx.read(fileBuffer);

  // const committeeExportSheet: xlsx.WorkSheet | undefined =
  //   workbook.Sheets.Export_to_Excel;

  const committeeExportSheet: xlsx.WorkSheet | undefined =
    workbook.Sheets[workbook.SheetNames[0]!];

  if (!committeeExportSheet) {
    throw new Error("Committee export sheet not found");
  }

  const unknownCommitteeData: unknown[] =
    xlsx.utils.sheet_to_json(committeeExportSheet);

  const committeeExportData = unknownCommitteeData as Record<string, string>[];

  const activeTermId = await getActiveTermId();
  const config = await getGovernanceConfig();

  let count = 0;
  let found = 0;
  let foundDiscrepancy = 0;
  const discrepanciesMap = new Map<string, DiscrepanciesAndCommittee>();

  for (const row of committeeExportData) {
    // let city = row["LT Description"]?.includes("City")
    //   ? "Rochester"
    //   : row["LT Description"];

    // city = city?.toUpperCase();

    // const legDistrict = Number(row.LT);
    // const electionDistrict = Number(row.ED);
    let city = row.Committee?.includes("LD ") ? "Rochester" : row.Committee;

    city = city?.toUpperCase();

    const legDistrict = Number(row["Serve LT"]);
    const electionDistrict = Number(row["Serve ED"]);
    const VRCNUM = row["voter id"];

    if (!VRCNUM) {
      throw new Error("VRCNUM is undefined");
    }

    if (!city || !legDistrict || !electionDistrict) {
      throw new Error("Invalid committee data");
    }

    const existingRecord = await prisma.voterRecord.findUnique({
      where: {
        VRCNUM,
      },
    });

    count++;
    let recordHasDiscrepancies = false;
    if (existingRecord) {
      found++;
      const discrepancies = findDiscrepancies(row, existingRecord);

      if (discrepancies && Object.keys(discrepancies).length > 0) {
        discrepanciesMap.set(VRCNUM, {
          discrepancies,
          committee: {
            id: 0,
            cityTown: city,
            legDistrict,
            electionDistrict,
            termId: activeTermId,
            ltedWeight: null,
          },
        });
        foundDiscrepancy++;
        recordHasDiscrepancies = true;
      }
    } else {
      discrepanciesMap.set(VRCNUM, {
        discrepancies: {
          VRCNUM: { incoming: VRCNUM, existing: "", fullRow: row },
        },
        committee: {
          id: 0,
          cityTown: city,
          legDistrict,
          electionDistrict,
          termId: activeTermId,
          ltedWeight: null,
        },
      });
    }

    const mapKey = `${city}-${legDistrict}-${electionDistrict}`;

    if (!city || !legDistrict || !electionDistrict) {
      throw new Error("Invalid committee data");
    }

    const existingCommittee = committeeData.get(mapKey);
    if (existingCommittee) {
      if (!recordHasDiscrepancies) {
        existingCommittee.committeeMembers.push(VRCNUM);
      }
    } else {
      committeeData.set(mapKey, {
        data: {
          cityTown: city,
          legDistrict: legDistrict,
          electionDistrict: electionDistrict,
          termId: activeTermId,
        },
        committeeMembers: recordHasDiscrepancies ? [] : [VRCNUM],
      });
    }
  }

  const voterAssignments = new Map<string, CommitteeIdentity[]>();

  for (const [, value] of committeeData.entries()) {
    const committeeIdentity: CommitteeIdentity = {
      cityTown: value.data.cityTown,
      legDistrict: value.data.legDistrict,
      electionDistrict: value.data.electionDistrict,
      termId: activeTermId,
    };
    const importedMembers = Array.from(new Set(value.committeeMembers));
    for (const voterRecordId of importedMembers) {
      const existingAssignments = voterAssignments.get(voterRecordId) ?? [];
      existingAssignments.push(committeeIdentity);
      voterAssignments.set(voterRecordId, existingAssignments);
    }
  }

  const duplicateAssignments = new Set<string>();
  for (const [voterRecordId, assignments] of voterAssignments.entries()) {
    if (assignments.length <= 1) continue;
    duplicateAssignments.add(voterRecordId);
    ensureImportDiscrepancy(
      discrepanciesMap,
      voterRecordId,
      assignments[0]!,
      "committeeAssignmentConflict",
      assignments.map((assignment) => formatCommitteeIdentity(assignment)).join(" | "),
      "Voter appears in multiple committees in the same bulk import",
    );
  }

  const importedVoterIds = Array.from(voterAssignments.keys()).filter(
    (voterRecordId) => !duplicateAssignments.has(voterRecordId),
  );

  const activeMemberships = importedVoterIds.length
    ? await prisma.committeeMembership.findMany({
        where: {
          voterRecordId: { in: importedVoterIds },
          termId: activeTermId,
          status: "ACTIVE",
        },
        select: {
          voterRecordId: true,
          committeeListId: true,
        },
      })
    : [];

  const initiallyActiveCommittees = new Map<string, Set<number>>();
  for (const membership of activeMemberships) {
    const existing = initiallyActiveCommittees.get(membership.voterRecordId);
    if (existing) {
      existing.add(membership.committeeListId);
      continue;
    }
    initiallyActiveCommittees.set(
      membership.voterRecordId,
      new Set([membership.committeeListId]),
    );
  }

  for (const [, value] of committeeData.entries()) {
    const committeeList = value.data;
    const uniqueImportedMembers = Array.from(new Set(value.committeeMembers));
    const importedMembers = uniqueImportedMembers.filter(
      (voterRecordId) => !duplicateAssignments.has(voterRecordId),
    );

    if (importedMembers.length === 0) {
      await prisma.committeeList.upsert({
        where: {
          cityTown_legDistrict_electionDistrict_termId: {
            cityTown: committeeList.cityTown,
            legDistrict: committeeList.legDistrict,
            electionDistrict: committeeList.electionDistrict,
            termId: activeTermId,
          },
        },
        create: { ...committeeList, termId: activeTermId },
        update: committeeList,
      });
      continue;
    }

    if (importedMembers.length > config.maxSeatsPerLted) {
      throw new Error(
        `Committee ${committeeList.cityTown}-${committeeList.legDistrict}-${committeeList.electionDistrict} has ${importedMembers.length} members, exceeding maxSeatsPerLted=${config.maxSeatsPerLted}`,
      );
    }

    await prisma.$transaction(async (tx) => {
      const committee = await tx.committeeList.upsert({
        where: {
          cityTown_legDistrict_electionDistrict_termId: {
            cityTown: committeeList.cityTown,
            legDistrict: committeeList.legDistrict,
            electionDistrict: committeeList.electionDistrict,
            termId: activeTermId,
          },
        },
        create: { ...committeeList, termId: activeTermId },
        update: committeeList,
      });

      // Lock committee row while reconciling capacity + seat assignments.
      await tx.$queryRaw`
        SELECT id
        FROM "CommitteeList"
        WHERE id = ${committee.id}
        FOR UPDATE
      `;

      await ensureSeatsExist(committee.id, activeTermId, {
        tx,
        maxSeats: config.maxSeatsPerLted,
      });

      const importedSet = new Set(uniqueImportedMembers);
      const committeeIdentity: CommitteeIdentity = {
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        electionDistrict: committee.electionDistrict,
        termId: activeTermId,
      };
      const formattedCommittee = formatCommitteeIdentity(committeeIdentity);

      // Reconcile removals first so new activations can safely claim seats.
      const existingActiveMemberships = await tx.committeeMembership.findMany({
        where: {
          committeeListId: committee.id,
          termId: activeTermId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          voterRecordId: true,
        },
      });

      for (const membership of existingActiveMemberships) {
        if (!importedSet.has(membership.voterRecordId)) {
          await tx.committeeMembership.update({
            where: { id: membership.id },
            data: {
              status: "REMOVED",
              removedAt: new Date(),
              removalReason: "OTHER",
              removalNotes: "Removed by bulk import synchronization",
              seatNumber: null,
            },
          });
        }
      }

      for (const voterRecordId of importedMembers) {
        const initiallyActiveElsewhere = Array.from(
          initiallyActiveCommittees.get(voterRecordId) ?? [],
        ).some((committeeListId) => committeeListId !== committee.id);

        if (initiallyActiveElsewhere) {
          ensureImportDiscrepancy(
            discrepanciesMap,
            voterRecordId,
            committeeIdentity,
            "alreadyActiveInAnotherCommittee",
            formattedCommittee,
            "Voter is already active in another committee for this term",
          );
          continue;
        }

        const currentlyActiveElsewhere = await tx.committeeMembership.findFirst({
          where: {
            voterRecordId,
            termId: activeTermId,
            status: "ACTIVE",
            committeeListId: { not: committee.id },
          },
          select: { id: true },
        });

        if (currentlyActiveElsewhere) {
          ensureImportDiscrepancy(
            discrepanciesMap,
            voterRecordId,
            committeeIdentity,
            "alreadyActiveInAnotherCommittee",
            formattedCommittee,
            "Voter is already active in another committee for this term",
          );
          continue;
        }

        const existingMembership = await tx.committeeMembership.findUnique({
          where: {
            voterRecordId_committeeListId_termId: {
              voterRecordId,
              committeeListId: committee.id,
              termId: activeTermId,
            },
          },
        });

        let seatNumber = existingMembership?.seatNumber ?? null;
        if (!(existingMembership?.status === "ACTIVE" && seatNumber !== null)) {
          seatNumber = await assignNextAvailableSeat(committee.id, activeTermId, {
            tx,
            maxSeats: config.maxSeatsPerLted,
          });
        }

        if (existingMembership) {
          await tx.committeeMembership.update({
            where: { id: existingMembership.id },
            data: {
              status: "ACTIVE",
              activatedAt: existingMembership.activatedAt ?? new Date(),
              membershipType: existingMembership.membershipType ?? "APPOINTED",
              seatNumber,
              confirmedAt: null,
              resignedAt: null,
              removedAt: null,
              rejectedAt: null,
              rejectionNote: null,
              resignationDateReceived: null,
              resignationMethod: null,
              removalReason: null,
              removalNotes: null,
              petitionVoteCount: null,
              petitionPrimaryDate: null,
            },
          });
        } else {
          await tx.committeeMembership.create({
            data: {
              voterRecordId,
              committeeListId: committee.id,
              termId: activeTermId,
              status: "ACTIVE",
              activatedAt: new Date(),
              membershipType: "APPOINTED",
              seatNumber,
            },
          });
        }
      }
    });
  }

  console.log(
    "Loaded",
    count,
    "records and found",
    found,
    "alread saved. Found discrepancies:",
    foundDiscrepancy,
    "discrepancies:",
    discrepanciesMap.size,
  );

  return discrepanciesMap;
}
