// app/providers.js
"use client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

type PostHogProviderProps = React.ComponentProps<typeof PostHogProvider>;

console.log("posthog tsx", process.env.NEXT_PUBLIC_POSTHOG_KEY);

if (typeof window !== "undefined") {
  console.log("initializing posthog", process.env.NEXT_PUBLIC_POSTHOG_KEY);
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: "identified_only",
  });
}
export function CSPostHogProvider({ children }: PostHogProviderProps) {
  console.log("posthog provider", process.env.NEXT_PUBLIC_POSTHOG_KEY);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
