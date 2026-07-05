import { z } from 'zod';

export const handleCommitteeDiscrepancySchema = z.object({
  VRCNUM: z.string().min(1, 'VRCNUM is required'),
  accept: z.boolean(),
  takeAddress: z.string().optional(),
});

export const undoCommitteeDiscrepancySchema = z.object({
  VRCNUM: z.string().min(1, 'VRCNUM is required'),
});

export type HandleCommitteeDiscrepancyRequest = z.infer<
  typeof handleCommitteeDiscrepancySchema
>;
export type UndoCommitteeDiscrepancyRequest = z.infer<
  typeof undoCommitteeDiscrepancySchema
>;
