/**
 * A Developer's acting privilege persists in localStorage under the key "actingPermissions".
 * Changing the key would silently discard every Developer's saved simulation state.
 */
import React, { useContext } from "react";
import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivilegeLevel } from "@prisma/client";
import {
  GlobalContext,
  GlobalContextProvider,
} from "~/components/providers/GlobalContext";

// next-auth/react is ESM-only and not transformed under jest.
let mockRealRole: PrivilegeLevel = PrivilegeLevel.Developer;
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { privilegeLevel: mockRealRole } },
  }),
}));

let setActing: (p: PrivilegeLevel) => void = () => undefined;
function Probe() {
  const { actingPrivilege, setActingPrivilege } = useContext(GlobalContext);
  setActing = setActingPrivilege;
  return <span data-testid="acting">{actingPrivilege}</span>;
}

function renderProvider() {
  render(
    <GlobalContextProvider>
      <Probe />
    </GlobalContextProvider>,
  );
}

describe("GlobalContextProvider acting privilege storage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockRealRole = PrivilegeLevel.Developer;
  });

  it("restores a Developer's saved acting privilege from the actingPermissions key", () => {
    localStorage.setItem("actingPermissions", PrivilegeLevel.Leader);
    renderProvider();
    expect(screen.getByTestId("acting")).toHaveTextContent(
      PrivilegeLevel.Leader,
    );
  });

  it("saves the acting privilege under the actingPermissions key", () => {
    renderProvider();
    act(() => setActing(PrivilegeLevel.ReadAccess));
    expect(localStorage.getItem("actingPermissions")).toBe(
      PrivilegeLevel.ReadAccess,
    );
    expect(screen.getByTestId("acting")).toHaveTextContent(
      PrivilegeLevel.ReadAccess,
    );
  });

  it("ignores the saved value for non-Developers", () => {
    mockRealRole = PrivilegeLevel.Admin;
    localStorage.setItem("actingPermissions", PrivilegeLevel.ReadAccess);
    renderProvider();
    expect(screen.getByTestId("acting")).toHaveTextContent(
      PrivilegeLevel.Admin,
    );
  });
});
