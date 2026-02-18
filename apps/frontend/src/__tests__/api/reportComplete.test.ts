import { reportCompleteVerifier } from "~/app/api/reportComplete/reportCompleteVerifier";
import { createWebhookSignature } from "~/lib/webhookUtils";
import type { NextRequest } from "next/server";

const TEST_SECRET = "test-webhook-secret";

/** Creates a minimal request-like object for testing the verifier (text + headers.get). */
function createVerifierRequest(
  rawBody: string,
  signature: string | null,
): NextRequest {
  return {
    text: () => Promise.resolve(rawBody),
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "x-webhook-signature" ? signature : null,
    },
  } as unknown as NextRequest;
}

describe("reportCompleteVerifier", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, WEBHOOK_SECRET: TEST_SECRET };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws when WEBHOOK_SECRET is missing", () => {
    delete process.env.WEBHOOK_SECRET;
    const body = '{"success":true,"jobId":"job-1"}';
    const req = createVerifierRequest(
      body,
      createWebhookSignature(body, TEST_SECRET),
    );

    expect(() => reportCompleteVerifier(req)).toThrow(
      "Server configuration error",
    );
  });

  it("throws when x-webhook-signature header is missing", async () => {
    const body = '{"success":true,"jobId":"job-1"}';
    const req = createVerifierRequest(body, null);

    await expect(reportCompleteVerifier(req)).rejects.toThrow(
      "Missing signature",
    );
  });

  it("throws when signature is invalid", async () => {
    const body = '{"success":true,"jobId":"job-1"}';
    const req = createVerifierRequest(body, "sha256=" + "0".repeat(64));

    await expect(reportCompleteVerifier(req)).rejects.toThrow(
      "Invalid signature",
    );
  });

  it("returns { rawBody } when signature is valid", async () => {
    const rawBody = '{"success":true,"jobId":"job-1"}';
    const signature = createWebhookSignature(rawBody, TEST_SECRET);
    const req = createVerifierRequest(rawBody, signature);

    const result = await reportCompleteVerifier(req);

    expect(result).toEqual({ rawBody });
    expect(result.rawBody).toBe(rawBody);
  });
});
