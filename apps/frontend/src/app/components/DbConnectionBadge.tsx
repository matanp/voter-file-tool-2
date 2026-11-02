import { describeDbConnection } from "~/lib/dbConnection";

/**
 * Server component: shows which database a dev build is connected to.
 * Production builds render nothing, and because this never runs on the
 * client, none of it ships in the browser bundle.
 */
export function DbConnectionBadge() {
  if (process.env.NODE_ENV === "production") return null;

  const { isLocal, host } = describeDbConnection(
    process.env.POSTGRES_PRISMA_URL,
  );
  return (
    <span
      title={`Database host: ${host}`}
      className={`rounded px-2 py-1 text-xs font-bold uppercase tracking-wide text-white ${
        isLocal ? "bg-green-700" : "bg-red-600"
      }`}
    >
      {isLocal ? "Dev DB" : "Prod DB"}
    </span>
  );
}
