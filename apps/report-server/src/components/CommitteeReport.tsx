import React from 'react';

export type CommitteeMember = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
};

type CommitteeGroup = {
  electionDistrict: string;
  members: CommitteeMember[];
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

                <table className="w-full text-sm">
                  <thead>
                    <tr className="">
                      <th className="border border-gray-400 px-2 py-1 text-left">
                        Serve ED
                      </th>
                      <th className="border border-gray-400 px-2 py-1 text-left">
                        Name
                      </th>
                      <th className="border border-gray-400 px-2 py-1 text-left">
                        Address
                      </th>
                      <th className="border border-gray-400 px-2 py-1 text-left">
                        City
                      </th>
                      <th className="border border-gray-400 px-2 py-1 text-left">
                        State
                      </th>
                      <th className="border border-gray-400 px-2 py-1 text-left">
                        Zip
                      </th>
                      <th className="border border-gray-400 px-2 py-1 text-left">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.groups.map((group, groupIndex) => (
                      <React.Fragment key={groupIndex}>
                        {group.members.map((member, memberIndex) => (
                          <tr key={memberIndex} className="align-top">
                            <td className="pl-2">
                              {group.electionDistrict
                                .toString()
                                .padStart(3, '0')}
                            </td>
                            <td className="pl-2">{member.name}</td>
                            <td className="pl-2">{member.address}</td>
                            <td className="pl-2">{member.city}</td>
                            <td className="pl-2">{member.state}</td>
                            <td className="pl-2">{member.zip}</td>
                            <td className="pl-2">{member.phone}</td>
                          </tr>
                        ))}
                        <tr className="h-2"></tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
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
