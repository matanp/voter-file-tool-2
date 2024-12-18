"use client";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/datePicker";
import { Input } from "~/components/ui/input";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { toast } from "~/components/ui/use-toast";
import RecordSearchForm from "../components/RecordSearchForm";
import type { VoterRecord } from "@prisma/client";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import React from "react";
import { generatePdfDataSchema } from "../api/lib/utils";

// :OHNO: add login check

type GeneratePetitionFormProps = {
  parties: string[];
};
export const PRINT_PARTY_MAP = {
  BLK: "Blank",
  CON: "Congressional",
  IND: "Independent",
  LBT: "Libertarian",
  GRE: "Green",
  DEM: "Democratic",
  REP: "Republican",
  REF: "Reform",
  OTH: "Other",
  WEP: "We the People",
  SAM: "Save America Movement",
  WOR: "Working Families Party",
} as const;

export type PartyCode = keyof typeof PRINT_PARTY_MAP;

export const GeneratePetitionForm: React.FC<GeneratePetitionFormProps> = ({
  parties,
}) => {
  const [smallScreen, setSmallScreen] = useState<boolean>(false);
  const [verySmallScreen, setVerySmallScreen] = useState<boolean>(false);
  const [party, setParty] = useState<string>("");
  const [electionDate, setElectionDate] = useState<Date | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
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

    const formData = {
      candidates: candidatesData,
      vacancyAppointments: vacancyAppointmentsData,
      party,
      electionDate:
        electionDate?.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "2-digit",
        }) ?? "",
      numPages,
    };

    const validationResult = generatePdfDataSchema.safeParse(formData);

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

    const response = await fetch(`/api/generatePdf`, {
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

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "output.pdf");
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleResize = () => {
      setVerySmallScreen(window.innerWidth < 700);
      setSmallScreen(window.innerWidth < 1000);
    };
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="w-full">
      <h1 className="text-2xl py-2">Generate Designated Petition</h1>
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
            extraContent={(record: VoterRecord) => {
              return (
                <div className="flex gap-2 items-center">
                  <Input
                    onChange={(e) => {
                      setCandidates((candidates) => {
                        const updated = candidates.find(
                          (c) => c.VRCNUM === record.VRCNUM,
                        );
                        if (updated) {
                          updated.office = e.target.value;
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
            extraContent={(record: VoterRecord) => {
              return (
                <Button
                  onClick={() => {
                    setCandidates([...candidates, { ...record, office: "" }]);
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
            extraContent={(record: VoterRecord) => {
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
              extraContent={(record: VoterRecord) => {
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
          items={parties
            .filter((party) => party !== "" && party !== "OTH")
            .map((party) => {
              return {
                label: PRINT_PARTY_MAP[party as PartyCode],
                value: party,
              };
            })}
          displayLabel={"Select Party"}
          onSelect={(party) => {
            setParty(party);
          }}
        />
      </div>
      {errors.party && <p className="text-red-500">{errors.party}</p>}

      <div className="flex gap-2 items-center py-2">
        <label htmlFor="electionDate">Election Date</label>
        <DatePicker onChange={(date) => setElectionDate(date)} />
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

      <div className="pt-4">
        <Button onClick={(e) => handleSubmit(e)}>Generate Petition</Button>
        {Object.keys(errors).length > 0 && (
          <p className="text-red-500">Please fill out all required fields</p>
        )}
      </div>
    </div>
  );
};

export default GeneratePetitionForm;
