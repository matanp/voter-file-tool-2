import React from "react";
import AuthCheck from "~/components/ui/authcheck";
import { AdminDataClient } from "./AdminDataClient";
import prisma from "~/lib/prisma";

const AdminDataPage = async () => {
  const electionDates = await prisma.electionDate.findMany();
  const officeNames = await prisma.officeName.findMany();

  return (
    <AuthCheck privilegeLevel="Admin">
      <AdminDataClient
        electionDates={electionDates}
        officeNames={officeNames}
      />
    </AuthCheck>
  );
};

export default AdminDataPage;
