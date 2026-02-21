import React from 'react';

/** Member row for sign-in sheet (name and address pre-filled) */
export type SignInSheetMember = {
  name: string;
  address: string;
};

/** Single committee (one ED) for a sign-in sheet page */
type SignInSheetCommittee = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  members: SignInSheetMember[];
};

const BLANK_ROWS = 5;
const MAX_MEMBERS_PER_PAGE = 25;

interface SignInSheetProps {
  committees: SignInSheetCommittee[];
  meetingDate?: string;
  reportAuthor: string;
}

/**
 * Renders sign-in sheet pages — one page per committee (or paginated if > 25 members).
 * Portrait 8.5×11, header per committee, table with # Name Address Signature Notes.
 */
const SignInSheet = React.forwardRef<HTMLDivElement, SignInSheetProps>(
  ({ committees, meetingDate, reportAuthor }, ref) => {
    const pages: { committee: SignInSheetCommittee; memberChunk: SignInSheetMember[]; pageIndex: number; totalPages: number }[] = [];

    for (const committee of committees) {
      const chunks: SignInSheetMember[][] = [];
      for (let i = 0; i < committee.members.length; i += MAX_MEMBERS_PER_PAGE) {
        chunks.push(committee.members.slice(i, i + MAX_MEMBERS_PER_PAGE));
      }
      if (chunks.length === 0) {
        chunks.push([]);
      }
      const totalPages = chunks.length;
      chunks.forEach((chunk, i) => {
        pages.push({
          committee,
          memberChunk: chunk,
          pageIndex: i,
          totalPages,
        });
      });
    }

    const generationDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formatMeetingDate = (iso?: string): string => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return '';
      }
    };

    return (
      <div ref={ref}>
        {pages.map(({ committee, memberChunk, pageIndex, totalPages }, idx) => {
          const headerTitle =
            committee.cityTown === 'ROCHESTER'
              ? `Sign-In Sheet — LD ${committee.legDistrict.toString().padStart(2, '0')} ED ${committee.electionDistrict.toString().padStart(3, '0')}`
              : `Sign-In Sheet — ${committee.cityTown} LD ${committee.legDistrict} ED ${committee.electionDistrict.toString().padStart(3, '0')}`;

          const blankCount = pageIndex === totalPages - 1 ? BLANK_ROWS : 0;
          const memberRows = memberChunk.map((m) => ({ name: m.name, address: m.address }));
          const blankRowCount = blankCount;

          return (
            <div
              key={idx}
              className="w-[8.5in] h-[11in] p-8 font-sans bg-white mx-auto"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <div className="flex flex-col h-full">
                <div>
                  <h2 className="text-center text-lg font-black pt-4">
                    {headerTitle}
                  </h2>
                  {meetingDate && (
                    <p className="text-center text-sm mt-2">
                      Meeting: {formatMeetingDate(meetingDate)}
                    </p>
                  )}
                  <table className="w-full text-sm mt-4 border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-400 px-2 py-1 text-left w-8">
                          #
                        </th>
                        <th className="border border-gray-400 px-2 py-1 text-left">
                          Name
                        </th>
                        <th className="border border-gray-400 px-2 py-1 text-left">
                          Address
                        </th>
                        <th className="border border-gray-400 px-3 py-1 text-left w-32">
                          Signature
                        </th>
                        <th className="border border-gray-400 px-2 py-1 text-left">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="align-top">
                          <td className="border border-gray-400 pl-2 py-1">
                            {rowIdx + 1}
                          </td>
                          <td className="border border-gray-400 pl-2 py-1">
                            {row.name}
                          </td>
                          <td className="border border-gray-400 pl-2 py-1">
                            {row.address}
                          </td>
                          <td className="border border-gray-400 py-1" />
                          <td className="border border-gray-400 py-1" />
                        </tr>
                      ))}
                      {Array.from({ length: blankRowCount }, (_, rowIdx) => (
                        <tr key={`blank-${rowIdx}`} className="align-top">
                          <td className="border border-gray-400 pl-2 py-1" />
                          <td className="border border-gray-400 pl-2 py-1" />
                          <td className="border border-gray-400 pl-2 py-1" />
                          <td className="border border-gray-400 py-1" />
                          <td className="border border-gray-400 py-1" />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-auto pt-4 flex w-full text-xs justify-between">
                  <span>{generationDate}</span>
                  <span>{reportAuthor}</span>
                  <span>
                    Page {idx + 1} of {pages.length}
                  </span>
                </div>
              </div>
              <div className="page-break" />
            </div>
          );
        })}
      </div>
    );
  },
);

SignInSheet.displayName = 'SignInSheet';
export default SignInSheet;
