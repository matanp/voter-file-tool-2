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
  try {
    const expectedSignature = createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    const providedSignature = signature.replace("sha256=", "");

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(providedSignature, "hex"),
    );
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}
