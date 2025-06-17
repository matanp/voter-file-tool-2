import type { VoterRecord } from "@prisma/client";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";

type RecordSearchProps = {
  handleResults: (results: VoterRecord[]) => void;
  submitButtonText: string;
  extraSearchQuery?: {
    field: string;
    value: string | number | Date | undefined;
  }[];
  headerText?: string;
  optionalExtraSearch?: string;
};

const RecordSearchForm: React.FC<RecordSearchProps> = ({
  handleResults,
  submitButtonText,
  extraSearchQuery,
  headerText,
  optionalExtraSearch,
}) => {
  const [voterId, setVoterId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [useOptionalExtaSearch, setUseOptionalExtraSearch] =
    useState<boolean>(true);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const query =
      optionalExtraSearch && !useOptionalExtaSearch
        ? []
        : [...(extraSearchQuery ?? [])];

    if (voterId) {
      query.push({ field: "VRCNUM", value: voterId });
    }

    if (firstName) {
      query.push({ field: "firstName", value: firstName });
    }

    if (lastName) {
      query.push({ field: "lastName", value: lastName });
    }

    const response = await fetch(`/api/fetchFilteredData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ searchQuery: query, page: 1, pageSize: 100 }),
    });

    // :TODO: does this need to be validated?
    const { data } = (await response.json()) as {
      data: VoterRecord[];
      totalRecords: number;
    };

    setLoading(false);
    handleResults(data);
  };
  return (
    <>
      {headerText && <h1 className="primary-header">{headerText}</h1>}
      <form onSubmit={handleSubmit} className="w-max bg-primary-foreground p-4">
        <div className="flex gap-2 items-center">
          <Input
            type="string"
            className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
            placeholder={`Enter Voter ID`}
            onChange={(e) => setVoterId(e.target.value)}
          />
          <Input
            type="string"
            className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
            placeholder={`Enter First Name`}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            type="string"
            className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
            placeholder={`Enter Last Name`}
            onChange={(e) => setLastName(e.target.value)}
          />
          <Button type="submit">
            {loading ? "Loading..." : submitButtonText}
          </Button>
        </div>
        {optionalExtraSearch && extraSearchQuery && (
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              id="eligible-candidates"
              checked={useOptionalExtaSearch}
              onCheckedChange={(value) => {
                setUseOptionalExtraSearch(value === true);
              }}
            />
            <label htmlFor="eligible-candidates">{optionalExtraSearch}</label>
          </div>
        )}
      </form>
    </>
  );
};

export default RecordSearchForm;
