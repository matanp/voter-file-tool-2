import React from 'react';

interface Committee {
  committeeName: string;
  address: string;
  chairperson: string;
  treasurer: string;
  // Add other relevant committee properties here
}

interface CommitteeReportProps {
  groupedCommittees: Committee[];
}

const CommitteeReport = React.forwardRef<
  HTMLDivElement,
  CommitteeReportProps
>(({ groupedCommittees }, ref) => {
  return (
    <div
      ref={ref}
      className="w-[8.5in] h-[14in] p-8 font-sans bg-white"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <h2 className="text-center text-2xl font-black pt-4">Committee Report</h2>
      {groupedCommittees.map((committee, index) => (
        <div key={index} className="mb-4 border p-2">
          <h3 className="text-lg font-bold">{committee.committeeName}</h3>
          <p>Address: {committee.address}</p>
          <p>Chairperson: {committee.chairperson}</p>
          <p>Treasurer: {committee.treasurer}</p>
          {/* Add more committee details here */}
        </div>
      ))}
    </div>
  );
});

CommitteeReport.displayName = 'CommitteeReport';

export default CommitteeReport;
