import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { XlsxUploadCard } from "~/components/admin/XlsxUploadCard";
import { fetchJsonResponse, installFetchMock } from "../../utils/mocks";

const mockCapture = jest.fn<void, unknown[]>();
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));
jest.mock("~/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

function serve(status: number, body: unknown) {
  installFetchMock(async () => fetchJsonResponse(body, status));
}

async function upload() {
  render(
    <XlsxUploadCard<{ rows: number }>
      endpoint="/api/admin/weightedTable/import"
      formFieldName="file"
      title="Weighted table"
      label="Weighted table file"
      inputId="weighted-table"
      renderResult={(data) => <p>{data.rows} rows</p>}
    />,
  );
  await userEvent.upload(
    screen.getByLabelText("Weighted table file"),
    new File(["x"], "table.xlsx"),
  );
  await userEvent.click(screen.getByRole("button", { name: "Import" }));
}

describe("XlsxUploadCard analytics", () => {
  beforeEach(() => mockCapture.mockReset());

  it("records a finished import by endpoint", async () => {
    serve(200, { rows: 3 });
    await upload();
    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith("admin_import_run", {
        import_type: "admin/weightedTable/import",
        outcome: "success",
      }),
    );
  });

  it("records a failed import", async () => {
    serve(500, { error: "Bad sheet" });
    await upload();
    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith("admin_import_run", {
        import_type: "admin/weightedTable/import",
        outcome: "error",
      }),
    );
  });
});
