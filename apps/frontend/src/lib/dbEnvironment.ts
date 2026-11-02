const LOCAL_DB_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "host.docker.internal",
]);

export type DbEnvironment = {
  kind: "dev" | "prod";
  host: string;
};

/**
 * Classifies the database the app is connected to from its connection URL.
 * A local host means the dev database; anything else (e.g. Neon) is treated
 * as prod, so an unrecognized or unparseable URL errs on the side of caution.
 */
export function getDbEnvironment(
  url: string | undefined = process.env.POSTGRES_PRISMA_URL,
): DbEnvironment {
  let host = "unknown";
  try {
    host = new URL(url ?? "").hostname;
  } catch {
    // Leave host as "unknown" and fall through to prod.
  }
  return { kind: LOCAL_DB_HOSTS.has(host) ? "dev" : "prod", host };
}
