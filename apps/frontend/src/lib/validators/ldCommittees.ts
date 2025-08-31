import { z } from "zod";

// CommitteeMember schema
const committeeMemberSchema = z.object({
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  phone: z.string(),
});

export type CommitteeMember = z.infer<typeof committeeMemberSchema>;

// LDCommittees schema
export const ldCommitteesSchema = z.object({
  cityTown: z.string(),
  legDistrict: z.number(),
  committees: z.record(z.array(committeeMemberSchema)),
});

// Array schema
export const ldCommitteesArraySchema = z.array(ldCommitteesSchema);

// Type inference
export type LDCommittees = z.infer<typeof ldCommitteesSchema>;
export type LDCommitteesArray = z.infer<typeof ldCommitteesArraySchema>;
