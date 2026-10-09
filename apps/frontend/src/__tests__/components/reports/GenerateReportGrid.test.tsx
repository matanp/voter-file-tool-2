import React from "react";
import { render, screen } from "@testing-library/react";
import { PrivilegeLevel } from "@prisma/client";
import GenerateReportGrid from "~/components/reports/GenerateReportGrid";
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
      value={{
        actingPermissions,
        setActingPermissions: jest.fn(),
      }}
    >
      <GenerateReportGrid />
    </GlobalContext.Provider>,
  );
}

describe("GenerateReportGrid — Designated Petition card visibility", () => {
  beforeEach(() => {
    jest.mocked(hasPermissionFor).mockImplementation((user, required) => {
      const userIdx = PRIVILEGE_ORDER.indexOf(user);
      const requiredIdx = PRIVILEGE_ORDER.indexOf(required);
      if (userIdx === -1 || requiredIdx === -1) return false;
      return userIdx <= requiredIdx;
    });
  });

  it("hides the Designated Petition card from a ReadAccess user", () => {
    renderWithPermissions(PrivilegeLevel.ReadAccess);

    expect(screen.queryByText("Designated Petition")).not.toBeInTheDocument();
  });

  it.each([PrivilegeLevel.RequestAccess, PrivilegeLevel.Leader])(
    "hides the Designated Petition card from a %s user",
    (privilegeLevel) => {
      renderWithPermissions(privilegeLevel);

      expect(
        screen.queryByText("Designated Petition"),
      ).not.toBeInTheDocument();
    },
  );

  it("shows the Designated Petition card to an Admin", () => {
    renderWithPermissions(PrivilegeLevel.Admin);

    expect(screen.getByText("Designated Petition")).toBeInTheDocument();
  });
});

describe("GenerateReportGrid — Petition Outcomes card visibility", () => {
  beforeEach(() => {
    jest.mocked(hasPermissionFor).mockImplementation((user, required) => {
      const userIdx = PRIVILEGE_ORDER.indexOf(user);
      const requiredIdx = PRIVILEGE_ORDER.indexOf(required);
      if (userIdx === -1 || requiredIdx === -1) return false;
      return userIdx <= requiredIdx;
    });
  });

  it("hides Petition Outcomes from a Leader but keeps the other Leader reports", () => {
    renderWithPermissions(PrivilegeLevel.Leader);

    expect(screen.queryByText("Petition Outcomes")).not.toBeInTheDocument();
    expect(screen.getByText("Changes Report")).toBeInTheDocument();
    expect(screen.getByText("Committee Roster")).toBeInTheDocument();
  });

  it("shows Petition Outcomes to an Admin", () => {
    renderWithPermissions(PrivilegeLevel.Admin);

    expect(screen.getByText("Petition Outcomes")).toBeInTheDocument();
  });
});
