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
import {
  formatElectionDateForUser,
  formatElectionDateForForm,
  sortElectionDates,
} from "~/lib/electionDateUtils";
import { ReportStatusTracker } from "../components/ReportStatusTracker";
import { useApiMutation } from "~/hooks/useApiMutation";

type GeneratePetitionFormProps = {
  parties: string[];
  electionDates: ElectionDate[];
  officeNames: OfficeName[];
};

function formatAddress(record: VoterRecord): string {
  const line1 = [record.houseNum, record.street, record.apartment]
    .filter(Boolean)
    .join(" ");
  const cityState = [record.city, record.state].filter(Boolean).join(", ");
  const line2 = [cityState, record.zipCode].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ");
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

  // API mutation hook
  const generateReportMutation = useApiMutation<
    { reportId: string },
    GenerateReportData
  >("/api/generateReport", "POST", {
    onSuccess: (data) => {
      setReportId(data.reportId);
      toast({
        title: "Report Generation Started",
        description:
          "Your petition is being generated. You'll be notified when it's ready.",
      });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "An unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to generate petition: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent double-submits while a request is in flight
    if (generateReportMutation.loading) {
      return;
    }

    const candidatesData = candidates.map((c) => {
      const candidateName = `${c.firstName} ${c.lastName}`;
      const address = formatAddress(c);
      return { name: candidateName, address, office: c.office };
    });

    const vacancyAppointmentsData = vacancyAppointments.map((c) => {
      const candidateName = `${c.firstName} ${c.lastName}`;
      const address = formatAddress(c);
      return { name: candidateName, address };
    });

    const selectedParty =
      party === "Custom" && customParty !== defaultCustomPartyName
        ? customParty
        : party === "Custom"
          ? ""
          : party;

    const formData: GenerateReportData = {
      type: "designatedPetition",
      name: reportName.trim() || undefined,
      description: reportDescription.trim() || undefined,
      format: "pdf",
      payload: {
        candidates: candidatesData,
        vacancyAppointments: vacancyAppointmentsData,
        party: selectedParty,
        electionDate: electionDate
          ? formatElectionDateForForm(electionDate)
          : "",
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

    setReportUrl(null);
    setGenerationError(null);
    setReportId("");
    void generateReportMutation.mutate(formData);
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
      <form onSubmit={handleSubmit}>
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
                  <div className="flex gap-4 items-center">
                    <ComboboxDropdown
                      items={officeNames.map((o) => {
                        return { label: o.officeName, value: o.officeName };
                      })}
                      initialValue={
                        candidates.find((c) => c.VRCNUM === record.VRCNUM)
                          ?.office
                      }
                      displayLabel="Select Office"
                      onSelect={(office) => {
                        setCandidates((prev) =>
                          prev.map((c) =>
                            c.VRCNUM === record.VRCNUM ? { ...c, office } : c,
                          ),
                        );
                      }}
                    />
                    <Button
                      type="button"
                      variant={"destructive"}
                      title="Remove Candidate"
                      onClick={() =>
                        setCandidates((prev) =>
                          prev.filter((c) => c.VRCNUM !== record.VRCNUM),
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
            <Button type="button" onClick={() => setShowCandidateSearch(true)}>
              Add Candidate
            </Button>
          )}
          {showCandidateSearch && (
            <RecordSearchForm
              handleResults={setSearchCandidates}
              optionalExtraSearch="Show Eligible Candidates Only"
              submitButtonText="Find Candidates"
              useFormElement={false}
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
                    type="button"
                    onClick={() => {
                      setCandidates((prev) => [
                        ...prev,
                        {
                          ...record,
                          office: prev[prev.length - 1]?.office ?? "",
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
        {errors.candidates && (
          <p className="text-destructive">{errors.candidates}</p>
        )}
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
                  <div className="flex gap-4 items-center">
                    <Button
                      type="button"
                      variant={"destructive"}
                      onClick={() =>
                        setVacancyAppointments((prev) =>
                          prev.filter((c) => c.VRCNUM !== record.VRCNUM),
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
            <Button
              type="button"
              onClick={() => setShowVacancyAppointmentsSearch(true)}
            >
              Add Vacancy Appointment
            </Button>
          )}
          {showVacancyAppointmentsSearch && (
            <RecordSearchForm
              handleResults={setVacancyAppointmentsSearch}
              submitButtonText="Find Records"
              useFormElement={false}
            />
          )}
          {vacancyAppointmentsSearch.length > 0 &&
            showVacancyAppointmentsSearch && (
              <VoterRecordTable
                records={vacancyAppointmentsSearch
                  .filter(
                    (sc) =>
                      !vacancyAppointments.find(
                        (c) => c.VRCNUM === sc.VRCNUM,
                      ) && !candidates.find((c) => c.VRCNUM === sc.VRCNUM),
                  )
                  .slice(0, 4)}
                paginated={false}
                fieldsList={[]}
                extraContent={(record) => {
                  return (
                    <Button
                      type="button"
                      onClick={() => {
                        setVacancyAppointments((prev) => [...prev, record]);
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
          <p className="text-destructive">{errors.vacancyAppointments}</p>
        )}
        <div className="flex gap-4 items-center py-2">
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
        {errors.party && <p className="text-destructive">{errors.party}</p>}

        <div className="flex gap-4 items-center py-2">
          <label htmlFor="electionDate">Election Date</label>
          {/** <DatePicker onChange={(date) => setElectionDate(date)} /> **/}
          <ComboboxDropdown
            items={sortElectionDates(electionDates)
              .map((ed) => {
                const label = formatElectionDateForUser(ed.date);
                const value = formatElectionDateForForm(ed.date);
                if (!label || !value) return null;

                return {
                  label,
                  value,
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
          <p className="text-destructive">{errors.electionDate}</p>
        )}

        <div className="flex gap-4 items-center py-2">
          <label htmlFor="numberOfPages">Number of Pages</label>
          <Input
            type="number"
            value={numPages}
            min={1}
            inputMode="numeric"
            className="w-24"
            onChange={(e) => {
              const v = parseInt(e.target.value || "1", 10);
              setNumPages(Number.isNaN(v) ? 1 : Math.max(1, v));
            }}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
              const cleaned = Math.max(
                1,
                parseInt(e.target.value || "1", 10) || 1,
              );
              setNumPages(cleaned);
              e.target.value = String(cleaned);
            }}
          />
        </div>
        {errors.numPages && (
          <p className="text-destructive">{errors.numPages}</p>
        )}

        <div className="py-2">
          <label
            htmlFor="reportName"
            className="block text-sm font-medium mb-2"
          >
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
          <Button type="submit" disabled={generateReportMutation.loading}>
            {generateReportMutation.loading
              ? "Generating..."
              : "Generate Petition"}
          </Button>
          {Object.keys(errors).length > 0 && (
            <p className="text-destructive">
              Please fill out all required fields
            </p>
          )}
        </div>
      </form>
      {reportId && (
        <ReportStatusTracker
          reportId={reportId}
          onComplete={(url) => {
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
            title="Generated petition preview"
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
