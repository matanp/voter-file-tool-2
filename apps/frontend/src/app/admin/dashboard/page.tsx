import React from "react";
import AuthCheck from "~/components/ui/authcheck";
import prisma from "~/lib/prisma";
import { ElectionDates } from "./ElectionDates";

const AdminDashboardPage: React.FC = async () => {
  const electionDates = await prisma.electionDate.findMany();

  return (
    <AuthCheck privilegeLevel="Admin">
      <div className="w-full m-1">
        <ElectionDates electionDates={electionDates} />
      </div>
    </AuthCheck>
  );
};

export default AdminDashboardPage;
