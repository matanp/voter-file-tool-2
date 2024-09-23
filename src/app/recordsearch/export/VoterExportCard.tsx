import { type VoterRecord } from "@prisma/client";
import React from "react";

interface VoterRecordProps {
  record: VoterRecord;
}

const VoterExportCard: React.FC<VoterRecordProps> = ({ record }) => {
  return (
    <div className="mb-5 border border-gray-300 p-4">
      <strong className="block text-lg">
        {record.firstName} {record.lastName}
      </strong>
      <p>
        {record.houseNum} {record.street}
      </p>
      <p>
        {record.city}, {record.state} {record.zipCode}
      </p>
      <p>Phone: {record.telephone}</p>
      <p>
        Sex: {record.gender} Age:{" "}
        {record.DOB ? new Date(record.DOB).getFullYear() : ""}
      </p>
      <p>Party: {record.party}</p>
    </div>
  );
};

export default VoterExportCard;
