import { NextResponse } from "next/server";
import { withPublic } from "~/app/api/lib/withPrivilege";

export const dynamic = "force-dynamic";

// A faulty API route to test Sentry's error monitoring. Disabled in production.
async function getSentryExampleHandler() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  throw new Error("Sentry Example API Route Error");
}

export const GET = withPublic(getSentryExampleHandler);
