'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CirclePause,
  CircleX,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  Hourglass,
  Info,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  Lock,
  LogOut,
  PlugZap,
  Radar,
  ScanSearch,
  Server,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EXPERT_INDEX } from '@/data/experts';
import { SETTINGS, type SettingDef, type SettingGroup } from '@/lib/settings/schema';
import type { Lang } from '@/lib/types';
import { I18nProvider, useI18n } from '../I18nProvider';
import { Badge, Button, buttonClass, Card, cx, Segmented } from '../ui';

// ---------------------------------------------------------------------------
// types shared with /api/admin/*
// ---------------------------------------------------------------------------
type Field = { key: string; source: 'env' | 'admin' | 'default' | 'unset'; envName?: string; value?: string; masked?: string; unreadable?: boolean };
type Storage = { writable: true; path: string } | { writable: false; path: string; reason: string; detail?: string };
interface Snapshot {
  fields: Field[];
  storage: Storage;
  updatedAt: string | null;
  platform: 'vercel' | 'netlify' | 'docker-or-node';
  adminSecretSet: boolean;
  ai: { enabled: boolean; model: string | null; provider: string | null };
  officialData: { generatedAt: string | null; sources: Record<string, string | null>; activeOverrides: number };
}
type Session = { enabled: boolean; reason?: 'not-set' | 'too-short' | 'too-long' | 'secret-too-short'; authenticated: boolean; expiresAt: number | null };
type TestResult = { ok: boolean; message: string; latencyMs: number; detail?: string };
type Section = 'overview' | 'validation' | SettingGroup | 'deploy';

