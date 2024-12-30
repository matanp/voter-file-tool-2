// GLOBAL ERROR FALLBACK, NOT THE /ERROR PAGE
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div role="alert">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <Button
        onClick={() => {
          reset();
        }}
      >
        Try again
      </Button>
    </div>
  );
}
