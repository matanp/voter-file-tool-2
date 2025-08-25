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
import { VoterCard } from "./RecordsList";
import { EllipsisVertical } from "~/components/icons/ellipsisVertical";

interface BaseVoterRecordTableProps {
  records: VoterRecord[];
  fieldsList: Array<(typeof fields)[number]["name"]>;
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

const fields = [
  {
    name: "DOB",
    head: "DOB",
    size: "w-[20ch]",
    cell: (record: VoterRecord) => {
      return (
        <TableCell key={`${record.VRCNUM}-dob`}>
          {record.DOB ? new Date(record.DOB).toLocaleDateString() : ""}
        </TableCell>
      );
    },
  },
  {
    name: "Telephone",
    head: "Telephone",
    size: "w-[18ch]",
    cell: (record: VoterRecord) => (
      <TableCell key={`${record.VRCNUM}-telephone`}>
        {record.telephone}
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
  },
] as const;

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

  const jumpToTop = () => {
    const tableElement = document.getElementById("voter-record-table");
    if (tableElement) {
      const offset = 300; // Adjust this value as needed
      const topPos =
        tableElement.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: topPos, behavior: "smooth" });
    }
  };

  //   const jumpToBottom = () => {
  //     const footerElement = document.getElementById("table-footer");
  //     if (footerElement) {
  //       footerElement.scrollIntoView({ behavior: "smooth" });
  //     }
  //   };

  return (
    <div>
      {/* <Button onClick={jumpToBottom} className="mb-2">
        Jump to Bottom
      </Button> */}
      <Table
        id="voter-record-table"
        className={`${!fullWidth && "max-w-[80vw]  table-fixed"}`}
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
          {records.map((record) => (
            <TableRow key={record.VRCNUM}>
              <TableCell className="font-medium">{`${record.firstName} ${record.lastName}`}</TableCell>
              {fieldsList.map((fieldName: string) => {
                const field = fields.find((field) => field.name === fieldName);
                if (!field) {
                  return null;
                }
                return field.cell(record);
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
              <TableCell>
                <div className="flex gap-2">
                  {records.length < totalRecords && (
                    <Button onClick={loadMore}>Load More</Button>
                  )}
                  {records.length > 10 && (
                    <Button onClick={jumpToTop} variant={"outline"}>
                      Jump to Top
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right pr-6 font-light" colSpan={3}>
                Showing {records.length} records of {totalRecords} total
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
};
