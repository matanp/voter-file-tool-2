import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkAddSection } from "~/app/admin/election-config/BulkAddSection";
import { ElectionDates } from "~/app/admin/election-config/ElectionDates";
import { ElectionOffices } from "~/app/admin/election-config/ElectionOffices";
import { mockJsonResponse } from "../../../utils/testUtils";

const toastMock = jest.fn();
jest.mock("~/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

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

  it("reports the server's counts in the success toast, not the preview's", async () => {
    // The preview says two rows are new; the server created one and skipped the other
    // (a concurrent admin claimed it). The toast must follow the server.
    global.fetch = jest.fn(async () =>
      mockJsonResponse({
        created: [{ id: 7, date: "2026-11-03T00:00:00.000Z" }],
        skipped: ["2027-11-02"],
      }),
    ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<ElectionDates electionDates={[]} />);

    const textarea = await enterBulkMode(user);
    await user.type(textarea, "2026-11-03{Enter}2027-11-02");

    const confirm = await screen.findByRole("button", {
      name: "Add 2 election dates",
    });
    await user.click(confirm);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        title: "Success",
        description: "Added 1 election date · 1 skipped",
      });
    });
  });

  it("does not delete the wrong line when a row's index is stale", async () => {
    // Rows are derived from debounced text, so a ✕ clicked inside the debounce window
    // carries an index into a line list that no longer exists. Driving the mismatch
    // directly is the only way to pin the guard.
    const onTextChange = jest.fn();
    const user = userEvent.setup();

    render(
      <BulkAddSection
        rows={[
          {
            lineIndex: 0,
            original: "Comptroller",
            value: "Comptroller",
            status: "new",
          },
        ]}
        // The admin has since prepended a line, so index 0 is now "Mayor".
        text={"Mayor\nComptroller"}
        onTextChange={onTextChange}
        onConfirm={jest.fn()}
        confirmLabel="Add 1 office"
      />,
    );

    await user.click(screen.getByLabelText("Remove Comptroller"));

    expect(onTextChange).toHaveBeenCalledWith("Mayor");
  });

  it("removes nothing when a stale row no longer matches any line", async () => {
    const onTextChange = jest.fn();
    const user = userEvent.setup();

    render(
      <BulkAddSection
        rows={[
          {
            lineIndex: 0,
            original: "Comptroller",
            value: "Comptroller",
            status: "new",
          },
        ]}
        text={"Mayor"}
        onTextChange={onTextChange}
        onConfirm={jest.fn()}
        confirmLabel="Add 1 office"
      />,
    );

    await user.click(screen.getByLabelText("Remove Comptroller"));

    // Unchanged: a no-op the admin can retry beats deleting a line they can still see.
    expect(onTextChange).toHaveBeenCalledWith("Mayor");
  });
});
