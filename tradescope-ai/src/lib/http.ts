/** Size-bounded body reading for route handlers and outbound API calls. */

async function readStreamLimited(body: ReadableStream<Uint8Array> | null, max: number): Promise<string | null> {
  if (!body) return '';
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** The request body as text, or null when it is larger than `max` bytes (checked while reading, not after). */
export async function readBodyLimited(req: Request, max: number): Promise<string | null> {
  if (Number(req.headers.get('content-length')) > max) return null;
  return readStreamLimited(req.body, max);
}

/**
 * A JSON object body. `too-large` when over `max` bytes; `bad-json` when it does not parse to an object.
 * An empty body counts as `{}`.
 */
export async function readJsonLimited(req: Request, max: number): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; error: 'too-large' | 'bad-json' }> {
  const raw = await readBodyLimited(req, max).catch(() => null);
  if (raw === null) return { ok: false, error: 'too-large' };
  if (!raw.trim()) return { ok: true, body: {} };
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? { ok: true, body: v as Record<string, unknown> } : { ok: false, error: 'bad-json' };
  } catch {
    return { ok: false, error: 'bad-json' };
  }
}

/** A fetch response body as text; throws when it is larger than `max` bytes. */
export async function responseTextLimited(res: Response, max: number): Promise<string> {
  if (Number(res.headers.get('content-length')) > max) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error('response-too-large');
  }
  const text = await readStreamLimited(res.body, max);
  if (text === null) throw new Error('response-too-large');
  return text;
}
