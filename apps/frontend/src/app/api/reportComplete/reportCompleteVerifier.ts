import type { NextRequest } from "next/server";
import { verifyWebhookSignature } from "~/lib/webhookUtils";
import { BackendAuthError } from "~/app/api/lib/withPrivilege";

/** Verifies webhook HMAC signature and returns raw body for report-complete webhooks. */
export function reportCompleteVerifier(
  req: NextRequest,
): Promise<{ rawBody: string }> {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Server configuration error");
  }
  return req.text().then((rawBody) => {
    const signature = req.headers.get("x-webhook-signature");
    if (!signature) {
      throw new BackendAuthError("Missing signature");
    }
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      throw new BackendAuthError("Invalid signature");
    }
    return { rawBody };
  });
}
