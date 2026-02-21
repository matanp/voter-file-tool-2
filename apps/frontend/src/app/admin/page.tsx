import React from "react";
import { AdminDataClient } from "./data/AdminDataClient";
import prisma from "~/lib/prisma";

const AdminPage = async () => {
  const electionDates = await prisma.electionDate.findMany();
  const officeNames = await prisma.officeName.findMany();

  return (
    <AdminDataClient electionDates={electionDates} officeNames={officeNames} />
  );
};

export default AdminPage;
