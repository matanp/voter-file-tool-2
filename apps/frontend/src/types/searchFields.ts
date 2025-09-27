import type {
  NUMBER_FIELDS,
  COMPUTED_BOOLEAN_FIELDS,
  DATE_FIELDS,
  STRING_FIELDS,
} from "@voter-file-tool/shared-validators";

export type BaseFieldType =
  | "String"
  | "Number"
  | "Boolean"
  | "DateTime"
  | "Dropdown"
  | "Street"
  | "CityTown"
  | "Hidden";

export type SearchFieldValue =
  | string
  | Date
  | number
  | boolean
  | string[]
  | undefined;

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
  value?: SearchFieldValue;
  id?: string;
  allowMultiple?: boolean;
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
