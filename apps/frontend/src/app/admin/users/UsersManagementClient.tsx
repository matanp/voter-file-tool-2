"use client";

/**
 * Tab shell for User Management: Users (jurisdiction scope) and Invite New Users.
 */

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UsersClient } from "./UsersClient";
import { InviteManagement } from "./InviteManagement";
import type { JurisdictionMeta, UserWithJurisdictions } from "./page";

interface UsersManagementClientProps {
  activeTermId: string | null;
  users: UserWithJurisdictions[];
  jurisdictionMeta: JurisdictionMeta | null;
}

export function UsersManagementClient({
  activeTermId,
  users,
  jurisdictionMeta,
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
          <p className="text-muted-foreground">
            No active committee term is set. Configure an active term to manage
            user jurisdictions.
          </p>
        )}
      </TabsContent>
      <TabsContent value="invite-new-users">
        <InviteManagement />
      </TabsContent>
    </Tabs>
  );
}
