import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ElectionDates } from "~/app/admin/election-config/ElectionDates";
import { ElectionOffices } from "~/app/admin/election-config/ElectionOffices";
import { mockJsonResponse } from "../../../utils/testUtils";

const enterBulkMode = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Bulk add" }));
  return screen.getByLabelText("Bulk add list");
};

describe("bulk add preview", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("blocks Confirm while a row is invalid and enables it once the line is fixed", async () => {
    const user = userEvent.setup();
    render(<ElectionDates electionDates={[]} />);

    const textarea = await enterBulkMode(user);
    await user.type(textarea, "2026-11-03{Enter}not a date");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Fix 1 invalid row to continue" }),
      ).toBeDisabled();
    });

    // Fix the offending line in the textarea, which is where the text already is.
    await user.clear(textarea);
    await user.type(textarea, "2026-11-03{Enter}11/3/2027");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Add 2 election dates" }),
      ).toBeEnabled();
    });
  });

  it("removes the line from the textarea when a row's ✕ is clicked", async () => {
    const user = userEvent.setup();
    render(<ElectionOffices officeNames={[]} />);

    const textarea = await enterBulkMode(user);
    await user.type(textarea, "Mayor{Enter}Comptroller");

    await waitFor(() => {
      expect(screen.getByLabelText("Remove Comptroller")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Remove Comptroller"));

    // The assertion that matters: the text is the single source of truth, so the ✕
    // edits the textarea rather than hiding a row.
    expect(textarea).toHaveValue("Mayor");
    await waitFor(() => {
      expect(
        screen.queryByLabelText("Remove Comptroller"),
      ).not.toBeInTheDocument();
    });
  });

  it("leaves the first line as New after deleting one of two duplicate lines", async () => {
    const user = userEvent.setup();
    render(<ElectionOffices officeNames={[]} />);

    const textarea = await enterBulkMode(user);
    await user.type(textarea, "Mayor{Enter}mayor");

    await waitFor(() => {
      expect(screen.getByText("Duplicate in list")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Remove mayor"));

    expect(textarea).toHaveValue("Mayor");
    await waitFor(() => {
      expect(screen.queryByText("Duplicate in list")).not.toBeInTheDocument();
    });
    // "Mayor" appears in both the pasted column and the stored-value column.
    const row = within(screen.getByRole("table"))
      .getAllByText("Mayor")[0]
      ?.closest("tr");
    expect(row).not.toBeNull();
    expect(within(row!).getByText("New")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 1 office" })).toBeEnabled();
  });

  it("never posts while an invalid row is present", async () => {
    const fetchMock = jest.fn(async () =>
      mockJsonResponse({ created: [], skipped: [] }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<ElectionDates electionDates={[]} />);

    const textarea = await enterBulkMode(user);
    await user.type(textarea, "2026-11-03{Enter}November 3, 2026");

    const confirm = await screen.findByRole("button", {
      name: "Fix 1 invalid row to continue",
    });
    await user.click(confirm);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
