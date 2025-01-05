import React from "react";
import AuthCheck from "~/components/ui/authcheck";
import { MarkDropdownDuplicates } from "./MarkDropdownDuplicates";
import prisma from "~/lib/prisma";

const AdminDashboardPage: React.FC = () => {
  const dropdownLists = await prisma.dropdownLists.findFirst({});

  return (
    <AuthCheck privilegeLevel="Admin">
      <div className="w-full m-1">
        <MarkDropdownDuplicates />
      </div>
    </AuthCheck>
  );
};

export default AdminDashboardPage;
