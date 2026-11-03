/**
 * Everything the admin page can configure. Pure data (no Node APIs) so the UI and the server share it.
 *
 * Resolution order at runtime: server environment variable → value saved on the admin page → default.
 * An environment variable always wins and is shown as locked, so infrastructure settings cannot be overridden
 * from the browser by accident.
 */
import type { Bilingual } from '@/lib/types';

export type SettingType = 'secret' | 'text' | 'url' | 'number' | 'boolean';
export type SettingGroup = 'ai' | 'data' | 'links' | 'limits';

export interface SettingDef {
  key: string;
  /** environment variables checked first, in order */
  env: string[];
  group: SettingGroup;
  type: SettingType;
  label: Bilingual;
  help: Bilingual;
  placeholder?: string;
  default?: string;
  min?: number;
  max?: number;
  /** where the value takes effect */
  scope: 'runtime' | 'sync';
}

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export const SETTINGS: SettingDef[] = [
  // ---- AI engine (read on every request) ----
  {
    key: 'AI_API_KEY',
    env: ['AI_API_KEY'],
    group: 'ai',
    type: 'secret',
    scope: 'runtime',
    label: b('AI API 키', 'AI API key'),
    help: b('OpenAI 호환 /chat/completions 엔드포인트의 키. 비우면 내장 시뮬레이션 엔진으로 동작합니다.', 'Key for an OpenAI-compatible /chat/completions endpoint. Leave empty to use the built-in simulation engine.'),
    placeholder: 'sk-…',
  },
  {
    key: 'AI_BASE_URL',
    env: ['AI_BASE_URL'],
    group: 'ai',
    type: 'url',
    scope: 'runtime',
    label: b('Base URL', 'Base URL'),
    help: b('/chat/completions 앞부분까지의 주소', 'Address up to (not including) /chat/completions'),
    default: 'https://api.openai.com/v1',
    placeholder: 'https://api.openai.com/v1',
  },
  {
    key: 'AI_MODEL',
    env: ['AI_MODEL'],
    group: 'ai',
    type: 'text',
    scope: 'runtime',
    label: b('모델', 'Model'),
    help: b('공급자가 안내한 모델 ID', 'Model id from your provider'),
    default: 'gpt-4o-mini',
    placeholder: 'gpt-4o-mini',
  },
  {
    key: 'AI_TIMEOUT_MS',
    env: ['AI_TIMEOUT_MS'],
    group: 'ai',
    type: 'number',
    scope: 'runtime',
    label: b('응답 대기 한도 (ms)', 'Timeout (ms)'),
    help: b('이 시간 안에 응답이 없으면 시뮬레이션 엔진으로 폴백', 'Falls back to the simulation engine when the model does not answer in time'),
    default: '15000',
    min: 1000,
    max: 120000,
  },
  {
    key: 'AI_TEMPERATURE',
    env: ['AI_TEMPERATURE'],
    group: 'ai',
    type: 'number',
    scope: 'runtime',
    label: b('Temperature (선택)', 'Temperature (optional)'),
    help: b('비우면 공급자 기본값', 'Empty = provider default'),
    min: 0,
    max: 2,
  },
  {
    key: 'AI_MAX_TOKENS',
    env: ['AI_MAX_TOKENS'],
    group: 'ai',
    type: 'number',
    scope: 'runtime',
    label: b('최대 토큰 (선택)', 'Max tokens (optional)'),
    help: b('비우면 공급자 기본값', 'Empty = provider default'),
    min: 64,
    max: 32000,
  },
  {
    key: 'AI_JSON_MODE',
    env: ['AI_JSON_MODE'],
    group: 'ai',
    type: 'boolean',
    scope: 'runtime',
    label: b('JSON 모드', 'JSON mode'),
    help: b('response_format: json_object를 보냅니다. 지원하는 공급자에서만 켜세요.', 'Sends response_format: json_object. Enable only if your provider supports it.'),
    default: 'false',
  },
  {
    key: 'AI_DISABLED',
    env: ['AI_DISABLED'],
    group: 'ai',
    type: 'boolean',
    scope: 'runtime',
    label: b('AI 일시 중지', 'Pause AI'),
    help: b('키가 있어도 시뮬레이션 엔진만 사용', 'Use the simulation engine even when a key is set'),
    default: 'false',
  },

  // ---- official data connectors (used by `npm run data:sync`) ----
  {
    key: 'DATA_GO_KR_SERVICE_KEY',
    env: ['DATA_GO_KR_SERVICE_KEY'],
    group: 'data',
    type: 'secret',
    scope: 'sync',
    label: b('공공데이터포털 서비스키', 'data.go.kr service key'),
    help: b(
      '「관세청_품목별 국가별 수출입실적(GW)」「관세청_관세환율정보(GW)」 활용신청 후 발급(자동승인). 월별 실적과 관세청 과세환율에 쓰입니다.',
      'Issued after applying for the KCS trade-by-item/country and customs FX APIs (auto-approved). Used for monthly trade and the customs FX rate.',
    ),
    placeholder: '인코딩/디코딩 키 중 하나',
  },
  {
    key: 'COMTRADE_API_KEY',
    env: ['COMTRADE_API_KEY'],
    group: 'data',
    type: 'secret',
    scope: 'sync',
    label: b('UN Comtrade 구독키 (선택)', 'UN Comtrade subscription key (optional)'),
    help: b('없으면 키 없는 공개 API를 씁니다. 있으면 호출 한도가 커집니다.', 'Without it the keyless public API is used; with it the limits are higher.'),
  },

  // ---- Trust Center links (served to the browser at runtime) ----
  {
    key: 'DATA_FEEDBACK_URL',
    env: ['DATA_FEEDBACK_URL', 'NEXT_PUBLIC_DATA_FEEDBACK_URL'],
    group: 'links',
    type: 'url',
    scope: 'runtime',
    label: b('데이터 오류 제보 링크', 'Data feedback link'),
    help: b('신뢰도 센터의 「데이터 오류 제보」 버튼이 여는 주소 (예: GitHub 이슈 작성 링크)', 'Opened by the Trust Center feedback button (e.g. a new GitHub issue link)'),
    placeholder: 'https://github.com/<owner>/<repo>/issues/new?labels=data',
    // a value baked in at build time (Docker build arg) stays the fallback, so build-arg-only setups keep their link
    default: process.env.NEXT_PUBLIC_DATA_FEEDBACK_URL || undefined,
  },
  {
    key: 'OVERRIDES_EDIT_URL',
    env: ['OVERRIDES_EDIT_URL', 'NEXT_PUBLIC_OVERRIDES_EDIT_URL'],
    group: 'links',
    type: 'url',
    scope: 'runtime',
    label: b('검증값 파일 편집 링크', 'Verified-overrides edit link'),
    help: b('검증값 입력 도우미의 「편집」 링크 (예: GitHub에서 verified-overrides.json 편집)', 'The helper’s “edit” link (e.g. editing verified-overrides.json on GitHub)'),
    placeholder: 'https://github.com/<owner>/<repo>/edit/main/tradescope-ai/src/data/verified-overrides.json',
    default: process.env.NEXT_PUBLIC_OVERRIDES_EDIT_URL || undefined,
  },

  // ---- cost guard & proxy ----
  {
    key: 'AI_MAX_CALLS_PER_IP_PER_HOUR',
    env: ['AI_MAX_CALLS_PER_IP_PER_HOUR'],
    group: 'limits',
    type: 'number',
    scope: 'runtime',
    label: b('클라이언트별 시간당 LLM 호출', 'LLM calls per client per hour'),
    help: b('신뢰할 프록시가 없으면(TRUST_PROXY=0) 전체 방문자가 이 한도를 함께 씁니다.', 'Without a trusted proxy (TRUST_PROXY=0) all visitors share this limit.'),
    default: '30',
    min: 1,
    max: 100000,
  },
  {
    key: 'AI_DAILY_BUDGET',
    env: ['AI_DAILY_BUDGET'],
    group: 'limits',
    type: 'number',
    scope: 'runtime',
    label: b('서버당 하루 LLM 호출 상한', 'Daily LLM calls per server'),
    help: b('비용 상한. 넘으면 다음 날(UTC)까지 시뮬레이션 엔진으로 응답', 'Cost cap; above it the simulation engine answers until the next UTC day'),
    default: '500',
    min: 1,
    max: 10000000,
  },
  {
    key: 'TRUST_PROXY',
    env: ['TRUST_PROXY'],
    group: 'limits',
    type: 'number',
    scope: 'runtime',
    label: b('신뢰하는 프록시 단계 수', 'Trusted proxy hops'),
    help: b(
      'Caddy·Nginx 한 단계 뒤면 1. 앱이 인터넷에 직접 열려 있으면 0 (전달 헤더를 위조할 수 있음). Vercel은 자동 인식.',
      '1 behind a single Caddy/Nginx. 0 when the app is exposed directly (forwarding headers can be spoofed). Vercel is detected automatically.',
    ),
    default: '0',
    min: 0,
    max: 5,
  },
];

