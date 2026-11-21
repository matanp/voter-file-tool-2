import posthog from "posthog-js";
import { signOut } from "next-auth/react";

/**
 * Sign out of NextAuth and PostHog together.
 *
 * Without the PostHog reset, the next person to use this browser keeps the
 * previous person's distinct id, so their pre-login events land on the
 * previous person's profile. Use this instead of calling `signOut` directly.
 */
export function signOutEverywhere(
  options?: Parameters<typeof signOut>[0],
): ReturnType<typeof signOut> {
  posthog.reset();
  return signOut(options);
}
