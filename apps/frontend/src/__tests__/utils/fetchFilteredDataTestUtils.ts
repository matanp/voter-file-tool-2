import type { NextRequest } from "next/server";
import type { SearchQueryField } from "@voter-file-tool/shared-validators";
import {
  searchableFieldEnum,
  convertPrismaVoterRecordToAPI,
  isNumberFieldName,
  isDateFieldName,
  isStringFieldName,
  isComputedBooleanFieldName,
} from "@voter-file-tool/shared-validators";
import type {
  NUMBER_FIELDS,
  COMPUTED_BOOLEAN_FIELDS,
  DATE_FIELDS,
  STRING_FIELDS,
} from "@voter-file-tool/shared-validators";
import {
  fetchFilteredDataSchema,
  type FetchFilteredDataRequest,
} from "~/app/api/lib/utils";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createMockVoterRecord,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
} from "./testUtils";
import type { DeepMockProxy } from "jest-mock-extended";

// Shared dataset of 30 diverse mock voter records
export const SHARED_MOCK_VOTER_RECORDS = [
  // John Doe family - Boston residents
  createMockVoterRecord({
    VRCNUM: "VR000001",
    firstName: "John",
    lastName: "Doe",
    city: "Boston",
    houseNum: 123,
    street: "Main St",
    party: "Democratic",
    electionDistrict: 1,
    email: "john.doe@example.com",
    telephone: "555-0101",
    DOB: new Date("1985-03-15"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000002",
    firstName: "Jane",
    lastName: "Doe",
    city: "Boston",
    houseNum: 123,
    street: "Main St",
    party: "Democratic",
    electionDistrict: 1,
    email: "jane.doe@example.com",
    telephone: "555-0102",
    DOB: new Date("1987-07-22"),
  }),

  // Smith family - New York residents
  createMockVoterRecord({
    VRCNUM: "VR000003",
    firstName: "John",
    lastName: "Smith",
    city: "New York",
    houseNum: 456,
    street: "Broadway",
    party: "Republican",
    electionDistrict: 2,
    email: "john.smith@example.com",
    telephone: "555-0201",
    DOB: new Date("1990-01-10"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000004",
    firstName: "Alice",
    lastName: "Smith",
    city: "New York",
    houseNum: 456,
    street: "Broadway",
    party: "Republican",
    electionDistrict: 2,
    email: "alice.smith@example.com",
    telephone: "555-0202",
    DOB: new Date("1992-05-18"),
  }),

  // Johnson family - Chicago residents
  createMockVoterRecord({
    VRCNUM: "VR000005",
    firstName: "Bob",
    lastName: "Johnson",
    city: "Chicago",
    houseNum: 789,
    street: "Michigan Ave",
    party: "Independent",
    electionDistrict: 3,
    email: "bob.johnson@example.com",
    telephone: "555-0301",
    DOB: new Date("1988-11-30"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000006",
    firstName: "Carol",
    lastName: "Johnson",
    city: "Chicago",
    houseNum: 789,
    street: "Michigan Ave",
    party: "Independent",
    electionDistrict: 3,
    email: "carol.johnson@example.com",
    telephone: "555-0302",
    DOB: new Date("1991-09-14"),
  }),

  // Williams family - Miami residents
  createMockVoterRecord({
    VRCNUM: "VR000007",
    firstName: "David",
    lastName: "Williams",
    city: "Miami",
    houseNum: 321,
    street: "Ocean Dr",
    party: "Democratic",
    electionDistrict: 4,
    email: "david.williams@example.com",
    telephone: "555-0401",
    DOB: new Date("1986-12-05"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000008",
    firstName: "Eva",
    lastName: "Williams",
    city: "Miami",
    houseNum: 321,
    street: "Ocean Dr",
    party: "Democratic",
    electionDistrict: 4,
    email: "eva.williams@example.com",
    telephone: "555-0402",
    DOB: new Date("1989-04-12"),
  }),

  // Brown family - Seattle residents
  createMockVoterRecord({
    VRCNUM: "VR000009",
    firstName: "Frank",
    lastName: "Brown",
    city: "Seattle",
    houseNum: 654,
    street: "Pike St",
    party: "Republican",
    electionDistrict: 5,
    email: "frank.brown@example.com",
    telephone: "555-0501",
    DOB: new Date("1987-08-25"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000010",
    firstName: "Grace",
    lastName: "Brown",
    city: "Seattle",
    houseNum: 654,
    street: "Pike St",
    party: "Republican",
    electionDistrict: 5,
    email: "grace.brown@example.com",
    telephone: "555-0502",
    DOB: new Date("1990-02-28"),
  }),

  // Davis family - Los Angeles residents
  createMockVoterRecord({
    VRCNUM: "VR000011",
    firstName: "Henry",
    lastName: "Davis",
    city: "Los Angeles",
    houseNum: 987,
    street: "Sunset Blvd",
    party: "Independent",
    electionDistrict: 6,
    email: "henry.davis@example.com",
    telephone: "555-0601",
    DOB: new Date("1985-06-15"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000012",
    firstName: "Iris",
    lastName: "Davis",
    city: "Los Angeles",
    houseNum: 987,
    street: "Sunset Blvd",
    party: "Independent",
    electionDistrict: 6,
    email: "iris.davis@example.com",
    telephone: "555-0602",
    DOB: new Date("1988-10-03"),
  }),

  // Wilson family - Denver residents
  createMockVoterRecord({
    VRCNUM: "VR000013",
    firstName: "Jack",
    lastName: "Wilson",
    city: "Denver",
    houseNum: 147,
    street: "Colfax Ave",
    party: "Democratic",
    electionDistrict: 7,
    email: "jack.wilson@example.com",
    telephone: "555-0701",
    DOB: new Date("1989-01-20"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000014",
    firstName: "Kate",
    lastName: "Wilson",
    city: "Denver",
    houseNum: 147,
    street: "Colfax Ave",
    party: "Democratic",
    electionDistrict: 7,
    email: "kate.wilson@example.com",
    telephone: "555-0702",
    DOB: new Date("1991-07-08"),
  }),

  // Moore family - Phoenix residents
  createMockVoterRecord({
    VRCNUM: "VR000015",
    firstName: "Liam",
    lastName: "Moore",
    city: "Phoenix",
    houseNum: 258,
    street: "Central Ave",
    party: "Republican",
    electionDistrict: 8,
    email: "liam.moore@example.com",
    telephone: "555-0801",
    DOB: new Date("1986-04-17"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000016",
    firstName: "Maya",
    lastName: "Moore",
    city: "Phoenix",
    houseNum: 258,
    street: "Central Ave",
    party: "Republican",
    electionDistrict: 8,
    email: "maya.moore@example.com",
    telephone: "555-0802",
    DOB: new Date("1988-11-25"),
  }),

  // Taylor family - Austin residents
  createMockVoterRecord({
    VRCNUM: "VR000017",
    firstName: "Noah",
    lastName: "Taylor",
    city: "Austin",
    houseNum: 369,
    street: "Congress Ave",
    party: "Independent",
    electionDistrict: 9,
    email: "noah.taylor@example.com",
    telephone: "555-0901",
    DOB: new Date("1987-05-12"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000018",
    firstName: "Olivia",
    lastName: "Taylor",
    city: "Austin",
    houseNum: 369,
    street: "Congress Ave",
    party: "Independent",
    electionDistrict: 9,
    email: "olivia.taylor@example.com",
    telephone: "555-0902",
    DOB: new Date("1990-09-30"),
  }),

  // Anderson family - Portland residents
  createMockVoterRecord({
    VRCNUM: "VR000019",
    firstName: "Paul",
    lastName: "Anderson",
    city: "Portland",
    houseNum: 741,
    street: "Burnside St",
    party: "Democratic",
    electionDistrict: 10,
    email: "paul.anderson@example.com",
    telephone: "555-1001",
    DOB: new Date("1985-12-22"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000020",
    firstName: "Quinn",
    lastName: "Anderson",
    city: "Portland",
    houseNum: 741,
    street: "Burnside St",
    party: "Democratic",
    electionDistrict: 10,
    email: "quinn.anderson@example.com",
    telephone: "555-1002",
    DOB: new Date("1988-03-07"),
  }),

  // Records with missing email/phone for hasEmail/hasPhone testing
  createMockVoterRecord({
    VRCNUM: "VR000021",
    firstName: "Robert",
    lastName: "Thomas",
    city: "Boston",
    houseNum: 852,
    street: "Beacon St",
    party: "Republican",
    electionDistrict: 1,
    email: null, // No email
    telephone: "555-1101",
    DOB: new Date("1989-08-14"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000022",
    firstName: "Sarah",
    lastName: "Thomas",
    city: "Boston",
    houseNum: 852,
    street: "Beacon St",
    party: "Republican",
    electionDistrict: 1,
    email: "sarah.thomas@example.com",
    telephone: null, // No phone
    DOB: new Date("1992-01-26"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000023",
    firstName: "Tom",
    lastName: "Thomas",
    city: "Boston",
    houseNum: 852,
    street: "Beacon St",
    party: "Republican",
    electionDistrict: 1,
    email: "", // Empty email
    telephone: "", // Empty phone
    DOB: new Date("1987-06-18"),
  }),

  // Records with different house numbers for testing
  createMockVoterRecord({
    VRCNUM: "VR000024",
    firstName: "Uma",
    lastName: "Jackson",
    city: "New York",
    houseNum: 0, // Edge case: house number 0
    street: "5th Ave",
    party: "Democratic",
    electionDistrict: 2,
    email: "uma.jackson@example.com",
    telephone: "555-1201",
    DOB: new Date("1986-10-11"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000025",
    firstName: "Victor",
    lastName: "Jackson",
    city: "New York",
    houseNum: 999, // High house number
    street: "5th Ave",
    party: "Democratic",
    electionDistrict: 2,
    email: "victor.jackson@example.com",
    telephone: "555-1202",
    DOB: new Date("1989-12-03"),
  }),

  // Records with different election districts
  createMockVoterRecord({
    VRCNUM: "VR000026",
    firstName: "Wendy",
    lastName: "White",
    city: "Chicago",
    houseNum: 111,
    street: "State St",
    party: "Independent",
    electionDistrict: 11, // Higher election district
    email: "wendy.white@example.com",
    telephone: "555-1301",
    DOB: new Date("1988-07-19"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000027",
    firstName: "Xavier",
    lastName: "White",
    city: "Chicago",
    houseNum: 222,
    street: "State St",
    party: "Independent",
    electionDistrict: 12, // Even higher election district
    email: "xavier.white@example.com",
    telephone: "555-1302",
    DOB: new Date("1991-04-05"),
  }),

  // Records with different parties
  createMockVoterRecord({
    VRCNUM: "VR000028",
    firstName: "Yolanda",
    lastName: "Harris",
    city: "Miami",
    houseNum: 333,
    street: "Lincoln Rd",
    party: "Green", // Different party
    electionDistrict: 4,
    email: "yolanda.harris@example.com",
    telephone: "555-1401",
    DOB: new Date("1987-11-28"),
  }),
  createMockVoterRecord({
    VRCNUM: "VR000029",
    firstName: "Zachary",
    lastName: "Harris",
    city: "Miami",
    houseNum: 444,
    street: "Lincoln Rd",
    party: "Libertarian", // Different party
    electionDistrict: 4,
    email: "zachary.harris@example.com",
    telephone: "555-1402",
    DOB: new Date("1990-02-14"),
  }),

  // Final record with unique characteristics
  createMockVoterRecord({
    VRCNUM: "VR000030",
    firstName: "Abigail",
    lastName: "Martin",
    city: "Seattle",
    houseNum: 555,
    street: "University Way",
    party: "Democratic",
    electionDistrict: 5,
    email: "abigail.martin@example.com",
    telephone: "555-1501",
    DOB: new Date("1988-09-21"),
  }),
];

// Hardcoded expected records for each test case to avoid reimplementing search logic
export const EXPECTED_RECORDS = {
  // Single field searches
  johnRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.firstName === "John",
  ), // VR000001, VR000003
  doeRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.lastName === "Doe",
  ), // VR000001, VR000002
  bostonRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.city === "Boston",
  ), // VR000001, VR000002, VR000021, VR000022, VR000023
  houseNum123Records: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.houseNum === 123,
  ), // VR000001, VR000002
  democraticRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.party === "Democratic",
  ), // VR000001, VR000002, VR000007, VR000008, VR000013, VR000014, VR000019, VR000020, VR000024, VR000025, VR000030
  electionDistrict1Records: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.electionDistrict === 1,
  ), // VR000001, VR000002, VR000021, VR000022, VR000023
  dob1985Records: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.DOB?.toISOString().split("T")[0] === "1985-03-15",
  ), // VR000001

  // Multiple field searches
  johnDoeBostonRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.firstName === "John" &&
      record.lastName === "Doe" &&
      record.city === "Boston",
  ), // VR000001
  democraticBostonRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.party === "Democratic" && record.city === "Boston",
  ), // VR000001, VR000002

  // Multiple values with OR conditions
  johnJaneRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.firstName === "John" || record.firstName === "Jane",
  ), // VR000001, VR000002, VR000003
  bostonNewYorkRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.city === "Boston" || record.city === "New York",
  ), // VR000001, VR000002, VR000003, VR000004, VR000021, VR000022, VR000023, VR000024, VR000025
  democraticRepublicanRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.party === "Democratic" || record.party === "Republican",
  ), // VR000001, VR000002, VR000003, VR000004, VR000007, VR000008, VR000009, VR000010, VR000013, VR000014, VR000015, VR000016, VR000019, VR000020, VR000021, VR000022, VR000023, VR000024, VR000025, VR000030
  houseNum123456Records: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.houseNum === 123 || record.houseNum === 456,
  ), // VR000001, VR000002, VR000003, VR000004
  electionDistrict12Records: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.electionDistrict === 1 || record.electionDistrict === 2,
  ), // VR000001, VR000002, VR000003, VR000004, VR000021, VR000022, VR000023, VR000024, VR000025

  // Records with email (hasEmail=true)
  recordsWithEmail: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.email !== null && record.email !== "",
  ), // All except VR000021, VR000023

  // Records with phone (hasPhone=true)
  recordsWithPhone: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.telephone !== null && record.telephone !== "",
  ), // All except VR000022, VR000023

  // Mixed field types
  johnJaneBostonRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      (record.firstName === "John" || record.firstName === "Jane") &&
      record.city === "Boston",
  ), // VR000001, VR000002
  johnJaneBostonNewYorkRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      (record.firstName === "John" || record.firstName === "Jane") &&
      (record.city === "Boston" || record.city === "New York"),
  ), // VR000001, VR000002, VR000003
  houseNum123456DemocraticRepublicanRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      (record.houseNum === 123 || record.houseNum === 456) &&
      (record.party === "Democratic" || record.party === "Republican"),
  ), // VR000001, VR000002, VR000003, VR000004
  johnJaneWithEmailRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      (record.firstName === "John" || record.firstName === "Jane") &&
      record.email !== null &&
      record.email !== "",
  ), // VR000001, VR000002

  // Edge cases
  johnJaneBobRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.firstName === "John" ||
      record.firstName === "Jane" ||
      record.firstName === "Bob",
  ), // VR000001, VR000002, VR000003, VR000005
  smithJohnsonWilliamsRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.lastName === "Smith" ||
      record.lastName === "Johnson" ||
      record.lastName === "Williams",
  ), // VR000003, VR000004, VR000005, VR000006, VR000007, VR000008
  newYorkBostonChicagoRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.city === "New York" ||
      record.city === "Boston" ||
      record.city === "Chicago",
  ), // VR000001, VR000002, VR000003, VR000004, VR000005, VR000006, VR000021, VR000022, VR000023, VR000024, VR000025, VR000026, VR000027
  houseNum123456789Records: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.houseNum === 123 ||
      record.houseNum === 456 ||
      record.houseNum === 789,
  ), // VR000001, VR000002, VR000003, VR000004, VR000005, VR000006
  electionDistrict123Records: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.electionDistrict === 1 ||
      record.electionDistrict === 2 ||
      record.electionDistrict === 3,
  ), // VR000001, VR000002, VR000003, VR000004, VR000005, VR000006, VR000021, VR000022, VR000023, VR000024, VR000025, VR000026, VR000027
  democraticRepublicanIndependentRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.party === "Democratic" ||
      record.party === "Republican" ||
      record.party === "Independent",
  ), // All except VR000028, VR000029
  dobMultipleRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.DOB?.toISOString().split("T")[0] === "1985-03-15" ||
      record.DOB?.toISOString().split("T")[0] === "1987-07-22" ||
      record.DOB?.toISOString().split("T")[0] === "1990-01-10",
  ), // VR000001, VR000002, VR000003

  // Empty values filtered out
  johnJaneFilteredRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) => record.firstName === "John" || record.firstName === "Jane",
  ), // VR000001, VR000002, VR000003

  // Case insensitive
  johnJaneBobCaseInsensitiveRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.firstName?.toUpperCase() === "JOHN" ||
      record.firstName?.toUpperCase() === "JANE" ||
      record.firstName?.toUpperCase() === "BOB",
  ), // VR000001, VR000002, VR000003, VR000005

  // Whitespace trimming
  johnJaneBobTrimmedRecords: SHARED_MOCK_VOTER_RECORDS.filter(
    (record) =>
      record.firstName?.trim().toUpperCase() === "JOHN" ||
      record.firstName?.trim().toUpperCase() === "JANE" ||
      record.firstName?.trim().toUpperCase() === "BOB",
  ), // VR000001, VR000002, VR000003, VR000005
};

