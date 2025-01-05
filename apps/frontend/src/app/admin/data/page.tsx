import React from "react";
import AuthCheck from "~/components/ui/authcheck";
import { CommitteeUploadDiscrepancies } from "./CommitteeUploadDiscrepancies";

const AdminDataPage: React.FC = () => {
  return (
    <AuthCheck privilegeLevel="Admin">
      <div className="w-full m-1">
        <CommitteeUploadDiscrepancies />
      </div>
    </AuthCheck>
  );
};

export default AdminDataPage;
