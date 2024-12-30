// app/providers.js
"use client";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

type PostHogProviderProps = React.ComponentProps<typeof PostHogProvider>;

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: "always",
  });
}
export function CSPostHogProvider({ children }: PostHogProviderProps) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session.user?.id) {
      console.log("Identifying user", session.user.id);
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
        privilegeLevel: session.privilegeLevel,
      });
    }
  }, [session, status]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