// Note: Removed filterRecordsBySearchQuery function as it was recreating
// the same logic as buildPrismaWhereClause, which bypasses actual testing.
// Tests should use the real API logic instead of pre-calculating expected results.

// Type-safe Prisma mock call verification
type PrismaFindManyArgs = {
  where: Prisma.VoterRecordWhereInput;
  skip: number;
  take: number;
};

// Search query builders
export const createEmptySearchQuery = (): SearchQueryField[] => {
  return [];
};

// Use shared type guard functions to determine field types from discriminated union

const createNumberField = (
  field: (typeof NUMBER_FIELDS)[number],
  values: Array<number | null>,
): Extract<SearchQueryField, { field: (typeof NUMBER_FIELDS)[number] }> => ({
  field,
  values,
});

const createComputedBooleanField = (
  field: (typeof COMPUTED_BOOLEAN_FIELDS)[number],
  value: true | null,
): Extract<
  SearchQueryField,
  { field: (typeof COMPUTED_BOOLEAN_FIELDS)[number] }
> => ({
  field,
  value,
});

const createDateField = (
  field: (typeof DATE_FIELDS)[number],
  values: Array<string | null>,
): Extract<SearchQueryField, { field: (typeof DATE_FIELDS)[number] }> => ({
  field,
  values,
});

