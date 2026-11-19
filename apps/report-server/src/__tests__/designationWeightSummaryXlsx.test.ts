import * as XLSX from 'xlsx';
import { generateDesignationWeightSummaryXLSXAndUpload } from '../xlsxGenerator';
import type { DesignationWeightSummary } from '../committeeMappingHelpers';

const uploadXLSXBufferMock = jest.fn<Promise<void>, [Buffer, string]>();

jest.mock('../utils/xlsxUtils', () => ({
  ...jest.requireActual<object>('../utils/xlsxUtils'),
  uploadXLSXBuffer: (buffer: Buffer, fileName: string) =>
    uploadXLSXBufferMock(buffer, fileName),
}));

/** Four seats, the first `petitioned` of them petitioned; seats 1 and 2 filled. */
function committee(
  electionDistrict: number,
  ltedWeight: number | null,
  petitioned: number,
): DesignationWeightSummary {
  const seats = [1, 2, 3, 4].map((seatNumber) => {
    const isPetitioned = seatNumber <= petitioned;
    const isOccupied = seatNumber <= 2;
    const contributes = isPetitioned && isOccupied && ltedWeight != null;
    return {
      seatNumber,
      isPetitioned,
      isOccupied,
      occupantMembershipType: isOccupied ? ('PETITIONED' as const) : null,
      seatWeight: ltedWeight,
      contributes,
      contributionWeight: contributes ? (ltedWeight ?? 0) : 0,
    };
  });
  return {
    committeeListId: electionDistrict,
    cityTown: 'ROCHESTER',
    legDistrict: 17,
    electionDistrict,
    ltedWeight,
    totalWeight: seats.reduce((sum, s) => sum + s.contributionWeight, 0),
    totalContributingSeats: seats.filter((s) => s.contributes).length,
    seats,
    missingWeightSeatNumbers:
      ltedWeight == null
        ? seats.filter((s) => s.isPetitioned).map((s) => s.seatNumber)
        : [],
  };
}

async function generatedRows(
  summaries: DesignationWeightSummary[],
): Promise<unknown[][]> {
  await generateDesignationWeightSummaryXLSXAndUpload(summaries, 'weights.xlsx');
  expect(uploadXLSXBufferMock).toHaveBeenCalledTimes(1);
  const [buffer] = uploadXLSXBufferMock.mock.calls[0]!;
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets['Weight Summary']!;
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
}

describe('generateDesignationWeightSummaryXLSXAndUpload', () => {
  beforeEach(() => {
    uploadXLSXBufferMock.mockReset().mockResolvedValue(undefined);
  });

  it('shows the per-seat LTED weight and the base weight for each ED', async () => {
    const [header, full, threeSeats, unweighted, subtotal, grandTotal] =
      await generatedRows([
        committee(1, 128.5, 4),
        committee(2, 80.75, 3),
        committee(3, null, 2),
      ]);

    expect(header).toEqual([
      'City/Town',
      'Leg District',
      'Election District',
      'Total Seats',
      'Petitioned Seats',
      'Occupied Petitioned',
      'Vacant Petitioned',
      'Appointed',
      'LTED Weight',
      'Base Weight',
      'Designation Weight',
      'Notes',
    ]);
    expect(full).toEqual([
      'ROCHESTER', 17, '001', 4, 4, 2, 2, 0, '128.50', '514.00', '257.00', '',
    ]);
    // Base weight counts petitioned seats, filled or not: 80.75 x 3.
    expect(threeSeats?.slice(8, 11)).toEqual(['80.75', '242.25', '161.50']);
    // No LTED weight: both weight columns are blank, and the seats are listed.
    expect(unweighted?.slice(8)).toEqual(['', '', '0.00', '1, 2']);
    expect(subtotal?.[0]).toBe('Subtotal');
    expect(subtotal?.slice(8, 11)).toEqual(['', '', '418.50']);
    expect(grandTotal?.[0]).toBe('Grand Total');
    expect(grandTotal?.slice(8, 11)).toEqual(['', '', '418.50']);
  });
});
