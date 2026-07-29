import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuditAction } from "@prisma/client";
import { AuditTrailClient } from "~/app/admin/audit/AuditTrailClient";
import { mockJsonResponse } from "../../../utils/testUtils";

type AuditLogItem = {
  id: string;
  userId: string;
  userRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  timestamp: string;
  beforeValue: unknown;
  afterValue: unknown;
  metadata: unknown;
  user: { name: string | null; email: string };
};

type AuditListResponse = {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function buildAuditItem(
  overrides: Partial<AuditLogItem> = {},
): AuditLogItem {
  return {
    id: "audit-1",
    userId: "user-1",
    userRole: "Admin",
    action: "MEMBER_CONFIRMED",
    entityType: "CommitteeMembership",
    entityId: "cm-1",
    timestamp: "2026-01-15T12:00:00.000Z",
    beforeValue: null,
    afterValue: null,
    metadata: null,
    user: { name: "Alice Admin", email: "alice@example.com" },
    ...overrides,
  };
}

function buildAuditListResponse(
  overrides: Partial<AuditListResponse> = {},
): AuditListResponse {
  return {
    items: [buildAuditItem()],
    total: 50,
    page: 1,
    pageSize: 25,
    totalPages: 2,
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

let currentSearchParams = new URLSearchParams();
let rerenderAuditTrail: () => void = () => undefined;

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (url: string) => {
      const normalized = url.startsWith("http")
        ? url
        : `http://localhost${url.startsWith("/") ? url : `/${url}`}`;
      currentSearchParams = new URL(normalized).searchParams;
      rerenderAuditTrail();
    },
  }),
  useSearchParams: () => currentSearchParams,
}));

jest.mock("~/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock("~/app/admin/audit/AuditDetailDrawer", () => ({
  AuditDetailDrawer: () => null,
}));

jest.mock("~/components/ui/ComboBox", () => ({
  ComboboxDropdown: ({
    initialValue,
    onSelect,
  }: {
    initialValue?: string;
    onSelect: (value: string) => void;
  }) => (
    <select
      aria-label="User filter"
      value={initialValue ?? ""}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="">All users</option>
    </select>
  ),
}));

