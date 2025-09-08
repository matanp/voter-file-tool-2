import { createHmac, timingSafeEqual } from "crypto";

/**
 * Creates an HMAC signature for webhook payloads
 * @param payload - The payload to sign (as string or Buffer)
 * @param secret - The webhook secret key
 * @returns The HMAC signature in the format "sha256=<hex>"
 */
export function createWebhookSignature(
  payload: string | Buffer,
  secret: string,
): string {
  const signature = createHmac("sha256", secret)
    .update(payload, typeof payload === "string" ? "utf8" : undefined)
    .digest("hex");
  return `sha256=${signature}`;
}

/**
 * Verifies an HMAC signature for webhook payloads
 * @param payload - The payload that was signed
 * @param signature - The signature to verify (in format "sha256=<hex>")
 * @param secret - The webhook secret key
 * @returns True if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  // Validate signature format - must start with "sha256="
  if (!signature.startsWith("sha256=")) {
    return false;
  }

  // Strip the prefix and validate the remaining string
  const providedSignature = signature.slice(7); // Remove "sha256=" prefix

  // Validate that the remaining string is a 64-character hex string
  if (
    providedSignature.length !== 64 ||
    !/^[0-9a-fA-F]{64}$/.test(providedSignature)
  ) {
    return false;
  }

  // Compute the expected HMAC
  const expectedSignature = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  // Convert both to Buffers
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const providedBuffer = Buffer.from(providedSignature, "hex");

  // Ensure both buffers are the same length before calling timingSafeEqual
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
