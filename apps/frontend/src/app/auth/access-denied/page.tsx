import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Shield, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import AccessDeniedContent from "./AccessDeniedContent";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Thank you for your interest!
          </h1>
          <p className="text-gray-600">
            Thank you for your interest in Open Source Politics. Right now we
            don&apos;t have public access as we&apos;re currently in beta
            testing with a select group of users.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Suspense fallback={<div>Loading...</div>}>
            <AccessDeniedContent />
          </Suspense>

          <div className="pt-4">
            <div className="flex flex-col space-y-2">
              <Button asChild variant="ghost">
                <Link href="/">
                  <Users className="mr-2 h-4 w-4" aria-hidden="true" />
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
