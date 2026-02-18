import { createWebhookSignature } from "../webhookUtils";

/**
 * Tests for webhookUtils.
 * Tested: createWebhookSignature - format, consistency, payload/secret variations, Buffer support.
 * Not tested: verifyWebhookSignature.
 */
describe("createWebhookSignature", () => {
  const secret = "test-webhook-secret";

  it("returns sha256= prefix", () => {
    const sig = createWebhookSignature("{}", secret);
    expect(sig).toMatch(/^sha256=/);
  });

  it("produces consistent signature for same payload and secret", () => {
    const payload = '{"jobId":"test-1","success":true}';
    const sig1 = createWebhookSignature(payload, secret);
    const sig2 = createWebhookSignature(payload, secret);
    expect(sig1).toBe(sig2);
  });

  it("produces different signatures for different payloads", () => {
    const sig1 = createWebhookSignature("{}", secret);
    const sig2 = createWebhookSignature('{"x":1}', secret);
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different secrets", () => {
    const payload = "test";
    const sig1 = createWebhookSignature(payload, "secret1");
    const sig2 = createWebhookSignature(payload, "secret2");
    expect(sig1).not.toBe(sig2);
  });

  it("produces 64-character hex digest after sha256=", () => {
    const sig = createWebhookSignature("payload", secret);
    const hexPart = sig.replace(/^sha256=/, "");
    expect(hexPart).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles Buffer payload", () => {
    const payload = Buffer.from('{"test":true}', "utf8");
    const sig = createWebhookSignature(payload, secret);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
});
