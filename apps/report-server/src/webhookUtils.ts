import { createHmac } from 'crypto';

/**
 * POSTs a report-complete callback and logs a non-2xx response, which would otherwise
 * leave the Report row in PROCESSING with no trace (e.g. the frontend rejecting a
 * payload it doesn't know yet). Logging only: a failed callback is not retried.
 */
export async function postReportCallback(
  url: string,
  headers: Record<string, string>,
  body: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const res = await fetchImpl(url, { method: 'POST', headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(
      `report-complete callback returned ${res.status} ${res.statusText}: ${text.slice(0, 500)}`
    );
  }
}

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
