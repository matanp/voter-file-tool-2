import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import type {
  SearchField,
  SearchFieldValue,
  BaseSearchField,
  CompoundSearchField,
} from "~/types/searchFields";
import type { DropdownLists } from "@prisma/client";
import { VoterSearchProvider } from "~/contexts/VoterSearchContext";
import { SEARCH_FIELDS } from "~/lib/constants/searchFields";

// Utility functions to extract fields from real SEARCH_FIELDS constant
export const findSearchFieldByName = (
  name: string,
): SearchField | undefined => {
  return SEARCH_FIELDS.find((field) => field.name === name);
};

export const findBaseSearchFieldByName = (
  name: string,
): BaseSearchField | undefined => {
  const field = findSearchFieldByName(name);
  if (field && !field.compoundType) {
    return field as BaseSearchField;
  }
  return undefined;
};

export const findCompoundSearchFieldByName = (
  name: string,
): CompoundSearchField | undefined => {
  const field = findSearchFieldByName(name);
  if (field && field.compoundType) {
    return field as CompoundSearchField;
  }
  return undefined;
};

export const findBaseSearchFieldInCompound = (
  compoundName: string,
  baseFieldName: string,
): BaseSearchField | undefined => {
  const compoundField = findCompoundSearchFieldByName(compoundName);
  if (compoundField?.fields) {
    return compoundField.fields.find((field) => field.name === baseFieldName);
  }
  return undefined;
};

// Mock data factories for SearchField types
export const createMockBaseSearchField = (
  overrides: Partial<BaseSearchField> = {},
): BaseSearchField => ({
  name: "firstName" as const,
  displayName: "First Name",
  compoundType: false,
  type: "String",
  value: "",
  id: "test-id-1",
  allowMultiple: false,
  ...overrides,
});

export const createMockCompoundSearchField = (
  overrides: Partial<CompoundSearchField> = {},
): CompoundSearchField => ({
  name: "name",
  displayName: "Name",
  compoundType: true,
  fields: [
    createMockBaseSearchField({ name: "firstName", displayName: "First Name" }),
    createMockBaseSearchField({ name: "lastName", displayName: "Last Name" }),
  ],
  id: "test-compound-id-1",
  ...overrides,
});

export const createMockSearchField = (
  overrides: Partial<SearchField> = {},
): SearchField => {
  if (overrides.compoundType === true) {
    return createMockCompoundSearchField(
      overrides as Partial<CompoundSearchField>,
    );
  }
  return createMockBaseSearchField(overrides as Partial<BaseSearchField>);
};

// Mock DropdownLists factory
export const createMockDropdownLists = (
  overrides: Partial<DropdownLists> = {},
): DropdownLists => ({
  id: 1,
  city: ["New York", "Albany", "Buffalo"],
  street: ["Main St", "Broadway", "Park Ave"],
  zipCode: ["10001", "10002", "10003"],
  countyLegDistrict: ["1", "2", "3"],
  stateAssmblyDistrict: ["1", "2", "3"],
  stateSenateDistrict: ["1", "2", "3"],
  congressionalDistrict: ["1", "2", "3"],
  townCode: ["001", "002", "003"],
  electionDistrict: ["1", "2", "3"],
  party: ["DEM", "REP", "IND"],
  ...overrides,
});

// Mock VoterRecordSearch props factory
export const createMockVoterRecordSearchProps = (
  overrides: {
    handleSubmit?: (searchQuery: SearchField[]) => Promise<void>;
    dropdownList?: DropdownLists;
  } = {},
) => ({
  handleSubmit: jest.fn().mockResolvedValue(undefined),
  dropdownList: createMockDropdownLists(),
  ...overrides,
});

// Mock SearchRow props factory
export const createMockSearchRowProps = (
  overrides: {
    row?: SearchField;
    index?: number;
    dropdownList?: DropdownLists;
    availableFields?: Array<{ label: string; value: string }>;
    onFieldChange?: (index: number, fieldName: string) => void;
    onValueChange?: (
      index: number,
      value: SearchFieldValue,
      compoundIndex?: number,
    ) => void;
    onRemoveRow?: (index: number) => void;
    canRemove?: boolean;
  } = {},
) => ({
  row: createMockSearchField(),
  index: 0,
  dropdownList: createMockDropdownLists(),
  availableFields: [
    { label: "First Name", value: "firstName" },
    { label: "Last Name", value: "lastName" },
  ],
  onFieldChange: jest.fn(),
  onValueChange: jest.fn(),
  onRemoveRow: jest.fn(),
  canRemove: true,
  ...overrides,
});

// Mock FieldRenderer props factory
export const createMockFieldRendererProps = (
  overrides: {
    field?: BaseSearchField;
    dropdownList?: DropdownLists;
    onValueChange?: (value: SearchFieldValue) => void;
    index?: number;
    subIndex?: number;
  } = {},
) => ({
  field: createMockBaseSearchField(),
  dropdownList: createMockDropdownLists(),
  onValueChange: jest.fn(),
  index: 0,
  subIndex: undefined,
  ...overrides,
});

