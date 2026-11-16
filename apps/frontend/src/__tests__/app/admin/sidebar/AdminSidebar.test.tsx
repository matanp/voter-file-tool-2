import { render, screen } from "@testing-library/react";
import { AdminSidebar } from "~/app/admin/AdminSidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/admin/audit",
  useRouter: () => ({ prefetch: jest.fn() }),
}));

function desktopSidebar() {
  // The mobile sheet renders its nav only when opened.
  return screen.getByRole("complementary");
}

describe("AdminSidebar", () => {
  it("links to the pending requests queue with its count", () => {
    render(<AdminSidebar counts={{ "pending-requests": 4 }} />);

    const link = screen.getByRole("link", { name: "Pending requests (4)" });
    expect(desktopSidebar()).toContainElement(link);
    expect(link).toHaveAttribute("href", "/committees/requests");
  });

  it("shows a zero count", () => {
    render(<AdminSidebar counts={{ "pending-requests": 0 }} />);

    expect(
      screen.getByRole("link", { name: "Pending requests (0)" }),
    ).toBeInTheDocument();
  });

  it("shows the bare label when no count is known", () => {
    render(<AdminSidebar />);

    expect(
      screen.getByRole("link", { name: "Pending requests" }),
    ).toBeInTheDocument();
  });
});
