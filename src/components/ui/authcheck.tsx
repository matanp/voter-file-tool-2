"use client";

import { useSession } from "next-auth/react";
import { SignInButton } from "./signInButton";

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "authenticated") {
    return children;
  } else if (status === "loading") {
    return <h1>Loading...</h1>;
  } else {
    return <SignInButton />;
  }
}
