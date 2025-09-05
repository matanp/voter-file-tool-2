import React from "react";

import prisma from "~/lib/prisma";
import AuthCheck from "~/components/ui/authcheck";

const ReportsPage: React.FC = async () => {
  return (
    <AuthCheck>
      <div className="w-full p-4">hello</div>
    </AuthCheck>
  );
};

export default ReportsPage;
