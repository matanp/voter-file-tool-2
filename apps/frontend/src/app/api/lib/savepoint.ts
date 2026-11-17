import type { Prisma } from "@prisma/client";

/**
 * Runs `fn` inside a PostgreSQL savepoint of the caller's interactive
 * transaction. If `fn` throws, only its own writes roll back and the
 * transaction stays usable (even after a database error such as a unique
 * violation, which otherwise aborts the whole transaction); the error is
 * rethrown for the caller to report. Prisma has no nested transactions, so
 * this issues the savepoint statements itself. Savepoints nest by name, so a
 * nested call shadows the outer savepoint until it is released.
 */
export async function withSavepoint<T>(
  tx: Prisma.TransactionClient,
  fn: () => Promise<T>,
): Promise<T> {
  await tx.$executeRaw`SAVEPOINT item_savepoint`;
  let result: T;
  try {
    result = await fn();
  } catch (error) {
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT item_savepoint`;
    await tx.$executeRaw`RELEASE SAVEPOINT item_savepoint`;
    throw error;
  }
  await tx.$executeRaw`RELEASE SAVEPOINT item_savepoint`;
  return result;
}
