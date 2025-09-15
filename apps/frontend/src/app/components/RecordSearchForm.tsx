"use client";
import type { VoterRecord } from "@prisma/client";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { useWindowSize } from "~/hooks/useWindowSize";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useToast } from "~/components/ui/use-toast";
import { type SearchQueryField } from "@voter-file-tool/shared-validators";

type RecordSearchProps = {
  handleResults: (results: VoterRecord[]) => void;
  submitButtonText: string;
  extraSearchQuery?: SearchQueryField[];
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
  const { width } = useWindowSize();
  const { toast } = useToast();
  const [voterId, setVoterId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [useOptionalExtraSearch, setUseOptionalExtraSearch] =
    useState<boolean>(true);

  // API mutation hook
  const searchMutation = useApiMutation<
    { data: VoterRecord[] },
    {
      searchQuery: SearchQueryField[];
      page: number;
      pageSize: number;
    }
  >("/api/fetchFilteredData", "POST", {
    onSuccess: (data) => {
      handleResults(data.data);
    },
    onError: (error) => {
      console.error("Search failed:", error);
      toast({
        title: "Search Failed",
        description:
          error.message || "Unable to search voter records. Please try again.",
        variant: "destructive",
      });
      handleResults([]);
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query =
      optionalExtraSearch && !useOptionalExtraSearch
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

    await searchMutation.mutate({ searchQuery: query, page: 1, pageSize: 100 });
  };
  return (
    <>
      {headerText && <h1 className="primary-header">{headerText}</h1>}
      <form
        onSubmit={handleSubmit}
        className="lg:w-max w-4/5 bg-primary-foreground p-4"
      >
        <div className="flex gap-4 items-center">
          <Input
            type="string"
            className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
            placeholder={width > 760 ? `Enter Voter ID` : "Voter ID"}
            onChange={(e) => setVoterId(e.target.value)}
          />
          <Input
            type="string"
            className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
            placeholder={width > 760 ? `Enter First Name` : "First Name"}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            type="string"
            className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
            placeholder={width > 760 ? `Enter Last Name` : "Last Name"}
            onChange={(e) => setLastName(e.target.value)}
          />
          <Button type="submit" disabled={searchMutation.loading}>
            {searchMutation.loading ? "Loading..." : submitButtonText}
          </Button>
        </div>
        {optionalExtraSearch && extraSearchQuery && (
          <div className="flex items-center gap-4 mt-2">
            <Checkbox
              id="eligible-candidates"
              checked={useOptionalExtraSearch}
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
