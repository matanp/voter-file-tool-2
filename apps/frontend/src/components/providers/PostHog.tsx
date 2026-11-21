"use client";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";

// Agent-driven QA opens the app with `?qa_agent=1`. Tagging the tab lets the
// PostHog project's test-account filter drop those events. The tag is
// session-scoped (sessionStorage), so it sticks to the agent's tab across
// navigations without leaking into the human's other tabs in the same profile.
export const QA_AGENT_PARAM = "qa_agent";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // Anonymous visitors (bots, sign-in page bounces) still send events but
    // don't get person profiles, so they don't inflate user counts.
    person_profiles: "identified_only",
    // Pin the defaults date so SDK upgrades don't silently change behaviour.
    // 2026-05-30 also stops rage clicks firing on text selection
    // (triple-click to select a field's value).
    defaults: "2026-05-30",
    // Count a pageview on path and query changes, as the old hand-rolled
    // PostHogPageView did, so pageview counts stay comparable.
    capture_pageview: { path: true, search: true },
    capture_pageleave: true,
    // Uncaught errors and unhandled rejections → PostHog Error Tracking.
    capture_exceptions: true,
    // `loaded` runs before the automatic initial pageview, so that pageview
    // is tagged too.
    loaded: (ph) => {
      if (new URLSearchParams(window.location.search).has(QA_AGENT_PARAM)) {
        ph.register_for_session({ qa_agent: true });
      }
    },
  });
}
export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  // NextAuth hands back a new session object on every refetch (e.g. when a
  // background tab regains focus). Re-identifying each time sends a `$set`,
  // which starts a fresh PostHog session in idle tabs and inflates session
  // counts. Only identify when the identity or its properties change.
  const lastIdentified = useRef<string | null>(null);

  useEffect(() => {
    // The session ended without signOutEverywhere (e.g. it expired, or the
    // sign-out didn't reload the page). Reset so later anonymous events don't
    // attach to the person who just left, and so the next sign-in identifies.
    if (status === "unauthenticated" && lastIdentified.current !== null) {
      lastIdentified.current = null;
      posthog.reset();
      return;
    }
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

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