/** Null prototype: keys such as `constructor` or `__proto__` from a request body must not resolve to a setting. */
export const SETTING_INDEX: Record<string, SettingDef> = Object.assign(Object.create(null), Object.fromEntries(SETTINGS.map((s) => [s.key, s])));
/** Number settings that accept fractions; every other number setting must be an integer. */
const FRACTIONAL = new Set(['AI_TEMPERATURE']);
export const SECRET_KEYS = SETTINGS.filter((s) => s.type === 'secret').map((s) => s.key);

/** Normalises and validates one value; returns the stored string or an error code. */
export function validateSetting(def: SettingDef, raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const v = raw.trim();
  if (v.length > 2000) return { ok: false, error: 'too-long' };
  switch (def.type) {
    case 'number': {
      const n = Number(v);
      if (v === '' || !Number.isFinite(n)) return { ok: false, error: 'not-a-number' };
      if (!FRACTIONAL.has(def.key) && !Number.isInteger(n)) return { ok: false, error: 'not-an-integer' };
      if (def.min !== undefined && n < def.min) return { ok: false, error: `min:${def.min}` };
      if (def.max !== undefined && n > def.max) return { ok: false, error: `max:${def.max}` };
      return { ok: true, value: String(n) };
    }
    case 'boolean':
      return v === 'true' || v === 'false' ? { ok: true, value: v } : { ok: false, error: 'not-boolean' };
    case 'url': {
      try {
        const u = new URL(v);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, error: 'not-http-url' };
      } catch {
        return { ok: false, error: 'not-a-url' };
      }
      return { ok: true, value: v.replace(/\/+$/, '') };
    }
    default:
      if (/\s/.test(v) && def.type === 'secret') return { ok: false, error: 'whitespace' };
      return { ok: true, value: v };
  }
}
