// Helper of the tests (not a test by itself): a minimal Upstash-compatible REST server — GET, SET, DEL and the
// compare-and-set EVAL script used by lib/store/kv — so the Redis path runs without a real database.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface FakeUpstash {
  url: string;
  token: string;
  data: Map<string, string>;
  calls: string[][];
  /** make every request fail with this HTTP status (null = normal) */
  failWith: number | null;
  close: () => Promise<void>;
}

export async function startFakeUpstash(token = 'test-token'): Promise<FakeUpstash> {
  const data = new Map<string, string>();
  const calls: string[][] = [];
  const state = { failWith: null as number | null };
  const server: Server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const send = (status: number, obj: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      if (state.failWith) return send(state.failWith, { error: 'unavailable' });
      if (req.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Unauthorized' });
      let cmd: string[];
      try {
        cmd = JSON.parse(body);
      } catch {
        return send(400, { error: 'bad json' });
      }
      calls.push(cmd);
      const [op, ...args] = cmd;
      switch (op.toUpperCase()) {
        case 'GET':
          return send(200, { result: data.get(args[0]) ?? null });
        case 'SET':
          data.set(args[0], args[1]);
          return send(200, { result: 'OK' });
        case 'DEL':
          return send(200, { result: data.delete(args[0]) ? 1 : 0 });
        case 'EVAL': {
          const [script, , key, mustNotExist, expected, next] = args;
          if (!script.includes("redis.call('GET', KEYS[1])")) return send(400, { error: 'unknown script' });
          const cur = data.get(key);
          const okToSet = mustNotExist === '1' ? cur === undefined : cur === expected;
          if (okToSet) data.set(key, next);
          return send(200, { result: okToSet ? 1 : 0 });
        }
        default:
          return send(400, { error: `unknown command ${op}` });
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  const fake: FakeUpstash = {
    url: `http://127.0.0.1:${port}`,
    token,
    data,
    calls,
    get failWith() {
      return state.failWith;
    },
    set failWith(v) {
      state.failWith = v;
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
  return fake;
}
