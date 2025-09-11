import React from "react";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel } from "@prisma/client";
import { XLSXConfigForm } from "./XLSXConfigForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import prisma from "~/lib/prisma";
import type { CommitteeWithMembers } from "../committees/committeeUtils";

const XLSXConfigPage = async () => {
  const permissions = await auth();

  const isAdminUser = hasPermissionFor(
    permissions?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess,
    PrivilegeLevel.Admin,
  );

  if (!isAdminUser) {
    return (
      <div className="w-full p-4">
        <Card>
          <CardContent className="pt-6">
            <p>You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const committeeLists: CommitteeWithMembers[] =
    await prisma.committeeList.findMany({
      include: {
        committeeMemberList: true,
      },
    });

  return (
    <div className="w-full p-4">
      <Card>
        <CardHeader>
          <CardTitle>Document Generation Configuration</CardTitle>
          <CardDescription>
            Configure and generate committee reports in PDF or XLSX format with
            customizable field selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <XLSXConfigForm committeeLists={committeeLists} />
        </CardContent>
      </Card>
    </div>
  );
};

export default XLSXConfigPage;
