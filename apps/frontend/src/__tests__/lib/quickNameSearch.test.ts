import {
  mergeQuickNameIntoRows,
  moveQuickNameIntoRows,
  quickNameFromRows,
} from "~/lib/quickNameSearch";
import type { SearchField } from "~/types/searchFields";

const nameSubField = (
  name: "firstName" | "lastName",
  displayName: string,
  value: string[] | undefined,
) =>
  value
    ? [
        {
          name,
          displayName,
          compoundType: false as const,
          type: "String" as const,
          allowMultiple: true,
          value,
        },
      ]
    : [];

const nameRow = (firstName?: string[], lastName?: string[]): SearchField => ({
  name: "name",
  displayName: "Name",
  compoundType: true,
  id: "name-row",
  fields: [
    ...nameSubField("firstName", "First Name", firstName),
    ...nameSubField("lastName", "Last Name", lastName),
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
      firstName: "",
      lastName: "Smith",
    });
    expect(rows.filter((r) => r.name === "name")).toHaveLength(1);
    expect(rows[0]?.id).toBe("name-row");
    expect(valuesOf(rows, "firstName")).toEqual(["Jane"]);
    expect(valuesOf(rows, "lastName")).toEqual(["Smith"]);
    expect(rows[1]).toBe(zipRow);
  });

  it("narrows to the name box's name when the builder has names for the same field", () => {
    const rows = mergeQuickNameIntoRows([nameRow(["Jane", "Joan"], ["Doe"])], {
      firstName: "John",
      lastName: "",
    });
    expect(valuesOf(rows, "firstName")).toEqual(["John"]);
    expect(valuesOf(rows, "lastName")).toEqual(["Doe"]);
  });
});

describe("quickNameFromRows", () => {
  it("is blank with no Name row", () => {
    expect(quickNameFromRows([zipRow])).toEqual({
      firstName: "",
      lastName: "",
    });
  });

  it("fills each field that has exactly one name", () => {
    expect(quickNameFromRows([nameRow(["Jane"], ["Doe"])])).toEqual({
      firstName: "Jane",
      lastName: "Doe",
    });
  });

  it("leaves a field blank when the builder has several names for it", () => {
    expect(quickNameFromRows([nameRow(["Jane", "Joan"], ["Doe"])])).toEqual({
      firstName: "",
      lastName: "Doe",
    });
  });
});

describe("moveQuickNameIntoRows", () => {
  it("returns the rows unchanged with no Name row and a blank box", () => {
    const rows = [zipRow];
    expect(moveQuickNameIntoRows(rows, { firstName: " ", lastName: "" })).toBe(
      rows,
    );
  });

  it("adds a whole Name row first when the builder has none", () => {
    const rows = moveQuickNameIntoRows([zipRow], {
      firstName: "John",
      lastName: "",
    });
    expect(rows.map((r) => r.name)).toEqual(["name", "zipCode"]);
    const row = rows[0];
    expect(row?.compoundType && row.fields.map((f) => f.name)).toEqual([
      "firstName",
      "lastName",
    ]);
    expect(valuesOf(rows, "firstName")).toEqual(["John"]);
    expect(valuesOf(rows, "lastName")).toBeUndefined();
  });

  it("replaces the builder's names with the box's", () => {
    const rows = moveQuickNameIntoRows([nameRow(["Jane", "Joan"], ["Doe"])], {
      firstName: "John",
      lastName: "Smith",
    });
    expect(valuesOf(rows, "firstName")).toEqual(["John"]);
    expect(valuesOf(rows, "lastName")).toEqual(["Smith"]);
  });

  it("clears a single name the box was showing and left blank", () => {
    const rows = moveQuickNameIntoRows([nameRow(["Jane"], ["Doe"])], {
      firstName: "",
      lastName: "Doe",
    });
    expect(valuesOf(rows, "firstName")).toBeUndefined();
    expect(valuesOf(rows, "lastName")).toEqual(["Doe"]);
  });

  it("keeps a list of several names the box couldn't show", () => {
    const rows = moveQuickNameIntoRows([nameRow(["Jane", "Joan"], ["Doe"])], {
      firstName: "",
      lastName: "",
    });
    expect(valuesOf(rows, "firstName")).toEqual(["Jane", "Joan"]);
    expect(valuesOf(rows, "lastName")).toBeUndefined();
  });
});
