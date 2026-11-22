/**
 * First paint with the server's session (committees-workspace ticket 29): the
 * root layout passes `auth()`'s session to `SessionProvider`, so the server
 * HTML (what paints before hydration) already has the signed-in nav and the
 * right acting role: no "…" placeholder, no Admin tab or member search
 * appearing a moment later. With a session passed in, next-auth's provider
 * starts as loaded and skips its on-mount /api/auth/session fetch.
 *
 * `next-auth/react` is ESM-only, so it's replaced here by a provider with the
 * same contract: a passed session is the loaded session.
 */
import React, { useContext } from "react";
import { renderToString } from "react-dom/server";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";

import Header from "~/app/components/header";
import {
  GlobalContext,
  GlobalContextProvider,
} from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";

jest.mock("next-auth/react", () => {
  const { createContext, createElement, useContext: use } =
    jest.requireActual<typeof React>("react");
  const SessionContext = createContext<Session | null | undefined>(undefined);
  return {
    SessionProvider: ({
      session,
      children,
    }: {
      session?: Session | null;
      children: React.ReactNode;
    }) => createElement(SessionContext.Provider, { value: session }, children),
    useSession: () => {
      const session = use(SessionContext);
      if (session === undefined) return { data: undefined, status: "loading" };
      if (session === null) return { data: null, status: "unauthenticated" };
      return { data: session, status: "authenticated" };
    },
    signIn: jest.fn(),
    signOut: jest.fn(),
  };
});

jest.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => null }));
jest.mock("~/app/components/DbConnectionBadge", () => ({ DbConnectionBadge: () => null }));
jest.mock("~/components/providers/PostHog", () => ({
  CSPostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/committees",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

// Imported after the mocks it depends on. `~/auth` is mocked in jest.setup.ts.
import { SessionProvider } from "next-auth/react";
import RootLayout from "~/app/layout";
import { auth } from "~/auth";

function session(privilegeLevel: PrivilegeLevel): Session {
  return {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test.user@example.com",
      privilegeLevel,
    },
    privilegeLevel,
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

/** Stands in for role-gated page UI, such as the workspace's member search. */
function ActingRole() {
  const { actingPermissions } = useContext(GlobalContext);
  return <p data-testid="acting-role">{actingPermissions}</p>;
}

/** The server HTML: rendered without running any effect. */
function firstPaint(serverSession: Session | null): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = renderToString(
    <SessionProvider session={serverSession}>
      <GlobalContextProvider>
        <Header />
        <ActingRole />
      </GlobalContextProvider>
    </SessionProvider>,
  );
  return container;
}

const actingRole = (html: HTMLElement) =>
  html.querySelector('[data-testid="acting-role"]')?.textContent;
const navLinks = (html: HTMLElement) =>
  Array.from(html.querySelectorAll("a")).map((a) => a.textContent);

beforeEach(() => {
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
});

describe("first paint with the server's session (ticket 29)", () => {
  it("passes the server session to SessionProvider", async () => {
    const admin = session(PrivilegeLevel.Admin);
    (jest.mocked(auth) as unknown as jest.Mock<Promise<Session | null>>).mockResolvedValue(
      admin,
    );

    const tree = (await RootLayout({ children: null })) as React.ReactElement<{
      children: React.ReactElement<{ children: React.ReactElement<{ session?: unknown }> }>;
    }>;
    const provider = tree.props.children.props.children;

    expect(provider.type).toBe(SessionProvider);
    expect(provider.props.session).toBe(admin);
  });

  it("paints an Admin's nav and acting role before hydration", () => {
    const html = firstPaint(session(PrivilegeLevel.Admin));

    expect(actingRole(html)).toBe("Admin");
    expect(navLinks(html)).toContain("Admin");
    expect(html.textContent).not.toContain("…");
    expect(html.textContent).not.toMatch(/sign in/i);
  });

  it("paints a Leader as Leader, so Leader-only UI doesn't mount late", () => {
    const html = firstPaint(session(PrivilegeLevel.Leader));

    expect(actingRole(html)).toBe("Leader");
    expect(navLinks(html)).not.toContain("Admin");
  });

  it("paints Sign In for a signed-out visitor instead of a placeholder", () => {
    const html = firstPaint(null);

    expect(actingRole(html)).toBe("ReadAccess");
    expect(html.textContent).not.toContain("…");
  });
});