jest.mock("~/components/ui/select", () => {
  const ReactActual = jest.requireActual<typeof React>("react");

  type SelectTriggerProps = { id?: string; children: React.ReactNode };
  type MarkedSelectTrigger = ((props: SelectTriggerProps) => React.ReactNode) & {
    __isSelectTrigger: true;
  };
  type SelectTriggerElement = React.ReactElement<SelectTriggerProps> & {
    type: MarkedSelectTrigger;
  };

  const SelectTrigger = Object.assign(
    function SelectTrigger({ children }: SelectTriggerProps) {
      return <>{children}</>;
    },
    { __isSelectTrigger: true as const },
  );

  function isSelectTriggerElement(child: React.ReactNode): child is SelectTriggerElement {
    return (
      ReactActual.isValidElement<SelectTriggerProps>(child) &&
      typeof child.type !== "string" &&
      "__isSelectTrigger" in child.type &&
      child.type.__isSelectTrigger === true
    );
  }

  function SelectValue() {
    return null;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  function SelectItem({
    value,
    disabled,
    children,
  }: {
    value: string;
    disabled?: boolean;
    children: React.ReactNode;
  }) {
    return (
      <option value={value} disabled={disabled}>
        {children}
      </option>
    );
  }

  function Select({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) {
    const childArray = ReactActual.Children.toArray(children);
    const trigger = childArray.find(isSelectTriggerElement);
    const id = trigger?.props.id;
    const rest = childArray.filter((child) => !isSelectTriggerElement(child));
    return (
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="" />
        {rest}
      </select>
    );
  }

  return {
    Select,
    SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectLabel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectSeparator: () => null,
  };
});

function renderAuditTrailClient() {
  const view = render(<AuditTrailClient />);
  rerenderAuditTrail = () => {
    view.rerender(<AuditTrailClient />);
  };
  return view;
}

function isAuditListUrl(url: string): boolean {
  return url.includes("/api/admin/audit") && !url.includes("/users") && !url.includes("/export");
}

describe("AuditTrailClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    rerenderAuditTrail = () => undefined;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("shows centered loading on initial load without flashing the empty state", async () => {
    const deferred = createDeferred<ReturnType<typeof mockJsonResponse>>();
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/audit/users")) {
        return Promise.resolve(mockJsonResponse({ users: [] }));
      }
      if (isAuditListUrl(url)) {
        return deferred.promise;
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderAuditTrailClient();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(
      screen.queryByText("No audit entries match your filters."),
    ).not.toBeInTheDocument();

    await act(async () => {
      deferred.resolve(mockJsonResponse(buildAuditListResponse()));
    });

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("keeps prior rows visible and shows refreshing while a follow-up fetch is in flight", async () => {
    const page2Deferred = createDeferred<ReturnType<typeof mockJsonResponse>>();
    const page1Response = buildAuditListResponse();
    const page2Response = buildAuditListResponse({
      page: 2,
      items: [
        buildAuditItem({
          id: "audit-2",
          user: { name: "Bob Leader", email: "bob@example.com" },
        }),
      ],
    });

    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/audit/users")) {
        return Promise.resolve(mockJsonResponse({ users: [] }));
      }
      if (isAuditListUrl(url) && url.includes("page=2")) {
        return page2Deferred.promise;
      }
      if (isAuditListUrl(url)) {
        return Promise.resolve(mockJsonResponse(page1Response));
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    renderAuditTrailClient();

    await screen.findByText("Alice Admin");

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("Refreshing…")).toBeInTheDocument();
    expect(screen.queryByText("Bob Leader")).not.toBeInTheDocument();

    await act(async () => {
      page2Deferred.resolve(mockJsonResponse(page2Response));
    });

    await waitFor(() => {
      expect(screen.getByText("Bob Leader")).toBeInTheDocument();
    });
    expect(screen.queryByText("Refreshing…")).not.toBeInTheDocument();
  });

  it("derives pagination from the loaded response while refreshing", async () => {
    const page2Deferred = createDeferred<ReturnType<typeof mockJsonResponse>>();
    const page1Response = buildAuditListResponse();

    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/audit/users")) {
        return Promise.resolve(mockJsonResponse({ users: [] }));
      }
      if (isAuditListUrl(url) && url.includes("page=2")) {
        return page2Deferred.promise;
      }
      if (isAuditListUrl(url)) {
        return Promise.resolve(mockJsonResponse(page1Response));
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    renderAuditTrailClient();

    await screen.findByText("Showing 1–25 of 50 entries");

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(screen.getByText("Showing 1–25 of 50 entries")).toBeInTheDocument();
    expect(screen.getByText("Refreshing…")).toBeInTheDocument();

    await act(async () => {
      page2Deferred.resolve(
        mockJsonResponse(
          buildAuditListResponse({
            page: 2,
            items: [
              buildAuditItem({
                id: "audit-2",
                user: { name: "Bob Leader", email: "bob@example.com" },
              }),
            ],
          }),
        ),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Showing 26–50 of 50 entries")).toBeInTheDocument();
    });
  });

  it("shows the empty state only after an empty response arrives", async () => {
    const deferred = createDeferred<ReturnType<typeof mockJsonResponse>>();

    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/audit/users")) {
        return Promise.resolve(mockJsonResponse({ users: [] }));
      }
      if (isAuditListUrl(url)) {
        return deferred.promise;
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderAuditTrailClient();

    expect(
      screen.queryByText("No audit entries match your filters."),
    ).not.toBeInTheDocument();

    await act(async () => {
      deferred.resolve(
        mockJsonResponse(
          buildAuditListResponse({
            items: [],
            total: 0,
            totalPages: 1,
          }),
        ),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("No audit entries match your filters."),
      ).toBeInTheDocument();
    });
  });

  it("shows the server error message when the audit list request fails", async () => {
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/audit/users")) {
        return Promise.resolve(mockJsonResponse({ users: [] }));
      }
      if (isAuditListUrl(url)) {
        return Promise.resolve(
          mockJsonResponse(
            { error: "Failed to load audit log" },
            { status: 500 },
          ),
        );
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderAuditTrailClient();

    await waitFor(() => {
      expect(screen.getByText("Failed to load audit log")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No audit entries match your filters."),
    ).not.toBeInTheDocument();
  });

  it("recovers and renders rows after Try again succeeds", async () => {
    let listAttempts = 0;
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/audit/users")) {
        return Promise.resolve(mockJsonResponse({ users: [] }));
      }
      if (isAuditListUrl(url)) {
        listAttempts += 1;
        if (listAttempts === 1) {
          return Promise.resolve(
            mockJsonResponse(
              { error: "Failed to load audit log" },
              { status: 500 },
            ),
          );
        }
        return Promise.resolve(mockJsonResponse(buildAuditListResponse()));
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    renderAuditTrailClient();

    await waitFor(() => {
      expect(screen.getByText("Failed to load audit log")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Failed to load audit log"),
    ).not.toBeInTheDocument();
  });

  it("falls back to a generic message when the error response has no body", async () => {
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/audit/users")) {
        return Promise.resolve(mockJsonResponse({ users: [] }));
      }
      if (isAuditListUrl(url)) {
        return Promise.resolve(
          mockJsonResponse(
            {},
            {
              status: 500,
              statusText: "Internal Server Error",
              json: () => Promise.reject(new Error("no body")),
            },
          ),
        );
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderAuditTrailClient();

    await waitFor(() => {
      expect(screen.getByText("Internal Server Error")).toBeInTheDocument();
    });
  });
});