// ---------------------------------------------------------------------------
// strings
// ---------------------------------------------------------------------------
const S = {
  ko: {
    admin: '관리자',
    back: '서비스로',
    logout: '로그아웃',
    loading: '불러오는 중…',
    disabledTitle: '관리자 페이지가 꺼져 있습니다',
    disabledNotSet: '서버 환경변수 ADMIN_PASSWORD가 없어 관리자 기능이 비활성화되어 있습니다.',
    disabledShort: 'ADMIN_PASSWORD가 너무 짧습니다(10자 이상 필요).',
    disabledLong: 'ADMIN_PASSWORD가 너무 깁니다(1024자 이하).',
    disabledSecretShort: 'ADMIN_SECRET이 너무 짧습니다(32자 이상 필요). 늘리거나 지우면 관리자 기능이 켜집니다.',
    simulation: '한국–필리핀 시뮬레이션',
    presetPickModel: '이 제공사는 모델 ID를 직접 입력해야 합니다. 제공사 콘솔에서 쓸 모델 이름을 확인해 아래 모델 칸에 넣으세요.',
    presetPickBase: '이 제공사는 API 주소를 직접 입력해야 합니다. 제공사 안내에서 주소를 확인해 아래 Base URL 칸에 넣으세요.',
    presetPickBoth: '이 제공사는 API 주소와 모델 ID를 직접 입력해야 합니다. 제공사 안내에서 확인해 아래 Base URL·모델 칸에 넣으세요.',
    disabledHow: '아래처럼 설정한 뒤 서버를 다시 시작하세요. 비밀번호는 서버에만 두고 공유하지 마세요.',
    loginTitle: '관리자 로그인',
    loginSub: '서버에 설정된 ADMIN_PASSWORD로 로그인합니다. 세션은 8시간 유지됩니다.',
    password: '비밀번호',
    signIn: '로그인',
    wrongPassword: '비밀번호가 올바르지 않습니다.',
    tooMany: '시도가 너무 많습니다. 15분 뒤 다시 시도하세요.',
    networkError: '서버에 연결할 수 없습니다.',
    menu: { overview: '개요', validation: '가설 검증', ai: 'AI 엔진', data: '공식 데이터 키', service: '전문가 서비스', tracking: '컨테이너 추적', links: '신뢰도 센터 링크', limits: '호출 한도·보안', deploy: '배포·환경' } as Record<Section, string>,
    sectionSub: {
      overview: '현재 상태와 남은 설정을 한눈에 봅니다.',
      validation: '사이트에서 측정하는 가설(H3·H7·H8·H9)을 비즈니스 모델 캔버스의 기준으로 판정합니다. 익명 집계만 사용합니다.',
      ai: 'OpenAI 호환 LLM을 연결합니다. 저장 즉시 다음 요청부터 적용됩니다.',
      data: '공식 데이터 동기화(npm run data:sync)에 쓰는 키입니다.',
      service: '「전문가에게 맡기기」로 들어온 요청을 확인하고 담당 전문가를 배정합니다. 알림 웹훅과 대체 연락처를 설정합니다.',
      tracking: '조회 순서: 선사 공식 API(Hapag-Lloyd·CMA CGM, 무료) → ShipsGo(유료, 전 선사) · 한국 수입 통관은 UNI-PASS(무료). 키가 없는 소스는 건너뛰고, 하나도 없으면 예시 타임라인을 보여 줍니다.',
      links: '신뢰도 센터의 제보·편집 버튼 주소입니다. 저장 즉시 적용됩니다.',
      limits: 'LLM 비용 상한과 접속자 식별 방식입니다. 저장 즉시 적용됩니다.',
      deploy: '배포 환경, 저장 위치, 환경변수 설정 방법입니다.',
    } as Record<Section, string>,
    src: { env: '환경변수 (잠김)', admin: '관리자 저장값', default: '기본값', unset: '미설정' },
    envLocked: '서버 환경변수가 우선합니다. 바꾸려면 서버의 환경변수를 수정하세요.',
    unreadable: '저장된 값을 읽을 수 없습니다(ADMIN_SECRET 또는 ADMIN_PASSWORD가 바뀜). 다시 입력하세요.',
    enterNew: '새 값 입력',
    change: '변경',
    remove: '삭제',
    willRemove: '저장하면 삭제됩니다',
    on: '사용',
    off: '사용 안 함',
    save: '변경사항 저장',
    reset: '되돌리기',
    saved: '저장했습니다.',
    savedRuntime: '다음 요청부터 바로 적용됩니다.',
    savedSync: '다음 데이터 동기화부터 사용됩니다.',
    saveFailed: '저장하지 못했습니다.',
    readOnly: '이 환경에서는 저장할 수 없습니다',
    readOnlyWhy: {
      vercel: 'Vercel 서버리스는 파일이 유지되지 않습니다. Vercel → Project → Settings → Environment Variables에 같은 이름으로 넣고 Redeploy 하세요.',
      netlify: 'Netlify 함수는 파일이 유지되지 않습니다. Site settings → Environment variables에 같은 이름으로 넣으세요.',
      'readonly-env': 'SETTINGS_READONLY가 켜져 있습니다.',
      'no-secret': 'ADMIN_PASSWORD가 없어 값을 암호화할 수 없습니다.',
      'fs-error': '저장 폴더에 쓸 수 없습니다. 폴더 권한(또는 Docker 볼륨)을 확인하세요.',
      'file-unreadable': '설정 파일을 읽을 수 없습니다(권한 확인). 기존 값을 지키기 위해 저장을 막았습니다.',
      'file-corrupt': '설정 파일이 손상되었습니다. 기존 값을 지키기 위해 저장을 막았습니다. 파일을 복구하거나 백업 후 지우세요.',
    } as Record<string, string>,
    test: '연결 테스트',
    testing: '테스트 중…',
    testSaveFirst: '저장된 값으로 테스트합니다.',
    presets: '빠른 설정',
    presetNote: '주소와 모델명을 채웁니다. 키는 직접 입력하세요.',
    dataNote:
      '동기화 스크립트는 환경변수가 없을 때 이 저장값을 씁니다(같은 서버·같은 ADMIN_PASSWORD 필요). GitHub Actions 주간 동기화는 저장소 Settings → Secrets에 같은 이름으로 등록하세요. 동기화된 공식 데이터는 빌드에 포함되므로 반영하려면 다시 빌드·배포합니다.',
    statusAi: 'AI 엔진',
    llmOn: 'LLM 연결됨',
    llmOff: '시뮬레이션 엔진',
    statusData: '공식 데이터 스냅샷',
    statusOverrides: '유효한 전문가 검증값',
    statusStorage: '설정 저장소',
    writable: '저장 가능',
    notWritable: '읽기 전용',
    session: '세션 만료',
    todo: '남은 설정',
    allDone: '필수 설정이 모두 끝났습니다.',
    go: '설정하기',
    todoAi: 'AI API 키를 넣으면 브리핑·메일 다듬기에 LLM을 씁니다(선택).',
    todoKcs: '공공데이터포털 키를 넣으면 관세청 월별 실적·과세환율을 동기화합니다.',
    todoFeedback: '데이터 오류 제보 링크를 넣으면 신뢰도 센터에 제보 버튼이 보입니다.',
    todoProxy: 'Caddy/Nginx 뒤에서 운영한다면 TRUST_PROXY를 1로 설정하세요.',
    todoSecret: 'ADMIN_SECRET(32자 이상 임의 문자열)을 따로 두면 비밀번호를 바꿔도 저장된 키가 유지됩니다.',
    platform: '감지된 실행 환경',
    platformName: { vercel: 'Vercel', netlify: 'Netlify', 'docker-or-node': 'Docker / Node 서버' } as Record<string, string>,
    storagePath: '저장 파일',
    envTable: '설정값과 출처',
    howEnv: '환경변수로 설정하는 방법',
    updatedAt: '마지막 저장',
    err: {
      'locked-by-env': '환경변수로 잠겨 있습니다',
      'not-a-number': '숫자를 입력하세요',
      'not-an-integer': '정수를 입력하세요',
      'model-required': '이 제공사의 모델 ID를 입력하세요 (기본값 gpt-4o-mini는 OpenAI 전용)',
      'base-url-required': '이 제공사의 API 주소를 입력하세요',
      'not-a-url': '올바른 주소(URL)가 아닙니다',
      'not-http-url': 'http(s) 주소만 쓸 수 있습니다',
      'not-https-url': 'https:// 주소만 쓸 수 있습니다',
      'not-boolean': '켜기/끄기 값이 아닙니다',
      whitespace: '공백을 포함할 수 없습니다',
      'too-long': '너무 깁니다',
    } as Record<string, string>,
    testMsg: {
      ok: '정상 연결',
      'no-api-key': 'AI API 키가 없습니다',
      'no-key': '저장된 키가 없습니다',
      timeout: '응답 시간 초과',
      'network-error': '네트워크 오류',
      'invalid-key': '키가 유효하지 않습니다',
      'http-401': '인증 실패(401) — 키를 확인하세요',
      'http-404': '주소를 찾을 수 없음(404) — Base URL/모델을 확인하세요',
      'invalid-json': '응답 형식 오류',
      SERVICE_KEY_IS_NOT_REGISTERED_ERROR: '등록되지 않은 키 — 활용신청 승인 후 반영까지 1~2시간 걸릴 수 있습니다',
      SERVICE_ACCESS_DENIED_ERROR: '이 API에 대한 활용신청이 필요합니다',
      'unexpected-response': '예상하지 못한 응답 — 주소·키 종류를 확인하세요',
    } as Record<string, string>,
  },
  en: {
    admin: 'Admin',
    back: 'Back to app',
    logout: 'Sign out',
    loading: 'Loading…',
    disabledTitle: 'The admin page is off',
    disabledNotSet: 'ADMIN_PASSWORD is not set on the server, so the admin features are disabled.',
    disabledShort: 'ADMIN_PASSWORD is too short (10+ characters required).',
    disabledLong: 'ADMIN_PASSWORD is too long (1024 characters at most).',
    disabledSecretShort: 'ADMIN_SECRET is too short (32+ characters required). Lengthen or remove it to enable the admin.',
    simulation: 'KR-PH simulation',
    presetPickModel: "This provider needs a model ID. Look up the model name in the provider's console and enter it in the model field below.",
    presetPickBase: "This provider needs an API address. Look it up in the provider's instructions and enter it in the base URL field below.",
    presetPickBoth: "This provider needs an API address and a model ID. Look them up in the provider's instructions and enter them in the base URL and model fields below.",
    disabledHow: 'Set it as shown below and restart the server. Keep the password on the server only.',
    loginTitle: 'Admin sign-in',
    loginSub: 'Sign in with the server’s ADMIN_PASSWORD. Sessions last 8 hours.',
    password: 'Password',
    signIn: 'Sign in',
    wrongPassword: 'Incorrect password.',
    tooMany: 'Too many attempts. Try again in 15 minutes.',
    networkError: 'Cannot reach the server.',
    menu: { overview: 'Overview', validation: 'Hypothesis checks', ai: 'AI engine', data: 'Official data keys', service: 'Expert service', tracking: 'Container tracking', links: 'Trust Center links', limits: 'Limits & security', deploy: 'Deployment' } as Record<Section, string>,
    sectionSub: {
      overview: 'Current state and what is left to configure.',
      validation: 'The hypotheses the site measures (H3, H7, H8, H9), judged against the business model canvas thresholds. Aggregate counts only.',
      ai: 'Connect an OpenAI-compatible LLM. Takes effect from the next request.',
      data: 'Keys used by the official data sync (npm run data:sync).',
      service: 'Review requests sent through “Hand it to an expert” and assign an expert. Set the notification webhook and fallback contact.',
      tracking: 'Lookup order: carrier APIs (Hapag-Lloyd, CMA CGM, free) → ShipsGo (paid, all carriers); customs progress for imports into Korea via UNI-PASS (free). Sources without a key are skipped; with none, an example timeline is shown.',
      links: 'Targets of the Trust Center feedback and edit buttons. Takes effect immediately.',
      limits: 'LLM cost caps and how clients are identified. Takes effect immediately.',
      deploy: 'Runtime environment, storage location and how to set environment variables.',
    } as Record<Section, string>,
    src: { env: 'Environment (locked)', admin: 'Saved here', default: 'Default', unset: 'Not set' },
    envLocked: 'The server environment variable wins. Change it on the server to edit this value.',
    unreadable: 'The saved value cannot be read (ADMIN_SECRET or ADMIN_PASSWORD changed). Enter it again.',
    enterNew: 'Enter a new value',
    change: 'Change',
    remove: 'Remove',
    willRemove: 'Removed on save',
    on: 'On',
    off: 'Off',
    save: 'Save changes',
    reset: 'Reset',
    saved: 'Saved.',
    savedRuntime: 'Applies from the next request.',
    savedSync: 'Used from the next data sync.',
    saveFailed: 'Could not save.',
    readOnly: 'Saving is not available here',
    readOnlyWhy: {
      vercel: 'Vercel functions have no persistent files. Add the same names under Project → Settings → Environment Variables and redeploy.',
      netlify: 'Netlify functions have no persistent files. Add the same names under Site settings → Environment variables.',
      'readonly-env': 'SETTINGS_READONLY is on.',
      'no-secret': 'ADMIN_PASSWORD is missing, so values cannot be encrypted.',
      'fs-error': 'The settings folder is not writable. Check its permissions (or the Docker volume).',
      'file-unreadable': 'The settings file cannot be read (check permissions). Saving is blocked to protect the existing values.',
      'file-corrupt': 'The settings file is damaged. Saving is blocked to protect the existing values. Restore it, or back it up and delete it.',
    } as Record<string, string>,
    test: 'Test connection',
    testing: 'Testing…',
    testSaveFirst: 'Tests the saved value.',
    presets: 'Presets',
    presetNote: 'Fills the address and model. Enter the key yourself.',
    dataNote:
      'The sync script uses these saved values when the environment variable is missing (same server, same ADMIN_PASSWORD). For the weekly GitHub Actions sync add repository secrets with the same names. Synced data is part of the build, so rebuild and redeploy to publish it.',
    statusAi: 'AI engine',
    llmOn: 'LLM connected',
    llmOff: 'Simulation engine',
    statusData: 'Official data snapshot',
    statusOverrides: 'Active expert overrides',
    statusStorage: 'Settings storage',
    writable: 'Writable',
    notWritable: 'Read-only',
    session: 'Session expires',
    todo: 'Remaining setup',
    allDone: 'All essential settings are done.',
    go: 'Configure',
    todoAi: 'Add an AI API key to use an LLM for briefings and email polishing (optional).',
    todoKcs: 'Add a data.go.kr key to sync KCS monthly trade and customs FX.',
    todoFeedback: 'Add a data feedback link to show the feedback button in the Trust Center.',
    todoProxy: 'Behind Caddy/Nginx? Set TRUST_PROXY to 1.',
    todoSecret: 'Set ADMIN_SECRET (32+ random characters) so saved keys survive a password change.',
    platform: 'Detected runtime',
    platformName: { vercel: 'Vercel', netlify: 'Netlify', 'docker-or-node': 'Docker / Node server' } as Record<string, string>,
    storagePath: 'Settings file',
    envTable: 'Settings and their source',
    howEnv: 'Setting environment variables',
    updatedAt: 'Last saved',
    err: {
      'locked-by-env': 'Locked by an environment variable',
      'not-a-number': 'Enter a number',
      'not-an-integer': 'Enter a whole number',
      'model-required': "Enter this provider's model ID (the gpt-4o-mini default only works with OpenAI)",
      'base-url-required': "Enter this provider's API base URL",
      'not-a-url': 'Not a valid URL',
      'not-http-url': 'Only http(s) URLs are allowed',
      'not-https-url': 'Only https:// URLs are allowed',
      'not-boolean': 'Not an on/off value',
      whitespace: 'Must not contain spaces',
      'too-long': 'Too long',
    } as Record<string, string>,
    testMsg: {
      ok: 'Connected',
      'no-api-key': 'No AI API key',
      'no-key': 'No saved key',
      timeout: 'Timed out',
      'network-error': 'Network error',
      'invalid-key': 'Invalid key',
      'http-401': 'Unauthorized (401) — check the key',
      'http-404': 'Not found (404) — check the base URL / model',
      'invalid-json': 'Unexpected response',
      SERVICE_KEY_IS_NOT_REGISTERED_ERROR: 'Key not registered — approval can take 1–2 hours to propagate',
      SERVICE_ACCESS_DENIED_ERROR: 'Apply for access to this API first',
      'unexpected-response': 'Unexpected response — check the address and key type',
    } as Record<string, string>,
  },
};
type Strings = (typeof S)['ko'];

