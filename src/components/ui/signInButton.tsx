"use client";

import { useSession, signIn, signOut } from "next-auth/react";
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

  return <Button onClick={() => signIn()}>Sign In</Button>;
}

export function SignOutButton() {
  return <Button onClick={() => signOut()}>Sign Out</Button>;
}
