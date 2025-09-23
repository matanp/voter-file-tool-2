import React from "react";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel } from "@prisma/client";
import { XLSXConfigForm } from "./XLSXConfigForm";
import { Card, CardContent } from "~/components/ui/card";

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

  return (
    <div className="w-full min-h-screen bg-primary-foreground">
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="primary-header">Committee Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate and configure committee reports in PDF or XLSX format with
            customizable field selection and formatting options.
          </p>
        </div>
        <XLSXConfigForm />
      </div>
    </div>
  );
};

export default XLSXConfigPage;
