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
  | "DateRange"
  | "DateOfBirth"
  | "Dropdown"
  | "Street"
  | "CityTown"
  | "Hidden";

export type DateRange = {
  startDate?: Date;
  endDate?: Date;
};

export type DateOfBirthValue = {
  mode: "single" | "range";
  singleDate?: Date;
  range?: DateRange;
  extendBefore?: boolean;
  extendAfter?: boolean;
};

export type SearchFieldValue =
  | string
  | Date
  | DateRange
  | DateOfBirthValue
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
    | "lastUpdateRange"
    | "originalRegDateRange"
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
