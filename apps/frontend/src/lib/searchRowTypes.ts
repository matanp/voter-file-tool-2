import type { SearchField, SearchFieldValue } from "~/types/searchFields";
import type { DropdownLists } from "@prisma/client";

/**
 * Props interface for the SearchRow component.
 * Defines the contract for search row rendering and interaction.
 */
export interface SearchRowComponentProps {
  /** The search field configuration for this row */
  row: SearchField;
  /** The index of this row in the search form */
  index: number;
  /** Available dropdown options for various field types */
  dropdownList: DropdownLists;
  /** List of available fields that can be selected for this row */
  availableFields: Array<{ label: string; value: string }>;
  /** Callback when the field type changes */
  onFieldChange: (index: number, fieldName: string) => void;
  /** Callback when the field value changes */
  onValueChange: (
    index: number,
    value: SearchFieldValue,
    compoundIndex?: number,
  ) => void;
  /** Callback when the row should be removed */
  onRemoveRow: (index: number) => void;
  /** Whether this row can be removed (typically false for single row) */
  canRemove: boolean;
}
