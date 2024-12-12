"use client";

import { VoterRecord } from "@prisma/client";
import { useState } from "react";
import { Discrepancy } from "~/app/api/lib/utils";
import { VoterRecordTable } from "~/app/recordsearch/VoterRecordTable";
import { Button } from "~/components/ui/button";

const discrepanciesPrintMap = {
  Add1: "Address",
  "res state": "State",
  Zip: "Zip Code",
  City: "City",
  firstname: "First Name",
  lastname: "Last Name",
};

export const UploadCommittee: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [recordsWithDiscrepancies, setRecordsWithDiscrepancies] = useState<
    VoterRecord[]
  >([]);
  const [discrepanciesMap, setDiscrepanciesMap] = useState<
    Record<string, Discrepancy>
  >({});

  //   const handleUploadCommittee = async (
  //     e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  //   ) => {
  //     e.preventDefault();

  //     const input = document.createElement("input");
  //     input.type = "file";
  //     input.accept = ".xlsx";

  //     input.onchange = async (event) => {
  //       const file = (event.target as HTMLInputElement).files?.[0];
  //       if (!file) return;

  //       // 5MB limit
  //       if (file.size > 5 * 1024 * 1024) {
  //         toast({
  //           title: "Error",
  //           description: "File too large. Maximum size is 5MB.",
  //         });
  //         return;
  //       }

  //       const formData = new FormData();
  //       formData.append("file", file);

  //       try {
  //         setIsUploading(true);
  //         const response = await fetch("/api/committees/upload", {
  //           method: "POST",
  //           body: formData,
  //         });

  //         if (!response.ok) {
  //           const errorData = (await response.json()) as { message: string };
  //           toast({
  //             title: "Error",
  //             description: errorData.message || "Upload failed",
  //           });
  //           return;
  //         }

  //         // const result = await response.json();
  //         toast({ title: "Success", description: "Uploaded" });
  //       } catch (error) {
  //         console.error("Upload error:", error);
  //         toast({ title: "Error", description: "An unexpected error occurred" });
  //       } finally {
  //         setIsUploading(false);
  //         document.body.removeChild(input);
  //       }
  //     };

  //     input.oncancel = () => {
  //       document.body.removeChild(input);
  //     };

  //     input.click();
  //   };

  const handleUploadCommittee = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const response = await fetch("/api/committee/fetchLoaded", {
        method: "POST",
      });

      const data = (await response.json()) as {
        recordsWithDiscrepancies: VoterRecord[];
        discrepanciesMap: [string, Discrepancy][];
      };

      setRecordsWithDiscrepancies(data.recordsWithDiscrepancies);

      const discrepanciesRecord: Record<string, Discrepancy> =
        Object.fromEntries(data.discrepanciesMap);

      setDiscrepanciesMap(discrepanciesRecord);
    } catch (error) {
      console.error("Error uploading committee list:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleUploadCommittee} disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload bulk committee list"}
      </Button>
      {recordsWithDiscrepancies.length > 0 && (
        <div className="mt-4">
          <h2>Records with discrepancies</h2>
          <VoterRecordTable
            records={recordsWithDiscrepancies}
            fieldsList={[]}
            paginated={false}
            extraContent={(record: VoterRecord) => {
              const discrepancies = discrepanciesMap[record.VRCNUM];

              if (!discrepancies) {
                return <p>No discrepancies found</p>;
              }

              return (
                <div className="flex gap-2 items-center">
                  <ul>
                    {Object.keys(discrepancies).map((key) => {
                      const value = discrepancies[key];
                      return (
                        <li key={key}>
                          {
                            discrepanciesPrintMap[
                              key as keyof typeof discrepanciesPrintMap
                            ]
                          }
                          : {value?.incoming} vs {value?.existing}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
};
