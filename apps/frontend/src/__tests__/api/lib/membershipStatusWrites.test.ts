/**
 * @jest-environment node
 *
 * Keeps CommitteeMembership updates inside `membershipExit.ts`, whose helpers
 * hold the rules every status change has to follow (ADR 0002): leaving ACTIVE
 * clears the Exit Report, and leaving SUBMITTED unpairs a replacement
 * (`writeMembershipLeavingSubmitted`). A source scan, like
 * `scripts/check-api-route-wrappers.mjs`: a new direct update fails here, and
 * either goes through a helper or is added below with the reason it needn't.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC = join(__dirname, "..", "..", "..");
const HELPERS = "app/api/lib/membershipExit.ts";

/** Direct updates outside the helpers, by file, with the reason each is safe. */
const ALLOWED: Record<string, { count: number; reason: string }> = {
  "app/api/committee/requestAdd/route.ts": {
    count: 1,
    reason: "resubmits a reused row: into SUBMITTED, from a status that isn't ACTIVE",
  },
  "app/api/admin/petition-outcomes/record/route.ts": {
    count: 1,
    reason: "re-records a winner who is already ACTIVE and stays ACTIVE",
  },
};

const WRITE = /\.committeeMembership\s*\.\s*(update|updateMany|upsert)\s*\(|UPDATE\s+"CommitteeMembership"/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("CommitteeMembership updates", () => {
  it("go through membershipExit.ts, apart from the listed exceptions", () => {
    const found: Record<string, number> = {};
    for (const path of sourceFiles(SRC)) {
      const file = relative(SRC, path).split(sep).join("/");
      if (file === HELPERS) continue;
      const count = readFileSync(path, "utf8").match(WRITE)?.length ?? 0;
      if (count > 0) found[file] = count;
    }

    expect(found).toEqual(
      Object.fromEntries(
        Object.entries(ALLOWED).map(([file, { count }]) => [file, count]),
      ),
    );
  });
});
