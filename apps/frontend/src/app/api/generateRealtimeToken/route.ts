import { NextResponse } from "next/server";
import * as Ably from "ably";
import { auth } from "~/auth";

export async function POST() {
  if (!process.env.ABLY_API_KEY) {
    return NextResponse.json(
      { error: "Missing ABLY_API_KEY in environment." },
      { status: 500 },
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const clientId = session.user.id;

  const ably = new Ably.Rest(process.env.ABLY_API_KEY);
  try {
    const tokenRequest = await ably.auth.createTokenRequest({ clientId });
    return NextResponse.json(tokenRequest, { status: 200 });
  } catch (err) {
    console.error("Ably token creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create realtime token" },
      { status: 502 },
    );
  }
}
