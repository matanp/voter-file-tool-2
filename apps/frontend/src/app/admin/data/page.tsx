import React from "react";
import AuthCheck from "~/components/ui/authcheck";
import { UploadCommittee } from "./UploadCommitteeButton";

const AdminDataPage: React.FC = () => {
  return (
    <AuthCheck>
      <div className="w-full m-1">
        <UploadCommittee />
      </div>
    </AuthCheck>
  );
};

export default AdminDataPage;
