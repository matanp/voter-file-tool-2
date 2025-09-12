import { type VoterRecord } from "@prisma/client";
import { Skeleton } from "~/components/ui/skeleton";
import { TableCell } from "~/components/ui/table";

// Define the field configuration that can be shared between table and skeleton
export interface FieldConfig {
  name: string;
  head: string;
  size: string;
  cell: (record: VoterRecord) => React.ReactNode;
  skeletonCell: (index: number) => React.ReactNode;
}

export const fields: FieldConfig[] = [
  // {
  //   name: "VRCNUM",
  //   head: "Voter ID",
  //   size: "w-[15ch]",
  //   cell: (record: VoterRecord) => (
  //     <TableCell key={`${record.VRCNUM}-vrcnum`}>
  //       {record.VRCNUM}
  //     </TableCell>
  //   ),
  //   skeletonCell: (index: number) => (
  //     <TableCell key={`skeleton-vrcnum-${index}`}>
  //       <Skeleton className="h-[1rem] w-[10ch]" />
  //     </TableCell>
  //   ),
  // },
  // {
  //   name: "firstName",
  //   head: "First Name",
  //   size: "w-[20ch]",
  //   cell: (record: VoterRecord) => (
  //     <TableCell key={`${record.VRCNUM}-firstName`}>
  //       {record.firstName}
  //     </TableCell>
  //   ),
  //   skeletonCell: (index: number) => (
  //     <TableCell key={`skeleton-firstName-${index}`}>
  //       <Skeleton className="h-[1rem] w-[12ch]" />
  //     </TableCell>
  //   ),
  // },
  // {
  //   name: "lastName",
  //   head: "Last Name",
  //   size: "w-[20ch]",
  //   cell: (record: VoterRecord) => (
  //     <TableCell key={`${record.VRCNUM}-lastName`}>
  //       {record.lastName}
  //     </TableCell>
  //   ),
  //   skeletonCell: (index: number) => (
  //     <TableCell key={`skeleton-lastName-${index}`}>
  //       <Skeleton className="h-[1rem] w-[12ch]" />
  //     </TableCell>
  //   ),
  // },
  // {
  //   name: "middleInitial",
  //   head: "Middle Initial",
  //   size: "w-[15ch]",
  //   cell: (record: VoterRecord) => (
  //     <TableCell key={`${record.VRCNUM}-middleInitial`}>
  //       {record.middleInitial}
  //     </TableCell>
  //   ),
  //   skeletonCell: (index: number) => (
  //     <TableCell key={`skeleton-middleInitial-${index}`}>
  //       <Skeleton className="h-[1rem] w-[8ch]" />
  //     </TableCell>
  //   ),
  // },
  // {
  //   name: "suffixName",
  //   head: "Suffix Name",
  //   size: "w-[15ch]",
  //   cell: (record: VoterRecord) => (
  //     <TableCell key={`${record.VRCNUM}-suffixName`}>
  //       {record.suffixName}
  //     </TableCell>
  //   ),
  //   skeletonCell: (index: number) => (
  //     <TableCell key={`skeleton-suffixName-${index}`}>
  //       <Skeleton className="h-[1rem] w-[8ch]" />
  //     </TableCell>
  //   ),
  // },
  {
    name: "houseNum",
    head: "House Number",
    size: "w-[15ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-houseNum`}>{record.houseNum}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-houseNum-${index}`}>
        <Skeleton className="h-[1rem] w-[8ch]" />
      </TableCell>
    ),
  },
  {
    name: "street",
    head: "Street",
    size: "w-[25ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-street`}>{record.street}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-street-${index}`}>
        <Skeleton className="h-[1rem] w-[20ch]" />
      </TableCell>
    ),
  },
  // {
  //   name: "apartment",
  //   head: "Apartment",
  //   size: "w-[15ch]",
  //   cell: (record: VoterRecord) => (
  //     <TableCell key={`${record.VRCNUM}-apartment`}>
  //       {record.apartment}
  //     </TableCell>
  //   ),
  //   skeletonCell: (index: number) => (
  //     <TableCell key={`skeleton-apartment-${index}`}>
  //       <Skeleton className="h-[1rem] w-[8ch]" />
  //     </TableCell>
  //   ),
  // },
  {
    name: "city",
    head: "City",
    size: "w-[20ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-city`}>{record.city}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-city-${index}`}>
        <Skeleton className="h-[1rem] w-[12ch]" />
      </TableCell>
    ),
  },
  {
    name: "state",
    head: "State",
    size: "w-[10ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-state`}>{record.state}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-state-${index}`}>
        <Skeleton className="h-[1rem] w-[6ch]" />
      </TableCell>
    ),
  },
  {
    name: "zipCode",
    head: "Zip Code",
    size: "w-[15ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-zipCode`}>{record.zipCode}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-zipCode-${index}`}>
        <Skeleton className="h-[1rem] w-[8ch]" />
      </TableCell>
    ),
  },
  {
    name: "zipSuffix",
    head: "Zip Suffix",
    size: "w-[15ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-zipSuffix`}>
        {record.zipSuffix}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-zipSuffix-${index}`}>
        <Skeleton className="h-[1rem] w-[8ch]" />
      </TableCell>
    ),
  },
  {
    name: "telephone",
    head: "Telephone",
    size: "w-[18ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-telephone`}>
        {record.telephone}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-telephone-${index}`}>
        <Skeleton className="h-[1rem] w-[10ch]" />
      </TableCell>
    ),
  },
  {
    name: "email",
    head: "Email",
    size: "w-[30ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-email`}>{record.email}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-email-${index}`}>
        <Skeleton className="h-[1rem] w-[25ch]" />
      </TableCell>
    ),
  },
  {
    name: "party",
    head: "Party",
    size: "w-[15ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-party`}>{record.party}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-party-${index}`}>
        <Skeleton className="h-[1rem] w-[8ch]" />
      </TableCell>
    ),
  },
  {
    name: "gender",
    head: "Gender",
    size: "w-[10ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-gender`}>{record.gender}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-gender-${index}`}>
        <Skeleton className="h-[1rem] w-[6ch]" />
      </TableCell>
    ),
  },
  {
    name: "DOB",
    head: "DOB",
    size: "w-[20ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-dob`}>
        {record.DOB ? new Date(record.DOB).toLocaleDateString() : ""}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-dob-${index}`}>
        <Skeleton className="h-[1rem] w-[10ch]" />
      </TableCell>
    ),
  },
  {
    name: "countyLegDistrict",
    head: "County Leg District",
    size: "w-[20ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-countyLegDistrict`}>
        {record.countyLegDistrict}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-countyLegDistrict-${index}`}>
        <Skeleton className="h-[1rem] w-[12ch]" />
      </TableCell>
    ),
  },
  {
    name: "stateAssmblyDistrict",
    head: "State Assembly District",
    size: "w-[25ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-stateAssmblyDistrict`}>
        {record.stateAssmblyDistrict}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-stateAssmblyDistrict-${index}`}>
        <Skeleton className="h-[1rem] w-[15ch]" />
      </TableCell>
    ),
  },
  {
    name: "stateSenateDistrict",
    head: "State Senate District",
    size: "w-[25ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-stateSenateDistrict`}>
        {record.stateSenateDistrict}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-stateSenateDistrict-${index}`}>
        <Skeleton className="h-[1rem] w-[15ch]" />
      </TableCell>
    ),
  },
  {
    name: "congressionalDistrict",
    head: "Congressional District",
    size: "w-[25ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-congressionalDistrict`}>
        {record.congressionalDistrict}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-congressionalDistrict-${index}`}>
        <Skeleton className="h-[1rem] w-[15ch]" />
      </TableCell>
    ),
  },
  {
    name: "CC_WD_Village",
    head: "CC WD Village",
    size: "w-[20ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-CC_WD_Village`}>
        {record.CC_WD_Village}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-CC_WD_Village-${index}`}>
        <Skeleton className="h-[1rem] w-[12ch]" />
      </TableCell>
    ),
  },
  {
    name: "electionDistrict",
    head: "Election District",
    size: "w-[20ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-electionDistrict`}>
        {record.electionDistrict}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-electionDistrict-${index}`}>
        <Skeleton className="h-[1rem] w-[12ch]" />
      </TableCell>
    ),
  },
  {
    name: "townCode",
    head: "Town Code",
    size: "w-[15ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-townCode`}>{record.townCode}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-townCode-${index}`}>
        <Skeleton className="h-[1rem] w-[8ch]" />
      </TableCell>
    ),
  },
  {
    name: "statevid",
    head: "Statevid",
    size: "w-[15ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-statevid`}>{record.statevid}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-statevid-${index}`}>
        <Skeleton className="h-[1rem] w-[8ch]" />
      </TableCell>
    ),
  },
  {
    name: "L_T",
    head: "L_T",
    size: "w-[10ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-L_T`}>{record.L_T}</TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-L_T-${index}`}>
        <Skeleton className="h-[1rem] w-[6ch]" />
      </TableCell>
    ),
  },
  // {
  //   name: "lastUpdate",
  //   head: "Last Update",
  //   size: "w-[20ch]",
  //   cell: (record: VoterRecord) => (
  //     <TableCell key={`${record.VRCNUM}-lastUpdate`}>
  //       {record.lastUpdate ? new Date(record.lastUpdate).toLocaleDateString() : ""}
  //     </TableCell>
  //   ),
  //   skeletonCell: (index: number) => (
  //     <TableCell key={`skeleton-lastUpdate-${index}`}>
  //       <Skeleton className="h-[1rem] w-[10ch]" />
  //     </TableCell>
  //   ),
  // },
  {
    name: "originalRegDate",
    head: "Original Reg Date",
    size: "w-[20ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-originalRegDate`}>
        {record.originalRegDate
          ? new Date(record.originalRegDate).toLocaleDateString()
          : ""}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-originalRegDate-${index}`}>
        <Skeleton className="h-[1rem] w-[10ch]" />
      </TableCell>
    ),
  },
  {
    name: "hasDiscrepancy",
    head: "Has Discrepancy",
    size: "w-[15ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-hasDiscrepancy`}>
        {record.hasDiscrepancy ? "Yes" : "No"}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-hasDiscrepancy-${index}`}>
        <Skeleton className="h-[1rem] w-[8ch]" />
      </TableCell>
    ),
  },
  {
    name: "Address",
    head: "Address",
    size: "w-[35ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-address`}>
        {`${record.houseNum} ${record.street}`}
      </TableCell>
    ),
    skeletonCell: (index: number) => (
      <TableCell key={`skeleton-address-${index}`}>
        <Skeleton className="h-[1rem] w-[35ch]" />
      </TableCell>
    ),
  },
] as const;

// Export the type for field names
export type FieldName = (typeof fields)[number]["name"];
