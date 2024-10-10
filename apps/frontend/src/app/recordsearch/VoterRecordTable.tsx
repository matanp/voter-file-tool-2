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

interface BaseVoterRecordTableProps {
  records: VoterRecord[];
  fieldsList: Array<(typeof fields)[number]["name"]>;
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
    cell: (record: VoterRecord) => {
      return (
        <TableCell>
          {record.DOB ? new Date(record.DOB).toLocaleDateString() : ""}
        </TableCell>
      );
    },
  },
  {
    name: "Telephone",
    head: "Telephone",
    cell: (record: VoterRecord) => <TableCell>{record.telephone}</TableCell>,
  },
] as const;

type VoterRecordTableProps =
  | (BaseVoterRecordTableProps & { paginated: false })
  | (BaseVoterRecordTableProps & { paginated: true } & PaginationProps);

export const VoterRecordTable: React.FC<VoterRecordTableProps> = ({
  records,
  extraContent,
  fieldsList,
  paginated,
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
      <Table id="voter-record-table" className="min-w-[800px] max-w-[80vw]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
            {fieldsList.map((feildName: string) => {
              const feild = fields.find((feild) => feild.name === feildName);
              if (!feild) {
                return null;
              }
              return <TableHead key={feild.name}>{feild.head}</TableHead>;
            })}
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
                    <Button variant="outline">See more details</Button>
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
                {records.length < totalRecords && (
                  <Button onClick={loadMore}>Load More</Button>
                )}
              </TableCell>
              <TableCell>
                <Button onClick={jumpToTop} variant={"outline"}>
                  Jump to Top
                </Button>
              </TableCell>
              <TableCell className="text-right" colSpan={2}>
                Showing {records.length} records of {totalRecords} total
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
};
