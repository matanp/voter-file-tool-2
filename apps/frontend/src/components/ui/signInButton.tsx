"use client";

import { useSession, signIn } from "next-auth/react";
import { signOutEverywhere } from "~/lib/signOut";
import { Button } from "./button";
import { ManageProfileButton } from "./manageProfile";

export function SignInButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>...</div>;
  }

  if (status === "authenticated") {
    return <ManageProfileButton session={session} />;
  }

  return <Button onClick={() => signIn(undefined, { callbackUrl: "/" })}>Sign In</Button>;
}

export function SignOutButton() {
  return <Button onClick={() => signOutEverywhere()}>Sign Out</Button>;
}
