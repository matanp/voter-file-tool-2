"use client";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const [attemptedEmail, setAttemptedEmail] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const email = searchParams?.get("email");
    const reasonParam = searchParams?.get("reason");
    if (email) {
      setAttemptedEmail(email);
      console.log("Access denied for email:", email);
    }
    if (reasonParam) {
      setReason(reasonParam);
    }
  }, [searchParams]);

  if (!attemptedEmail) {
    return null;
  }

  if (reason === "grant-failed") {
    return (
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <strong>Attempted email:</strong> {attemptedEmail}
          <br />
          <br />
          Your invitation was found, but account setup could not be completed.
          Please try signing in again. If the problem persists, contact an
          administrator for assistance.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <Mail className="h-4 w-4" />
      <AlertDescription>
        <strong>Attempted email:</strong> {attemptedEmail}
        <br />
        <br />
        This email address does not have a valid invitation. Please contact an
        administrator to request an invite link.
      </AlertDescription>
    </Alert>
  );
}
