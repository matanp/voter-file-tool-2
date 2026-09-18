/**
 * Point Prisma at the test database before any test file imports the client.
 * A remote POSTGRES_PRISMA_URL is never rewritten — that would target production.
 */
process.env.SKIP_ENV_VALIDATION ??= "1";

if (!process.env.POSTGRES_PRISMA_URL_TEST && process.env.POSTGRES_PRISMA_URL) {
  const url = process.env.POSTGRES_PRISMA_URL;
  if (/(localhost|127\.0\.0\.1)/.test(url)) {
    process.env.POSTGRES_PRISMA_URL_TEST = url.replace(
      /\/[^/?]+(?=\?|$)/,
      "/voter_file_test",
    );
  }
}

if (process.env.POSTGRES_PRISMA_URL_TEST) {
  let parsedTestUrl;
  try {
    parsedTestUrl = new URL(process.env.POSTGRES_PRISMA_URL_TEST);
  } catch {
    throw new Error(
      "POSTGRES_PRISMA_URL_TEST must be a valid local PostgreSQL test-database URL",
    );
  }

  const isPostgres = ["postgres:", "postgresql:"].includes(
    parsedTestUrl.protocol,
  );
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(
    parsedTestUrl.hostname,
  );
  const databaseName = decodeURIComponent(parsedTestUrl.pathname).replace(
    /^\/+/,
    "",
  );

  if (!isPostgres || !isLocal || !databaseName.endsWith("_test")) {
    throw new Error(
      "Refusing destructive PostgreSQL integration tests: POSTGRES_PRISMA_URL_TEST must target localhost and a database whose name ends in _test",
    );
  }

  process.env.POSTGRES_PRISMA_URL = process.env.POSTGRES_PRISMA_URL_TEST;
}
