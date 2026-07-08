import {
  classifyInviteState,
  expiredUnusedInviteWhere,
  unusedInviteWhere,
} from "~/lib/invites/validity";

const EMAIL = "leader@example.com";
const SESSION_EMAIL = "leader@example.com";
const OTHER_EMAIL = "other@example.com";
const NOW = new Date("2026-07-07T12:00:00.000Z");
const FUTURE = new Date("2026-07-08T12:00:00.000Z");
const PAST = new Date("2026-07-06T12:00:00.000Z");

function baseInvite(overrides: Record<string, unknown> = {}) {
  return {
    email: EMAIL,
    usedAt: null,
    deleted: false,
    expiresAt: FUTURE,
    ...overrides,
  };
}

describe("unusedInviteWhere", () => {
  it("matches valid unused invites by email", () => {
    expect(unusedInviteWhere(EMAIL, NOW)).toEqual({
      email: EMAIL,
      usedAt: null,
      deleted: false,
      expiresAt: { gt: NOW },
    });
  });
});

describe("expiredUnusedInviteWhere", () => {
  it("matches expired unused invites by email", () => {
    expect(expiredUnusedInviteWhere(EMAIL, NOW)).toEqual({
      email: EMAIL,
      usedAt: null,
      deleted: false,
      expiresAt: { lte: NOW },
    });
  });
});

describe("classifyInviteState", () => {
  it("accepts a valid unused invite", () => {
    expect(classifyInviteState(baseInvite(), { now: NOW })).toEqual({
      ok: true,
    });
  });

  it("rejects deleted invites", () => {
    expect(
      classifyInviteState(baseInvite({ deleted: true }), { now: NOW }),
    ).toEqual({ ok: false, reason: "deleted" });
  });

  it("rejects expired invites", () => {
    expect(
      classifyInviteState(baseInvite({ expiresAt: PAST }), { now: NOW }),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects used invites in strict mode", () => {
    expect(
      classifyInviteState(baseInvite({ usedAt: NOW }), { now: NOW }),
    ).toEqual({ ok: false, reason: "used" });
  });

  it("allows same-email used invites when configured", () => {
    expect(
      classifyInviteState(baseInvite({ usedAt: NOW }), {
        now: NOW,
        allowSameEmailUsed: true,
        sessionEmail: SESSION_EMAIL,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects used invites for a different session email", () => {
    expect(
      classifyInviteState(baseInvite({ usedAt: NOW }), {
        now: NOW,
        allowSameEmailUsed: true,
        sessionEmail: OTHER_EMAIL,
      }),
    ).toEqual({ ok: false, reason: "used" });
  });
});
