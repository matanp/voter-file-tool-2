import { render } from "@testing-library/react";

const mockIdentify = jest.fn<void, unknown[]>();
const mockRegisterForSession = jest.fn<void, unknown[]>();
const mockReset = jest.fn<void, []>();
const mockRegister = jest.fn<void, unknown[]>();
const mockUseSession = jest.fn<unknown, []>();

/** PostHog's persisted `$user_state`, which survives reloads. */
let mockUserState: "anonymous" | "identified" = "anonymous";

jest.mock("posthog-js", () => {
  const client = {
    /** Configs passed to init (it runs at import, before test-scope consts exist). */
    initConfigs: [] as unknown[],
    // Like the real SDK, run the `loaded` callback during init.
    init: (_key: string, config: { loaded?: (ph: unknown) => void }) => {
      client.initConfigs.push(config);
      config.loaded?.(client);
    },
    identify: (...args: unknown[]) => {
      mockUserState = "identified";
      mockIdentify(...args);
    },
    get_property: (name: string) =>
      name === "$user_state" ? mockUserState : undefined,
    register_for_session: (...args: unknown[]) => {
      mockRegisterForSession(...args);
    },
    reset: () => {
      mockUserState = "anonymous";
      mockReset();
    },
    register: (...args: unknown[]) => {
      mockRegister(...args);
    },
  };
  return { __esModule: true, default: client };
});
jest.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

import {
  CSPostHogProvider as Provider,
  maskReadableAttribute,
} from "~/components/providers/PostHog";

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
    mockUserState = "anonymous";
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
    expect(mockRegister).toHaveBeenCalledWith({ privilege_level: "Admin" });
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

  it("resets a person whose session expired between visits", () => {
    // Identified on an earlier visit; the session expired before this load.
    mockUserState = "identified";
    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });
    const { rerender } = render(<Provider>x</Provider>);
    expect(mockReset).toHaveBeenCalledTimes(1);

    rerender(<Provider>x</Provider>);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("does not reset again after signOutEverywhere already did", () => {
    mockUseSession.mockReturnValue(authed());
    const { rerender } = render(<Provider>x</Provider>);

    // signOutEverywhere({ redirect: false }) resets, then the session ends.
    jest.requireMock<{ default: { reset: () => void } }>("posthog-js").default.reset();
    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });
    rerender(<Provider>x</Provider>);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("does not reset anonymous visitors", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });
    render(<Provider>x</Provider>);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("masks all on-screen text in replays and autocapture", () => {
    const { default: client } = jest.requireMock<{
      default: { initConfigs: unknown[] };
    }>("posthog-js");
    expect(client.initConfigs[0]).toEqual(
      expect.objectContaining({
        mask_all_text: true,
        mask_all_element_attributes: true,
        enable_recording_console_log: false,
        session_recording: expect.objectContaining({
          maskAllInputs: true,
          maskTextSelector: "*",
          maskAttributeFn: maskReadableAttribute,
        }) as unknown,
      }),
    );
  });

  it("masks readable attributes in replays but keeps layout ones", () => {
    expect(maskReadableAttribute("aria-label", "Remove MAIN ST")).toBe(
      "**************",
    );
    expect(maskReadableAttribute("title", "Jane")).toBe("****");
    expect(maskReadableAttribute("class", "flex gap-1")).toBe("flex gap-1");
    expect(maskReadableAttribute("href", "/committees?town=X")).toBe(
      "/committees?town=X",
    );
  });
});
