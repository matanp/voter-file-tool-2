import { act, render, screen } from "@testing-library/react";
import { AdminSidebar } from "~/app/admin/AdminSidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/admin/audit",
  useRouter: () => ({ prefetch: jest.fn() }),
}));

describe("AdminSidebar", () => {
  it("links to the pending review queue with its count", async () => {
    render(
      <AdminSidebar countsPromise={Promise.resolve({ pendingReview: 4 })} />,
    );

    const link = await screen.findByRole("link", {
      name: "Pending review (4)",
    });
    // The mobile sheet renders its nav only when opened.
    expect(screen.getByRole("complementary")).toContainElement(link);
    expect(link).toHaveAttribute("href", "/committees/requests");
    // Items without a countKey keep their bare label.
    expect(
      screen.getByRole("link", { name: "Discrepancies" }),
    ).toBeInTheDocument();
  });

  it("shows a zero count", async () => {
    render(
      <AdminSidebar countsPromise={Promise.resolve({ pendingReview: 0 })} />,
    );

    expect(
      await screen.findByRole("link", { name: "Pending review (0)" }),
    ).toBeInTheDocument();
  });

  it("shows bare labels while the counts load", () => {
    render(<AdminSidebar countsPromise={new Promise(() => undefined)} />);

    expect(
      screen.getByRole("link", { name: "Pending review" }),
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
      screen.getByRole("link", { name: "Pending review" }),
    ).toBeInTheDocument();
  });
});
