// Helper of the tests (not a test by itself): a minimal Upstash-compatible REST server — strings (GET, SET, DEL),
// hashes (HSET, HSETNX, HGET, HMGET, HGETALL, HLEN, HEXISTS, HINCRBY), EXPIREAT with real expiry (on a clock that
// tests can move), the /pipeline endpoint, and the two EVAL scripts the app sends (compare-and-set in lib/store/kv,
// the metric count in lib/metrics/store), emulated command by command — so the Redis paths run without a database.
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
  /** seconds added to the real clock when deciding whether a key has expired */
  clockOffsetS: number;
  /** run each command but answer 504, as when the answer is lost on the way back */
  loseAnswers: boolean;
  close: () => Promise<void>;
}

export async function startFakeUpstash(token = 'test-token'): Promise<FakeUpstash> {
  const data = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const expiries = new Map<string, number>();
  const calls: string[][] = [];
  const state = { failWith: null as number | null, delayMs: 0, clockOffsetS: 0, loseAnswers: false };
  const nowS = () => Math.floor(Date.now() / 1000) + state.clockOffsetS;
  const purgeExpired = () => {
    for (const [k, at] of expiries) {
      if (at > nowS()) continue;
      data.delete(k);
      hashes.delete(k);
      expiries.delete(k);
    }
  };
  const hash = (k: string, create = false) => {
    let h = hashes.get(k);
    if (!h && create) hashes.set(k, (h = new Map()));
    return h;
  };
  type Reply = { result: unknown } | { error: string };
  const run = (cmd: unknown): Reply => {
    if (!Array.isArray(cmd) || !cmd.every((x) => typeof x === 'string')) return { error: 'bad command' };
    calls.push(cmd);
    purgeExpired();
    const [op, ...args] = cmd as string[];
    switch (op.toUpperCase()) {
      case 'GET':
        return { result: data.get(args[0]) ?? null };
      case 'SET':
        data.set(args[0], args[1]);
        expiries.delete(args[0]); // SET clears a key's expiry, as in Redis
        return { result: 'OK' };
      case 'DEL': {
        const hit = data.delete(args[0]) || hashes.delete(args[0]);
        expiries.delete(args[0]);
        return { result: hit ? 1 : 0 };
      }
      case 'EVAL': {
        const [script, , key, ...argv] = args;
        if (script.includes("redis.call('GET', KEYS[1])")) {
          const [mustNotExist, expected, next] = argv;
          const cur = data.get(key);
          const okToSet = mustNotExist === '1' ? cur === undefined : cur === expected;
          if (okToSet) {
            data.set(key, next);
            expiries.delete(key);
          }
          return { result: okToSet ? 1 : 0 };
        }
        if (script.includes("redis.call('HEXISTS', KEYS[1], ARGV[i])")) {
          // the metric count script, step for step: budget, expiry, then key/increment pairs
          const [budget, expireAt, ...pairs] = argv;
          let room = Number(budget) - (hash(key)?.size ?? 0);
          let wrote = false;
          for (let i = 0; i + 1 < pairs.length; i += 2) {
            const exists = hash(key)?.has(pairs[i]) ?? false;
            if (!exists && room <= 0) continue;
            if (!exists) room--;
            const h = hash(key, true)!;
            h.set(pairs[i], String(Number(h.get(pairs[i]) ?? '0') + Number(pairs[i + 1])));
            wrote = true;
          }
          if (wrote) expiries.set(key, Number(expireAt));
          return { result: wrote ? 1 : 0 };
        }
        return { error: 'unknown script' };
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
      case 'HEXISTS':
        return { result: hash(args[0])?.has(args[1]) ? 1 : 0 };
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
        const replies = parsed.map(run);
        return state.loseAnswers ? send(504, { error: 'gateway timeout' }) : send(200, replies);
      }
      const reply = run(parsed);
      if (state.loseAnswers) return send(504, { error: 'gateway timeout' });
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
    get clockOffsetS() {
      return state.clockOffsetS;
    },
    get loseAnswers() {
      return state.loseAnswers;
    },
    set loseAnswers(v) {
      state.loseAnswers = v;
    },
    set clockOffsetS(v) {
      state.clockOffsetS = v;
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
  return fake;
}