// Test data sets using real SEARCH_FIELDS constant
export const testSearchFields = {
  // Base fields from SEARCH_FIELDS
  stringField: {
    ...findBaseSearchFieldByName("VRCNUM")!,
    allowMultiple: false, // Override to test single string input
    value: "123456789",
    id: "test-vrcnum-1",
  },
  numberField: {
    ...findBaseSearchFieldInCompound("address", "houseNum")!,
    value: 123,
    id: "test-housenum-1",
  },
  dropdownField: {
    ...findBaseSearchFieldByName("party")!,
    allowMultiple: false, // Override to test single dropdown
    value: "DEM",
    id: "test-party-1",
  },
  dateField: {
    ...findBaseSearchFieldByName("DOB")!,
    value: new Date("1990-01-01"),
    id: "test-dob-1",
  },
  booleanField: {
    ...findBaseSearchFieldInCompound("additionalCriteria", "hasEmail")!,
    value: true,
    id: "test-hasemail-1",
  },
  streetField: {
    ...findBaseSearchFieldInCompound("address", "street")!,
    allowMultiple: false, // Override to test single street search
    value: "Main St",
    id: "test-street-1",
  },
  cityTownField: {
    ...findBaseSearchFieldInCompound("cityTown", "city")!,
    value: "New York",
    id: "test-city-1",
  },
  emptyField: {
    ...findBaseSearchFieldByName("empty")!,
    value: "",
    id: "test-empty-1",
  },
  emptyStringField: {
    ...findBaseSearchFieldByName("VRCNUM")!,
    allowMultiple: false,
    value: "", // Empty for input change tests
    id: "test-empty-string-1",
  },
  // Compound fields from SEARCH_FIELDS
  compoundNameField: {
    ...findCompoundSearchFieldByName("name")!,
    id: "test-compound-name-1",
  },
  compoundAddressField: {
    ...findCompoundSearchFieldByName("address")!,
    id: "test-compound-address-1",
  },
};

// Custom render function with VoterSearchProvider
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialSearchQuery?: SearchField[];
  initialFlattenedSearchQuery?: any[];
  initialFieldsList?: string[];
}

export const renderWithVoterSearchProvider = (
  ui: ReactElement,
  options: CustomRenderOptions = {},
) => {
  const {
    initialSearchQuery = [],
    initialFlattenedSearchQuery = [],
    initialFieldsList = [],
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(VoterSearchProvider, { children });
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Test helpers for common assertions
export const expectFieldToHaveValue = (
  field: SearchField,
  expectedValue: SearchFieldValue,
) => {
  if (field.compoundType) {
    expect(field.fields).toBeDefined();
    expect(field.fields.length).toBeGreaterThan(0);
  } else {
    expect(field.value).toBe(expectedValue);
  }
};

export const expectFieldToHaveType = (
  field: BaseSearchField,
  expectedType: string,
) => {
  expect(field.type).toBe(expectedType);
};

export const expectFieldToHaveDisplayName = (
  field: SearchField,
  expectedDisplayName: string,
) => {
  expect(field.displayName).toBe(expectedDisplayName);
};

// Mock event factories
export const createMockFormEvent = (
  overrides: Partial<React.FormEvent<HTMLFormElement>> = {},
) =>
  ({
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...overrides,
  }) as React.FormEvent<HTMLFormElement>;

export const createMockChangeEvent = (value: string) =>
  ({
    target: { value },
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  }) as unknown as React.ChangeEvent<HTMLInputElement>;

export const createMockKeyboardEvent = (
  key: string,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  } = {},
) =>
  ({
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    altKey: options.altKey ?? false,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  }) as unknown as KeyboardEvent;

// Test data for different field types
export const fieldTypeTestData = {
  string: {
    validValues: ["John", "Doe", "123 Main St"],
    invalidValues: [null, undefined],
    emptyValues: ["", "   "],
  },
  number: {
    validValues: [123, 0, -1, 1.5],
    invalidValues: ["abc", null, undefined],
    emptyValues: [""],
  },
  boolean: {
    validValues: [true, false],
    invalidValues: [null, undefined, "true", "false"],
    emptyValues: [undefined],
  },
  date: {
    validValues: [new Date("1990-01-01"), new Date()],
    invalidValues: ["invalid-date", null, undefined],
    emptyValues: [undefined],
  },
  dropdown: {
    validValues: ["DEM", "REP", "IND"],
    invalidValues: [null, undefined],
    emptyValues: [""],
  },
};

// Accessibility test helpers
export const expectAriaLabel = (
  element: HTMLElement,
  expectedLabel: string,
) => {
  expect(element.getAttribute("aria-label")).toBe(expectedLabel);
};

export const expectAriaRole = (element: HTMLElement, expectedRole: string) => {
  expect(element.getAttribute("role")).toBe(expectedRole);
};

export const expectAriaLive = (element: HTMLElement, expectedLive: string) => {
  expect(element.getAttribute("aria-live")).toBe(expectedLive);
};

// Performance test helpers
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// Cleanup helpers
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};

// Type guards for testing
export const isBaseSearchField = (
  field: SearchField,
): field is BaseSearchField => {
  return !field.compoundType;
};

export const isCompoundSearchField = (
  field: SearchField,
): field is CompoundSearchField => {
  return field.compoundType === true;
};

// Test constants
export const TEST_CONSTANTS = {
  DEFAULT_TIMEOUT: 5000,
  ANIMATION_DELAY: 100,
  DEBOUNCE_DELAY: 300,
  MAX_SEARCH_ROWS: 10,
  MIN_SEARCH_ROWS: 1,
} as const;
