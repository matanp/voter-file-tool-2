import React from 'react';
import { type CommitteeMember } from '@voter-file-tool/shared-validators';

// Temporary local implementation until the shared package is built
const generateDynamicHeaders = (
  members: CommitteeMember[],
  compoundTypes?: any
): string[] => {
  if (members.length === 0) return ['Election District'];

  // Get all unique field names from the members
  const allFields = new Set<string>();
  for (const member of members) {
    for (const key of Object.keys(member)) {
      if (key !== 'electionDistrict') {
        allFields.add(key);
      }
    }
  }

  // Always start with Election District
  const headers = ['Election District'];

  // Add other fields in a consistent order
  const fieldOrder = [
    'name',
    'address',
    'city',
    'state',
    'zip',
    'phone',
    'firstName',
    'middleInitial',
    'lastName',
    'suffixName',
    'houseNum',
    'street',
    'apartment',
    'halfAddress',
    'resAddrLine2',
    'resAddrLine3',
    'mailingAddress1',
    'mailingAddress2',
    'mailingAddress3',
    'mailingAddress4',
    'mailingCity',
    'mailingState',
    'mailingZip',
    'mailingZipSuffix',
    'telephone',
    'email',
    'electionDistrict',
    'countyLegDistrict',
    'stateAssmblyDistrict',
    'stateSenateDistrict',
    'congressionalDistrict',
    'CC_WD_Village',
    'townCode',
    'VRCNUM',
    'addressForCommittee',
    'party',
    'gender',
    'DOB',
    'L_T',
    'originalRegDate',
    'statevid',
  ];

  // Add fields in the preferred order if they exist
  for (const field of fieldOrder) {
    if (allFields.has(field)) {
      headers.push(field);
      allFields.delete(field);
    }
  }

  // Add any remaining fields that weren't in the preferred order
  for (const field of Array.from(allFields).sort()) {
    headers.push(field);
  }

  return headers;
};

type CommitteeGroup = {
  electionDistrict: string;
  members: CommitteeMember[];
};

// Dynamic table component that generates headers and rows based on actual data
const DynamicCommitteeTable: React.FC<{ groups: CommitteeGroup[] }> = ({
  groups,
}) => {
  // Collect all members to generate dynamic headers
  const allMembers = groups.flatMap((group) => group.members);
  const headers = generateDynamicHeaders(allMembers);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="">
          {headers.map((header: string, index: number) => (
            <th
              key={index}
              className="border border-gray-400 px-2 py-1 text-left"
            >
              {header === 'Election District' ? 'Serve ED' : header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {groups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {group.members.map((member, memberIndex) => (
              <tr key={memberIndex} className="align-top">
                {headers.map((header: string, headerIndex: number) => (
                  <td key={headerIndex} className="pl-2">
                    {header === 'Election District'
                      ? group.electionDistrict.toString().padStart(3, '0')
                      : String(member[header as keyof typeof member] || '')}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="h-2"></tr>
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

type Page = {
  cityTown: string;
  legDistrict: number;
  groups: CommitteeGroup[];
  lastPage: boolean;
  totalRecords?: number;
};

type LDCommitteesArray = {
  cityTown: string;
  legDistrict: number;
  committees: Record<string, CommitteeMember[]>;
}[];

interface CommitteeReportProps {
  groupedCommittees: LDCommitteesArray;
}

const CommitteeReport = React.forwardRef<HTMLDivElement, CommitteeReportProps>(
  ({ groupedCommittees }, ref) => {
    const pages = paginateCommittees(groupedCommittees);

    const numPages = pages.length;

    return (
      <div ref={ref}>
        {pages.map((page, pageIndex) => (
          <div
            key={pageIndex}
            className="w-[11in] h-[8.5in] p-8 font-sans bg-white mx-auto shadow"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            <div className="flex flex-col h-full">
              <div>
                <h2 className="text-center text-xl font-black pt-4">
                  Monroe County Democratic Committee List as of May 15, 2025
                </h2>

                <h3 className="text-lg font-semibold mt-6 mb-1 ml-2">
                  {page.cityTown === 'ROCHESTER'
                    ? `LD ${page.legDistrict.toString().padStart(2, '0')}`
                    : page.cityTown}
                </h3>

                <DynamicCommitteeTable groups={page.groups} />
                {page.lastPage && (
                  <div className="ml-6 font-lg font-semibold">
                    Committee Subtotal: {page.totalRecords}
                  </div>
                )}
              </div>
              <div className="mt-auto mb-4 flex w-full text-sm">
                <p className="ml-4">
                  {new Date(Date.now()).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="ml-auto mr-4">
                  Page {pageIndex + 1} of {numPages}
                </p>
              </div>
            </div>
            <div className="page-break" />
          </div>
        ))}
      </div>
    );
  }
);

CommitteeReport.displayName = 'CommitteeReport';

export default CommitteeReport;

export function paginateCommittees(
  groupedCommittees: LDCommitteesArray,
  pageSize = 30
): Page[] {
  const pages: Page[] = [];

  for (const ld of groupedCommittees) {
    // Track the starting page index for this LD
    const ldStartPageIndex = pages.length;
    let currentGroups: CommitteeGroup[] = [];
    let memberCount = 0;
    let currentCount = 0; // members + groups headers cost

    for (const [electionDistrict, members] of Object.entries(ld.committees)) {
      const costToAdd = members.length + 1; // +1 for header
      memberCount += members.length;

      // Check if this group would overflow the page
      if (currentCount + costToAdd > pageSize && currentGroups.length > 0) {
        // Finish current page
        pages.push({
          cityTown: ld.cityTown,
          legDistrict: ld.legDistrict,
          groups: currentGroups,
          lastPage: false,
        });

        // Reset
        currentGroups = [];
        currentCount = 0;
      }

      // Check if this single group is too large for a page
      if (costToAdd > pageSize) {
        // If there are existing groups, finish the current page first
        if (currentGroups.length > 0) {
          pages.push({
            cityTown: ld.cityTown,
            legDistrict: ld.legDistrict,
            groups: currentGroups,
            lastPage: false,
          });
          currentGroups = [];
          currentCount = 0;
        }

        // Split the oversized group into chunks
        const maxMembersPerChunk = pageSize - 1; // -1 for header
        for (let i = 0; i < members.length; i += maxMembersPerChunk) {
          const chunk = members.slice(i, i + maxMembersPerChunk);
          const chunkGroup = { electionDistrict, members: chunk };

          pages.push({
            cityTown: ld.cityTown,
            legDistrict: ld.legDistrict,
            groups: [chunkGroup],
            lastPage: false,
          });
        }
      } else {
        // Group fits on current page
        currentGroups.push({ electionDistrict, members });
        currentCount += costToAdd;
      }
    }

    // Handle remaining groups or ensure final page is marked correctly
    if (currentGroups.length > 0) {
      pages.push({
        cityTown: ld.cityTown,
        legDistrict: ld.legDistrict,
        groups: currentGroups,
        lastPage: true,
        totalRecords: memberCount,
      });
    } else {
      // All groups were chunked, need to mark the final page for this LD
      const ldEndPageIndex = pages.length;
      if (ldEndPageIndex > ldStartPageIndex) {
        // Mark the last page for this LD as the final page with subtotal
        const lastPageIndex = ldEndPageIndex - 1;
        if (memberCount > 0) {
          pages[lastPageIndex] = {
            ...pages[lastPageIndex],
            lastPage: true,
            totalRecords: memberCount,
          };
        }
      }
    }
  }

  return pages;
}
