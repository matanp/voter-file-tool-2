"use client";
/**
 * Step 1, find candidate (plan §8): voter ID / first / last name, the **Only
 * eligible candidates** filter, and compact results. The filter is the
 * residency rule: voters in the committee's assembly district, whatever their
 * town, LD or ED. It adds nothing when `requireAssemblyDistrictMatch` is off,
 * and is disabled when the committee's ED has no crosswalk entry (no AD to
 * match; the ED is not used instead). Existing members of this committee are
 * listed but not selectable; on a full committee (add only) nobody is.
 */
import React, { useId, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  CANDIDATE_PAGE_SIZE,
  canFilterEligibleOnly,
  candidateSearchQuery,
  searchCandidates,
  type CandidateRecord,
  type CandidateSearchInput,
  type CandidateSearchResult,
} from "../adapters";
import type { CommitteeRef } from "../committeeAction";
import { personName } from "./drawerParts";

/** Search form and results, kept by the flow so Back returns to them. */
export type CandidateSearchState = {
  input: CandidateSearchInput;
  result: CandidateSearchResult | null;
};

export const EMPTY_CANDIDATE_SEARCH: CandidateSearchState = {
  input: { voterId: "", firstName: "", lastName: "", onlyEligible: true },
  result: null,
};

export function candidateAddress(c: CandidateRecord): string {
  const street = [c.houseNum, c.street].filter((p) => p != null && p !== "").join(" ");
  return [street, c.apartment, c.city].filter((p) => p && String(p).trim()).join(", ");
}

export type CandidateSearchStepProps = {
  committee: CommitteeRef;
  /** Governance config: off means the eligible-only filter has no residency condition. */
  requireAssemblyDistrictMatch: boolean;
  search: CandidateSearchState;
  onSearchChange: (next: CandidateSearchState) => void;
  /** VRCNUMs already on this committee. */
  existingMemberIds: ReadonlySet<string>;
  /** Add to a full committee: nothing is selectable. */
  committeeFull: boolean;
  onSelect: (candidate: CandidateRecord) => void;
};

export function CandidateSearchStep({
  committee,
  requireAssemblyDistrictMatch,
  search,
  onSearchChange,
  existingMemberIds,
  committeeFull,
  onSelect,
}: CandidateSearchStepProps) {
  const id = useId();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eligibleOnlyAvailable = canFilterEligibleOnly(committee, requireAssemblyDistrictMatch);
  // With no AD to match, the filter is off (never swapped for the ED).
  const input: CandidateSearchInput = eligibleOnlyAvailable
    ? search.input
    : { ...search.input, onlyEligible: false };
  const { result } = search;
  const filtersByAssemblyDistrict = eligibleOnlyAvailable && requireAssemblyDistrictMatch;

  const setInput = (patch: Partial<CandidateSearchInput>) =>
    onSearchChange({ ...search, input: { ...input, ...patch } });

  // Nothing to narrow by would page through the whole voter file.
  const query = candidateSearchQuery(committee, input, requireAssemblyDistrictMatch);
  const canSearch = query.length > 0;

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSearch) return;
    setSearching(true);
    setError(null);
    try {
      const next = await searchCandidates(query);
      onSearchChange({ input, result: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search voter records.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      {committeeFull && (
        <Alert variant="warning">
          <AlertTitle>This committee is full</AlertTitle>
          <AlertDescription>
            Every seat is filled. Remove a member or record a resignation before
            adding someone.
          </AlertDescription>
        </Alert>
      )}
      <form onSubmit={(e) => void runSearch(e)} className="space-y-3" aria-label="Find candidate">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor={`${id}-voter-id`}>Voter ID</Label>
            <Input
              id={`${id}-voter-id`}
              inputMode="numeric"
              autoComplete="off"
              value={input.voterId}
              onChange={(e) => setInput({ voterId: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-first`}>First name</Label>
            <Input
              id={`${id}-first`}
              autoComplete="off"
              value={input.firstName}
              onChange={(e) => setInput({ firstName: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-last`}>Last name</Label>
            <Input
              id={`${id}-last`}
              autoComplete="off"
              value={input.lastName}
              onChange={(e) => setInput({ lastName: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${id}-eligible`}
              checked={input.onlyEligible}
              disabled={!eligibleOnlyAvailable}
              aria-describedby={eligibleOnlyAvailable ? undefined : `${id}-no-ad`}
              onCheckedChange={(v) => setInput({ onlyEligible: v === true })}
            />
            <Label htmlFor={`${id}-eligible`}>Only eligible candidates</Label>
          </div>
          <Button
            type="submit"
            disabled={searching || !canSearch}
            aria-busy={searching || undefined}
            aria-describedby={`${id}-scope`}
          >
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
        {!eligibleOnlyAvailable && (
          <p id={`${id}-no-ad`} className="text-xs text-slate-600 dark:text-slate-400">
            Only eligible candidates is unavailable: this committee&apos;s ED has no
            crosswalk entry, so its assembly district is unknown.
          </p>
        )}
        <p id={`${id}-scope`} className="text-xs text-slate-500">
          {input.onlyEligible && filtersByAssemblyDistrict
            ? "Voters living in this committee's assembly district."
            : canSearch
              ? "All voters matching the ID or name."
              : filtersByAssemblyDistrict
                ? "Enter a voter ID or name, or turn on Only eligible candidates."
                : "Enter a voter ID or name."}
        </p>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Search failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <section aria-label="Search results" className="space-y-2">
          {result.candidates.length === 0 ? (
            <p className="text-sm text-slate-500">No voters matched.</p>
          ) : (
            <>
              <p className="text-xs text-slate-500" role="status">
                {result.total > result.candidates.length
                  ? `Showing the first ${CANDIDATE_PAGE_SIZE} of ${result.total} matches. Narrow the search to find someone else.`
                  : `${result.total} ${result.total === 1 ? "match" : "matches"}.`}
              </p>
              <ul aria-label="Candidates" className="divide-y rounded-md border">
                {result.candidates.map((candidate) => {
                  const name = personName(candidate) || candidate.VRCNUM;
                  const isMember = existingMemberIds.has(candidate.VRCNUM);
                  return (
                    <li
                      key={candidate.VRCNUM}
                      aria-label={name}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {[
                            `ID ${candidate.VRCNUM}`,
                            candidateAddress(candidate),
                            candidate.electionDistrict != null
                              ? `ED ${candidate.electionDistrict}`
                              : null,
                            candidate.party,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {isMember ? (
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Already on this committee
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={committeeFull}
                          aria-label={`Select ${name}`}
                          onClick={() => onSelect(candidate)}
                        >
                          Select
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
