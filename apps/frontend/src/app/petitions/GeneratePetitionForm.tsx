"use client";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { toast } from "~/components/ui/use-toast";
import RecordSearchForm from "../components/RecordSearchForm";
import type { VoterRecord } from "@prisma/client";

import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import React from "react";
import type { ElectionDate, OfficeName } from "prisma/prisma-client";
import {
  defaultCustomPartyName,
  type GenerateReportData,
  generateReportSchema,
} from "@voter-file-tool/shared-validators";
import { ReportStatusTracker } from "../components/ReportStatusTracker";

type GeneratePetitionFormProps = {
  parties: string[];
  electionDates: ElectionDate[];
  officeNames: OfficeName[];
};

function formatDate(date: Date, withOrdinal: boolean): string {
  const day = date.getDate();
  const ordinal =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  return `${month} ${day}${withOrdinal ? ordinal : ""}, ${year}`;
}

export const GeneratePetitionForm: React.FC<GeneratePetitionFormProps> = ({
  electionDates,
  officeNames,
}) => {
  const [smallScreen, setSmallScreen] = useState<boolean>(false);
  const [verySmallScreen, setVerySmallScreen] = useState<boolean>(false);
  const [party, setParty] = useState<string>("");
  const [customParty, setCustomParty] = useState<string>(
    defaultCustomPartyName,
  );
  const [electionDate, setElectionDate] = useState<Date | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [reportName, setReportName] = useState<string>("");
  const [reportDescription, setReportDescription] = useState<string>("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [searchCandidates, setSearchCandidates] = useState<VoterRecord[]>([]);
  const [candidates, setCandidates] = useState<
    (VoterRecord & { office: string })[]
  >([]);
  const [showCandidateSearch, setShowCandidateSearch] = useState<boolean>(true);
  const [vacancyAppointmentsSearch, setVacancyAppointmentsSearch] = useState<
    VoterRecord[]
  >([]);
  const [vacancyAppointments, setVacancyAppointments] = useState<VoterRecord[]>(
    [],
  );
  const [showVacancyAppointmentsSearch, setShowVacancyAppointmentsSearch] =
    useState<boolean>(true);

  const [reportId, setReportId] = useState<string>("");
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();

    const candidatesData = candidates.map((c) => {
      const candidateName = `${c.firstName} ${c.lastName}`;
      const addreess = `${c.houseNum} ${c.street} ${c.apartment} ${c.city}, ${c.state} ${c.zipCode}`;
      return { name: candidateName, address: addreess, office: c.office };
    });

    const vacancyAppointmentsData = vacancyAppointments.map((c) => {
      const candidateName = `${c.firstName} ${c.lastName}`;
      const addreess = `${c.houseNum} ${c.street} ${c.apartment} ${c.city}, ${c.state} ${c.zipCode}`;
      return { name: candidateName, address: addreess };
    });

    const formData: GenerateReportData = {
      type: "designatedPetition",
      name: reportName.trim() || undefined,
      description: reportDescription.trim() || undefined,
      payload: {
        candidates: candidatesData,
        vacancyAppointments: vacancyAppointmentsData,
        party: party === "Custom" ? customParty : party,
        electionDate:
          electionDate?.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "2-digit",
          }) ?? "",
        numPages,
      },
    };

    const validationResult = generateReportSchema.safeParse(formData);

    if (!validationResult.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path.join(".");
        fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);

      const candidatesErrors = candidatesData.filter((c) => c.office === "");

      if (candidatesErrors.length > 0 && fieldErrors.candidates === undefined) {
        setErrors({
          ...fieldErrors,
          candidates: "All candidates must have a public office",
        });
      }
      return;
    } else if (candidatesData.find((c) => c.office === "")) {
      setErrors({ candidates: "All candidates must have a public office" });
      return;
    }

    setErrors({});

    toast({
      description: "Generating PDF, your report will download soon",
      duration: 3000,
    });

    const response = await fetch(`/api/generateReport`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      toast({
        description: "Error generating PDF",
        duration: 5000,
      });
      return;
    }

    const responseData = (await response.json()) as unknown as {
      reportId: string;
    };

    setReportId(responseData?.reportId);
    setGenerationError(null); // Clear any previous errors when starting new generation
  };

  useEffect(() => {
    const handleResize = () => {
      setVerySmallScreen(window.innerWidth < 700);
      setSmallScreen(window.innerWidth < 1000);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="w-full">
      <h1 className="primary-header py-2">Generate Designated Petition</h1>
      <div className="py-2">
        <h2 className="text-xl py-2">Candidates for the Petition</h2>
        {candidates.length > 0 && (
          <VoterRecordTable
            records={candidates}
            paginated={false}
            fieldsList={["Address"]}
            fullWidth={true}
            compactView={smallScreen}
            extraHeaders={[
              "Public Office or Party Position (include district number if applicable)",
            ]}
            extraContent={(record) => {
              return (
                <div className="flex gap-2 items-center">
                  <ComboboxDropdown
                    items={officeNames.map((o) => {
                      return { label: o.officeName, value: o.officeName };
                    })}
                    initialValue={
                      candidates.find((c) => c.VRCNUM === record.VRCNUM)?.office
                    }
                    displayLabel="Select Office"
                    onSelect={(office) => {
                      setCandidates((candidates) => {
                        const updated = candidates.find(
                          (c) => c.VRCNUM === record.VRCNUM,
                        );

                        if (updated) {
                          updated.office = office;
                        }

                        return [...candidates];
                      });
                    }}
                  />
                  <Button
                    variant={"destructive"}
                    title="Remove Candidate"
                    onClick={() =>
                      setCandidates(
                        candidates.filter((c) => c.VRCNUM !== record.VRCNUM),
                      )
                    }
                  >
                    {smallScreen ? "X" : "Remove Candidate"}
                  </Button>
                </div>
              );
            }}
          />
        )}
        {!showCandidateSearch && (
          <Button onClick={() => setShowCandidateSearch(true)}>
            Add Candidate
          </Button>
        )}
        {showCandidateSearch && (
          <RecordSearchForm
            handleResults={setSearchCandidates}
            optionalExtraSearch="Show Eligible Candidates Only"
            submitButtonText="Find Candidates"
          />
        )}
        {searchCandidates.length > 0 && showCandidateSearch && (
          <VoterRecordTable
            records={searchCandidates
              .filter((sc) => !candidates.find((c) => c.VRCNUM === sc.VRCNUM))
              .slice(0, 4)}
            paginated={false}
            fieldsList={[]}
            extraContent={(record) => {
              return (
                <Button
                  onClick={() => {
                    setCandidates([
                      ...candidates,
                      {
                        ...record,
                        office: candidates[candidates.length - 1]?.office ?? "",
                      },
                    ]);
                    setShowCandidateSearch(false);
                    setSearchCandidates([]);
                  }}
                >
                  Add Candidate
                </Button>
              );
            }}
          />
        )}
      </div>
      {errors.candidates && <p className="text-red-500">{errors.candidates}</p>}
      <div className="py-2">
        <h2 className="text-xl py-2">Vacancy Appointments</h2>
        {vacancyAppointments.length > 0 && (
          <VoterRecordTable
            records={vacancyAppointments}
            paginated={false}
            compactView={smallScreen}
            fullWidth={true}
            fieldsList={["Address"]}
            extraContent={(record) => {
              return (
                <div className="flex gap-2 items-center">
                  <Button
                    variant={"destructive"}
                    onClick={() =>
                      setVacancyAppointments(
                        vacancyAppointments.filter(
                          (c) => c.VRCNUM !== record.VRCNUM,
                        ),
                      )
                    }
                  >
                    {verySmallScreen ? "X" : "Remove Vacancy Appointment"}
                  </Button>
                </div>
              );
            }}
          />
        )}
        {!showVacancyAppointmentsSearch && (
          <Button onClick={() => setShowVacancyAppointmentsSearch(true)}>
            Add Vacancy Appointment
          </Button>
        )}
        {showVacancyAppointmentsSearch && (
          <RecordSearchForm
            handleResults={setVacancyAppointmentsSearch}
            submitButtonText="Find Records"
          />
        )}
        {vacancyAppointmentsSearch.length > 0 &&
          showVacancyAppointmentsSearch && (
            <VoterRecordTable
              records={vacancyAppointmentsSearch
                .filter(
                  (sc) =>
                    !vacancyAppointments.find((c) => c.VRCNUM === sc.VRCNUM) &&
                    !candidates.find((c) => c.VRCNUM === sc.VRCNUM),
                )
                .slice(0, 4)}
              paginated={false}
              fieldsList={[]}
              extraContent={(record) => {
                return (
                  <Button
                    onClick={() => {
                      setVacancyAppointments([...vacancyAppointments, record]);
                      setShowVacancyAppointmentsSearch(false);
                      setVacancyAppointmentsSearch([]);
                    }}
                  >
                    Add Vacancy Appointment
                  </Button>
                );
              }}
            />
          )}
      </div>
      {errors.vacancyAppointments && (
        <p className="text-red-500">{errors.vacancyAppointments}</p>
      )}
      <div className="flex gap-2 items-center py-2">
        <label htmlFor="party">Party:</label>
        <ComboboxDropdown
          items={["Democratic", "Custom"].map((party) => {
            return {
              label: party,
              value: party,
            };
          })}
          displayLabel={"Select Party"}
          onSelect={(party) => {
            setParty(party);
          }}
        />
        {party === "Custom" && (
          <Input
            value={customParty}
            onChange={(e) => {
              setCustomParty(e.target.value);
            }}
            onFocus={() => {
              if (customParty === defaultCustomPartyName) {
                setCustomParty("");
              }
            }}
            onBlur={() => {
              if (customParty === "") {
                setCustomParty(defaultCustomPartyName);
              }
            }}
          />
        )}
      </div>
      {errors.party && <p className="text-red-500">{errors.party}</p>}

      <div className="flex gap-2 items-center py-2">
        <label htmlFor="electionDate">Election Date</label>
        {/** <DatePicker onChange={(date) => setElectionDate(date)} /> **/}
        <ComboboxDropdown
          items={electionDates
            .sort(
              (a: ElectionDate, b: ElectionDate) =>
                a.date.getTime() - b.date.getTime(),
            )
            .map((ed) => {
              const date = formatDate(ed.date, true);
              if (!date) return null;

              return {
                label: date,
                value: formatDate(ed.date, false),
              };
            })
            .filter(
              (ed): ed is { label: string; value: string } => ed !== null,
            )}
          displayLabel="Select Election Date"
          onSelect={(date) => {
            setElectionDate(new Date(date));
          }}
        />
      </div>
      {errors.electionDate && (
        <p className="text-red-500">{errors.electionDate}</p>
      )}

      <div className="flex gap-2 items-center py-2">
        <label htmlFor="numberOfPages">Number of Pages</label>
        <Input
          type="number"
          value={numPages}
          className="w-24"
          onChange={(e) => setNumPages(Number(e.target.value))}
          onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;
            const cleanedValue = parseInt(inputValue, 10) || 0;
            setNumPages(cleanedValue);
            e.target.value = cleanedValue.toString();
          }}
        />
      </div>
      {errors.numPages && <p className="text-red-500">{errors.numPages}</p>}

      <div className="py-2">
        <label htmlFor="reportName" className="block text-sm font-medium mb-2">
          Petition Name (Optional)
        </label>
        <Input
          id="reportName"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          placeholder="Enter a name for this petition"
          className="max-w-md"
        />
      </div>

      <div className="py-2">
        <label
          htmlFor="reportDescription"
          className="block text-sm font-medium mb-2"
        >
          Petition Description (Optional)
        </label>
        <Textarea
          id="reportDescription"
          value={reportDescription}
          onChange={(e) => setReportDescription(e.target.value)}
          placeholder="Enter a description for this petition"
          className="max-w-md min-h-[80px]"
        />
      </div>

      <div className="pt-4">
        <Button onClick={(e) => void handleSubmit(e)}>Generate Petition</Button>
        {Object.keys(errors).length > 0 && (
          <p className="text-red-500">Please fill out all required fields</p>
        )}
      </div>
      {reportId && (
        <ReportStatusTracker
          reportId={reportId}
          onComplete={(url) => {
            console.log("complete!", url);
            setReportUrl(url);
          }}
          onError={(error) => {
            setGenerationError(error);
          }}
        />
      )}
      {reportUrl && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 py-2">
            <p className="font-medium">Petition generated successfully!</p>
            <a
              href="/reports"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              View in Reports Dashboard
            </a>
          </div>
          <iframe
            className="w-full h-[100vh] max-w-[800px] max-h-[1200px]"
            src={reportUrl}
          ></iframe>
        </div>
      )}
      {generationError && (
        <div className="py-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 font-medium">Generation Error</p>
            <p className="text-red-700 mt-1">{generationError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratePetitionForm;
