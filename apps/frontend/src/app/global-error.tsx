"use client";

// Errors thrown by the root layout itself. They replace the whole document, so
// this renders its own <html> and <body>; app/error.tsx handles the rest.
import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    // A no-op if the layout failed before PostHog initialized.
    posthog.captureException(error, { boundary: "app/global-error" });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div role="alert" style={{ padding: "2rem", fontFamily: "sans-serif" }}>
          <h2>Something went wrong!</h2>
          <button type="button" onClick={() => reset()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