const PRESETS: Array<{ id: string; label: string; baseUrl: string; model: string }> = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  // '' = must be entered by hand: the preset clears a value carried over from another preset and save is blocked
  // until the field is filled
  { id: 'anthropic', label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1', model: '' },
  { id: 'lab', label: '모두의 AI 실험실', baseUrl: '', model: '' },
  { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' },
];

/** Preset fields that may have to be entered by hand, with the error shown while they are empty. */
const MANUAL = { AI_BASE_URL: 'base-url-required', AI_MODEL: 'model-required' } as const;
type ManualKey = keyof typeof MANUAL;
const presetValue = (p: (typeof PRESETS)[number], key: ManualKey) => (key === 'AI_MODEL' ? p.model : p.baseUrl);
const isPresetValue = (key: ManualKey, v: string | null | undefined) => !!v && PRESETS.some((p) => presetValue(p, key) === v);

const SECTIONS: Array<{ id: Section; icon: React.ReactNode }> = [
  { id: 'overview', icon: <LayoutDashboard className="size-4" /> },
  { id: 'validation', icon: <FlaskConical className="size-4" /> },
  { id: 'ai', icon: <Cpu className="size-4" /> },
  { id: 'data', icon: <Database className="size-4" /> },
  { id: 'service', icon: <UserRoundCheck className="size-4" /> },
  { id: 'tracking', icon: <Radar className="size-4" /> },
  { id: 'links', icon: <Link2 className="size-4" /> },
  { id: 'limits', icon: <Gauge className="size-4" /> },
  { id: 'deploy', icon: <Server className="size-4" /> },
];

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, data: data as T };
}

const inputCls =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-hairline outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-brand-400 focus:shadow-[0_0_0_4px_rgb(42_133_166/0.12)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:disabled:bg-white/[0.02]';

export default function AdminApp() {
  return (
    <I18nProvider>
      <AdminInner />
    </I18nProvider>
  );
}

function AdminInner() {
  const { lang, setLang } = useI18n();
  const s = S[lang];
  const [session, setSession] = useState<Session | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [netError, setNetError] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const r = await api<Session>('/api/admin/session');
      setSession(r.data);
      setNetError(false);
      if (r.data?.authenticated) {
        const st = await api<Snapshot & { ok: boolean }>('/api/admin/settings');
        if (st.status === 401) setSession({ ...r.data, authenticated: false });
        else setSnap(st.data);
      }
    } catch {
      setNetError(true);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const logout = async () => {
    await api('/api/admin/session', 'DELETE').catch(() => null);
    setSnap(null);
    setSession((x) => (x ? { ...x, authenticated: false, expiresAt: null } : x));
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.06] dark:bg-[#060a12]/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3.5 sm:gap-3 sm:px-6">
          <a href="/" className="flex items-center gap-2.5 rounded-xl" aria-label="TradeScope AI home">
            <span className="grid size-9 place-items-center rounded-[11px] bg-gradient-to-br from-brand-500 via-brand-700 to-brand-950 text-white shadow-brand ring-1 ring-inset ring-white/15">
              <ScanSearch className="size-[18px]" strokeWidth={2.25} />
            </span>
            <span className="hidden text-[16px] font-bold tracking-[-0.025em] text-slate-900 sm:inline dark:text-white">
              TradeScope <span className="text-brand-600 dark:text-brand-300">AI</span>
            </span>
          </a>
          <Badge tone="violet" className="!py-1">
            <ShieldCheck className="size-3.5" aria-hidden />
            {s.admin}
          </Badge>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <a href="/" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
              <ArrowLeft className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">{s.back}</span>
            </a>
            <Segmented size="sm" value={lang} onChange={(v: Lang) => setLang(v)} ariaLabel={lang === 'ko' ? '언어' : 'Language'} options={[{ value: 'ko', label: 'KO' }, { value: 'en', label: 'EN' }]} />
            {session?.authenticated && (
              <Button variant="secondary" size="sm" onClick={logout}>
                <LogOut className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">{s.logout}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {netError ? (
          <Centered>
            <p className="text-sm text-rose-600">{s.networkError}</p>
          </Centered>
        ) : !session ? (
          <Centered>
            <p className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {s.loading}
            </p>
          </Centered>
        ) : !session.enabled ? (
          <Disabled s={s} reason={session.reason} />
        ) : !session.authenticated ? (
          <Login s={s} onDone={loadSession} />
        ) : snap ? (
          <Dashboard s={s} lang={lang} snap={snap} setSnap={setSnap} expiresAt={session.expiresAt} onUnauthorized={loadSession} />
        ) : (
          <Centered>
            <Loader2 className="size-5 animate-spin text-slate-400" aria-label={s.loading} />
          </Centered>
        )}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[50vh] place-items-center">{children}</div>;
}

function CodeBlock({ children }: { children: string }) {
  return <pre className="thin-scroll overflow-x-auto rounded-xl bg-ink-900 p-3.5 font-mono text-[12px] leading-relaxed text-emerald-200">{children}</pre>;
}

function Disabled({ s, reason }: { s: Strings; reason?: string }) {
  return (
    <Centered>
      <Card className="w-full max-w-xl p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">
          <Lock className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{s.disabledTitle}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{({ 'too-short': s.disabledShort, 'too-long': s.disabledLong, 'secret-too-short': s.disabledSecretShort } as Record<string, string>)[reason ?? ''] ?? s.disabledNotSet}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.disabledHow}</p>
        <div className="mt-4 space-y-2.5">
          <CodeBlock>{`# .env.local (npm / systemd / docker compose)\nADMIN_PASSWORD=<10자 이상 / 10+ characters>\nADMIN_SECRET=<32자 이상 임의 문자열 / 32+ random characters>   # 선택 · optional`}</CodeBlock>
          <CodeBlock>{`# 임의 문자열 만들기 / generate a random value\nopenssl rand -base64 32`}</CodeBlock>
        </div>
      </Card>
    </Centered>
  );
}

function Login({ s, onDone }: { s: Strings; onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ ok: boolean; error?: string }>('/api/admin/session', 'POST', { password: pw });
      if (r.data?.ok) {
        setPw('');
        onDone();
      } else setError(r.status === 429 ? s.tooMany : s.wrongPassword);
    } catch {
      setError(s.networkError);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Centered>
      <Card className="w-full max-w-md p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-white text-brand-700 ring-1 ring-inset ring-brand-100 dark:from-brand-400/15 dark:to-brand-400/5 dark:text-brand-300 dark:ring-brand-400/20">
          <KeyRound className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{s.loginTitle}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{s.loginSub}</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{s.password}</span>
            <input type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} autoFocus />
          </label>
          {error && (
            <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          <Button type="submit" variant="brand" size="md" block loading={busy} disabled={!pw}>
            {s.signIn}
          </Button>
        </form>
      </Card>
    </Centered>
  );
}

// ---------------------------------------------------------------------------
// dashboard
// ---------------------------------------------------------------------------
function Dashboard({
  s,
  lang,
  snap,
  setSnap,
  expiresAt,
  onUnauthorized,
}: {
  s: Strings;
  lang: Lang;
  snap: Snapshot;
  setSnap: (x: Snapshot) => void;
  expiresAt: number | null;
  onUnauthorized: () => void;
}) {
  const [section, setSection] = useState<Section>('overview');
  const fields = useMemo(() => Object.fromEntries(snap.fields.map((f) => [f.key, f])), [snap]);
  const writable = snap.storage.writable;
  const ro = !snap.storage.writable ? snap.storage : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[13.5rem_1fr]">
      <nav aria-label="settings" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0">
        {SECTIONS.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-current={section === x.id ? 'page' : undefined}
            onClick={() => setSection(x.id)}
            className={cx(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-left text-[13px] font-semibold transition-[background-color,color] duration-150',
              section === x.id ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white',
            )}
          >
            {x.icon}
            {s.menu[x.id]}
          </button>
        ))}
      </nav>

      <div className="min-w-0 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{s.menu[section]}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.sectionSub[section]}</p>
        </div>

        {ro && section !== 'overview' && section !== 'deploy' && section !== 'validation' && (
          <Notice tone="warn" title={s.readOnly}>
            {s.readOnlyWhy[ro.reason] ?? ro.reason}
          </Notice>
        )}

        {section === 'overview' && <Overview s={s} lang={lang} snap={snap} fields={fields} expiresAt={expiresAt} go={setSection} />}
        {section === 'validation' && <Validation lang={lang} onUnauthorized={onUnauthorized} />}
        {section === 'service' && <ConsultRequests lang={lang} onUnauthorized={onUnauthorized} />}
        {(section === 'ai' || section === 'data' || section === 'service' || section === 'tracking' || section === 'links' || section === 'limits') && (
          <GroupForm key={section} s={s} lang={lang} group={section} fields={fields} writable={writable} setSnap={setSnap} onUnauthorized={onUnauthorized} />
        )}
        {section === 'deploy' && <Deploy s={s} lang={lang} snap={snap} />}
      </div>
    </div>
  );
}

