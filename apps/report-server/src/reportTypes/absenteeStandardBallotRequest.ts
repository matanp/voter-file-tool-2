// src/reportTypes/absenteeStandardBallotRequest.ts
// Purpose: Define a strict type for the Absentee Standard Ballot Request CSV rows and expose headers for parsing/validation.

export const ABSENTEE_STANDARD_BALLOT_REQUEST_HEADERS = [
  'Voter Id',
  'Last Name',
  'First Name',
  'Middle Name',
  'Suffix',
  'Party',
  'Voter T/W/D',
  'Ballot Request Type',
  'Application Received Date',
  'Application Date',
  'Application Start Date',
  'Expiration Date',
  'Application Source',
  'Delivery Method',
  'Accessible Ballot',
  'Absentee Type',
  'Absentee Type Description',
  'Eligibility',
  'Adult Care Facility',
  'Agent Name',
  'Ballot Full Address',
  'Ballot Full Address Block',
  'Ballot Mailing Address 1',
  'Ballot Mailing Address 2',
  'Ballot Mailing Address 3',
  'Ballot Mailing Address 4',
  'Ballot Mailing City',
  'Ballot Mailing State',
  'Ballot Mailing Zip Code',
  'Ballot Mailing Zip Plus4 Code',
  'Residence Address 1',
  'Residence Address 2',
  'Residence City',
  'Residence State',
  'Residence Zip',
  'Ballot Style',
  'Ballot Last Issued Date',
  'Ballot Last Received Date',
  'Last Issued Delivery Method',
  'Last Issued Delivery Status',
  'Last Received Delivery Method',
  'Last Received Delivery Status',
  'FPCA Format',
  'Status',
  'Status Reason',
  'Date of Birth',
  'Gender',
  'Town',
  'Ward',
  'District',
  'Cong',
  'St.Sen',
  'St.Leg',
  'School',
  'Other1',
  'Other2',
  'Other3',
  'Othr4',
  'Voter State Id',
  'Fax',
  'Email',
  'Phone Number',
  'Is Poll Worker',
  'Election Code',
  'Election Description',
] as const;

export type AbsenteeStandardBallotRequestHeader =
  (typeof ABSENTEE_STANDARD_BALLOT_REQUEST_HEADERS)[number];

export type AbsenteeStandardBallotRequestRow = Record<
  AbsenteeStandardBallotRequestHeader,
  string
>;

/**
 * Creates a mapping object initialized with empty strings for each header.
 * Useful for CSV parsing defaults without using `any`.
 */
export const createEmptyAbsenteeStandardBallotRequestRow =
  (): AbsenteeStandardBallotRequestRow => {
    const row = Object.create(null) as Record<
      AbsenteeStandardBallotRequestHeader,
      string
    >;
    for (const header of ABSENTEE_STANDARD_BALLOT_REQUEST_HEADERS) {
      row[header] = '';
    }
    return row as AbsenteeStandardBallotRequestRow;
  };
