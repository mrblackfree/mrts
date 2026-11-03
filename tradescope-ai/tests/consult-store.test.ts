/* Expert-request store: readable after an interrupted append, status changes never drop lines, id format. */
import { appendFileSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { appendRequest, listRequests, newRequestId, updateStatus } from '@/lib/consult/store';
import { done, ok } from './assert';

const dir = process.env.TRADESCOPE_DATA_DIR!;
const file = path.join(dir, 'consult-requests.jsonl');
const input = { name: 'Kim', company: '', email: 'kim@example.com', phone: '', topic: 't', serviceIds: ['ph-fda-food'], message: '', lang: 'ko' as const };

ok('id format TS- + 8 symbols', /^TS-[A-HJ-NP-Z2-9]{8}$/.test(newRequestId()));
const ids = new Set(Array.from({ length: 2000 }, newRequestId));
ok('2000 ids are distinct', ids.size === 2000);

const a = appendRequest(input);
ok('file mode 0600', (statSync(file).mode & 0o777) === 0o600, (statSync(file).mode & 0o777).toString(8));
// an interrupted append leaves half a line without a newline
appendFileSync(file, '{"id":"TS-BROKEN","name":"half');
const b = appendRequest({ ...input, name: 'Lee' });
ok('record after a partial line is readable', listRequests().some((r) => r.id === b.id), listRequests().map((r) => r.id));
ok('newest first', listRequests()[0].id === b.id);

ok('status change', updateStatus(a.id, 'contacted') && listRequests().find((r) => r.id === a.id)?.status === 'contacted');
const raw = readFileSync(file, 'utf8');
ok('damaged line kept byte for byte', raw.includes('{"id":"TS-BROKEN","name":"half'), raw);
ok('other record untouched', JSON.parse(raw.split('\n').find((l) => l.includes(b.id))!).status === 'new');
ok('unknown id → false', updateStatus('TS-NOPE0000', 'done') === false);
ok('file ends with newline', readFileSync(file, 'utf8').endsWith('\n'));

done('consult store');
