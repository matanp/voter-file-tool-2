import { type VoterRecord } from "@prisma/client";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { VoterCard } from "./VoterCard";
import { EllipsisVertical } from "~/components/icons/ellipsisVertical";
import { fields, type FieldName } from "./fieldsConfig";
import { ResultsPager } from "./ResultsPager";

interface BaseVoterRecordTableProps {
  records: VoterRecord[];
  fieldsList: FieldName[];
  fullWidth?: boolean;
  compactView?: boolean;
  extraHeaders?: Array<string>;
  seeMoreDetailsText?: string;
  extraContent?: (record: VoterRecord) => React.ReactNode;
}

interface PaginationProps {
  totalRecords: number;
  loadMore: () => void;
}

type VoterRecordTableProps =
  | (BaseVoterRecordTableProps & { paginated: false })
  | (BaseVoterRecordTableProps & { paginated: true } & PaginationProps);

export const VoterRecordTable: React.FC<VoterRecordTableProps> = ({
  records,
  extraContent,
  fieldsList,
  fullWidth,
  compactView,
  paginated,
  extraHeaders,
  seeMoreDetailsText,
  ...paginationProps
}) => {
  const { totalRecords, loadMore } = paginationProps as PaginationProps;
  const shownFields = fieldsList.filter((fieldName) =>
    fields.some((field) => field.name === fieldName),
  );
  // Name + field columns + extra columns + the details button column.
  const columnCount = 1 + shownFields.length + (extraHeaders?.length ?? 0) + 1;

  return (
    <div>
      <Table
        id="voter-record-table"
        className={`${!fullWidth && "max-w-[80vw]  table-fixed"}`}
      >
        <TableHeader>
          <TableRow>
            <TableHead className="w-[24ch]">Name</TableHead>
            {fieldsList.map((fieldName: FieldName) => {
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
          {records.map((record) => (
            <TableRow key={record.VRCNUM}>
              <TableCell className="font-medium">{`${record.firstName} ${record.lastName}`}</TableCell>
              {fieldsList.map((fieldName: FieldName) => {
                const field = fields.find((field) => field.name === fieldName);
                if (!field) {
                  return null;
                }
                return (
                  <TableCell key={field.name}>{field.value(record)}</TableCell>
                );
              })}
              {extraContent && <TableCell>{extraContent(record)}</TableCell>}
              <TableCell className="text-right">
                <Popover>
                  <PopoverTrigger asChild>
                    {compactView ? (
                      <Button variant={"outline"}>
                        <EllipsisVertical />
                      </Button>
                    ) : (
                      <Button variant="outline" className="font-light">
                        {seeMoreDetailsText ?? "See more details"}
                      </Button>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="mr-2 w-max shadow-lg">
                    <VoterCard record={record} />
                  </PopoverContent>
                </Popover>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {paginated && (
          <TableFooter id="table-footer">
            <TableRow>
              <TableCell colSpan={columnCount} className="pr-6">
                <ResultsPager
                  shown={records.length}
                  total={totalRecords}
                  loadMore={loadMore}
                  topElementId="voter-record-table"
                />
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
};
