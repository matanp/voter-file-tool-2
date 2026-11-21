"use client";
/**
 * Name search across the caller's committees (leader feedback 2026-11-11,
 * ticket 07). The input sits in the list pane's filter bar; while it holds a
 * query, the pane shows member hits in place of the committee grid. Picking a
 * hit opens that hit's committee. Shown to Leader and up by acting
 * privilege; the endpoint enforces the real role and scope.
 */
import React from "react";
import { ChevronRight, Clock, UserSearch, X } from "lucide-react";

import { Input } from "~/components/ui/input";
import { StatusBadge } from "~/components/ui/status-badge";
import {
  MEMBER_SEARCH_LIMIT,
  MEMBER_SEARCH_MAX_LENGTH,
  MEMBER_SEARCH_MIN_LENGTH,
  type MemberSearchHit,
} from "~/lib/validations/committee";
import { formatTownName } from "./gridModel";
import type { MemberSearchState } from "./useMemberSearch";

/** Everything the list pane needs to run the member search. */
export type MemberSearchControl = {
  query: string;
  onQueryChange: (query: string) => void;
  state: MemberSearchState;
  onOpen: (hit: MemberSearchHit) => void;
};

export function MemberSearchInput({
  value,
  onChange,
  resultsId,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Id of the results region; set only while it is rendered. */
  resultsId?: string;
}) {
  return (
    <div className="relative">
      <UserSearch
        className="absolute left-2 top-2.5 h-4 w-4 text-slate-400"
        aria-hidden
      />
      <Input
        type="search"
        aria-label="Find a member by name"
        aria-controls={resultsId}
        className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
        placeholder="Find a member by name"
        autoComplete="off"
        maxLength={MEMBER_SEARCH_MAX_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value !== "") {
            e.preventDefault();
            onChange("");
          }
        }}
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear member search"
          className="absolute right-1 top-1 rounded p-1.5 text-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

function memberName(hit: MemberSearchHit): string {
  const name = [hit.firstName, hit.lastName].filter(Boolean).join(" ");
  return name === "" ? "(no name on record)" : name;
}

function committeeLabel(hit: MemberSearchHit): string {
  return `${formatTownName(hit.cityTown)} · LD ${String(hit.legDistrict)} · ED ${String(hit.electionDistrict)}`;
}

/** The status line: always announced; shown as a message unless hits are listed. */
function statusLine(
  query: string,
  state: MemberSearchState,
): { text: string; visible: boolean; error: boolean } {
  switch (state.status) {
    case "idle":
      return {
        text: `Type at least ${String(MEMBER_SEARCH_MIN_LENGTH)} letters of a name.`,
        visible: true,
        error: false,
      };
    case "loading":
      return { text: "Searching members…", visible: true, error: false };
    case "error":
      return {
        text: `Could not search members: ${state.error}`,
        visible: true,
        error: true,
      };
    case "ready": {
      const n = state.hits.length;
      return n === 0
        ? {
            text: `No members match “${query.trim()}”.`,
            visible: true,
            error: false,
          }
        : {
            text: `${String(n)} member${n === 1 ? "" : "s"} found`,
            visible: false,
            error: false,
          };
    }
  }
}

function MemberStatusBadge({ status }: { status: MemberSearchHit["status"] }) {
  return status === "pending" ? (
    <StatusBadge
      tone="warning"
      className="shrink-0 gap-0.5 px-1.5 py-0"
      icon={<Clock className="h-3 w-3" aria-hidden />}
    >
      Pending
    </StatusBadge>
  ) : (
    <StatusBadge tone="success" className="shrink-0 px-1.5 py-0">
      Active
    </StatusBadge>
  );
}

export function MemberSearchResults({
  id,
  query,
  state,
  selectedCommitteeId,
  onOpen,
}: {
  id: string;
  query: string;
  state: MemberSearchState;
  selectedCommitteeId: number | null;
  onOpen: (hit: MemberSearchHit) => void;
}) {
  const line = statusLine(query, state);
  return (
    <div id={id} aria-label="Member search results" role="region">
      <p
        className={
          line.visible
            ? `p-6 text-center text-sm ${
                line.error ? "text-red-700" : "text-slate-500"
              }`
            : "sr-only"
        }
        role="status"
      >
        {line.text}
      </p>
      {state.status === "ready" && state.hits.length > 0 && (
        <>
          <ul aria-label="Members">
            {state.hits.map((hit) => {
              const current = hit.committeeListId === selectedCommitteeId;
              return (
                <li key={hit.membershipId}>
                  <button
                    type="button"
                    onClick={() => onOpen(hit)}
                    aria-current={current ? "true" : undefined}
                    className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${
                      current ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {memberName(hit)}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {committeeLabel(hit)}
                      </span>
                    </span>
                    <MemberStatusBadge status={hit.status} />
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-slate-300"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          {state.truncated && (
            <p className="p-3 text-center text-xs text-slate-500">
              Showing the first {MEMBER_SEARCH_LIMIT}. Type more of the name to
              narrow it down.
            </p>
          )}
        </>
      )}
    </div>
  );
}
