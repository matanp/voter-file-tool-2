import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export type CommitteeUploadRecords = {
  VRCNUM: string;
  fullRow: {
    ED: string;
    LT: string;
    Add1: string;
    Zip: string;
    name: string;
    [key: string]: string; // Additional fields not directly used here
  };
};

type DiscrepancyRecordsTableProps = {
  records: CommitteeUploadRecords[];
};

const DiscrepancyRecordsTable: React.FC<DiscrepancyRecordsTableProps> = ({
  records,
}) => {
  console.log(records[0]);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>VRCNUM</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>ED</TableHead>
          <TableHead>LT</TableHead>
          <TableHead>Add1</TableHead>
          <TableHead>Zip</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.VRCNUM}>
            <TableCell>{record.VRCNUM}</TableCell>
            <TableCell>{record.fullRow.name}</TableCell>
            <TableCell>{record.fullRow.ED}</TableCell>
            <TableCell>{record.fullRow.LT}</TableCell>
            <TableCell>{record.fullRow.Add1}</TableCell>
            <TableCell>{record.fullRow.Zip}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={5}>Total Records: {records.length}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
};

export default DiscrepancyRecordsTable;
