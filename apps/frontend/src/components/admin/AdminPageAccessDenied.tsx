/** Server-rendered denial UI for admin pages gated on actual session privilege. */
export default function AdminPageAccessDenied() {
  return (
    <div className="w-full flex flex-col items-center">
      <h1>You do not have permission to view this page</h1>
    </div>
  );
}
