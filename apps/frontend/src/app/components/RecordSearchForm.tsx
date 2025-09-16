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
  useFormElement?: boolean;
};

const RecordSearchForm: React.FC<RecordSearchProps> = ({
  handleResults,
  submitButtonText,
  extraSearchQuery,
  headerText,
  optionalExtraSearch,
  useFormElement = true,
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
      const description =
        error instanceof Error
          ? error.message
          : "Unable to search voter records. Please try again.";
      toast({
        title: "Search Failed",
        description,
        variant: "destructive",
      });
      handleResults([]);
    },
  });

  const handleSubmit = async () => {
    const query: SearchQueryField[] =
      optionalExtraSearch && !useOptionalExtraSearch
        ? []
        : [...(extraSearchQuery ?? ([] as SearchQueryField[]))];

    if (voterId?.trim()) {
      query.push({ field: "VRCNUM", value: voterId.trim() });
    }

    if (firstName?.trim()) {
      query.push({ field: "firstName", value: firstName.trim() });
    }

    if (lastName?.trim()) {
      query.push({ field: "lastName", value: lastName.trim() });
    }

    await searchMutation.mutate({ searchQuery: query, page: 1, pageSize: 100 });
  };
  const ContainerElement = useFormElement ? "form" : "div";
  const containerProps = useFormElement
    ? {
        onSubmit: (e: React.FormEvent) => {
          e.preventDefault();
          void handleSubmit();
        },
      }
    : {};

  return (
    <>
      {headerText && <h1 className="primary-header">{headerText}</h1>}
      <ContainerElement
        className="lg:w-max w-4/5 bg-primary-foreground p-4"
        {...containerProps}
      >
        <div className="flex gap-4 items-center">
          <label className="sr-only" htmlFor="voter-id">
            Voter ID
          </label>
          <Input
            id="voter-id"
            type="text"
            className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
            placeholder={width > 760 ? `Enter Voter ID` : "Voter ID"}
            autoComplete="off"
            onChange={(e) => setVoterId(e.target.value)}
          />
          <label className="sr-only" htmlFor="first-name">
            First Name
          </label>
          <Input
            id="first-name"
            type="text"
            className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
            placeholder={width > 760 ? `Enter First Name` : "First Name"}
            autoComplete="given-name"
            onChange={(e) => setFirstName(e.target.value)}
          />
          <label className="sr-only" htmlFor="last-name">
            Last Name
          </label>
          <Input
            id="last-name"
            type="text"
            className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
            placeholder={width > 760 ? `Enter Last Name` : "Last Name"}
            autoComplete="family-name"
            onChange={(e) => setLastName(e.target.value)}
          />
          <Button
            type={useFormElement ? "submit" : "button"}
            onClick={useFormElement ? undefined : () => void handleSubmit()}
            disabled={searchMutation.loading}
            aria-busy={searchMutation.loading || undefined}
          >
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
      </ContainerElement>
    </>
  );
};

export default RecordSearchForm;
