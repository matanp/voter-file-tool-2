import { act, render, screen } from "@testing-library/react";
import { AdminSidebar } from "~/app/admin/AdminSidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/admin/audit",
  useRouter: () => ({ prefetch: jest.fn() }),
}));

describe("AdminSidebar", () => {
  it("links to the pending requests queue with its count", async () => {
    render(
      <AdminSidebar
        countsPromise={Promise.resolve({ "pending-requests": 4 })}
      />,
    );

    const link = await screen.findByRole("link", {
      name: "Pending requests (4)",
    });
    // The mobile sheet renders its nav only when opened.
    expect(screen.getByRole("complementary")).toContainElement(link);
    expect(link).toHaveAttribute("href", "/committees/requests");
  });

  it("shows a zero count", async () => {
    render(
      <AdminSidebar
        countsPromise={Promise.resolve({ "pending-requests": 0 })}
      />,
    );

    expect(
      await screen.findByRole("link", { name: "Pending requests (0)" }),
    ).toBeInTheDocument();
  });

  it("shows bare labels while the counts load", () => {
    render(<AdminSidebar countsPromise={new Promise(() => undefined)} />);

    expect(
      screen.getByRole("link", { name: "Pending requests" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Discrepancies" }),
    ).toBeInTheDocument();
  });

  it("shows the bare label when there is no count", async () => {
    const countsPromise = Promise.resolve({});
    render(<AdminSidebar countsPromise={countsPromise} />);
    await act(() => countsPromise);

    expect(
      screen.getByRole("link", { name: "Pending requests" }),
    ).toBeInTheDocument();
  });
});
