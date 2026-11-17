import type { DropdownLists } from "@prisma/client";
import type { SearchField } from "~/types/searchFields";
import { SearchRow } from "~/components/search/SearchRow";
import { getAvailableFields, canRemoveRow } from "~/lib/searchHelpers";
import { SEARCH_FIELDS } from "~/lib/constants/searchFields";
import { SEARCH_CONFIG } from "~/lib/searchConfiguration";
import { useSearchState } from "~/lib/useSearchState";
import {
  useFieldChangeHandlers,
  useKeyboardHandlers,
  useKeyboardShortcuts,
  useFormSubmission,
} from "~/lib/searchEventHandlers";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { focusedInputWithPendingChip } from "~/lib/pendingChip";
import {
  mergeQuickNameIntoRows,
  moveQuickNameIntoRows,
  quickNameFromRows,
  type QuickName,
} from "~/lib/quickNameSearch";
import { useCallback, useState } from "react";
import type { SearchMode } from "~/lib/useSearchModePreference";

interface VoterRecordSearchProps {
  handleSubmit: (searchQuery: SearchField[]) => Promise<void>;
  dropdownList: DropdownLists;
  isAuthenticated: boolean;
  /** "simple" shows only the name box; "advanced" shows only the criteria builder. */
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

const VoterRecordSearch: React.FC<VoterRecordSearchProps> = (props) => {
  const searchState = useSearchState();
  const [quickName, setQuickName] = useState<QuickName>({
    firstName: "",
    lastName: "",
  });
  const { handleSubmit, isAuthenticated, mode, onModeChange } = props;
  const isSimple = mode === "simple";
  const { submitSearchWithContext, searchRows, setSearchRowsDirect } =
    searchState;

  const fieldHandlers = useFieldChangeHandlers(searchState);

  // Simple mode is the name box alone; advanced mode is the criteria builder alone. The name box
  // is plain text inputs, so whatever is typed is used on the first Search, with no chip-on-blur
  // step. The builder's rows stay in state while hidden, for when the user switches back to
  // advanced, but never filter a simple search.
  const submitRows = useCallback(
    async (filteredRows: SearchField[]) => {
      await handleSubmit(
        submitSearchWithContext(
          isSimple ? mergeQuickNameIntoRows([], quickName) : filteredRows,
        ),
      );
    },
    [handleSubmit, submitSearchWithContext, quickName, isSimple],
  );

  // Carry the name across the switch: box → builder's Name row, and back when it fits the box.
  const switchMode = useCallback(
    (next: SearchMode) => {
      if (next === "advanced") {
        setSearchRowsDirect(moveQuickNameIntoRows(searchRows, quickName));
      } else {
        setQuickName(quickNameFromRows(searchRows));
      }
      onModeChange(next);
    },
    [onModeChange, quickName, searchRows, setSearchRowsDirect],
  );

  const keyboardHandlers = useKeyboardHandlers(
    searchState,
    submitRows,
    isAuthenticated,
    { allowAddCriteria: !isSimple },
  );

  useKeyboardShortcuts(keyboardHandlers);

  const { handleFormSubmit } = useFormSubmission(
    submitRows,
    searchState,
    isAuthenticated,
  );

  return (
    <div className="flex justify-center px-4">
      <form
        onSubmit={handleFormSubmit}
        className="flex w-full min-w-0 flex-col items-stretch gap-4 sm:w-max sm:max-w-full sm:items-center"
        role="search"
        aria-label={SEARCH_CONFIG.ariaLabels.searchForm}
      >
        {isSimple && (
          <div
            className="grid w-full grid-cols-1 gap-3 bg-background p-4 shadow-md sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            role="group"
            aria-label="Search by name"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="quick-first-name" className="text-sm font-medium">
                First name
              </label>
              <Input
                id="quick-first-name"
                type="text"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="search"
                value={quickName.firstName}
                onChange={(e) =>
                  setQuickName((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="quick-last-name" className="text-sm font-medium">
                Last name
              </label>
              <Input
                id="quick-last-name"
                type="text"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="search"
                value={quickName.lastName}
                onChange={(e) =>
                  setQuickName((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
              />
            </div>
            <Button
              type="submit"
              disabled={!isAuthenticated}
              aria-label={SEARCH_CONFIG.ariaLabels.submitSearch(
                isAuthenticated,
              )}
              title={SEARCH_CONFIG.titles.submitSearch(isAuthenticated)}
            >
              Search
            </Button>
          </div>
        )}

        {!isSimple && (
          <>
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="sr-only">Search criteria</legend>
              {searchState.searchRows.map((row, index) => {
                const availableFields = getAvailableFields(
                  searchState.searchRows,
                  SEARCH_FIELDS,
                  row.name,
                );
                const canRemove = canRemoveRow(searchState.searchRows, index);

                return (
                  <SearchRow
                    key={row.id ?? `fallback-key-${index}`}
                    row={row}
                    index={index}
                    dropdownList={props.dropdownList}
                    availableFields={availableFields}
                    onFieldChange={fieldHandlers.handleFieldChange}
                    onValueChange={fieldHandlers.handleValueChange}
                    onRemoveRow={fieldHandlers.handleRemoveRow}
                    canRemove={canRemove}
                  />
                );
              })}
            </fieldset>

            <div
              className="flex flex-wrap items-center justify-center gap-4"
              role="group"
              aria-label={SEARCH_CONFIG.ariaLabels.searchActions}
            >
              <Button
                type="button"
                onClick={searchState.addSearchRow}
                aria-label={SEARCH_CONFIG.ariaLabels.addCriteria}
                title={SEARCH_CONFIG.titles.addCriteria}
              >
                Add Search Criteria
              </Button>

              <div className="py-2">
                <Button
                  type="submit"
                  disabled={!isAuthenticated}
                  // Keep focus in a builder input with typed text: blurring it here would add its chip,
                  // move this button down, and lose the click. The submit handler adds the chip instead.
                  onMouseDown={(event) => {
                    if (focusedInputWithPendingChip()) event.preventDefault();
                  }}
                  className="hover:bg-primary-700 w-full rounded-md border border-transparent bg-primary px-4 py-2 text-primary-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={SEARCH_CONFIG.ariaLabels.submitSearch(
                    isAuthenticated,
                  )}
                  title={SEARCH_CONFIG.titles.submitSearch(isAuthenticated)}
                >
                  Submit
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Below the search and its buttons in both modes, on its own line. */}
        <div className="flex justify-center pb-8">
          <ModeToggle mode={mode} onModeChange={switchMode} />
        </div>
      </form>

      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {searchState.announcement}
      </div>
    </div>
  );
};

const ModeToggle: React.FC<{
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}> = ({ mode, onModeChange }) => (
  <button
    type="button"
    className="rounded-sm text-sm text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    onClick={() => onModeChange(mode === "simple" ? "advanced" : "simple")}
  >
    {mode === "simple" ? "Advanced search →" : "← Simple search"}
  </button>
);

export default VoterRecordSearch;
