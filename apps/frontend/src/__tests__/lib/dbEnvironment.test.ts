import { getDbEnvironment } from "~/lib/dbEnvironment";

describe("getDbEnvironment", () => {
  it("treats localhost as the dev database", () => {
    expect(
      getDbEnvironment("postgresql://user:pw@localhost:5432/voter_file"),
    ).toEqual({ kind: "dev", host: "localhost" });
  });

  it("treats 127.0.0.1 as the dev database", () => {
    expect(getDbEnvironment("postgresql://u:p@127.0.0.1:5433/db").kind).toBe(
      "dev",
    );
  });

  it("treats a remote host as the prod database", () => {
    expect(
      getDbEnvironment(
        "postgres://u:p@ep-example-pooler.us-east-1.aws.neon.tech:5432/db?sslmode=require",
      ),
    ).toEqual({
      kind: "prod",
      host: "ep-example-pooler.us-east-1.aws.neon.tech",
    });
  });

  it("treats a missing or unparseable URL as prod", () => {
    expect(getDbEnvironment("")).toEqual({ kind: "prod", host: "unknown" });
    expect(getDbEnvironment("not a url").kind).toBe("prod");
  });
});
