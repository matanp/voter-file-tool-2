import React from "react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { SearchQueryField } from "@voter-file-tool/shared-validators";
import { formatElectionDateForDisplay } from "~/lib/electionDateUtils";
import { isDateSearchField } from "@voter-file-tool/shared-validators";

interface SearchQueryDisplayProps {
  searchQuery: SearchQueryField[];
  totalRecords: number;
  maxRecordsForExport: number;
  adminContactInfo: string;
  onClearSearch: () => void;
}

/**
 * Displays the current search query with proper formatting for multiple values
 * and clear indication of OR logic between values.
 */
export const SearchQueryDisplay: React.FC<SearchQueryDisplayProps> = ({
  searchQuery,
  totalRecords,
  maxRecordsForExport,
  adminContactInfo,
  onClearSearch,
}) => {
  // Filter out empty fields
  const nonEmptyFields = searchQuery.filter((field) => {
    if ("values" in field) {
      return field.values.some(
        (value) =>
          value !== null && value !== undefined && String(value).trim() !== "",
      );
    } else if ("value" in field) {
      return field.value !== null && field.value !== undefined;
    }
    return false;
  });

  if (nonEmptyFields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="primary-header">No Search Query</h3>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please go to the Record Search page to search for voter records
            first, then return here to export them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="primary-header">Current Search Query</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {nonEmptyFields.map((field, index) => (
            <SearchFieldDisplay key={index} field={field} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {totalRecords > 0 && (
              <div>
                <span>
                  Found {totalRecords.toLocaleString()} records
                  {totalRecords > maxRecordsForExport && (
                    <span className="text-destructive ml-1">
                      (exceeds export limit of{" "}
                      {maxRecordsForExport.toLocaleString()})
                    </span>
                  )}
                </span>
                {totalRecords > maxRecordsForExport && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800 font-medium">
                      Large Export Request
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {adminContactInfo}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClearSearch}>
            Clear Search
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface SearchFieldDisplayProps {
  field: SearchQueryField;
}

/**
 * Renders a single search field with proper handling of multiple values
 * and explicit OR logic indication.
 */
const SearchFieldDisplay: React.FC<SearchFieldDisplayProps> = ({ field }) => {
  const fieldDisplayName = getFieldDisplayName(field.field);

  return (
    <div className="flex items-start space-x-2 text-sm">
      <span className="font-medium text-foreground min-w-0 flex-shrink-0 pt-0.5">
        {fieldDisplayName}:
      </span>
      <div className="flex-1 min-w-0 pt-1">
        <FieldValueDisplay field={field} />
      </div>
    </div>
  );
};

/**
 * Gets the display name for a field
 */
function getFieldDisplayName(fieldName: string): string {
  const displayNames: Record<string, string> = {
    VRCNUM: "Voter ID",
    firstName: "First Name",
    lastName: "Last Name",
    houseNum: "House Number",
    street: "Street",
    city: "City",
    zipCode: "Zip Code",
    DOB: "Date of Birth",
    district: "District",
    party: "Party",
    // Add more as needed
  };

  return displayNames[fieldName] ?? fieldName;
}

interface FieldValueDisplayProps {
  field: SearchQueryField;
}

/**
 * Renders the value(s) of a field with explicit OR logic for multiple values.
 */
const FieldValueDisplay: React.FC<FieldValueDisplayProps> = ({ field }) => {
  // Handle fields with values array
  if ("values" in field) {
    const nonEmptyValues = field.values.filter(
      (value) =>
        value !== null && value !== undefined && String(value).trim() !== "",
    );

    if (nonEmptyValues.length === 0) {
      return null;
    }

    // Handle array values
    if (nonEmptyValues.length > 1) {
      return (
        <div className="">
          <div className="text-xs text-muted-foreground font-medium">
            (Any of the following):
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {nonEmptyValues.map((value, index) => (
              <span
                key={index}
                className="text-foreground bg-muted px-2 py-1 rounded text-sm"
              >
                {formatValue(value, field)}
              </span>
            ))}
          </div>
        </div>
      );
    }

    // Single value
    return (
      <span className="text-muted-foreground">
        {formatValue(nonEmptyValues[0], field)}
      </span>
    );
  }

  // Handle fields with single value
  if ("value" in field) {
    if (field.value === null || field.value === undefined) {
      return null;
    }

    return (
      <span className="text-muted-foreground">
        {formatValue(field.value, field)}
      </span>
    );
  }

  return null;
};

/**
 * Formats a value for display, handling dates appropriately
 */
function formatValue(value: unknown, field: SearchQueryField): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Handle date fields
  if (isDateSearchField(field)) {
    try {
      return formatElectionDateForDisplay(String(value));
    } catch {
      return String(value);
    }
  }

  return String(value);
}
