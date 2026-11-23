/**
 * ui-makeover 02: a quiet 48px app bar. Nav items are text links (active one underlined, no
 * green), the profile is an initials button, and below md one menu holds the main nav plus,
 * for Admins, the Admin sections (the Admin sidebar's floating phone button is gone).
 */
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivilegeLevel } from "@prisma/client";
import Header from "~/app/components/header";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { createMockSession } from "~/__tests__/utils/testUtils";
import { mockRealPrivilegeHierarchy } from "~/__tests__/utils/mocks";

let mockPathname = "/recordsearch";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

const mockSession = createMockSession({
  user: {
    id: "u1",
    email: "leader@example.com",
    name: "Pat Q Leader",
    privilegeLevel: PrivilegeLevel.Leader,
  },
});
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession, status: "authenticated" }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// The real module pulls in next-auth; a bare context is enough here.
jest.mock("~/components/providers/GlobalContext", () => ({
  GlobalContext: React.createContext({
    actingPrivilege: "ReadAccess",
    setActingPrivilege: () => undefined,
  }),
}));

function renderHeader(actingPrivilege: PrivilegeLevel) {
  return render(
    <GlobalContext.Provider
      value={{ actingPrivilege, setActingPrivilege: jest.fn() }}
    >
      <Header />
    </GlobalContext.Provider>,
  );
}

function barNav() {
  // The phone menu's nav renders only when opened, so this is the bar's.
  return screen.getByRole("navigation", { name: "Main" });
}

describe("Header", () => {
  beforeEach(() => {
    mockRealPrivilegeHierarchy();
    mockPathname = "/recordsearch";
  });

  it("labels record search Voters and marks it current with an underline, not green", () => {
    renderHeader(PrivilegeLevel.Leader);

    const voters = within(barNav()).getByRole("link", { name: "Voters" });
    expect(voters).toHaveAttribute("aria-current", "page");
    expect(voters).toHaveClass("border-foreground", "text-foreground");
    expect(voters.className).not.toMatch(/bg-primary|text-primary\b/);

    const committees = within(barNav()).getByRole("link", {
      name: "Committees",
    });
    expect(committees).not.toHaveAttribute("aria-current");
    expect(committees).toHaveClass("text-muted-foreground");
  });

  it("only marks Voters current under /recordsearch, not any path containing 'record'", () => {
    mockPathname = "/reports/record-history";
    renderHeader(PrivilegeLevel.Leader);

    expect(
      within(barNav()).getByRole("link", { name: "Voters" }),
    ).not.toHaveAttribute("aria-current");
    expect(
      within(barNav()).getByRole("link", { name: "Reports" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows the profile as an initials button", () => {
    renderHeader(PrivilegeLevel.Leader);

    expect(screen.getByRole("button", { name: "Profile" })).toHaveTextContent(
      "PL",
    );
  });

  it("puts the Admin sections in the phone menu for Admins", () => {
    renderHeader(PrivilegeLevel.Admin);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = screen.getByRole("dialog", { name: "Menu" });
    const adminNav = within(menu).getByRole("navigation", { name: "Admin" });
    expect(
      within(adminNav).getByRole("link", { name: "Discrepancies" }),
    ).toHaveAttribute("href", "/admin/discrepancies");
    expect(
      within(menu).getByRole("navigation", { name: "Main" }),
    ).toBeInTheDocument();
  });

  it("follows the acting privilege: acting as ReadAccess hides Admin navigation", () => {
    renderHeader(PrivilegeLevel.ReadAccess);

    expect(
      within(barNav()).queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
  });

  it("marks the current Admin section in the phone menu", () => {
    mockPathname = "/admin/discrepancies";
    renderHeader(PrivilegeLevel.Admin);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const adminNav = within(
      screen.getByRole("dialog", { name: "Menu" }),
    ).getByRole("navigation", { name: "Admin" });
    expect(
      within(adminNav).getByRole("link", { name: "Discrepancies" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["/admin/discrepancies", "Discrepancies", "Admin"],
    ["/committees/requests", "Pending review", "Committees"],
  ])(
    "marks only one phone-menu row current on %s",
    (path, adminLabel, mainLabel) => {
      mockPathname = path;
      renderHeader(PrivilegeLevel.Admin);

      // The bar (desktop) still marks the main item.
      expect(
        within(barNav()).getByRole("link", { name: mainLabel }),
      ).toHaveAttribute("aria-current", "page");
      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
      const menu = screen.getByRole("dialog", { name: "Menu" });
      expect(
        within(menu).getByRole("link", { name: adminLabel }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        within(
          within(menu).getByRole("navigation", { name: "Main" }),
        ).getByRole("link", { name: mainLabel }),
      ).not.toHaveAttribute("aria-current");
      expect(
        within(menu)
          .getAllByRole("link")
          .filter((link) => link.getAttribute("aria-current") === "page"),
      ).toHaveLength(1);
    },
  );

  it("leaves Admin out of the bar and the menu below Admin", () => {
    renderHeader(PrivilegeLevel.Leader);

    expect(
      within(barNav()).queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(
      within(screen.getByRole("dialog", { name: "Menu" })).queryByRole(
        "navigation",
        { name: "Admin" },
      ),
    ).not.toBeInTheDocument();
  });
});
