/**
 * Petitions page gate: designated-petition generation is Admin-only
 * (leader-petition-visibility/01), decided from actual session privilege.
 */
import type React from "react";
import { PrivilegeLevel } from "@prisma/client";
import PetitionsPage from "~/app/petitions/page";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import PageSignInRequired from "~/components/ui/PageSignInRequired";
import { getAuthenticatedPageAccess } from "~/lib/getAdminPageAccess";
import { hasPermissionFor } from "~/lib/utils";
import { prismaMock } from "../../utils/mocks";

jest.mock("~/lib/getAdminPageAccess", () => ({
  getAuthenticatedPageAccess: jest.fn(),
}));
// next-auth/react (via the sign-in button) is ESM-only and not transformed under jest.
jest.mock("~/components/ui/PageSignInRequired", () => ({
  __esModule: true,
  default: function PageSignInRequired() {
    return null;
  },
}));
jest.mock("~/app/petitions/GeneratePetitionForm", () => ({
  __esModule: true,
  default: () => null,
}));

const PRIVILEGE_ORDER = [
  PrivilegeLevel.Developer,
  PrivilegeLevel.Admin,
  PrivilegeLevel.Leader,
  PrivilegeLevel.RequestAccess,
  PrivilegeLevel.ReadAccess,
];

async function renderPage(): Promise<React.ReactElement> {
  const element = await PetitionsPage({});
  return element as React.ReactElement;
}

describe("PetitionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasPermissionFor).mockImplementation((user, required) => {
      const userIdx = PRIVILEGE_ORDER.indexOf(user);
      const requiredIdx = PRIVILEGE_ORDER.indexOf(required);
      if (userIdx === -1 || requiredIdx === -1) return false;
      return userIdx <= requiredIdx;
    });
  });

  it("asks an unauthenticated visitor to sign in", async () => {
    jest.mocked(getAuthenticatedPageAccess).mockResolvedValue({ ok: false });

    const element = await renderPage();

    expect(element.type).toBe(PageSignInRequired);
  });

  it.each([
    PrivilegeLevel.ReadAccess,
    PrivilegeLevel.RequestAccess,
    PrivilegeLevel.Leader,
  ])("denies a %s user without loading form data", async (privilegeLevel) => {
    jest.mocked(getAuthenticatedPageAccess).mockResolvedValue({
      ok: true,
      userId: "user-1",
      privilegeLevel,
    });

    const element = await renderPage();

    expect(element.type).toBe(AdminPageAccessDenied);
    expect(prismaMock.dropdownLists.findFirst).not.toHaveBeenCalled();
  });

  it("renders the form for an Admin", async () => {
    jest.mocked(getAuthenticatedPageAccess).mockResolvedValue({
      ok: true,
      userId: "admin-1",
      privilegeLevel: PrivilegeLevel.Admin,
    });
    prismaMock.dropdownLists.findFirst.mockResolvedValue({
      party: ["DEM", "REP"],
    } as never);
    prismaMock.electionDate.findMany.mockResolvedValue([]);
    prismaMock.officeName.findMany.mockResolvedValue([]);

    const element = await renderPage();

    expect(element.type).not.toBe(AdminPageAccessDenied);
    expect(prismaMock.dropdownLists.findFirst).toHaveBeenCalled();
  });
});
