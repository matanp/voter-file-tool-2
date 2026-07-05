"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Loader2,
  Mail,
  Shield,
  Calendar,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { PrivilegeLevel, type Invite } from "@prisma/client";
import { useApiMutation } from "~/hooks/useApiMutation";

type SerializedInviteJurisdiction = {
  id: string;
  cityTown: string;
  legDistrict: number | null;
  termId: string;
  term: { label: string };
};

type InviteData = Pick<Invite, "email" | "privilegeLevel" | "customMessage"> & {
  expiresAt: string;
  jurisdictions: SerializedInviteJurisdiction[];
};

type ApplyInviteResponse = {
  status: "applied" | "already_applied";
  privilegeLevel: PrivilegeLevel;
};

function jurisdictionLabel(cityTown: string, legDistrict: number | null) {
  return legDistrict != null
    ? `${cityTown} — LD ${legDistrict}`
    : `${cityTown} (all districts)`;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);
  const applyAttemptedRef = useRef(false);
  const prevAuthStatusRef = useRef(status);

  const token = params?.token as string;

  const applyMutation = useApiMutation<ApplyInviteResponse>(
    token ? `/api/auth/invite/${encodeURIComponent(token)}/apply` : "",
    "POST",
    {
      onSuccess: () => {
        void (async () => {
          setApplySuccess(true);
          await update();
          window.setTimeout(() => {
            router.push("/");
          }, 1500);
        })();
      },
      onError: (err) => {
        setError(err.message);
      },
    },
  );

  const { mutate: applyInvite, loading: applyLoading } = applyMutation;

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }

    if (status === "loading") {
      return;
    }

    const fetchInvite = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/auth/invite/${encodeURIComponent(token)}`,
          { credentials: "include" },
        );

        if (response.ok) {
          const data = (await response.json()) as unknown as {
            invite: InviteData;
            existingAccount?: boolean;
          };
          setInvite(data.invite);
          setExistingAccount(data.existingAccount ?? false);
        } else {
          const errorData = (await response.json()) as unknown as {
            error: string;
          };
          setInvite(null);
          setError(errorData.error || "Failed to validate invite");
        }
      } catch (err) {
        console.error("Error fetching invite:", err);
        setInvite(null);
        setError("Failed to validate invite");
      } finally {
        setLoading(false);
      }
    };

    void fetchInvite();
  }, [token, status]);

  useEffect(() => {
    if (
      prevAuthStatusRef.current === "authenticated" &&
      status === "unauthenticated"
    ) {
      applyAttemptedRef.current = false;
    }
    prevAuthStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email || !invite) {
      return;
    }

    if (session.user.email !== invite.email) {
      return;
    }

    if (applyAttemptedRef.current || applyLoading || applySuccess) {
      return;
    }

    applyAttemptedRef.current = true;
    void applyInvite();
  }, [
    status,
    session,
    invite,
    applyInvite,
    applyLoading,
    applySuccess,
  ]);

  const handleSignIn = async () => {
    if (!invite) return;

    try {
      await signIn("google", {
        callbackUrl: `/auth/invite/${encodeURIComponent(token)}`,
      });
    } catch (err) {
      console.error("Error signing in:", err);
      setError("Failed to sign in. Please try again.");
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
  };

  const getPrivilegeColor = (level: PrivilegeLevel) => {
    switch (level) {
      case PrivilegeLevel.Developer:
        return "bg-purple-100 text-purple-800";
      case PrivilegeLevel.Admin:
        return "bg-red-100 text-red-800";
      case PrivilegeLevel.Leader:
        return "bg-blue-100 text-blue-800";
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

  const sessionEmail = session?.user?.email;
  const emailMismatch =
    status === "authenticated" &&
    !!sessionEmail &&
    !!invite &&
    sessionEmail !== invite.email;

  const isApplying =
    applyLoading ||
    (status === "authenticated" &&
      !!sessionEmail &&
      !!invite &&
      sessionEmail === invite.email &&
      !applySuccess &&
      !error);

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

  if (applySuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Your invite has been applied. Redirecting…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isApplying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Applying your invite…</span>
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
              <Button
                variant="outline"
                onClick={() => router.push("/?skipInviteClaim=1")}
              >
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
              <Button
                variant="outline"
                onClick={() => router.push("/?skipInviteClaim=1")}
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (emailMismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Wrong Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This invite is for{" "}
              <span className="font-medium text-foreground">{invite.email}</span>
              , but you&apos;re signed in as{" "}
              <span className="font-medium text-foreground">{sessionEmail}</span>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              The invite is still valid and has not been used. Your current
              account is unchanged. Sign out, then sign in with the invited email
              to complete this invite.
            </p>
            <Button onClick={handleSignOut} className="w-full" size="lg">
              Sign out
            </Button>
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => router.push("/?skipInviteClaim=1")}
              >
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
          <CardTitle className="text-2xl">
            {existingAccount ? "Complete Your Invite" : "You're Invited!"}
          </CardTitle>
          <p className="text-muted-foreground">
            {existingAccount
              ? "Sign in with Google to apply your pending access"
              : "You've been invited to join the Voter File Tool"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
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

            {invite.privilegeLevel === PrivilegeLevel.Leader &&
              invite.jurisdictions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Assigned scope</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-7">
                    {invite.jurisdictions.map((j) => (
                      <Badge key={j.id} variant="outline" hoverable={false}>
                        {jurisdictionLabel(j.cityTown, j.legDistrict)} —{" "}
                        {j.term.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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
            <Button onClick={handleSignIn} className="w-full" size="lg">
              {existingAccount
                ? "Sign in with Google to complete your invite"
                : "Sign up with Google"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/?skipInviteClaim=1")}
              className="w-full"
            >
              Not now
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
