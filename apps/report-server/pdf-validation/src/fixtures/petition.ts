import { PAPER } from '../common';
import type { Fixture, FixtureFamily, FixtureInput } from './types';

type PetitionInput = Extract<FixtureInput, { jobType: 'designatedPetition' }>;

const LONG_ADDRESS = '12345 NORTH WINTON ROAD EXTENSION SOUTHWEST, APARTMENT 1234, ROCHESTER, NY 14618-1234';
const LONG_OFFICE = 'Member of the Democratic County Committee from the 123rd Election District of the Town of Brighton';

function petitionFixture(id: string, tier: Fixture['tier'], purpose: string, input: Omit<PetitionInput, 'jobType' | 'party' | 'electionDate'>): Fixture {
  const full: PetitionInput = { jobType: 'designatedPetition', party: 'Democratic', electionDate: '2026-06-23', ...input };
  // Each requested sheet is one Legal page and repeats every candidate and appointee once.
  const tokens = [...full.candidates.map((c) => c.name.split(' ')[0]!), ...full.vacancyAppointments.map((a) => a.name.split(' ')[0]!)];
  const pages = Array.from({ length: full.numPages }, (_, i) => i + 1);
  return {
    id,
    tier,
    purpose,
    input: full,
    expect: {
      paper: PAPER.legalPortrait,
      pages: full.numPages,
      pageTokens: pages.map(() => tokens),
      tokenCounts: Object.fromEntries(tokens.map((t) => [t, full.numPages])),
      orderedTokens: tokens,
      required: ['Designating Petition', 'Sec. 6-132, Election Law', 'enrolled voter of the Democratic Party', 'June 23rd, 2026'],
      requiredOnPage: pages.map((page) => ({ page, text: `Sheet No. ${page}` })),
      reviewNotes: ['Paragraphs may wrap one word differently between browsers (PR #148); content and line count must hold.'],
    },
  };
}

const candidate = (i: number, long = false) => ({
  name: `PETC${String(i).padStart(4, '0')} ${long ? 'ALEXANDRA-KATHERINE MONTGOMERY-WORTHINGTON III' : 'TESTER'}`,
  address: long ? LONG_ADDRESS : `${i} MAIN ST, ROCHESTER, NY 14604`,
  office: long ? LONG_OFFICE : 'County Committee',
});
const appointee = (i: number, long = false) => ({
  name: `PETV${String(i).padStart(4, '0')} ${long ? 'BARTHOLOMEW-MAXIMILIAN FITZWILLIAM' : 'TESTER'}`,
  address: long ? LONG_ADDRESS : `${i} ELM ST, ROCHESTER, NY 14604`,
});

export const petitionFamily: FixtureFamily = {
  family: 'designating-petition',
  jobTypes: ['designatedPetition'],
  fixtures: [
    petitionFixture('petition-quick', 'quick', '1 sheet, short candidate and appointee values', {
      candidates: [candidate(1), candidate(2)],
      vacancyAppointments: [appointee(1), appointee(2), appointee(3)],
      numPages: 1,
    }),
    petitionFixture('petition-10-long', 'full', '10 sheets, long candidate/office/address values and appointees; sheet numbering and paragraph wrapping', {
      candidates: [candidate(11, true), candidate(12, true), candidate(13)],
      vacancyAppointments: [appointee(11, true), appointee(12, true), appointee(13)],
      numPages: 10,
    }),
  ],
};
