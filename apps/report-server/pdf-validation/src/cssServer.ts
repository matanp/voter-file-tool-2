import http from 'http';
import type { AddressInfo } from 'net';

export type CssRequest = { at: number; path: string; status: number; bytes: number };

/**
 * Serves the deployed public/tailwind.css (read once, never rebuilt) on a harness-owned port.
 * The generators link `http://localhost:${PORT}/tailwind.css`, so the worker's PORT points here
 * and renders never touch the live service. It listens on 127.0.0.1 and, when available, ::1 on
 * the same port, because Chrome may resolve localhost to either.
 */
export class CssServer {
  readonly requests: CssRequest[] = [];
  private servers: http.Server[] = [];
  port = 0;

  constructor(private readonly css: Buffer) {}

  private handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const path = (req.url ?? '').split('?')[0] ?? '';
    const ok = req.method === 'GET' && path === '/tailwind.css';
    const body = ok ? this.css : Buffer.from('not found');
    res.writeHead(ok ? 200 : 404, { 'Content-Type': ok ? 'text/css' : 'text/plain', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
    res.end(body, () => this.requests.push({ at: Date.now(), path, status: ok ? 200 : 404, bytes: ok ? body.length : 0 }));
  };

  async start(): Promise<number> {
    const first = http.createServer(this.handler);
    await new Promise<void>((resolve, reject) => first.once('error', reject).listen(0, '127.0.0.1', resolve));
    this.port = (first.address() as AddressInfo).port;
    this.servers.push(first);
    const v6 = http.createServer(this.handler);
    await new Promise<void>((resolve) => {
      v6.once('error', () => resolve()).listen(this.port, '::1', () => {
        this.servers.push(v6);
        resolve();
      });
    });
    return this.port;
  }

  between(from: number, to: number): CssRequest[] {
    return this.requests.filter((r) => r.at >= from && r.at <= to);
  }

  async stop(): Promise<void> {
    await Promise.all(
      this.servers.map(
        (s) =>
          new Promise<void>((resolve) => {
            s.close(() => resolve());
            s.closeAllConnections();
          }),
      ),
    );
  }
}