const createStringField = (
  field: (typeof STRING_FIELDS)[number],
  values: Array<string | null>,
): Extract<SearchQueryField, { field: (typeof STRING_FIELDS)[number] }> => ({
  field,
  values,
});

export const createSearchQuery = (
  fields: Array<{
    field: keyof typeof searchableFieldEnum.enum;
    value: string | number | true | null | Array<string | number | null>;
  }>,
): SearchQueryField[] => {
  return fields.map(({ field, value }) => {
    const fieldEnum = searchableFieldEnum.enum[field];

    // Use type guards to determine field type and create appropriate structure
    if (isNumberFieldName(field)) {
      const values = Array.isArray(value) ? value : [value];
      if (values.some((entry) => entry !== null && typeof entry !== "number")) {
        throw new Error(`Expected number or null for field ${field}`);
      }
      return createNumberField(
        fieldEnum as (typeof NUMBER_FIELDS)[number],
        values as Array<number | null>,
      );
    } else if (isComputedBooleanFieldName(field)) {
      // Type-safe: we know field is a computed boolean field and value should be boolean | null
      if (typeof value !== "boolean" && value !== null) {
        throw new Error(
          `Expected boolean or null for field ${field}, got ${typeof value}`,
        );
      }
      return createComputedBooleanField(
        fieldEnum as (typeof COMPUTED_BOOLEAN_FIELDS)[number],
        value,
      );
    } else if (isDateFieldName(field)) {
      const values = Array.isArray(value) ? value : [value];
      if (values.some((entry) => entry !== null && typeof entry !== "string")) {
        throw new Error(`Expected ISO date string or null for field ${field}`);
      }
      return createDateField(
        fieldEnum as (typeof DATE_FIELDS)[number],
        values as Array<string | null>,
      );
    } else if (isStringFieldName(field)) {
      const values = Array.isArray(value) ? value : [value];
      if (values.some((entry) => entry !== null && typeof entry !== "string")) {
        throw new Error(`Expected string or null for field ${field}`);
      }
      return createStringField(
        fieldEnum as (typeof STRING_FIELDS)[number],
        values as Array<string | null>,
      );
    } else {
      throw new Error(`Unknown field type: ${String(field)}`);
    }
  });
};

