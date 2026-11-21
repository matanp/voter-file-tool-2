// app/providers.js
"use client";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";

import dynamic from "next/dynamic";

const PostHogPageView = dynamic(() => import("./PostHogPageView"), {
  ssr: false,
});

type PostHogProviderProps = React.ComponentProps<typeof PostHogProvider>;

// Agent-driven QA opens the app with `?qa_agent=1`. Tagging the tab lets the
// PostHog project's test-account filter drop those events. The tag is
// session-scoped (sessionStorage), so it sticks to the agent's tab across
// navigations without leaking into the human's other tabs in the same profile.
export const QA_AGENT_PARAM = "qa_agent";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: "always",
    capture_pageview: false,
    capture_pageleave: true,
  });
  if (new URLSearchParams(window.location.search).has(QA_AGENT_PARAM)) {
    posthog.register_for_session({ qa_agent: true });
  }
}
export function CSPostHogProvider({ children }: PostHogProviderProps) {
  const { data: session, status } = useSession();
  // NextAuth hands back a new session object on every refetch (e.g. when a
  // background tab regains focus). Re-identifying each time sends a `$set`,
  // which starts a fresh PostHog session in idle tabs and inflates session
  // counts. Only identify when the identity or its properties change.
  const lastIdentified = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session.user?.id) return;

    const isDev = process.env.NODE_ENV === "development";
    const properties = {
      name: isDev ? `DEV - ${session.user.name}` : session.user.name,
      email: isDev ? `DEV - ${session.user.email}` : session.user.email,
      privilegeLevel: session.privilegeLevel,
      devMode: isDev,
    };
    const key = JSON.stringify([session.user.id, properties]);
    if (lastIdentified.current === key) return;
    lastIdentified.current = key;

    posthog.identify(session.user.id, properties);
  }, [session, status]);

  return (
    <PostHogProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PostHogProvider>
  );
}
