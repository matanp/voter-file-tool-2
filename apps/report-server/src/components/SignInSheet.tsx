import React from 'react';
import {
  formatMeetingLine,
  paginateSignInSheetRows,
  type SignInSheetData,
} from '../signInSheetHelpers';

const COLUMNS = [
  { label: 'ED', widthPercent: 4 },
  { label: 'Member name', widthPercent: 20.8 },
  { label: 'Email on file', widthPercent: 25.7 },
  { label: 'Phone on file', widthPercent: 12.9 },
  { label: 'Member signature', widthPercent: 16.8 },
  { label: 'Proxy name (print)', widthPercent: 9.9 },
  { label: 'Proxy signature', widthPercent: 9.9 },
];
const FIRST_PROXY_COLUMN = 5;

const CELL = 'border border-gray-300 px-2';
const VALUE_CELL = `${CELL} pt-1 align-top`;
const PROXY_DIVIDER = 'border-l-2 border-l-[#0057a6]';
const SECOND_LINE = 'mt-0.5 text-[13px] leading-[15px] text-gray-600';

const OnFileValue = ({ value }: { value: string | null }) =>
  value ? (
    <div className="break-all">{value}</div>
  ) : (
    <div className="italic text-red-600">None on file</div>
  );

interface SignInSheetProps {
  sheets: SignInSheetData[];
  meetingName?: string;
  meetingDate?: string;
  contactInfoDate: string;
}

/**
 * Renders one sign-in sheet per committee on Legal landscape pages. Each page
 * div is exactly paper-sized, which is what puts every page on its own sheet.
 */
const SignInSheet = React.forwardRef<HTMLDivElement, SignInSheetProps>(
  ({ sheets, meetingName, meetingDate, contactInfoDate }, ref) => {
    const meetingLine = formatMeetingLine(meetingName, meetingDate);
    const reportName = meetingName
      ? `${meetingName} Sign-In Sheet`
      : 'Sign-In Sheet';

    return (
      <div ref={ref}>
        {sheets.flatMap(({ committeeLabel, rows }, sheetIndex) =>
          paginateSignInSheetRows(rows).map((pageRows, pageIndex) => (
            <div
              key={`${sheetIndex}-${pageIndex}`}
              data-sign-in-page
              className="w-[14in] h-[8.5in] overflow-hidden bg-white px-[0.65in] pt-[0.7in] pb-[0.35in]"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <div className="flex h-full flex-col">
                {pageIndex === 0 && (
                  <div data-sign-in-title className="pb-2 text-center">
                    <h1 className="text-2xl font-bold leading-7">
                      {committeeLabel} Committee
                    </h1>
                    {meetingLine && (
                      <p className="text-base font-bold leading-5 text-gray-600">
                        {meetingLine}
                      </p>
                    )}
                  </div>
                )}
                <table
                  data-sign-in-table
                  className="w-full table-fixed border-collapse border-2 border-[#0057a6] text-[14px] leading-4"
                >
                  <colgroup>
                    {COLUMNS.map(({ label, widthPercent }) => (
                      <col key={label} style={{ width: `${widthPercent}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr
                      data-sign-in-header
                      className="bg-[#0057a6] text-[13px] uppercase leading-4 text-white"
                    >
                      {COLUMNS.map(({ label }, columnIndex) => (
                        <th
                          key={label}
                          className={`border border-[#0057a6] px-2 py-2 text-center align-middle font-bold ${
                            columnIndex === FIRST_PROXY_COLUMN
                              ? PROXY_DIVIDER
                              : ''
                          }`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        data-sign-in-row
                        className="h-[0.75in]"
                      >
                        <td className={`${CELL} text-center align-middle`}>
                          {row.electionDistrict}
                        </td>
                        <td className={VALUE_CELL}>
                          <div className="break-words font-bold">
                            {row.name}
                          </div>
                          <div className={SECOND_LINE}>[ ] Info correct</div>
                        </td>
                        <td className={VALUE_CELL}>
                          <OnFileValue value={row.email} />
                          <div className={SECOND_LINE}>New email:</div>
                        </td>
                        <td className={VALUE_CELL}>
                          <OnFileValue value={row.phone} />
                          <div className={SECOND_LINE}>New phone:</div>
                        </td>
                        <td className={CELL} />
                        <td className={`${CELL} ${PROXY_DIVIDER}`} />
                        <td className={CELL} />
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  data-sign-in-footer
                  className="mt-auto flex w-full justify-between gap-6 pt-1 text-[11px] text-gray-500"
                >
                  <span data-sign-in-footer-text className="min-w-0">
                    {committeeLabel} Democratic Committee | {reportName} |{' '}
                    {rows.length} eligible members | Contact info as of{' '}
                    {contactInfoDate}
                  </span>
                  <span data-sign-in-page-number className="shrink-0">
                    Page {pageIndex + 1}
                  </span>
                </div>
              </div>
            </div>
          )),
        )}
      </div>
    );
  },
);

SignInSheet.displayName = 'SignInSheet';
export default SignInSheet;
