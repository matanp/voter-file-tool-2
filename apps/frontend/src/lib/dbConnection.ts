const LOCAL_DB_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "host.docker.internal",
]);

export type DbConnection = {
  /** True when the database runs on this machine (the dev database). */
  isLocal: boolean;
  host: string;
};

/**
 * Describes the database a connection URL points at. Any non-local host
 * (e.g. Neon) counts as remote, and so does a missing or unparseable URL,
 * so an unknown setup errs on the side of "this might be prod".
 */
export function describeDbConnection(url: string | undefined): DbConnection {
  let host = "unknown";
  try {
    host = new URL(url ?? "").hostname;
  } catch {
    // Leave host as "unknown"; it is treated as remote.
  }
  return { isLocal: LOCAL_DB_HOSTS.has(host), host };
}
