import React from "react";
import AuthCheck from "~/components/ui/authcheck";
import { CommitteeUploadDiscrepancies } from "./CommitteeUploadDiscrepancies";
import { InviteManagement } from "./InviteManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ElectionDates } from "../dashboard/ElectionDates";
import { ElectionOffices } from "../dashboard/ElectionOffices";
import prisma from "~/lib/prisma";

const AdminDataPage = async () => {
  const electionDates = await prisma.electionDate.findMany();
  const officeNames = await prisma.officeName.findMany();

  return (
    <AuthCheck privilegeLevel="Admin">
      <div className="w-full m-4 h-full">
        <Tabs defaultValue="invites" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invites">User Invites</TabsTrigger>
            <TabsTrigger value="discrepancies">
              Committee Upload Discrepancies
            </TabsTrigger>
            <TabsTrigger value="election-dates">Election Dates</TabsTrigger>
            <TabsTrigger value="election-offices">Office Names</TabsTrigger>
          </TabsList>
          <TabsContent value="invites">
            <InviteManagement />
          </TabsContent>
          <TabsContent value="discrepancies">
            <CommitteeUploadDiscrepancies />
          </TabsContent>
          <TabsContent value="election-dates">
            <ElectionDates electionDates={electionDates} />
          </TabsContent>
          <TabsContent value="election-offices">
            <ElectionOffices officeNames={officeNames} />
          </TabsContent>
        </Tabs>
      </div>
    </AuthCheck>
  );
};

export default AdminDataPage;
