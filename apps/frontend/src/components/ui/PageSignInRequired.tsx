"use client";

import { SignInButton } from "./signInButton";

/** Client sign-in prompt for server pages that gate data before rendering. */
export default function PageSignInRequired() {
  return (
    <div className="w-full flex flex-col items-center">
      <h1>Please sign in to continue</h1>
      <SignInButton />
    </div>
  );
}