// Type-safe request data builders

export const createValidRequestData = (
  searchQuery: SearchQueryField[],
  pageSize: number,
  page: number,
): FetchFilteredDataRequest => {
  const result = fetchFilteredDataSchema.safeParse({
    searchQuery,
    pageSize,
    page,
  });

  if (!result.success) {
    throw new Error(`Invalid request data: ${result.error.message}`);
  }

  return result.data;
};

// Invalid request data types and builders
type InvalidSearchQueryField = {
  field: string;
  values: unknown;
};

type InvalidRequestData = {
  searchQuery?: unknown;
  pageSize?: unknown;
  page?: unknown;
};

export const createInvalidSearchQueryField = (
  field: string,
  values: unknown,
): InvalidSearchQueryField => {
  return { field, values };
};

export const createInvalidRequestData = (
  searchQuery: unknown,
  pageSize: unknown,
  page: unknown,
): InvalidRequestData => {
  return {
    searchQuery,
    pageSize,
    page,
  };
};

// Type alias for the Prisma mock
type PrismaMock = DeepMockProxy<PrismaClient>;

// Database mock setup helpers
export const setupDatabaseMocks = (
  records: ReturnType<typeof createMockVoterRecord>[],
  totalRecords: number,
  prismaMock: PrismaMock,
) => {
  prismaMock.voterRecord.findMany.mockResolvedValue(records);
  prismaMock.voterRecord.count.mockResolvedValue(totalRecords);
};

