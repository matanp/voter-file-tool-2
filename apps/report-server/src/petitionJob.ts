import type { Page } from 'puppeteer';
import type { ReportWarningsMetadata } from '@voter-file-tool/shared-validators';
import {
  petitionOverflowWarnings,
  readPetitionOverflowSheets,
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
    inspectPage: (page: Page) => Promise<void>,
  ) => Promise<void>;
};

/**
 * Renders and uploads a designating petition. A sheet the fit script can't keep on one
 * page is still printed (failing would leave the user with nothing); it is logged and
 * returned as a warning for the report's metadata.
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
      overflowSheets = await readPetitionOverflowSheets(page);
    },
  );
  const warnings = petitionOverflowWarnings(overflowSheets, input.numPages);
  if (warnings.length === 0) return {};
  console.warn(
    `designated petition ${fileName}: sheet(s) ${overflowSheets.join(', ')} overflow one page: ${warnings.join(' ')}`,
  );
  return { metadata: { warnings } };
}
