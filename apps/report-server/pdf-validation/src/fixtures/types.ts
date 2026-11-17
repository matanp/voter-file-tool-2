import type { Paper } from '../common';

/**
 * Fixture inputs are plain JSON. The worker turns them into the arguments the deployed
 * generators take (see ../callShapes.ts). These types mirror the deployed inputs; the
 * jest test `fixtureContracts.test.ts` fails if they drift from apps/report-server/src.
 */

export const PDF_JOB_TYPES = [
  'ldCommittees',
  'committeeRoster',
  'signInSheet',
  'designationWeightSummary',
  'vacancyReport',
  'changesReport',
  'petitionOutcomesReport',
  'designatedPetition',
] as const;
export type PdfJobType = (typeof PDF_JOB_TYPES)[number];

export type MailingSpec = { lines: string[]; city: string; state: string; zip: string };

/** One synthetic voter. Everything not given is derived from `n`, so `n` is the row token. */
export type MemberSpec = {
  n: number;
  first?: string;
  middle?: string | null;
  last?: string;
  suffix?: string | null;
  houseNum?: number;
  street?: string;
  telephone?: string | null;
  email?: string | null;
  mailing?: MailingSpec | null;
};

export type CommitteeSpec = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  members: MemberSpec[];
};

export type Scope = 'jurisdiction' | 'countywide';

export type SeatSpec = {
  seatNumber: number;
  isPetitioned: boolean;
  isOccupied: boolean;
  occupantMembershipType: 'PETITIONED' | 'APPOINTED' | null;
  seatWeight: number | null;
};

export type WeightSummarySpec = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  totalWeight: number;
  seats: SeatSpec[];
  missingWeightSeatNumbers: number[];
};

export type VacancyRowSpec = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  totalSeats: number;
  filledSeats: number;
  vacantSeats: number;
  petitionedSeats: number;
  vacantPetitionedSeats: number;
  nonPetitionedSeats: number;
};

export const CHANGE_TYPES = ['Added', 'Resigned', 'Removed', 'Confirmed', 'Petition Won', 'Petition Lost'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export type ChangesRowSpec = {
  memberName: string;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  changeType: ChangeType;
  changeDate: string;
  details: string;
};

export type Outcome = 'Won' | 'Unopposed' | 'Lost' | 'Tie';

export type OutcomeRowSpec = {
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  seatNumber: number;
  candidateName: string;
  voteCount: number | null;
  outcome: Outcome;
  primaryDate: string | null;
};

export type FixtureInput =
  | { jobType: 'ldCommittees'; committees: CommitteeSpec[] }
  | {
      jobType: 'committeeRoster';
      committees: CommitteeSpec[];
      /** As the job payload sends them: only `telephone` and `email` turn columns on. */
      includeFields: string[];
      includeCompoundFields: { name: boolean; address: boolean; mailingAddress: boolean };
    }
  | {
      jobType: 'signInSheet';
      committees: CommitteeSpec[];
      scope: Scope;
      cityTown?: string;
      legDistrict?: number;
      meetingName?: string;
      meetingDate?: string;
      /** ISO timestamp of the latest voter import, or null to fall back to the frozen clock. */
      latestImportCompletedAt: string | null;
    }
  | {
      jobType: 'designationWeightSummary';
      scope: Scope;
      cityTown?: string;
      legDistrict?: number;
      summaries: WeightSummarySpec[];
    }
  | { jobType: 'vacancyReport'; rows: VacancyRowSpec[] }
  | { jobType: 'changesReport'; dateFrom: string; dateTo: string; rows: ChangesRowSpec[] }
  | { jobType: 'petitionOutcomesReport'; rows: OutcomeRowSpec[] }
  | {
      jobType: 'designatedPetition';
      candidates: { name: string; address: string; office: string }[];
      vacancyAppointments: { name: string; address: string }[];
      party: string;
      electionDate: string;
      numPages: number;
    };

/** Background colour expected behind a word, sampled from the rasterized page. */
export type ColorSample = { word: string; expected: 'green' | 'amber' | 'white'; occurrences: number };

export type Expectations = {
  paper: Paper;
  /**
   * The page count when it follows from the fixture alone. `browser-paginated` means the
   * browser decides (a single flowing table); the count then comes from an approved
   * full-Chrome reference in baselines/approvals.json, or the check is needs-review.
   */
  pages: number | 'browser-paginated';
  /** Tokens on each page, in reading order. Only for deterministic pagination. */
  pageTokens?: string[][];
  /** Token -> exact number of occurrences in the whole document. */
  tokenCounts: Record<string, number>;
  /** Tokens that must appear in this order across the document (first occurrence of each). */
  orderedTokens: string[];
  /** Normalized substrings that must appear somewhere in the document. */
  required: string[];
  /** Normalized substrings that must appear on a specific page (1-based). */
  requiredOnPage?: { page: number; text: string }[];
  /** Normalized substrings that must not appear anywhere. */
  forbidden?: string[];
  colorSamples?: ColorSample[];
  /**
   * Roster columns whose long values may be cut with an ellipsis. Truncation never excuses a
   * missing token: tokens are placed at the start of each value so they survive it.
   */
  allowedTruncation?: string[];
  /** Things the human and LLM review must look at for this fixture. */
  reviewNotes?: string[];
};

export type Fixture = {
  id: string;
  tier: 'quick' | 'full';
  purpose: string;
  input: FixtureInput;
  expect: Expectations;
};

export type FixtureFamily = {
  family: string;
  jobTypes: PdfJobType[];
  fixtures: Fixture[];
};
