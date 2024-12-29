// app/providers.js
"use client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

type PostHogProviderProps = React.ComponentProps<typeof PostHogProvider>;

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: "identified_only",
  });
}
export function CSPostHogProvider({ children }: PostHogProviderProps) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
