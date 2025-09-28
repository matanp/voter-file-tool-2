import React, { useCallback } from "react";
import { Button } from "~/components/ui/button";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { FieldRenderer } from "./FieldRenderer";
import { CompoundFieldRenderer } from "./CompoundFieldRenderer";
import type { SearchFieldValue } from "~/types/searchFields";
import { SEARCH_CONFIG } from "~/lib/searchConfiguration";
import type { SearchRowComponentProps } from "~/lib/searchRowTypes";
import { createAccessibilityProps } from "~/lib/searchEventHandlers";

export const SearchRow: React.FC<SearchRowComponentProps> = ({
  row,
  index,
  dropdownList,
  availableFields,
  onFieldChange,
  onValueChange,
  onRemoveRow,
  canRemove,
}) => {
  const handleFieldChange = useCallback(
    (value: string) => {
      onFieldChange(index, value);
    },
    [onFieldChange, index],
  );

  const handleValueChange = useCallback(
    (value: SearchFieldValue, compoundIndex?: number) => {
      onValueChange(index, value, compoundIndex);
    },
    [onValueChange, index],
  );

  const handleRemoveClick = useCallback(
    () => onRemoveRow(index),
    [onRemoveRow, index],
  );

  const removeButtonProps = createAccessibilityProps(
    "removeCriteria",
    undefined,
    index,
  );

  return (
    <div
      className="flex gap-4 shadow-md p-4 bg-background"
      role="group"
      aria-label={SEARCH_CONFIG.ariaLabels.searchCriteria(index)}
    >
      <div className="m-2">
        <div className="flex gap-4">
          {/* Field selector */}
          <div className="flex flex-row items-center">
            <label htmlFor={`field-selector-${index}`} className="sr-only">
              Select search field for criteria {index + 1}
            </label>
            <ComboboxDropdown
              id={`field-selector-${index}`}
              items={availableFields as Array<{ label: string; value: string }>}
              initialValue={row.name}
              displayLabel={row.displayName}
              onSelect={handleFieldChange}
              ariaLabel={`Select search field for criteria ${index + 1}`}
            />
          </div>

          {/* Value input */}
          <div>
            {!row.compoundType && row.name !== "empty" && (
              <FieldRenderer
                field={row}
                dropdownList={dropdownList}
                onValueChange={handleValueChange}
                index={index}
              />
            )}

            {row.compoundType && (
              <CompoundFieldRenderer
                field={row}
                dropdownList={dropdownList}
                onValueChange={handleValueChange}
                rowIndex={index}
              />
            )}
          </div>
        </div>
      </div>

      {/* Remove button */}
      {canRemove && (
        <div className="flex flex-row items-center">
          <Button
            variant="destructive"
            onClick={handleRemoveClick}
            title={SEARCH_CONFIG.titles.removeCriteria}
            aria-label={removeButtonProps["aria-label"]}
            type="button"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Remove</span>
          </Button>
        </div>
      )}
    </div>
  );
};
