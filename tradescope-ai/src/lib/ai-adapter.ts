/**
 * OpenAI-compatible chat adapter (server-side only).
 *
 * Works with any endpoint that implements `POST {AI_BASE_URL}/chat/completions`:
 * the shared "모두의 AI 실험실" key, OpenAI, Anthropic's OpenAI-compatible endpoint, Azure-style proxies,
 * vLLM / Ollama / LM Studio, etc. Every failure is converted into a typed result so callers can fall back
 * to the simulation engine instead of surfacing an error to the user.
 */

import { getSetting } from '@/lib/settings';

export interface AiConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  temperature?: number;
  maxTokens?: number;
  jsonMode: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ChatResult =
  | { ok: true; content: string; model: string; latencyMs: number }
  | { ok: false; reason: string; latencyMs: number };

const numberEnv = (v: string | undefined): number | undefined => {
  if (!v || !v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Read on every call: environment variable → value saved on /admin → default (see lib/settings). */
export function getAiConfig(): AiConfig {
  const apiKey = getSetting('AI_API_KEY') || undefined;
  const baseUrl = (getSetting('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const timeout = numberEnv(getSetting('AI_TIMEOUT_MS'));
  return {
    enabled: !!apiKey && getSetting('AI_DISABLED') !== 'true',
    apiKey,
    baseUrl,
    model: getSetting('AI_MODEL') || 'gpt-4o-mini',
    // non-positive values would make every call time out immediately
    timeoutMs: timeout !== undefined && timeout > 0 ? timeout : 15_000,
    temperature: numberEnv(getSetting('AI_TEMPERATURE')),
    maxTokens: numberEnv(getSetting('AI_MAX_TOKENS')),
    jsonMode: getSetting('AI_JSON_MODE') === 'true',
  };
}

/** Safe-to-expose status (never includes the key). */
export function publicAiStatus() {
  const cfg = getAiConfig();
  let host = '';
  try {
    host = new URL(cfg.baseUrl).host;
  } catch {
    host = 'invalid-url';
  }
  return { enabled: cfg.enabled, model: cfg.enabled ? cfg.model : null, provider: cfg.enabled ? host : null };
}

export async function chatCompletion(messages: ChatMessage[], overrides: Partial<Pick<AiConfig, 'timeoutMs'>> = {}): Promise<ChatResult> {
  const cfg = getAiConfig();
  const started = Date.now();
  if (!cfg.enabled || !cfg.apiKey) return { ok: false, reason: 'no-api-key', latencyMs: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), overrides.timeoutMs ?? cfg.timeoutMs);
  try {
    // Keep the body minimal for maximum compatibility across OpenAI-compatible providers.
    const body: Record<string, unknown> = { model: cfg.model, messages };
    if (cfg.temperature !== undefined) body.temperature = cfg.temperature;
    if (cfg.maxTokens !== undefined) body.max_tokens = cfg.maxTokens;
    if (cfg.jsonMode) body.response_format = { type: 'json_object' };

    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      return { ok: false, reason: `http-${res.status}`, latencyMs: Date.now() - started };
    }
    const json = (await res.json()) as { model?: string; choices?: Array<{ message?: { content?: unknown } }> };
    const raw = json.choices?.[0]?.message?.content;
    const content = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((p) => (typeof p === 'object' && p && 'text' in p ? String((p as { text: unknown }).text) : '')).join('') : '';
    if (!content.trim()) return { ok: false, reason: 'empty-response', latencyMs: Date.now() - started };
    return { ok: true, content, model: json.model || cfg.model, latencyMs: Date.now() - started };
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError' ? 'timeout' : err instanceof SyntaxError ? 'invalid-response' : 'network-error';
    return { ok: false, reason, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

/** Extract the first JSON object from a model response (handles ```json fences and chatter). */
export function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
