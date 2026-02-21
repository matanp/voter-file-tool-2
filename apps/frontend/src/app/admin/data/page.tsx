import { redirect } from "next/navigation";

// Redirect /admin/data to /admin (Data is now the admin landing page)
export default function AdminDataPage() {
  redirect("/admin");
}
