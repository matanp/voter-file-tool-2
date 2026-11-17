"use client";
/**
 * Name search across the caller's committees (leader feedback 2026-11-11,
 * ticket 07). The input sits in the list pane's filter bar; while it holds a
 * query, the pane shows member hits in place of the committee grid. Picking a
 * hit opens that hit's committee. Shown to Leader and up by acting
 * permissions; the endpoint enforces the real role and scope.
 */
import React from "react";
import { ChevronRight, Clock, UserSearch, X } from "lucide-react";

import { Input } from "~/components/ui/input";
import {
  MEMBER_SEARCH_LIMIT,
  MEMBER_SEARCH_MAX_LENGTH,
  MEMBER_SEARCH_MIN_LENGTH,
  type MemberSearchHit,
} from "~/lib/validations/committee";
import { formatTownName } from "./gridModel";
import type { MemberSearchState } from "./useMemberSearch";

export const MEMBER_SEARCH_RESULTS_ID = "committee-member-search-results";

export function MemberSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
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
        aria-controls={MEMBER_SEARCH_RESULTS_ID}
        className="h-9 pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
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
          className="absolute right-1 top-1 rounded p-1.5 text-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:text-slate-200"
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

export function MemberSearchResults({
  query,
  state,
  selectedCommitteeId,
  onOpen,
}: {
  query: string;
  state: MemberSearchState;
  selectedCommitteeId: number | null;
  onOpen: (hit: MemberSearchHit) => void;
}) {
  const message =
    state.status === "idle"
      ? `Type at least ${String(MEMBER_SEARCH_MIN_LENGTH)} letters of a name.`
      : state.status === "loading"
        ? "Searching members…"
        : state.status === "error"
          ? `Could not search members: ${state.error}`
          : state.hits.length === 0
            ? `No members match “${query.trim()}”.`
            : null;

  return (
    <div
      id={MEMBER_SEARCH_RESULTS_ID}
      aria-label="Member search results"
      role="region"
    >
      {/* Announces result counts and status as the query changes. */}
      <p
        className={
          message === null
            ? "sr-only"
            : `p-6 text-center text-sm ${
                state.status === "error"
                  ? "text-red-700 dark:text-red-400"
                  : "text-slate-500"
              }`
        }
        role="status"
      >
        {message ??
          (state.status === "ready"
            ? `${String(state.hits.length)} member${state.hits.length === 1 ? "" : "s"} found`
            : "")}
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
                    className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:hover:bg-slate-900 ${
                      current ? "bg-blue-50 dark:bg-blue-950" : ""
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
                    {hit.status === "pending" && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-100 px-1 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                        <Clock className="h-3 w-3" aria-hidden />
                        Pending
                      </span>
                    )}
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
