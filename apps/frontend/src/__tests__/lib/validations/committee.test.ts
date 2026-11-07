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
  const [issue] = result.error.issues;
  if (!issue) throw new Error("expected at least one issue");
  return issue;
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
  it("should accept the payload when all fields are valid", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("should normalize the target fields when strings need trimming or coercion", () => {
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

  it("should preserve legDistrict when it is already a number", () => {
    expect(schema.parse({ ...valid, legDistrict: 3 }).legDistrict).toBe(3);
  });

  it("should accept the payload when legDistrict is omitted", () => {
    const { legDistrict: _omit, ...rest } = valid;
    const result = schema.parse(rest);
    expect(result.legDistrict).toBeUndefined();
  });

  it.each(["", "   "])(
    "should reject the payload when legDistrict is blank (%j)",
    (legDistrict) => {
      expect(firstIssue(schema, { ...valid, legDistrict })).toMatchObject({
        path: ["legDistrict"],
        message: "Legislative District cannot be empty when provided",
      });
    },
  );

  it.each([0, -1, "0"])(
    "should reject the payload when legDistrict is non-positive (%j)",
    (legDistrict) => {
      expect(firstIssue(schema, { ...valid, legDistrict })).toMatchObject({
        path: ["legDistrict"],
        message:
          "Legislative District must be a positive integer when provided",
      });
    },
  );

  it.each(["1.5", "abc"])(
    "should reject the payload when legDistrict is not a whole number (%j)",
    (legDistrict) => {
      expect(firstIssue(schema, { ...valid, legDistrict }).path).toEqual([
        "legDistrict",
      ]);
    },
  );

  it.each([null, true, false, [5], ["5"], {}])(
    "should reject the payload when legDistrict is neither a string nor a number (%j)",
    (legDistrict) => {
      expect(firstIssue(schema, { ...valid, legDistrict }).path).toEqual([
        "legDistrict",
      ]);
    },
  );

  it("should reject the payload when electionDistrict is missing", () => {
    const { electionDistrict: _omit, ...rest } = valid;
    expect(firstIssue(schema, rest).path).toEqual(["electionDistrict"]);
  });

  it.each([0, "x", null])(
    "should reject the payload when electionDistrict is invalid (%j)",
    (electionDistrict) => {
      expect(firstIssue(schema, { ...valid, electionDistrict }).path).toEqual([
        "electionDistrict",
      ]);
    },
  );

  it.each(["cityTown", "memberId"] as const)(
    "should reject the payload when %s is blank or missing",
    (field) => {
      expect(firstIssue(schema, { ...valid, [field]: "  " }).path).toEqual([
        field,
      ]);
      const { [field]: _omit, ...rest } = valid;
      expect(firstIssue(schema, rest).path).toEqual([field]);
    },
  );

  it("should reject the payload when it contains unknown keys", () => {
    expect(firstIssue(schema, { ...valid, extra: 1 }).code).toBe(
      "unrecognized_keys",
    );
  });
});

describe("removeCommitteeDataSchema", () => {
  it("should reject the payload when the removal reason is missing", () => {
    const { removalReason: _omit, ...rest } = validRemove;
    expect(firstIssue(removeCommitteeDataSchema, rest)).toMatchObject({
      path: ["removalReason"],
      message: "Removal reason is required",
    });
  });

  it("should require notes when the removal reason is Other", () => {
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

  it("should reject the payload when it contains resignation fields", () => {
    expect(
      firstIssue(removeCommitteeDataSchema, {
        ...validRemove,
        resignationMethod: "EMAIL",
      }).code,
    ).toBe("unrecognized_keys");
  });
});

describe("resignCommitteeDataSchema", () => {
  it("should reject the payload when the action is not RESIGN", () => {
    expect(
      firstIssue(resignCommitteeDataSchema, {
        ...validResign,
        action: "REMOVE",
      }).path,
    ).toEqual(["action"]);
    const { action: _omit, ...rest } = validResign;
    expect(firstIssue(resignCommitteeDataSchema, rest).path).toEqual([
      "action",
    ]);
  });

  it.each(["resignationDateReceived", "resignationMethod"] as const)(
    "should reject the payload when %s is missing",
    (field) => {
      const { [field]: _omit, ...rest } = validResign;
      expect(firstIssue(resignCommitteeDataSchema, rest).path).toEqual([field]);
    },
  );

  it("should reject the payload when the received date is invalid", () => {
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

  it("should reject the payload when it contains a removal reason", () => {
    expect(
      firstIssue(resignCommitteeDataSchema, {
        ...validResign,
        removalReason: "OTHER",
      }).code,
    ).toBe("unrecognized_keys");
  });
});

describe("reportExitDataSchema", () => {
  it("should reject the payload when the exit kind is missing", () => {
    const { kind: _omit, ...rest } = validExitRemoval;
    expect(firstIssue(reportExitDataSchema, rest)).toMatchObject({
      path: ["kind"],
      message: "Choose resignation or removal",
    });
  });

  it("should require the date and method when the exit is a resignation", () => {
    const result = reportExitDataSchema.safeParse({
      ...target,
      kind: "RESIGNATION",
    });
    expect(result.success).toBe(false);
    expect(
      result.error?.issues.map(({ path, message }) => ({ path, message })),
    ).toEqual([
      {
        path: ["resignationDateReceived"],
        message: "Resignation date received is required",
      },
      {
        path: ["resignationMethod"],
        message: "How the resignation was received is required",
      },
    ]);
  });

  it("should reject the payload when a resignation date is invalid", () => {
    expect(
      firstIssue(reportExitDataSchema, {
        ...validExitResignation,
        resignationDateReceived: "not a date",
      }),
    ).toMatchObject({
      path: ["resignationDateReceived"],
      message: "Resignation date must be a valid date",
    });
  });

  it("should accept notes when the exit is a resignation", () => {
    expect(
      reportExitDataSchema.parse({
        ...validExitResignation,
        removalNotes: " Moved away ",
      }).removalNotes,
    ).toBe("Moved away");
  });

  it("should reject the payload when the removal reason is unknown", () => {
    expect(
      firstIssue(reportExitDataSchema, {
        ...validExitRemoval,
        removalReason: "FOO",
      }).path,
    ).toEqual(["removalReason"]);
  });

  it("should reject the payload when a resignation has a removal reason", () => {
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

  it("should require a reason when the exit is a removal", () => {
    const { removalReason: _omit, ...rest } = validExitRemoval;
    expect(firstIssue(reportExitDataSchema, rest)).toMatchObject({
      path: ["removalReason"],
      message: "Reason is required",
    });
  });

  it.each([undefined, "   "])(
    "should require notes when a removal reason is Other (notes %j)",
    (removalNotes) => {
      const body = {
        ...validExitRemoval,
        removalReason: "OTHER",
        removalNotes,
      };
      expect(firstIssue(reportExitDataSchema, body)).toMatchObject({
        path: ["removalNotes"],
        message: "Notes are required when reason is Other",
      });
    },
  );

  it("should accept the payload when an Other removal has notes", () => {
    const body = { ...validExitRemoval, removalReason: "OTHER" };
    expect(
      reportExitDataSchema.safeParse({ ...body, removalNotes: "Why" }).success,
    ).toBe(true);
  });

  it("should reject the payload when a removal has resignation details", () => {
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
