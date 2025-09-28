import { SearchFieldProcessor } from "~/lib/searchFieldProcessor";
import type { DateRange } from "~/types/searchFields";

// Test the isValueEqual function indirectly through SearchFieldProcessor
describe("DateRange Value Equality", () => {
  it("should correctly compare DateRange objects", () => {
    const range1: DateRange = {
      startDate: new Date("2023-01-01"),
      endDate: new Date("2023-12-31"),
    };

    const range2: DateRange = {
      startDate: new Date("2023-01-01"),
      endDate: new Date("2023-12-31"),
    };

    const range3: DateRange = {
      startDate: new Date("2023-01-01"),
      endDate: new Date("2023-12-30"), // Different end date
    };

    // Test through SearchFieldProcessor normalization
    const mockField = {
      name: "DOBRange" as const,
      displayName: "Date of Birth (Range)",
      compoundType: false as const,
      type: "DateRange" as const,
    };

    const normalized1 = SearchFieldProcessor.normalizeForStorage(
      range1,
      mockField,
    );
    const normalized2 = SearchFieldProcessor.normalizeForStorage(
      range2,
      mockField,
    );
    const normalized3 = SearchFieldProcessor.normalizeForStorage(
      range3,
      mockField,
    );

    // These should be equal
    expect(normalized1).toEqual(normalized2);

    // These should be different
    expect(normalized1).not.toEqual(normalized3);
  });

  it("should handle partial DateRange objects", () => {
    const range1: DateRange = {
      startDate: new Date("2023-01-01"),
    };

    const range2: DateRange = {
      startDate: new Date("2023-01-01"),
    };

    const range3: DateRange = {
      endDate: new Date("2023-12-31"),
    };

    const mockField = {
      name: "DOBRange" as const,
      displayName: "Date of Birth (Range)",
      compoundType: false as const,
      type: "DateRange" as const,
    };

    const normalized1 = SearchFieldProcessor.normalizeForStorage(
      range1,
      mockField,
    );
    const normalized2 = SearchFieldProcessor.normalizeForStorage(
      range2,
      mockField,
    );
    const normalized3 = SearchFieldProcessor.normalizeForStorage(
      range3,
      mockField,
    );

    // These should be equal
    expect(normalized1).toEqual(normalized2);

    // These should be different
    expect(normalized1).not.toEqual(normalized3);
  });
});
