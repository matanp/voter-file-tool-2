import { canonicalJson, sha256 } from '../common';
import { committeeFamily } from './committee';
import { petitionFamily } from './petition';
import { signInFamily } from './signIn';
import { changesFamily, outcomesFamily, vacancyFamily } from './tables';
import type { Fixture, FixtureFamily, PdfJobType } from './types';
import { weightSummaryFamily } from './weightSummary';
import { FIXED_NOW, REPORT_AUTHOR } from './shared';

/** Bump when the meaning of a fixture changes; every fixture's hash covers it too. */
export const FIXTURE_MANIFEST_VERSION = 1;

/** The fixed rendering context every fixture shares; part of each fixture hash. */
export const RENDER_CONTEXT = { now: FIXED_NOW, timeZone: 'UTC', locale: 'en-US', author: REPORT_AUTHOR } as const;

export const FAMILIES: FixtureFamily[] = [
  committeeFamily,
  signInFamily,
  weightSummaryFamily,
  vacancyFamily,
  changesFamily,
  outcomesFamily,
  petitionFamily,
];

export type ManifestFixture = Fixture & { family: string; hash: string };

export function fixtureHash(fixture: Fixture): string {
  return sha256(canonicalJson({ version: FIXTURE_MANIFEST_VERSION, context: RENDER_CONTEXT, fixture }));
}

export const ALL_FIXTURES: ManifestFixture[] = FAMILIES.flatMap((family) =>
  family.fixtures.map((fixture) => ({ ...fixture, family: family.family, hash: fixtureHash(fixture) })),
);

export function fixtureById(id: string): ManifestFixture {
  const fixture = ALL_FIXTURES.find((f) => f.id === id);
  if (!fixture) throw new Error(`Unknown fixture ${id}`);
  return fixture;
}

/** Quick mode: one small fixture per PDF job type. Full mode: quick plus every boundary/stress fixture. */
export function fixturesFor(mode: 'quick' | 'full'): ManifestFixture[] {
  return ALL_FIXTURES.filter((f) => mode === 'full' || f.tier === 'quick');
}

export function jobTypesCovered(fixtures: Fixture[]): Set<PdfJobType> {
  return new Set(fixtures.map((f) => f.input.jobType));
}
