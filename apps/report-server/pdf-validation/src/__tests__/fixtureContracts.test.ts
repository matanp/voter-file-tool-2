/**
 * Compile-time drift checks between the harness's JSON fixture types and the deployed code's
 * inputs. The harness build deliberately doesn't import apps/report-server/src (it loads the
 * deployed dist at run time), so this jest file is where a changed signature or row shape
 * becomes a type error.
 */
import type { DeployedModules } from '../callShapes';
import type { ChangesReportRow, CommitteeReportStructure, DesignationWeightSummary, PetitionOutcomeRow, SeatWeightBreakdown, VacancyReportRow } from '../../../src/committeeMappingHelpers';
import type { CommitteeRosterColumn } from '../../../src/committeeRosterConfig';
import type * as utils from '../../../src/utils';
import type { ChangesRowSpec, OutcomeRowSpec, SeatSpec, VacancyRowSpec, WeightSummarySpec } from '../fixtures/types';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertType = <T extends true>(_proof?: T) => undefined;

describe('fixture types match the deployed inputs', () => {
  it('row specs are the production row types', () => {
    assertType<Same<VacancyRowSpec, VacancyReportRow>>();
    assertType<Same<ChangesRowSpec, ChangesReportRow>>();
    assertType<Same<OutcomeRowSpec, PetitionOutcomeRow>>();
  });

  it('weight summaries differ only by the fields callShapes derives', () => {
    assertType<Same<WeightSummarySpec, Omit<DesignationWeightSummary, 'committeeListId' | 'totalContributingSeats' | 'seats'> & { seats: SeatSpec[] }>>();
    assertType<Same<SeatSpec, Omit<SeatWeightBreakdown, 'contributes' | 'contributionWeight'>>>();
  });

  it('roster columns cover the production column set', () => {
    type HarnessColumns = 'name' | 'address' | 'mailingAddress' | 'telephone' | 'email';
    assertType<Same<HarnessColumns, CommitteeRosterColumn>>();
  });

  it('the generator signatures callShapes relies on still accept its arguments', () => {
    const pdf: DeployedModules['utils']['generatePDFAndUpload'] = null as unknown as typeof utils.generatePDFAndUpload;
    const petition: (c: { name: string; address: string; office: string }[], v: { name: string; address: string }[], p: string, d: string, n: number) => string =
      null as unknown as typeof utils.generateHTML;
    const changes: (rows: ChangesReportRow[], from: string, to: string, author: string) => string = null as unknown as typeof utils.generateChangesReportHTML;
    const vacancy: (rows: VacancyReportRow[], author: string) => string = null as unknown as typeof utils.generateVacancyReportHTML;
    const outcomes: (rows: PetitionOutcomeRow[], author: string) => string = null as unknown as typeof utils.generatePetitionOutcomesReportHTML;
    const weights: (s: DesignationWeightSummary[], scope: string, author?: string) => string = null as unknown as typeof utils.generateDesignationWeightSummaryHTML;
    const committee: (groups: CommitteeReportStructure[], columns?: CommitteeRosterColumn[]) => string[] =
      null as unknown as typeof utils.generateCommitteeReportHTMLChunks;
    expect([pdf, petition, changes, vacancy, outcomes, weights, committee].every((f) => f === null)).toBe(true);
  });
});
