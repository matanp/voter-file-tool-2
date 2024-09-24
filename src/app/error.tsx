"use client";

import { useEffect } from "react";
// import { useRouter } from "next/navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  //   const route = useRouter();
  useEffect(() => {
    console.error(error); // Log the error to an error tracking service
  }, [error]);

  return (
    <div role="alert">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button
        onClick={() => {
          reset();
          //   route.refresh();
        }} // Reset the error boundary when clicked
      >
        Try again
      </button>
    </div>
  );
}
