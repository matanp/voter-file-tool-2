"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Loader2, Mail, Shield, Calendar, MessageSquare } from "lucide-react";
import { PrivilegeLevel, type Invite } from "@prisma/client";

type InviteData = Pick<Invite, "email" | "privilegeLevel" | "customMessage"> & {
  expiresAt: string; // API returns as string instead of Date
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const token = params?.token as string;

  // Redirect logged-in users to home page
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/auth/invite/${token}`);

        if (response.ok) {
          const data = (await response.json()) as unknown as {
            invite: InviteData;
          };
          setInvite(data.invite);
        } else {
          const errorData = (await response.json()) as unknown as {
            error: string;
          };
          setError(errorData.error || "Failed to validate invite");
        }
      } catch (err) {
        console.error("Error fetching invite:", err);
        setError("Failed to validate invite");
      } finally {
        setLoading(false);
      }
    };

    void fetchInvite();
  }, [token]);

  const handleSignIn = async () => {
    if (!invite) return;

    setSigningIn(true);
    try {
      await signIn("google", {
        callbackUrl: "/",
      });
    } catch (err) {
      console.error("Error signing in:", err);
      setError("Failed to sign in. Please try again.");
      setSigningIn(false);
    }
  };

  const getPrivilegeColor = (level: PrivilegeLevel) => {
    switch (level) {
      case PrivilegeLevel.Developer:
        return "bg-purple-100 text-purple-800";
      case PrivilegeLevel.Admin:
        return "bg-red-100 text-red-800";
      case PrivilegeLevel.RequestAccess:
        return "bg-yellow-100 text-yellow-800";
      case PrivilegeLevel.ReadAccess:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show loading while checking authentication or validating invite
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>
            {status === "loading"
              ? "Checking authentication..."
              : "Validating invite..."}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              Invalid Invite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => router.push("/")}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Invite Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              This invite could not be found or has expired.
            </p>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => router.push("/")}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
          <p className="text-muted-foreground">
            You&apos;ve been invited to join the Voter File Tool
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{invite.email}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Access Level:
              </span>
              <Badge className={getPrivilegeColor(invite.privilegeLevel)}>
                {invite.privilegeLevel.replace(/([A-Z])/g, " $1").trim()}
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Expires: {formatDate(invite.expiresAt)}
              </span>
            </div>
          </div>

          {invite.customMessage && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Message from Admin:</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900">{invite.customMessage}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full"
              size="lg"
            >
              {signingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign up with Google"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You&apos;ll be redirected to Google to sign in with your account
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