// Prisma call verification helpers
export const expectFindManyCalledWithSubset = (
  subset: Partial<PrismaFindManyArgs>,
  callIndex = 0,
  prismaMock: PrismaMock,
): void => {
  const call = prismaMock.voterRecord.findMany.mock.calls[callIndex]?.[0];
  expect(call).toMatchObject(subset);
};

// Test case interfaces for type safety
export interface PaginationTestCase {
  description: string;
  pageSize: number;
  page: number;
  expectedSkip: number;
  totalRecords: number;
}

export interface SearchQueryTestCase {
  description: string;
  searchQuery: SearchQueryField[];
  expectedWhere: Prisma.VoterRecordWhereInput;
  mockRecords: ReturnType<typeof createMockVoterRecord>[];
  expectedTotal: number;
  expectAndConditions?: boolean;
}

export interface FetchFilteredDataValidationTestCase {
  description: string;
  requestData: InvalidRequestData;
}

export interface DatabaseErrorTestCase {
  description: string;
  mockSetup: (prismaMock: PrismaMock) => void;
  expectedCalls: { findMany: boolean; count: boolean };
}

export interface DateConversionTestCase {
  description: string;
  mockData: {
    DOB: Date | null;
    lastUpdate: Date | null;
    originalRegDate: Date | null;
  };
  expectedData: {
    DOB: string | null;
    lastUpdate: string | null;
    originalRegDate: string | null;
  };
}

