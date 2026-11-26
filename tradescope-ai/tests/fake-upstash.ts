// Helper of the tests (not a test by itself): a minimal Upstash-compatible REST server — strings (GET, SET, DEL, the
// compare-and-set EVAL script of lib/store/kv), hashes (HSET, HSETNX, HGET, HMGET, HGETALL, HLEN, HINCRBY), EXPIREAT
// and the /pipeline endpoint — so the Redis paths run without a real database.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface FakeUpstash {
  url: string;
  token: string;
  data: Map<string, string>;
  hashes: Map<string, Map<string, string>>;
  /** key → EXPIREAT time (unix seconds) */
  expiries: Map<string, number>;
  calls: string[][];
  /** make every request fail with this HTTP status (null = normal) */
  failWith: number | null;
  /** answer every request this many milliseconds late (0 = at once) */
  delayMs: number;
  close: () => Promise<void>;
}

export async function startFakeUpstash(token = 'test-token'): Promise<FakeUpstash> {
  const data = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const expiries = new Map<string, number>();
  const calls: string[][] = [];
  const state = { failWith: null as number | null, delayMs: 0 };
  const hash = (k: string, create = false) => {
    let h = hashes.get(k);
    if (!h && create) hashes.set(k, (h = new Map()));
    return h;
  };
  type Reply = { result: unknown } | { error: string };
  const run = (cmd: unknown): Reply => {
    if (!Array.isArray(cmd) || !cmd.every((x) => typeof x === 'string')) return { error: 'bad command' };
    calls.push(cmd);
    const [op, ...args] = cmd as string[];
    switch (op.toUpperCase()) {
      case 'GET':
        return { result: data.get(args[0]) ?? null };
      case 'SET':
        data.set(args[0], args[1]);
        return { result: 'OK' };
      case 'DEL':
        return { result: data.delete(args[0]) || hashes.delete(args[0]) ? 1 : 0 };
      case 'EVAL': {
        const [script, , key, mustNotExist, expected, next] = args;
        if (!script.includes("redis.call('GET', KEYS[1])")) return { error: 'unknown script' };
        const cur = data.get(key);
        const okToSet = mustNotExist === '1' ? cur === undefined : cur === expected;
        if (okToSet) data.set(key, next);
        return { result: okToSet ? 1 : 0 };
      }
      case 'HSET': {
        const h = hash(args[0], true)!;
        let added = 0;
        for (let i = 1; i + 1 < args.length; i += 2) {
          if (!h.has(args[i])) added++;
          h.set(args[i], args[i + 1]);
        }
        return { result: added };
      }
      case 'HSETNX': {
        const h = hash(args[0], true)!;
        if (h.has(args[1])) return { result: 0 };
        h.set(args[1], args[2]);
        return { result: 1 };
      }
      case 'HGET':
        return { result: hash(args[0])?.get(args[1]) ?? null };
      case 'HMGET':
        return { result: args.slice(1).map((f) => hash(args[0])?.get(f) ?? null) };
      case 'HGETALL':
        return { result: [...(hash(args[0])?.entries() ?? [])].flat() };
      case 'HLEN':
        return { result: hash(args[0])?.size ?? 0 };
      case 'HINCRBY': {
        const h = hash(args[0], true)!;
        const cur = Number(h.get(args[1]) ?? '0');
        if (!Number.isInteger(cur) || !/^-?\d+$/.test(args[2])) return { error: 'ERR value is not an integer' };
        h.set(args[1], String(cur + Number(args[2])));
        return { result: cur + Number(args[2]) };
      }
      case 'EXPIREAT':
        if (!data.has(args[0]) && !hashes.has(args[0])) return { result: 0 };
        expiries.set(args[0], Number(args[1]));
        return { result: 1 };
      default:
        return { error: `unknown command ${op}` };
    }
  };
  const server: Server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      if (state.delayMs) await new Promise((r) => setTimeout(r, state.delayMs));
      const send = (status: number, obj: unknown) => {
        if (res.destroyed) return;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      if (state.failWith) return send(state.failWith, { error: 'unavailable' });
      if (req.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Unauthorized' });
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        return send(400, { error: 'bad json' });
      }
      if (req.url === '/pipeline') {
        if (!Array.isArray(parsed)) return send(400, { error: 'bad pipeline' });
        return send(200, parsed.map(run));
      }
      const reply = run(parsed);
      return send('error' in reply ? 400 : 200, reply);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  const fake: FakeUpstash = {
    url: `http://127.0.0.1:${port}`,
    token,
    data,
    hashes,
    expiries,
    calls,
    get failWith() {
      return state.failWith;
    },
    set failWith(v) {
      state.failWith = v;
    },
    get delayMs() {
      return state.delayMs;
    },
    set delayMs(v) {
      state.delayMs = v;
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
  return fake;
}
