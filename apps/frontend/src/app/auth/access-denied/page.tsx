"use client";

import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Mail, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccessDeniedPage() {
  const searchParams = useSearchParams();
  const [attemptedEmail, setAttemptedEmail] = useState<string | null>(null);

  useEffect(() => {
    const email = searchParams?.get("email");
    if (email) {
      setAttemptedEmail(decodeURIComponent(email));
      console.log("Access denied for email:", email);
    }
  }, [searchParams]);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Thank you for your interest!
          </h1>
          <p className="text-gray-600">
            Thank you for your interest in Open Source Politics. Right now we
            don't have public access as we're currently in beta testing with a
            select group of users.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {attemptedEmail && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <strong>Attempted email:</strong> {attemptedEmail}
                <br />
                <br />
                This email address does not have a valid invitation. Please
                contact an administrator to request an invite link.
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4">
            <div className="flex flex-col space-y-2">
              <Button asChild variant="ghost">
                <Link href="/">
                  <Users className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
