/**
 * Loading skeleton for admin route transitions. Shown immediately when navigating
 * between admin pages while the Server Component fetches data.
 */
export default function AdminLoading() {
  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="mt-2 h-4 w-96 max-w-full bg-muted rounded animate-pulse" />
      </div>
      <div className="h-64 bg-muted rounded animate-pulse" />
    </div>
  );
}
