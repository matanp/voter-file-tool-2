import React from "react";
import type { SearchField } from "~/types/searchFields";
import type { SearchRowProps } from "~/components/search/SearchRow";

/**
 * Mock implementation of SearchRow component for testing VoterRecordSearch.
 * This mock simulates the behavior of the real SearchRow component while
 * providing test-specific functionality for value and field changes.
 */
export const SearchRow: React.FC<SearchRowProps> = (props) => {
  const [currentRow, setCurrentRow] = React.useState(props.row);

  const handleFieldChange = () => {
    // Simulate changing to a compound field like "City / Town"
    const newRow: SearchField = {
      name: "cityTown",
      displayName: "City / Town",
      compoundType: true,
      fields: [
        {
          name: "city",
          displayName: "City",
          compoundType: false,
          type: "CityTown",
          allowMultiple: false,
          value: undefined,
        },
        {
          name: "CC_WD_Village",
          displayName: "CC WD Village",
          compoundType: false,
          type: "Hidden",
          value: undefined,
        },
      ],
    };
    setCurrentRow(newRow);
    props.onFieldChange(props.index, "cityTown");
  };

  const handleValueChange = () => {
    if (!currentRow.compoundType) {
      // For base fields, update the value directly
      const newRow: SearchField = {
        ...currentRow,
        value: "New Value",
      };
      setCurrentRow(newRow);
    } else {
      // For compound fields, update the first sub-field's value
      const newRow: SearchField = {
        ...currentRow,
        fields: currentRow.fields?.map((field, index) =>
          index === 0 ? { ...field, value: "New Value" } : field,
        ),
      };
      setCurrentRow(newRow);
    }
    props.onValueChange(props.index, "New Value");
  };

  return (
    <div data-testid={`search-row-${props.index}`}>
      <div data-testid={`field-name-${props.index}`}>{currentRow.name}</div>
      <div data-testid={`field-display-name-${props.index}`}>
        {currentRow.displayName}
      </div>
      <div data-testid={`field-value-${props.index}`}>
        {(() => {
          if (currentRow.compoundType) {
            // For compound fields, show the value of the first sub-field
            return String(currentRow.fields?.[0]?.value ?? "");
          } else {
            // For base fields, show the value directly
            return String(currentRow.value ?? "");
          }
        })()}
      </div>
      <button
        data-testid={`remove-button-${props.index}`}
        onClick={() => props.onRemoveRow(props.index)}
        disabled={!props.canRemove}
      >
        Remove
      </button>
      <button
        data-testid={`field-change-button-${props.index}`}
        onClick={handleFieldChange}
      >
        Change Field
      </button>
      <button
        data-testid={`value-change-button-${props.index}`}
        onClick={handleValueChange}
      >
        Change Value
      </button>
    </div>
  );
};
