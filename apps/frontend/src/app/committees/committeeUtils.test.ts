/**
 * Tests for committeeUtils.ts
 *
 * Testing library note:
 * - These tests use standard Jest/Vitest APIs: describe/test/it/expect.
 * - In Jest, globals are available by default.
 * - In Vitest, if globals are not enabled, add: `import { describe, it, expect } from "vitest";`
 */

import { mapCommiteesToReportShape } from "./committeeUtils";

// Lightweight builders using `any` to avoid coupling tests to Prisma types
const buildVoter = (overrides: Partial<any> = {}): any => ({
  firstName: "John",
  middleInitial: "Q",
  lastName: "Public",
  suffixName: "Jr",
  houseNum: 123,
  street: "Main St",
  apartment: "4B",
  resAddrLine2: "Building 5",
  resAddrLine3: "",
  city: "Springfield",
  state: "NJ",
  zipCode: "07001",
  telephone: "5551234567",
  ...overrides,
});

const buildCommittee = (overrides: Partial<any> = {}): any => ({
  cityTown: "Springfield",
  legDistrict: "LD-1",
  electionDistrict: "ED-1",
  committeeMemberList: [],
  ...overrides,
});

const findGroup = (arr: any[], cityTown: string, legDistrict: string) =>
  arr.find((g) => g.cityTown === cityTown && g.legDistrict === legDistrict);

