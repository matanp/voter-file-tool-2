import { AuditAction, PrivilegeLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findActiveTerm } from "~/app/api/lib/committeeValidation";
import {
  reconcileSeatsForMaxSeatsChange,
  SeatDecreaseConflictError,
  type SeatReconciliationSummary,
} from "~/app/api/lib/seatReconciliation";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import prisma from "~/lib/prisma";
import {
  GOVERNANCE_MAX_SEATS_GUARDRAILS,
  governanceConfigUpdateSchema,
  type GovernanceConfigUpdateInput,
} from "~/lib/validations/governanceConfig";

const DEFAULT_CONFIG_ID = "mcdc-default";

type GovernanceConfigApiPayload = GovernanceConfigUpdateInput & {
  updatedAt: string;
};

function normalizePartyOptions(parties: readonly string[]): string[] {
  return [...new Set(parties.map((party) => party.trim()).filter(Boolean))].sort();
}

async function getPartyOptions(): Promise<string[]> {
  const dropdownLists = await prisma.dropdownLists.findFirst({
    orderBy: { id: "asc" },
    select: { party: true },
  });
  return normalizePartyOptions(dropdownLists?.party ?? []);
}

function toApiPayload(config: {
  requiredPartyCode: string;
  maxSeatsPerLted: number;
  requireAssemblyDistrictMatch: boolean;
  nonOverridableIneligibilityReasons: GovernanceConfigUpdateInput["nonOverridableIneligibilityReasons"];
  updatedAt: Date;
}): GovernanceConfigApiPayload {
  return {
    requiredPartyCode: config.requiredPartyCode,
    maxSeatsPerLted: config.maxSeatsPerLted,
    requireAssemblyDistrictMatch: config.requireAssemblyDistrictMatch,
    nonOverridableIneligibilityReasons:
      config.nonOverridableIneligibilityReasons,
    updatedAt: config.updatedAt.toISOString(),
  };
}

function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors = error.flatten().fieldErrors;
  const sortedKeys = Object.keys(fieldErrors).sort((a, b) =>
    a.localeCompare(b),
  );
  const result: Record<string, string[]> = {};

  for (const key of sortedKeys) {
    const messages = fieldErrors[key];
    if (!messages) continue;
    const normalized = messages.filter(
      (message): message is string => typeof message === "string",
    );
    if (normalized.length === 0) continue;
    result[key] = normalized;
  }

  return result;
}

function validationErrorResponse(
  fieldErrors: Record<string, string[]>,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      fieldErrors,
    },
    { status: 422 },
  );
}

async function getHandler(_req: NextRequest, _session: SessionWithUser) {
  const [config, partyOptions] = await Promise.all([
    prisma.committeeGovernanceConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    }),
    getPartyOptions(),
  ]);

  if (!config) {
    return NextResponse.json(
      { error: "CommitteeGovernanceConfig not found — run seed" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      config: toApiPayload(config),
      partyOptions,
      guardrails: GOVERNANCE_MAX_SEATS_GUARDRAILS,
    },
    { status: 200 },
  );
}

async function patchHandler(req: NextRequest, session: SessionWithUser) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = governanceConfigUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(toFieldErrors(parsed.error));
  }

  const partyOptions = await getPartyOptions();
  const requiredPartyCode = parsed.data.requiredPartyCode.trim();

  if (partyOptions.length === 0) {
    return validationErrorResponse({
      requiredPartyCode: [
        "No party codes are available in DropdownLists.party; import dropdown data first",
      ],
    });
  }

  if (!partyOptions.includes(requiredPartyCode)) {
    return validationErrorResponse({
      requiredPartyCode: [
        "requiredPartyCode must match a value from DropdownLists.party",
      ],
    });
  }

  const currentConfigPreview = await prisma.committeeGovernanceConfig.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const maxSeatsChanged =
    currentConfigPreview != null &&
    currentConfigPreview.maxSeatsPerLted !== parsed.data.maxSeatsPerLted;

  let activeTermId: string | null = null;
  if (maxSeatsChanged) {
    const activeTerm = await findActiveTerm();
    if (!activeTerm) {
      return validationErrorResponse({
        maxSeatsPerLted: [
          "Cannot change maxSeatsPerLted without an active committee term",
        ],
      });
    }
    activeTermId = activeTerm.id;
  }

  let savedConfig;
  try {
    savedConfig = await prisma.$transaction(
      async (tx) => {
        const rows = await tx.committeeGovernanceConfig.findMany({
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        });

        const currentConfig = rows[0] ?? null;

        // Defensive cleanup: singleton index should prevent duplicates, but we keep one
        // canonical row enforceable at runtime if legacy data exists.
        if (rows.length > 1 && currentConfig) {
          await tx.committeeGovernanceConfig.deleteMany({
            where: { id: { not: currentConfig.id } },
          });
        }

        const updateData: GovernanceConfigUpdateInput = {
          requiredPartyCode,
          maxSeatsPerLted: parsed.data.maxSeatsPerLted,
          requireAssemblyDistrictMatch: parsed.data.requireAssemblyDistrictMatch,
          nonOverridableIneligibilityReasons:
            parsed.data.nonOverridableIneligibilityReasons,
        };

        const beforePayload = currentConfig ? toApiPayload(currentConfig) : null;

        let reconciliationSummary: SeatReconciliationSummary | null = null;
        if (
          maxSeatsChanged &&
          activeTermId != null &&
          currentConfig != null
        ) {
          reconciliationSummary = await reconcileSeatsForMaxSeatsChange(tx, {
            termId: activeTermId,
            oldMaxSeats: currentConfig.maxSeatsPerLted,
            newMaxSeats: parsed.data.maxSeatsPerLted,
          });
        }

        const persisted = currentConfig
          ? await tx.committeeGovernanceConfig.update({
              where: { id: currentConfig.id },
              data: updateData,
            })
          : await tx.committeeGovernanceConfig.create({
              data: {
                id: DEFAULT_CONFIG_ID,
                ...updateData,
              },
            });

        const afterPayload = toApiPayload(persisted);
        await logAuditEventOrThrow(
          session.user.id,
          session.user.privilegeLevel ?? PrivilegeLevel.Admin,
          AuditAction.GOVERNANCE_CONFIG_UPDATED,
          "CommitteeGovernanceConfig",
          persisted.id,
          beforePayload,
          afterPayload,
          {
            source: "admin_governance_config",
            ...(reconciliationSummary
              ? { reconciliation: reconciliationSummary }
              : {}),
          },
          tx,
        );

        return persisted;
      },
      maxSeatsChanged ? { timeout: 30_000, maxWait: 10_000 } : undefined,
    );
  } catch (error: unknown) {
    if (error instanceof SeatDecreaseConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          conflict: error.details,
        },
        { status: 409 },
      );
    }
    throw error;
  }

  return NextResponse.json(
    {
      config: toApiPayload(savedConfig),
      partyOptions,
      guardrails: GOVERNANCE_MAX_SEATS_GUARDRAILS,
    },
    { status: 200 },
  );
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getHandler);
export const PATCH = withPrivilege(PrivilegeLevel.Admin, patchHandler);
