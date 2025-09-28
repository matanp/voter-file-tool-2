import type { DropdownLists } from "@prisma/client";
import { EMPTY_FIELD } from "~/lib/searchHelpers";
import {
  findBaseSearchFieldByName,
  findBaseSearchFieldInCompound,
  findCompoundSearchFieldByName,
} from "./searchTestUtils";

// Comprehensive mock data for DropdownLists
export const mockDropdownLists: DropdownLists = {
  id: 1,
  city: [
    "New York",
    "Albany",
    "Buffalo",
    "Rochester",
    "Syracuse",
    "Yonkers",
    "New Rochelle",
    "Mount Vernon",
    "Schenectady",
    "Utica",
  ],
  street: [
    "Main St",
    "Broadway",
    "Park Ave",
    "First Ave",
    "Second Ave",
    "Third Ave",
    "Lexington Ave",
    "Madison Ave",
    "Fifth Ave",
    "Central Park West",
    "Riverside Dr",
    "West End Ave",
    "Amsterdam Ave",
    "Columbus Ave",
    "Central Park East",
  ],
  zipCode: [
    "10001",
    "10002",
    "10003",
    "10004",
    "10005",
    "10006",
    "10007",
    "10008",
    "10009",
    "10010",
    "10011",
    "10012",
    "10013",
    "10014",
    "10015",
  ],
  countyLegDistrict: [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
  ],
  stateAssmblyDistrict: [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
  ],
  stateSenateDistrict: [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "50",
    "51",
    "52",
    "53",
    "54",
    "55",
    "56",
    "57",
    "58",
    "59",
    "60",
    "61",
    "62",
    "63",
  ],
  congressionalDistrict: [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
  ],
  townCode: [
    "001",
    "002",
    "003",
    "004",
    "005",
    "006",
    "007",
    "008",
    "009",
    "010",
    "011",
    "012",
    "013",
    "014",
    "015",
    "016",
    "017",
    "018",
    "019",
    "020",
  ],
  electionDistrict: [
    "001",
    "002",
    "003",
    "004",
    "005",
    "006",
    "007",
    "008",
    "009",
    "010",
    "011",
    "012",
    "013",
    "014",
    "015",
    "016",
    "017",
    "018",
    "019",
    "020",
    "021",
    "022",
    "023",
    "024",
    "025",
    "026",
    "027",
    "028",
    "029",
    "030",
  ],
  party: ["DEM", "REP", "IND", "CON", "GRE", "LIB", "WOR", "SAM", "REF", "BLK"],
};

// Mock search field data using real SEARCH_FIELDS definitions
export const mockSearchFields = {
  // Basic string fields
  firstName: {
    ...findBaseSearchFieldInCompound("name", "firstName")!,
    value: "John",
    id: "mock-firstname-1",
    allowMultiple: false, // Override for test
  },
  lastName: {
    ...findBaseSearchFieldInCompound("name", "lastName")!,
    value: "Doe",
    id: "mock-lastname-1",
    allowMultiple: false, // Override for test
  },
  VRCNUM: {
    ...findBaseSearchFieldByName("VRCNUM")!,
    value: "123456789",
    id: "mock-vrcnum-1",
  },

  // Number fields
  houseNum: {
    ...findBaseSearchFieldInCompound("address", "houseNum")!,
    value: 123,
    id: "mock-housenum-1",
  },
  electionDistrict: {
    ...findBaseSearchFieldInCompound("district", "electionDistrict")!,
    value: 1,
    id: "mock-electiondistrict-1",
  },

  // Dropdown fields
  party: {
    ...findBaseSearchFieldByName("party")!,
    value: "DEM",
    id: "mock-party-1",
    allowMultiple: false, // Override for test
  },
  zipCode: {
    ...findBaseSearchFieldByName("zipCode")!,
    value: "10001",
    id: "mock-zipcode-1",
  },
  countyLegDistrict: {
    ...findBaseSearchFieldInCompound("district", "countyLegDistrict")!,
    value: "1",
    id: "mock-countylegdistrict-1",
  },

  // Date fields
  DOB: {
    ...findBaseSearchFieldByName("DOB")!,
    value: new Date("1990-01-01"),
    id: "mock-dob-1",
  },

  // Boolean fields
  hasEmail: {
    ...findBaseSearchFieldInCompound("additionalCriteria", "hasEmail")!,
    value: true,
    id: "mock-hasemail-1",
  },
  hasPhone: {
    ...findBaseSearchFieldInCompound("additionalCriteria", "hasPhone")!,
    value: false,
    id: "mock-hasphone-1",
  },

  // Street fields
  street: {
    ...findBaseSearchFieldInCompound("address", "street")!,
    value: "Main St",
    id: "mock-street-1",
    allowMultiple: false, // Override for test
  },

  // City/Town fields
  city: {
    ...findBaseSearchFieldInCompound("cityTown", "city")!,
    value: "New York",
    id: "mock-city-1",
  },

  // Hidden fields
  CC_WD_Village: {
    ...findBaseSearchFieldInCompound("cityTown", "CC_WD_Village")!,
    value: undefined,
    id: "mock-ccwdvillage-1",
  },

  // Empty field
  empty: {
    ...EMPTY_FIELD,
    value: "",
    id: "mock-empty-1",
  },
};

