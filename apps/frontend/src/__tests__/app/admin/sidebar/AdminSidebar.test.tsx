import { act, render, screen } from "@testing-library/react";
import { AdminSidebar } from "~/app/admin/AdminSidebar";

const mockPrefetch = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/admin/audit",
  useRouter: () => ({ prefetch: mockPrefetch }),
}));

describe("AdminSidebar", () => {
  beforeEach(() => mockPrefetch.mockClear());

  it("prefetches only /admin routes", async () => {
    await act(async () => {
      render(<AdminSidebar countsPromise={new Promise(() => undefined)} />);
    });

    expect(mockPrefetch).toHaveBeenCalledWith("/admin/discrepancies");
    expect(mockPrefetch).not.toHaveBeenCalledWith("/committees/requests");
  });

  it("links to the pending review queue with its count", async () => {
    await act(async () => {
      render(
        <AdminSidebar countsPromise={Promise.resolve({ pendingReview: 4 })} />,
      );
    });

    const link = await screen.findByRole("link", {
      name: "Pending review (4)",
    });
    // The sidebar is the only nav here; phones use the app bar's menu.
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
