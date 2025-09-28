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

interface VoterRecordSearchProps {
  handleSubmit: (searchQuery: SearchField[]) => Promise<void>;
  dropdownList: DropdownLists;
  isAuthenticated: boolean;
}

const VoterRecordSearch: React.FC<VoterRecordSearchProps> = (props) => {
  const searchState = useSearchState();

  const fieldHandlers = useFieldChangeHandlers(searchState);

  const keyboardHandlers = useKeyboardHandlers(
    searchState,
    props.handleSubmit,
    props.isAuthenticated,
  );

  useKeyboardShortcuts(keyboardHandlers);

  const { handleFormSubmit } = useFormSubmission(
    async (filteredRows) => {
      await props.handleSubmit(
        searchState.submitSearchWithContext(filteredRows),
      );
    },
    searchState,
    props.isAuthenticated,
  );

  return (
    <div className="flex justify-center">
      <form
        onSubmit={handleFormSubmit}
        className="w-max flex flex-col items-center gap-4"
        role="search"
        aria-label={SEARCH_CONFIG.ariaLabels.searchForm}
      >
        <fieldset className="border-0 p-0 m-0">
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
          className="flex items-center gap-4 pb-8"
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
              disabled={!props.isAuthenticated}
              className="hover:bg-primary-700 w-full rounded-md border border-transparent bg-primary px-4 py-2 text-primary-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={SEARCH_CONFIG.ariaLabels.submitSearch(
                props.isAuthenticated,
              )}
              title={SEARCH_CONFIG.titles.submitSearch(props.isAuthenticated)}
            >
              Submit
            </Button>
          </div>
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

export default VoterRecordSearch;