// Helper function to get records for pagination testing
export const getRecordsForPagination = (
  pageSize: number,
  page: number,
): ReturnType<typeof createMockVoterRecord>[] => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return SHARED_MOCK_VOTER_RECORDS.slice(startIndex, endIndex);
};

// Helper function to create test cases with shared dataset
// Note: This no longer pre-calculates matching records to avoid bypassing
// the actual API logic. Tests should set up appropriate database mocks
// and let the API determine what gets returned.
export const createSearchTestCase = (
  description: string,
  searchQuery: SearchQueryField[],
  expectedWhere: Prisma.VoterRecordWhereInput,
  expectAndConditions = false,
): SearchQueryTestCase => {
  return {
    description,
    searchQuery,
    expectedWhere,
    mockRecords: [], // Will be set up by individual tests
    expectedTotal: 0, // Will be set up by individual tests
    expectAndConditions,
  };
};

// Helper function to create test cases that should return no results
export const createMissTestCase = (
  description: string,
  searchQuery: SearchQueryField[],
  expectedWhere: Prisma.VoterRecordWhereInput,
): SearchQueryTestCase => {
  return {
    description,
    searchQuery,
    expectedWhere,
    mockRecords: [],
    expectedTotal: 0,
  };
};

// Generic test runner helpers
export const runPaginationTest = async (
  testCase: PaginationTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthenticatedTest: () => void,
  prismaMock: PrismaMock,
) => {
  // Arrange
  const mockVoterRecords = getRecordsForPagination(
    testCase.pageSize,
    testCase.page,
  );

  setupAuthenticatedTest();
  setupDatabaseMocks(mockVoterRecords, testCase.totalRecords, prismaMock);

  const requestData = createValidRequestData(
    createEmptySearchQuery(),
    testCase.pageSize,
    testCase.page,
  );

  const request = createMockRequest(requestData);

  // Act
  const response = await POST(request);

  // Assert
  await expectSuccessResponse(response, {
    data: mockVoterRecords.map(convertPrismaVoterRecordToAPI),
    totalRecords: testCase.totalRecords,
  });

  // Verify pagination calculation
  expectFindManyCalledWithSubset(
    {
      skip: testCase.expectedSkip,
      take: testCase.pageSize,
    },
    0,
    prismaMock,
  );
};

