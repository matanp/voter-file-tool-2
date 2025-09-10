import { z } from 'zod';

export const defaultCustomPartyName = 'Enter Party Name';

export const candidateSchema = z.object({
  name: z.string().min(1, 'Candidate name is required'),
  office: z.string().min(1, 'Office is required'),
  address: z.string().min(1, 'Address is required'),
});

export const vacancyAppointmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
});

export const generateDesignatedPetitionDataSchema = z.object({
  candidates: z
    .array(candidateSchema)
    .min(1, { message: 'At least one candidate is required' }),
  vacancyAppointments: z
    .array(vacancyAppointmentSchema)
    .min(1, { message: 'At least one vacancy appointment is required' }),
  party: z
    .string()
    .refine(
      (val) =>
        val.trim() !== '' && val.trim() !== defaultCustomPartyName.trim(),
      {
        message: 'Party is required',
      }
    ),
  electionDate: z.string().refine((val) => val.trim() !== '', {
    message: 'Election date is required',
  }),
  numPages: z
    .number()
    .min(1, { message: 'Minimum 1 page' })
    .max(25, { message: 'No more than 25 pages allowed' }),
});

export type Candidate = z.infer<typeof candidateSchema>;
export type VacancyAppointment = z.infer<typeof vacancyAppointmentSchema>;
export type GenerateDesignatedPetitionData = z.infer<
  typeof generateDesignatedPetitionDataSchema
>;