describe("mapCommiteesToReportShape", () => {
  it("maps a single committee with full voter fields", () => {
    const input = [
      buildCommittee({
        electionDistrict: "ED-1",
        committeeMemberList: [buildVoter()],
      }),
    ];

    const result = mapCommiteesToReportShape(input as any);

    expect(result).toHaveLength(1);
    const group = result[0];
    expect(group.cityTown).toBe("Springfield");
    expect(group.legDistrict).toBe("LD-1");
    expect(Object.keys(group.committees)).toEqual(["ED-1"]);

    const [member] = group.committees["ED-1"];
    expect(member).toMatchObject({
      name: "John Q Public Jr",
      address: "123 Main St APT 4B Building 5",
      city: "Springfield",
      state: "NJ",
      zip: "07001",
      phone: "5551234567",
    });
  });

  it("aggregates members for the same cityTown+legDistrict and same ED", () => {
    const input = [
      buildCommittee({
        electionDistrict: "ED-7",
        committeeMemberList: [
          buildVoter({
            firstName: "Alice",
            middleInitial: "",
            lastName: "Smith",
            suffixName: null,
            houseNum: null,
            street: "Oak St",
            apartment: null,
            resAddrLine2: null,
            city: "Springfield",
            state: "NJ",
            zipCode: "07001",
            telephone: null,
          }),
        ],
      }),
      buildCommittee({
        electionDistrict: "ED-7",
        committeeMemberList: [
          buildVoter({
            firstName: "Bob",
            middleInitial: "",
            lastName: "Jones",
            suffixName: "",
            houseNum: 456,
            street: "Elm St",
            apartment: null,
            resAddrLine2: null,
            city: "Springfield",
            state: "NJ",
            zipCode: "07001",
            telephone: "5550000000",
          }),
        ],
      }),
    ];

    const result = mapCommiteesToReportShape(input as any);
    const group = findGroup(result as any, "Springfield", "LD-1");
    const members = group?.committees?.["ED-7"];

    expect(members).toBeDefined();
    expect(members).toHaveLength(2);
    expect(members?.[0]).toMatchObject({
      name: "Alice Smith",
      address: "Oak St",
      phone: "",
    });
    expect(members?.[1]).toMatchObject({
      name: "Bob Jones",
      address: "456 Elm St",
      phone: "5550000000",
    });
  });

  it("creates separate ED keys within the same group", () => {
    const input = [
      buildCommittee({
        electionDistrict: "ED-1",
        committeeMemberList: [
          buildVoter({ firstName: "X", middleInitial: null, lastName: "Y", suffixName: null }),
        ],
      }),
      buildCommittee({
        electionDistrict: "ED-2",
        committeeMemberList: [
          buildVoter({ firstName: "Z", middleInitial: null, lastName: "W", suffixName: null }),
        ],
      }),
    ];

    const result = mapCommiteesToReportShape(input as any);
    const group = findGroup(result as any, "Springfield", "LD-1");
    expect(group).toBeTruthy();
    expect(Object.keys(group!.committees).sort()).toEqual(["ED-1", "ED-2"]);
    expect(group!.committees["ED-1"][0].name).toBe("X Y");
    expect(group!.committees["ED-2"][0].name).toBe("Z W");
  });

  it("creates multiple groups when cityTown or legDistrict differ", () => {
    const input = [
      buildCommittee({
        cityTown: "Springfield",
        legDistrict: "LD-1",
        electionDistrict: "ED-1",
        committeeMemberList: [buildVoter({ firstName: "A", lastName: "A" })],
      }),
      buildCommittee({
        cityTown: "Shelbyville",
        legDistrict: "LD-2",
        electionDistrict: "ED-9",
        committeeMemberList: [buildVoter({ firstName: "B", lastName: "B" })],
      }),
    ];

    const result = mapCommiteesToReportShape(input as any);
    const g1 = findGroup(result as any, "Springfield", "LD-1");
    const g2 = findGroup(result as any, "Shelbyville", "LD-2");

    expect(g1).toBeTruthy();
    expect(g2).toBeTruthy();
    expect(g1!.committees["ED-1"][0].name).toBe("A A");
    expect(g2!.committees["ED-9"][0].name).toBe("B B");
  });

  it("drops EDs with no members and removes groups that only have empty EDs", () => {
    const input = [
      buildCommittee({
        cityTown: "Ghost Town",
        legDistrict: "LD-0",
        electionDistrict: "ED-999",
        committeeMemberList: [],
      }),
      buildCommittee({
        electionDistrict: "ED-1",
        committeeMemberList: [buildVoter({ firstName: "Live", lastName: "Member" })],
      }),
    ];

    const result = mapCommiteesToReportShape(input as any);

    // Group with only empty EDs should be removed
    const ghost = findGroup(result as any, "Ghost Town", "LD-0");
    expect(ghost).toBeUndefined();

    // Real group remains with non-empty ED
    const real = findGroup(result as any, "Springfield", "LD-1");
    expect(Object.keys(real!.committees)).toEqual(["ED-1"]);
    expect(real!.committees["ED-1"]).toHaveLength(1);
  });

  it("maps undefined city/state/zip/telephone to empty strings", () => {
    const input = [
      buildCommittee({
        committeeMemberList: [
          buildVoter({
            city: undefined,
            state: undefined,
            zipCode: undefined,
            telephone: undefined,
          }),
        ],
      }),
    ];

    const [group] = mapCommiteesToReportShape(input as any);
    const [member] = group.committees["ED-1"];

    expect(member).toMatchObject({
      city: "",
      state: "",
      zip: "",
      phone: "",
    });
  });

  it("omits houseNum when it is 0 and correctly concatenates address lines", () => {
    const input = [
      buildCommittee({
        committeeMemberList: [
          buildVoter({
            houseNum: 0, // falsy -> should be omitted
            street: "NoNumber Ave",
            apartment: null,
            resAddrLine2: "PO Box 9",
            resAddrLine3: "Unit 3",
          }),
        ],
      }),
    ];

    const [group] = mapCommiteesToReportShape(input as any);
    const [member] = group.committees["ED-1"];

    expect(member.address).toBe("NoNumber Ave PO Box 9 Unit 3");
    expect(member.address.startsWith("0 ")).toBe(false);
  });

  it("builds name by filtering out empty middle/suffix tokens", () => {
    const input = [
      buildCommittee({
        committeeMemberList: [
          buildVoter({
            firstName: "Jane",
            middleInitial: "",
            lastName: "Doe",
            suffixName: "",
          }),
        ],
      }),
    ];

    const [group] = mapCommiteesToReportShape(input as any);
    const [member] = group.committees["ED-1"];

    expect(member.name).toBe("Jane Doe");
  });
});