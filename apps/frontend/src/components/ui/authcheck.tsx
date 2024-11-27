"use client";

import { useSession } from "next-auth/react";
import { SignInButton } from "./signInButton";

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "authenticated") {
    return children;
  } else if (status === "loading") {
    <div className="w-full flex flex-col items-center">
      <h1>Loading...</h1>
    </div>;
  } else {
    return (
      <div className="w-full flex flex-col items-center">
        <h1>Please sign in to continue</h1>
        <SignInButton />
      </div>
    );
  }
}
