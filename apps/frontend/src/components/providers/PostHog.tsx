// app/providers.js
"use client";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

import dynamic from "next/dynamic";

const PostHogPageView = dynamic(() => import("./PostHogPageView"), {
  ssr: false,
});

type PostHogProviderProps = React.ComponentProps<typeof PostHogProvider>;

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: "always",
    capture_pageview: false,
    capture_pageleave: true,
  });
}
export function CSPostHogProvider({ children }: PostHogProviderProps) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session.user?.id) {
      const name =
        process.env.NODE_ENV === "development"
          ? `DEV - ${session.user.name}`
          : session.user.name;

      const email =
        process.env.NODE_ENV === "development"
          ? `DEV - ${session.user.email}`
          : session.user.email;

      posthog.identify(session.user.id, {
        name,
        email,
        privilegeLevel: session.privilegeLevel,
        devMode: process.env.NODE_ENV === "development",
      });
    }
  }, [session, status]);

  return (
    <PostHogProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PostHogProvider>
  );
}
