import { type VoterRecord } from "@prisma/client";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { fields, type FieldName } from "./fieldsConfig";

interface BaseVoterRecordTableProps {
  fieldsList: FieldName[];
  fullWidth?: boolean;
  compactView?: boolean;
  extraHeaders?: Array<string>;
  seeMoreDetailsText?: string;
  extraContent?: (record: VoterRecord) => React.ReactNode;
  scrollId?: string;
}

type VoterRecordTableProps = BaseVoterRecordTableProps;

export const VoterRecordTableSkeleton: React.FC<VoterRecordTableProps> = ({
  fieldsList,
  fullWidth,
  extraHeaders,
  scrollId,
}) => {
  return (
    <div id={scrollId}>
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
                return field.skeletonCell(index);
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
