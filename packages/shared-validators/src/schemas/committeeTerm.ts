import { z } from 'zod';

const calendarDateStringSchema = z
  .string()
  .min(1, 'Date is required')
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date',
  });

/** Shared create/update payload for committee terms (label + calendar dates). */
export const committeeTermFieldsSchema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  startDate: calendarDateStringSchema,
  endDate: calendarDateStringSchema,
});

export const createTermSchema = committeeTermFieldsSchema;
export const updateTermSchema = committeeTermFieldsSchema;

export type CommitteeTermFields = z.infer<typeof committeeTermFieldsSchema>;
