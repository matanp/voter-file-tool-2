import type { PartialVoterRecordAPI } from './voterRecord';

export type VoterRecordField = keyof PartialVoterRecordAPI;

export type LDCommittees = {
  cityTown: string;
  legDistrict: number;
  committees: Record<string, PartialVoterRecordAPI[]>;
};

export type LDCommitteesArrayWithFields = LDCommittees[];
