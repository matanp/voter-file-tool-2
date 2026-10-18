import React from "react";
import type { MembershipType, VoterRecord } from "@prisma/client";

import { SHOW_MEMBERSHIP_TYPE } from "~/app/committees/workspace/tabs/roster/seatPetitionDisplay";
import { Badge } from "~/components/ui/badge";
import { getAddress } from "~/lib/voterRecordFormatters";

/** SRS 2.1a — optional submission contact overrides (prefer over voter record when displaying committee member). */
export type SubmissionContactOverrides = {
  email?: string;
  phone?: string;
};

export const VoterCard = ({
  record,
  committee,
  membershipType,
  submissionMetadata,
}: {
  record: VoterRecord;
  committee?: boolean;
  membershipType?: MembershipType | null;
  /** SRS 2.1a — when present, display email/phone from submission over voter record. */
  submissionMetadata?: SubmissionContactOverrides | null;
}) => {
  // SRS 2.1a: Prefer submission contact over voter record (BOE imports overwrite VoterRecord; submission preserves leader-provided contact).
  const displayEmail = submissionMetadata?.email ?? record.email;
  const displayPhone = submissionMetadata?.phone ?? record.telephone;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-medium text-gray-800">
          {`${record.firstName} ${record.lastName}`}
        </h2>
        {SHOW_MEMBERSHIP_TYPE && committee && membershipType != null && (
          <Badge variant="secondary" hoverable={false}>
            {membershipType === "APPOINTED" ? "Appointed" : "Petitioned"}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-gray-600 [&>*>p>span]:font-light">
        <div>
          <p>
            <span>Party:</span> {record.party}
          </p>
          <p>
            <span>Gender:</span> {record.gender}
          </p>
          <p>
            <span>DOB:</span>{" "}
            {record.DOB ? new Date(record.DOB).toLocaleDateString() : "-"}
          </p>
          <p>
            <span>Telephone:</span> {displayPhone ?? "-"}
          </p>
          <p className="break-words">
            <span>Email:</span> {displayEmail ?? "-"}
          </p>
          <p>
            <span>Voter Id:</span> {record.VRCNUM}
          </p>
        </div>
        <div>
          <p>
            <span>Address:</span> {getAddress(record, committee)}
          </p>
          <p>
            <span>City:</span> {record.city}
          </p>
          <p>
            <span>Town:</span> {record.CC_WD_Village ?? "-"}
          </p>
          <p>
            <span>State:</span> {record.state}
          </p>
          <p>
            <span>Zip Code:</span> {record.zipCode}
          </p>
          <p>
            <span>County Leg District:</span> {record.countyLegDistrict}
          </p>
          <p>
            <span>Election District:</span> {record.electionDistrict ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
};
