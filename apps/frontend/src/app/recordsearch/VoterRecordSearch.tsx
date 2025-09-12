"use client";
import type { DropdownLists } from "@prisma/client";
import { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { DatePicker } from "~/components/ui/datePicker";
import { isDropdownItem } from "../api/lib/utils";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { StreetSearch } from "./StreetSearch";
import { CityTownSearch } from "./CityTownSearch";

interface VoterRecordSearchProps {
  handleSubmit: (searchQuery: SearchField[]) => Promise<void>;
  dropdownList: DropdownLists;
}

export interface BaseSearchField {
  name: string;
  displayName: string;
  compoundType: false;
  type: string;
  value?: string | Date | number | boolean;
}

export type SearchField =
  | BaseSearchField
  | {
      name: string;
      displayName: string;
      compoundType: true;
      fields: BaseSearchField[];
    };

const SEARCH_FIELDS: SearchField[] = [
  {
    name: "empty",
    displayName: "Select a field",
    value: "",
    compoundType: false,
    type: "String",
  },
  {
    name: "VRCNUM",
    displayName: "Voter ID",
    compoundType: false,
    type: "String",
  },
  {
    name: "name",
    displayName: "Name",
    compoundType: true,
    fields: [
      {
        name: "firstName",
        displayName: "First Name",
        compoundType: false,
        type: "String",
      },
      {
        name: "lastName",
        displayName: "Last Name",
        compoundType: false,
        type: "String",
      },
    ],
  },
  {
    name: "address",
    displayName: "Address",
    compoundType: true,
    fields: [
      {
        name: "houseNum",
        displayName: "House Number",
        compoundType: false,
        type: "number",
      },
      {
        name: "street",
        displayName: "Street",
        compoundType: false,
        type: "Street",
      },
    ],
  },
  {
    name: "cityTown",
    displayName: "City / Town",
    compoundType: true,
    fields: [
      {
        name: "city",
        displayName: "City",
        compoundType: false,
        type: "CityTown",
      },
      {
        name: "CC_WD_Village",
        displayName: "CC WD Village",
        compoundType: false,
        type: "Hidden",
      },
    ],
  },

  // { name: "state", displayName: "State", compoundType: false, type: "String" },
  {
    name: "zipCode",
    displayName: "Zip Code",
    compoundType: false,
    type: "Dropdown",
  },
  {
    name: "DOB",
    displayName: "Date of Birth",
    compoundType: false,
    type: "DateTime",
  },
  {
    name: "district",
    displayName: "District",
    compoundType: true,
    fields: [
      {
        name: "countyLegDistrict",
        displayName: "County Leg District",
        compoundType: false,
        type: "Dropdown",
      },
      {
        name: "stateAssmblyDistrict",
        displayName: "State Assembly District",
        compoundType: false,
        type: "Dropdown",
      },
      {
        name: "stateSenateDistrict",
        displayName: "State Senate District",
        compoundType: false,
        type: "Dropdown",
      },
      // {
      //   name: "congressionalDistrict",
      //   displayName: "Congressional District",
      //   compoundType: false,
      //   type: "String",
      // },
      // {
      //   name: "CC_WD_Village",
      //   displayName: "CC WD Village",
      //   compoundType: false,
      //   type: "String",
      // },
      // {
      //   name: "townCode",
      //   displayName: "Town Code",
      //   compoundType: false,
      //   type: "Dropdown",
      // },
      {
        name: "electionDistrict",
        displayName: "Election District",
        compoundType: false,
        type: "number",
      },
      // {
      //   name: "statevid",
      //   displayName: "Statevid",
      //   compoundType: false,
      //   type: "String",
      // },
    ],
  },
  {
    name: "party",
    displayName: "Party",
    compoundType: false,
    type: "Dropdown",
  },
  {
    name: "additionalCriteria",
    displayName: "Additional Criteria",
    compoundType: true,
    fields: [
      {
        name: "hasEmail",
        displayName: "Only records with an email",
        compoundType: false,
        type: "Boolean",
      },
      {
        name: "hasInvalidEmail",
        displayName: "Only records with an invalid email",
        compoundType: false,
        type: "Boolean",
      },
    ],
  },
];

const VoterRecordSearch: React.FC<VoterRecordSearchProps> = (props) => {
  const [searchRows, setSearchRows] = useState<SearchField[]>([
    {
      name: "name",
      displayName: "Name",
      compoundType: true,
      fields: [
        {
          name: "firstName",
          displayName: "First Name",
          compoundType: false,
          type: "String",
        },
        {
          name: "lastName",
          displayName: "Last Name",
          compoundType: false,
          type: "String",
        },
      ],
    },
    {
      name: "address",
      displayName: "Address",
      compoundType: true,
      fields: [
        {
          name: "houseNum",
          displayName: "House Number",
          compoundType: false,
          type: "number",
        },
        {
          name: "street",
          displayName: "Street",
          compoundType: false,
          type: "Street",
        },
      ],
    },
  ]);

  const handleChangeField = (index: number, field: string) => {
    const updatedRows = [...searchRows];
    let updatedRow: SearchField | undefined = updatedRows[index];
    if (updatedRow) {
      updatedRow = SEARCH_FIELDS.find(
        (searchField) => searchField.name === field,
      );
      if (updatedRow) {
        updatedRows[index] = updatedRow;
      }
    }

    setSearchRows(updatedRows);
  };

  const handleRemoveRow = (index: number) => {
    if (searchRows.length === 1) {
      setSearchRows([
        {
          name: "empty",
          displayName: "Select a field",
          value: "",
          compoundType: false,
          type: "String",
        },
      ]);
      return;
    }

    const updatedRows = [...searchRows];
    updatedRows.splice(index, 1);
    setSearchRows(updatedRows);
  };

  const handleChangeValue = useCallback(
    (index: number, value: string | Date | boolean, compoundIndex?: number) => {
      const updatedRows = [...searchRows];
      const updatedRow = updatedRows[index];

      if (updatedRow && !updatedRow.compoundType) {
        if (updatedRow.value === value) return;
        if (updatedRow.type === "number") {
          updatedRow.value = Number(value);
        } else if (updatedRow.type === "Boolean") {
          updatedRow.value =
            typeof value === "boolean" ? value : Boolean(value);
        } else {
          updatedRow.value = value;
        }
        updatedRows[index] = updatedRow;
      } else if (updatedRow?.compoundType && compoundIndex !== undefined) {
        const updatedField = updatedRow.fields[compoundIndex];

        if (updatedField && updatedField.value !== value) {
          if (updatedField.type === "number") {
            updatedField.value = Number(value);
          } else if (updatedField.type === "Boolean") {
            updatedField.value =
              typeof value === "boolean" ? value : Boolean(value);
          } else {
            updatedField.value = value;
          }
          updatedRow.fields[compoundIndex] = updatedField;
          updatedRows[index] = updatedRow;
        }
      }

      setSearchRows(updatedRows);
    },
    [searchRows],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const filteredRows = searchRows
      .map((row) => {
        if (row.compoundType) {
          return {
            ...row,
            fields: row.fields.filter((field) => field.value),
          };
        }
        return row;
      })
      .filter((row) => row.compoundType || row.value);
    props.handleSubmit(filteredRows).catch((error) => {
      console.error("Error submitting search:", error);
    });
  };

  return (
    <div className="flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-max flex flex-col items-center gap-4"
      >
        {searchRows.map((row, index) => (
          <div
            key={`outer-key-${index}`}
            className="flex gap-2 shadow-md p-4 bg-background"
          >
            <div className="m-2">
              <div className="flex gap-2">
                <div className="flex flex-row items-center">
                  {/* <select
                  className="form-select h-10 border-2 border-secondary"
                  value={row.name}
                  onChange={(e) => handleChangeField(index, e.target.value)}
                >
                  <optgroup>
                    {SEARCH_FIELDS.filter(
                      (field) =>
                        searchRows.find((row) => row.name === field.name) ===
                          undefined || row.name === field.name,
                    ).map((field, idx) => (
                      <option value={field.name} key={`fiield-${idx}`}>
                        {field.displayName}
                      </option>
                    ))}
                  </optgroup>
                </select> */}
                  <ComboboxDropdown
                    items={SEARCH_FIELDS.filter(
                      (field) =>
                        ((field.compoundType || field.type !== "Hidden") &&
                          searchRows.find((row) => row.name === field.name) ===
                            undefined) ||
                        row.name === field.name,
                    ).map((field) => ({
                      label: field.displayName,
                      value: field.name,
                    }))}
                    initialValue={row.name}
                    displayLabel={row.displayName}
                    onSelect={(value) => {
                      handleChangeField(index, value);
                    }}
                  />
                </div>
                <div className="col-sm-4">
                  {!row.compoundType && row.name !== "empty" && (
                    <>
                      {row.type === "Dropdown" && isDropdownItem(row.name) && (
                        <ComboboxDropdown
                          items={props.dropdownList[row.name].map(
                            (item: string) => ({
                              label: item,
                              value: item,
                            }),
                          )}
                          displayLabel={`Select ${row.displayName}`}
                          onSelect={(value) => {
                            handleChangeValue(index, value);
                          }}
                        />
                      )}
                      {row.type === "DateTime" && (
                        <DatePicker
                          onChange={(date) => handleChangeValue(index, date)}
                        />
                      )}
                      {row.type === "Street" && (
                        <StreetSearch
                          streets={props.dropdownList.street}
                          onChange={(value) => {
                            handleChangeValue(index, value);
                          }}
                        />
                      )}
                      {(row.type === "String" || row.type === "number") && (
                        // <input
                        //   type={row.type}
                        //   className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
                        //   placeholder={`Enter ${row.displayName}`}
                        //   onChange={(e) =>
                        //     handleChangeValue(index, e.target.value)
                        //   }
                        // />
                        <Input
                          type={row.type}
                          placeholder={`Enter ${row.displayName}`}
                          onChange={(e) =>
                            handleChangeValue(index, e.target.value)
                          }
                        />
                      )}
                    </>
                  )}
                  {row.compoundType &&
                    row.fields.map((field, subIdx) => {
                      if (field.type === "Hidden") return null;

                      return (
                        <div
                          key={`sub-index-${index}-${subIdx}`}
                          className="flex flex-col"
                        >
                          {field.name !== "city" &&
                            field.type !== "Boolean" &&
                            field.displayName.length < 15 && (
                              <label className="font-extralight text-sm pl-1 pt-2">
                                {field.displayName}
                              </label>
                            )}
                          {field.type === "Dropdown" &&
                            isDropdownItem(field.name) && (
                              <ComboboxDropdown
                                items={props.dropdownList[field.name].map(
                                  (item: string) => ({
                                    label: item,
                                    value: item,
                                  }),
                                )}
                                displayLabel={
                                  field.displayName.length < 10
                                    ? `Select ${field.displayName}`
                                    : field.displayName
                                }
                                onSelect={(value) => {
                                  handleChangeValue(index, value, subIdx);
                                }}
                              />
                            )}
                          {field.type === "DateTime" && (
                            <DatePicker
                              onChange={(date) =>
                                handleChangeValue(index, date, subIdx)
                              }
                            />
                          )}
                          {field.type === "CityTown" && (
                            <CityTownSearch
                              cities={props.dropdownList.city}
                              onChange={(city, town) => {
                                handleChangeValue(index, city, subIdx);
                                handleChangeValue(index, town, subIdx + 1);
                              }}
                            />
                          )}
                          {field.type === "Street" && (
                            <StreetSearch
                              streets={props.dropdownList.street}
                              onChange={(value) => {
                                handleChangeValue(index, value, subIdx);
                              }}
                            />
                          )}
                          {field.type === "Boolean" && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${field.name}-${index}-${subIdx}`}
                                checked={field.value === true}
                                onCheckedChange={(checked) =>
                                  handleChangeValue(
                                    index,
                                    checked === true,
                                    subIdx,
                                  )
                                }
                              />
                              <label
                                htmlFor={`${field.name}-${index}-${subIdx}`}
                                className="text-sm font-medium text-gray-700 cursor-pointer"
                              >
                                {field.displayName}
                              </label>
                            </div>
                          )}
                          {(field.type === "String" ||
                            field.type === "number") && (
                            <Input
                              type={field.type}
                              placeholder={`Enter ${field.displayName}`}
                              onChange={(e) =>
                                handleChangeValue(index, e.target.value, subIdx)
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
            {(searchRows.length > 1 || searchRows[0]?.name !== "empty") && (
              <div className="col-sm-2 flex flex-row items-center">
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveRow(index);
                  }}
                  title="Remove Search Criteria"
                >
                  X
                </Button>
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 pb-8">
          <Button
            type="button"
            onClick={() =>
              setSearchRows([
                ...searchRows,
                {
                  name: "empty",
                  displayName: "Select a field",
                  value: "",
                  compoundType: false,
                  type: "String",
                },
              ])
            }
          >
            Add Search Criteria
          </Button>

          <div className="py-2">
            <Button
              type="submit"
              className="hover:bg-primary-700 w-full rounded-md border border-transparent bg-primary px-4 py-2 text-primary-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Submit
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default VoterRecordSearch;
