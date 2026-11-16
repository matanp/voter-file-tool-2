import { mergeQuickNameIntoRows } from "~/lib/quickNameSearch";
import type { SearchField } from "~/types/searchFields";

const nameRow = (firstName?: string[], lastName?: string[]): SearchField => ({
  name: "name",
  displayName: "Name",
  compoundType: true,
  id: "name-row",
  fields: [
    ...(firstName
      ? [
          {
            name: "firstName" as const,
            displayName: "First Name",
            compoundType: false as const,
            type: "String" as const,
            allowMultiple: true,
            value: firstName,
          },
        ]
      : []),
    ...(lastName
      ? [
          {
            name: "lastName" as const,
            displayName: "Last Name",
            compoundType: false as const,
            type: "String" as const,
            allowMultiple: true,
            value: lastName,
          },
        ]
      : []),
  ],
});

const zipRow: SearchField = {
  name: "zipCode",
  displayName: "Zip Code",
  compoundType: false,
  type: "Number",
  value: 14580,
};

const valuesOf = (rows: SearchField[], sub: string) => {
  const row = rows.find((r) => r.compoundType && r.name === "name");
  if (!row?.compoundType) return undefined;
  return row.fields.find((f) => f.name === sub)?.value;
};

describe("mergeQuickNameIntoRows", () => {
  it("returns the rows unchanged when the name box is blank", () => {
    const rows = [zipRow];
    expect(mergeQuickNameIntoRows(rows, { firstName: " ", lastName: "" })).toBe(
      rows,
    );
  });

  it("adds a Name row first when the builder has none, keeping the other criteria", () => {
    const rows = mergeQuickNameIntoRows([zipRow], {
      firstName: " John ",
      lastName: "Smith",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe("name");
    expect(rows[1]).toBe(zipRow);
    expect(valuesOf(rows, "firstName")).toEqual(["John"]);
    expect(valuesOf(rows, "lastName")).toEqual(["Smith"]);
  });

  it("leaves out a sub-field the name box left blank", () => {
    const rows = mergeQuickNameIntoRows([], {
      firstName: "",
      lastName: "Smith",
    });
    expect(valuesOf(rows, "firstName")).toBeUndefined();
    expect(valuesOf(rows, "lastName")).toEqual(["Smith"]);
  });

  it("joins the builder's Name row instead of adding a second one", () => {
    const rows = mergeQuickNameIntoRows([nameRow(["Jane"]), zipRow], {
      firstName: "John",
      lastName: "Smith",
    });
    expect(rows.filter((r) => r.name === "name")).toHaveLength(1);
    expect(rows[0]?.id).toBe("name-row");
    expect(valuesOf(rows, "firstName")).toEqual(["Jane", "John"]);
    expect(valuesOf(rows, "lastName")).toEqual(["Smith"]);
  });

  it("doesn't repeat a name the builder already has, ignoring case", () => {
    const rows = mergeQuickNameIntoRows([nameRow(["JOHN"], ["Smith"])], {
      firstName: "john",
      lastName: "",
    });
    expect(valuesOf(rows, "firstName")).toEqual(["JOHN"]);
    expect(valuesOf(rows, "lastName")).toEqual(["Smith"]);
  });
});
