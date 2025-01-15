import { type VoterRecord } from "@prisma/client";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

interface BaseVoterRecordTableProps {
  fieldsList: Array<(typeof fields)[number]["name"]>;
  fullWidth?: boolean;
  compactView?: boolean;
  extraHeaders?: Array<string>;
  seeMoreDetailsText?: string;
  extraContent?: (record: VoterRecord) => React.ReactNode;
}

const fields = [
  {
    name: "DOB",
    head: "DOB",
    size: "w-[20ch]",
    cell: (index: number) => {
      return (
        <TableCell key={`skeleton-dob-${index}`}>
          <Skeleton className="h-[1rem] w-[10ch]" />
        </TableCell>
      );
    },
  },
  {
    name: "Telephone",
    head: "Telephone",
    size: "w-[18ch]",
    cell: (index: number) => (
      <TableCell key={`skeleton-telephone-${index}`}>
        <Skeleton className="h-[1rem] w-[10ch]" />
      </TableCell>
    ),
  },
  {
    name: "Address",
    head: "Address",
    size: "w-[35ch]",
    cell: (index: number) => (
      <TableCell key={`skeleton-address-${index}`}>
        <Skeleton className="h-[1rem] w-[35ch]" />
      </TableCell>
    ),
  },
] as const;

type VoterRecordTableProps = BaseVoterRecordTableProps;

export const VoterRecordTableSkeleton: React.FC<VoterRecordTableProps> = ({
  extraContent,
  fieldsList,
  fullWidth,
  compactView,
  extraHeaders,
  seeMoreDetailsText,
}) => {
  return (
    <div>
      {/* <Button onClick={jumpToBottom} className="mb-2">
        Jump to Bottom
      </Button> */}
      <Table
        id="voter-record-table"
        className={`${!fullWidth && "max-w-[80vw] min-w-[800px]"}`}
      >
        <TableHeader>
          <TableRow>
            <TableHead className="w-[24ch]">Name</TableHead>
            {fieldsList.map((fieldName: string) => {
              const field = fields.find((field) => field.name === fieldName);
              if (!field) {
                return null;
              }
              return (
                <TableHead key={field.name} className={field.size}>
                  {field.head}
                </TableHead>
              );
            })}
            {extraHeaders?.map((header: string) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">
                <Skeleton className="h-[1rem] w-[16ch]" />
              </TableCell>
              {fieldsList.map((fieldName: string) => {
                const field = fields.find((field) => field.name === fieldName);
                if (!field) {
                  return null;
                }
                return field.cell(index);
              })}
              <TableCell className="flex justify-end">
                <Skeleton className="h-[1rem] w-[140px]" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
