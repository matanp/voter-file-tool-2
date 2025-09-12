import type { VoterRecord } from '@voter-file-tool/shared-prisma';
import type { PartialVoterRecordAPI } from './voterRecord';

export type VoterRecordField = keyof VoterRecord;

export type LDCommittees = {
  cityTown: string;
  legDistrict: number;
  committees: Record<string, PartialVoterRecordAPI[]>;
};

export type LDCommitteesArrayWithFields = LDCommittees[];
