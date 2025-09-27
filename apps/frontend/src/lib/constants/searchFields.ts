import type { SearchField } from "~/types/searchFields";
import { EMPTY_FIELD } from "~/lib/searchHelpers";

/**
 * Configuration for available search fields in the voter record search interface.
 * Defines the structure, types, and display properties for each searchable field.
 */
export const SEARCH_FIELDS: SearchField[] = [
  EMPTY_FIELD,
  {
    name: "VRCNUM",
    displayName: "Voter ID",
    compoundType: false,
    type: "String",
    allowMultiple: true,
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
        allowMultiple: true,
      },
      {
        name: "lastName",
        displayName: "Last Name",
        compoundType: false,
        type: "String",
        allowMultiple: true,
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
        allowMultiple: true,
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
        allowMultiple: false,
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
    allowMultiple: true,
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
        allowMultiple: true,
      },
      {
        name: "stateAssmblyDistrict",
        displayName: "State Assembly District",
        compoundType: false,
        type: "Dropdown",
        allowMultiple: true,
      },
      {
        name: "stateSenateDistrict",
        displayName: "State Senate District",
        compoundType: false,
        type: "Dropdown",
        allowMultiple: true,
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
    allowMultiple: true,
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
      {
        name: "hasPhone",
        displayName: "Only records with phone number",
        compoundType: false,
        type: "Boolean",
      },
    ],
  },
];
