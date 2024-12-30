"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, Suspense } from "react";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";

function ErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  useEffect(() => {
    Sentry.captureException(error);
    console.error("Global error:", error);
  }, [error]);

  return (
    <Card className="flex flex-col gap-4 items-center p-2">
      <CardHeader>
        <h1 className="text-2xl font-bold">Something went wrong!</h1>
      </CardHeader>
      <CardContent>
        <p>{error ? `Error: ${error}` : "An unknown error occurred."}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={() => router.push("/")}>
          Go back to the home page
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ErrorPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorPage />
    </Suspense>
  );
}