// Compound field mocks using real SEARCH_FIELDS definitions
export const mockCompoundFields = {
  name: {
    ...findCompoundSearchFieldByName("name")!,
    fields: [mockSearchFields.firstName, mockSearchFields.lastName],
    id: "mock-compound-name-1",
  },
  address: {
    ...findCompoundSearchFieldByName("address")!,
    fields: [mockSearchFields.houseNum, mockSearchFields.street],
    id: "mock-compound-address-1",
  },
  cityTown: {
    ...findCompoundSearchFieldByName("cityTown")!,
    fields: [mockSearchFields.city, mockSearchFields.CC_WD_Village],
    id: "mock-compound-citytown-1",
  },
  district: {
    ...findCompoundSearchFieldByName("district")!,
    fields: [
      mockSearchFields.countyLegDistrict,
      {
        ...findBaseSearchFieldInCompound("district", "stateAssmblyDistrict")!,
        value: "1",
        id: "mock-stateassemblydistrict-1",
      },
      {
        ...findBaseSearchFieldInCompound("district", "stateSenateDistrict")!,
        value: "1",
        id: "mock-statesenatedistrict-1",
      },
      mockSearchFields.electionDistrict,
    ],
    id: "mock-compound-district-1",
  },
  additionalCriteria: {
    ...findCompoundSearchFieldByName("additionalCriteria")!,
    fields: [
      mockSearchFields.hasEmail,
      {
        ...findBaseSearchFieldInCompound(
          "additionalCriteria",
          "hasInvalidEmail",
        )!,
        value: false,
        id: "mock-hasinvalidemail-1",
      },
      mockSearchFields.hasPhone,
    ],
    id: "mock-compound-additionalcriteria-1",
  },
};

// Test scenarios for different field values
export const fieldValueTestCases = {
  string: {
    valid: ["John", "Doe", "123 Main St", "A", "Very Long String Value"],
    invalid: [null, undefined],
    empty: ["", "   ", "\t", "\n"],
    edge: ["0", "false", "true", "null", "undefined"],
  },
  number: {
    valid: [0, 1, -1, 123, 1.5, 999999],
    invalid: ["abc", "1.2.3", null, undefined],
    empty: [""],
    edge: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
  },
  boolean: {
    valid: [true, false],
    invalid: [null, undefined, "true", "false", 1, 0],
    empty: [undefined],
    edge: ["indeterminate"],
  },
  date: {
    valid: [
      new Date("1990-01-01"),
      new Date("2024-12-31"),
      new Date("2000-06-15"),
    ],
    invalid: ["invalid-date", "1990-13-01", "1990-01-32", null, undefined],
    empty: [undefined],
    edge: [new Date("1900-01-01"), new Date("2100-12-31")],
  },
  dropdown: {
    valid: ["DEM", "REP", "IND", "CON"],
    invalid: [null, undefined],
    empty: [""],
    edge: ["", " "],
  },
  array: {
    valid: [
      ["DEM", "REP"],
      ["John", "Doe"],
      [1, 2, 3],
    ],
    invalid: [null, undefined],
    empty: [[]],
    edge: [[""], [" "], [null, undefined]],
  },
};

