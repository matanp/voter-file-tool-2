const mockReset = jest.fn<void, []>();
const mockSignOut = jest.fn<Promise<undefined>, unknown[]>(() =>
  Promise.resolve(undefined),
);

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { reset: () => mockReset() },
}));
jest.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

import { signOutEverywhere } from "~/lib/signOut";

describe("signOutEverywhere", () => {
  it("resets PostHog before signing out, and passes options through", async () => {
    await signOutEverywhere({ redirect: false });

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockReset.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0]!,
    );
  });
});
