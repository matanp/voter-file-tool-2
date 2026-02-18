import AuthCheck from "~/components/ui/authcheck";
import { AdminSidebar } from "./AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthCheck privilegeLevel="Admin">
      <div className="flex min-h-[calc(100vh-4.5rem)]">
        <AdminSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </AuthCheck>
  );
}
