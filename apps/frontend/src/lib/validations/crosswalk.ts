/**
 * SRS 3.7 — Validation schemas for LTED Crosswalk admin API.
 */

import { z } from "zod";

export const crosswalkUpsertSchema = z.object({
  cityTown: z.string().trim().min(1),
  legDistrict: z.coerce.number().int().min(0),
  electionDistrict: z.coerce.number().int().min(0),
  stateAssemblyDistrict: z.string().trim().min(1),
  stateSenateDistrict: z.string().trim().optional(),
  congressionalDistrict: z.string().trim().optional(),
  countyLegDistrict: z.string().trim().optional(),
});

export const crosswalkListQuerySchema = z.object({
  cityTown: z.string().trim().optional(),
  legDistrict: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type CrosswalkUpsertInput = z.infer<typeof crosswalkUpsertSchema>;
export type CrosswalkListQuery = z.infer<typeof crosswalkListQuerySchema>;
