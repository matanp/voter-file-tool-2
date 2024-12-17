"use client";

import { VoterRecord } from "@prisma/client";
import { useEffect, useState } from "react";
import { DiscrepanciesAndCommittee } from "~/app/api/lib/utils";
import { VoterRecordTable } from "~/app/recordsearch/VoterRecordTable";
import DiscrepancyRecordsTable, {
  CommitteeUploadRecords,
} from "./DiscrepancyTable";
import { DiscrepanciesActionsMenu } from "./DiscrepancyActionsMenu";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { AccordionContent } from "@radix-ui/react-accordion";
import { set } from "date-fns";

const discrepanciesPrintMap = {
  Add1: "Address",
  "res state": "State",
  Zip: "Zip Code",
  City: "City",
  firstname: "First Name",
  lastname: "Last Name",
};

export const CommitteeUploadDiscrepancies: React.FC = () => {
  const [recordsWithDiscrepancies, setRecordsWithDiscrepancies] = useState<
    VoterRecord[]
  >([]);
  const [recordsWithoutSavedRecord, setRecordsWithoutSavedRecord] = useState<
    CommitteeUploadRecords[]
  >([]);
  const [discrepanciesMap, setDiscrepanciesMap] = useState<
    Record<string, DiscrepanciesAndCommittee>
  >({});

  const [acceptedDiscrepancies, setAcceptedDiscrepancies] = useState<string[]>(
    [],
  );

  const [rejectedDiscrepancies, setRejectedDiscrepancies] = useState<string[]>(
    [],
  );

  const groupByCommittee = (map: Record<string, DiscrepanciesAndCommittee>) => {
    const grouped: Record<
      string,
      { VRCNUM: string; discrepanciesAncCommittee: DiscrepanciesAndCommittee }[]
    > = {};

    Object.keys(map).forEach((key) => {
      const item = map[key];

      if (!item) {
        return;
      }
      const { cityTown, legDistrict, electionDistrict } = item.committee;
      const committeeKey = `${cityTown}: LD-${legDistrict}, ED-${electionDistrict}`;

      if (!grouped[committeeKey]) {
        grouped[committeeKey] = [
          { discrepanciesAncCommittee: item, VRCNUM: key },
        ];
      } else {
        grouped[committeeKey]?.push({
          discrepanciesAncCommittee: item,
          VRCNUM: key,
        });
      }
    });

    return grouped;
  };

  const groupedDiscrepancies = groupByCommittee(discrepanciesMap);

  const handleUploadCommittee = async (
    e?: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e?.preventDefault();

    try {
      const response = await fetch("/api/committee/fetchLoaded", {
        method: "POST",
      });

      const data = (await response.json()) as {
        recordsWithDiscrepancies: VoterRecord[];
        discrepanciesMap: [string, DiscrepanciesAndCommittee][];
      };

      setRecordsWithDiscrepancies(data.recordsWithDiscrepancies);

      const discrepancyMap: Record<string, DiscrepanciesAndCommittee> =
        Object.fromEntries(data.discrepanciesMap);

      if (discrepancyMap && Object.keys(discrepancyMap).length > 0) {
        const recordsWithoutSavedRecord = data.discrepanciesMap.reduce(
          (prev, [key, { discrepancies }]): CommitteeUploadRecords[] => {
            if (discrepancies.VRCNUM) {
              if (!discrepancies.VRCNUM.fullRow) {
                throw new Error("Discrepancy has no full row");
              }
              return [
                ...prev,
                {
                  VRCNUM: key,
                  fullRow: discrepancies.VRCNUM.fullRow,
                } as CommitteeUploadRecords,
              ];
            }
            return prev;
          },
          [] as CommitteeUploadRecords[],
        );

        setRecordsWithoutSavedRecord(recordsWithoutSavedRecord);
      }

      setDiscrepanciesMap(discrepancyMap);
    } catch (error) {
      console.error("Error uploading committee list:", error);
    }
  };

  useEffect(() => {
    handleUploadCommittee().catch((err) => {
      console.error("Error uploading committee list:", err);
    });
  }, []);

  const discrepancyKeys = Object.keys(groupedDiscrepancies);

  return (
    <div>
      {recordsWithDiscrepancies.length > 0 && (
        <div className="mt-4">
          <h2>Records with discrepancies</h2>
          {discrepancyKeys.length > 0 && (
            <Accordion type="multiple" className="w-max">
              {discrepancyKeys.map((key) => {
                const discrepancies = groupedDiscrepancies[key];

                if (!discrepancies) {
                  return null;
                }

                const records = recordsWithDiscrepancies.filter((record) => {
                  return discrepancies.find((item) => {
                    return item?.VRCNUM === record.VRCNUM;
                  });
                });

                if (!records.length) {
                  return null;
                }

                return (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger>
                      <h1 className="text-base font-semibold">{key}</h1>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div key={key} className="m-4 w-max">
                        <VoterRecordTable
                          records={records}
                          fieldsList={[]}
                          paginated={false}
                          seeMoreDetailsText="Saved Voter Record Details"
                          extraHeaders={[
                            "Discrepancies: Committee List Upload value vs. Voter Record value",
                          ]}
                          extraContent={(record: VoterRecord) => {
                            const discrepancies =
                              discrepanciesMap[record.VRCNUM];

                            if (!discrepancies) {
                              return <p>No discrepancies found</p>;
                            }

                            return (
                              <div className="flex gap-2 items-center">
                                <ul>
                                  {Object.keys(discrepancies.discrepancies).map(
                                    (key) => {
                                      const value =
                                        discrepancies.discrepancies[key];
                                      return (
                                        <li key={key}>
                                          <span className="font-bold">
                                            {
                                              discrepanciesPrintMap[
                                                key as keyof typeof discrepanciesPrintMap
                                              ]
                                            }
                                          </span>
                                          : {value?.incoming} vs{" "}
                                          {value?.existing
                                            ? value.existing
                                            : "NO VALUE"}
                                        </li>
                                      );
                                    },
                                  )}
                                </ul>
                                {acceptedDiscrepancies.includes(
                                  record.VRCNUM,
                                ) && (
                                  <p className="text-green-500">
                                    Accepted, record saved to committee
                                  </p>
                                )}
                                {rejectedDiscrepancies.includes(
                                  record.VRCNUM,
                                ) && (
                                  <p className="text-red-500">
                                    Rejected, record not saved to committee
                                  </p>
                                )}
                                {!acceptedDiscrepancies.includes(
                                  record.VRCNUM,
                                ) &&
                                  !rejectedDiscrepancies.includes(
                                    record.VRCNUM,
                                  ) && (
                                    <DiscrepanciesActionsMenu
                                      VRCNUM={record.VRCNUM}
                                      showAddressOption={
                                        discrepancies.discrepancies.Add1 !==
                                        undefined
                                      }
                                      onAction={(accept) => {
                                        if (accept) {
                                          setAcceptedDiscrepancies((prev) => [
                                            ...prev,
                                            record.VRCNUM,
                                          ]);
                                        } else {
                                          setRejectedDiscrepancies((prev) => [
                                            ...prev,
                                            record.VRCNUM,
                                          ]);
                                        }
                                      }}
                                      address={
                                        discrepancies.discrepancies.Add1
                                          ?.incoming ?? ""
                                      }
                                    />
                                  )}
                              </div>
                            );
                          }}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      )}
      {recordsWithoutSavedRecord.length > 0 && (
        <div className="mt-4">
          <h2>Records with no Voter ID in this system</h2>
          <DiscrepancyRecordsTable records={recordsWithoutSavedRecord} />
        </div>
      )}
    </div>
  );
};
