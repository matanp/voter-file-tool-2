import { AuditAction } from "@prisma/client";
import {
  buildAuditExportQuery,
  buildAuditListEndpoint,
  DEFAULT_AUDIT_FILTERS,
  parseAuditFilters,
  serializeAuditFilters,
} from "~/app/admin/audit/auditFilterState";

describe("parseAuditFilters", () => {
  it("returns defaults from empty params", () => {
    expect(parseAuditFilters(new URLSearchParams())).toEqual(DEFAULT_AUDIT_FILTERS);
  });

  it("clamps invalid page to 1", () => {
    expect(parseAuditFilters(new URLSearchParams("page=0")).page).toBe(1);
    expect(parseAuditFilters(new URLSearchParams("page=-3")).page).toBe(1);
    expect(parseAuditFilters(new URLSearchParams("page=abc")).page).toBe(1);
  });

  it("clamps invalid pageSize", () => {
    expect(parseAuditFilters(new URLSearchParams("pageSize=0")).pageSize).toBe(1);
    expect(parseAuditFilters(new URLSearchParams("pageSize=500")).pageSize).toBe(100);
    expect(parseAuditFilters(new URLSearchParams("pageSize=abc")).pageSize).toBe(25);
  });

  it("drops invalid action", () => {
    expect(parseAuditFilters(new URLSearchParams("action=NOT_REAL")).action).toBe("");
  });

  it("preserves valid filters", () => {
    const params = new URLSearchParams({
      page: "2",
      pageSize: "50",
      action: AuditAction.MEMBER_CONFIRMED,
      entityType: "CommitteeMembership",
      userId: "user-1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    expect(parseAuditFilters(params)).toEqual({
      page: 2,
      pageSize: 50,
      action: AuditAction.MEMBER_CONFIRMED,
      entityType: "CommitteeMembership",
      userId: "user-1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
  });

  it("drops invalid date values", () => {
    const params = new URLSearchParams({
      dateFrom: "not-a-date",
      dateTo: "also-bad",
    });

    expect(parseAuditFilters(params).dateFrom).toBe("");
    expect(parseAuditFilters(params).dateTo).toBe("");
  });
});

describe("serializeAuditFilters", () => {
  it("omits empty and default values", () => {
    expect(serializeAuditFilters(DEFAULT_AUDIT_FILTERS).toString()).toBe("");
  });

  it("includes active filters", () => {
    const params = serializeAuditFilters({
      page: 3,
      pageSize: 50,
      action: AuditAction.MEMBER_CONFIRMED,
      entityType: "CommitteeMembership",
      userId: "user-1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    expect(params.get("page")).toBe("3");
    expect(params.get("pageSize")).toBe("50");
    expect(params.get("action")).toBe(AuditAction.MEMBER_CONFIRMED);
    expect(params.get("entityType")).toBe("CommitteeMembership");
    expect(params.get("userId")).toBe("user-1");
    expect(params.get("dateFrom")).toBe("2026-01-01");
    expect(params.get("dateTo")).toBe("2026-01-31");
  });
});

describe("buildAuditListEndpoint", () => {
  it("builds endpoint without query for defaults", () => {
    expect(buildAuditListEndpoint(DEFAULT_AUDIT_FILTERS)).toBe("/api/admin/audit");
  });

  it("builds endpoint with serialized filters", () => {
    const endpoint = buildAuditListEndpoint({
      ...DEFAULT_AUDIT_FILTERS,
      action: AuditAction.MEMBER_CONFIRMED,
      page: 2,
    });
    expect(endpoint).toBe(
      `/api/admin/audit?page=2&action=${AuditAction.MEMBER_CONFIRMED}`,
    );
  });
});

describe("buildAuditExportQuery", () => {
  it("omits pagination params", () => {
    const qs = buildAuditExportQuery({
      page: 3,
      pageSize: 50,
      action: AuditAction.MEMBER_CONFIRMED,
      entityType: "",
      userId: "",
      dateFrom: "",
      dateTo: "",
    });
    expect(qs).toBe(`action=${AuditAction.MEMBER_CONFIRMED}`);
    expect(qs).not.toContain("page");
    expect(qs).not.toContain("pageSize");
  });
});