export const runSearchQueryTest = async (
  testCase: SearchQueryTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthenticatedTest: () => void,
  prismaMock: PrismaMock,
  mockRecords?: ReturnType<typeof createMockVoterRecord>[],
  expectedTotal?: number,
) => {
  // Arrange
  setupAuthenticatedTest();

  // Use provided mock data or default to empty arrays
  const records = mockRecords ?? testCase.mockRecords;
  const total = expectedTotal ?? testCase.expectedTotal;

  setupDatabaseMocks(records, total, prismaMock);

  const requestData = createValidRequestData(testCase.searchQuery, 10, 1);
  const request = createMockRequest(requestData);

  // Act
  const response = await POST(request);

  // Assert
  await expectSuccessResponse(response, {
    data: records.map(convertPrismaVoterRecordToAPI),
    totalRecords: total,
  });

  // Verify where clause
  const expectedWhereTyped: Prisma.VoterRecordWhereInput =
    testCase.expectedWhere;
  expectFindManyCalledWithSubset(
    {
      where: expectedWhereTyped,
      skip: 0,
      take: 10,
    },
    0,
    prismaMock,
  );

  if (testCase.expectAndConditions) {
    const query = prismaMock.voterRecord.findMany.mock.calls[0];
    const queryArgs = query?.[0] as { where?: { AND?: unknown } };
    expect(queryArgs?.where).toHaveProperty("AND");
    expect(Array.isArray(queryArgs?.where?.AND)).toBe(true);

    const andArray = Array.isArray(queryArgs?.where?.AND)
      ? (queryArgs.where.AND as Prisma.VoterRecordWhereInput[])
      : [];
    expect(andArray.length).toBeGreaterThan(0);

    // Check if any of the expected conditions are present
    const hasEmailCondition = andArray.some(
      (condition) =>
        condition.AND &&
        Array.isArray(condition.AND) &&
        condition.AND.some(
          (subCondition: Record<string, unknown>) =>
            subCondition.email &&
            typeof subCondition.email === "object" &&
            subCondition.email !== null &&
            "not" in subCondition.email,
        ),
    );

    const hasPhoneCondition = andArray.some(
      (condition) =>
        condition.AND &&
        Array.isArray(condition.AND) &&
        condition.AND.some(
          (subCondition: Record<string, unknown>) =>
            subCondition.telephone &&
            typeof subCondition.telephone === "object" &&
            subCondition.telephone !== null &&
            "not" in subCondition.telephone,
        ),
    );

    // At least one type of condition should be present
    expect(hasEmailCondition || hasPhoneCondition).toBe(true);
  }
};

