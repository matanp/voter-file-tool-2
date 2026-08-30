import React from "react";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel } from "@prisma/client";
import { XLSXConfigForm } from "./XLSXConfigForm";
import { Card, CardContent } from "~/components/ui/card";
import { PageContainer } from "~/components/layout/PageContainer";
import { PageHeader } from "~/components/layout/PageHeader";

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
    <PageContainer>
      <PageHeader
        title="Committee Reports"
        description="Generate and configure committee reports in PDF or XLSX format with customizable field selection and formatting options."
      />
      <XLSXConfigForm />
    </PageContainer>
  );
};

export default XLSXConfigPage;
