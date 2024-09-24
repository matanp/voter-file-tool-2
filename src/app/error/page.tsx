"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div>
      <h1>Something went wrong!</h1>
      <p>{error ? `Error: ${error}` : "An unknown error occurred."}</p>
      <a href="/">Go back to the home page</a>
    </div>
  );
}
