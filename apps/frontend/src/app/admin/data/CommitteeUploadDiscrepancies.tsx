"use client";

import type { VoterRecord } from "@prisma/client";
import { useEffect, useState } from "react";
import type { DiscrepanciesAndCommittee } from "~/app/api/lib/utils";
import { VoterRecordTable } from "~/app/recordsearch/VoterRecordTable";
import DiscrepancyRecordsTable, {
  type CommitteeUploadRecords,
} from "./DiscrepancyTable";
import { DiscrepanciesActionsMenu } from "./DiscrepancyActionsMenu";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { AccordionContent } from "@radix-ui/react-accordion";
import { Skeleton } from "~/components/ui/skeleton";
import { Loader2 } from "lucide-react";

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/committee/fetchLoaded", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch committee discrepancies (${response.status})`,
        );
      }

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
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load committee discrepancies",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleUploadCommittee().catch((err) => {
      console.error("Error uploading committee list:", err);
    });
  }, []);

  const discrepancyKeys = Object.keys(groupedDiscrepancies);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading committee discrepancies...</span>
        </div>

        {/* Skeleton for records with discrepancies */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-64" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton for records without saved record */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-80" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <p className="text-lg font-semibold">
            Error loading committee discrepancies
          </p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={() => handleUploadCommittee()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {recordsWithDiscrepancies.length > 0 && (
        <div className="mt-4">
          <h2>Records with discrepancies</h2>
          {discrepancyKeys.length > 0 && (
            <Accordion type="multiple" className="w-max">
              {discrepancyKeys
                .sort((a, b) => a.localeCompare(b))
                .map((key) => {
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
                                    {Object.keys(
                                      discrepancies.discrepancies,
                                    ).map((key) => {
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
                                          </span>{" "}
                                          Incoming{" "}
                                          <span className="font-semibold">
                                            {value?.incoming}
                                          </span>{" "}
                                          {"doesn't match saved: "}{" "}
                                          <span className="font-semibold">
                                            {value?.existing ?? "NO VALUE"}
                                          </span>
                                        </li>
                                      );
                                    })}
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
