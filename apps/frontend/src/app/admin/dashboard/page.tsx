import { redirect } from "next/navigation";

// Redirect /admin/dashboard to /admin (dashboard content is duplicated in Data)
export default function AdminDashboardPage() {
  redirect("/admin");
}
