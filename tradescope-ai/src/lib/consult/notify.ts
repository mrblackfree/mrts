/** New-request notification for the operations team (Slack-style incoming webhook). Server-side only. */
import { EXPERT_INDEX } from '@/data/experts';
import { getSetting } from '@/lib/settings';
import { isHttpsUrl } from '@/lib/settings/schema';
import type { ConsultRequest } from './store';

/** The notification webhook, only when it is a usable https:// address (the same rule for GET and POST). */
export function webhookUrl(): string | undefined {
  const v = getSetting('CONSULT_WEBHOOK_URL');
  if (v && !isHttpsUrl(v)) {
    // the admin page rejects such a value; one set in the environment is ignored, so say so once
    if (!warned) console.warn('[consult] CONSULT_WEBHOOK_URL is not an https:// URL and is ignored');
    warned = true;
    return undefined;
  }
  return v || undefined;
}
let warned = false;

/**
 * Requester text for Slack mrkdwn: control characters are escaped (no <!here>, mentions or <url|label> links), and
 * plain URLs are broken with a zero-width space after the scheme / "www", so Slack does not auto-link them — an
 * operator never gets a clickable link that only a requester typed.
 */
export const slackEscape = (v: string) =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\b([a-z][a-z0-9+.-]{1,15}):\/\//gi, '$1:\u200b//')
    .replace(/\bwww\./gi, 'www\u200b.');

/** The message text: requester-written fields are escaped, so they cannot mention @here or add links. */
export function summaryText(record: ConsultRequest): string {
  const services = record.serviceIds.map((id) => EXPERT_INDEX[id]?.title.ko ?? id).join(', ');
  const who = `${record.name}${record.company ? ` (${record.company})` : ''} · ${record.email}${record.phone ? ` · ${record.phone}` : ''}`;
  return [`[TradeScope] 전문가 서비스 요청 ${record.id}`, slackEscape(who), `서비스: ${services || '-'}`, `주제: ${slackEscape(record.topic || '-')}`, slackEscape(record.message)].join('\n');
}

/** POSTs the request to the webhook; true when it answered 2xx within 5 s. */
export async function notify(webhook: string, record: ConsultRequest): Promise<boolean> {
  const summary = summaryText(record);
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: summary, request: record }),
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    await res.body?.cancel().catch(() => undefined);
    // the URL carries a token: log the status only, never the address
    if (!res.ok) console.warn('[consult] webhook delivery failed', record.id, `HTTP ${res.status}`);
    return res.ok;
  } catch (e) {
    console.warn('[consult] webhook delivery failed', record.id, e instanceof Error ? e.name : 'error');
    return false;
  }
}
