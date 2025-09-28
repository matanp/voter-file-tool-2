import { SearchFieldProcessor } from "~/lib/searchFieldProcessor";
import type { BaseSearchField, DateRange } from "~/types/searchFields";
import { DATE_FIELDS } from "@voter-file-tool/shared-validators";

describe("SearchFieldProcessor - DateRange", () => {
  const mockDateField: BaseSearchField = {
    name: "DOBRange" as (typeof DATE_FIELDS)[number],
    displayName: "Date of Birth (Range)",
    compoundType: false,
    type: "DateRange",
  };

  describe("normalizeForStorage", () => {
    it("validates valid DateRange object", () => {
      const validRange: DateRange = {
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        validRange,
        mockDateField,
      );

      expect(result).toEqual(validRange);
    });

    it("validates DateRange with only startDate", () => {
      const rangeWithStartOnly: DateRange = {
        startDate: new Date("2023-01-01"),
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        rangeWithStartOnly,
        mockDateField,
      );

      expect(result).toEqual(rangeWithStartOnly);
    });

    it("validates DateRange with only endDate", () => {
      const rangeWithEndOnly: DateRange = {
        endDate: new Date("2023-12-31"),
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        rangeWithEndOnly,
        mockDateField,
      );

      expect(result).toEqual(rangeWithEndOnly);
    });

    it("handles invalid dates in DateRange", () => {
      const invalidRange = {
        startDate: "invalid-date",
        endDate: new Date("2023-12-31"),
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        invalidRange,
        mockDateField,
      );

      expect(result).toEqual({
        endDate: new Date("2023-12-31"),
      });
    });

    it("returns undefined for completely invalid DateRange", () => {
      const invalidRange = {
        startDate: "invalid-date",
        endDate: "invalid-date",
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        invalidRange,
        mockDateField,
      );

      expect(result).toBeUndefined();
    });

    it("returns undefined for null/undefined values", () => {
      expect(
        SearchFieldProcessor.normalizeForStorage(null, mockDateField),
      ).toBeUndefined();
      expect(
        SearchFieldProcessor.normalizeForStorage(undefined, mockDateField),
      ).toBeUndefined();
    });
  });

  describe("convertToQueryField", () => {
    it("converts DateRange to query field with range", () => {
      const field: BaseSearchField = {
        ...mockDateField,
        value: {
          startDate: new Date("2023-01-01"),
          endDate: new Date("2023-12-31"),
        },
      };

      const result = SearchFieldProcessor.convertToQueryField(field);

      expect(result).toEqual({
        field: "DOB",
        range: {
          startDate: "2023-01-01T00:00:00.000Z",
          endDate: "2023-12-31T00:00:00.000Z",
        },
      });
    });

    it("converts DateRange with only startDate", () => {
      const field: BaseSearchField = {
        ...mockDateField,
        value: {
          startDate: new Date("2023-01-01"),
        },
      };

      const result = SearchFieldProcessor.convertToQueryField(field);

      expect(result).toEqual({
        field: "DOB",
        range: {
          startDate: "2023-01-01T00:00:00.000Z",
          endDate: null,
        },
      });
    });

    it("converts DateRange with only endDate", () => {
      const field: BaseSearchField = {
        ...mockDateField,
        value: {
          endDate: new Date("2023-12-31"),
        },
      };

      const result = SearchFieldProcessor.convertToQueryField(field);

      expect(result).toEqual({
        field: "DOB",
        range: {
          startDate: null,
          endDate: "2023-12-31T00:00:00.000Z",
        },
      });
    });

    it("returns null for empty DateRange", () => {
      const field: BaseSearchField = {
        ...mockDateField,
        value: {},
      };

      const result = SearchFieldProcessor.convertToQueryField(field);

      expect(result).toBeNull();
    });

    it("returns null for undefined value", () => {
      const field: BaseSearchField = {
        ...mockDateField,
        value: undefined,
      };

      const result = SearchFieldProcessor.convertToQueryField(field);

      expect(result).toBeNull();
    });
  });
});