function Notice({ tone, title, children }: { tone: 'ok' | 'warn' | 'info' | 'error'; title?: string; children?: React.ReactNode }) {
  const cls = {
    ok: 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200',
    warn: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
    info: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200',
    error: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200',
  }[tone];
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-2.5 rounded-xl border p-3 text-[13px] leading-relaxed', cls)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : undefined}>{children}</div>}
      </div>
    </div>
  );
}

function Overview({ s, lang, snap, fields, expiresAt, go }: { s: Strings; lang: Lang; snap: Snapshot; fields: Record<string, Field>; expiresAt: number | null; go: (x: Section) => void }) {
  const set = (k: string) => fields[k] && fields[k].source !== 'unset' && fields[k].source !== 'default';
  const todos: Array<{ text: string; to: Section }> = [];
  if (!set('AI_API_KEY')) todos.push({ text: s.todoAi, to: 'ai' });
  if (!set('DATA_GO_KR_SERVICE_KEY')) todos.push({ text: s.todoKcs, to: 'data' });
  if (!set('DATA_FEEDBACK_URL')) todos.push({ text: s.todoFeedback, to: 'links' });
  if (snap.platform === 'docker-or-node' && !set('TRUST_PROXY')) todos.push({ text: s.todoProxy, to: 'limits' });
  if (!snap.adminSecretSet && snap.platform === 'docker-or-node') todos.push({ text: s.todoSecret, to: 'deploy' });
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US') : '—');
  const srcEntries = Object.entries(snap.officialData.sources).filter(([k]) => k !== 'overrides');

  const tiles = [
    {
      icon: <Cpu className="size-4" />,
      label: s.statusAi,
      value: snap.ai.enabled ? s.llmOn : s.llmOff,
      sub: snap.ai.enabled ? `${snap.ai.model} · ${snap.ai.provider}` : s.simulation,
      tone: snap.ai.enabled ? 'green' : 'slate',
    },
    {
      icon: <Database className="size-4" />,
      label: s.statusData,
      value: fmt(snap.officialData.generatedAt),
      sub: srcEntries.map(([k, v]) => `${k} ${v ?? '—'}`).join(' · '),
      tone: 'brand',
    },
    { icon: <ShieldCheck className="size-4" />, label: s.statusOverrides, value: String(snap.officialData.activeOverrides), sub: 'verified-overrides.json', tone: 'violet' },
    {
      icon: <Server className="size-4" />,
      label: s.statusStorage,
      value: snap.storage.writable ? s.writable : s.notWritable,
      sub: snap.storage.writable ? snap.storage.path : (s.readOnlyWhy[snap.storage.reason] ?? snap.storage.reason),
      tone: snap.storage.writable ? 'green' : 'amber',
    },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {t.icon}
              {t.label}
            </p>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{t.value}</p>
            <p className="mt-0.5 break-all text-xs text-slate-500 dark:text-slate-400">{t.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{s.todo}</h2>
        {todos.length === 0 ? (
          <div className="mt-3">
            <Notice tone="ok">{s.allDone}</Notice>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.06]">
            {todos.map((x) => (
              <li key={x.text} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[13px] text-slate-700 dark:text-slate-200">{x.text}</span>
                <Button size="sm" onClick={() => go(x.to)} className="shrink-0">
                  {s.go}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-slate-400">
        {s.session}: {expiresAt ? new Date(expiresAt * 1000).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US') : '—'} · {s.updatedAt}: {fmt(snap.updatedAt)}
      </p>
    </div>
  );
}

/** Settings with a connectivity test (the last key of a pair carries the button). */
type TestTarget = 'ai' | 'dataGoKr' | 'comtrade' | 'shipsgo' | 'unipass' | 'hapag' | 'cmacgm';
const TEST_FOR: Partial<Record<string, TestTarget>> = {
  AI_API_KEY: 'ai',
  DATA_GO_KR_SERVICE_KEY: 'dataGoKr',
  COMTRADE_API_KEY: 'comtrade',
  TRACK_SHIPSGO_TOKEN: 'shipsgo',
  UNIPASS_CARGO_KEY: 'unipass',
  TRACK_HLAG_CLIENT_SECRET: 'hapag',
  TRACK_CMACGM_KEY: 'cmacgm',
};

// ---------------------------------------------------------------------------
// settings form for one group
// ---------------------------------------------------------------------------
function GroupForm({
  s,
  lang,
  group,
  fields,
  writable,
  setSnap,
  onUnauthorized,
}: {
  s: Strings;
  lang: Lang;
  group: SettingGroup;
  fields: Record<string, Field>;
  writable: boolean;
  setSnap: (x: Snapshot) => void;
  onUnauthorized: () => void;
}) {
  const defs = SETTINGS.filter((d) => d.group === group);
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null);
  // fields a preset left to be entered by hand: saving is blocked until they are filled
  const [manual, setManual] = useState<ManualKey[]>([]);
  // bumped after a save or reset so rows remount (secret inputs go back to their masked view)
  const [generation, setGeneration] = useState(0);
  const dirty = Object.keys(draft).length > 0;

  const setValue = (key: string, v: string | null | undefined) =>
    setDraft((d) => {
      const n = { ...d };
      if (v === undefined) delete n[key];
      else n[key] = v;
      return n;
    });

  const save = async () => {
    setNotice(null);
    setErrors({});
    // only a value typed now or saved earlier counts — the built-in default belongs to OpenAI
    const entered = (key: ManualKey) => (key in draft ? (draft[key] ?? '') : fields[key]?.source === 'admin' ? (fields[key]?.value ?? '') : '').trim();
    const missing = manual.filter((key) => fields[key]?.source !== 'env' && !entered(key));
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((key) => [key, MANUAL[key]])));
      setNotice({ tone: 'error', text: s.saveFailed });
      document.getElementById(`f-${missing[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const r = await api<Snapshot & { ok: boolean; errors?: Record<string, string> }>('/api/admin/settings', 'PUT', { values: draft });
      if (r.status === 401) return onUnauthorized();
      if (r.data?.fields) setSnap(r.data);
      if (r.data?.ok) {
        setDraft({});
        setManual([]);
        setGeneration((g) => g + 1);
        setNotice({ tone: 'ok', text: `${s.saved} ${group === 'data' ? s.savedSync : s.savedRuntime}` });
      } else {
        setErrors(r.data?.errors ?? {});
        const storageErr = r.data?.errors?._storage;
        setNotice({ tone: 'error', text: storageErr ? (s.readOnlyWhy[storageErr] ?? storageErr) : s.saveFailed });
      }
    } catch {
      setNotice({ tone: 'error', text: s.networkError });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {group === 'ai' && (
        <Card className="p-5">
          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{s.presets}</p>
          <p className="mt-0.5 text-xs text-slate-500">{s.presetNote}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                disabled={!writable || busy}
                onClick={() => {
                  const need: ManualKey[] = [];
                  for (const key of ['AI_BASE_URL', 'AI_MODEL'] as const) {
                    if (fields[key]?.source === 'env') continue; // locked
                    const value = presetValue(p, key);
                    if (value) {
                      setValue(key, value);
                      continue;
                    }
                    need.push(key);
                    // drop a value another preset filled in, so the field starts empty (a saved custom value stays)
                    const current = key in draft ? draft[key] : fields[key]?.value;
                    const saved = fields[key]?.source === 'admin' ? fields[key]?.value : undefined;
                    if (isPresetValue(key, current)) setValue(key, saved && !isPresetValue(key, saved) ? undefined : saved ? null : undefined);
                  }
                  setManual(need);
                  setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in MANUAL))));
                  if (!need.length) return setNotice(null);
                  setNotice({ tone: 'info', text: need.length === 2 ? s.presetPickBoth : need[0] === 'AI_MODEL' ? s.presetPickModel : s.presetPickBase });
                  document.getElementById(`f-${need[0]}`)?.focus();
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {group === 'data' && <Notice tone="info">{s.dataNote}</Notice>}

      <Card>
        {/* disabled while saving: the request carries the click-time draft, so later edits would be lost */}
        <fieldset disabled={busy} className="min-w-0 divide-y divide-slate-100 dark:divide-white/[0.06]">
          {defs.map((def) => (
            <FieldRow
              key={`${def.key}:${generation}`}
              s={s}
              lang={lang}
              def={def}
              field={fields[def.key]}
              draft={draft[def.key]}
              hasDraft={def.key in draft}
              error={errors[def.key]}
              writable={writable}
              onChange={(v) => setValue(def.key, v)}
              test={TEST_FOR[def.key]}
              onUnauthorized={onUnauthorized}
            />
          ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4 dark:border-white/[0.06]">
          {notice && (
            <p
              role={notice.tone === 'error' ? 'alert' : 'status'}
              className={cx(
                'mr-auto text-[13px] font-medium',
                notice.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : notice.tone === 'info' ? 'text-slate-600 dark:text-slate-300' : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {notice.text}
            </p>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="md" disabled={!(dirty || manual.length) || busy} onClick={() => (setDraft({}), setErrors({}), setNotice(null), setManual([]), setGeneration((g) => g + 1))}>
              {s.reset}
            </Button>
            <Button variant="primary" size="md" disabled={!(dirty || manual.length) || !writable} loading={busy} onClick={save}>
              {s.save}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SourceBadge({ s, field }: { s: Strings; field?: Field }) {
  if (!field) return null;
  const tone = { env: 'amber', admin: 'brand', default: 'slate', unset: 'slate' }[field.source] as 'amber' | 'brand' | 'slate';
  return (
    <Badge tone={tone} title={field.envName}>
      {field.source === 'env' && <Lock className="size-3" aria-hidden />}
      {s.src[field.source]}
      {field.envName && field.source === 'env' ? ` · ${field.envName}` : ''}
    </Badge>
  );
}

function FieldRow({
  s,
  lang,
  def,
  field,
  draft,
  hasDraft,
  error,
  writable,
  onChange,
  test,
  onUnauthorized,
}: {
  s: Strings;
  lang: Lang;
  def: SettingDef;
  field?: Field;
  draft: string | null | undefined;
  hasDraft: boolean;
  error?: string;
  writable: boolean;
  onChange: (v: string | null | undefined) => void;
  test?: TestTarget;
  onUnauthorized: () => void;
}) {
  const locked = field?.source === 'env';
  const disabled = locked || !writable;
  const id = `f-${def.key}`;
  const [editing, setEditing] = useState(false);
  const [testState, setTestState] = useState<{ busy: boolean; result?: TestResult }>({ busy: false });

  const runTest = async () => {
    setTestState({ busy: true });
    try {
      const r = await api<{ ok: boolean; result?: TestResult }>('/api/admin/test', 'POST', { target: test });
      if (r.status === 401) return onUnauthorized();
      setTestState({ busy: false, result: r.data?.result ?? { ok: false, message: r.status >= 400 ? `http-${r.status}` : 'invalid-json', latencyMs: 0 } });
    } catch {
      setTestState({ busy: false, result: { ok: false, message: 'network-error', latencyMs: 0 } });
    }
  };

  const savedValue = field?.source === 'admin' || field?.source === 'env' ? field.value : undefined;
  const errText = error ? (error.startsWith('min:') ? `≥ ${error.slice(4)}` : error.startsWith('max:') ? `≤ ${error.slice(4)}` : (s.err[error] ?? error)) : null;

  let control: React.ReactNode;
  if (def.type === 'boolean') {
    const current = (hasDraft ? draft : (field?.value ?? def.default)) === 'true' ? 'true' : 'false';
    control = disabled ? (
      <Badge>{current === 'true' ? s.on : s.off}</Badge>
    ) : (
      <Segmented
        size="sm"
        value={current}
        ariaLabel={def.label[lang]}
        onChange={(v) => onChange(v === (field?.source === 'admin' ? field.value : def.default) ? undefined : v)}
        options={[
          { value: 'true', label: s.on },
          { value: 'false', label: s.off },
        ]}
      />
    );
  } else if (def.type === 'secret') {
    const hasValue = !!field?.masked;
    const removing = hasDraft && draft === null;
    control = (
      <div className="space-y-2">
        {hasValue && !editing && !hasDraft ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-[13px] text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">{field?.masked}</code>
            {!disabled && (
              <>
                <Button size="sm" onClick={() => setEditing(true)}>
                  {s.change}
                </Button>
                {field?.source === 'admin' && (
                  <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
                    <Trash2 className="size-3.5" aria-hidden />
                    {s.remove}
                  </Button>
                )}
              </>
            )}
          </div>
        ) : removing ? (
          <div className="flex items-center gap-2">
            <Badge tone="red">{s.willRemove}</Badge>
            <Button size="xs" variant="ghost" onClick={() => onChange(undefined)}>
              {s.reset}
            </Button>
          </div>
        ) : (
          <input
            id={id}
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            disabled={disabled}
            placeholder={locked ? '••••' : (def.placeholder ?? s.enterNew)}
            value={typeof draft === 'string' ? draft : ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
            className={inputCls}
          />
        )}
      </div>
    );
  } else {
    const shown = hasDraft ? (draft ?? '') : (savedValue ?? '');
    control = (
      <input
        id={id}
        type={def.type === 'number' ? 'number' : def.type === 'url' ? 'url' : 'text'}
        inputMode={def.type === 'number' ? 'decimal' : undefined}
        min={def.min}
        max={def.max}
        spellCheck={false}
        disabled={disabled}
        placeholder={def.default ?? def.placeholder}
        value={shown}
        onChange={(e) => {
          const v = e.target.value;
          const original = savedValue ?? '';
          onChange(v === original ? undefined : v === '' ? null : v);
        }}
        className={inputCls}
      />
    );
  }

  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-6">
      <div className="min-w-0">
        <label htmlFor={def.type === 'boolean' ? undefined : id} className="text-[13.5px] font-semibold text-slate-900 dark:text-white">
          {def.label[lang]}
        </label>
        <p className="mt-1 font-mono text-[10.5px] text-slate-400">{def.key}</p>
        <div className="mt-1.5">
          <SourceBadge s={s} field={field} />
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        {control}
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{def.help[lang]}</p>
        {locked && <p className="text-xs text-amber-700 dark:text-amber-300">{s.envLocked}</p>}
        {field?.unreadable && !locked && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{s.unreadable}</p>}
        {errText && (
          <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            {errText}
          </p>
        )}
        {test && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="subtle" onClick={runTest} loading={testState.busy} disabled={!field?.masked}>
              {!testState.busy && <PlugZap className="size-3.5" aria-hidden />}
              {testState.busy ? s.testing : s.test}
            </Button>
            <span className="text-[11px] text-slate-400">{s.testSaveFirst}</span>
            {testState.result && (
              <span role="status" className={cx('inline-flex items-center gap-1 text-xs font-semibold', testState.result.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                {testState.result.ok ? <CheckCircle2 className="size-3.5" aria-hidden /> : <AlertTriangle className="size-3.5" aria-hidden />}
                {s.testMsg[testState.result.message] ?? testState.result.message}
                {testState.result.detail ? ` · ${testState.result.detail}` : ''} · {testState.result.latencyMs} ms
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Deploy({ s, lang, snap }: { s: Strings; lang: Lang; snap: Snapshot }) {
  const envLines = SETTINGS.map((d) => `${d.env[0]}=${d.type === 'secret' ? '…' : (d.default ?? '')}`).join('\n');
  return (
    <div className="space-y-5">
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{s.platform}</p>
          <p className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">{s.platformName[snap.platform]}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{s.storagePath}</p>
          <p className="mt-1.5 break-all font-mono text-[12.5px] text-slate-700 dark:text-slate-200">{snap.storage.path}</p>
          <p className="mt-1 text-xs text-slate-500">{snap.storage.writable ? s.writable : (s.readOnlyWhy[snap.storage.reason] ?? snap.storage.reason)}</p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-[15px] font-bold text-slate-900 dark:border-white/[0.06] dark:text-white">{s.envTable}</h2>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <tbody>
              {snap.fields.map((f) => {
                const def = SETTINGS.find((d) => d.key === f.key)!;
                return (
                  <tr key={f.key} className="border-b border-slate-100 last:border-0 dark:border-white/[0.06]">
                    <td className="px-5 py-2.5 font-mono text-[12px] text-slate-700 dark:text-slate-200">{def.env.join(' / ')}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{def.label[lang]}</td>
                    <td className="px-5 py-2.5 text-right">
                      <SourceBadge s={s} field={f} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{s.howEnv}</h2>
        <p className="text-[13px] text-slate-600 dark:text-slate-300">
          {lang === 'ko'
            ? '환경변수는 이 페이지의 저장값보다 우선합니다. Vercel·Netlify는 플랫폼 설정 화면에, Docker·서버는 .env.local에 넣고 재시작하세요. 이 페이지의 저장값은 Docker 볼륨(/app/.data)이나 프로젝트의 .data 폴더에 암호화되어 저장됩니다.'
            : 'Environment variables win over values saved here. On Vercel/Netlify use the platform’s settings; on Docker/servers put them in .env.local and restart. Values saved here are encrypted in the Docker volume (/app/.data) or the project’s .data folder.'}
        </p>
        <CodeBlock>{`# .env.local\nADMIN_PASSWORD=…\nADMIN_SECRET=…\n${envLines}`}</CodeBlock>
      </Card>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Expert-service requests
// ---------------------------------------------------------------------------

type ConsultStatus = 'new' | 'contacted' | 'in-progress' | 'done' | 'closed';
interface ConsultRow {
  id: string;
  createdAt: string;
  status: ConsultStatus;
  name: string;
  company: string;
  email: string;
  phone: string;
  productId?: string;
  /** added by the admin API from the knowledge base */
  productName?: { ko: string; en: string };
  productEmoji?: string;
  topic: string;
  serviceIds: string[];
  message: string;
  lang: 'ko' | 'en';
  source?: string;
  channel?: string;
}

const SOURCE_LABEL: Record<string, { ko: string; en: string }> = {
  checklist: { ko: '인허가 체크리스트', en: 'Permits checklist' },
  card: { ko: '서비스 카드', en: 'Service card' },
  customs: { ko: '통관 단계', en: 'Clearance step' },
  unsupported: { ko: '미지원 품목', en: 'Unsupported product' },
};

const STATUS_LABEL: Record<ConsultStatus, { ko: string; en: string; tone: 'red' | 'amber' | 'brand' | 'green' | 'slate' }> = {
  new: { ko: '새 요청', en: 'New', tone: 'red' },
  contacted: { ko: '연락함', en: 'Contacted', tone: 'amber' },
  'in-progress': { ko: '진행 중', en: 'In progress', tone: 'brand' },
  done: { ko: '완료', en: 'Done', tone: 'green' },
  closed: { ko: '종료', en: 'Closed', tone: 'slate' },
};

function ConsultRequests({ lang, onUnauthorized }: { lang: Lang; onUnauthorized: () => void }) {
  const [rows, setRows] = useState<ConsultRow[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const ko = lang === 'ko';

  const load = useCallback(async () => {
    try {
      const r = await api<{ ok: boolean; requests?: ConsultRow[] }>('/api/admin/consult');
      if (r.status === 401) return onUnauthorized();
      // a failed load keeps what is on screen and says so — it is never shown as "no requests"
      if (r.status !== 200 || !Array.isArray(r.data?.requests)) throw new Error(`load-${r.status}`);
      setRows(r.data.requests);
      setError('');
    } catch {
      setError(ko ? '요청 목록을 불러오지 못했습니다. 잠시 후 새로고침하세요.' : 'Could not load requests. Refresh in a moment.');
    }
  }, [ko, onUnauthorized]);
  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: ConsultStatus) => {
    try {
      const r = await api<{ ok: boolean; requests?: ConsultRow[] }>('/api/admin/consult', 'PATCH', { id, status });
      if (r.status === 401) return onUnauthorized();
      if (r.status !== 200 || !Array.isArray(r.data?.requests)) throw new Error(`patch-${r.status}`);
      setRows(r.data.requests);
      setError('');
    } catch {
      setError(ko ? '상태를 바꾸지 못했습니다.' : 'Could not update the status.');
    }
  };

  const shown = (rows ?? []).filter((x) => filter === 'all' || (x.status !== 'done' && x.status !== 'closed'));
  const openCount = (rows ?? []).filter((x) => x.status === 'new').length;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
          {ko ? '받은 요청' : 'Requests'}
          {openCount > 0 && <Badge tone="red">{ko ? `새 요청 ${openCount}건` : `${openCount} new`}</Badge>}
        </p>
        <div className="flex items-center gap-2">
          <Segmented
            size="sm"
            value={filter}
            ariaLabel={ko ? '보기' : 'Show'}
            onChange={(v) => setFilter(v as 'open' | 'all')}
            options={[
              { value: 'open', label: ko ? '진행 중' : 'Open' },
              { value: 'all', label: ko ? '전체' : 'All' },
            ]}
          />
          <Button size="sm" onClick={() => void load()}>
            {ko ? '새로고침' : 'Refresh'}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
      {rows === null ? (
        <p className="mt-4 text-sm text-slate-500">{ko ? '불러오는 중…' : 'Loading…'}</p>
      ) : shown.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/[0.04]">
          {ko ? '아직 요청이 없습니다. 사이트의 「전문가에게 맡기기」로 들어온 요청이 여기에 쌓입니다.' : 'No requests yet. Requests sent with “Hand it to an expert” appear here.'}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {shown.map((x) => (
            <li key={x.id} className="rounded-xl border border-slate-200 p-4 dark:border-white/[0.08]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <span className="font-mono text-xs text-slate-500">{x.id}</span>
                  {x.name}
                  {x.company && <span className="font-medium text-slate-500">· {x.company}</span>}
                  <Badge tone={STATUS_LABEL[x.status]?.tone ?? 'slate'}>{STATUS_LABEL[x.status]?.[lang] ?? x.status}</Badge>
                </p>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  {ko ? '상태' : 'Status'}
                  <select
                    id={`st-${x.id}`}
                    value={x.status}
                    onChange={(e) => void setStatus(x.id, e.target.value as ConsultStatus)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    {(Object.keys(STATUS_LABEL) as ConsultStatus[]).map((k) => (
                      <option key={k} value={k}>
                        {STATUS_LABEL[k][lang]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(x.createdAt).toLocaleString(ko ? 'ko-KR' : 'en-US')} · <span className="select-all">{x.email}</span>
                {x.phone && (
                  <>
                    {' '}
                    · <span className="select-all">{x.phone}</span>
                  </>
                )}
                {x.lang === 'en' ? ' · EN' : ''}
                {x.source && ` · ${ko ? '시작' : 'from'}: ${SOURCE_LABEL[x.source]?.[lang] ?? x.source}`}
                {x.channel && ` · ${ko ? '채널' : 'channel'}: ${x.channel}`}
              </p>
              {x.serviceIds.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {x.serviceIds.map((id) => (
                    <Badge key={id} tone="brand">
                      {EXPERT_INDEX[id]?.title[lang] ?? id}
                    </Badge>
                  ))}
                </p>
              )}
              {(x.productName || x.topic) && (
                <p className="mt-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  {x.productName && (
                    <span className="mr-1.5 font-medium text-slate-500 dark:text-slate-400">
                      {x.productEmoji} {x.productName[lang]}
                      {x.topic ? ' ·' : ''}
                    </span>
                  )}
                  {x.topic}
                </p>
              )}
              {x.message && <p className="mt-1 whitespace-pre-wrap text-[13px] text-slate-600 dark:text-slate-300">{x.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Hypothesis checks (validation metrics)
// ---------------------------------------------------------------------------

type Bi = { ko: string; en: string };
type Verdict = 'pass' | 'hold' | 'stop' | 'insufficient';
interface AlsoRow {
  label: Bi;
  success: number;
  base: number;
  target: number;
  minBase: number;
  met: boolean | null;
}
interface CheckRow {
  id: string;
  title: Bi;
  measure: Bi;
  success: number;
  base: number;
  rate: number | null;
  ci: { low: number; high: number } | null;
  minBase: number;
  pass: number;
  stop: number;
  verdict: Verdict;
  note: Bi;
  also?: AlsoRow;
}
interface ChannelRow {
  channel: string;
  visits: number;
  permitsViews: number;
  expertOpens: number;
  requests: number;
}
interface MetricsData {
  ok: boolean;
  days: number;
  from: string;
  to: string;
  persistent: boolean;
  totals: Record<string, number>;
  requests: { handled: number; responded: number } | null;
  checks: CheckRow[];
  channels: ChannelRow[];
}

const VERDICT: Record<Verdict, { ko: string; en: string; tone: 'green' | 'amber' | 'red' | 'slate'; Icon: typeof CheckCircle2 }> = {
  pass: { ko: '통과', en: 'Pass', tone: 'green', Icon: CheckCircle2 },
  hold: { ko: '보류', en: 'Hold', tone: 'amber', Icon: CirclePause },
  stop: { ko: '중단·전환', en: 'Stop or pivot', tone: 'red', Icon: CircleX },
  insufficient: { ko: '표본 부족', en: 'Not enough data', tone: 'slate', Icon: Hourglass },
};

const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;
const PERIOD_OPTIONS = ['7', '28', '90', '400'] as const;

function Validation({ lang, onUnauthorized }: { lang: Lang; onUnauthorized: () => void }) {
  const ko = lang === 'ko';
  const [days, setDays] = useState<(typeof PERIOD_OPTIONS)[number]>('28');
  const [data, setData] = useState<MetricsData | null>(null);
  const [error, setError] = useState('');
  // only the latest request may update the screen (period changes can overtake each other)
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    try {
      const r = await api<MetricsData>(`/api/admin/metrics?days=${days}`);
      if (id !== latest.current) return;
      if (r.status === 401) return onUnauthorized();
      if (r.status !== 200 || !Array.isArray(r.data?.checks)) throw new Error(`load-${r.status}`);
      setData(r.data);
      setError('');
    } catch {
      if (id !== latest.current) return;
      setError(ko ? '측정값을 불러오지 못했습니다. 잠시 후 새로고침하세요.' : 'Could not load the measurements. Refresh in a moment.');
    }
  }, [days, ko, onUnauthorized]);
  useEffect(() => {
    void load();
  }, [load]);

  const t = data?.totals ?? {};
  const v = (k: string) => t[k] ?? 0;
  const nf = (x: number) => x.toLocaleString(ko ? 'ko-KR' : 'en-US');

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-bold text-slate-900 dark:text-white">
            {ko ? '기간' : 'Period'}
            {data && (
              <span className="ml-2 text-xs font-medium text-slate-500">
                {data.from} – {data.to} (UTC)
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Segmented
              size="sm"
              value={days}
              ariaLabel={ko ? '기간' : 'Period'}
              onChange={(x) => setDays(x)}
              options={PERIOD_OPTIONS.map((d) => ({ value: d, label: d === '400' ? (ko ? '전체' : 'All') : ko ? `${d}일` : `${d} days` }))}
            />
            <Button size="sm" onClick={() => void load()}>
              {ko ? '새로고침' : 'Refresh'}
            </Button>
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
        {data && !data.persistent && (
          <div className="mt-3">
            <Notice tone="warn" title={ko ? '측정값이 메모리에만 있습니다' : 'Counts are in memory only'}>
              {ko
                ? '저장소에 쓸 수 없는 환경이라 서버가 다시 시작되면 숫자가 사라집니다. 검증 기간 동안에는 쓰기 가능한 데이터 폴더(TRADESCOPE_DATA_DIR)가 있는 서버에서 운영하세요.'
                : 'Storage is not writable here, so the numbers reset when the server restarts. Run the validation period on a server with a writable data folder (TRADESCOPE_DATA_DIR).'}
            </Notice>
          </div>
        )}
      </Card>

      {data === null && !error && <p className="text-sm text-slate-500">{ko ? '불러오는 중…' : 'Loading…'}</p>}

      {data && (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {data.checks.map((c) => (
              <CheckCard key={c.id} c={c} lang={lang} />
            ))}
          </div>

          <Card className="p-5">
            <p className="text-[15px] font-bold text-slate-900 dark:text-white">{ko ? 'H3 깔때기 — 어디서 빠지는지' : 'H3 funnel — where people drop off'}</p>
            <p className="mt-1 text-xs text-slate-500">{ko ? '방문은 탭 세션, 인허가·선적 단계는 브라우저·품목별 첫 진입, 분석·열기·제출은 발생 건수입니다(H3 판정은 처음 보낸 브라우저·품목만 셈). 한 가지만 바꾸고 같은 기간 길이로 비교하세요.' : 'Visits are tab sessions, the permits and shipping steps are first opens per browser and product, reports, opens and requests are event counts (the H3 verdict counts first requests per browser and product only). Change one thing at a time and compare equal-length periods.'}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-[13px]">
                <thead className="text-xs text-slate-500">
                  <tr className="border-b border-slate-200 dark:border-white/[0.08]">
                    <th className="py-2 pr-3 font-semibold">{ko ? '단계' : 'Step'}</th>
                    <th className="py-2 pr-3 text-right font-semibold">{ko ? '수' : 'Count'}</th>
                    <th className="py-2 font-semibold">{ko ? '내역' : 'Breakdown'}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-200">
                  {[
                    { k: ko ? '방문(탭 세션)' : 'Visits (tab sessions)', n: v('visit'), d: '' },
                    { k: ko ? '분석 결과 표시' : 'Reports shown', n: v('report'), d: ko ? `지원 품목 ${nf(v('report:supported'))} · 미지원 ${nf(v('report:unsupported'))}` : `supported ${nf(v('report:supported'))} · unsupported ${nf(v('report:unsupported'))}` },
                    { k: ko ? '인허가 단계 첫 진입' : 'Permits step, first open', n: v('step_first:permits'), d: ko ? `선적 단계 첫 진입 ${nf(v('step_first:shipping'))}` : `shipping step first open ${nf(v('step_first:shipping'))}` },
                    { k: ko ? '「맡기기」 열기' : '“Hand it to an expert” opened', n: v('expert_open'), d: `${ko ? '체크리스트' : 'checklist'} ${nf(v('expert_open:checklist'))} · ${ko ? '서비스 카드' : 'cards'} ${nf(v('expert_open:card'))} · ${ko ? '통관' : 'customs'} ${nf(v('expert_open:customs'))} · ${ko ? '미지원 품목' : 'unsupported'} ${nf(v('expert_open:unsupported'))}` },
                    { k: ko ? '요청 제출' : 'Requests sent', n: v('consult_submit'), d: `${ko ? '인허가 단계에서 처음 보낸 브라우저·품목' : 'first from the permits step (browser·product)'} ${nf(v('consult_first:checklist') + v('consult_first:card'))} · ${ko ? '체크리스트' : 'checklist'} ${nf(v('consult_submit:checklist'))} · ${ko ? '서비스 카드' : 'cards'} ${nf(v('consult_submit:card'))} · ${ko ? '통관' : 'customs'} ${nf(v('consult_submit:customs'))} · ${ko ? '미지원 품목' : 'unsupported'} ${nf(v('consult_submit:unsupported'))}` },
                  ].map((r) => (
                    <tr key={r.k} className="border-b border-slate-100 last:border-0 dark:border-white/[0.05]">
                      <td className="py-2 pr-3 font-semibold">{r.k}</td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums">{nf(r.n)}</td>
                      <td className="py-2 text-xs text-slate-500">{r.d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {v('expert_open') > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {ko ? '열기 대비 제출률' : 'Sent per opened'}: <b className="font-mono text-slate-700 dark:text-slate-200">{pct1(v('consult_submit') / v('expert_open'))}</b>
                {ko ? ' — 낮으면 양식이 길거나 가격·소요 기간이 불분명하다는 신호입니다.' : ' — low means the form is long or price and lead time are unclear.'}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <p className="text-[15px] font-bold text-slate-900 dark:text-white">{ko ? 'H9 유입 채널별 비교' : 'H9 by acquisition channel'}</p>
            <p className="mt-1 text-xs text-slate-500">
              {ko ? '채널마다 링크에 ' : 'Give each channel its own link with '}
              <code className="rounded bg-slate-100 px-1 font-mono dark:bg-white/[0.06]">?utm_source=kotra</code>
              {ko ? ' 처럼 이름을 붙이면 여기서 나뉘어 집계됩니다(영문 소문자·숫자·-·_ 32자 이내). 비용은 채널별로 따로 적어 요청 1건당 비용을 비교하세요.' : ' (lower-case letters, digits, - and _, up to 32). Note each channel’s spend separately and compare the cost per request.'}
            </p>
            {data.channels.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/[0.04]">{ko ? '이 기간에 채널 이름이 붙은 방문이 없습니다.' : 'No visits with a channel name in this period.'}</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-[13px]">
                  <thead className="text-xs text-slate-500">
                    <tr className="border-b border-slate-200 dark:border-white/[0.08]">
                      <th className="py-2 pr-3 font-semibold">{ko ? '채널' : 'Channel'}</th>
                      <th className="py-2 pr-3 text-right font-semibold">{ko ? '방문' : 'Visits'}</th>
                      <th className="py-2 pr-3 text-right font-semibold">{ko ? '인허가 진입' : 'Permits'}</th>
                      <th className="py-2 pr-3 text-right font-semibold">{ko ? '맡기기 열기' : 'Opened'}</th>
                      <th className="py-2 pr-3 text-right font-semibold">{ko ? '요청' : 'Requests'}</th>
                      <th className="py-2 text-right font-semibold">{ko ? '요청/방문' : 'Req./visit'}</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-200">
                    {data.channels.map((c) => (
                      <tr key={c.channel} className="border-b border-slate-100 last:border-0 dark:border-white/[0.05]">
                        <td className="py-2 pr-3 font-mono text-xs font-semibold">{c.channel}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{nf(c.visits)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{nf(c.permitsViews)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{nf(c.expertOpens)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{nf(c.requests)}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{c.visits ? pct1(c.requests / c.visits) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <p className="text-[15px] font-bold text-slate-900 dark:text-white">{ko ? 'H8 추적 결과 내역' : 'H8 tracking outcomes'}</p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {(
                [
                  ['live', ko ? '조회됨' : 'Found'],
                  ['pending', ko ? '등록·대기' : 'Registered, pending'],
                  ['not-found', ko ? '못 찾음' : 'Not found'],
                  ['not-covered', ko ? '지원 소스 없음' : 'No source takes it'],
                  ['failed', ko ? '소스 오류' : 'Source error'],
                  ['demo', ko ? '예시(키 없음, 제외)' : 'Example (no keys, excluded)'],
                ] as const
              ).map(([k, label]) => (
                <Badge key={k} tone="slate">
                  {label} <span className="ml-1 font-mono">{nf(v(`track:${k}`))}</span>
                </Badge>
              ))}
            </p>
            {Object.keys(t).some((k) => k.startsWith('track_provider:')) && (
              <p className="mt-2 text-xs text-slate-500">
                {ko ? '응답한 소스(조회됨·등록 대기): ' : 'Answered by (found or pending): '}
                {Object.entries(t)
                  .filter(([k]) => k.startsWith('track_provider:'))
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, n]) => `${k.slice('track_provider:'.length)} ${nf(n)}`)
                  .join(' · ')}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">{ko ? '정확도(선사 화면과 일치 여부)와 지연은 숫자로 잡히지 않습니다 — 실제 번호 20건을 선사 홈페이지와 나란히 비교해 기록하세요.' : 'Accuracy against the carrier’s own page and latency are not counted here — compare 20 real numbers side by side with the carrier website and record them.'}</p>
          </Card>

          <Notice tone="info" title={ko ? '사이트 밖에서 검증하는 가설' : 'Hypotheses tested off the site'}>
            {ko
              ? 'H1·H2·H4·H5·H6·H10과 H9의 비용은 인터뷰·사전 판매·시범 운영으로 검증합니다. 결과는 docs/business-model-canvas.html의 「판정 계산기」에 넣어 같은 기준으로 판정하세요.'
              : 'H1, H2, H4, H5, H6, H10 and H9’s costs are tested with interviews, pre-sales and pilots. Enter those results in the verdict calculator in docs/business-model-canvas.html to judge them on the same rules.'}
          </Notice>
          <p className="text-xs leading-relaxed text-slate-500">
            {ko
              ? '수집 방식: 날짜별 익명 합계만 저장합니다(쿠키·IP·기기 ID·입력 내용 없음). 신뢰 프록시가 있으면 남용 방지 한도를 위해 접속 IP를 1시간 동안 서버 메모리에서만 씁니다. Do Not Track·Global Privacy Control을 켠 브라우저는 보내지 않고, 서버도 그 신호가 있는 요청 제출·추적 조회는 세지 않습니다. 「첫 진입」은 브라우저 저장소에서 품목별로 중복을 막으므로 브라우저·품목 단위이고, 같은 사람이 다른 기기를 쓰면 따로 셉니다.'
              : 'How it is collected: only anonymous daily totals are stored (no cookies, IP, device id or typed content). Behind a trusted proxy the client IP is used in server memory for one hour, for the abuse limit only. Browsers with Do Not Track or Global Privacy Control send nothing, and the server does not count requests or lookups that carry those signals. “First open” is deduplicated per product in browser storage, so counts are browser·product pairs and one person on two devices counts twice.'}
          </p>
        </>
      )}
    </div>
  );
}

function CheckCard({ c, lang }: { c: CheckRow; lang: Lang }) {
  const ko = lang === 'ko';
  const vd = VERDICT[c.verdict];
  const progress = Math.min(1, c.base / c.minBase);
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-bold leading-snug text-slate-900 dark:text-white">{c.title[lang]}</p>
        <Badge tone={vd.tone} className="shrink-0">
          <vd.Icon className="mr-1 size-3.5" aria-hidden />
          {vd[lang]}
        </Badge>
      </div>
      <p className="mt-3 flex items-baseline gap-2">
        {/* below the minimum sample the rate is shown muted: it is not a result yet */}
        <span className={cx('font-mono text-3xl font-bold tabular-nums', c.verdict === 'insufficient' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white')}>{c.rate === null ? '—' : pct1(c.rate)}</span>
        <span className="font-mono text-xs text-slate-500">
          {c.success.toLocaleString()} / {c.base.toLocaleString()}
        </span>
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {c.ci ? `${ko ? '95% 신뢰구간' : '95% interval'} ${pct1(c.ci.low)} – ${pct1(c.ci.high)}` : ko ? '아직 데이터 없음' : 'No data yet'}
      </p>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        {ko ? `통과 ${pct1(c.pass)} 이상 · 중단 ${pct1(c.stop)} 미만 · 최소 ${c.minBase}건` : `pass ≥ ${pct1(c.pass)} · stop < ${pct1(c.stop)} · minimum ${c.minBase}`}
      </p>
      {c.base < c.minBase && (
        <div className="mt-2">
          <div
            role="meter"
            aria-label={ko ? '최소 표본까지' : 'Towards the minimum sample'}
            aria-valuemin={0}
            aria-valuemax={c.minBase}
            aria-valuenow={c.base}
            className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]"
          >
            <div className="h-full rounded-full bg-slate-500 dark:bg-slate-300" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{ko ? `최소 표본 ${c.base}/${c.minBase}` : `Sample ${c.base} of ${c.minBase}`}</p>
        </div>
      )}
      {c.also && (
        <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
          {c.also.label[lang]}:{' '}
          <b className="font-mono">
            {c.also.base ? pct1(c.also.success / c.also.base) : '—'} ({c.also.success}/{c.also.base})
          </b>{' '}
          · {ko ? `기준 ${pct1(c.also.target)} 이상, 최소 ${c.also.minBase}건` : `needs ${pct1(c.also.target)}+, minimum ${c.also.minBase}`}
        </p>
      )}
      <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{c.note[lang]}</p>
      <p className="mt-auto pt-3 text-[11px] leading-relaxed text-slate-500">{c.measure[lang]}</p>
    </Card>
  );
}
