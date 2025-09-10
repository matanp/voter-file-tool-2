import { z } from 'zod';

// CommitteeMember schema
export const committeeMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().min(1, 'ZIP code is required'),
  phone: z.string().optional(),
});

// LDCommittees schema
export const ldCommitteesSchema = z.object({
  cityTown: z.string().min(1, 'City/Town is required'),
  legDistrict: z
    .number()
    .int()
    .positive('Legislative district must be a positive integer'),
  committees: z.record(z.array(committeeMemberSchema)),
});

// Array schema
export const ldCommitteesArraySchema = z.array(ldCommitteesSchema);

// Type inference
export type CommitteeMember = z.infer<typeof committeeMemberSchema>;
export type LDCommittees = z.infer<typeof ldCommitteesSchema>;
export type LDCommitteesArray = z.infer<typeof ldCommitteesArraySchema>;
