import { describeDbConnection } from "~/lib/dbConnection";

describe("describeDbConnection", () => {
  it("treats localhost as local", () => {
    expect(
      describeDbConnection("postgresql://user:pw@localhost:5432/voter_file"),
    ).toEqual({ isLocal: true, host: "localhost" });
  });

  it("treats 127.0.0.1 as local", () => {
    expect(
      describeDbConnection("postgresql://u:p@127.0.0.1:5433/db").isLocal,
    ).toBe(true);
  });

  it("treats a remote host as not local", () => {
    expect(
      describeDbConnection(
        "postgres://u:p@ep-example-pooler.us-east-1.aws.neon.tech:5432/db?sslmode=require",
      ),
    ).toEqual({
      isLocal: false,
      host: "ep-example-pooler.us-east-1.aws.neon.tech",
    });
  });

  it("treats a missing or unparseable URL as not local", () => {
    expect(describeDbConnection(undefined)).toEqual({
      isLocal: false,
      host: "unknown",
    });
    expect(describeDbConnection("not a url").isLocal).toBe(false);
  });
});