// Mock user interactions
export const mockUserInteractions = {
  click: {
    addButton: "Add Search Criteria",
    submitButton: "Submit",
    removeButton: "×",
  },
  keyboard: {
    submit: { key: "Enter", ctrlKey: true },
    addCriteria: { key: "+", ctrlKey: true },
    addCriteriaAlt: { key: "=", ctrlKey: true },
    escape: { key: "Escape" },
    tab: { key: "Tab" },
  },
  input: {
    firstName: "John",
    lastName: "Doe",
    houseNum: "123",
    street: "Main St",
    city: "New York",
    zipCode: "10001",
    party: "DEM",
  },
};

// Mock form states
export const mockFormStates = {
  empty: [],
  singleField: [mockSearchFields.firstName],
  multipleFields: [
    mockSearchFields.firstName,
    mockSearchFields.lastName,
    mockSearchFields.VRCNUM,
  ],
  compoundFields: [mockCompoundFields.name, mockCompoundFields.address],
  mixedFields: [
    mockSearchFields.firstName,
    mockCompoundFields.address,
    mockSearchFields.party,
  ],
  maxFields: Array.from({ length: 10 }, (_, i) => ({
    ...mockSearchFields.firstName,
    id: `mock-field-${i}`,
    value: `Value ${i}`,
  })),
};

// Mock API responses
export const mockApiResponses = {
  success: {
    status: 200,
    data: {
      results: [
        {
          VRCNUM: "123456789",
          firstName: "John",
          lastName: "Doe",
          street: "123 Main St",
          city: "New York",
          party: "DEM",
        },
      ],
      total: 1,
    },
  },
  error: {
    status: 500,
    error: "Internal server error",
  },
  validationError: {
    status: 422,
    error: "Invalid request data",
    success: false,
  },
  emptyResults: {
    status: 200,
    data: {
      results: [],
      total: 0,
    },
  },
};

// Mock accessibility attributes
export const mockAriaAttributes = {
  searchForm: {
    role: "search",
    "aria-label": "Voter record search form",
  },
  searchCriteria: {
    role: "group",
    "aria-label": "Search criteria",
  },
  searchRow: {
    role: "group",
    "aria-label": "Search criteria 1",
  },
  announcements: {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
  },
  buttons: {
    addCriteria: {
      "aria-label": "Add another search criteria",
      title: "Add another search criteria (Ctrl+Plus)",
    },
    submit: {
      "aria-label": "Submit voter record search",
      title: "Submit search (Ctrl+Enter)",
    },
    remove: {
      "aria-label": "Remove search criteria 1",
      title: "Remove Search Criteria",
    },
  },
  inputs: {
    fieldSelector: {
      "aria-label": "Select search field for criteria 1",
    },
    firstName: {
      "aria-label": "Enter First Name",
    },
    lastName: {
      "aria-label": "Enter Last Name",
    },
  },
};

// Performance test data
export const performanceTestData = {
  smallDataset: Array.from({ length: 10 }, (_, i) => ({
    ...mockSearchFields.firstName,
    id: `perf-field-${i}`,
    value: `Value ${i}`,
  })),
  mediumDataset: Array.from({ length: 100 }, (_, i) => ({
    ...mockSearchFields.firstName,
    id: `perf-field-${i}`,
    value: `Value ${i}`,
  })),
  largeDataset: Array.from({ length: 1000 }, (_, i) => ({
    ...mockSearchFields.firstName,
    id: `perf-field-${i}`,
    value: `Value ${i}`,
  })),
};

// Test constants
export const TEST_CONSTANTS = {
  TIMEOUTS: {
    SHORT: 1000,
    MEDIUM: 3000,
    LONG: 5000,
    VERY_LONG: 10000,
  },
  DELAYS: {
    ANIMATION: 100,
    DEBOUNCE: 300,
    NETWORK: 500,
  },
  LIMITS: {
    MAX_SEARCH_ROWS: 10,
    MIN_SEARCH_ROWS: 1,
    MAX_FIELD_LENGTH: 255,
    MAX_ARRAY_LENGTH: 100,
  },
  PERFORMANCE: {
    MAX_RENDER_TIME: 100, // ms
    MAX_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
    MAX_RECURSION_DEPTH: 100,
  },
} as const;
