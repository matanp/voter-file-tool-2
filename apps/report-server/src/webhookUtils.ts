import { createHmac } from 'crypto';

/**
 * Creates an HMAC signature for webhook payloads
 * @param payload - The payload to sign (as string or Buffer)
 * @param secret - The webhook secret key
 * @returns The HMAC signature in the format "sha256=<hex>"
 */
export function createWebhookSignature(
  payload: string | Buffer,
  secret: string
): string {
  const hmac = createHmac('sha256', secret);
  if (typeof payload === 'string') {
    hmac.update(payload, 'utf8');
  } else {
    hmac.update(payload);
  }
  const signature = hmac.digest('hex');
  return `sha256=${signature}`;
}
