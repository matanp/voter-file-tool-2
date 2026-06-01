import React from 'react';
import type { VacancyReportRow } from '../committeeMappingHelpers';

interface VacancyReportProps {
  rows: VacancyReportRow[];
  reportAuthor: string;
}

/** Groups vacancy rows by cityTown + legDistrict for subtotals */
function groupByCityLd(
  rows: VacancyReportRow[],
): { key: string; cityTown: string; legDistrict: number; rows: VacancyReportRow[] }[] {
  const map = new Map<string, { key: string; cityTown: string; legDistrict: number; rows: VacancyReportRow[] }>();
  for (const r of rows) {
    const key = `${r.cityTown}|${r.legDistrict}`;
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(r);
    } else {
      map.set(key, { key, cityTown: r.cityTown, legDistrict: r.legDistrict, rows: [r] });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      a.cityTown.localeCompare(b.cityTown) || a.legDistrict - b.legDistrict,
  );
}

/**
 * Vacancy report PDF — landscape table grouped by city/LD with subtotals and grand total.
 */
function VacancyReport({ rows, reportAuthor }: VacancyReportProps) {
    const groups = groupByCityLd(rows);
    const generationDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let grandTotalSeats = 0;
    let grandFilled = 0;
    let grandVacant = 0;
    let grandPetitioned = 0;
    let grandVacantPetitioned = 0;
    let grandNonPetitioned = 0;

    for (const r of rows) {
      grandTotalSeats += r.totalSeats;
      grandFilled += r.filledSeats;
      grandVacant += r.vacantSeats;
      grandPetitioned += r.petitionedSeats;
      grandVacantPetitioned += r.vacantPetitionedSeats;
      grandNonPetitioned += r.nonPetitionedSeats;
    }

    return (
      <div className="w-[11in] h-[8.5in] p-6 font-sans bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
        <h1 className="text-xl font-bold mb-4">Vacancy Report</h1>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-left">ED</th>
              <th className="border border-gray-400 px-2 py-1 text-right">Total Seats</th>
              <th className="border border-gray-400 px-2 py-1 text-right">Filled</th>
              <th className="border border-gray-400 px-2 py-1 text-right">Vacant</th>
              <th className="border border-gray-400 px-2 py-1 text-right">Petitioned (Filled)</th>
              <th className="border border-gray-400 px-2 py-1 text-right">Petitioned (Vacant)</th>
              <th className="border border-gray-400 px-2 py-1 text-right">Non-Petitioned</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              let subTotal = 0;
              let subFilled = 0;
              let subVacant = 0;
              let subPetitioned = 0;
              let subVacantPetitioned = 0;
              let subNonPetitioned = 0;
              for (const r of g.rows) {
                subTotal += r.totalSeats;
                subFilled += r.filledSeats;
                subVacant += r.vacantSeats;
                subPetitioned += r.petitionedSeats;
                subVacantPetitioned += r.vacantPetitionedSeats;
                subNonPetitioned += r.nonPetitionedSeats;
              }
              return (
                <React.Fragment key={`${g.cityTown}-${g.legDistrict}`}>
                  <tr className="bg-gray-50 font-medium">
                    <td colSpan={7} className="border border-gray-400 px-2 py-1">
                      {g.cityTown}, LD {g.legDistrict}
                    </td>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={`${r.cityTown}-${r.legDistrict}-${r.electionDistrict}`}>
                      <td className="border border-gray-400 px-2 py-1">{r.electionDistrict}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{r.totalSeats}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{r.filledSeats}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{r.vacantSeats}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right">
                        {r.petitionedSeats - r.vacantPetitionedSeats}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{r.vacantPetitionedSeats}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{r.nonPetitionedSeats}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-medium">
                    <td className="border border-gray-400 px-2 py-1">Subtotal</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{subTotal}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{subFilled}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{subVacant}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">
                      {subPetitioned - subVacantPetitioned}
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{subVacantPetitioned}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{subNonPetitioned}</td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="bg-gray-200 font-bold">
              <td className="border border-gray-400 px-2 py-1">Grand Total</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{grandTotalSeats}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{grandFilled}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{grandVacant}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">
                {grandPetitioned - grandVacantPetitioned}
              </td>
              <td className="border border-gray-400 px-2 py-1 text-right">{grandVacantPetitioned}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{grandNonPetitioned}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 flex justify-between text-xs">
          <span>{generationDate}</span>
          <span>{reportAuthor}</span>
        </div>
      </div>
    );
}

VacancyReport.displayName = 'VacancyReport';
export default VacancyReport;
