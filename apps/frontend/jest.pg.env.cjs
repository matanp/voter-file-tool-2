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
  process.env.POSTGRES_PRISMA_URL = process.env.POSTGRES_PRISMA_URL_TEST;
}
