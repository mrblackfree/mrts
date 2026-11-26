/* Redis health as the expert form sees it (lib/store/kv kvHealthy): the latest answer on this instance decides;
   a failed transport, a failed command in a batch and a malformed answer all count as failures. Runs in its own
   process, so no other Redis traffic can answer in between. */
import { done, ok } from './assert';
import { startFakeUpstash } from './fake-upstash';

const fake = await startFakeUpstash();
process.env.KV_REST_API_URL = fake.url;
process.env.KV_REST_API_TOKEN = fake.token;
process.env.KV_PREFIX = 'tradescope:';

const kv = await import('@/lib/store/kv');
const rejects = async (f: () => Promise<unknown>) => f().then(() => false, () => true);

ok('healthy before anything happened', kv.kvHealthy());
ok('a missing key reads as null', (await kv.kv(['GET', 'tradescope:nothing'])) === null && kv.kvHealthy());

fake.failWith = 503;
ok('transport failure: throws', await rejects(() => kv.kv(['GET', 'tradescope:x'])));
ok('…and marks Redis unhealthy', !kv.kvHealthy());
fake.failWith = null;
await kv.kv(['GET', 'tradescope:x']);
ok('any clean answer clears it', kv.kvHealthy());

ok('a batch with one failed command throws', await rejects(() => kv.kvPipeline([['GET', 'tradescope:x'], ['NOPE']])));
ok('…and marks Redis unhealthy', !kv.kvHealthy());
await kv.kvPipeline([['GET', 'tradescope:x']]);
ok('a fully clean batch clears it', kv.kvHealthy());

// a 200 answer without `result` is broken, never "no value"
fake.malformed = true;
ok('malformed answer to one command: throws', await rejects(() => kv.kv(['GET', 'tradescope:x'])));
ok('…and marks Redis unhealthy', !kv.kvHealthy());
fake.malformed = false;
await kv.kv(['GET', 'tradescope:x']);
ok('healthy again before the batch', kv.kvHealthy());
fake.malformed = true;
ok('malformed batch answer: throws', await rejects(() => kv.kvPipeline([['GET', 'tradescope:x']])));
ok('…and marks Redis unhealthy', !kv.kvHealthy());
fake.malformed = false;

// after a minute without a new failure the instance counts as healthy again even with no traffic
const realNow = Date.now;
Date.now = () => realNow() + 61_000;
ok('a failure older than a minute no longer counts', kv.kvHealthy());
Date.now = realNow;

await fake.close();
done('kv health');
