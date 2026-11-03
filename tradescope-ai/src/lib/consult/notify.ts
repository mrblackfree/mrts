/** New-request notification for the operations team (Slack-style incoming webhook). Server-side only. */
import { EXPERT_INDEX } from '@/data/experts';
import { getSetting } from '@/lib/settings';
import { isHttpsUrl } from '@/lib/settings/schema';
import type { ConsultRequest } from './store';

/** The notification webhook, only when it is a usable https:// address (the same rule for GET and POST). */
export function webhookUrl(): string | undefined {
  const v = getSetting('CONSULT_WEBHOOK_URL');
  return v && isHttpsUrl(v) ? v : undefined;
}

/** Slack mrkdwn control characters: a requester must not be able to inject <!here>, links or mentions. */
export const slackEscape = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
    return res.ok;
  } catch {
    return false;
  }
}
