import type {
  NUMBER_FIELDS,
  COMPUTED_BOOLEAN_FIELDS,
  DATE_FIELDS,
  STRING_FIELDS,
} from "@voter-file-tool/shared-validators";

export type BaseFieldType =
  | "String"
  | "number"
  | "Boolean"
  | "DateTime"
  | "Dropdown"
  | "Street"
  | "CityTown"
  | "Hidden";

export interface BaseSearchField {
  name:
    | (typeof NUMBER_FIELDS)[number]
    | (typeof COMPUTED_BOOLEAN_FIELDS)[number]
    | (typeof DATE_FIELDS)[number]
    | (typeof STRING_FIELDS)[number]
    | "empty";
  displayName: string;
  compoundType: false;
  type: BaseFieldType;
  value?: string | Date | number | boolean | undefined;
  id?: string;
}

export interface CompoundSearchField {
  name: string;
  displayName: string;
  compoundType: true;
  fields: BaseSearchField[];
  id?: string;
}

export type SearchField = BaseSearchField | CompoundSearchField;

export {
  convertBaseSearchFieldToSearchQueryField,
  convertSearchFieldsToSearchQuery,
  safeConvertBaseSearchFieldToSearchQueryField,
  safeConvertSearchFieldsToSearchQuery,
  FrontendSearchQueryFieldError,
} from "~/lib/searchQueryFieldConversions";
