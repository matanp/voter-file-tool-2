import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
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
    return field;
  }
  return undefined;
};

export const findCompoundSearchFieldByName = (
  name: string,
): CompoundSearchField | undefined => {
  const field = findSearchFieldByName(name);
  if (field?.compoundType) {
    return field;
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

// Type-safe mock data factories for SearchField types
export const createMockBaseSearchField = <
  T extends BaseSearchField = BaseSearchField,
>(
  overrides: Partial<T> = {},
): BaseSearchField => ({
  name: "firstName" as const,
  displayName: "First Name",
  compoundType: false,
  type: "String" as const,
  value: "" as SearchFieldValue,
  id: "test-id-1",
  allowMultiple: false,
  ...overrides,
});

export const createMockCompoundSearchField = <
  T extends CompoundSearchField = CompoundSearchField,
>(
  overrides: Partial<T> = {},
): CompoundSearchField => ({
  name: "name" as const,
  displayName: "Name",
  compoundType: true as const,
  fields: [
    createMockBaseSearchField({ name: "firstName", displayName: "First Name" }),
    createMockBaseSearchField({ name: "lastName", displayName: "Last Name" }),
  ],
  id: "test-compound-id-1",
  ...overrides,
});

export const createMockSearchField = <T extends SearchField = SearchField>(
  overrides: Partial<T> = {},
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
    isAuthenticated?: boolean;
  } = {},
) => ({
  handleSubmit: jest.fn().mockResolvedValue(Promise.resolve()),
  dropdownList: createMockDropdownLists(),
  isAuthenticated: true,
  ...overrides,
});

// Mock SearchRow props factory
export const createMockSearchRowProps = <T extends SearchField = SearchField>(
  overrides: {
    row?: T;
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
  row: (overrides.row ?? createMockSearchField()) as T,
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
export const testSearchFields: {
  stringField: BaseSearchField;
  numberField: BaseSearchField;
  dropdownField: BaseSearchField;
  dateField: BaseSearchField;
  booleanField: BaseSearchField;
  streetField: BaseSearchField;
  cityTownField: BaseSearchField;
  emptyField: BaseSearchField;
  emptyStringField: BaseSearchField;
  compoundNameField: CompoundSearchField;
  compoundAddressField: CompoundSearchField;
} = {
  // Base fields from SEARCH_FIELDS - these should match real field structures
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
  // Compound fields from SEARCH_FIELDS - deep cloned to prevent mutations leaking to SEARCH_FIELDS
  compoundNameField: {
    ...(JSON.parse(
      JSON.stringify(findCompoundSearchFieldByName("name")!),
    ) as unknown as CompoundSearchField),
    id: "test-compound-name-1",
  } as CompoundSearchField,
  compoundAddressField: {
    ...(JSON.parse(
      JSON.stringify(findCompoundSearchFieldByName("address")!),
    ) as unknown as CompoundSearchField),
    id: "test-compound-address-1",
  } as CompoundSearchField,
};

// Custom render function with VoterSearchProvider
type CustomRenderOptions = Omit<RenderOptions, "wrapper">;

export const renderWithVoterSearchProvider = (
  ui: ReactElement,
  options: CustomRenderOptions = {},
) => {
  const { ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(VoterSearchProvider, null, children);
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
): React.FormEvent<HTMLFormElement> => {
  const preventDefault = jest.fn();
  const stopPropagation = jest.fn();

  return {
    preventDefault,
    stopPropagation,
    currentTarget: null as unknown as HTMLFormElement,
    target: null as unknown as HTMLFormElement,
    type: "submit",
    timeStamp: Date.now(),
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    isTrusted: true,
    nativeEvent: null as unknown as Event,
    eventPhase: Event.NONE,
    isDefaultPrevented: () => preventDefault.mock.calls.length > 0,
    isPropagationStopped: () => stopPropagation.mock.calls.length > 0,
    persist: jest.fn(),
    ...overrides,
  } as React.FormEvent<HTMLFormElement>;
};

export const createMockChangeEvent = (
  value: string,
): React.ChangeEvent<HTMLInputElement> => {
  const preventDefault = jest.fn();
  const stopPropagation = jest.fn();

  // Create a mock input element with minimal required properties
  const targetElement = {
    value,
    name: "test-input",
    type: "text",
    checked: false,
    tagName: "INPUT",
    nodeName: "INPUT",
    nodeType: 1,
    ownerDocument: null as unknown as Document,
    style: {} as CSSStyleDeclaration,
    className: "",
    id: "",
    innerHTML: "",
    outerHTML: "",
    textContent: "",
    attributes: {} as NamedNodeMap,
    childNodes: {} as NodeList,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    parentNode: null,
    parentElement: null,
    children: {} as HTMLCollection,
    focus: jest.fn(),
    blur: jest.fn(),
    click: jest.fn(),
    select: jest.fn(),
    setSelectionRange: jest.fn(),
    setRangeText: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  } as unknown as HTMLInputElement;

  return {
    target: targetElement,
    preventDefault,
    stopPropagation,
    currentTarget: targetElement,
    type: "change",
    timeStamp: Date.now(),
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    isTrusted: true,
    nativeEvent: null as unknown as Event,
    eventPhase: Event.NONE,
    isDefaultPrevented: () => preventDefault.mock.calls.length > 0,
    isPropagationStopped: () => stopPropagation.mock.calls.length > 0,
    persist: jest.fn(),
  } as React.ChangeEvent<HTMLInputElement>;
};

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

// Enhanced type guards for testing with better type safety
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

// Type-safe field type validators
export const isValidFieldType = (
  type: string,
): type is BaseSearchField["type"] => {
  const validTypes: readonly BaseSearchField["type"][] = [
    "String",
    "Number",
    "Boolean",
    "DateTime",
    "Dropdown",
    "Street",
    "CityTown",
    "Hidden",
  ] as const;
  return validTypes.includes(type as BaseSearchField["type"]);
};

// Type-safe assertion helpers
export const assertIsBaseSearchField = (
  field: SearchField,
): asserts field is BaseSearchField => {
  if (!isBaseSearchField(field)) {
    throw new Error(
      `Expected BaseSearchField, got CompoundSearchField: ${field.name}`,
    );
  }
};

export const assertIsCompoundSearchField = (
  field: SearchField,
): asserts field is CompoundSearchField => {
  if (!isCompoundSearchField(field)) {
    throw new Error(
      `Expected CompoundSearchField, got BaseSearchField: ${field.name}`,
    );
  }
};

// Type-safe mock event creators
export const createMockFormSubmitEvent =
  (): React.FormEvent<HTMLFormElement> => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();

    return {
      preventDefault,
      stopPropagation,
      currentTarget: null as unknown as HTMLFormElement,
      target: null as unknown as HTMLFormElement,
      type: "submit",
      timeStamp: Date.now(),
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      isTrusted: true,
      nativeEvent: null as unknown as Event,
      // Add missing properties required by FormEvent
      eventPhase: Event.NONE,
      isDefaultPrevented: () => preventDefault.mock.calls.length > 0,
      isPropagationStopped: () => stopPropagation.mock.calls.length > 0,
      persist: jest.fn(),
    } as React.FormEvent<HTMLFormElement>;
  };

export const createMockKeyboardEvent = (
  key: string,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  } = {},
): KeyboardEvent => {
  const preventDefault = jest.fn();
  const stopPropagation = jest.fn();

  const event = new KeyboardEvent("keydown", {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    altKey: options.altKey ?? false,
    bubbles: true,
    cancelable: true,
  });

  // Add jest spy methods and required properties
  Object.assign(event, {
    preventDefault,
    stopPropagation,
    eventPhase: Event.NONE,
    isDefaultPrevented: () => preventDefault.mock.calls.length > 0,
    isPropagationStopped: () => stopPropagation.mock.calls.length > 0,
    persist: jest.fn(),
  });

  return event;
};

// Type-safe test data validators
export const validateSearchField = (field: SearchField): boolean => {
  if (field.compoundType) {
    return (
      Array.isArray(field.fields) &&
      field.fields.length > 0 &&
      field.fields.every((f) => validateBaseSearchField(f))
    );
  }
  return validateBaseSearchField(field);
};

export const validateBaseSearchField = (field: BaseSearchField): boolean => {
  return (
    typeof field.name === "string" &&
    typeof field.displayName === "string" &&
    typeof field.type === "string" &&
    isValidFieldType(field.type) &&
    (field.value === undefined ||
      typeof field.value === "string" ||
      typeof field.value === "number" ||
      typeof field.value === "boolean" ||
      field.value instanceof Date ||
      Array.isArray(field.value))
  );
};

// Test constants
export const TEST_CONSTANTS = {
  DEFAULT_TIMEOUT: 5000,
  ANIMATION_DELAY: 100,
  DEBOUNCE_DELAY: 300,
  MAX_SEARCH_ROWS: 10,
  MIN_SEARCH_ROWS: 1,
} as const;