export const runValidationTest = async (
  testCase: FetchFilteredDataValidationTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthMocks: () => void,
  prismaMock: PrismaMock,
) => {
  // Arrange
  setupAuthMocks();
  const request = createMockRequest(testCase.requestData);

  // Act
  const response = await POST(request);

  // Assert
  await expectErrorResponse(response, 422, "Invalid request data");
  expect(prismaMock.voterRecord.findMany).not.toHaveBeenCalled();
};

export const runDatabaseErrorTest = async (
  testCase: DatabaseErrorTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthenticatedTest: () => void,
  prismaMock: PrismaMock,
) => {
  // Arrange
  setupAuthenticatedTest();
  testCase.mockSetup(prismaMock);

  const requestData = createValidRequestData(
    [
      {
        field: searchableFieldEnum.enum.firstName,
        values: ["John"],
      },
    ],
    10,
    1,
  );

  const request = createMockRequest(requestData);

  // Act
  const response = await POST(request);

  // Assert
  await expectErrorResponse(response, 500, "Internal Server Error");
  expect(prismaMock.voterRecord.findMany).toHaveBeenCalledTimes(
    testCase.expectedCalls.findMany ? 1 : 0,
  );
  expect(prismaMock.voterRecord.count).toHaveBeenCalledTimes(
    testCase.expectedCalls.count ? 1 : 0,
  );
};

export const runDateConversionTest = async (
  testCase: DateConversionTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthenticatedTest: () => void,
  prismaMock: PrismaMock,
) => {
  // Arrange
  const mockRecord = createMockVoterRecord(testCase.mockData);
  setupAuthenticatedTest();
  setupDatabaseMocks([mockRecord], 1, prismaMock);

  const requestData = createValidRequestData(createEmptySearchQuery(), 10, 1);

  const request = createMockRequest(requestData);

  // Act
  const response = await POST(request);

  // Assert
  const responseData = (await response.json()) as {
    data: Array<{
      DOB: string | null;
      lastUpdate: string | null;
      originalRegDate: string | null;
    }>;
    totalRecords: number;
  };
  expect(responseData.totalRecords).toBe(1);
  expect(responseData.data).toHaveLength(1);

  // Verify date field conversion specifically
  const actualRecord = responseData.data[0]!;
  expect(actualRecord.DOB).toBe(testCase.expectedData.DOB);
  expect(actualRecord.lastUpdate).toBe(testCase.expectedData.lastUpdate);
  expect(actualRecord.originalRegDate).toBe(
    testCase.expectedData.originalRegDate,
  );
};
