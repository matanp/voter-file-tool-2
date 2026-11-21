import type { ReportWarningsMetadata } from '@voter-file-tool/shared-validators';
import {
  petitionOverflowWarnings,
  readPetitionOverflowSheets,
  type PetitionOverflowPage,
} from './petitionFit';

type Candidate = { name: string; address: string; office: string };
type Appointee = { name: string; address: string };

export type PetitionJobInput = {
  candidates: Candidate[];
  vacancyAppointments: Appointee[];
  party: string;
  electionDate: string;
  numPages: number;
};

export type PetitionJobDeps = {
  generateHTML: (
    candidates: Candidate[],
    vacancyAppointments: Appointee[],
    party: string,
    electionDate: string,
    numPages: number,
  ) => string;
  generatePDFAndUpload: (
    html: string,
    useLandscape: boolean,
    fileName: string,
    overrides: undefined,
    inspectPage: (page: PetitionOverflowPage) => Promise<void>,
  ) => Promise<void>;
};

/**
 * Renders and uploads a designating petition. A sheet the fit script can't keep on one
 * page is still printed (failing would leave the user with nothing); it is logged and
 * returned as a warning for the report's metadata. If reading the overflow fails, the
 * PDF is still uploaded, with no warning.
 */
export async function processPetitionJob(
  input: PetitionJobInput,
  fileName: string,
  deps: PetitionJobDeps,
): Promise<{ metadata?: ReportWarningsMetadata }> {
  const html = deps.generateHTML(
    input.candidates,
    input.vacancyAppointments,
    input.party,
    input.electionDate,
    input.numPages,
  );
  let overflowSheets: number[] = [];
  await deps.generatePDFAndUpload(
    html,
    false,
    fileName,
    undefined,
    async (page) => {
      // Reading the warning must never fail the job: on error, print without one.
      try {
        overflowSheets = await readPetitionOverflowSheets(page);
      } catch (error) {
        console.error(
          `designated petition ${fileName}: could not read sheet overflow; continuing without a warning`,
          error,
        );
      }
    },
  );
  const warnings = petitionOverflowWarnings(overflowSheets, input.numPages);
  if (warnings.length === 0) return {};
  console.warn(
    `designated petition ${fileName}: sheet(s) ${overflowSheets.join(', ')} overflow one page: ${warnings.join(' ')}`,
  );
  return { metadata: { warnings } };
}
