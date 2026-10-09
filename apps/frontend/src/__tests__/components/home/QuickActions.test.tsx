import React from "react";
import { render, screen } from "@testing-library/react";
import { PrivilegeLevel } from "@prisma/client";
import { QuickActions } from "~/components/home/QuickActions";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";

// The real GlobalContext module pulls in next-auth's useSession, which is not
// transformed under jest; mock it down to a bare context like other UI tests do.
jest.mock("~/components/providers/GlobalContext", () => ({
  GlobalContext: React.createContext({
    actingPermissions: "ReadAccess",
    setActingPermissions: () => undefined,
  }),
}));

const PRIVILEGE_ORDER = [
  PrivilegeLevel.Developer,
  PrivilegeLevel.Admin,
  PrivilegeLevel.Leader,
  PrivilegeLevel.RequestAccess,
  PrivilegeLevel.ReadAccess,
];

function renderWithPermissions(actingPermissions: PrivilegeLevel) {
  return render(
    <GlobalContext.Provider
      value={{ actingPermissions, setActingPermissions: jest.fn() }}
    >
      <QuickActions />
    </GlobalContext.Provider>,
  );
}

describe("QuickActions — Petitions action visibility", () => {
  beforeEach(() => {
    jest.mocked(hasPermissionFor).mockImplementation((user, required) => {
      const userIdx = PRIVILEGE_ORDER.indexOf(user);
      const requiredIdx = PRIVILEGE_ORDER.indexOf(required);
      if (userIdx === -1 || requiredIdx === -1) return false;
      return userIdx <= requiredIdx;
    });
  });

  it.each([
    PrivilegeLevel.ReadAccess,
    PrivilegeLevel.RequestAccess,
    PrivilegeLevel.Leader,
  ])("hides Petitions from a %s user but keeps the other actions", (level) => {
    renderWithPermissions(level);

    expect(screen.queryByText("Petitions")).not.toBeInTheDocument();
    expect(screen.getByText("Search Voters")).toBeInTheDocument();
    expect(screen.getByText("Committees")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });

  it.each([PrivilegeLevel.Admin, PrivilegeLevel.Developer])(
    "shows Petitions to a %s user",
    (level) => {
      renderWithPermissions(level);

      expect(screen.getByText("Petitions")).toBeInTheDocument();
    },
  );
});
