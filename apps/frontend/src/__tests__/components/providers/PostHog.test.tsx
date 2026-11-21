import { render } from "@testing-library/react";

const mockIdentify = jest.fn<void, unknown[]>();
const mockRegisterForSession = jest.fn<void, unknown[]>();
const mockReset = jest.fn<void, []>();
const mockUseSession = jest.fn<unknown, []>();

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    identify: (...args: unknown[]) => {
      mockIdentify(...args);
    },
    register_for_session: (...args: unknown[]) => {
      mockRegisterForSession(...args);
    },
    reset: () => {
      mockReset();
    },
  },
}));
jest.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));
jest.mock("next/dynamic", () => () => () => null);

import { CSPostHogProvider as Provider } from "~/components/providers/PostHog";

// The tagging runs once at module load, so load a fresh copy per URL.
function loadModuleAt(search: string) {
  window.history.replaceState(null, "", `/${search}`);
  jest.isolateModules(() => {
    jest.requireActual("~/components/providers/PostHog");
  });
}

function authed(privilegeLevel = "Admin") {
  return {
    status: "authenticated",
    data: {
      user: { id: "u1", name: "Ada", email: "ada@example.com" },
      privilegeLevel,
    },
  };
}

describe("CSPostHogProvider", () => {
  beforeEach(() => {
    mockIdentify.mockClear();
    mockRegisterForSession.mockClear();
    mockReset.mockClear();
  });

  it("does not re-identify when a refetch returns an equal session", () => {
    mockUseSession.mockReturnValue(authed());
    const { rerender } = render(<Provider>x</Provider>);

    // A refetch yields a new, structurally equal session object.
    mockUseSession.mockReturnValue(authed());
    rerender(<Provider>x</Provider>);

    expect(mockIdentify).toHaveBeenCalledTimes(1);
    expect(mockIdentify).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ privilegeLevel: "Admin" }),
    );
  });

  it("re-identifies when person properties change", () => {
    mockUseSession.mockReturnValue(authed("Admin"));
    const { rerender } = render(<Provider>x</Provider>);

    mockUseSession.mockReturnValue(authed("Leader"));
    rerender(<Provider>x</Provider>);

    expect(mockIdentify).toHaveBeenCalledTimes(2);
  });

  it("tags the tab's session when opened with ?qa_agent", () => {
    loadModuleAt("?qa_agent=1");
    expect(mockRegisterForSession).toHaveBeenCalledWith({ qa_agent: true });
  });

  it("does not tag ordinary visits", () => {
    loadModuleAt("?q=smith");
    expect(mockRegisterForSession).not.toHaveBeenCalled();
  });

  it("resets PostHog when an identified session ends", () => {
    mockUseSession.mockReturnValue(authed());
    const { rerender } = render(<Provider>x</Provider>);

    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });
    rerender(<Provider>x</Provider>);
    expect(mockReset).toHaveBeenCalledTimes(1);

    // Signing back in identifies again, even as the same user.
    mockUseSession.mockReturnValue(authed());
    rerender(<Provider>x</Provider>);
    expect(mockIdentify).toHaveBeenCalledTimes(2);
  });

  it("does not reset anonymous visitors", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });
    render(<Provider>x</Provider>);
    expect(mockReset).not.toHaveBeenCalled();
  });
});
