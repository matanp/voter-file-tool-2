"use client";

/**
 * Tab shell for User Management: Users (jurisdiction scope) and Invite New Users.
 */

import React from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UsersClient } from "./UsersClient";
import { InviteManagement } from "./InviteManagement";
import type {
  JurisdictionMeta,
  TermOption,
  UserWithJurisdictions,
} from "./page";

interface UsersManagementClientProps {
  activeTermId: string | null;
  users: UserWithJurisdictions[];
  jurisdictionMeta: JurisdictionMeta | null;
  terms: TermOption[];
}

export function UsersManagementClient({
  activeTermId,
  users,
  jurisdictionMeta,
  terms,
}: UsersManagementClientProps) {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="invite-new-users">Invite New Users</TabsTrigger>
      </TabsList>
      <TabsContent value="users">
        {activeTermId != null && jurisdictionMeta != null ? (
          <UsersClient
            users={users}
            activeTermId={activeTermId}
            jurisdictionMeta={jurisdictionMeta}
          />
        ) : (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Active term required</AlertTitle>
            <AlertDescription>
              Jurisdiction management requires an active committee term.{" "}
              <Link
                href="/admin/terms"
                className="font-medium underline underline-offset-4"
              >
                Activate a term in Admin → Terms
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}
      </TabsContent>
      <TabsContent value="invite-new-users">
        <InviteManagement
          terms={terms}
          jurisdictionMeta={jurisdictionMeta}
          activeTermId={activeTermId}
        />
      </TabsContent>
    </Tabs>
  );
}
