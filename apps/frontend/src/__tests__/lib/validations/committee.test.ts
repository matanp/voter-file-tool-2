import type { ZodTypeAny } from "zod";
import {
  removeCommitteeDataSchema,
  reportExitDataSchema,
  resignCommitteeDataSchema,
} from "~/lib/validations/committee";

const target = {
  cityTown: "Test City",
  legDistrict: 1,
  electionDistrict: 2,
  memberId: "voter-1",
};

const validRemove = { ...target, removalReason: "DECEASED" };
const validResign = {
  ...target,
  action: "RESIGN",
  resignationDateReceived: "2026-10-01",
  resignationMethod: "EMAIL",
};
const validExitResignation = {
  ...target,
  kind: "RESIGNATION",
  resignationDateReceived: "2026-10-01",
  resignationMethod: "MAIL",
};
const validExitRemoval = {
  ...target,
  kind: "REMOVAL",
  removalReason: "MOVED_OUT_OF_DISTRICT",
};

function firstIssue(schema: ZodTypeAny, body: unknown) {
  const result = schema.safeParse(body);
  if (result.success) throw new Error("expected the payload to be rejected");
  return result.error.issues[0];
}

describe.each([
  ["removeCommitteeDataSchema", removeCommitteeDataSchema, validRemove],
  ["resignCommitteeDataSchema", resignCommitteeDataSchema, validResign],
  [
    "reportExitDataSchema (resignation)",
    reportExitDataSchema,
    validExitResignation,
  ],
  ["reportExitDataSchema (removal)", reportExitDataSchema, validExitRemoval],
] as const)("%s: committee-member target", (_name, schema, valid) => {
  it("accepts a valid payload", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("trims cityTown and memberId and coerces the districts", () => {
    const result = schema.parse({
      ...valid,
      cityTown: "  Test City ",
      legDistrict: " 5 ",
      electionDistrict: "7",
      memberId: " voter-1 ",
    });
    expect(result).toMatchObject({
      cityTown: "Test City",
      legDistrict: 5,
      electionDistrict: 7,
      memberId: "voter-1",
    });
  });

  it("allows legDistrict to be omitted", () => {
    const { legDistrict: _omit, ...rest } = valid;
    const result = schema.parse(rest);
    expect(result.legDistrict).toBeUndefined();
  });

  it.each(["", "   "])("rejects a blank legDistrict (%j)", (legDistrict) => {
    expect(firstIssue(schema, { ...valid, legDistrict })).toMatchObject({
      path: ["legDistrict"],
      message: "Legislative District cannot be empty when provided",
    });
  });

  it.each([0, -1, "0"])(
    "rejects a non-positive legDistrict (%j)",
    (legDistrict) => {
      expect(firstIssue(schema, { ...valid, legDistrict })).toMatchObject({
        path: ["legDistrict"],
        message:
          "Legislative District must be a positive integer when provided",
      });
    },
  );

  it.each(["1.5", "abc", null, true, [5]])(
    "rejects a legDistrict that is not a whole number (%j)",
    (legDistrict) => {
      expect(firstIssue(schema, { ...valid, legDistrict })?.path).toEqual([
        "legDistrict",
      ]);
    },
  );

  it.each([0, "x"])(
    "rejects an invalid electionDistrict (%j)",
    (electionDistrict) => {
      expect(firstIssue(schema, { ...valid, electionDistrict })?.path).toEqual([
        "electionDistrict",
      ]);
    },
  );

  it.each(["cityTown", "memberId"] as const)("requires %s", (field) => {
    expect(firstIssue(schema, { ...valid, [field]: "  " })?.path).toEqual([
      field,
    ]);
    const { [field]: _omit, ...rest } = valid;
    expect(firstIssue(schema, rest)?.path).toEqual([field]);
  });

  it("rejects unknown keys", () => {
    expect(firstIssue(schema, { ...valid, extra: 1 })?.code).toBe(
      "unrecognized_keys",
    );
  });
});

describe("removeCommitteeDataSchema", () => {
  it("requires a removal reason", () => {
    const { removalReason: _omit, ...rest } = validRemove;
    expect(firstIssue(removeCommitteeDataSchema, rest)).toMatchObject({
      path: ["removalReason"],
      message: "Removal reason is required",
    });
  });

  it("requires notes when the reason is Other", () => {
    const body = { ...validRemove, removalReason: "OTHER", removalNotes: "  " };
    expect(firstIssue(removeCommitteeDataSchema, body)).toMatchObject({
      path: ["removalNotes"],
      message: "Notes are required when reason is Other",
    });
    expect(
      removeCommitteeDataSchema.safeParse({ ...body, removalNotes: "Why" })
        .success,
    ).toBe(true);
  });

  it("rejects resignation fields", () => {
    expect(
      removeCommitteeDataSchema.safeParse({
        ...validRemove,
        resignationMethod: "EMAIL",
      }).success,
    ).toBe(false);
  });
});

describe("resignCommitteeDataSchema", () => {
  it("requires the RESIGN action", () => {
    expect(
      firstIssue(resignCommitteeDataSchema, {
        ...validResign,
        action: "REMOVE",
      })?.path,
    ).toEqual(["action"]);
  });

  it.each(["resignationDateReceived", "resignationMethod"] as const)(
    "requires %s",
    (field) => {
      const { [field]: _omit, ...rest } = validResign;
      expect(firstIssue(resignCommitteeDataSchema, rest)?.path).toEqual([
        field,
      ]);
    },
  );

  it("rejects an invalid date received", () => {
    expect(
      firstIssue(resignCommitteeDataSchema, {
        ...validResign,
        resignationDateReceived: "not a date",
      }),
    ).toMatchObject({
      path: ["resignationDateReceived"],
      message: "Resignation date must be a valid date",
    });
  });

  it("rejects a removal reason", () => {
    expect(
      firstIssue(resignCommitteeDataSchema, {
        ...validResign,
        removalReason: "OTHER",
      })?.code,
    ).toBe("unrecognized_keys");
  });
});

describe("reportExitDataSchema", () => {
  it("requires a kind", () => {
    const { kind: _omit, ...rest } = validExitRemoval;
    expect(firstIssue(reportExitDataSchema, rest)).toMatchObject({
      path: ["kind"],
      message: "Choose resignation or removal",
    });
  });

  it("requires the date and method for a resignation", () => {
    const result = reportExitDataSchema.safeParse({
      ...target,
      kind: "RESIGNATION",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path)).toEqual([
      ["resignationDateReceived"],
      ["resignationMethod"],
    ]);
  });

  it("rejects a reason on a resignation", () => {
    expect(
      firstIssue(reportExitDataSchema, {
        ...validExitResignation,
        removalReason: "OTHER",
      }),
    ).toMatchObject({
      path: ["removalReason"],
      message: "A resignation has no reason; use notes instead",
    });
  });

  it("requires a reason for a removal", () => {
    const { removalReason: _omit, ...rest } = validExitRemoval;
    expect(firstIssue(reportExitDataSchema, rest)).toMatchObject({
      path: ["removalReason"],
      message: "Reason is required",
    });
  });

  it("requires notes for a removal with reason Other", () => {
    const body = { ...validExitRemoval, removalReason: "OTHER" };
    expect(firstIssue(reportExitDataSchema, body)).toMatchObject({
      path: ["removalNotes"],
      message: "Notes are required when reason is Other",
    });
    expect(
      reportExitDataSchema.safeParse({ ...body, removalNotes: "Why" }).success,
    ).toBe(true);
  });

  it("rejects resignation details on a removal", () => {
    expect(
      firstIssue(reportExitDataSchema, {
        ...validExitRemoval,
        resignationMethod: "EMAIL",
      }),
    ).toMatchObject({
      path: ["kind"],
      message: "Date received and method apply only to a resignation",
    });
  });
});
