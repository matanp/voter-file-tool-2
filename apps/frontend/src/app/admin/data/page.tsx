import React from "react";
import AuthCheck from "~/components/ui/authcheck";
import { CommitteeUploadDiscrepancies } from "./CommitteeUploadDiscrepancies";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ElectionDates } from "../dashboard/ElectionDates";
import prisma from "~/lib/prisma";

const AdminDataPage: React.FC = async () => {
  const electionDates = await prisma.electionDate.findMany();

  return (
    <AuthCheck privilegeLevel="Admin">
      <div className="w-full m-4 h-full">
        <Tabs defaultValue="discrepancies" className="w-[400px]">
          <TabsList>
            <TabsTrigger value="discrepancies">
              Committee Upload Discrepancies
            </TabsTrigger>
            <TabsTrigger value="election-dates">Election Dates</TabsTrigger>
          </TabsList>
          <TabsContent value="discrepancies">
            <CommitteeUploadDiscrepancies />
          </TabsContent>
          <TabsContent value="election-dates">
            <ElectionDates electionDates={electionDates} />
          </TabsContent>
        </Tabs>
      </div>
    </AuthCheck>
  );
};

export default AdminDataPage;
