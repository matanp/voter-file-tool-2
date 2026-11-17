"use client";
import React from "react";

import { Button } from "~/components/ui/button";
import { CommitteeFilters, type CommitteeFiltersProps } from "./CommitteeFilters";
import { CommitteeGrid } from "./CommitteeGrid";
import type { CommitteeTownGroup } from "./gridModel";
import { MemberSearchResults } from "./CommitteeMemberSearch";
import type { MemberSearchHit } from "~/lib/validations/committee";
import type { MemberSearchState } from "./useMemberSearch";
import type { CommitteeGridStatus } from "./useCommitteeGridData";

export type CommitteeGridPaneProps = {
  filters: CommitteeFiltersProps;
  groups: CommitteeTownGroup[];
  selectedCommitteeId: number | null;
  onSelectCommittee: (committeeListId: number) => void;
  status: CommitteeGridStatus;
  error: string | null;
  onRetry: () => void;
  /** Member name search (Leader and up). Hits replace the grid while `query` is non-empty. */
  memberSearch?: {
    query: string;
    state: MemberSearchState;
    onOpen: (hit: MemberSearchHit) => void;
  };
};

export function CommitteeGridPane({
  filters,
  groups,
  selectedCommitteeId,
  onSelectCommittee,
  status,
  error,
  onRetry,
  memberSearch,
}: CommitteeGridPaneProps) {
  const hasRows = groups.length > 0;
  if (memberSearch && memberSearch.query.trim() !== "") {
    return (
      <>
        <CommitteeFilters {...filters} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MemberSearchResults
            query={memberSearch.query}
            state={memberSearch.state}
            selectedCommitteeId={selectedCommitteeId}
            onOpen={memberSearch.onOpen}
          />
        </div>
      </>
    );
  }
  return (
    <>
      <CommitteeFilters {...filters} />
      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={status !== "ready" && status !== "error"}>
        {status === "error" && (
          <div role="alert" className="space-y-2 border-b p-3 text-sm">
            <p className="text-red-700 dark:text-red-400">
              Could not load committees{error ? `: ${error}` : "."}
            </p>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
        {status === "loading" && !hasRows && (
          <p className="p-6 text-center text-sm text-slate-500" role="status">
            Loading committees…
          </p>
        )}
        {hasRows && (
          <CommitteeGrid
            groups={groups}
            selectedCommitteeId={selectedCommitteeId}
            onSelectCommittee={onSelectCommittee}
          />
        )}
        {!hasRows && (status === "ready" || status === "loading-more") && (
          <p className="p-6 text-center text-sm text-slate-500">
            No committees match.
          </p>
        )}
        {status === "loading-more" && (
          <p className="p-3 text-center text-xs text-slate-500" role="status">
            Loading more committees…
          </p>
        )}
      </div>
    </>
  );
}
