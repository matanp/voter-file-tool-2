import type { EnrichedPartialVoterRecordAPI } from '@voter-file-tool/shared-validators';
import type { CommitteeReportStructure } from '../../committeeMappingHelpers';

/** A synthetic member: fixed-width tokens, a 555 phone, nothing from real voter data. */
export function syntheticMember(n: number): EnrichedPartialVoterRecordAPI {
  return {
    VRCNUM: `V${String(n).padStart(8, '0')}`,
    firstName: `MEMBER${String(n).padStart(5, '0')}`,
    lastName: 'TESTER',
    houseNum: n,
    street: 'MAIN ST',
    city: 'ROCHESTER',
    state: 'NY',
    zipCode: '14604',
    telephone: `(585)555-${String(n % 10_000).padStart(4, '0')}`,
  } as EnrichedPartialVoterRecordAPI;
}

/**
 * `lds` Rochester legislative districts with `edsPerLd` EDs of `membersPerEd` members each.
 * Each LD starts a new page, so a small `edsPerLd * (membersPerEd + 1)` gives one page per LD.
 */
export function syntheticCommittees(
  lds: number,
  edsPerLd: number,
  membersPerEd: number,
): CommitteeReportStructure[] {
  let n = 1;
  return Array.from({ length: lds }, (_, ld) => ({
    cityTown: 'ROCHESTER',
    legDistrict: ld + 1,
    committees: Object.fromEntries(
      Array.from({ length: edsPerLd }, (_, ed) => [
        String(ed + 1),
        Array.from({ length: membersPerEd }, () => syntheticMember(n++)),
      ]),
    ),
  }));
}
