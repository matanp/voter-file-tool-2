import React from 'react';
import {
  formatMeetingLine,
  paginateSignInSheetRows,
  type SignInSheetData,
} from '../signInSheetHelpers';
import {
  CELL_BORDER_PX,
  CELL_PADDING_X_PX,
  FIRST_PROXY_COLUMN,
  PAGE_HEIGHT_IN,
  PAGE_PADDING_BOTTOM_IN,
  PAGE_PADDING_TOP_IN,
  PAGE_PADDING_X_IN,
  PAGE_WIDTH_IN,
  PROXY_DIVIDER_PX,
  SIGN_IN_SHEET_COLUMNS,
  TABLE_BORDER_PX,
  type SignInSheetColumnKey,
} from '../signInSheetLayout';
import {
  fitEmailSize,
  fitMemberNameSize,
  fitPhoneSize,
  type SignInTextSize,
} from '../signInSheetTextFit';

/** Line heights keep the ratios of the earlier 14/16, 13/15, 24/28, 16/20 and 13/16 px type. */
const VALUE_TEXT: Record<SignInTextSize, string> = {
  15.5: 'text-[15.5px] leading-[1.143]',
  13: 'text-[13px] leading-[1.143]',
  11: 'text-[11px] leading-[1.143]',
};
const SECOND_LINE = 'mt-0.5 text-[15.5px] leading-[1.154] text-gray-600';

const CELL = 'border-gray-300';
const VALUE_CELL = `${CELL} pt-1 align-top`;

const cellStyle = (key: SignInSheetColumnKey): React.CSSProperties => ({
  borderWidth: CELL_BORDER_PX,
  borderLeftWidth: key === FIRST_PROXY_COLUMN ? PROXY_DIVIDER_PX : undefined,
  borderLeftColor: key === FIRST_PROXY_COLUMN ? '#0057a6' : undefined,
  paddingLeft: CELL_PADDING_X_PX,
  paddingRight: CELL_PADDING_X_PX,
});

const PAGE_STYLE: React.CSSProperties = {
  width: `${PAGE_WIDTH_IN}in`,
  height: `${PAGE_HEIGHT_IN}in`,
  paddingLeft: `${PAGE_PADDING_X_IN}in`,
  paddingRight: `${PAGE_PADDING_X_IN}in`,
  paddingTop: `${PAGE_PADDING_TOP_IN}in`,
  paddingBottom: `${PAGE_PADDING_BOTTOM_IN}in`,
  fontFamily: 'Arial, sans-serif',
};

const FittedValue = ({
  value,
  size,
  className = '',
}: {
  value: string;
  size: SignInTextSize;
  className?: string;
}) => (
  <div
    data-sign-in-text-size={size}
    className={`${VALUE_TEXT[size]} ${className}`}
  >
    {value}
  </div>
);

const OnFileValue = ({
  value,
  fit,
}: {
  value: string | null;
  fit: (value: string) => SignInTextSize;
}) =>
  value ? (
    <FittedValue value={value} size={fit(value)} className="break-all" />
  ) : (
    <div className={`${VALUE_TEXT[15.5]} italic text-red-600`}>
      None on file
    </div>
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
              className="overflow-hidden bg-white"
              style={PAGE_STYLE}
            >
              <div className="flex h-full flex-col">
                {pageIndex === 0 && (
                  <div data-sign-in-title className="pb-2 text-center">
                    <h1 className="text-[26px] font-bold leading-[1.167]">
                      {committeeLabel} Committee
                    </h1>
                    {meetingLine && (
                      <p className="text-[19px] font-bold leading-[1.25] text-gray-600">
                        {meetingLine}
                      </p>
                    )}
                  </div>
                )}
                <table
                  data-sign-in-table
                  className="w-full table-fixed border-collapse border-[#0057a6] text-[15.5px] leading-[1.143]"
                  style={{ borderWidth: TABLE_BORDER_PX }}
                >
                  <colgroup>
                    {SIGN_IN_SHEET_COLUMNS.map(({ key, widthPercent }) => (
                      <col key={key} style={{ width: `${widthPercent}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr
                      data-sign-in-header
                      className="bg-[#0057a6] text-[15px] uppercase leading-[1.231] text-white"
                    >
                      {SIGN_IN_SHEET_COLUMNS.map(({ key, label }) => (
                        <th
                          key={key}
                          className="border-[#0057a6] py-2 text-center align-middle font-bold"
                          style={cellStyle(key)}
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
                        <td
                          className={`${CELL} text-center align-middle`}
                          style={cellStyle('ed')}
                        >
                          {row.electionDistrict}
                        </td>
                        <td className={VALUE_CELL} style={cellStyle('name')}>
                          <FittedValue
                            value={row.name}
                            size={fitMemberNameSize(row.name)}
                            className="break-words font-bold"
                          />
                          <div className={SECOND_LINE}>[ ] Info correct</div>
                        </td>
                        <td className={VALUE_CELL} style={cellStyle('email')}>
                          <OnFileValue value={row.email} fit={fitEmailSize} />
                          <div className={SECOND_LINE}>New email:</div>
                        </td>
                        <td className={VALUE_CELL} style={cellStyle('phone')}>
                          <OnFileValue value={row.phone} fit={fitPhoneSize} />
                          <div className={SECOND_LINE}>New phone:</div>
                        </td>
                        <td className={CELL} style={cellStyle('signature')} />
                        <td className={CELL} style={cellStyle('proxyName')} />
                        <td
                          className={CELL}
                          style={cellStyle('proxySignature')}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  data-sign-in-footer
                  className="mt-auto flex w-full justify-between gap-6 pt-1 text-[12px] text-gray-500"
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
