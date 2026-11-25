import type { Metadata, Viewport } from 'next';
// Pretendard (SIL OFL 1.1), self-hosted as a dynamic subset: the browser only downloads the glyph ranges it needs.
import './fonts/pretendard/pretendardvariable-dynamic-subset.css';
import './globals.css';

// absolute URLs for link previews; set NEXT_PUBLIC_SITE_URL to the public address of the deployment (https://…).
// A value that is not an http(s) URL is ignored with a warning instead of failing every page.
function siteBase(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url;
  } catch {
    /* reported below */
  }
  console.warn(`[config] NEXT_PUBLIC_SITE_URL is not an http(s) URL and is ignored: ${raw}`);
  return undefined;
}
const metadataBase = siteBase();

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: 'TradeScope AI — 전 세계 무역, 질문 하나로',
  description:
    '무엇을 어디로 보내는지 적으면 관세·FTA·인허가 서류·거래처·선적까지 해야 할 일을 7단계로 알려 드립니다. 필리핀 FDA·BAI 서류는 현지 전문가가, 컨테이너는 도착까지 추적. 첫 번째 노선 대한민국 ↔ 필리핀 프로토타입.',
  applicationName: 'TradeScope AI',
  keywords: ['TradeScope AI', '무역', '글로벌 무역', '수출입', '필리핀', 'FTA', 'HS Code', 'RCEP', 'AKFTA', '한-필리핀 FTA', '필리핀 FDA', 'BAI', '컨테이너 추적', 'trade intelligence'],
  openGraph: {
    title: 'TradeScope AI — Global trade, answered in one question',
    description: 'Duties, permits, partners and shipping — step by step, to the day your cargo arrives. First corridor: Korea ↔ Philippines (prototype).',
    type: 'website',
    siteName: 'TradeScope AI',
  },
  twitter: { card: 'summary_large_image', title: 'TradeScope AI — Global trade, answered in one question' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#060a12' },
  ],
};

// Applies the saved / system theme before first paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('ts-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
