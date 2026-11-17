"use client";
import React from "react";
import { type VoterRecord } from "@prisma/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { ResultsPager } from "./ResultsPager";
import { VoterCard } from "./VoterCard";
import { fields, type FieldName } from "./fieldsConfig";

export const VOTER_RECORD_CARD_LIST_ID = "voter-record-card-list";

type VoterRecordCardListProps = {
  records: VoterRecord[];
  /** The table's columns (searched fields plus DOB and phone); each card shows the same fields. */
  fieldsList: FieldName[];
  totalRecords: number;
  loadMore: () => void;
};

/**
 * Phone layout of record search results: one tappable card per voter, opening the full VoterCard
 * in a full-height sheet. RecordsList shows it below `md` and VoterRecordTable from `md` up.
 */
export const VoterRecordCardList: React.FC<VoterRecordCardListProps> = ({
  records,
  fieldsList,
  totalRecords,
  loadMore,
}) => {
  const [selected, setSelected] = React.useState<VoterRecord | null>(null);
  const shownFields = fieldsList
    .map((name) => fields.find((field) => field.name === name))
    .filter((field) => field !== undefined);

  return (
    <div>
      <ul
        id={VOTER_RECORD_CARD_LIST_ID}
        className="flex flex-col gap-2"
        aria-label="Voter records"
      >
        {records.map((record) => (
          <li key={record.VRCNUM}>
            <button
              type="button"
              onClick={() => setSelected(record)}
              className="w-full rounded-md border bg-background p-3 text-left shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block font-medium break-words">
                {`${record.firstName} ${record.lastName}`}
              </span>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                {shownFields.map((field) => (
                  <React.Fragment key={field.name}>
                    <dt className="font-light">{field.head}</dt>
                    <dd className="min-w-0 break-words">
                      {field.value(record) ?? ""}
                    </dd>
                  </React.Fragment>
                ))}
              </dl>
              <span className="sr-only">, show details</span>
            </button>
          </li>
        ))}
      </ul>

      <ResultsPager
        shown={records.length}
        total={totalRecords}
        loadMore={loadMore}
        topElementId={VOTER_RECORD_CARD_LIST_ID}
        className="mt-4 text-sm"
      />

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-none"
        >
          <SheetHeader className="border-b p-4 pr-12 text-left">
            <SheetTitle>Voter details</SheetTitle>
            <SheetDescription className="sr-only">
              Full voter record
            </SheetDescription>
          </SheetHeader>
          {/* A block wrapper, so VoterCard's mx-auto doesn't shrink it to its content in the flex column. */}
          <div>
            {selected && <VoterCard record={selected} headingLevel="h3" />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
